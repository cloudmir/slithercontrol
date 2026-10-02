"""Table from probe games: per game the target radius, our radius, every gap level held steadily (alive points) and the
gap set / measured at death when we died while following (death point).  python3 research/probe_report.py runs/probe_*"""
import gzip, json, sys, glob, statistics as st
from collections import defaultdict
rows, alive = [], defaultdict(set)
for d in sys.argv[1:]:
    for f in sorted(glob.glob(f'{d}/slp_*_log.json.gz')):
        L = json.load(gzip.open(f)); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]
        if not R or 'pph' not in K: continue
        rec = json.load(open(f.replace('_log.json.gz', '.json')))
        fol = [r for r in R if r['pph'] == 1]
        last = R[-1]; end = R[-1]['t']
        # alive levels: a follow tick where pstab increased marks a level held steadily (the level just left)
        levels = []; prev = 0; prevset = None; held = []
        for r in fol:
            if r['pstab'] > prev and prevset is not None:
                meas = sorted(h['pgap'] for h in held if h['pset'] == prevset and h['pgap'] is not None)[-15:]   # the last 0.5 s at that level
                levels.append((round(r['sc'] * 14.5, 1), r['ptr'], prevset, round(st.median(meas), 1) if meas else None))
            prev = r['pstab']; prevset = r['pset']; held.append(r); held = held[-40:]
        for ro, rt, g, mg in levels: alive[(round(ro), round(rt))].add(mg if mg is not None else g)
        # death: last follow tick within 0.3 s of the end, and not a time cap
        death = None
        if fol and not rec.get('capped') and end - fol[-1]['t'] <= .3:
            x = fol[-1]; death = dict(ro=round(x['sc'] * 14.5, 1), rt=x['ptr'], set=x['pset'], gap=x['pgap'], t=round(x['t'], 1))
        follow_s = sum(1 for r in fol) / 30
        rows.append(dict(game=f.split('/')[-1][:6], run=d.split('/')[-1], seconds=rec['seconds'], follow_s=round(follow_s, 1), levels=levels, death=death,
                         end_phase=last['pph'], end_gap=last['pgap']))
print('# 두께 탐침 결과\n\ngap = 그려진 간격(px): 머리→상대 몸 중심선 거리 − 우리 r − 상대 r. 음수 = 그려진 몸이 겹침.\n')
print('| 판 | 판 길이(s) | 따라간 시간(s) | 우리 r | 상대 r | 비 | 안정 유지된 간격들: 설정(실측 중앙값) | 사망 시 설정 / 실측 gap |\n|---|---:|---:|---:|---:|---:|---|---|')
for r in rows:
    ro = r['death']['ro'] if r['death'] else (r['levels'][-1][0] if r['levels'] else None)
    rt = r['death']['rt'] if r['death'] else (r['levels'][-1][1] if r['levels'] else None)
    lv = ', '.join(f'{l[2]}({l[3]})' for l in r['levels']) or '—'
    dth = f"{r['death']['set']} / {r['death']['gap']}" if r['death'] else ('상한' if r['end_phase'] is None else f"무효(끝 단계 {r['end_phase']}, gap {r['end_gap']})")
    ratio = f'{rt / ro:.2f}' if ro and rt else ''
    print(f"| {r['run'][-6:]}/{r['game']} | {r['seconds']} | {r['follow_s']} | {ro or ''} | {rt or ''} | {ratio} | {lv} | {dth} |")
deaths = [r['death'] for r in rows if r['death']]
print(f"\n유효 사망점 {len(deaths)} / {len(rows)}판, 안정 간격 조합 {len(alive)}개\n")
print('## (우리 r, 상대 r)별 경계\n\n| 우리 r | 상대 r | 비 | 생존한 최소 실측 gap | 사망 gap(설정) | 사망 gap(실측) |\n|---:|---:|---:|---:|---:|---:|')
keys = set(alive) | {(round(d['ro']), round(d['rt'])) for d in deaths}
for ro, rt in sorted(keys, key=lambda k: (k[1] / k[0], k[0])):
    dl = [d for d in deaths if (round(d['ro']), round(d['rt'])) == (ro, rt)]
    print(f"| {ro} | {rt} | {rt / ro:.2f} | {min(alive[(ro, rt)]) if alive.get((ro, rt)) else ''} | {', '.join(str(d['set']) for d in dl)} | {', '.join(str(d['gap']) for d in dl)} |")

# ---- death validation against the black box: was the nearest body at the last frame the followed trail? ----
def box_check(logfile):
    import math
    f = logfile.replace('_log.json.gz', '_box.json.gz')
    try: b = json.load(gzip.open(f))
    except Exception: return None
    fr = b['frames'][-1]; ro = 14.5 * fr['sc']; best = (1e9, None, None)
    S, sid = fr['segs'], fr['sid']
    for k in range(len(sid)):
        x1, y1, x2, y2, r = S[5*k:5*k+5]; dx, dy = x2-x1, y2-y1; l2 = dx*dx+dy*dy
        t = 0 if l2 < 1e-9 else max(0, min(1, ((fr['x']-x1)*dx+(fr['y']-y1)*dy)/l2))
        d = math.hypot(fr['x']-(x1+t*dx), fr['y']-(y1+t*dy)) - r - ro
        if d < best[0]: best = (d, sid[k], r)
    heads = fr['heads']; hd = min((math.hypot(heads[5*m]-fr['x'], heads[5*m+1]-fr['y']) for m in range(len(fr['hid']))), default=None)
    return dict(gap=round(best[0], 1), id=best[1], r=best[2], sp=round(fr['sp'], 1), boost=fr['boost'], head_d=None if hd is None else round(hd))
if __name__ == '__main__' and '--check' in sys.argv:
    print('\n## 블랙박스 대조 (마지막 프레임: 가장 가까운 몸이 추종 대상인가)\n\n| 판 | 추종 대상 id | 마지막 프레임 최근접 몸 id | 그 gap | 그 r | 속도 | 부스트 | 가장 가까운 머리(px) | 판정 |\n|---|---|---|---:|---:|---:|---|---:|---|')
    for d in sys.argv[1:]:
        if d.startswith('--'): continue
        for f in sorted(glob.glob(f'{d}/slp_*_log.json.gz')):
            L = json.load(gzip.open(f)); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]
            fol = [r for r in R if r.get('pph') == 1]
            if not fol: continue
            c = box_check(f); tid = fol[-1]['ptid']; end = R[-1]['t'] - fol[-1]['t']
            ok = c and c['id'] == tid and end <= .3
            print(f"| {f.split('/')[-1][:6]} | {tid} | {c and c['id']} | {c and c['gap']} | {c and c['r']} | {c and c['sp']} | {c and ('y' if c['boost'] else '')} | {c and c['head_d']} | {'유효' if ok else '무효(' + ('다른 몸' if c and c['id'] != tid else '추종 아님 %.1fs' % end) + ')'} |")
