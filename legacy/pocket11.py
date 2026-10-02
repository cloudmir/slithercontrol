"""pocket11: pocket8 + the coil keeps watching bodies at the rim of its circle.

pocket8 stays the frozen control (pocket9/10 were not adopted).
Live pocket10 game (2026-09-24 21:41) died coiling: every lap the west side of
our circle grazed a static body 1.9x thicker (drawn gaps +1.1, -11.1, -1.8 px,
then death), while coil_gap read ~6150 px (only the wall). Cause: once the ring
is closed pocket7 keeps only bodies whose distance from the circle centre is
< radius. The "outside bodies were laid without touching our ring" argument only
holds for bodies laid after our ring; a body lying there before we coiled can
sit within touching reach of the rim. The two earlier pocket8 coil deaths
(drawn gaps -10..-13 px) fit the same cause (their coil_gap was not logged).

Fix: with the ring closed, still check bodies and heads whose distance from the
centre is below radius + our radius + their radius (+ margin). A rim body then
drops the coil gap below 0 (drawn overlap) and pocket7 compares the alternatives.
"""
import numpy as np
from pocket8 import Pocket8Controller


class Pocket11Controller(Pocket8Controller):
    coil_edge = 1.
    coil_keep = 0.   # rim bodies now count, so an encircler squeezed onto our ring sits at ~0-2 px:
                     # only a predicted overlap (drawn radii) makes us weigh leaving the coil

    def __call__(self, s):
        cmd, e = super().__call__(s)
        self.last['stage'] = 'pocket11'
        return cmd, e


if __name__ == '__main__':  # self-checks
    import brain as B
    from pocket2 import tight_paths
    from pocket7 import coil_gap
    # Closed ring (a lap driven, body long enough) with a thick static body just touching the rim.
    s = dict(x=0., y=0., ang=0., tgt=0., sc=1.2, L=400., boost=False, pending=[], t=0., wall=(0., 0., 20000.),
             heads=np.empty((0, 5)), food=np.empty((0, 3)))
    _, _, radius = tight_paths(s, (1,), laps=1.)
    theta = np.linspace(0, 2.4*np.pi, 72)             # 1.2 laps of own body: the ring counts as closed
    s['own_body'] = np.column_stack((radius*np.sin(theta), radius-radius*np.cos(theta)))
    r, re = B.BODY_R*s['sc'], 33.
    x = -radius-(r+re-5.)                 # rim body 5 px inside touching reach, west of the circle
    s['segs'] = np.array([[x, radius-60, x, radius+60, re]])
    g7, _, _ = coil_gap(s, s['segs'], 1, 1., since=10., edge=0.)
    g11, _, _ = coil_gap(s, s['segs'], 1, 1., since=10., edge=1.)
    assert g7.min() > 1000 and -12 < g11.min() < 0, (g7.min(), g11.min())
    print('rim body: pocket7 gap', round(g7.min()), 'px (ignored), pocket11 gap', round(g11.min(), 1), 'px')
    # Earlier fixtures still pass.
    from pocket_scenarios import PocketArena
    for kind, seed in (('squeeze', 1), ('squeeze', 2), ('closed', 3), ('intruder', 3), ('opening', 3), ('opening', 81001)):
        w = PocketArena(kind, seed); c = Pocket11Controller(); cmd = None
        for k in range(1800):
            if k % 2 == 0: cmd = c(w.state())[0]
            w.step(cmd)
            if not w.alive or (kind == 'opening' and w.escaped): break
        assert w.alive and (kind != 'opening' or w.escaped), (kind, w.t, w.cause, c.last)
    print('ok rim/squeeze/closed/intruder/opening')
