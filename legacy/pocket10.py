"""pocket10: pocket8 + leave a thicker encircler's ring before it closes.

pocket8 stays the frozen control; pocket9 (fixed-circle tracking) was rejected.
Both pocket8 live deaths happened while coiling at 1.7 / 3.8 px precision
inside a ring of a snake ~1.5x thicker (35-38 px vs our 23-25 px drawn radius).
Precision is not the problem; coiling against a thicker ring is. (Hypothesis:
the kill rule depends on body thickness; the server rule is not visible.)

- Thick ring: among enemy body pieces within THICK_R px of our head, at least
  THICK_SHARE are thicker than THICK_RATIO x our radius.
- Then defend from coverage EARLY (pocket6: 0.85) and leave through the
  planner's exit with boost allowed, before the ring can close.
- Coiling stays as the last resort when fully enclosed with no exit (nothing
  else survives then); against equal or thinner rings nothing changes.

Result (2026-09-24, local): NOT adopted; live default stays pocket8.
- 'closing' (1.6x thicker ring closing behind us): escaped 20/20 vs pocket8 12/20.
- Normal play, 12 seeds x 150 s: alive 10/12 vs pocket8 12/12 (both deaths
  body:encircler), mean growth lower (first 6 seeds 2858 vs 4958). The
  EARLY/THICK_RATIO variants (.75/1.2, .6/1.4, .75/1.4) died in 3 of 6 seeds.
  Exit share rose 9.7 -> 22.4 %: in crowds most nearby bodies are thicker than
  a young snake, so early exits fire often (why the exits die: unverified).
"""
import numpy as np
import brain as B
from pocket6 import ENTER, near_segments
from pocket8 import Pocket8Controller

THICK_R, THICK_RATIO, THICK_SHARE = 400., 1.2, .5
EARLY = .6


def thick_ring(s):
    """(share of nearby enemy body pieces thicker than THICK_RATIO x ours, their max radius)."""
    near = near_segments(s['segs'], np.array([s['x'], s['y']]), THICK_R)
    if not len(near):
        return 0., 0.
    thick = near[:, 4] > THICK_RATIO*B.BODY_R*s['sc']
    return float(thick.mean()), float(near[:, 4].max())


class Pocket10Controller(Pocket8Controller):
    def __call__(self, s):
        share, widest = thick_ring(s)
        thick = share >= THICK_SHARE
        self.enter, self.exit_boost = (EARLY, True) if thick else (ENTER, False)
        cmd, e = super().__call__(s)
        self.last.update(stage='pocket10', thick=thick, thick_share=round(share, 2),
                         enemy_r=round(widest, 1), our_r=round(B.BODY_R*s['sc'], 1))
        return cmd, e


if __name__ == '__main__':  # self-checks
    from pocket_scenarios import PocketArena
    # A 1.6x thicker snake closes its ring behind us over 6 s: leave before it closes.
    # (pocket8 is trapped and coils in seeds 1 and 5.)
    for seed in (1, 5):
        w = PocketArena('closing', seed); c = Pocket10Controller()
        while w.t < 20 and w.alive and not w.escaped:
            w.step(c(w.state())[0])
        assert w.alive and w.escaped, (seed, w.t, w.cause, c.last)
        print('closing', seed, 'escaped at', round(w.t, 1), 's')
    # Equal-thickness rings: unchanged behaviour (coil holds in the squeeze, exits when it opens).
    for kind, seed in (('squeeze', 1), ('squeeze', 2), ('closed', 3), ('intruder', 3), ('opening', 3), ('opening', 81001)):
        w = PocketArena(kind, seed); c = Pocket10Controller(); cmd = None
        for k in range(1800):
            if k % 2 == 0: cmd = c(w.state())[0]
            w.step(cmd)
            if not w.alive or (kind == 'opening' and w.escaped): break
        assert w.alive and (kind != 'opening' or w.escaped), (kind, w.t, w.cause, c.last)
        assert not c.last['thick'], c.last
    print('ok closing/squeeze/closed/intruder/opening')
