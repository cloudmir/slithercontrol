"""pocket13: pocket3 + commit to one turn side during hard turns (live-evidence only).

Rebased on pocket3 (user 2026-09-24: pocket6-12 features were simulator-driven
and live survival did not improve). pocket3 stays the frozen control.

Live evidence, three black boxes: in the last seconds before death the command
kept switching between a left and a right hard turn, so the snake wobbled in
place instead of turning away:
  pocket3  23:57:31  -157.5 x9, +135 .. +67, -157.5 x4, -150, -150, +150, +150, -150 (death)
  pocket11 23:35:38  +30, +75, -157, +37, +127, -165 (death)
  pocket11 23:33:57  +172, -135, +172, -150, ... (death)
Near a U-turn, left and right candidates score almost the same, so tiny changes
flip the choice, and the game turns toward whichever side was sent last.

Rule: once a hard turn (|turn| >= HARD) is chosen, later hard turns to the
other side within HOLD_S are replaced by the best candidate on the committed
side, as long as it is not worse: at least as safe, and its contact time no more
than SLACK s earlier. Nothing else changes.
"""
import numpy as np
import brain as B
from pocket3 import Pocket3Controller

HARD = np.radians(100.)
HOLD_S = .6
SLACK = .1


class Pocket13Controller(Pocket3Controller):
    def reset(self):
        super().reset()
        self.side, self.side_t = None, -1e9

    def __call__(self, s):
        if not hasattr(self, 'side'):
            self.side, self.side_t = None, -1e9
        cmd, e = super().__call__(s)
        now = s.get('t', 0.)
        rel = B.wrap(cmd[0]-s['ang'])
        n = self.base.config.directions
        safe, tc = e.get('safe'), e.get('tc')
        switched = False
        if (abs(rel) >= HARD and self.side is not None and np.sign(rel) != self.side
                and now-self.side_t < HOLD_S and safe is not None and len(safe) == 2*n):
            count = len(safe)
            angles = s['ang']+(np.arange(count) % n)*2*np.pi/n
            rels = B.wrap(angles-s['ang'])
            boosted = np.arange(count) >= n
            chosen = int(e['selected'])
            ok = (np.sign(rels) == self.side) & (np.abs(rels) >= np.radians(45))
            ok &= safe >= safe[chosen]
            ok &= tc >= tc[chosen]-SLACK
            if ok.any():
                # Closest in turn size to the original choice, then latest contact.
                key = np.where(ok, -np.abs(np.abs(rels)-abs(rel))+.01*tc, -np.inf)
                k = int(np.argmax(key))
                cmd = (float(B.wrap(angles[k])), bool(boosted[k]))
                rel = rels[k]; e['selected'] = k; switched = True
        if abs(rel) >= HARD:
            self.side, self.side_t = float(np.sign(rel)), now
        self.last = dict(self.last, stage='pocket13', side_kept=switched)
        return cmd, e


if __name__ == '__main__':  # self-checks: replay the three live black boxes
    import gzip, pickle
    for path in ('runs/live_staged_20260924_235731/blackbox.pkl.gz',
                 'runs/live_staged_20260924_233538/blackbox.pkl.gz',
                 'runs/live_staged_20260924_233357/blackbox.pkl.gz'):
        box = pickle.load(gzip.open(path))
        flips = {}
        for C in (Pocket3Controller, Pocket13Controller):
            c = C(); side, n = None, 0
            for rec in box:
                st = {k: (v.astype(float) if isinstance(v, np.ndarray) else v) for k, v in rec['state'].items()}
                cmd, _ = c(st)
                rel = B.wrap(cmd[0]-st['ang'])
                if abs(rel) >= HARD:
                    if side is not None and np.sign(rel) != side: n += 1
                    side = np.sign(rel)
            flips[C.__name__] = n
        print(path.split('/')[1], 'hard-turn side flips:', flips)
        assert flips['Pocket13Controller'] <= flips['Pocket3Controller'], flips
