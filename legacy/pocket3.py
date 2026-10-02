"""pocket3: pocket2 + food-cluster pursuit, big-food weighting, extra body margin.

New controller; pocket2.py stays the frozen control (live-tested 2026-09-24).
- Big food (dead-snake remains) counts superlinearly: weight = value**1.5.
- Food is binned into 100 px cells; the best cell by weight/(distance+200) is
  the target when it clears CLUSTER_MIN. Candidates earn progress toward it.
- Boost toward a strong, distant cluster only on a candidate that is safe with
  extra clearance and whose cluster mass beats twice the boost mass cost of the
  trip. Near the cluster we cruise so turning can sweep it up.
- Enemy body radii get +PAD px: the first live death had the model gap at +5.5 px.
"""
import numpy as np
from scipy.spatial.distance import cdist
import brain as B
from pocket2 import Pocket2Controller, EAT, RESERVE

PAD = 6.
CELL = 100.
CLUSTER_MIN = 15.     # weighted mass in one cell (~8 small pellets or one dead-snake chunk)
BOOST_CLEAR = 50.     # static clearance required on a boosted cluster run
NEAR = 250.           # cruise inside this distance of the cluster


def cluster_target(f, p, power=1.5):
    """Best food cell: (centroid, weighted mass, raw value) or None."""
    if not len(f):
        return None
    w = f[:, 2]**power
    cells = np.floor(f[:, :2]/CELL).astype(np.int64)
    _, idx = np.unique(cells, axis=0, return_inverse=True)
    idx = idx.ravel()
    mass = np.bincount(idx, w)
    raw = np.bincount(idx, f[:, 2])
    centre = np.column_stack([np.bincount(idx, w*f[:, d])/mass for d in (0, 1)])
    score = mass/(np.linalg.norm(centre-p, axis=1)+200)
    best = int(score.argmax())
    return centre[best], float(mass[best]), float(raw[best])


class Pocket3Controller(Pocket2Controller):
    # Tunables as class attributes so later versions can subclass, not copy.
    pad, power, cluster_min, boost_clear, near = PAD, 1.5, CLUSTER_MIN, BOOST_CLEAR, NEAR
    run_ratio, w_food, w_progress = 2., 2.5, 1.5

    def cluster(self, f, p, s):
        """Food-cluster target (centroid, weighted mass, raw value) or None."""
        return cluster_target(f, p, self.power)

    def threat(self, s, P):
        """Extra per-candidate risk cost; none in pocket3."""
        return np.zeros(len(P))

    def __call__(self, s):
        s = dict(s)
        segs = np.array(s['segs'], float).reshape(-1, 5)
        segs[:, 4] += self.pad
        s['segs'] = segs
        return super().__call__(s)

    def _forage(self, s):
        cmd, e = self.base(s)
        self.last = dict(self.base.last, stage='pocket3')
        safe = e['safe']
        if not safe.any():
            return cmd, e
        n = self.base.config.directions
        count = len(safe)
        boosted = np.arange(count) >= n
        angles = s['ang']+(np.arange(count) % n)*2*np.pi/n
        P, static = e['P'], e['static_clearance']
        p = np.array([s['x'], s['y']])
        eligible = safe & (static >= min(RESERVE, float(static[safe].max())))
        heads, wall, endpoint = s['heads'], np.asarray(s['wall']), P[:, -1]
        k = (np.linalg.norm(endpoint[:, None]-heads[None, :, :2], axis=2) < 1200).sum(1)
        radial = np.linalg.norm(endpoint-wall[:2], axis=1)/wall[2]
        activity = np.maximum(2-k, 0)+np.maximum(k-10, 0)*.5+20*np.maximum(radial-.78, 0)
        if len(heads) and (np.linalg.norm(heads[:, :2]-p, axis=1) < 1200).sum() < 2:
            activity += np.linalg.norm(endpoint-heads[:, :2].mean(0), axis=1)/1200
        eligible &= activity <= activity[eligible].min()+.35
        f = np.asarray(s['food'], float).reshape(-1, 3)
        f = f[np.linalg.norm(f[:, :2]-p, axis=1) < 900]
        food = np.zeros(count); eaten = np.zeros(count)
        if len(f):
            dmin = cdist(P.reshape(-1, 2), f[:, :2]).reshape(count, P.shape[1], -1).min(1)
            r = B.BODY_R*s['sc']+EAT
            inside = dmin < r
            w = f[:, 2]**self.power
            eaten = (f[:, 2]*inside).sum(1)
            food = (w*np.where(inside, 1., (r+50)**2/(dmin+50)**2)).sum(1)
        target = self.cluster(f, p, s)
        progress = np.zeros(count); run = None
        if target is not None and target[1] >= self.cluster_min:
            centre, mass, raw = target
            dist = np.linalg.norm(centre-p)
            reach = self.base.config.horizon*B.NSP3*B.SPF
            progress = (dist-np.linalg.norm(endpoint-centre, axis=1))/reach
            trip_cost = (4+s['L']/150)*dist/(B.NSP3*B.SPF)
            if dist > self.near and raw > self.run_ratio*trip_cost:
                run = eligible & boosted & (static >= self.boost_clear)
        if run is not None and run.any():
            eligible = run
        elif eligible[~boosted].any():
            # Otherwise boost only for food eaten within the horizon (pocket2 rule).
            cost = (4+s['L']/150)*self.base.config.horizon
            gain = eaten[eligible & boosted].max(initial=0.)-eaten[eligible & ~boosted].max(initial=0.)
            if gain <= 2*cost: eligible &= ~boosted
        openness = safe[:n].astype(float)
        openness = np.tile(sum(np.roll(openness, j) for j in range(-2, 3))/5, count//n)
        steering = np.abs(B.wrap(angles-s['ang']))
        risk = self.threat(s, P)
        utility = self.w_food*food/max(food.max(), 1e-9)+self.w_progress*progress+.35*openness-.15*steering-risk
        best = int(np.argmax(np.where(eligible, utility, -np.inf)))
        e['selected'] = best
        self.last.update(mode='cluster_run' if run is not None and run.any() else 'forage',
                         boost=bool(boosted[best]), food=float(food[best]), eaten=float(eaten[best]),
                         tc=float(e['tc'][best]),
                         cluster=None if target is None else [round(v, 1) for v in (*target[0], target[1])])
        e['status'] = self.last
        return (float(B.wrap(angles[best])), bool(boosted[best])), e


if __name__ == '__main__':  # self-checks
    # 1) a dead-snake pile outweighs scattered pellets that are nearer
    p = np.zeros(2)
    scattered = np.column_stack((np.linspace(-300, 300, 12), np.full(12, 150.), np.ones(12)))
    pile = np.column_stack((np.full(6, 600.)+np.arange(6)*5, np.full(6, -400.), np.full(6, 12.)))
    centre, mass, raw = cluster_target(np.vstack((scattered, pile)), p)
    assert centre[0] > 550 and centre[1] < -350, centre
    # 2) in open space with a distant pile, the controller runs at it with boost
    from pocket_scenarios import PocketArena
    w = PocketArena('open_food', 3)
    w.food = np.column_stack((np.full(8, 650.)+np.arange(8)*6, np.full(8, 0.), np.full(8, 12.)))
    w.L = 800.
    c = Pocket3Controller()
    s = dict(w.state(), heads=np.array([[400., 900., 0., 5., 1.], [-400., 900., 0., 5., 1.]]))
    cmd, e = c(s)
    assert c.last['mode'] == 'cluster_run' and cmd[1], c.last
    print('ok', c.last['mode'], 'boost', cmd[1])
