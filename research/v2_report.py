"""Per-game V2 summary: survival, death type (ab_report's), rank, growth, TTD stats, boost share, remains capture.
  python3 research/v2_report.py runs/v2live_*"""
import gzip, json, sys, glob, statistics as st, subprocess
for d in sys.argv[1:]:
    print(f'## {d}')
    print('| 판 | 시간(s) | L_max | 끝 | 순위(최고) | 접속자 | ttd 중앙 | v2esc 비율 | 부스트 | 큰 무더기 도달/전체 | 잔해 구간 L/분 | 판단 p95 ms |')
    print('|---|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|')
    for f in sorted(glob.glob(f'{d}/slp_*.json')):
        if f.endswith('_box.json') or f.endswith('_log.json'): continue
        rec = json.load(open(f)); k = f[-7:-5]
        try:
            L = json.load(gzip.open(f.replace('.json', '_log.json.gz'))); K = L['keys']; R = [dict(zip(K, r)) for r in L['log']]
        except Exception: R = []
        ttdh = [r.get('ttd') for r in R if r.get('ttd') is not None]
        esc = sum(1 for r in R if r['mode'] == 'v2esc') / max(1, len(R))
        boost = sum(1 for r in R if r['boost']) / max(1, len(R))
        big = miss = 0; cur = None; lasth = None; heap_t = heap_L = 0
        for i, r in enumerate(R):
            if i and r['goal'] >= 150: heap_t += r['t'] - R[i-1]['t']; heap_L += r['L'] - R[i-1]['L']
            if r['goal'] >= 150:
                if cur is None: cur = dict(L0=r['L'])
                cur['L1'] = r['L']; lasth = r['t']
            elif cur is not None and r['t'] - lasth > 1.5: big += 1; miss += cur['L1'] - cur['L0'] <= 0; cur = None
        if cur: big += 1; miss += cur['L1'] - cur['L0'] <= 0
        print(f"| {k} | {rec['seconds']} | {rec['L_max']} | {'상한' if rec.get('capped') else '사망'} | {rec.get('rank')}({rec.get('best_rank')}) | {rec.get('players')} | {st.median(ttdh) if ttdh else ''} | {esc:.2f} | {boost:.2f} | {big - miss}/{big} | {round(heap_L / heap_t * 60) if heap_t else ''} | {rec.get('decide_ms', {}).get('p95')} |")
    out = subprocess.run(['node', 'research/ab_report.mjs', d], capture_output=True, text=True).stdout
    print('\n```\n' + '\n'.join(out.splitlines()[:6]) + '\n```')
