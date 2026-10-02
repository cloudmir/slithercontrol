"""Classify how each pilot game ended, from its black box (last ~30 s; ~8 s before 13:10 2026-09-25) and trace.

usage: .venv/bin/python deaths.py runs/live_*.jsonl

Per death:
- killer = owner of the body piece nearest our head at the last observation;
- fresh  = that piece lies where the killer's head passed in the last 1.5 s (it cut in front of us);
- categories, first that applies:
  wrapped  one snake covered >= half the bearings around us in the last 3 s
  cut_off  we hit fresh body of a snake whose head was within 400 px (attack / cut in front)
  trapped  hit older body after >= 1 s with no safe candidate (emergency)
  sudden   hit older body with a safe plan until < 1 s before
Context flags: remains chase (goal >= 144 within 5 s), boosting at death, killer boosting, spawn fight (< 30 s).
"""
import gzip
import json
import pickle
import sys
from collections import Counter

import numpy as np

import pilot


def classify(path):
    r = json.loads(open(path).read())
    if r.get('status') != 'finished' or r.get('reason') != 'death':
        return None
    tr = r.get('trace', [])
    try:
        box = pickle.load(gzip.open(path[:-6]+'/blackbox.pkl.gz'))
    except (OSError, EOFError, pickle.UnpicklingError):      # cut short (e.g. WSL killed mid-write): no black box
        print(f'skip {path}: black box unreadable', file=sys.stderr)
        return None
    end = box[-1]['state']
    p = np.array([end['x'], end['y']]); ro = pilot.R*end['sc']
    segs, sid = np.asarray(end['segs'], float), np.asarray(end['sid'])
    if not len(segs):
        return dict(path=path, category='unknown')
    d = pilot.seg_dist(p[None], segs)[0]-segs[:, 4]-ro
    k = int(d.argmin()); killer = int(sid[k])
    a, b = segs[k, :2], segs[k, 2:4]
    hit = a+np.clip(((p-a)@(b-a))/max((b-a)@(b-a), 1e-9), 0, 1)*(b-a)
    T = end['t']
    track, kill_sp, kill_r, head_dist = [], [], None, None
    for rec in box:
        s = rec['state']
        hid = [int(v) for v in s['hid']]
        if killer in hid:
            h = np.asarray(s['heads'], float)[hid.index(killer)]
            if T-s['t'] <= 1.5: track.append(h[:2])
            if T-s['t'] <= 1.: kill_sp.append(h[3])
            kill_r = pilot.R*h[4]; head_dist = float(np.hypot(*(h[:2]-np.array([s['x'], s['y']]))))
    fresh = bool(track) and float(np.min(np.hypot(*(np.array(track)-hit).T))) < 40
    last = [x for x in tr if T-x['t'] <= 3]
    wrapped = any(x.get('wrap', 0) >= .5 for x in last)
    emerg = [x for x in tr if T-x['t'] <= 2]
    # time with no safe candidate right before death
    stuck = 0.
    for x in reversed(tr):
        if x['n_safe'] > 0: break
        stuck = T-x['t']
    if wrapped: cat = 'wrapped'
    elif fresh and head_dist is not None and head_dist < 400: cat = 'cut_off'
    elif stuck >= 1.: cat = 'trapped'
    else: cat = 'sudden'
    cmds = np.radians([x['cmd'] for x in last if 'cmd' in x])
    return dict(path=path, category=cat, killer=killer, seconds=r['seconds'], L=r['L_max'], killer_r=None if kill_r is None else round(kill_r),
                our_r=round(ro), killer_boost=bool(kill_sp) and max(kill_sp) > 9, killer_head=None if head_dist is None else round(head_dist),
                remains=any(x['goal'] >= 144 for x in tr if T-x['t'] <= 5), boosting=bool(tr and tr[-1]['boost']),
                stuck=round(stuck, 2), mode_2s=Counter(x['mode'] for x in emerg).most_common(1)[0][0] if emerg else None,
                reversals_3s=int((abs(pilot.wrap(np.diff(cmds))) > np.pi/2).sum()) if len(cmds) > 1 else 0,
                spawn_fight=r['seconds'] < 30, gap_end=round(float(d[k]), 1))


def coverage(s, snake):
    """(cover share of 24 bearings within 500 px, bins covered, median body distance) for one snake."""
    p = np.array([s['x'], s['y']]); segs, sid = np.asarray(s['segs'], float), np.asarray(s['sid'])
    m = sid == snake
    if not m.any(): return 0., np.zeros(24, bool), None
    g = segs[m]
    d = pilot.seg_dist(p[None], g)[0]-g[:, 4]
    mid = (g[:, :2]+g[:, 2:4])/2-p
    b = ((np.arctan2(mid[:, 1], mid[:, 0])+np.pi)/(2*np.pi)*24).astype(int) % 24
    cov = np.zeros(24, bool); cov[b[d < 500]] = True
    return cov.mean(), cov, (float(np.median(d[d < 500])) if (d < 500).any() else None)


def onset(path, killer):
    """For a wrapped death: the moment the wrapping snake first covered >= 0.4 of the bearings, and what we did."""
    box = pickle.load(gzip.open(path[:-6]+'/blackbox.pkl.gz'))
    T = box[-1]['state']['t']
    first = closed = None
    for rec in box:
        c, cov, rad = coverage(rec['state'], killer)
        if first is None and c >= .4: first = (rec, c, cov, rad)
        if first is not None and closed is None and c >= .95: closed = rec['state']['t']
    if first is None:
        return dict(onset=None, box_s=round(T-box[0]['state']['t'], 1))
    rec, c, cov, rad = first; s = rec['state']
    p = np.array([s['x'], s['y']])
    free = np.flatnonzero(~np.roll(cov, -int(np.argmax(cov))))
    runs = np.split(free, np.flatnonzero(np.diff(free) != 1)+1) if len(free) else []
    run = max(runs, key=len) if runs else np.array([])
    gap_deg = 15*len(run)
    gap_ang = (((run[0]+run[-1])/2+int(np.argmax(cov))+.5) % 24)/24*2*np.pi-np.pi if len(run) else None
    hid = [int(v) for v in s['hid']]
    head = np.asarray(s['heads'], float)[hid.index(killer)] if killer in hid else None
    out = dict(before_s=round(T-s['t'], 1), cover=round(c, 2), radius=None if rad is None else round(rad), gap_deg=gap_deg,
               closed_after=None if closed is None else round(closed-s['t'], 1), our_L=s['L'],
               heading_off_gap=None if gap_ang is None else round(float(np.degrees(abs(pilot.wrap(s['ang']-gap_ang))))),
               mode=rec['last'].get('mode'), box_s=round(T-box[0]['state']['t'], 1))
    if head is not None:
        hb = np.arctan2(*(head[:2]-p)[::-1])
        out.update(head_px=round(float(np.hypot(*(head[:2]-p)))), head_sp=round(float(head[3]), 1), head_r=round(pilot.R*head[4]),
                   head_to_gap_deg=None if gap_ang is None else round(float(np.degrees(abs(pilot.wrap(hb-gap_ang))))))
    # what were we doing in the 5 s before onset (trace)
    tr = json.loads(open(path).read()).get('trace', [])
    pre = [x for x in tr if s['t']-5 <= x['t'] < s['t']]
    if pre:
        out.update(pre_mode=Counter(x['mode'] for x in pre).most_common(1)[0][0], pre_remains=any(x['goal'] >= 144 for x in pre),
                   pre_boost=round(float(np.mean([x['boost'] for x in pre])), 2))
    return out


def bunching(box, t_end, window=5.):
    """Straightness (net move / path length of our head) and own-body cover (share of 24 bearings within
    300 px of the head taken by our own body) over `window` s ending at t_end."""
    recs = [r for r in box if t_end-window <= r['state']['t'] <= t_end]
    if len(recs) < 10: return None, None
    xy = np.array([[r['state']['x'], r['state']['y']] for r in recs])
    path = np.hypot(*np.diff(xy, axis=0).T).sum()
    straight = float(np.hypot(*(xy[-1]-xy[0]))/max(path, 1e-6))
    covs = []
    for r in recs[::10]:
        s = r['state']; own = np.asarray(s['own'], float)
        if len(own) < 3: continue
        rel = own[:-8]-[s['x'], s['y']]                       # skip the neck
        near = np.hypot(*rel.T) < 300
        cov = np.zeros(24, bool)
        cov[((np.arctan2(rel[near, 1], rel[near, 0])+np.pi)/(2*np.pi)*24).astype(int) % 24] = True
        covs.append(cov.mean())
    return round(straight, 2), (round(float(np.mean(covs)), 2) if covs else None)


def main(paths):
    rows = [c for c in map(classify, paths) if c]
    for c in rows:
        print(f"{c['path'][-22:-6]} {c['seconds']:6.1f}s L{c['L']:5d} {c['category']:8s} killer r{c['killer_r']} head {c['killer_head']}px"
              f" boostK {int(c['killer_boost'])} remains {int(c['remains'])} boostUs {int(c['boosting'])} stuck {c['stuck']}s"
              f" rev3s {c['reversals_3s']} mode2s {c['mode_2s']}")
    n = len(rows)
    if not n: return
    print(f'\n{n} deaths; survival median {np.median([c["seconds"] for c in rows]):.0f} s')
    for cat, k in Counter(c['category'] for c in rows).most_common():
        sub = [c for c in rows if c['category'] == cat]
        print(f'  {cat:8s} {k:2d} ({k/n:.0%})  remains {sum(c["remains"] for c in sub)}  killer boosting {sum(c["killer_boost"] for c in sub)}'
              f'  median s {np.median([c["seconds"] for c in sub]):.0f}')
    for flag in ('remains', 'killer_boost', 'boosting', 'spawn_fight'):
        print(f'  {flag}: {sum(c[flag] for c in rows)}/{n}')
    print('\nbunching (straightness 5 s, own-body cover): last 5 s before death vs 15-20 s before (same black box)')
    for c in rows:
        box = pickle.load(gzip.open(c['path'][:-6]+'/blackbox.pkl.gz'))
        T = box[-1]['state']['t']
        c['bunch_end'], c['bunch_base'] = bunching(box, T), bunching(box, T-15)
        print(f"  {c['path'][-22:-6]} {c['category']:8s} end {c['bunch_end']}  base {c['bunch_base']}")
    ends = [c['bunch_end'] for c in rows if c['bunch_end'][0] is not None]
    bases = [c['bunch_base'] for c in rows if c['bunch_base'][0] is not None]
    if ends and bases:
        print(f"  median straightness end {np.median([e[0] for e in ends]):.2f} vs base {np.median([b[0] for b in bases]):.2f};"
              f" own cover end {np.median([e[1] for e in ends if e[1] is not None]):.2f} vs base {np.median([b[1] for b in bases if b[1] is not None]):.2f}")
    # Whole-game view from the trace: straightness of the commanded heading per 5 s (mean resultant length of
    # unit vectors; 1 = one direction, ~0 = circling), before death / before wrap onset vs the rest of the game.
    def straight_cmd(w):
        a = np.radians([x['cmd'] for x in w if 'cmd' in x])
        return float(np.hypot(np.cos(a).mean(), np.sin(a).mean())) if len(a) > 30 else None
    near, rest = [], []
    for c in rows:
        tr = json.loads(open(c['path']).read())['trace']; T = tr[-1]['t']
        for t0 in np.arange(tr[0]['t'], T-5, 5.):
            v = straight_cmd([x for x in tr if t0 <= x['t'] < t0+5])
            if v is None: continue
            (near if t0 >= T-15 else rest).append(v)
    if near and rest:
        print(f"\ncommand straightness per 5 s: last 15 s before death median {np.median(near):.2f} (n={len(near)})"
              f" vs rest of game {np.median(rest):.2f} (n={len(rest)}); share of rest windows < 0.3: {np.mean(np.array(rest) < .3):.0%}")
    print('\nwrap onsets (wrapping snake = killer):')
    for c in rows:
        if c['category'] == 'wrapped' and c.get('killer') is not None:
            print(' ', c['path'][-22:-6], onset(c['path'], c['killer']))


if __name__ == '__main__':
    main(sys.argv[1:])
