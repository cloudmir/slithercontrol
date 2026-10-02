"""Aggregate stats over a batch of pilot games (trace + black box), for the data-driven review.

usage: .venv/bin/python batch_stats.py runs/live_*.jsonl
"""
import json
import sys
from collections import Counter

import numpy as np

import deaths
import pilot


def episodes(tr, key, on, gap=.5):
    """Spans [(t0, t1)] where on(x[key]) holds, merging breaks shorter than gap s."""
    out = []
    for x in tr:
        if on(x.get(key)):
            if out and x['t']-out[-1][1] <= gap: out[-1][1] = x['t']
            else: out.append([x['t'], x['t']])
    return out


def main(paths):
    games = []
    for f in paths:
        r = json.loads(open(f).read())
        if r.get('status') != 'finished' or not r.get('trace'): continue
        games.append((f, r))
    n = len(games)
    print(f'{n} finished games')
    secs = np.array([r['seconds'] for _, r in games]); Ls = np.array([r['L_max'] for _, r in games])
    print(f'survival s: median {np.median(secs):.0f} mean {secs.mean():.0f} min {secs.min():.0f} max {secs.max():.0f};'
          f' 600 s reached {int((secs >= 599).sum())}/{n}')
    print(f'L_max: median {np.median(Ls):.0f} mean {Ls.mean():.0f} max {Ls.max()}')

    modes, ticks, boost, jumps_by_mode, minutes = Counter(), 0, 0, Counter(), 0.
    att = dict(n=0, escaped=0, died=0, boost_esc=[], boost_died=[], dur_esc=[], dur_died=[])
    gain, gap_ticks, through, emerg_to_death, lat = [], 0, 0, [], []
    for f, r in games:
        tr = r['trace']; T = tr[-1]['t']; died = r.get('reason') == 'death'
        ticks += len(tr); minutes += (T-tr[0]['t'])/60
        modes.update(x['mode'] for x in tr); boost += sum(x['boost'] for x in tr)
        cm = np.radians([x['cmd'] for x in tr])
        big = abs(pilot.wrap(np.diff(cm))) > np.pi/2
        jumps_by_mode.update(tr[i+1]['mode'] for i in np.flatnonzero(big))
        # attacks: threat > 0 spans; died = death within 1.5 s of the span end
        for t0, t1 in episodes(tr, 'threat', lambda v: v is not None and v > 0):
            if t1-t0 < .2: continue
            w = [x for x in tr if t0 <= x['t'] <= t1]
            b = float(np.mean([x['boost'] for x in w]))
            att['n'] += 1
            if died and T-t1 < 1.5: att['died'] += 1; att['boost_died'].append(b); att['dur_died'].append(t1-t0)
            else: att['escaped'] += 1; att['boost_esc'].append(b); att['dur_esc'].append(t1-t0)
        gain.append((max(x['L'] for x in tr)-tr[0]['L'])/max((T-tr[0]['t'])/60, 1e-3))
        gap_ticks += sum(x.get('gap') is not None for x in tr)
        through += sum(bool(x.get('gap') and x['gap'][4]) for x in tr)
        if died:
            eps = episodes(tr, 'mode', lambda v: v == 'emergency', gap=.3)
            if eps and T-eps[-1][1] < .5: emerg_to_death.append(T-eps[-1][0])
        if r.get('stage_ms'): lat.append(r['stage_ms']['obs_to_cmd'])
    print(f'modes: ' + ', '.join(f'{k} {v/ticks:.0%}' for k, v in modes.most_common()) + f'; boost {boost/ticks:.0%} of ticks')
    tot = sum(jumps_by_mode.values())
    print(f'command jumps > 90 deg: {tot/minutes:.1f}/min; by mode ' + ', '.join(f'{k} {v}' for k, v in jumps_by_mode.most_common()))
    m = lambda a: f'{np.mean(a):.2f}' if a else '-'
    print(f"attacks (threat > 0 for >= 0.2 s): {att['n']}, survived {att['escaped']}, died within 1.5 s {att['died']};"
          f" boost share survived {m(att['boost_esc'])} vs died {m(att['boost_died'])};"
          f" duration survived {m(att['dur_esc'])} s vs died {m(att['dur_died'])} s")
    print(f'L gain/min: median {np.median(gain):.0f}; narrow-gap ticks {gap_ticks}, through-gap picks {through}')
    if emerg_to_death: print(f'last emergency run before death: median {np.median(emerg_to_death):.2f} s (n={len(emerg_to_death)})')
    if lat: print(f'obs_to_cmd ms p50 median {np.median([l[0] for l in lat]):.1f}, p95 max {max(l[1] for l in lat):.1f}')
    print('\n--- deaths.py ---')
    deaths.main([f for f, r in games])


if __name__ == '__main__':
    main(sys.argv[1:])
