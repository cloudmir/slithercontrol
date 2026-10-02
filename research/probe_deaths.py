"""Per-death detail from probe black boxes (Codex 2026-09-28): the gap over the last 0.5 s, the normal (lateral) approach
speed, trail curvature at the contact point, steady vs still-closing, so the boundary table can keep only clean points.
  python3 research/probe_deaths.py runs/probe_* > research/probe_deaths.md"""
import gzip, json, sys, glob, math
def nearest(fr, tid):
    S, sid = fr['segs'], fr['sid']; best = (1e9, None, None, None)
    for k in range(len(sid)):
        if sid[k] != tid: continue
        x1, y1, x2, y2, r = S[5*k:5*k+5]; dx, dy = x2-x1, y2-y1; l2 = dx*dx+dy*dy
        t = 0 if l2 < 1e-9 else max(0, min(1, ((fr['x']-x1)*dx+(fr['y']-y1)*dy)/l2))
        d = math.hypot(fr['x']-(x1+t*dx), fr['y']-(y1+t*dy))
        if d < best[0]: best = (d, r, k, math.atan2(dy, dx))
    return best
def curvature(fr, tid, k0, span=100):   # heading change of the trail over ~span px around segment k0 (1/px)
    S, sid = fr['segs'], fr['sid']; ks = [k for k in range(len(sid)) if sid[k] == tid]
    if k0 not in ks: return None
    i = ks.index(k0); lo = max(0, i-3); hi = min(len(ks)-1, i+3)
    a0 = math.atan2(S[5*ks[lo]+3]-S[5*ks[lo]+1], S[5*ks[lo]+2]-S[5*ks[lo]]); a1 = math.atan2(S[5*ks[hi]+3]-S[5*ks[hi]+1], S[5*ks[hi]+2]-S[5*ks[hi]])
    L = sum(math.hypot(S[5*k+2]-S[5*k], S[5*k+3]-S[5*k+1]) for k in ks[lo:hi+1])
    d = (a1 - a0 + math.pi) % (2*math.pi) - math.pi
    return d / L if L else None
print('| 판 | 우리 r | 상대 r | 설정 | 상태 | gap −0.5s | −0.25s | −0.1s | 마지막 | 수직 접근속도(px/s) | 곡률(1/px) | 곡률반경(px) | 속도 | 마지막 프레임 지연(s) |')
print('|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
out = []
for d in sys.argv[1:]:
    for f in sorted(glob.glob(f'{d}/slp_*_log.json.gz')):
        L = json.load(gzip.open(f)); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]
        fol = [r for r in R if r.get('pph') == 1]
        if not fol or R[-1]['t'] - fol[-1]['t'] > .3: continue
        tid = fol[-1]['ptid']; b = json.load(gzip.open(f.replace('_log', '_box'))); fr = b['frames']
        last = fr[-1]; ro = 14.5 * last['sc']
        d0, rt, k0, _ = nearest(last, tid)
        if rt is None: continue
        gaps = []
        for back in (.5, .25, .1, 0):
            g = next((x for x in reversed(fr) if last['t'] - x['t'] >= back), fr[0]); dd = nearest(g, tid)[0]
            gaps.append(round(dd - rt - ro, 1) if dd < 1e8 else None)
        g5 = next((x for x in reversed(fr) if last['t'] - x['t'] >= .5), fr[0]); dt = last['t'] - g5['t']
        vn = (gaps[3] - gaps[0]) / dt if dt > 0 and None not in (gaps[0], gaps[3]) else None
        # steady: the set level was held (pstab rose since that set) and |gap - set| < 3 at -0.5 s
        st = fol[-1]['pset']; steady = gaps[0] is not None and abs(gaps[0] - st) < 3 and st < 4
        cv = curvature(last, tid, k0)
        run = d.split('/')[-1]; print(f"| {run[-6:]}/{f.split('/')[-1][:6]} | {ro:.1f} | {rt:.1f} | {st} | {'정상' if steady else '접근중'} | {gaps[0]} | {gaps[1]} | {gaps[2]} | {gaps[3]} | {vn and round(vn, 1)} | {cv and round(cv, 4)} | {cv and (round(1/abs(cv)) if abs(cv) > 1e-5 else '직선')} | {last['sp']:.1f} | {last['t'] - fr[-2]['t']:.3f} |")
