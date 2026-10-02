"""Read a live game's black box (last ~8 s of observations + decisions) and explain the death.

usage: .venv/bin/python blackbox.py runs/live_staged_YYYYmmdd_HHMMSS/blackbox.pkl.gz [seconds]
For the body piece nearest our head at the last observation it finds the owner
snake (segment ids), then prints that snake's head track relative to us: distance,
bearing from our heading, its heading relative to the line to us, speed, turn rate.
"""
import gzip
import pickle
import sys
import numpy as np


def nearest(s):
    p, r = np.array([s['x'], s['y']]), 14.5*s['sc']
    segs = np.asarray(s['segs'], float).reshape(-1, 5)
    if not len(segs):
        return None, np.inf
    a, b = segs[:, :2], segs[:, 2:4]; ab = b-a
    t = np.clip(((p-a)*ab).sum(1)/np.maximum((ab*ab).sum(1), 1e-9), 0, 1)
    d = np.linalg.norm(p-(a+t[:, None]*ab), axis=1)-r-segs[:, 4]
    i = int(d.argmin())
    sid = s.get('sid')
    return (None if sid is None or not len(sid) else int(sid[i])), float(d[i])


def wrapdeg(a):
    return float(np.degrees((a+np.pi) % (2*np.pi)-np.pi))


def main(path, seconds=3.):
    box = pickle.load(gzip.open(path))
    end = box[-1]['state']
    killer, gap = nearest(end)
    print(f'{len(box)} ticks, {box[-1]["state"]["t"]-box[0]["state"]["t"]:.1f} s; last gap {gap:.1f} px to snake {killer}')
    prev = None
    for rec in box:
        s = rec['state']
        if s['t'] < end['t']-seconds:
            continue
        p = np.array([s['x'], s['y']])
        hid = s.get('hid')
        row = f"t {s['t']:7.2f} mode {str(rec['last'].get('mode')):16s} cmd {wrapdeg(rec['cmd'][0]-s['ang']):+6.1f}deg{' B' if rec['cmd'][1] else '  '}"
        sid_near, g = nearest(s)
        row += f" | gap {g:6.1f} (snake {sid_near})"
        if killer is not None and hid is not None and killer in set(int(v) for v in hid):
            h = np.asarray(s['heads'], float).reshape(-1, 5)[list(int(v) for v in hid).index(killer)]
            rel = h[:2]-p
            to_us = np.arctan2(-rel[1], -rel[0])
            turn = '' if prev is None else f" turn {wrapdeg(h[2]-prev[0])/max(s['t']-prev[1], 1e-3):+5.0f}deg/s"
            row += (f" | killer head {np.hypot(*rel):5.0f}px at {wrapdeg(np.arctan2(rel[1], rel[0])-s['ang']):+5.0f}deg,"
                    f" aims {wrapdeg(h[2]-to_us):+5.0f}deg off us, sp {h[3]:.1f} r {14.5*h[4]:.0f}{turn}")
            prev = (h[2], s['t'])
        print(row)


if __name__ == '__main__':
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 3.)
