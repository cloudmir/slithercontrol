"""Summarise live_staged games: outcome, death context, and the drawn gaps we survived.

usage: .venv/bin/python analyze_live.py runs/live_staged_*.jsonl
Close calls come from close_trace (drawn gap < 30 px, every tick); a negative gap
while alive means the real collision reach is shorter than the drawn radii.
"""
import json
import sys
import numpy as np


def load(path):
    r = json.loads(open(path).read().strip().splitlines()[-1])
    return r, (r['results'][0] if r.get('results') else r)


def main(paths):
    alive_gaps, death_gaps = [], []
    for path in paths:
        r, g = load(path)
        if 'seconds' not in g:
            print(path, r.get('status'), r.get('error')); continue
        tail = g.get('last_3s') or [{}]
        end = tail[-1]
        near = end.get('nearest') or []
        ratio = near[-1]/(14.5*end['sc']) if near and near[0] != 'head' and 'sc' in end else None
        print(f"{path.split('/')[-1]:34s} {r['ctrl']:9s} {g['reason']:6s} {g['seconds']:6.1f}s L_max {g['L_max']:5d} "
              f"end mode {end.get('mode')} gap {end.get('gap')} enemy/ours {None if ratio is None else round(ratio, 2)} "
              f"loop p95 {(g.get('loop_ms') or {}).get('p95')}")
        for c in g.get('close_trace') or []:
            n = c['nearest']
            if n and n[0] != 'head':
                alive_gaps.append((c['gap'], n[-1]/c['our_r']))
        if g['reason'] == 'death' and end.get('gap') is not None:
            death_gaps.append(end['gap'])
    if alive_gaps:
        a = np.array(alive_gaps)
        print(f"\nclose calls survived: {len(a)} ticks; drawn gap min {a[:, 0].min():.1f}, p1 {np.percentile(a[:, 0], 1):.1f}, "
              f"p5 {np.percentile(a[:, 0], 5):.1f} px")
        for lo, hi in ((0, 1), (1, 1.5), (1.5, 9)):
            m = (a[:, 1] >= lo) & (a[:, 1] < hi)
            if m.any():
                print(f"  enemy/ours {lo}-{hi}: {m.sum()} ticks, min gap {a[m, 0].min():.1f}, share below 0: {(a[m, 0] < 0).mean():.2f}")
    if death_gaps:
        print('last observed drawn gap before each death:', sorted(death_gaps))


if __name__ == '__main__':
    main(sys.argv[1:])
