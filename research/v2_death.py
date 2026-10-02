"""One V2 death in brief: killer (size, speed, distance), its cover over the last 10 s, heads nearby, and our ttd/mode trend.
  python3 research/v2_death.py runs/<dir> <k>"""
import gzip, json, math, sys
d, k = sys.argv[1], int(sys.argv[2])
L = json.load(gzip.open(f'{d}/slp_{k:02d}_log.json.gz')); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]; T = R[-1]['t']
b = json.load(gzip.open(f'{d}/slp_{k:02d}_box.json.gz')); fr = b['frames']; last = fr[-1]; ro = 14.5 * last['sc']
S, sid = last['segs'], last['sid']; best = (1e9, None, None)
for j in range(len(sid)):
    x1, y1, x2, y2, r = S[5*j:5*j+5]; dx, dy = x2-x1, y2-y1; l2 = dx*dx+dy*dy; t = 0 if l2 < 1e-9 else max(0, min(1, ((last['x']-x1)*dx+(last['y']-y1)*dy)/l2))
    dd = math.hypot(last['x']-(x1+t*dx), last['y']-(y1+t*dy)) - r - ro
    if dd < best[0]: best = (dd, sid[j], r)
kid = best[1]
kh = [(round(last['heads'][5*m+3], 1), round(last['heads'][5*m+4], 2), round(math.hypot(last['heads'][5*m]-last['x'], last['heads'][5*m+1]-last['y']))) for m in range(len(last['hid'])) if last['hid'][m] == kid]
print(f"game {k}: {R[-1]['t']:.0f}s L {R[-1]['L']} our r {ro:.1f} | killer id {kid} r {best[2]} gap {best[0]:.1f} head(sp,sc,dist) {kh}")
for back in (10, 6, 3, 1, 0):
    f = next(x for x in reversed(fr) if last['t'] - x['t'] >= back)
    bins = [False]*24
    for j in range(len(f['sid'])):
        if f['sid'][j] != kid: continue
        x1, y1 = f['segs'][5*j], f['segs'][5*j+1]; dd = math.hypot(x1-f['x'], y1-f['y'])
        if dd < 500: bins[int((math.atan2(y1-f['y'], x1-f['x'])+math.pi)/(2*math.pi)*24) % 24] = True
    near = sum(1 for m in range(len(f['hid'])) if math.hypot(f['heads'][5*m]-f['x'], f['heads'][5*m+1]-f['y']) < 400)
    r = next(x for x in reversed(R) if T - x['t'] >= back)
    print(f"  -{back:>2}s killer cover {sum(bins)/24:.2f} | heads<400px {near} | mode {r['mode']} ttd {r['ttd']} boost {r['boost']} gap_now {r['gap_now']}")
