"""Frame-by-frame tail of one V2 game: our pose, planner output, nearest body (id, radius, gap, bearing rel. to heading), nearest head.
  python3 research/v2_trace.py runs/<dir> <k> [window_s=4] [step_s=0.5]"""
import gzip, json, math, sys
d, k = sys.argv[1], int(sys.argv[2]); W = float(sys.argv[3]) if len(sys.argv) > 3 else 4; ST = float(sys.argv[4]) if len(sys.argv) > 4 else .5
L = json.load(gzip.open(f'{d}/slp_{k:02d}_log.json.gz')); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]
b = json.load(gzip.open(f'{d}/slp_{k:02d}_box.json.gz')); fr = b['frames']; last = fr[-1]; T = last['t']
def wrap(a): return (a + math.pi) % (2*math.pi) - math.pi
def nearest(f):
    ro = 14.5*f['sc']; S, sid = f['segs'], f['sid']; best = (1e9, None, None, None)
    for j in range(len(sid)):
        x1, y1, x2, y2, r = S[5*j:5*j+5]; dx, dy = x2-x1, y2-y1; l2 = dx*dx+dy*dy; t = 0 if l2 < 1e-9 else max(0, min(1, ((f['x']-x1)*dx+(f['y']-y1)*dy)/l2))
        cx, cy = x1+t*dx, y1+t*dy; dd = math.hypot(f['x']-cx, f['y']-cy) - r - ro
        if dd < best[0]: best = (dd, sid[j], r, math.degrees(wrap(math.atan2(cy-f['y'], cx-f['x']) - f['ang'])))
    return best
def nhead(f):
    best = (1e9, None, None, None, None)
    for m in range(len(f['hid'])):
        hx, hy, ha, hs, hsc = f['heads'][5*m:5*m+5]; dd = math.hypot(hx-f['x'], hy-f['y'])
        if dd < best[0]: best = (dd, f['hid'][m], round(hs, 1), round(hsc, 2), round(math.degrees(wrap(math.atan2(hy-f['y'], hx-f['x']) - f['ang']))))
    return best
print(f"game {k}: T {T:.1f}s ro {14.5*last['sc']:.1f} segs_last {len(last['sid'])} snakes {len(set(last['sid']))} heads {len(last['hid'])}")
print("  back   t   |  x      y    ang  sp bst cmdrel | mode   ttd ttdS ttdH  cov esc | body: id   r   gap  rel | head: id dist sp  sc rel")
back = W
while back >= -1e-9:
    f = next(x for x in reversed(fr) if T - x['t'] >= back - 1e-6)
    r = min(R, key=lambda x: abs(x['t'] - f['t']))
    g, gid, gr, grel = nearest(f); hd, hid, hs, hsc, hrel = nhead(f); nk = sum(1 for s_ in f['sid'] if s_ == gid)
    c = f.get('cmd'); c = c[0] if isinstance(c, list) else c; cmdrel = math.degrees(wrap(c - f['ang'])) if isinstance(c, (int, float)) else float('nan')
    sp_ = f['sp'] if isinstance(f['sp'], (int, float)) else float('nan'); hd = hd if hd < 1e8 else float('nan')
    print(f"  {back:4.1f} {f['t']:7.1f} | {f['x']:6.0f} {f['y']:6.0f} {math.degrees(f['ang']):5.0f} {sp_:4.1f} {int(bool(f['boost']))} {cmdrel:6.0f} | {r['mode']:6} {r['ttd']:4} {r.get('ttds')!s:4} {r.get('ttdh')!s:4} {r.get('cov')!s:4} {r.get('esc')!s:5} | {gid!s:>5} {gr!s:>4} {g:6.1f} {grel:5.0f} n{nk:<3} | {hid!s:>4} {hd:5.0f} {hs!s:>4} {hsc!s:>4} {hrel!s:>4}")
    back -= ST
