"""Per-second cover history (no size gate): for each snake with body within R px, cover of 24 bearings, widest opening (bins),
radius, segment count, head distance/speed. python3 research/v2_cover.py runs/<dir> <k> [window_s=60] [R=600]"""
import gzip, json, math, sys
d, k = sys.argv[1], int(sys.argv[2]); W = float(sys.argv[3]) if len(sys.argv) > 3 else 60; RR = float(sys.argv[4]) if len(sys.argv) > 4 else 600
b = json.load(gzip.open(f'{d}/slp_{k:02d}_box.json.gz')); fr = b['frames']; T = fr[-1]['t']
print(f"game {k}: T {T:.1f}s  ro_last {14.5*fr[-1]['sc']:.1f}")
back = min(W, T - fr[0]['t'])
while back >= -1e-9:
    f = next(x for x in reversed(fr) if T - x['t'] >= back - 1e-6); ro = 14.5*f['sc']
    by = {}
    for j in range(len(f['sid'])):
        x1, y1, x2, y2, r = f['segs'][5*j:5*j+5]; bx, by_ = (x1+x2)/2, (y1+y2)/2; dd = math.hypot(bx-f['x'], by_-f['y'])
        e = by.setdefault(f['sid'][j], {'bins': [False]*24, 'n': 0, 'r': r, 'gap': 1e9})
        e['n'] += 1; e['gap'] = min(e['gap'], dd - r - ro)
        if dd < RR: e['bins'][int((math.atan2(by_-f['y'], bx-f['x'])+math.pi)/(2*math.pi)*24) % 24] = True
    heads = {f['hid'][m]: (round(math.hypot(f['heads'][5*m]-f['x'], f['heads'][5*m+1]-f['y'])), round(f['heads'][5*m+3], 1)) for m in range(len(f['hid']))}
    out = []
    for sid_, e in sorted(by.items(), key=lambda kv: -sum(kv[1]['bins'])):
        c = sum(e['bins'])
        if c == 0: continue
        bins = e['bins']; am = bins.index(True); run = 0; cur = 0
        for q in range(24):
            if not bins[(q+am) % 24]: cur += 1; run = max(run, cur)
            else: cur = 0
        hd = heads.get(sid_, ('-', '-'))
        out.append(f"{sid_}:cov{c/24:.2f}/open{run:2d}/r{e['r']:.0f}({e['r']/ro:.2f}x)/n{e['n']}/gap{e['gap']:.0f}/head{hd[0]}@{hd[1]}")
    print(f"  -{back:4.0f}s t{f['t']:7.1f} sp{f['sp'] if isinstance(f['sp'],(int,float)) else -1:4.1f} | " + '  '.join(out[:3]))
    back -= 2
