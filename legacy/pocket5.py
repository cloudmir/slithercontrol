"""pocket5: pocket4 with live-calibrated food units and contested-food avoidance.

pocket4.py stays the frozen control (live 177.9 s death, 2026-09-24 15:03).
Findings from that game:
- Live food sizes are ~4-6 for normal pellets and ~13-16 for big ones, while the
  simulator uses 1-5. The pocket3/4 cluster threshold (tuned on sim units) was
  crossed by a single live pellet, so cluster runs fired ~57% of the time.
  -> Food values are divided by the median visible size, so a normal pellet is
     ~1 and a big one ~3 in both worlds; the cluster threshold is then raised.
- It died boosting along a dead-snake trail that two other snakes, one big and
  boosting, were eating too.
  -> A cell is discounted for each rival head that reaches it no later than we
     do and is heading its way; a bigger or boosting rival, or any head closing
     on us within 400 px, cancels boost runs to that cluster.
"""
import numpy as np
import brain as B
from pocket3 import CELL
from pocket4 import Pocket4Controller

CLUSTER_MIN = 20.       # normalized weighted mass: ~3 big pellets or ~20 normal ones
RIVAL_R = 1200.
BOOST_SP = 10.          # enemy speed units at or above this = boosting
DANGER_R = 400.


def contested_cluster(f, p, s, power):
    """Best food cell after discounting cells rivals will reach first.

    Returns (centroid, weighted mass, raw value); raw is 0 when a boost
    run there would be unsafe (big/boosting rival, or a head closing on us).
    """
    if not len(f):
        return None
    w = f[:, 2]**power
    cells = np.floor(f[:, :2]/CELL).astype(np.int64)
    _, idx = np.unique(cells, axis=0, return_inverse=True)
    idx = idx.ravel()
    mass = np.bincount(idx, w)
    raw = np.bincount(idx, f[:, 2])
    centre = np.column_stack([np.bincount(idx, w*f[:, d])/mass for d in (0, 1)])
    ours = np.linalg.norm(centre-p, axis=1)
    heads = np.asarray(s['heads'], float).reshape(-1, 5)
    heads = heads[np.linalg.norm(heads[:, :2]-p, axis=1) < RIVAL_R]
    factor = np.ones(len(centre)); veto = np.zeros(len(centre), bool)
    cruise = (B.NSP1+B.NSP2*s['sc'])*B.SPF
    for h in heads:
        to_cell = centre-h[:2]
        dist = np.linalg.norm(to_cell, axis=1)
        heading = np.array([np.cos(h[2]), np.sin(h[2])])
        aiming = (to_cell @ heading)/np.maximum(dist, 1.) > .8   # within ~37 degrees
        speed = max(h[3]*B.SPF, 1.)
        rival = ((dist/speed <= 1.2*ours/cruise) & aiming) | (dist < 200)
        big = h[4] > s['sc'] or h[3] >= BOOST_SP
        factor /= 1+rival*max(1., h[4]/s['sc'])
        veto |= rival & big
        offset = p-h[:2]
        near = np.linalg.norm(offset)
        if near < DANGER_R and heading @ offset/max(near, 1.) > .5:
            veto[:] = True                      # someone is coming at us: no boost runs
    score = mass*factor/(ours+200)
    best = int(score.argmax())
    return centre[best], float(mass[best]*factor[best]), 0. if veto[best] else float(raw[best]*factor[best])


class Pocket5Controller(Pocket4Controller):
    cluster_min = CLUSTER_MIN

    def cluster(self, f, p, s):
        return contested_cluster(f, p, s, self.power)

    def _forage(self, s):
        f = np.asarray(s['food'], float).reshape(-1, 3)
        self.food_scale = float(np.median(f[:, 2])) if len(f) else 1.
        if len(f):
            s = dict(s, food=np.column_stack((f[:, :2], f[:, 2]/max(self.food_scale, 1e-6))))
        cmd, e = super()._forage(s)
        self.last.update(stage='pocket5', food_scale=round(self.food_scale, 2))
        return cmd, e


if __name__ == '__main__':  # self-checks
    base = dict(x=0., y=0., sc=1., heads=np.empty((0, 5)))
    pile = np.column_stack((np.full(6, 500.)+np.arange(6)*6, np.zeros(6), np.full(6, 3.)))
    other = np.column_stack((np.zeros(6)+np.arange(6)*6, np.full(6, -600.), np.full(6, 3.)))
    f = np.vstack((pile, other))
    c0, m0, r0 = contested_cluster(f, np.zeros(2), base, 2.)
    assert c0[0] > 450 and r0 > 0, (c0, r0)                      # nearer pile, free to run
    rival = dict(base, heads=np.array([[650., 0., np.pi, 11., 2.]]))   # big boosting rival heading to it
    c1, m1, r1 = contested_cluster(f, np.zeros(2), rival, 2.)
    assert c1[1] < -450, c1                                         # switches to the uncontested pile
    rival_only = dict(base, heads=np.array([[650., 0., np.pi, 11., 2.], [0., -900., 0., 5., 1.]]))
    lone = np.vstack((pile,))
    c2, m2, r2 = contested_cluster(lone, np.zeros(2), rival_only, 2.)
    assert r2 == 0., r2                                             # only a contested pile: no boost run
    coming = dict(base, heads=np.array([[-300., 0., 0., 6., 1.]]))  # head closing on us from behind
    assert contested_cluster(f, np.zeros(2), coming, 2.)[2] == 0.
    # live units: a single normal pellet must not count as a cluster
    from pocket_scenarios import PocketArena
    w = PocketArena('open_food', 4)
    w.L = 800.
    scattered = np.column_stack((np.linspace(-600, 600, 25), np.full(25, 300.), np.full(25, 5.)))
    c = Pocket5Controller()
    heads = np.array([[400., 900., 0., 5., 1.], [-400., 900., 0., 5., 1.]])
    c(dict(w.state(), food=scattered, heads=heads))
    assert c.last['mode'] == 'forage', c.last
    big = np.vstack((scattered, np.column_stack((np.full(8, 650.)+np.arange(8)*6, np.zeros(8), np.full(8, 14.)))))
    c2 = Pocket5Controller()
    cmd, _ = c2(dict(w.state(), food=big, heads=heads))
    assert c2.last['mode'] == 'cluster_run' and cmd[1], c2.last   # a real big-pellet pile still triggers a run
    print('ok contested/vetoed/units', c.last['mode'], c2.last['mode'])
