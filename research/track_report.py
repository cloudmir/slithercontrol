"""Tracking precision per game (2026-09-30 tracker): plan-vs-actual position/heading error, command churn, packet rate,
send -> wang (server target) latency, wang -> ang onset. python research/track_report.py runs/<dir> [k ...]"""
import gzip, json, math, sys, glob, statistics as st
d = sys.argv[1]; ks = [int(x) for x in sys.argv[2:]] or sorted(int(f.split('slp_')[1][:2]) for f in glob.glob(f'{d}/slp_*_log.json.gz'))
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
pct = lambda a, q: sorted(a)[min(len(a) - 1, int(len(a) * q))] if a else None
for k in ks:
    g = json.load(open(f'{d}/slp_{k:02d}.json'.replace('NaN', 'null')) if False else open(f'{d}/slp_{k:02d}.json'), parse_constant=lambda c: None)
    L = json.load(gzip.open(f'{d}/slp_{k:02d}_log.json.gz')); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]
    p50 = [r['pred'] for r in R if r.get('pred') not in (None, -1)]; p25 = [r['pred25'] for r in R if r.get('pred25') is not None]; h25 = [r['herr25'] for r in R if r.get('herr25') is not None]
    tr = g.get('track') or {}; fr = tr.get('frames') or []; pk = tr.get('packets') or []
    F = [fr[i:i + 5] for i in range(0, len(fr), 5)]; P = [pk[i:i + 2] for i in range(0, len(pk), 2)]
    ang_pk = [(t, v) for t, v in P if v <= 250]; boost_pk = [(t, v) for t, v in P if v in (253, 254)]
    secs = g['seconds'] or 1
    # send -> wang latency: first frame after the packet where wang is within 3 deg of the sent angle (angle = v/251*2pi)
    lat, j = [], 0
    for t, v in ang_pk:
        a = v / 251 * 2 * math.pi
        while j < len(F) and F[j][0] < t: j += 1
        for i in range(j, min(j + 60, len(F))):
            if abs(wrap(F[i][2] - a)) < math.radians(3): lat.append(F[i][0] - t); break
    # plan heading vs actual heading per frame; sent vs actual
    herr = [abs(wrap(f[1] - f[4])) * 180 / math.pi for f in F if f[4] is not None]
    churn = sum(1 for i in range(1, len(R)) if R[i].get('trk_cmd') is not None and R[i - 1].get('trk_cmd') is not None and abs(wrap(math.radians(R[i]['trk_cmd'] - R[i - 1]['trk_cmd']))) > math.radians(30))
    why = {}
    for r in R: why[r.get('trk_why')] = why.get(r.get('trk_why'), 0) + 1
    print(f"game {k}: {secs}s L {g['L_max']} rank {g.get('best_rank')} | +0.5s err p50 {pct(p50,.5)} p95 {pct(p50,.95)} (n {len(p50)}) | +0.25s err p50 {pct(p25,.5)} p95 {pct(p25,.95)} | heading err +0.25s p50 {pct(h25,.5)} p95 {pct(h25,.95)} deg"
          f" | frame heading err vs plan p50 {round(pct(herr,.5),1) if herr else None} p95 {round(pct(herr,.95),1) if herr else None} | cmd churn >30deg/tick {round(100*churn/max(1,len(R)),2)}% | angle pk/s {round(len(ang_pk)/secs,1)} boost pk {len(boost_pk)} | send->wang ms p50 {pct(lat,.5)} p95 {pct(lat,.95)} (n {len(lat)}/{len(ang_pk)}) | why {why}")
    # death window: last 0.6 s commands
    tail = [(round(r['t'], 2), r['mode'], r.get('trk_cmd'), r.get('cmd'), 'b' if r['boost'] else '-') for r in R[-18:]]
    print('   last 0.6 s (t, mode, sent deg, plan cmd deg, boost):', tail[::3])
