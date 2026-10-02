import collections, gzip, hashlib, json, statistics, sys
from pathlib import Path

run = Path(sys.argv[1])
summary = json.loads((run / 'summary.json').read_text())
rows = []
for item in summary['games']:
    k = item['game']
    rec = json.loads((run / f'slp_{k:02}.json').read_text())
    log = json.loads(gzip.decompress((run / f'slp_{k:02}_log.json.gz').read_bytes()))
    keys, data = log['keys'], log['log']
    trace = [dict(zip(keys, r)) for r in data]
    live = [json.loads(r) for r in (run / f'game_{k:02}_trace_live.jsonl').read_text().splitlines()]
    box = json.loads(gzip.decompress((run / f'slp_{k:02}_box.json.gz').read_bytes()))
    times = [r.get('t') for r in trace]
    elapsed = 0
    counts = collections.Counter()
    for a, b in zip(trace, trace[1:]):
        dt = max(0, min(.2, b['t'] - a['t']))
        elapsed += dt
        if (a.get('nh') or 0) >= 1:
            counts['near_head'] += dt
        if (a.get('nh') or 0) >= 3:
            counts['three_heads'] += dt
        if a.get('boost'):
            counts['boost'] += dt
    row = dict(item, full_log_ticks=len(trace), live_trace_ticks=len(live),
               box_frames=len(box['frames']), screenshots=len(list(run.glob(f'game_{k:02}_second_*.jpg'))),
               full_log_first_t=times[0] if times else None, full_log_last_t=times[-1] if times else None,
               trace_phase_ticks=dict(collections.Counter(r.get('t6_phase') for r in live)),
               observed_seconds=round(elapsed, 3),
               time_fraction={key: round(counts[key] / elapsed, 4) if elapsed else None for key in ['near_head', 'three_heads', 'boost']},
               last_decision=live[-1] if live else None, freezes=rec.get('freezes'), decide_ms=rec.get('decide_ms'),
               code_hashes_match=all(hashlib.sha256((run / 'code' / Path(p).name).read_bytes()).hexdigest() == h for p, h in summary['hashes'].items()))
    # Windows page clock and Linux runner clock diverged in direct paired reads.
    # Preserve browser durations, use runner elapsed for death and cap lower bounds.
    row['browser_seconds'] = rec['seconds']
    row['final_logged_L'] = trace[-1].get('L') if trace else None
    row['final_logged_t'] = trace[-1].get('t') if trace else None
    endpoint = run / f'game_{k:02}_end_detected.json'
    row['runner_duration_s'] = json.loads(endpoint.read_text())['elapsed_s'] if endpoint.exists() else 600 if item['capped'] else None
    row['duration_is_lower_bound'] = item['capped']
    row['parameter_changes'] = sum(any(key not in ['t', 'bot'] for key in change) for change in (rec.get('changes') or []))
    j = len(live) - 1
    while j > 0 and live[j - 1].get('t6_routes') == 0:
        j -= 1
    row['final_no_route_page_seconds'] = round(live[-1]['t'] - live[j]['t'], 3) if live and live[-1].get('t6_routes') == 0 else 0
    rows.append(row)
durations = [r['runner_duration_s'] for r in rows if not r['interrupted'] and r['runner_duration_s'] is not None]
result = dict(run=str(run), build=summary['build'], planned_games=summary['planned_games'],
              completed=summary.get('completed', False), median_s=statistics.median(durations) if durations else None,
              mean_s=statistics.mean(durations) if durations else None, max_s=max(durations) if durations else None,
              deaths=sum(r['end_reason'] == 'death' for r in rows), caps=sum(r['capped'] for r in rows),
              decision_errors=sum(r['errors'] or 0 for r in rows), page_errors=summary['page_errors'],
              median_is_lower_bound=bool(rows and sum(r['capped'] for r in rows) >= (len(rows) + 1) // 2),
              mean_is_lower_bound=any(r['capped'] for r in rows),
              project_code_unchanged=all(hashlib.sha256(Path(p).read_bytes()).hexdigest() == h for p, h in summary['hashes'].items()),
              games=rows, limits='Five-game fixed T6 observational cohort; caps are censored. No comparison arm or proved survival improvement. nh is heads within observation near range, not a body density measure.')
(run / 'analysis.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps({k: v for k, v in result.items() if k != 'games'}, ensure_ascii=False))
