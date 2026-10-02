"""pocket12: pocket11 + emergency ranking that looks past the overlap we are already in.

pocket11 stays the frozen control. 9 of 10 live pocket11 deaths (2026-09-24
22:28-23:16) happened in 'escape' (no candidate safe). The first black box
(23:33:57) shows why escape failed: our head sat within ~9 px (drawn) of a body,
so every candidate started inside the padded obstacle; contact time was 0.03 s
for all and the penetration depth was the same current overlap for all. The
ranking fell through to near-ties and the command jumped between headings up to
180 deg apart every tick (+172, -135, +172, -150, ...), so we never moved away.

- Exact drawn radii (no pad) and only the part of each path after the commands
  already in flight (T0): a candidate is ranked by its first future contact and
  then by its smallest future gap, so paths that move away from the body win.
- Hysteresis: the previous escape heading keeps a HOLD px bonus, so near-ties
  no longer flip the command.
"""
import numpy as np
import brain as B
from staged import obstacles
from geometry import nearest_gap
from pocket3 import PAD
from pocket11 import Pocket11Controller

HOLD = 4.          # px bonus for staying within HOLD_DEG of the previous escape heading
HOLD_DEG = 25.


class Pocket12Controller(Pocket11Controller):
    def escape_adjust(self, s, P, times, tc, depth):
        tc, depth = super().escape_adjust(s, P, times, tc, depth)
        t0 = len(s.get('pending', []))/30+.1
        future = times >= t0
        segs = np.array(s['segs'], float).reshape(-1, 5)
        segs[:, 4] -= PAD                                   # s_near carries pocket6's pad; use drawn radii
        circles = obstacles(segs)
        heads = np.asarray(s['heads'], float).reshape(-1, 5)
        if len(heads):
            circles = np.vstack((circles, np.column_stack((heads[:, :2], B.BODY_R*heads[:, 4]))))
        r = B.BODY_R*s['sc']
        g = nearest_gap(P.reshape(-1, 2), circles).reshape(P.shape[:2])-r if len(circles) else np.full(P.shape[:2], 1e3)
        g = g[:, future]
        hit = g < 0
        tc2 = np.where(hit.any(1), times[future][hit.argmax(1)], times[-1]+.1)
        tc = np.where(tc <= t0, tc2, np.minimum(tc, tc2))    # ignore contact we are already in
        depth = g.min(1)
        if self.prev is not None:
            heading = np.arctan2(*(P[:, -1]-P[:, 0]).T[::-1])
            depth = depth+HOLD*(np.abs(B.wrap(heading-self.prev)) < np.radians(HOLD_DEG))
        self.escape_gap = max(self.escape_gap if self.escape_gap is not None else -np.inf, float(depth.max()))   # per chunk
        return tc, depth

    def __call__(self, s):
        self.escape_gap = None
        cmd, e = super().__call__(s)
        self.last['stage'] = 'pocket12'
        if self.escape_gap is not None:
            self.last['escape_gap'] = round(self.escape_gap, 1)
        return cmd, e


if __name__ == '__main__':  # self-checks
    # Head 5 px (drawn) inside a long straight body on our left: every candidate starts
    # "in contact". pocket12 must turn away (right, negative angle), steadily, tick after tick.
    x = np.linspace(-400, 400, 41)
    body = np.column_stack((x[:-1], np.full(40, 40.), x[1:], np.full(40, 40.), np.full(40, 29.)))
    base = dict(x=0., y=0., ang=0., tgt=0., sc=1.1, L=150., boost=False, pending=[(0., False)]*3,
                wall=(0., 0., 20000.), heads=np.empty((0, 5)), segs=body, food=np.empty((0, 3)),
                own_body=np.column_stack((np.linspace(-200, 0, 20), np.zeros(20))))
    base['y'] = 40-29-B.BODY_R*base['sc']+5.                # drawn gap -5 px
    c = Pocket12Controller(); cmds = []
    for k in range(6):
        cmd, _ = c(dict(base, t=k/30))
        cmds.append(np.degrees(B.wrap(cmd[0])))
    assert c.last['mode'] == 'escape', c.last
    assert all(a < -20 for a in cmds), cmds                  # away from the body (it is at +y)
    assert max(cmds)-min(cmds) < 30, cmds                    # no flip-flopping
    print('ok escape away & steady:', [round(a) for a in cmds], 'deg; future gap', c.last['escape_gap'])
