"""Replay recorded live states (runs/live_*/blackbox.pkl.gz) through two controllers and compare every decision.

  python3 research/mod_parity.py py [profile]   legacy/pilot_9031e582.py vs pilot.py (params.json): must be identical
  python3 research/mod_parity.py js [profile]   pilot.py vs ext/pilot.js (node): agreement and gaps
  python3 research/mod_parity.py jslogic [profile]  same, but pilot.py draws bodies like pilot.js (capsules instead of
                                                    cv2.polylines): what is left is the port itself, not the raster

Open loop: both see the same recorded states in order (their own previous commands only feed their internal state),
so a single differing decision can make later ticks differ too; `first` is the first differing tick of each game.
"""
import gzip
import importlib.util
import json
import pickle
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
GAMES = ['live_20260925_210835', 'live_20260925_211216', 'live_20260925_211838', 'live_20260925_212136',
         'live_20260925_212859', 'live_20260925_213242', 'live_20260925_213646', 'live_20260925_213820',
         'live_20260925_214629', 'live_20260925_215056']      # pilot 9031e582, aggressive, 10 games


def load(name):
    with gzip.open(ROOT/'runs'/name/'blackbox.pkl.gz', 'rb') as f:
        box = pickle.load(f)
    out = []
    for e in box:
        s = {k: (v.astype(float) if isinstance(v, np.ndarray) else v) for k, v in e['state'].items()}
        s['wall'] = tuple(float(v) for v in s['wall'])
        out.append(s)
    return out


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def capsule_field(mod):
    """pilot.body_field with the capsule raster of ext/pilot.js (bodies: pixel centres within hw of the centre line)."""
    import cv2

    def body_field(p, segs, sid, cell=None, half=None):
        cell, half = cell or mod.CELL, half or mod.HALF
        n = int(2*half/cell)
        img = np.full((n, n), 255, np.uint8)
        if len(segs):
            o = p-half
            brk = np.r_[True, (sid[1:] != sid[:-1]) | (np.abs(segs[1:, :2]-segs[:-1, 2:4]).sum(1) > 1e-3)]
            starts = np.flatnonzero(brk)
            for a, b in zip(starts, np.r_[starts[1:], len(segs)]):
                q = np.round((np.vstack((segs[a:b, :2], segs[b-1, 2:4]))-o)/cell*4)/4
                t = max(1, int(round(2*(segs[a, 4]+mod.thick_off(segs[a, 4]))/cell)))
                hw = ((t+(t & 1))/2 if t > 1 else .5)+.5
                for k in range(len(q)-1):
                    A, B = q[k], q[k+1]
                    x0, x1 = max(0, int(np.floor(min(A[0], B[0])-hw))), min(n-1, int(np.ceil(max(A[0], B[0])+hw)))
                    y0, y1 = max(0, int(np.floor(min(A[1], B[1])-hw))), min(n-1, int(np.ceil(max(A[1], B[1])+hw)))
                    if x0 > x1 or y0 > y1: continue
                    X, Y = np.meshgrid(np.arange(x0, x1+1), np.arange(y0, y1+1))
                    ab = B-A; L2 = max(ab@ab, 1e-12)
                    tt = np.clip(((X-A[0])*ab[0]+(Y-A[1])*ab[1])/L2, 0, 1)
                    dx, dy = X-A[0]-tt*ab[0], Y-A[1]-tt*ab[1]
                    img[y0:y1+1, x0:x1+1][dx*dx+dy*dy <= hw*hw] = 0
        return np.minimum(cv2.distanceTransform(img, cv2.DIST_L2, cv2.DIST_MASK_5), 1e4)*cell, p-half, cell
    return body_field


def run_py(mod, states):
    c, out = mod.Pilot(), []
    for s in states:
        t0 = time.perf_counter()
        cmd, _ = c(dict(s))
        out.append({**c.last['trace'], 'cmd': cmd[0], 'boost': cmd[1], 'ms': (time.perf_counter()-t0)*1e3})
    return out


def run_js(states, profile):
    src = ROOT/'research'/'mod_parity_states.json'
    src.write_text(json.dumps([{k: (v.tolist() if isinstance(v, np.ndarray) else v) for k, v in s.items()} for s in states]))
    r = subprocess.run(['node', str(ROOT/'ext'/'test'/'replay.mjs'), str(src), profile], capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr)
    return json.loads(r.stdout)


def compare(a, b):
    n = len(a)
    same = [abs(x['cmd']-y['cmd']) < 1e-6 and x['boost'] == y['boost'] for x, y in zip(a, b)]
    first = next((i for i, v in enumerate(same) if not v), None)
    dcl = [abs(x['clear']-y['clear']) for x, y in zip(a, b)]
    return dict(n=n, same=sum(same), first=first, mode_same=sum(x['mode'] == y['mode'] for x, y in zip(a, b)),
                clear_diff_p50=round(float(np.median(dcl)), 2), clear_diff_p95=round(float(np.percentile(dcl, 95)), 2),
                ms_a=round(float(np.percentile([x['ms'] for x in a], 95)), 1),
                ms_b=round(float(np.percentile([y['ms'] for y in b], 95)), 1))


if __name__ == '__main__':
    what = sys.argv[1]
    profile = sys.argv[2] if len(sys.argv) > 2 else 'aggressive'
    new = module(ROOT/'pilot.py', 'pilot_new'); new.set_profile(profile)
    if what == 'jslogic':
        new.body_field = capsule_field(new)
    if what == 'py':
        old = module(ROOT/'legacy'/'pilot_9031e582.py', 'pilot_old'); old.set_profile(profile)
    tot = dict(n=0, same=0)
    for g in GAMES:
        states = load(g)
        a = run_py(new, states)
        b = run_py(old, states) if what == 'py' else run_js(states, profile)
        if what == 'py':
            keys = set(a[0]) - {'ms'}
            trace_same = sum(all(x[k] == y[k] for k in keys) for x, y in zip(a, b))
        r = compare(a, b)
        if what == 'py': r['trace_same'] = trace_same
        tot['n'] += r['n']; tot['same'] += r['same']
        print(g, json.dumps(r), flush=True)
    print('TOTAL', profile, tot['same'], '/', tot['n'], f"{tot['same']/tot['n']:.4f}")
