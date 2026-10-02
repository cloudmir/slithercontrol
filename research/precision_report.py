"""Precision metrics per run (user 2026-09-28: survival is not the metric; near-body precision, remains eating and boost use
are). From whole-game logs (slp_*_log.json.gz).  python3 research/precision_report.py runs/<dir> [runs/<dir> ...]
- passes: episodes with drawn gap to the nearest body (gap_now) < 40 px, separated by >= 1 s above; min gap per pass,
  the planner's own margin (thr) at that moment, passes that end in a body-contact death (last row inside a pass).
- remains: big heaps (goal >= 600) missed (no L gain), L/min while a heap (goal >= 150) is in view.
- boost: share of time, L gained per boost second vs cruise second, toggles per minute, deaths while boosting."""
import gzip, json, sys, glob, statistics as st
def load(d):
    out = []
    for f in sorted(glob.glob(f'{d}/slp_*_log.json.gz')):
        L = json.load(gzip.open(f)); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]
        rec = json.load(open(f.replace('_log.json.gz', '.json')))
        if R: out.append((R, rec))
    return out
def metrics(games):
    T = sum(R[-1]['t'] for R, _ in games); passes = []; deaths_pass = 0; deaths = 0
    heap_t = heap_L = 0; big = missed = 0; bt = bL = ct = cL = 0; toggles = 0; bdeath = 0; flips = 0; preds = []
    for R, rec in games:
        died = not rec.get('capped'); deaths += died
        if died and R[-1]['boost']: bdeath += 1
        cur = None; last_in = None
        for i, r in enumerate(R):
            if i:
                dt = r['t'] - R[i-1]['t']; dL = r['L'] - R[i-1]['L']
                if r['boost']: bt += dt; bL += dL
                else: ct += dt; cL += dL
                if r['boost'] != R[i-1]['boost']: toggles += 1
                if abs(((r['cmd'] - R[i-1]['cmd']) + 180) % 360 - 180) > 60: flips += 1
                if r['goal'] >= 150: heap_t += dt; heap_L += dL
            if isinstance(r['pred'], (int, float)) and r['pred'] >= 0: preds.append(r['pred'])
            g = r['gap_now']
            if g is not None and g < 40:
                if cur is None: cur = dict(t0=r['t'], min=g, thr=r.get('thr'), n=0)
                cur['min'] = min(cur['min'], g); cur['n'] += 1; last_in = r['t']
            elif cur is not None and r['t'] - last_in >= 1: passes.append(cur); cur = None
        if cur is not None:
            cur['death'] = died and R[-1]['t'] - last_in <= .2; passes.append(cur)
        # big heaps missed
        curh = None; lasth = None
        for r in R:
            if r['goal'] >= 600:
                if curh is None: curh = dict(L0=r['L']); 
                curh['L1'] = r['L']; lasth = r['t']
            elif curh is not None and r['t'] - lasth > 1.5:
                big += 1; missed += curh['L1'] - curh['L0'] <= 0; curh = None
        if curh: big += 1; missed += curh['L1'] - curh['L0'] <= 0
    mins = sorted(p['min'] for p in passes); dp = sum(1 for p in passes if p.get('death'))
    q = lambda a, p: a[min(len(a)-1, int(len(a)*p))] if a else None
    return dict(games=len(games), minutes=round(T/60, 1), deaths=deaths,
        passes=len(passes), pass_per_min=round(len(passes)/T*60, 2), pass_min_p10=q(mins, .1), pass_min_p50=q(mins, .5),
        pass_below0=round(sum(m < 0 for m in mins)/max(1, len(mins)), 3), pass_death_per100=round(dp/max(1, len(passes))*100, 2),
        big_heaps=big, big_missed=round(missed/max(1, big), 3), heap_share=round(heap_t/T, 3), heap_Lmin=round(heap_L/max(1, heap_t)*60),
        boost_share=round(bt/T, 3), L_per_boost_s=round(bL/max(1, bt), 2), L_per_cruise_s=round(cL/max(1, ct), 2), toggles_per_min=round(toggles/T*60, 1),
        boost_deaths=bdeath, flips60_per_min=round(flips/T*60, 1), pred_p50=q(sorted(preds), .5), pred_p90=q(sorted(preds), .9))
if __name__ == '__main__':
    rows = [(d, metrics(load(d))) for d in sys.argv[1:]]
    keys = list(rows[0][1].keys())
    print('| 지표 | ' + ' | '.join(d.split('/')[-1] for d, _ in rows) + ' |'); print('|---|' + '---:|' * len(rows))
    for k in keys: print(f'| {k} | ' + ' | '.join(str(m[k]) for _, m in rows) + ' |')
