"""(Limits: fixed recorded future - others do not react; the controller state is rebuilt by replaying the
black box, not the one that ran live; windows are cut at death.)
Last 1.2 s of each P18 death: at each tick, did the planner judge the HELD command (the one we were driving)
unsafe, and was it really (fixed future world from the black box, window up to death)? A 'false alarm' is a held
path the planner rejected that stays > 5 px clear until death; 'true alarm' one that does touch.

usage: .venv/bin/python research/false_alarm_20260925.py runs/live_*.jsonl
"""
import gzip, json, os, pickle, sys
import numpy as np
sys.path.insert(0, '.')
os.environ.setdefault('PILOT_MODE', 'aggressive')
import pilot


def locals_of(ctrl, state):
    saved = {}
    def prof(frame, event, arg):
        if event == 'return' and frame.f_code is pilot.Pilot.__call__.__code__: saved.update(frame.f_locals)
    sys.setprofile(prof)
    try: ctrl(state)
    finally: sys.setprofile(None)
    return saved


def arr(s, k, w): return np.asarray(s[k], float).reshape(-1, w)


tot = dict(ticks=0, rejected=0, false=0, true=0)
rows = []
for f in sys.argv[1:]:
    try: r = json.loads(open(f).read()); box = pickle.load(gzip.open(f[:-6]+'/blackbox.pkl.gz'))
    except Exception: continue
    if r.get('reason') != 'death': continue
    states = [b['state'] for b in box]; ts = np.array([s['t'] for s in states]); T = ts[-1]
    c = pilot.Pilot(); fa = ta = rej = n = rej_in = acc = miss = 0
    for k, b in enumerate(box):
        s = {kk: (np.asarray(v, float) if kk in ('segs', 'sid', 'heads', 'hid', 'food', 'own') else v) for kk, v in b['state'].items()}
        for kk, w in (('segs', 5), ('food', 3), ('heads', 5), ('own', 2)): s[kk] = s[kk].reshape(-1, w)
        if k: c.prev, c.prev_boost = box[k-1]['cmd']          # the command actually being driven
        if T-s['t'] > 1.2 or T-s['t'] < .15:
            c(s); continue
        v = locals_of(c, s); n += 1
        held = 2*v['C']-1 if v['self'].prev_boost is False and False else None
        C = v['C']; hi = (2*C-1) if box[k-1]['cmd'][1] else (C-1)       # held candidate index (same boost)
        accepted = bool(v['safe'][hi])
        if not accepted: rej += 1
        # Compare only inside the observed window (up to death): the planner may have rejected the held path for a
        # touch it predicted after the moment we died, which the record cannot confirm or refute.
        pos = v['pos'][hi]; ro = pilot.R*s['sc']; g = np.inf; seen = []
        for m, dt in enumerate(v['t']):
            j = int(np.argmin(abs(ts-(s['t']+dt))))
            if abs(ts[j]-(s['t']+dt)) > .06: continue
            seen.append(m)
            sg = arr(states[j], 'segs', 5)
            if len(sg): g = min(g, float((pilot.seg_dist(pos[m][None], sg)[0]-sg[:, 4]-ro).min()))
        if not seen: continue
        wl = states[-1]['wall']                                       # wall too (Codex evening review #5)
        g = min(g, float((wl[2]-np.hypot(pos[seen, 0]-wl[0], pos[seen, 1]-wl[1])-ro).min()))
        if accepted:                                                  # judged safe: did it really stay clear?
            acc += 1
            if g <= 0: miss += 1
            continue
        pred = float(v['gap'][hi][seen].min())                       # planner's own predicted gap in that window
        if pred >= pilot.HARD_PHYS: continue                          # rejected for a reason outside the window
        rej_in += 1
        if g > 5: fa += 1
        elif g <= 0: ta += 1
    rows.append((f[-20:-6], n, rej_in, fa, ta, acc, miss))
    for key, val in zip(('ticks', 'rejected', 'false', 'true', 'accepted', 'missed'), (n, rej_in, fa, ta, acc, miss)): tot[key] = tot.get(key, 0)+val
print('game            ticks  held-rejected-in-window  false-alarm(>5px clear)  true(touch)  held-accepted  missed(accepted but touched)')
for g, n, rej, fa, ta, acc, miss in rows: print(f'{g}  {n:5d}  {rej:5d}  {fa:5d}  {ta:5d}  {acc:5d}  {miss:5d}')
print('total', tot)
