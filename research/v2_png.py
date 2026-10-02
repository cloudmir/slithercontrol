"""Render blackbox frames to PNG panels (PIL): bodies per snake id, our body (green), heading (white), cmd (yellow), heads (red dots + velocity).
  python3 research/v2_png.py runs/<dir> <k> <out.png> <back_s,...> [half_world_px=900]"""
import gzip, json, math, sys, colorsys
from PIL import Image, ImageDraw
d, k, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]; backs = [float(x) for x in sys.argv[4].split(',')]; HW = float(sys.argv[5]) if len(sys.argv) > 5 else 900
b = json.load(gzip.open(f'{d}/slp_{k:02d}_box.json.gz')); fr = b['frames']; T = fr[-1]['t']
L = json.load(gzip.open(f'{d}/slp_{k:02d}_log.json.gz')); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]
P = 600; sc = P / (2 * HW)
def col(i): h = (i * 0.618) % 1; r, g, bb = colorsys.hsv_to_rgb(h, .8, 1); return (int(r*255), int(g*255), int(bb*255))
img = Image.new('RGB', (P * len(backs), P + 40), (20, 20, 20)); dr = ImageDraw.Draw(img)
for pi, back in enumerate(backs):
    f = next(x for x in reversed(fr) if T - x['t'] >= back - 1e-6); ro = 14.5 * f['sc']; ox = pi * P
    W = lambda x, y: (ox + P/2 + (x - f['x']) * sc, 20 + P/2 + (y - f['y']) * sc)
    for j in range(len(f['sid'])):
        x1, y1, x2, y2, r = f['segs'][5*j:5*j+5]; dr.line([W(x1, y1), W(x2, y2)], fill=col(f['sid'][j]), width=max(1, int(2 * r * sc)))
    own = f['own']
    for j in range(0, len(own) - 2, 2): dr.line([W(own[j], own[j+1]), W(own[j+2], own[j+3])], fill=(60, 220, 60), width=max(1, int(2 * ro * sc)))
    for m in range(len(f['hid'])):
        hx, hy, ha, hs, hsc = f['heads'][5*m:5*m+5]; p = W(hx, hy); rr = 14.5 * hsc * sc
        dr.ellipse([p[0]-rr, p[1]-rr, p[0]+rr, p[1]+rr], outline=(255, 60, 60), width=2)
        dr.line([p, W(hx + math.cos(ha) * hs * 31, hy + math.sin(ha) * hs * 31)], fill=(255, 60, 60), width=2)
        dr.text((p[0] + 6, p[1] - 6), f"{f['hid'][m]} r{14.5*hsc:.0f} sp{hs:.0f}", fill=(255, 120, 120))
    p = W(f['x'], f['y']); rr = ro * sc; dr.ellipse([p[0]-rr, p[1]-rr, p[0]+rr, p[1]+rr], outline=(255, 255, 255), width=2)
    dr.line([p, W(f['x'] + math.cos(f['ang']) * 200, f['y'] + math.sin(f['ang']) * 200)], fill=(255, 255, 255), width=2)
    c = f.get('cmd'); c = c[0] if isinstance(c, list) else c
    if isinstance(c, (int, float)): dr.line([p, W(f['x'] + math.cos(c) * 150, f['y'] + math.sin(c) * 150)], fill=(255, 230, 0), width=3)
    r = min(R, key=lambda x: abs(x['t'] - f['t']))
    dr.text((ox + 6, 4), f"-{back:.1f}s t{f['t']:.1f} L{f['L']} ro{ro:.0f} sp{f['sp']} boost{int(bool(f['boost']))} | {r['mode']} ttd{r['ttd']} gap{r.get('gap_now')} cov{r.get('cov')} esc{r.get('esc')}", fill=(230, 230, 230))
    dr.text((ox + 6, P + 24), f"window ±{HW:.0f}px; snakes {sorted(set(f['sid']))}", fill=(160, 160, 160))
img.save(out); print('saved', out, img.size)
