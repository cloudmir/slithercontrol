"""pocket2: greedier foraging + an exact tightest-circle coil when enclosed.

New controller; pocket.py/staged.py are untouched controls.
- Forage: re-ranks the predict stage's safe candidates by ALL food passed along
  each path (not only near the endpoint), with a smaller clearance reserve, and
  permits boost only when the extra food eaten beats twice the boost mass cost.
- Coil: when enclosed, turn at the maximum rate every tick. The head then traces
  an exact circle of radius speed/omega; after one lap (2*pi/omega, ~2 s) our own
  body occupies the whole ring, so an opponent head must cross our body to reach
  us. Own body is never an obstacle in slither.io. The ring must be clear of
  observed bodies for 1.25 laps and of forecast heads for 2 s; NOT a guarantee.
"""
import numpy as np
from scipy.spatial.distance import cdist
import brain as B
from staged import obstacles
from pocket import PocketController, clearance, MARGIN

EAT = 25.           # suction radius beyond head radius (sim_active constant)
RESERVE = 30.       # static clearance reserve (predict stage uses 65)
ENTER, LEAVE = .85, .5  # ray coverage hysteresis; must stay >= pocket's .75/.4


def tight_paths(s, signs=(-1, 1), laps=1.25, dt=1/30):
    """Pending commands, then saturated turning: an exact circle per sign."""
    signs = np.asarray(signs, float)
    omega = B.TURN*B.scang(s['sc'])
    cruise = (B.NSP1+B.NSP2*s['sc'])*B.SPF
    xy = np.tile([s['x'], s['y']], (len(signs), 1)).astype(float)
    angle = np.full(len(signs), float(s['ang']))
    target, boost = s.get('tgt', s['ang']), s.get('boost', False)
    paths, times, t = [], [], 0.
    for command in s.get('pending', []):
        if command is not None: target, boost = command
        angle += np.clip(B.wrap(target-angle), -omega/30, omega/30)
        v = B.NSP3*B.SPF if boost and s['L'] > 20 else cruise
        xy += np.column_stack((np.cos(angle), np.sin(angle)))*v/30
        t += 1/30; paths.append(xy.copy()); times.append(t)
    for _ in range(int(np.ceil(laps*2*np.pi/omega/dt))):
        angle += signs*omega*dt
        xy += np.column_stack((np.cos(angle), np.sin(angle)))*cruise*dt
        t += dt; paths.append(xy.copy()); times.append(t)
    return np.stack(paths, 1), np.array(times), cruise/omega


def tight_check(s, circles, signs=(-1, 1)):
    paths, times, radius = tight_paths(s, signs)
    vmax = B.NSP3*B.SPF if s.get('boost') else (B.NSP1+B.NSP2*s['sc'])*B.SPF
    near = clearance(paths, s, circles)-MARGIN-vmax/30
    short = times <= 2.
    for h in s['heads']:
        v = h[3]*B.SPF*np.array([np.cos(h[2]), np.sin(h[2])])
        t = times[short]
        q = h[:2]+t[:, None]*v
        # Head and the new body it lays, with growing steering uncertainty.
        from geometry import point_segment
        d = np.minimum(np.linalg.norm(paths[:, short]-q[None], axis=-1), point_segment(paths[:, short], h[:2], q[None]))
        d -= B.BODY_R*(s['sc']+h[4])+MARGIN+(vmax+np.linalg.norm(v))/30+np.minimum(80., 20*t*t)
        near[:, short] = np.minimum(near[:, short], d)
    quality = near.min(1)
    return quality > 0, quality, paths, times, radius


class Pocket2Controller(PocketController):
    def reset(self):
        super().reset(); self.tight = None

    def __call__(self, s):
        circles = obstacles(s['segs'])
        now = s.get('t', 0.)
        if self.mapping is None or now-self.map_at >= .25:
            from pocket import local_space
            self.mapping = local_space(s, circles); self.map_at = now
        m = self.mapping
        if m['enclosed'] or m['coverage'] >= ENTER: self.defending = True
        if not m['enclosed'] and m['coverage'] < LEAVE: self.defending = False
        if not self.defending:
            self.tight = None; self.center = None; self.loop_closed = False
            return self._forage(s)
        if m['route'] is None:
            signs = (self.tight,) if self.tight else (-1, 1)
            safe, quality, paths, times, radius = tight_check(s, circles, signs)
            if not safe.any() and self.tight:
                signs = (-1, 1)
                safe, quality, paths, times, radius = tight_check(s, circles, signs)
            if safe.any():
                best = int(np.argmax(np.where(safe, quality, -np.inf)))
                self.tight = int(signs[best]); self.center = None
                self.last = dict(stage='pocket2', mode='tight_coil', enclosed=m['enclosed'],
                                 radius=float(radius), clearance=float(quality[best]), sign=self.tight)
                return (float(B.wrap(s['ang']+self.tight*np.pi/2)), False), dict(
                    P=paths, safe=safe, selected=best, tc=np.where(safe, times[-1], 0.),
                    tr=np.where(safe, times[-1], 0.), horizon=times[-1], status=self.last,
                    static_clearance=quality)
        # Opening available, or no tight ring fits: pocket's exit / wider orbits.
        # Our hysteresis keeps self.defending consistent with pocket's thresholds.
        self.tight = None
        cmd, e = super().__call__(s)
        self.last = dict(self.last, stage='pocket2')
        return cmd, e

    def _forage(self, s):
        cmd, e = self.base(s)
        self.last = dict(self.base.last, stage='pocket2')
        safe = e['safe']
        if not safe.any():
            return cmd, e
        n = self.base.config.directions
        count = len(safe)
        boosted = np.arange(count) >= n
        angles = s['ang']+(np.arange(count) % n)*2*np.pi/n
        P = e['P']
        eligible = safe & (e['static_clearance'] >= min(RESERVE, float(e['static_clearance'][safe].max())))
        # Stay in the activity band exactly like the predict stage does.
        heads, wall, endpoint = s['heads'], np.asarray(s['wall']), P[:, -1]
        p = np.array([s['x'], s['y']])
        k = (np.linalg.norm(endpoint[:, None]-heads[None, :, :2], axis=2) < 1200).sum(1)
        radial = np.linalg.norm(endpoint-wall[:2], axis=1)/wall[2]
        activity = np.maximum(2-k, 0)+np.maximum(k-10, 0)*.5+20*np.maximum(radial-.78, 0)
        if len(heads) and (np.linalg.norm(heads[:, :2]-p, axis=1) < 1200).sum() < 2:
            activity += np.linalg.norm(endpoint-heads[:, :2].mean(0), axis=1)/1200
        eligible &= activity <= activity[eligible].min()+.35
        food = np.zeros(count); eaten = np.zeros(count)
        f = np.asarray(s['food']).reshape(-1, 3)
        reach = np.linalg.norm(P-p, axis=-1).max()+300
        f = f[np.linalg.norm(f[:, :2]-p, axis=1) < reach]
        if len(f):
            dmin = cdist(P.reshape(-1, 2), f[:, :2]).reshape(count, P.shape[1], -1).min(1)
            r = B.BODY_R*s['sc']+EAT
            inside = dmin < r
            eaten = (f[:, 2]*inside).sum(1)
            food = (f[:, 2]*np.where(inside, 1., (r+50)**2/(dmin+50)**2)).sum(1)
        if eligible[~boosted].any():
            cost = (4+s['L']/150)*self.base.config.horizon
            gain = eaten[eligible & boosted].max(initial=0.)-eaten[eligible & ~boosted].max(initial=0.)
            if gain <= 2*cost: eligible &= ~boosted
        openness = safe[:n].astype(float)
        openness = np.tile(sum(np.roll(openness, j) for j in range(-2, 3))/5, count//n)
        steering = np.abs(B.wrap(angles-s['ang']))
        utility = 2.5*food/max(food.max(), 1e-9)+.35*openness-.15*steering
        best = int(np.argmax(np.where(eligible, utility, -np.inf)))
        e['selected'] = best
        self.last.update(mode='forage', boost=bool(boosted[best]), food=float(food[best]),
                         eaten=float(eaten[best]), tc=float(e['tc'][best]))
        e['status'] = self.last
        return (float(B.wrap(angles[best])), bool(boosted[best])), e


if __name__ == '__main__':  # self-check: tight coil is an exact circle and holds inside a closed ring
    from pocket_scenarios import PocketArena
    w = PocketArena('closed', 1)
    paths, times, radius = tight_paths(dict(w.state(), pending=[]), (1,), laps=1.)
    centre = paths[0].mean(0)
    assert np.ptp(np.linalg.norm(paths[0]-centre, axis=1)) < .05*radius, 'not a circle'
    c = Pocket2Controller()
    for k in range(900):
        cmd = c(w.state())[0] if k % 2 == 0 else cmd
        w.step(cmd)
    assert w.alive and c.last['mode'] == 'tight_coil', (w.cause, c.last)
    print('ok radius', round(radius, 1), 'mode', c.last['mode'])
