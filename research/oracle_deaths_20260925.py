"""For each P18 death: at several moments before death, which of our 48 basic maneuvers (24 headings x cruise/boost)
would have kept a positive drawn gap for 1.2 s against the bodies as they actually were later (future world taken
from the black box, fixed - others do not react to our changed move)? Compares with the planner's own view (n_safe,
predicted hard) and the command it gave.

usage: .venv/bin/python research/oracle_deaths_20260925.py runs/live_*.jsonl  -> table + JSON
"""
import gzip, json, os, pickle, sys
import numpy as np
sys.path.insert(0, '.')
import pilot

MOMENTS = tuple(float(x) for x in os.environ.get('ORACLE_MOMENTS', '2.0,1.2').split(','))   # only moments whose whole 1.2 s window is observed


def arr(s, k, w):
    return np.asarray(s[k], float).reshape(-1, w)


def realized(pos, t0, times, states, ro):
    """Min drawn gap of path points pos (C,N,2) at times t0+times against the bodies AND the wall observed at those
    times. Any step without an observation within 60 ms makes the result unknown (NaN) - never 'safe'
    (Codex evening review #5)."""
    C = pos.shape[0]; g = np.full(C, np.inf)
    for n, dt in enumerate(times):
        j = int(np.argmin(abs(times_all - (t0+dt))))
        if abs(times_all[j]-(t0+dt)) > .06:
            return np.full(C, np.nan)
        s = states[j]; w = s['wall']
        g = np.minimum(g, w[2]-np.hypot(pos[:, n, 0]-w[0], pos[:, n, 1]-w[1])-ro)
        segs = arr(s, 'segs', 5)
        if not len(segs): continue
        d = pilot.seg_dist(pos[:, n], segs)-segs[:, 4][None]-ro
        g = np.minimum(g, d.min(1))
    return g


out = []
for f in sys.argv[1:]:
    try:
        r = json.loads(open(f).read()); box = pickle.load(gzip.open(f[:-6]+'/blackbox.pkl.gz'))
    except Exception:
        continue
    if r.get('reason') != 'death': continue
    states = [b['state'] for b in box]
    times_all = np.array([s['t'] for s in states]); T = times_all[-1]
    row = dict(game=f[-20:-6], seconds=r['seconds'], moments=[])
    for m in MOMENTS:
        k = int(np.argmin(abs(times_all-(T-m))))
        s = states[k]; p = np.array([s['x'], s['y']]); ro = pilot.R*s['sc']
        prev = box[k-1]['cmd'][0] if k else s['ang']; pb = box[k-1]['cmd'][1] if k else False
        hd = np.r_[s['ang']+pilot.ANGLES, s['ang']+pilot.ANGLES]
        bst = np.r_[np.zeros(len(pilot.ANGLES), bool), np.ones(len(pilot.ANGLES), bool)]
        pos, t = pilot.paths(p, s['ang'], s['sp'], s['sc'], prev, hd, bst, pb)
        g = realized(pos, s['t'], t, states, ro)
        cpos, _ = pilot.paths(p, s['ang'], s['sp'], s['sc'], prev, np.array([box[k]['cmd'][0]]), np.array([box[k]['cmd'][1]]), pb)
        gc = realized(cpos, s['t'], t, states, ro)[0]
        tr = box[k]['last'].get('trace', {})
        if np.isnan(g).all(): continue                               # window not fully observed
        row['moments'].append(dict(before=m, oracle_safe=int((g > 0).sum()), best_gap=round(float(g.max()), 1),
                                   chosen_realized=round(float(gc), 1), planner_safe=tr.get('n_safe'),
                                   planner_hard=tr.get('hard'), mode=tr.get('mode')))
    out.append(row)

# Category at T-1.2 s (window ends at death):
#  planner_ok  planner judged its chosen path safe (n_safe>0, hard>0) and the oracle still had safe maneuvers
#  blind       planner saw no safe path (n_safe 0) while the oracle had >= 5
#  no_way      no maneuver stayed clear; few: 1-4 did (threshold, not a proven dead end)
#  chose_bad   planner had safe paths but picked one it predicted unsafe (should not happen)
for row in out:
    m = [x for x in row['moments'] if x['before'] == 1.2]
    if not m: row['category'] = 'unobserved'; continue
    m = m[0]
    # no_way = not one of the 48 maneuvers kept clear; few = 1-4 (a threshold, reported separately)
    row['category'] = ('no_way' if m['oracle_safe'] == 0 else 'few' if m['oracle_safe'] < 5 else
                       'blind' if not m['planner_safe'] else 'planner_ok' if (m['planner_hard'] or 0) > 0 else 'chose_bad')
from collections import Counter
print('categories at T-1.2 s:', dict(Counter(r['category'] for r in out)))
print('game            sec  | per moment before death: oracle-safe maneuvers(of 48) / planner n_safe / chosen realized gap / planner predicted hard')
for row in out:
    cells = ['%.1fs: %2d/%2s/%6.1f/%6s' % (m['before'], m['oracle_safe'], m['planner_safe'], m['chosen_realized'], m['planner_hard'])
             for m in row['moments']]
    row.setdefault('category', 'unobserved')
    print(f"{row['game']} {row['seconds']:6.1f} {row['category']:9s}| " + ' | '.join(cells))
json.dump(out, open(os.environ.get('ORACLE_OUT', 'research/oracle_deaths_20260925.json'), 'w'), indent=1)   # MOD runs: research/mod_deaths.py
