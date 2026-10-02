"""pocket7: pocket6 + committed coil judged by exact contact (never touch a body).

pocket6 stays the frozen control. Its live death (2026-09-24 19:43) and the
realistic 'squeeze' fixture show the same failure: we coiled, the encircler
tightened into our *safety margin* (12 px + 6 px pad + speed allowance), the
coil was declared unsafe and abandoned, and the escape path ran into the ring.

Basics (user): even if they tighten, we only must not touch their body.
- Bodies are exact capsules with their drawn radius 14.5*sc (live evidence:
  alive at drawn gaps of -16 px and -4 px, so drawn width is not optimistic).
  Our head is a circle of our drawn radius. No extra padding.
- Coil = saturated turning: an exact circle (pocket2's tight_paths). Own body
  never kills, so once a lap is laid a head outside cannot get in.
- Once coiling we keep coiling while the exact gap over the next lap stays
  >= KEEP px. Only if a real touch is predicted do we compare with pocket6's
  best alternative by exact contact time and switch only if it lasts clearly
  longer. An exit is taken only when pocket6 finds a safe 'exit' path.
"""
import numpy as np
import brain as B
from geometry import point_segment
from staged import contact_times
from pocket2 import tight_paths
from pocket6 import Pocket6Controller, near_segments
from pocket3 import PAD

ENTER_GAP = 6.     # px exact gap required over 1.25 laps to start a coil
KEEP = 2.          # px exact gap required over the next lap to keep coiling
SWITCH = .2        # s an alternative must outlast the coil's first contact
LEAVE_COVER = .5   # planner coverage below which (and not enclosed) the coil is released
HEAD_HORIZON = 1.5


def ring_closed(s, radius, since):
    """A lap has been driven and our body is long enough to cover the whole ring."""
    lap = 2*np.pi/(B.TURN*B.scang(s['sc']))
    body = np.asarray(s.get('own_body', np.empty((0, 2))), float).reshape(-1, 2)
    length = np.linalg.norm(np.diff(body, axis=0), axis=1).sum() if len(body) > 1 else 0.
    return since >= lap and length >= 2*np.pi*radius*1.05


def coil_gap(s, segs, sign, laps, since=0., path=None, edge=0.):
    """Exact gaps along the coil: (min gap per time, times, radius).

    Enemy bodies are capsules with their drawn radius; heads are forecast along
    their velocity with growing uncertainty. Once our ring is closed the head
    only retraces our own body: anything outside the head's circle was laid
    without touching that body (its head would have died), so only bodies and
    heads that reach inside the circle can still touch us.
    edge=1 also keeps bodies/heads within touching reach of the circle's rim
    (pocket11: the shield argument fails for bodies laid before we coiled).
    """
    paths, times, radius = path or tight_paths(s, (sign,), laps=laps)
    pts = paths[0]
    r = B.BODY_R*s['sc']
    gap = np.full(len(pts), np.inf)
    segs = np.asarray(segs, float).reshape(-1, 5)
    closed = ring_closed(s, radius, since)
    centre = pts.mean(0)
    if len(segs):
        a, b = segs[:, :2], segs[:, 2:4]
        dc = point_segment(centre, a, b)
        keep = dc < radius+edge*(r+segs[:, 4]+10) if closed else dc < 2*radius+r+segs[:, 4]+60
        segs = segs[keep]
        for chunk in np.array_split(segs, max(1, len(segs)//400+1)):
            if len(chunk):
                d = point_segment(pts[:, None, :], chunk[None, :, :2], chunk[None, :, 2:4])-r-chunk[None, :, 4]
                gap = np.minimum(gap, d.min(1))
    wall = np.asarray(s['wall'])
    gap = np.minimum(gap, wall[2]-np.linalg.norm(pts-wall[:2], axis=1)-r)
    for h in np.asarray(s['heads'], float).reshape(-1, 5):
        inside = np.linalg.norm(h[:2]-centre) < radius+edge*(r+B.BODY_R*h[4]+60)
        if closed and not inside:
            continue                        # our laid ring shields us from outside heads
        v = h[3]*B.SPF*np.array([np.cos(h[2]), np.sin(h[2])])
        t = np.minimum(times, HEAD_HORIZON)
        q = h[:2]+t[:, None]*v
        d = np.minimum(np.linalg.norm(pts-q, axis=1), point_segment(pts, h[:2], q))
        gap = np.minimum(gap, d-r-B.BODY_R*h[4]-np.minimum(60., 15*t*t))
    return gap, times, radius


class Pocket7Controller(Pocket6Controller):
    coil_edge = 0.     # pocket11 sets 1: keep checking bodies at the ring's rim
    coil_keep = KEEP

    def reset(self):
        super().reset(); self.coil = None; self.coil_since = 0.

    def coil_path(self, s, sign, laps):
        """Predicted coil (paths, times, radius); later versions may track another circle."""
        return tight_paths(s, (sign,), laps=laps)

    def _exact_segs(self, s):
        return near_segments(np.asarray(s['segs'], float).reshape(-1, 5), np.array([s['x'], s['y']]))

    def _coil_cmd(self, s, sign, gap, radius, mode):
        self.last = dict(stage='pocket7', mode=mode, sign=sign, radius=round(float(radius), 1),
                         closed=bool(ring_closed(s, radius, s.get('t', 0.)-self.coil_since)),
                         coil_gap=round(float(gap.min()), 1), coil_age=round(s.get('t', 0.)-self.coil_since, 2),
                         defending=self.defending)
        return (float(B.wrap(s['ang']+sign*np.pi/2)), False), dict(status=self.last)

    def __call__(self, s):
        now = s.get('t', 0.)
        segs = self._exact_segs(s)
        if self.coil is not None:
            # Keep the planner (enclosure / exit route) running while we coil.
            padded = np.array(s['segs'], float).reshape(-1, 5); padded[:, 4] += PAD
            self._update_plan(dict(s, segs=padded))
            sign = self.coil
            gap, times, radius = coil_gap(s, segs, sign, 1.0, now-self.coil_since, self.coil_path(s, sign, 1.0), self.coil_edge)
            m = self.plan
            if m is not None and not m['enclosed'] and m['coverage'] < LEAVE_COVER:
                self.coil = None                          # the pocket has opened up: back to normal play
                return super().__call__(s)
            if m is not None and m.get('waypoint') is not None and now-self.coil_since > 1.:
                cmd, e = super().__call__(s)
                if self.last.get('mode') == 'exit':      # pocket6 found a safe way out
                    self.coil = None
                    return cmd, e
            if gap.min() >= self.coil_keep:
                return self._coil_cmd(s, sign, gap, radius, 'coil_hold')
            # A real touch is predicted on the coil: take pocket6's best move only
            # if its exact contact comes clearly later than the coil's.
            t_coil = times[int(np.argmax(gap < self.coil_keep))]
            cmd, e = super().__call__(s)
            if 'P' in e and 'selected' in e:
                sel = e['selected']
                n = len(s.get('pending', []))
                steps = e['P'].shape[1]-n
                times_alt = np.r_[np.arange(1, n+1)/30, n/30+np.arange(1, steps+1)*.1]
                tc, _ = contact_times(dict(s, segs=segs), e['P'][sel:sel+1], times_alt)
                if tc[0] > t_coil+SWITCH:
                    self.coil = None
                    self.last['coil_left'] = round(float(t_coil), 2)
                    return cmd, e
            return self._coil_cmd(s, sign, gap, radius, 'coil_hold_tight')
        cmd, e = super().__call__(s)
        m = self.plan
        if self.defending and m is not None and m['enclosed'] and m.get('waypoint') is None:
            # Fully enclosed with no exit: start a coil if one fits without touching anything.
            # (A route that flickers off for one plan must not interrupt an exit.)
            best = None
            for sign in (self.tight or -1, -(self.tight or -1)):
                gap, times, radius = coil_gap(s, segs, sign, 1.25, 0., self.coil_path(s, sign, 1.25), self.coil_edge)
                if gap.min() >= ENTER_GAP and (best is None or gap.min() > best[1].min()):
                    best = (sign, gap, radius)
            if best is not None:
                self.coil, self.coil_since = best[0], now
                return self._coil_cmd(s, best[0], best[1], best[2], 'coil_start')
        return cmd, e


if __name__ == '__main__':  # self-checks
    from pocket_scenarios import PocketArena
    # 1) realistic squeeze: the encircler tightens until it would touch us; we must never touch it
    for seed in (1, 2):
        w = PocketArena('squeeze', seed); c = Pocket7Controller(); cmd = None; low = np.inf
        for k in range(1800):
            if k % 2 == 0:
                cmd = c(w.state())[0]
                seg = w.barriers(w.t)
                if len(seg):
                    low = min(low, float((point_segment(w.p, seg[:, :2], seg[:, 2:4])-B.BODY_R*w.sc-seg[:, 4]).min()))
            w.step(cmd)
            if not w.alive: break
        assert w.alive, (seed, w.t, w.cause, c.last)
        print('squeeze', seed, 'alive 60 s, closest exact gap', round(low, 1), 'px, ring R', round(w.squeeze_R))
    # 2) earlier fixtures still pass
    for kind, seed in (('closed', 3), ('intruder', 3), ('opening', 3), ('opening', 81001), ('opening', 81003)):
        w = PocketArena(kind, seed); c = Pocket7Controller(); cmd = None
        for k in range(1800):
            if k % 2 == 0: cmd = c(w.state())[0]
            w.step(cmd)
            if not w.alive or (kind == 'opening' and w.escaped): break
        assert w.alive and (kind != 'opening' or w.escaped), (kind, w.t, w.cause, c.last)
    print('ok squeeze/closed/intruder/opening')
