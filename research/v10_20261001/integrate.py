from pathlib import Path
import json
p=Path('params.json');d=json.loads(p.read_text());new={'V10_ON':0,'V10_OBS':1800,'V10_EDGE':1450,'V10_CELL':24,'V10_MARGIN':3,'V10_BUDGET':90,'V10_ROUTE_AGE':.9,'V10_PLAN_MS':300,'V10_ESCAPE_BOOST':1,'V10_LOCAL_MS':3,'V10_LOCAL_H':.9,'V10_HEAD_PAD':12,'V10_TAIL_W':2}
d['defaults'].update(new)
for v in d['presets'].values():v['values']['V10_ON']=0
pv={**d['presets']['v9_maze']['values'],**new,'V10_ON':1,'V9_ON':0}
d['presets']['v10_layered']={'label':'V10 · 정밀 회피·지도·위협 감지','profile':'safe','values':pv}
d['ui'].insert(0,{'group':'V10 — 정밀 회피·지도·위협 감지','items':[
['V10_ON','V10 켜기',0,1,1,True],['V10_OBS','지도 관측 반경',800,3000,100,True],['V10_EDGE','지도 목표 거리',500,2600,100,True],['V10_MARGIN','몸통·벽 여유 px',0,30,1,True],['V10_ESCAPE_BOOST','탈출 부스트',0,1,1,True],['V10_TAIL_W','적 머리 반대쪽 선호',0,8,.5,True],['V10_HEAD_PAD','머리 예측 불확실성 px/s',0,50,2,True],['V10_LOCAL_H','근접 검사 시간 s',.5,1.5,.1,True],['V10_LOCAL_MS','근접 계산 목표 ms',1,12,.5,True],['V10_CELL','지도 격자 px',8,40,4,False],['V10_BUDGET','지도 계산 예산 ms',30,200,10,False],['V10_PLAN_MS','지도 갱신 간격 ms',150,800,50,False],['V10_ROUTE_AGE','지도 최대 나이 s',.3,1.2,.1,False]]})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=Path('ext/mod.js');s=p.read_text()
# Existing V9 overlay/observation/tracking infrastructure shared, independent logic selection.
s=s.replace('S.values.V9_ON','(S.values.V10_ON || S.values.V9_ON)')
# Repair assignment and distinguish algorithm switch predicates.
s=s.replace('(S.values.V10_ON || S.values.V9_ON) = 0','S.values.V9_ON = 0')
s=s.replace("name === 'v9_maze'", "name === 'v9_maze' || name === 'v10_layered'")
s=s.replace("if (m.type === 'plan')", "if (m.type === 'threat') { try { reply({type:'threat', ...pilot.v10Threat(m.s,m.ver)}); } catch(err) { reply({type:'threat',ver:m.ver,error:String(err)}); } return; }\n    if (m.type === 'plan')",1)
s=s.replace("m.kind === 'v9' ?", "m.kind === 'v10' ? pilot.v10Route(m.s, m.ver) : m.kind === 'v9' ?",1)
s=s.replace("r.algo === 'v9'", "(r.algo === 'v9' || r.algo === 'v10')",1)
s=s.replace('routes: r.routes, map: r.map','routes: r.routes, walls:r.walls, map: r.map',1)
needle='function send(m, transfer) {'
s=s.replace(needle,"""let threatWorker=null, threat=null, threatBusy=false, threatAt=0, threatVer=0;
try {
  const src=`(${window.slpPilotModule})(self);\\nconst handle=(${makeHandler})();\\nonmessage=e=>handle(e.data,r=>postMessage(r));`;
  threatWorker=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));
  threatWorker.onmessage=e=>{threatBusy=false;const r=e.data;if(!r.error&&r.ver===threatVer)threat=r;};
  threatWorker.onerror=()=>{threatWorker=null;threat=null;threatBusy=false;};
} catch(e) { threatWorker=null; }
"""+needle+"\n  if (m.type==='reset'||m.type==='params') { threat=null;threatVer++; if(threatWorker)threatWorker.postMessage(m); }")
s=s.replace('nine ? S.values.V9_OBS : 0','S.values.V10_ON ? S.values.V10_OBS : nine ? S.values.V9_OBS : 0')
s=s.replace('pending = {id: ++reqId, at: performance.now(), t: st.t};','''pending = {id: ++reqId, at: performance.now(), t: st.t};
  if(S.values.V10_ON){
    st.threat=threat;
    if(threatWorker&&!threatBusy&&performance.now()-threatAt>=100){threatBusy=true;threatAt=performance.now();threatVer++;
      threatWorker.postMessage({type:'threat',ver:threatVer,s:{...st,food:[],own:[],route:undefined}});
    }
  }''')
s=s.replace("every = v9 ?", "every = S.values.V10_ON ? (S.values.V10_PLAN_MS || 300) : v9 ?",1)
s=s.replace("kind: v9 ? 'v9'", "kind: S.values.V10_ON ? 'v10' : v9 ? 'v9'",1)
s=s.replace("if ((S.values.V10_ON || S.values.V9_ON) || k === 'V9_ON') plan = null;", "if (S.values.V10_ON || S.values.V9_ON || k === 'V9_ON' || k === 'V10_ON') plan = null;\n  if(k==='V10_ON'&&v) for(const key of ['V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON']) S.values[key]=0;\n  if(k==='V9_ON'||(v&&/^V(?:2|3|4|41|5|6|7|8)_ON$/.test(k))) S.values.V10_ON=0;")
s=s.replace("const action = plan.controls.find(a => a.end > when + 1e-8) || plan.controls[plan.controls.length - 1];", "const nextAction=plan.controls.find(a=>a.end>when+1e-8);\n    if(S.values.V10_ON&&!nextAction){applyCmd(s.ang,false,'v10_expired');plan=null;return;}\n    const action = nextAction || plan.controls[plan.controls.length - 1];")
s=s.replace("if (tau > plan.tEnd) { sent.why = 'plan_end'; return; }", "if (tau > plan.tEnd) { if(S.values.V10_ON){applyCmd(s.ang,false,'v10_expired');plan=null;} sent.why = 'plan_end'; return; }")
s=s.replace("? 'V9 · 다중 탈출'", "? (S.values.V10_ON ? 'V10 · 3층 회피' : 'V9 · 다중 탈출')",1)
s=s.replace("btn('V9', v9,", "btn('V10', !!S.values.V10_ON, () => applyPreset('v10_layered'), '근접 회피·장거리 지도·지속 위협 감지를 3개 Worker로 실행'),\n      btn('V9', v9 && !S.values.V10_ON,")
s=s.replace("const rows = v9\n", """const rows = S.values.V10_ON
      ? [sw('V9_FOOD_W','잔해 추종 가중치','작은 일반 먹이는 제외'),sw('V9_FOOD_R','잔해 탐색 범위','현재 관측된 큰 먹이만 탐색'),sw('V9_BOOST_ON','잔해 부스트','안전 후보 중 잔해 접근 부스트'),sw('V9_CENTER_W','중앙 이동 가중치','잔해가 없을 때 중앙 접근'),sw('V10_ESCAPE_BOOST','탈출 부스트','위험 상황에서 먹이 없이도 가속 후보 검사'),sw('V10_OBS','지도 관측 반경','현재 보이는 몸통 범위'),sw('V10_EDGE','지도 목표 거리','정적 통과 경로, 이동 중 재검사'),sw('V10_MARGIN','몸통·벽 여유','표시 두께 기준 추가 여유, 실측 사망점 확정값 아님'),sw('V10_TAIL_W','적 머리 반대쪽 선호','위협 머리 진행 반대 방향 가중'),sw('V10_LOCAL_H','근접 검사 시간','지연 후 실제 회전 원호 검사'),sw('V10_LOCAL_MS','근접 계산 목표 ms','검사 완료 후보만 사용. 실제 초과는 기록'),sw('V9_ROUTES','지도 후보 수','정적 몸통 벽 통과 안내선')]
      : v9
""")
s=s.replace("V9_OBS: 'v9Map'", "V10_OBS:'v9Map', V9_OBS: 'v9Map'")
s=s.replace("(w[4] + d.ro + S.values.V9_MARGIN)","(w[4] + d.ro + (S.values.V10_ON?S.values.V10_MARGIN:S.values.V9_MARGIN))")
s=s.replace('ctx.setLineDash(i ? [5, 4] : []); polyline(ctx, p, X, Y);','ctx.setLineDash(S.values.V10_ON ? [5,4] : i ? [5, 4] : []); polyline(ctx, p, X, Y);')
s=s.replace("ctx.fillText(candidates.length ? `V9", "ctx.fillText(S.values.V10_ON ? `V10 · 지도 후보 ${candidates.length}개 · 이동 중 재검사` : candidates.length ? `V9")
s=s.replace("!candidates.length && d.localPath?.length", "(S.values.V10_ON || !candidates.length) && d.localPath?.length")
s=s.replace("ctx.setLineDash([2, 4]); polyline(ctx, d.localPath", "ctx.setLineDash(S.values.V10_ON ? [] : [2, 4]); polyline(ctx, d.localPath")
p.write_text(s)
