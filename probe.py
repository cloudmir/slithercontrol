"""Thickness probe (zero-base phase 1, user 2026-09-25): ride alongside another
snake's body at a set drawn gap and tighten it step by step until we die.

Test design (user 2026-09-25): per body thickness, find the stable band and the
death point fast, beside long (and preferably thick) snakes:
- target = the thickest isolated snake whose visible body is at least MIN_LEN px
  long; while none qualifies we head for the thickest visible one.
- schedule = GAPS: confirm steady tracking at +4 px, jump to -4 px (already seen
  alive live), then tighten STEP px every time the last ~0.5 s was steady.
  Each level held steadily is a "stable" data point; the level at death is the
  death point for (our r, its r). `python probe.py report runs/live_*.jsonl`.

Passive data (other snakes' deaths) is too coarse, so we measure directly:
- seek:   pick the nearest snake with a long visible body whose head is not
          coming at us; approach a point beside its body.
- follow: pure pursuit on the line offset from its body by D = r_ours + r_target
          + gap_set, travelling along the body in our current direction, aiming
          from where the head will be after LEAD s. When the median |error| over
          the last ~1 s is below STEADY px, gap_set drops by STEP. Only bodies
          with no other snake within ISOLATED px are followed.
- dodge:  any other snake's body/head within DODGE px of our next 0.4 s, or the
          target's head coming at us, overrides everything for a moment.
Each tick logs trace = gap_set, measured drawn gap to the target, radii. The
drawn gap at our death while following is one direct measurement of how close
a body of that thickness can be touched.
"""
from collections import deque
import numpy as np

GAPS = (4., -4.)                     # px drawn gap: confirm tracking, then jump to a level seen alive live
STEP, FLOOR = 1., -30.               # px per steady ~0.5 s below that; lowest
STEADY = 3.                          # px median |error| over ~1 s before tightening
LOOK = 80.                           # px pursuit lookahead along the body
MIN_LEN = 800.                       # px of visible body to count as a target (long, settled trail)
HEAD_CLEAR = 250.                    # px: follow only trail at least this far from the target's head
MAX_TURN = np.radians(90)            # a follow command needing more than this turn drops the target
DODGE, DODGE_S = 40., .3             # px clearance on the next 0.6 s; s held
FOLD_ARC = 300.                      # px along the target's body: farther parts are not the stretch beside us
ISOLATED = 180.                      # px: no other body this close to the followed stretch
PICK_R = 600.                        # px: only consider targets this close
RT_RANGE = tuple(float(v) for v in __import__('os').environ.get('PROBE_RT', '0,999').split(','))  # target radius band
BOOST_SP, BOOST_GAIN = 13., 15.       # sp field while boosting (assumed, check with measure.py); px of extra room to pay for it
LEAD = .1                            # s: aim from where the head will be when the command lands
R = 14.5


def seg_nearest(p, segs):
    a, b = segs[:, :2], segs[:, 2:4]; ab = b-a
    t = np.clip(((p-a)*ab).sum(1)/np.maximum((ab*ab).sum(1), 1e-9), 0, 1)
    q = a+t[:, None]*ab
    d = np.linalg.norm(q-p, axis=1)
    return d, q, t


def walk(segs, k, frac, dist, direction):
    """Point and unit tangent `dist` px along the polyline from segment k at frac."""
    ab = segs[:, 2:4]-segs[:, :2]
    length = np.linalg.norm(ab, axis=1)
    left = (1-frac)*length[k] if direction > 0 else frac*length[k]
    while dist > left:
        dist -= left
        k += direction
        if k < 0 or k >= len(segs):
            return None, None
        left = length[k]
    frac_now = (1-left/max(length[k], 1e-9))+dist/max(length[k], 1e-9) if direction > 0 else (left-dist)/max(length[k], 1e-9)
    t = ab[k]/max(length[k], 1e-9)
    return segs[k, :2]+frac_now*ab[k], t


class Probe:
    period = 1/30

    def __init__(self):
        self.target, self.stage = None, 0
        self.gap_set = GAPS[0]
        self.dodge_until, self.dodge_ang, self.dodge_boost, self.banned = -1., 0., False, {}
        self.errs = deque(maxlen=15)         # last ~0.5 s of tracking errors
        self.last = {}

    def _dodge_needed(self, s, p, u, speed):
        pts = p+np.outer(np.arange(1, 13)*.05*speed, u)
        segs, sid = s['segs'], s['sid']
        other = segs[sid != self.target] if self.target is not None else segs
        r = R*s['sc']
        if len(other):
            d = np.min([seg_nearest(q, other)[0]-other[:, 4] for q in pts], axis=0) if len(pts) else np.inf
            if np.min(d)-r < DODGE:
                return True
        # Heads (target's included) move: straight-line forecast over the next 0.6 s for both of us.
        t = np.arange(1, 13)*.05
        for h in s['heads']:
            q = h[:2]+np.outer(t*max(h[3], 4.)*32., [np.cos(h[2]), np.sin(h[2])])
            if (np.linalg.norm(pts-q, axis=1)-r-R*h[4]).min() < DODGE:
                return True
        return False

    def _dodge_heading(self, s, p, speed, goal=None):
        """(heading, boost) whose next 1 s keeps the most room (capped at 200 px); ties go toward `goal`.
        Boost only when it buys at least BOOST_GAIN px more room than the best cruise heading."""
        cruise = self._best_heading(s, p, speed, goal)
        fast = self._best_heading(s, p, max(BOOST_SP*32., speed), goal)
        return (fast[0], True) if fast[1] > cruise[1]+BOOST_GAIN else (cruise[0], False)

    def _best_heading(self, s, p, speed, goal):
        best, best_score = s['ang'], -np.inf
        segs = s['segs']
        if len(segs):
            segs = segs[seg_nearest(p, segs)[0] < speed+300]          # only what the next 1 s can reach
        t = np.arange(1, 11)*.1
        heads = [h[:2]+np.outer(t*max(h[3], 4.)*32., [np.cos(h[2]), np.sin(h[2])]) for h in s['heads']
                 if np.hypot(*(h[:2]-p)) < 2*speed+300]
        for a in s['ang']+np.radians(np.arange(-180, 180, 15)):
            u = np.array([np.cos(a), np.sin(a)])
            pts = p+np.outer(t*speed, u)
            g = min((seg_nearest(q, segs)[0]-segs[:, 4]).min() for q in pts) if len(segs) else 1e3
            for q in heads:
                g = min(g, np.linalg.norm(pts-q, axis=1).min()-2*R*s['sc']-30)
            w = s['wall']; g = min(g, w[2]-np.hypot(*(pts[-1]-w[:2])))
            score = min(g, 200.)
            if goal is not None:
                score -= .3*np.degrees(abs(np.angle(np.exp(1j*(a-np.arctan2(*(goal-p)[::-1]))))))
            if score > best_score: best, best_score = a, score
        return float(best), best_score

    def _pick(self, s, p, now):
        """Thickest isolated long snake; also the thickest long one at all (to head for)."""
        best = biggest = None
        for i in np.unique(s['sid']):
            if self.banned.get(i, -1) > now: continue
            segs = s['segs'][s['sid'] == i]
            if np.linalg.norm(segs[:, 2:4]-segs[:, :2], axis=1).sum() < MIN_LEN: continue
            d, q, _ = seg_nearest(p, segs)
            if d.min() > PICK_R: continue       # far targets mean crossing crowds to reach them
            if not RT_RANGE[0] <= segs[0, 4] < RT_RANGE[1]: continue   # thickness band under test
            key = (segs[0, 4], i, q[d.argmin()])
            if biggest is None or key[0] > biggest[0]: biggest = key
            if self._isolated(s, i, q[d.argmin()]) and (best is None or key[0] > best[0]): best = key
        return (None if best is None else best[1]), (None if biggest is None else biggest[2])

    def _drop(self, now, why, ang):
        self.banned[self.target] = now+3.; self.target = None; self.errs.clear()
        self.last = dict(mode='seek', gap_set=self.gap_set, dropped=why)
        return (float(ang), False), {}

    def _isolated(self, s, target, point):
        other = s['segs'][s['sid'] != target]
        return not len(other) or (seg_nearest(point, other)[0]-other[:, 4]).min() > ISOLATED

    def __call__(self, s):
        now, p = s['t'], np.array([s['x'], s['y']])
        u = np.array([np.cos(s['ang']), np.sin(s['ang'])])
        speed = max(s['sp'], 4.)*32.            # px/s; measured ~32 px/s per sp unit (measure.py)
        ro = R*s['sc']
        if now < self.dodge_until or self._dodge_needed(s, p, u, speed):
            if now >= self.dodge_until:
                (self.dodge_ang, self.dodge_boost), self.dodge_until = self._dodge_heading(s, p, speed), now+DODGE_S
                self.errs.clear()
            self.last = dict(mode='dodge', target=self.target, gap_set=self.gap_set, boost=self.dodge_boost)
            return (self.dodge_ang, self.dodge_boost), {}
        if self.target is None or not (s['sid'] == self.target).any():
            (self.target, toward), _ = self._pick(s, p, now), self.errs.clear()
            if self.target is None:
                w = s['wall']
                if toward is None:   # nothing long in view: cruise toward the busier centre
                    toward = p if np.hypot(*(p-w[:2])) < .5*w[2] else np.array(w[:2])
                goal = toward if np.hypot(*(toward-p)) > 300 else p+u*500
                cmd = self._dodge_heading(s, p, speed, goal)
                self.last = dict(mode='roam', gap_set=self.gap_set, boost=cmd[1])
                return cmd, {}
        segs = s['segs'][s['sid'] == self.target]
        rt = float(segs[0, 4])
        gap = float(seg_nearest(p, segs)[0].min()-ro-rt)      # measured now (logged)
        p = p+u*speed*LEAD                                      # control from where the command lands
        d, q, frac = seg_nearest(p, segs)
        k = int(d.argmin())
        if not self._isolated(s, self.target, q[k]):
            self.banned[self.target] = now+2.; self.target = None; self.errs.clear()
            self.last = dict(mode='seek', gap_set=self.gap_set)
            return (float(s['ang']), False), {}
        tan = (segs[k, 2:4]-segs[k, :2]); tan /= max(np.linalg.norm(tan), 1e-9)
        side = np.sign(tan[0]*(p-q[k])[1]-tan[1]*(p-q[k])[0]) or 1.
        heads = dict(zip(s['hid'].astype(int), s['heads']))
        h = heads.get(int(self.target))
        # Toward its head only if it outruns us (the head keeps moving away), else toward its tail.
        direction = 1 if h is not None and h[3] >= s['sp'] else -1
        if h is not None and np.hypot(*(h[:2]-q[k])) < HEAD_CLEAR:
            return self._drop(now, 'head too close', s['ang'])
        # Another part of the target's own body (a fold/loop) across our line in the next 0.8 s blocks
        # the way: leave now, while there is still room to turn.
        arc = np.r_[0., np.cumsum(np.linalg.norm(segs[:, 2:4]-segs[:, :2], axis=1))]
        far = segs[np.abs(arc[:-1]-arc[k]) > FOLD_ARC]
        if len(far):
            ray = p+np.outer(np.arange(1, 17)*.05*speed, u)
            if min((seg_nearest(q, far)[0]-far[:, 4]).min() for q in ray)-ro < max(self.gap_set, 0.)+10:
                self.banned[self.target] = now+3.; self.target = None; self.errs.clear()
                (self.dodge_ang, self.dodge_boost), self.dodge_until = self._dodge_heading(s, p, speed), now+DODGE_S
                self.last = dict(mode='dodge', target=None, gap_set=self.gap_set, dropped='fold ahead', boost=self.dodge_boost)
                return (self.dodge_ang, self.dodge_boost), {}
        D = ro+rt+self.gap_set
        # Far from the line, look farther along the body: the approach angle stays ~atan(1/2.5) (~22 deg)
        # instead of driving straight at the body (games 16-18 died that way at ~190 px/s closing).
        point, t2 = walk(segs, k, frac[k], max(LOOK, 2.5*(gap-self.gap_set)), direction)
        head_end = direction > 0 and k >= len(segs)-3
        if point is None or head_end:
            self.banned[self.target] = now+3.; self.target = None
            self.last = dict(mode='seek', gap_set=self.gap_set)
            return (float(s['ang']), False), {}
        normal = side*np.array([-t2[1], t2[0]])
        aim = point+normal*D-p
        err = gap-self.gap_set
        mode = 'follow' if abs(err) < 40 else 'seek'
        if mode == 'follow' and abs(np.angle(np.exp(1j*(np.arctan2(aim[1], aim[0])-s['ang'])))) > MAX_TURN:
            return self._drop(now, 'sharp turn', s['ang'])
        self.errs.append(abs(err) if mode == 'follow' else 1e3)
        steady = len(self.errs) == self.errs.maxlen and np.median(self.errs) < STEADY
        if steady and self.gap_set > FLOOR:                     # this level held: record it, go tighter
            self.stable = self.gap_set
            self.stage += 1
            self.gap_set = GAPS[self.stage] if self.stage < len(GAPS) else self.gap_set-STEP
            self.errs.clear()
        self.last = dict(mode=mode, target=int(self.target), gap_set=self.gap_set,
                         trace=dict(mode=mode, target=int(self.target), gap_set=self.gap_set, stable=getattr(self, 'stable', None),
                                    gap=round(gap, 1), err=round(err, 1),
                                    ro=round(ro, 1), rt=round(rt, 1), sp=round(float(s['sp']), 2)))
        return (float(np.arctan2(aim[1], aim[0])), False), {}


def report(paths):
    """Per game: our r, target r, deepest level held steadily, level/gap at death (target only)."""
    import gzip, json, pickle
    for f in paths:
        r = json.loads(open(f).read())
        tr = [x for x in r.get('trace', []) if x['mode'] == 'follow']
        if not tr:
            print(f, 'no follow'); continue
        box = pickle.load(gzip.open(f[:-6]+'/blackbox.pkl.gz'))
        s = box[-1]['state']; p = np.array([s['x'], s['y']])
        d = seg_nearest(p, s['segs'])[0]-s['segs'][:, 4]-R*s['sc'] if len(s['segs']) else [np.inf]
        killer = int(s['sid'][int(np.argmin(d))]) if len(s['segs']) else None
        last = tr[-1]
        # Valid: we died, the nearest body at the end is the one we were following, and we were
        # following it until the last ~0.3 s (a drop/dodge in the final ticks is the reflex, not the cause).
        on_target = (r.get('reason') == 'death' and killer == last.get('target', box[-1]['last'].get('target'))
                     and s['t']-last['t'] < .3)
        print(f"{f.split('/')[-1]:30s} ro {last['ro']:5.1f} rt {last['rt']:5.1f} ratio {last['rt']/last['ro']:4.2f} | "
              f"stable down to {min((x['stable'] for x in tr if x.get('stable') is not None), default=None)} px | "
              f"death {'on target' if on_target else 'NOT on target'} at set {last['gap_set']} px, observed {last['gap']} px, err {last['err']}")


if __name__ == '__main__' and len(__import__('sys').argv) > 2 and __import__('sys').argv[1] == 'report':
    report(__import__('sys').argv[2:])
elif __name__ == '__main__':  # self-check: a straight static body; we must lock on and tighten steadily
    body_r = 29.
    xs = np.linspace(-3000, 3000, 301)
    segs = np.column_stack((xs[:-1], np.zeros(300), xs[1:], np.zeros(300), np.full(300, body_r)))
    c = Probe(); p = np.array([-2500., 150.]); ang = 0.; sc = 1.2; sp = 5.8
    omega = np.radians(190); dt = 1/30
    gaps = []
    for k in range(30*20):
        s = dict(x=p[0], y=p[1], ang=ang, sp=sp, sc=sc, L=300, boost=False, t=k*dt, segs=segs, sid=np.full(300, 7.),
                 heads=np.array([[3000., 0., 0., 6.5, 2.]]), hid=np.array([7.]),     # its head far ahead, faster than us
                 food=np.empty((0, 3)), own=np.empty((0, 2)), wall=(0., 0., 50000.))
        (cmd, _), _ = c(s)
        ang += np.clip((cmd-ang+np.pi) % (2*np.pi)-np.pi, -omega*dt, omega*dt)
        p = p+sp*32*dt*np.array([np.cos(ang), np.sin(ang)])
        if c.last['mode'] == 'follow': gaps.append((c.last['gap_set'], p[1]-body_r-R*sc))
    g = np.array(gaps)
    err = np.abs(g[len(g)//2:, 0]-g[len(g)//2:, 1])
    assert c.gap_set < GAPS[-1]-3*STEP, c.gap_set      # confirmed at +4, jumped to -4, keeps tightening
    assert np.percentile(err, 90) < 4., np.percentile(err, 90)
    # Approach: start 250 px off the body heading straight at it; we must not hit it (games 16-18).
    # Live commands land ~0.15 s late (loop + network), so the check delays them by 5 ticks.
    c3 = Probe(); p = np.array([0., 250.]); ang = -np.pi/2; low = np.inf; queue = [ang]*5
    for k in range(30*5):
        s = dict(x=p[0], y=p[1], ang=ang, sp=sp, sc=sc, L=300, boost=False, t=k*dt, segs=segs, sid=np.full(300, 7.),
                 heads=np.array([[3000., 0., 0., 6.5, 2.]]), hid=np.array([7.]),
                 food=np.empty((0, 3)), own=np.empty((0, 2)), wall=(0., 0., 50000.))
        (cmd, _), _ = c3(s)
        queue.append(cmd); cmd = queue.pop(0)
        ang += np.clip((cmd-ang+np.pi) % (2*np.pi)-np.pi, -omega*dt, omega*dt)
        p = p+sp*32*dt*np.array([np.cos(ang), np.sin(ang)])
        low = min(low, p[1]-body_r-R*sc)
    assert low > GAPS[-1]-2., low       # never deeper than the schedule allows
    # Fold ahead: the same body turns across our line 150 px in front of us -> dodge, not follow.
    fold = np.column_stack((np.full(10, 150.), np.linspace(-80, 120, 11)[:-1], np.full(10, 150.), np.linspace(-80, 120, 11)[1:], np.full(10, body_r)))
    straight = np.column_stack((np.linspace(-600, 150, 26)[:-1], np.zeros(25), np.linspace(-600, 150, 26)[1:], np.zeros(25), np.full(25, body_r)))
    c2 = Probe(); c2.target = 7; c2.gap_set = -4.
    y = body_r+R*sc-4.
    s = dict(x=0., y=y, ang=0., sp=sp, sc=sc, L=300, boost=False, t=0., segs=np.vstack((straight, fold)), sid=np.full(35, 7.),
             heads=np.empty((0, 5)), hid=np.empty(0), food=np.empty((0, 3)), own=np.empty((0, 2)), wall=(0., 0., 50000.))
    c2(s)
    assert c2.last['mode'] == 'dodge' and c2.target is None, c2.last
    print('ok probe: gap_set', GAPS[0], '->', c.gap_set, 'px in 20 s; tracking error p90', round(float(np.percentile(err, 90)), 1), 'px')
    # Boost check: in a corridor with a fast head closing from behind, only boosting keeps room.
    xs = np.linspace(-600, 900, 31)
    wall = [np.column_stack((xs[:-1], np.full(30, y), xs[1:], np.full(30, y), np.full(30, 20.))) for y in (-60., 60.)]
    s = dict(x=0., y=0., ang=0., sp=5.8, sc=1., L=500, boost=False, t=0., segs=np.vstack(wall), sid=np.full(60, 3.),
             heads=np.array([[-150., 0., 0., 13., 1.]]), hid=np.array([9.]), food=np.empty((0, 3)), own=np.empty((0, 2)),
             wall=(0., 0., 21000.))
    (a, boost), _ = Probe()(s)
    assert boost and abs(a) < .3, (a, boost, Probe().last)
    print('boost escape ok')
