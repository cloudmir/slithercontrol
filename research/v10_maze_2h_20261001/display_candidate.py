from pathlib import Path
import json
p=Path('research/v10_maze_2h_20261001');s=Path('ext/mod.js').read_text()
s=s.replace('label=`RISK ${risk.toFixed(2)}`', 'label=`${i===0?"▶ ":""}#${i+1} RISK ${risk.toFixed(2)}`')
s=s.replace("'V10 · 주행 경로 재탐색'", "('V10 · '+(last?.trace?.v10_root_safe===false?'즉시 회피 중':last?.trace?.v10_reject==='collision'?'충돌 예상 · 경로 재탐색':last?.trace?.cause==='grid_disconnected'?'출구 연결을 찾는 중':last?.trace?.cause==='grid_budget'?'탐색 시간 부족 · 계속 재탐색':'회전 가능한 경로를 찾는 중'))")
(p/'mod_display_candidate.js').write_text(s)
s=Path('ext/pilot.js').read_text().replace('    for(const g of goals){\n      if(performance.now()>deadline-2)break;', '    for(const g of goals){\n      if(routes.length>=Math.max(1,Math.round(V.V9_ROUTES??3))||performance.now()>deadline-2)break;').replace('Math.max(3,V.V9_ROUTES??3)', 'Math.max(1,Math.round(V.V9_ROUTES??3))');(p/'pilot_count_candidate.js').write_text(s)
d=json.loads(Path('params.json').read_text())
for g in d['ui']:
 for item in g['items']:
  if isinstance(item,list) and item[0]=='TRACK_LAT':item[1]='명령→관측 회전 응답 지연 s'
(p/'params_display_candidate.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
