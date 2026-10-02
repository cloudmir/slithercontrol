"""pocket6: real-time reflex layer + parallel planner (pocket5 stays the control).

Why: live deaths happened when a crowded scene pushed one decision to 0.2-0.6 s.
- Reflex (every tick, bounded work): only body pieces within NEAR_R px of our
  head (straight-line selection) are walls; enemy motion is predicted from
  heads only (direction + speed). 48 coarse headings x {cruise, boost}, then
  refinement around the best ones, previous choice evaluated first, and the
  refinement is skipped when the tick budget is spent. Food/cluster/rival/
  approach rules are pocket4/5's.
- Planner (separate process when async, ~4 Hz): enclosure + exit route from the
  full view (bodies up to 1150 px). Enclosed without exit -> pocket2's exact
  tightest coil, re-verified by the reflex against near bodies every tick.
  pocket's wide-orbit search is dropped (heaviest part, rarely chosen live).
Simulator runs use the synchronous planner so results stay deterministic.
"""
import multiprocessing as mp
import time
import numpy as np
from scipy.spatial.distance import cdist
import brain as B
from staged import obstacles, contact_times
from geometry import nearest_gap
from pocket import local_space, check_orbits, STEP
from pocket2 import tight_check, EAT, RESERVE
from pocket3 import PAD
from pocket4 import head_threat
from pocket5 import contested_cluster, CLUSTER_MIN

NEAR_R = 800.            # user: select body pieces by straight-line distance
COARSE = 48            # 16 missed narrow gaps (2 sim deaths); 48 still ~35 ms p95 in crowds
HORIZON, DT, MARGIN = 1.6, .1, 12.
BUDGET = .025            # s; refinement is skipped once a tick has used this
REFINE = np.radians([-15., -7.5, 7.5, 15.])
ESCAPE_MIN = 2          # chunks (of ~16 candidates) always ranked exactly
ESCAPE_BUDGET = .030    # s from tick start; live only
PLAN_PERIOD = .25
ENTER, LEAVE = .85, .5
POWER, BOOST_CLEAR, NEAR_CLUSTER, RUN_RATIO, W_FOOD, W_PROGRESS = 2., 35., 180., 1., 3.5, 2.5


def near_segments(segs, p, radius=NEAR_R):
    segs = np.asarray(segs, float).reshape(-1, 5)
    if not len(segs):
        return segs
    a, b = segs[:, :2], segs[:, 2:4]
    ab = b-a
    t = np.clip(((p-a)*ab).sum(1)/np.maximum((ab*ab).sum(1), 1e-9), 0, 1)
    return segs[np.linalg.norm(a+t[:, None]*ab-p, axis=1) < radius+segs[:, 4]]


def orbit_search(s, m, circles):
    """pocket's orbit candidates (beside us, and centred in the roomiest cells),
    checked over a full lap; returns the best safe (centre, radius, sign) or None."""
    p = np.array([s['x'], s['y']])
    speed = (B.NSP1+B.NSP2*s['sc'])*B.SPF
    minimum = speed/(B.TURN*B.scang(s['sc']))*1.25
    normal = np.array([-np.sin(s['ang']), np.cos(s['ang'])])
    options = [(p+normal*r*sign, r, sign) for r in minimum*np.array([1., 1.4, 2., 3., 4.]) if r <= 400 for sign in (-1, 1)]
    room = m['room'].copy()
    for _ in range(4):
        index = np.unravel_index(room.argmax(), room.shape)
        available = room[index]-STEP*1.5
        if available < minimum: break
        center = m['points'][index]
        for r in np.unique([minimum, min(400., available*.75)]):
            if r >= minimum: options += [(center, r, sign) for sign in (-1, 1)]
        room[np.linalg.norm(m['points']-center, axis=-1) < minimum*1.5] = 0
    first, paths, times, safe, quality = check_orbits(s, options, circles)
    if not safe.any():
        return None
    c, r, sign = options[int(np.argmax(np.where(safe, quality, -np.inf)))]
    return [float(c[0]), float(c[1]), float(r), int(sign)]


def plan(s):
    """Planner step: enclosure, exit waypoint and a fallback orbit from the full view."""
    circles = obstacles(s['segs'])
    m = local_space(s, circles)
    waypoint = None
    if m['route'] is not None:
        route = m['route']
        j = int(np.argmin(np.linalg.norm(route-np.array([s['x'], s['y']]), axis=1)))
        waypoint = route[min(j+12, len(route)-1)]
    orbit = orbit_search(s, m, circles) if (m['enclosed'] or m['coverage'] >= LEAVE) and m['valid'] else None
    return dict(t=s.get('t', 0.), enclosed=bool(m['enclosed']), coverage=float(m['coverage']),
                waypoint=None if waypoint is None else waypoint.tolist(), orbit=orbit)


def _planner_worker(conn):
    while True:
        s = conn.recv()
        if s is None:
            return
        conn.send(plan(s))


class Pocket6Controller:
    period = 1/30                      # live loop rate: the client sends turns at most every 33 ms
    enter, exit_boost = ENTER, False   # later versions may defend earlier / boost out
    near_view = (NEAR_R, 1150., 8)     # browser sends near bodies; full view every 8th tick for the planner

    def __init__(self, async_plan=False):
        self.async_plan = async_plan
        self.proc = self.conn = None
        if async_plan:
            self.conn, child = mp.Pipe()
            self.proc = mp.Process(target=_planner_worker, args=(child,), daemon=True)
            self.proc.start()
        self.reset()

    def reset(self):
        self.last = {}; self.plan = None; self.busy = False; self.plan_t = -1e9
        self.defending = False; self.prev = None; self.tight = None; self.orbit = None
        self.loop_closed = False

    def close(self):
        if self.proc is not None:
            try: self.conn.send(None)
            except Exception: pass
            self.proc.join(1); self.proc.terminate(); self.proc = None

    def __del__(self):
        self.close()

    def _update_plan(self, s):
        now = s.get('t', 0.)
        if not self.async_plan:
            if now-self.plan_t >= PLAN_PERIOD:
                self.plan = plan(s); self.plan_t = now
            return
        if self.busy and self.conn.poll():
            self.plan = self.conn.recv(); self.busy = False
        if not self.busy and s.get('full_view', True) and now-self.plan_t >= PLAN_PERIOD:
            keys = ('x', 'y', 'ang', 'sc', 'wall', 'segs', 't', 'heads', 'pending', 'tgt', 'boost', 'L')
            self.conn.send({k: s[k] for k in keys if k in s}); self.busy = True; self.plan_t = now

    def escape_adjust(self, s, P, times, tc, depth):
        """Hook to add contact hypotheses to the emergency ranking; none here."""
        return tc, depth

    def extra_cost(self, s, e):
        """Per-candidate utility penalty hook for later versions; none here."""
        return 0.

    # ---- reflex -------------------------------------------------------
    def _evaluate(self, s, angles, boosted, circles, heads):
        p = np.array([s['x'], s['y']])
        r = B.BODY_R*s['sc']
        cruise = (B.NSP1+B.NSP2*s['sc'])*B.SPF
        omega = B.TURN*B.scang(s['sc'])
        count = len(angles)
        xy = np.tile(p, (count, 1)); direction = np.full(count, s['ang'])
        target, boost = s.get('tgt', s['ang']), s.get('boost', False)
        path, times, speeds, elapsed = [], [], [], 0.
        for command in s.get('pending', []):
            if command is not None: target, boost = command
            direction += np.clip(B.wrap(target-direction), -omega/30, omega/30)
            speed = B.NSP3*B.SPF if boost and s['L'] > 20 else cruise
            xy += np.column_stack((np.cos(direction), np.sin(direction)))*speed/30
            elapsed += 1/30; path.append(xy.copy()); times.append(elapsed); speeds.append(np.full(count, speed))
        for _ in range(round(HORIZON/DT)):
            direction += np.clip(B.wrap(angles-direction), -omega*DT, omega*DT)
            speed = np.where(boosted, B.NSP3*B.SPF, cruise)
            xy += np.column_stack((np.cos(direction), np.sin(direction)))*speed[:, None]*DT
            elapsed += DT; path.append(xy.copy()); times.append(elapsed); speeds.append(speed)
        path = np.stack(path, 1); times = np.array(times); speeds = np.stack(speeds, 1)
        pad = r+MARGIN+speeds*DT/2
        clear = np.full(path.shape[:2], 1000.)
        if len(circles):
            clear = np.minimum(clear, nearest_gap(path.reshape(-1, 2), circles).reshape(clear.shape)-pad)
        wall = np.asarray(s['wall'])
        clear = np.minimum(clear, wall[2]-np.linalg.norm(path-wall[:2], axis=2)-pad)
        static = clear.min(1)
        vmax = B.NSP3*B.SPF
        for h in heads:          # moving threats: heads only, as in the predict stage
            if np.linalg.norm(h[:2]-p) > elapsed*(cruise+vmax)+250:
                continue
            velocity = h[3]*B.SPF*np.array([np.cos(h[2]), np.sin(h[2])])
            q = h[:2]+times[:, None]*velocity
            dist = cdist(path.reshape(-1, 2), np.vstack((h[:2], q))).reshape(count, len(times), -1)
            turn_bound = B.TURN*B.scang(h[4])
            for k, t in enumerate(times):
                d = dist[:, k, :k+2].min(1)-pad[:, k]-B.BODY_R*h[4]-np.linalg.norm(velocity)*DT/2
                immediate = max(0., vmax-np.linalg.norm(velocity))*t+.5*vmax*turn_bound*t*t
                d -= max(min(100., 25*t*t), immediate if t <= .45 else 0.)
                clear[:, k] = np.minimum(clear[:, k], d)
        hit = clear < 0
        return dict(P=path, times=times, safe=~hit.any(1), clearance=clear.min(1), static=static,
                    tc=np.where(hit.any(1), times[hit.argmax(1)], elapsed+DT), angles=angles, boosted=boosted)

    def _candidates(self, s, circles, heads, start):
        rel = np.arange(COARSE)*2*np.pi/COARSE
        if self.prev is not None:
            rel = np.r_[B.wrap(self.prev-s['ang']), rel]      # previous choice first
        speeds = [False, True] if s['L'] > 40 else [False]
        angles = np.concatenate([s['ang']+rel for _ in speeds])
        boosted = np.repeat(speeds, len(rel))
        e = self._evaluate(s, angles, boosted, circles, heads)
        refined = False
        if not self.async_plan or time.perf_counter()-start < BUDGET:   # budget applies live only (deterministic sims)
            key = np.where(e['safe'], 1e3+e['clearance'], e['tc'])
            top = np.argsort(-key)[:2]
            extra_a = np.concatenate([e['angles'][i]+REFINE for i in top])
            extra_b = np.repeat(e['boosted'][top], len(REFINE))
            e2 = self._evaluate(s, extra_a, extra_b, circles, heads)
            e = {k: np.concatenate((e[k], e2[k])) if k not in ('times',) else e[k] for k in e}
            refined = True
        return e, refined

    def __call__(self, s):
        start = time.perf_counter()
        s = dict(s)
        p = np.array([s['x'], s['y']])
        full = np.array(s['segs'], float).reshape(-1, 5); full[:, 4] += PAD
        s['segs'] = full
        self._update_plan(s)
        near = near_segments(full, p)
        s_near = dict(s, segs=near)
        heads = np.asarray(s['heads'], float).reshape(-1, 5)
        circles = obstacles(near)
        if len(heads):
            circles = np.vstack((circles, np.column_stack((heads[:, :2], B.BODY_R*heads[:, 4]))))
        m = self.plan
        if m is not None:
            if m['enclosed'] or m['coverage'] >= self.enter: self.defending = True
            if not m['enclosed'] and m['coverage'] < LEAVE: self.defending = False
        if self.defending and m is not None and m['waypoint'] is None:
            signs = (self.tight,) if self.tight else (-1, 1)
            safe, quality, paths, times, radius = tight_check(s_near, obstacles(near), signs)
            if safe.any():
                i = int(np.argmax(np.where(safe, quality, -np.inf)))
                self.tight = int(signs[i])
                cmd = (float(B.wrap(s['ang']+self.tight*np.pi/2)), False)
                return self._done(start, cmd, 'tight_coil', dict(P=paths, safe=safe, selected=i,
                                  tc=np.where(safe, times[-1], 0.), horizon=times[-1]), radius=float(radius))
        self.tight = None
        if self.defending and m is not None and m['waypoint'] is None:
            # Wider orbit found by the planner; re-verified here against near bodies and live heads.
            orbit = self.orbit or m.get('orbit')
            if orbit is not None:
                option = [(np.array(orbit[:2]), orbit[2], orbit[3])]
                first, paths, times, safe, quality = check_orbits(s_near, option, obstacles(near))
                if safe[0]:
                    self.orbit = orbit
                    return self._done(start, (float(B.wrap(first[0])), False), 'pocket_loop',
                                      dict(P=paths, safe=safe, selected=0, tc=np.where(safe, times[-1], 0.),
                                           horizon=times[-1]), radius=float(orbit[2]))
        self.orbit = None
        e, refined = self._candidates(s, circles, heads, start)
        n = len(e['angles']); boosted = e['boosted']; P = e['P']
        steering = np.abs(B.wrap(e['angles']-s['ang']))
        if not e['safe'].any():
            # Exact contact ranking, most promising candidates first (margin model),
            # in chunks until the escape budget is spent (live only; the simulator
            # ranks all so results stay deterministic). Cutting to a fixed top-16
            # cost 6 of 8 sim games; ranking all took ~60 ms in extreme crowds.
            order = np.lexsort((e['clearance'], e['tc']))[::-1]
            done, tc, depth = [], [], []
            for chunk in np.array_split(order, max(1, len(order)//16)):
                if len(done) >= ESCAPE_MIN and self.async_plan and time.perf_counter()-start > ESCAPE_BUDGET:
                    break
                ctc, cdepth = contact_times(s_near, P[chunk], e['times'])
                ctc, cdepth = self.escape_adjust(s_near, P[chunk], e['times'], ctc, cdepth)
                done.append(chunk); tc.append(ctc); depth.append(cdepth)
            top = np.concatenate(done); tc = np.concatenate(tc); depth = np.concatenate(depth)
            best = int(top[np.lexsort((-steering[top], e['clearance'][top], depth, tc))[-1]])
            return self._finish(start, s, e, best, 'escape', refined)
        if self.defending and m is not None and m['waypoint'] is not None:
            eligible = e['safe'] & ~boosted if (e['safe'] & ~boosted).any() and not self.exit_boost else e['safe']
            cost = np.linalg.norm(P[:, -1]-np.array(m['waypoint']), axis=1)
            best = int(np.argmin(np.where(eligible, cost, np.inf)))
            return self._finish(start, s, e, best, 'exit', refined)
        return self._forage(start, s, e, refined, steering)

    def _forage(self, start, s, e, refined, steering):
        p = np.array([s['x'], s['y']])
        safe, static, P, boosted = e['safe'], e['static'], e['P'], e['boosted']
        eligible = safe & (static >= min(RESERVE, float(static[safe].max())))
        heads, wall, endpoint = np.asarray(s['heads'], float).reshape(-1, 5), np.asarray(s['wall']), P[:, -1]
        k = (np.linalg.norm(endpoint[:, None]-heads[None, :, :2], axis=2) < 1200).sum(1)
        radial = np.linalg.norm(endpoint-wall[:2], axis=1)/wall[2]
        activity = np.maximum(2-k, 0)+np.maximum(k-10, 0)*.5+20*np.maximum(radial-.78, 0)
        if len(heads) and (np.linalg.norm(heads[:, :2]-p, axis=1) < 1200).sum() < 2:
            activity += np.linalg.norm(endpoint-heads[:, :2].mean(0), axis=1)/1200
        eligible &= activity <= activity[eligible].min()+.35
        f = np.asarray(s['food'], float).reshape(-1, 3)
        f = f[np.linalg.norm(f[:, :2]-p, axis=1) < 900]
        count = len(safe); food = np.zeros(count); eaten = np.zeros(count)
        if len(f):
            f = np.column_stack((f[:, :2], f[:, 2]/max(float(np.median(f[:, 2])), 1e-6)))  # pocket5 units
            dmin = cdist(P.reshape(-1, 2), f[:, :2]).reshape(count, P.shape[1], -1).min(1)
            r = B.BODY_R*s['sc']+EAT
            inside = dmin < r
            eaten = (f[:, 2]*inside).sum(1)
            food = (f[:, 2]**POWER*np.where(inside, 1., (r+50)**2/(dmin+50)**2)).sum(1)
        target = contested_cluster(f, p, s, POWER) if len(f) else None
        progress = np.zeros(count); run = None
        if target is not None and target[1] >= CLUSTER_MIN:
            centre, mass, raw = target
            dist = np.linalg.norm(centre-p)
            progress = (dist-np.linalg.norm(endpoint-centre, axis=1))/(HORIZON*B.NSP3*B.SPF)
            if dist > NEAR_CLUSTER and raw > RUN_RATIO*(4+s['L']/150)*dist/(B.NSP3*B.SPF):
                run = eligible & boosted & (static >= BOOST_CLEAR)
        if run is not None and run.any():
            eligible = run
        elif (eligible & ~boosted).any():
            gain = eaten[eligible & boosted].max(initial=0.)-eaten[eligible & ~boosted].max(initial=0.)
            if gain <= 2*(4+s['L']/150)*HORIZON: eligible &= ~boosted
        diff = np.abs(B.wrap(e['angles'][:, None]-e['angles'][None, :]))
        near_dir = (diff < np.radians(35)) & (boosted[:, None] == boosted[None, :])
        openness = (near_dir*safe[None, :]).sum(1)/near_dir.sum(1)
        risk, _ = head_threat(s, P, e['times'])
        utility = W_FOOD*food/max(food.max(), 1e-9)+W_PROGRESS*progress+.35*openness-.15*steering-risk-self.extra_cost(s, e)
        best = int(np.argmax(np.where(eligible, utility, -np.inf)))
        mode = 'cluster_run' if run is not None and run.any() else 'forage'
        return self._finish(start, s, e, best, mode, refined,
                            cluster=None if target is None else [round(v, 1) for v in (*target[0], target[1])])

    def _finish(self, start, s, e, best, mode, refined, **extra):
        self.prev = float(e['angles'][best])
        cmd = (float(B.wrap(e['angles'][best])), bool(e['boosted'][best]))
        return self._done(start, cmd, mode, dict(P=e['P'], safe=e['safe'], selected=best, tc=e['tc'],
                          tr=e['tc'], horizon=e['times'][-1], static_clearance=e['static']),
                          refined=refined, candidates=len(e['angles']), boost=cmd[1], **extra)

    def _done(self, start, cmd, mode, e, **extra):
        self.last = dict(stage='pocket6', mode=mode, ms=round((time.perf_counter()-start)*1000, 1),
                         plan_age=None if self.plan is None else round(float(self.plan_t), 2),
                         defending=self.defending, **extra)
        e['status'] = self.last
        return cmd, e


if __name__ == '__main__':  # self-checks
    from pocket_scenarios import PocketArena
    # 1) closed ring: exact tight coil keeps us alive
    w = PocketArena('closed', 1); c = Pocket6Controller(); cmd = None
    for k in range(900):
        if k % 2 == 0: cmd = c(w.state())[0]
        w.step(cmd)
    assert w.alive and c.last['mode'] == 'tight_coil', (w.cause, c.last)
    # 2) opening ring: we leave through the exit
    w = PocketArena('opening', 2); c = Pocket6Controller(); cmd = None
    for k in range(1800):
        if k % 2 == 0: cmd = c(w.state())[0]
        w.step(cmd)
        if w.escaped: break
    assert w.alive and w.escaped, (w.cause, c.last)
    # 2b) a head sweeping through the pocket: fall back to the planner's wider orbit
    w = PocketArena('intruder', 79200); c = Pocket6Controller(); cmd = None
    for k in range(1800):
        if k % 2 == 0: cmd = c(w.state())[0]
        w.step(cmd)
        if not w.alive: break
    assert w.alive, (w.t, w.cause, c.last)
    # 3) a distant dead-snake pile triggers a boosted run
    w = PocketArena('open_food', 3); w.L = 800.
    scattered = np.column_stack((np.linspace(-600, 600, 25), np.full(25, 300.), np.full(25, 5.)))
    pile = np.column_stack((np.full(8, 650.)+np.arange(8)*6, np.zeros(8), np.full(8, 14.)))
    c = Pocket6Controller()
    cmd, _ = c(dict(w.state(), food=np.vstack((scattered, pile)),
                    heads=np.array([[400., 900., 0., 5., 1.], [-400., 900., 0., 5., 1.]])))
    assert c.last['mode'] == 'cluster_run' and cmd[1], c.last
    # 4) async planner process round-trips
    c = Pocket6Controller(async_plan=True); s = PocketArena('closed', 1).state()
    for k in range(20):
        c(dict(s, t=k*.05)); time.sleep(.02)
    assert c.plan is not None and c.plan['enclosed'], c.plan
    c.close()
    print('ok coil/exit/cluster/async')
