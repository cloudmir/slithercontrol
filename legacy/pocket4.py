"""pocket4: pocket3 + heading-aware threat cost + greedier dead-snake food.

pocket3.py stays the frozen control (600 s live survival, 2026-09-24 14:41).
- Threat: each head within 900 px is forecast along its current velocity over
  the candidate's own time grid. Its weight grows with how directly it moves
  toward us (closing speed / its speed): a receding head keeps a small weight,
  a head coming straight at us gets the full weight. Cost = weight *
  exp(-gap/THREAT_SCALE) at the closest predicted approach. The hard safety
  check (pocket3/predict) is unchanged; this only re-ranks safe candidates.
- Food: value**2 (big dead-snake pellets dominate), lower cluster threshold,
  boost runs when food beats 1x the trip's boost cost, smaller clearance on
  runs (live 600 s game never came closer than 36.7 px), larger food/progress
  weights. Tunables were set from the two usable live games + local runs; they
  are not optimised values.
"""
import numpy as np
import brain as B
from pocket3 import Pocket3Controller

THREAT_R = 900.
THREAT_SCALE = 120.
THREAT_W = 2.
RECEDING = .2         # weight of a head moving directly away from us


def head_threat(s, P, times):
    """(candidates,) heading-weighted closest-approach cost; plus per-head weights."""
    p = np.array([s['x'], s['y']])
    heads = np.asarray(s['heads'], float).reshape(-1, 5)
    risk = np.zeros(len(P)); weights = []
    for h in heads:
        offset = p-h[:2]
        dist = np.linalg.norm(offset)
        if dist > THREAT_R or dist < 1e-6:
            continue
        direction = np.array([np.cos(h[2]), np.sin(h[2])])
        closing = float(direction @ offset/dist)          # +1 straight at us, -1 straight away
        weight = RECEDING+(1-RECEDING)*max(0., closing)
        q = h[:2]+times[:, None]*h[3]*B.SPF*direction
        gap = np.linalg.norm(P-q[None], axis=-1).min(1)-B.BODY_R*(s['sc']+h[4])
        risk += weight*np.exp(-np.maximum(gap, 0.)/THREAT_SCALE)
        weights.append(round(weight, 2))
    return THREAT_W*risk, weights


class Pocket4Controller(Pocket3Controller):
    power, cluster_min, boost_clear, near = 2., 10., 35., 180.
    run_ratio, w_food, w_progress = 1., 3.5, 2.5

    def threat(self, s, P):
        pending = len(s.get('pending', []))
        steps = P.shape[1]-pending
        times = np.r_[np.arange(1, pending+1)/30, pending/30+np.arange(1, steps+1)*self.base.config.horizon/steps]
        risk, weights = head_threat(s, P, times)
        self.threat_weights = weights
        return risk

    def _forage(self, s):
        cmd, e = super()._forage(s)
        self.last['stage'] = 'pocket4'
        self.last['threat_heads'] = len(getattr(self, 'threat_weights', []))
        return cmd, e


if __name__ == '__main__':  # self-checks
    base = dict(x=0., y=0., sc=1., pending=[])
    P = np.array([[[100., 0.], [200., 0.]], [[-100., 0.], [-200., 0.]]])   # right vs left candidate
    times = np.array([.5, 1.])
    toward = dict(base, heads=np.array([[400., 0., np.pi, 8., 1.]]))        # from the right, coming at us
    away = dict(base, heads=np.array([[400., 0., 0., 8., 1.]]))             # from the right, moving away
    r_toward, w_toward = head_threat(toward, P, times)
    r_away, w_away = head_threat(away, P, times)
    assert w_toward == [1.0] and w_away == [RECEDING], (w_toward, w_away)
    assert r_toward[0] > r_toward[1], 'heading at an approaching head must cost more'
    assert r_toward[0] > r_away[0], 'approaching head must cost more than a receding one'
    from pocket_scenarios import PocketArena
    w = PocketArena('open_food', 3)
    w.food = np.column_stack((np.full(8, 650.)+np.arange(8)*6, np.full(8, 0.), np.full(8, 12.)))
    w.L = 800.
    c = Pocket4Controller()
    cmd, e = c(dict(w.state(), heads=np.array([[400., 900., 0., 5., 1.], [-400., 900., 0., 5., 1.]])))
    assert c.last['mode'] == 'cluster_run' and cmd[1], c.last
    print('ok', 'toward', r_toward.round(3), 'away', r_away.round(3), c.last['mode'])
