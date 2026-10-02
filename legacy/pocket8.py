"""pocket8: pocket7 + guard against a snake running alongside to cut us off.

pocket7 stays the frozen control. Its live death (2026-09-24 20:10, 265 s): a
big snake ran parallel on our right, a body blocked ahead, and the corridor
closed. Heading-based threat (pocket4) scores a parallel runner as receding
(closing ~ 0 -> weight 0.2), yet running alongside is the classic cut setup.

- Cut forecast: a head within CUT_R px that moves roughly our way (within
  60 deg) and is beside us may turn in at its full turn rate (up to 90 deg),
  at its speed and at boost. The body it would lay is a wall; our candidate
  paths that come within CUT_MARGIN px of it (drawn radii) are dropped while
  any other safe candidate remains.
- Corridor: candidates whose end point has little room to the nearest body get
  a utility penalty, so we leave a narrowing gap before it closes.
"""
import numpy as np
from scipy.spatial.distance import cdist
import brain as B
from staged import obstacles
from geometry import nearest_gap
from pocket6 import near_segments
from pocket7 import Pocket7Controller

CUT_R = 600.
CUT_ALIGN = np.cos(np.radians(60))
CUT_LATERAL, CUT_BEHIND = 350., 250.
CUT_MARGIN = 10.
CORRIDOR_ROOM, CORRIDOR_W = 150., .8


def cut_paths(s, times):
    """Turn-in trajectories (T, 2) of heads running alongside us, with their radius."""
    p = np.array([s['x'], s['y']])
    u = np.array([np.cos(s['ang']), np.sin(s['ang'])])
    dt = np.diff(np.r_[0., times])
    out = []
    for h in np.asarray(s['heads'], float).reshape(-1, 5):
        rel = h[:2]-p
        if np.linalg.norm(rel) > CUT_R:
            continue
        hv = np.array([np.cos(h[2]), np.sin(h[2])])
        lateral = u[0]*rel[1]-u[1]*rel[0]
        if hv @ u < CUT_ALIGN or abs(lateral) > CUT_LATERAL or u @ rel < -CUT_BEHIND:
            continue
        turn = -np.sign(lateral) or 1.                 # toward our line
        omega = B.TURN*B.scang(h[4])
        for speed in (h[3]*B.SPF, B.NSP3*B.SPF):
            ang = h[2]+turn*np.minimum(omega*times, np.pi/2)
            step = np.column_stack((np.cos(ang), np.sin(ang)))*(speed*dt)[:, None]
            out.append((h[:2]+np.cumsum(step, axis=0), B.BODY_R*h[4]))
    return out


def cut_gap(s, P, times):
    """Per candidate: closest drawn gap to any turn-in body laid up to each time."""
    r = B.BODY_R*s['sc']
    gap = np.full(len(P), np.inf)
    T = P.shape[1]
    laid = np.tril(np.ones((T, T), bool))          # enemy point j exists at our step k if j <= k
    for Q, re in cut_paths(s, times):
        d = cdist(P.reshape(-1, 2), Q).reshape(len(P), T, T)
        d = np.where(laid[None], d, np.inf).min(2)-r-re
        gap = np.minimum(gap, d.min(1))
    return gap


def cut_contact(s, P, times):
    """Per candidate: first time a turn-in body would be touched (drawn radii), and min gap."""
    r = B.BODY_R*s['sc']
    T = P.shape[1]
    first = np.full(len(P), times[-1]+.1); low = np.full(len(P), np.inf)
    laid = np.tril(np.ones((T, T), bool))
    for Q, re in cut_paths(s, times):
        d = cdist(P.reshape(-1, 2), Q).reshape(len(P), T, T)
        d = np.where(laid[None], d, np.inf).min(2)-r-re
        hit = d < 0
        first = np.minimum(first, np.where(hit.any(1), times[hit.argmax(1)], times[-1]+.1))
        low = np.minimum(low, d.min(1))
    return first, low


class Pocket8Controller(Pocket7Controller):
    def _evaluate(self, s, angles, boosted, circles, heads):
        e = super()._evaluate(s, angles, boosted, circles, heads)
        g = cut_gap(s, e['P'], e['times'])
        clear = g > CUT_MARGIN
        self.cut_dropped = int((e['safe'] & ~clear).sum())
        if (e['safe'] & clear).any():
            e['safe'] = e['safe'] & clear
        return e

    def escape_adjust(self, s, P, times, tc, depth):
        # Rank emergencies against the cut-in as well as straight-line heads.
        ct, cg = cut_contact(s, P, times)
        self.cut_escape = int((ct < tc).sum())
        return np.minimum(tc, ct), np.minimum(depth, cg)

    def extra_cost(self, s, e):
        p = np.array([s['x'], s['y']])
        circles = obstacles(near_segments(s['segs'], p))
        if not len(circles):
            return 0.
        room = nearest_gap(e['P'][:, -1], circles)-B.BODY_R*s['sc']
        return CORRIDOR_W*(1-np.clip(room/CORRIDOR_ROOM, 0, 1))

    def __call__(self, s):
        self.cut_dropped = self.cut_escape = 0
        cmd, e = super().__call__(s)
        self.last.update(cut_dropped=self.cut_dropped, cut_escape=self.cut_escape)
        return cmd, e


if __name__ == '__main__':  # self-checks
    from pocket7 import Pocket7Controller as P7
    # A big snake runs alongside on one side, slightly behind our head: going straight or toward it
    # can be cut off; pocket8 must drop those candidates and steer away from that side.
    body = np.column_stack((np.linspace(-500, -30, 25)[:-1], np.full(24, 130.), np.linspace(-500, -30, 25)[1:], np.full(24, 130.), np.full(24, 14.5*2.)))
    s = dict(x=0., y=0., ang=0., tgt=0., sp=5.8, sc=1.5, L=900., boost=False, pending=[(0., False)]*3, t=0.,
             wall=(0., 0., 20000.), heads=np.array([[-30., 130., 0., 6.5, 2.]]), segs=body,
             food=np.empty((0, 3)), own_body=np.column_stack((np.linspace(-400, 0, 30), np.zeros(30))))
    c8 = Pocket8Controller(); cmd8, _ = c8(dict(s))
    c7 = P7(); cmd7, _ = c7(dict(s))
    lateral_side = np.sign(130.)                            # enemy is on the +y side
    assert c8.last['cut_dropped'] > 0 or c8.last['cut_escape'] > 0, c8.last
    assert np.sign(np.sin(cmd8[0])) == -lateral_side, (cmd8, c8.last)
    print('ok cut guard: dropped', c8.last['cut_dropped'], 'pocket8 heading', round(np.degrees(cmd8[0]), 1),
          'deg vs pocket7', round(np.degrees(cmd7[0]), 1), 'deg')
    # Direct check of the cut forecast: straight/toward-enemy paths are hit by the turn-in, away paths are not.
    times = np.r_[np.arange(1, 4)/30, .1+np.arange(1, 17)*.1]
    def straight(a):
        v = np.array([np.cos(a), np.sin(a)])*200.
        return (times[:, None]*v)[None]
    P = np.concatenate([straight(a) for a in (np.radians(45), 0., np.radians(-60), np.radians(-150))])
    ct, cg = cut_contact(s, P, times)
    # A boosted 90-degree turn-in sweeps everything ahead (toward < straight < away), but not behind it.
    assert ct[0] <= ct[1] <= ct[2] and ct[3] > times[-1], (ct, cg)
    print('ok cut forecast: contact at', ct[:3].round(2), 's for toward/straight/away; behind: none (gap', round(cg[3]), 'px)')
