from pathlib import Path
import json
p=Path('research/v10_escape_20261001');Path('ext/pilot.js').write_text((p/'pilot.js').read_text())
s=(p/'before/mod.js').read_text()
s=s.replace("'v10_reject','v10_observe_ms'","'v10_reject','v10_closure_risk','v10_closure_slack','v10_closure_cert','v10_observe_ms'")
s=s.replace('tr.v10_reject,tr.v10_observe_ms','tr.v10_reject,tr.v10_closure_risk,tr.v10_closure_slack,tr.v10_closure_cert,tr.v10_observe_ms')
s=s.replace('certified:route.certified,reason:route.reason,ms:route.ms,routes:route.routes?.map(({pts,actions,...q})=>q)', 'certified:route.certified,reason:route.reason,ms:route.ms,map:route.map,routes:route.routes?.map(({pts,...q})=>({...q,t0:q.t0-game.t0/1000}))')
s=s.replace('ctx.setLineDash(S.values.V10_ON ? [5,4] : i ? [5, 4] : []);', 'ctx.setLineDash(S.values.V10_ON ? (d.v10Closures?.[i]?.certified ? [] : [5,4]) : i ? [5, 4] : []);')
s=s.replace('`V10 · 주행 검증 경로 · 예측 ${Number(last?.trace?.v10_continuation_s||0).toFixed(1)}초`', '`V10 · 긴 경로 ${candidates.length}개 · ${Number(last?.trace?.v10_continuation_s||0).toFixed(1)}초 · ${last?.trace?.v10_closure_cert ? "관측 적 차단 불가(모델)" : "차단 위험지수 "+Number(last?.trace?.v10_closure_risk||0).toFixed(2)}`')
s=s.replace("sw('V10_TAIL_W','적 머리 반대쪽 선호','위협 머리 진행 반대 방향 가중'),",'')
s=s.replace("sw('V10_EDGE','지도 목표 거리','실제 회전·속도로 도달할 목표 거리')","sw('V10_EDGE','지도 목표 거리','긴 경로를 탐색할 관측 내 거리. 전 구간 통과·차단 시간을 비교')")
Path('ext/mod.js').write_text(s)
d=json.loads((p/'before/params.json').read_text())
for v in [d['defaults'],d['presets']['v10_layered']['values']]:
 for k in ['V10_CELL','V10_TAIL_W']:v.pop(k,None)
 v['V10_OBS']=3000;v['V10_EDGE']=2100
for group in d['ui']:
 group['items']=[a for a in group['items'] if a[0] not in ['V10_CELL','V10_TAIL_W']]
Path('params.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
