"""pocket9: pocket8 + the coil retraces one fixed circle (user goal: not even 1 px off).

pocket8 stays the frozen control. Its coil was saturated turning (target 90 deg
ahead): latency-proof, but the circle is whatever speed/turn rate give, and it
cannot be corrected. Live (2026-09-24, 2 deaths while coiling) the head stayed
within 1.7 / 3.8 px of a fitted circle whose centre drifted 0.6 / 2.0 px.

- On coil start the circle is fixed: radius TRACK_R x the model's tightest
  radius (live tightest was ~4 % below the model, so this leaves ~9 % turn
  authority to correct), centre beside the head so it is tangent.
- Every tick the head aims at the circle point LOOK s of travel ahead of where
  it will be once pending commands have run. Off the circle, the chord points
  back onto it. A slow integral on the radius error moves the aim circle to
  cancel steady offsets (chord sag, model/latency mismatch).
- Coil safety checks (pocket7) run along this same fixed circle.
- track_err = observed head distance from the fixed circle, logged every tick.

Result (2026-09-24, local, /tmp jitter tests): NOT adopted, not wired live.
Exact model: 0 px error. But with live-like disturbances it is worse than
pocket8's saturated coil, which stays exact (0 px) under all of them:
  latency guess +-1 tick: p9 max 4-14 px, dies in squeeze; p8 0 px, alive
  decision period 33/67 ms: p9 max 5-8 px, dies;              p8 0 px, alive
  0.3 px position noise:  p9 max 0.9-1.9 px, dies;            p8 0 px, alive
Saturated turning is a physical limit (max turn rate), so it needs no feedback
and ignores latency; any tracker adds feedback error, and outward error cannot
be corrected at saturation anyway. Kept as the record of the experiment.
"""
import numpy as np
import brain as B
from pocket8 import Pocket8Controller

TRACK_R = 1.05
LOOK = 1/15     # s; one tick is exact in the model but degenerates if live latency runs ahead
KI, BIAS_MAX = .1, 6.   # integral on the radius error: cancels live speed/turn/latency mismatch


def rollout(s):
    """Head position and heading once the pending commands have been applied."""
    omega = B.TURN*B.scang(s['sc'])
    cruise = (B.NSP1+B.NSP2*s['sc'])*B.SPF
    xy, angle = np.array([s['x'], s['y']], float), float(s['ang'])
    target, boost = s.get('tgt', s['ang']), s.get('boost', False)
    pts = []
    for command in s.get('pending', []):
        if command is not None: target, boost = command
        angle += float(np.clip(B.wrap(target-angle), -omega/30, omega/30))
        v = B.NSP3*B.SPF if boost and s['L'] > 20 else cruise
        xy = xy+np.array([np.cos(angle), np.sin(angle)])*v/30
        pts.append(xy)
    return xy, angle, pts


def track_path(s, sign, laps, centre=None, dt=1/30):
    """(paths, times, radius, centre): pending commands, then the fixed circle."""
    cruise = (B.NSP1+B.NSP2*s['sc'])*B.SPF
    xy, angle, pts = rollout(s)
    if centre is None:
        R = TRACK_R*cruise/(B.TURN*B.scang(s['sc']))
        centre = xy+sign*R*np.array([-np.sin(angle), np.cos(angle)])
    else:
        centre, R = centre
    phi = np.arctan2(*(xy-centre)[::-1])
    n = len(pts)
    k = np.arange(1, int(np.ceil(laps*2*np.pi*R/(cruise*dt)))+1)
    a = phi+sign*cruise*dt*k/R
    circle = centre+R*np.column_stack((np.cos(a), np.sin(a)))
    times = np.r_[np.arange(1, n+1)/30, n/30+k*dt]
    return np.vstack(pts+[circle])[None], times, R, (centre, R)


class Pocket9Controller(Pocket8Controller):
    def reset(self):
        super().reset(); self.track = None; self.bias = 0.

    def coil_path(self, s, sign, laps):
        fixed = self.track if self.coil == sign else None
        return track_path(s, sign, laps, fixed)[:3]

    def _coil_cmd(self, s, sign, gap, radius, mode):
        _, e = super()._coil_cmd(s, sign, gap, radius, mode)
        if self.track is None:
            self.track, self.bias = track_path(s, sign, 0)[3], 0.
        (c, R), cruise = self.track, (B.NSP1+B.NSP2*s['sc'])*B.SPF
        err = float(np.hypot(s['x']-c[0], s['y']-c[1])-R)
        self.bias = float(np.clip(self.bias+KI*err, -BIAS_MAX, BIAS_MAX))
        q, _, _ = rollout(s)
        phi = np.arctan2(*(q-c)[::-1])+sign*cruise*LOOK/R
        aim = c+(R-self.bias)*np.array([np.cos(phi), np.sin(phi)])-q
        self.last.update(stage='pocket9', track_err=round(err, 2), track_R=round(float(R), 1), track_bias=round(self.bias, 2),
                         track_c=[round(float(v), 1) for v in c])
        return (float(np.arctan2(aim[1], aim[0])), False), e

    def __call__(self, s):
        out = super().__call__(s)
        if self.coil is None:
            self.track = None
        return out


if __name__ == '__main__':  # self-checks
    from geometry import point_segment
    from pocket_scenarios import PocketArena
    # Squeeze: the encircler tightens onto our laid body; we must never touch it and the
    # head must stay on the fixed circle (after the first lap) within 1 px.
    for seed in (1, 2):
        w = PocketArena('squeeze', seed); c = Pocket9Controller(); cmd = None; low = np.inf; errs = []
        for k in range(1800):
            cmd = c(w.state())[0]
            if 'track_err' in c.last and c.last['coil_age'] > 2.:
                errs.append(abs(c.last['track_err']))
            seg = w.barriers(w.t)
            if len(seg):
                low = min(low, float((point_segment(w.p, seg[:, :2], seg[:, 2:4])-B.BODY_R*w.sc-seg[:, 4]).min()))
            w.step(cmd)
            if not w.alive: break
        assert w.alive, (seed, w.t, w.cause, c.last)
        assert errs and max(errs) < 1., (seed, len(errs), max(errs, default=None))
        print('squeeze', seed, 'alive 60 s, closest gap', round(low, 1), 'px; track err p95',
              round(float(np.percentile(errs, 95)), 2), 'max', round(max(errs), 2), 'px over', len(errs), 'ticks')
    for kind, seed in (('closed', 3), ('intruder', 3), ('opening', 3), ('opening', 81001), ('opening', 81003)):
        w = PocketArena(kind, seed); c = Pocket9Controller(); cmd = None
        for k in range(1800):
            cmd = c(w.state())[0]
            w.step(cmd)
            if not w.alive or (kind == 'opening' and w.escaped): break
        assert w.alive and (kind != 'opening' or w.escaped), (kind, w.t, w.cause, c.last)
    print('ok squeeze/closed/intruder/opening')
