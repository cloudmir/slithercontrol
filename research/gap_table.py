"""Passive death-boundary table (user 2026-09-28: "a. x 두께일 때 b. 어디까지는 죽지 않는 경계" — x·y as many as possible).
Every black box (60 s before each death) gives: the drawn gap head->nearest other body at the last frame (death gap, upper
bound of the boundary for that (our r, its r)) and, over all earlier frames, the smallest gap we survived (lower bound).
Drawn gap = capsule distance - our radius - the body's radius; radius = 14.5 * sc (pilot.js R). Deaths whose last frame is
not a body contact (head-on, wall, no body within 60 px) are listed separately.
  python3 research/gap_table.py runs/*/slp_*_box.json.gz > research/gap_table.md
"""
import gzip, json, sys, glob, math
from collections import defaultdict
R = 14.5
def seg_gap(px, py, segs, own_ids, sid):
    best = (1e9, None)
    for k in range(len(sid)):
        if sid[k] in own_ids: continue
        x1, y1, x2, y2, r = segs[5*k:5*k+5]
        dx, dy = x2-x1, y2-y1; L2 = dx*dx+dy*dy
        t = 0 if L2 < 1e-9 else max(0, min(1, ((px-x1)*dx+(py-y1)*dy)/L2))
        d = math.hypot(px-(x1+t*dx), py-(y1+t*dy)) - r
        if d < best[0]: best = (d, r, sid[k])
    return best
rows, deaths, other = [], [], []
for f in sys.argv[1:]:
    try: d = json.load(gzip.open(f))
    except Exception: continue
    fr = d['frames']
    if len(fr) < 30: continue
    rec = f.replace('_box.json.gz', '.json')
    try: capped = json.load(open(rec)).get('capped')
    except Exception: capped = None
    if capped: continue                          # time-limit games are not deaths
    alive = defaultdict(lambda: 1e9)             # (ro bin, rt bin) -> min survived gap
    for i, s in enumerate(fr):
        ro = R*s['sc']; segs, sid = s['segs'], s['sid']
        if not sid: continue
        g, r, who = seg_gap(s['x'], s['y'], segs, set(), sid)
        if r is None: continue
        gap = g - ro
        key = (round(ro), round(r))
        if i < len(fr)-1:
            if gap < alive[key]: alive[key] = gap
        else:
            deaths.append(dict(file=f, t=s['t'], ro=round(ro, 1), rt=round(r, 1), gap=round(gap, 1), sp=round(s['sp'], 1), boost=s['boost'],
                               lag=round(fr[-1]['t']-fr[-2]['t'], 3), contact=gap < 60))
    for key, v in alive.items(): rows.append((key, v, f))
# death table per (our r, its r), plus survived minimum in the same box before death
print('# 사망 경계 표 (수동 관측, 블랙박스 마지막 프레임)\n')
print('drawn gap = 머리→가장 가까운 남의 몸(캡슐 거리) − 우리 r − 그 몸 r (px). 음수 = 그려진 몸이 겹침. 마지막 프레임은 사망 0.03~0.06초 전 관측이며 서버 위치와 차이가 있을 수 있음.\n')
print('| 판 | 우리 r | 상대 r | 비 | 사망 시 gap | 속도 | 부스트 | 이 판에서 생존한 최소 gap(같은 r 조합) |')
print('|---|---:|---:|---:|---:|---:|---|---:|')
alive_by = defaultdict(list)
for key, v, f in rows: alive_by[(key, f)].append(v)
for x in sorted(deaths, key=lambda x: (x['contact'] is False, x['rt']/x['ro'])):
    if not x['contact']: continue
    key = ((round(x['ro']), round(x['rt'])), x['file'])
    mn = min(alive_by.get(key, [1e9]))
    print(f"| {x['file'].split('/')[1][:24]}/{x['file'].split('/')[2][:6]} | {x['ro']} | {x['rt']} | {x['rt']/x['ro']:.2f} | {x['gap']} | {x['sp']} | {'y' if x['boost'] else ''} | {'' if mn > 1e8 else round(mn, 1)} |")
print(f"\n몸 접촉이 아닌 마지막 프레임(gap ≥ 60px: 정면 머리·벽·관측 지연): {sum(not x['contact'] for x in deaths)}건 / 사망 {len(deaths)}건\n")
# binned summary: ratio bins
print('## 굵기비 구간 요약 (사망 gap 분위수)\n\n| 상대 r / 우리 r | n | p25 | p50 | p75 | min | max |\n|---|---:|---:|---:|---:|---:|---:|')
bins = [(0, .8), (.8, 1.25), (1.25, 2), (2, 3), (3, 99)]
for lo, hi in bins:
    g = sorted(x['gap'] for x in deaths if x['contact'] and lo <= x['rt']/x['ro'] < hi)
    if not g: continue
    q = lambda p: g[min(len(g)-1, int(len(g)*p))]
    print(f'| {lo}~{hi} | {len(g)} | {q(.25)} | {q(.5)} | {q(.75)} | {g[0]} | {g[-1]} |')
# survived minima per rt bin (all boxes, all frames)
print('\n## 생존한 최소 gap (모든 프레임, 상대 r 구간별)\n\n| 상대 r | n(판·조합) | 생존 최소 gap p0 | p5 | p25 |\n|---|---:|---:|---:|---:|')
by_rt = defaultdict(list)
for (key, v, f) in rows: by_rt[(key[1]//10)*10].append(v)
for rt in sorted(by_rt):
    g = sorted(by_rt[rt]); q = lambda p: round(g[min(len(g)-1, int(len(g)*p))], 1)
    print(f'| {rt}~{rt+9} | {len(g)} | {q(0)} | {q(.05)} | {q(.25)} |')
