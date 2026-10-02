from pathlib import Path
import json
p=Path('ext/pilot.js');s=p.read_text().replace('Math.exp(-((count-target)/target)**2)','Math.exp(-(((count-target)/target)**2))')
s=s.replace('      q.v10Follow=q.va1Follow;','      q.v10Follow=q.va1Follow;\n      q.v10FeedPrefix=q.va1FeedPrefix;\n      q.v10World=q.v111World;')
a=s.index('    const seen=new Map(),radius=900',s.index('  va1Crowd('));b=s.index('    let count=0;',a)
s=s[:a]+'''    const radius=900,target=Math.max(1,this.values.VA1_CROWD_TARGET??4);
    if(this.va1CrowdState!==s){
      const seen=new Map(),headIds=new Set();
      for(let i=0;i<s.heads.length;i+=5){const id=s.hid?.[i/5]??('h'+i);headIds.add(id);seen.set(id,{x:s.heads[i],y:s.heads[i+1]});}
      // Count each snake once, using its head or nearest visible body point.
      for(let i=0;i<s.segs.length;i+=5){const id=s.sid?.[i/5]??('b'+i);if(headIds.has(id))continue;
        const a=s.segs,dx=a[i+2]-a[i],dy=a[i+3]-a[i+1],u=clip(((s.x-a[i])*dx+(s.y-a[i+1])*dy)/Math.max(1,dx*dx+dy*dy),0,1);
        const p={x:a[i]+u*dx,y:a[i+1]+u*dy};p.d=hypot(p.x-s.x,p.y-s.y);
        if(!seen.has(id)||p.d<seen.get(id).d)seen.set(id,p);}
      this.va1CrowdState=s;this.va1CrowdPoints=[...seen.values()];
    }
'''+s[b:]
s=s.replace('for(const p of seen.values())count+=','for(const p of this.va1CrowdPoints)count+=')
s=s.replace('let st=root.st,t=root.t,clear=root.clear,ok=root.ok,pts=[...root.pts];\n      if(!ok)continue;','let st=root.st,t=root.t,clear=root.clear,ok=root.ok,pts=[...root.pts],first=null;const actions=[];\n      if(!ok)continue;')
s=s.replace("while(t-root.t<horizon-1e-8){const angle=target.food?Math.atan2(target.food.y-st.y,target.food.x-st.x):target.angle;", "while(t-root.t<horizon-1e-8){const reached=target.food&&hypot(target.food.x-st.x,target.food.y-st.y)<R*s.sc+6;\n        const angle=target.food&&!reached?Math.atan2(target.food.y-st.y,target.food.x-st.x):reached?st.h:target.angle;")
s=s.replace('const useBoost=boost&&!near&&Math.abs(wrap(angle-st.h))<.4;','const useBoost=boost&&!near&&Math.abs(wrap(angle-st.h))<.4;\n        first??={angle,boost:useBoost};actions.push({start:t,end:t+Math.min(.12,horizon-(t-root.t)),boost:useBoost});')
s=s.replace('this.va1Utility(s,pts,foods,[{start:root.t,end:t,boost}])','this.va1Utility(s,pts,foods,actions)')
s=s.replace('angle:target.angle,boost:boost&&!(target.food&&target.food.d<90)','angle:first.angle,boost:first.boost')
# Pellet detours use cruise during tight turns and near the pellet, as in local control.
a=s.index('  v10FeedPrefix(');b=s.index('  v10Step(',a)
f=s[a:b].replace('  v10FeedPrefix(','  va1FeedPrefix(')
f=f.replace('let boost=this.v10DefaultBoost(s),r=', 'let boost=this.v10DefaultBoost(s)&&Math.abs(wrap(target-st.h))<.35&&hypot(g.x-st.x,g.y-st.y)>Math.max(90,R*s.sc*2),r=')
s=s.replace('  // V10-1 shares the exact',f+'  // V10-1 shares the exact')
p.write_text(s)
d=json.loads(Path('params.json').read_text());g=d['ui'][-1];g['group']=g.pop('label')
for it in g['items']:it[5]=True
Path('params.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=Path('ext/mod.js');s=p.read_text()
s=s.replace("name==='v81_density'||name==='v101_hybrid'","name==='v81_density'||name==='v101_hybrid'||name==='va1'")
s=s.replace("name === 'v10_layered')", "name === 'v10_layered' || name === 'va1')")
s=s.replace('if(S.values.V101_ON){v8Switch', 'if(S.values.V101_ON||S.values.VA1_ON){v8Switch')
s=s.replace("m.kind === 'v10' ? pilot.v10Route", "m.kind === 'va1' ? pilot.va1Route(m.s,m.ver) : m.kind === 'v10' ? pilot.v10Route")
s=s.replace("kind: v10Active() ? 'v10'", "kind: S.values.VA1_ON ? 'va1' : v10Active() ? 'v10'")
s=s.replace('Math.max(FOOD_RADIUS,S.values.V9_FOOD_R ?? 3000)', '(S.values.VA1_ON ? S.values.VA1_FOOD_R : Math.max(FOOD_RADIUS,S.values.V9_FOOD_R ?? 3000))')
s=s.replace("'v101_wrap_angle']", "'v101_wrap_angle','va1_on','va1_food_mass','va1_crowd','va1_phase']")
s=s.replace('tr.v101_wrap_angle]);','tr.v101_wrap_angle,tr.va1_on,tr.va1_food_mass,tr.va1_crowd,tr.va1_phase]);')
s=s.replace("    }}, el('span', {class: 'logo'}", "    }}, el('span', {class: 'logo'}")
s=s.replace("${(S.values.V10_ON || S.values.V9_ON) ?", "${S.values.VA1_ON ? 'VA1 · 먹이·정밀 탈출' : (S.values.V10_ON || S.values.V9_ON) ?")
s=s.replace("'V8-1과 같은 머리·몸통 조건: V1 먹이 추종 ↔ V10 회피'));", "'V8-1과 같은 머리·몸통 조건: V1 먹이 추종 ↔ V10 회피'),\n      btn('VA1', !!S.values.VA1_ON, () => applyPreset('va1'), '먹이·출구 동시 평가, 근접 정밀 제어, 중앙 혼잡 지역 선호'));")
s=s.replace('    const rows = S.values.V10_ON', '''    const rows = S.values.VA1_ON
      ? [sw('VA1_FOOD_W','먹이 추종 강도','일반 먹이와 잔해를 함께 추구. 큰 먹이 우대. 0이면 목표 추종 끔'),sw('VA1_FOOD_R','먹이 탐색 반경','관측 먹이 중 목표를 찾는 범위 (px)'),sw('VA1_GAP','근접 통과 여유','표시 두께에 더하는 여유 (px). 0은 무충돌 보장값 아님'),sw('VA1_CENTER_W','중앙 선호','안전 후보의 중앙 접근 가중치'),sw('VA1_CROWD_W','혼잡 지역 선호','주변 적 분포를 반영. 목표 밀도 주변을 선호'),sw('VA1_CROWD_TARGET','주변 적 목표 수','900px 거리 가중으로 계산한 적 수. 더 과밀하면 선호 감소'),sw('VA1_BOOST_COST','부스트 소모 비용','0 직선 부스트 기본. 급회전·먹이 근접·충돌 예상 때 감속'),sw('V10_ESCAPE_BOOST','부스트 허용','수집·탈출 가속 후보 검사'),sw('V10_SWITCH_RISK','경로 전환 RISK 임계','안전 경로 유지, 위험 임계 초과 시 낮은 위험으로 전환'),sw('V10_HEAD_UNCERT','머리 예측 오차 배율','상대 머리 움직임 불확실성 여유'),sw('V9_ROUTES','지도 후보 수','출구까지 주행 검증하는 후보 수')]
      : S.values.V10_ON''')
s=s.replace("  if(k==='V10_ON'||k==='V9_ON'", "  if(k!=='VA1_ON'&&v&&/^V(?:2|3|4|41|5|6|7|8|9|10|11|101|102|111)_ON$/.test(k))S.values.VA1_ON=0;\n  if(k==='VA1_ON'&&v){S.values.V10_ON=1;for(const key of ['V101_ON','V11_ON','V111_ON','V102_ON','V9_ON','V8_ON','V7_ON','V6_ON','V5_ON','V41_ON','V4_ON','V3_ON','V2_ON','PROBE_ON'])S.values[key]=0;plan=null;}\n  if(k==='V10_ON'||k==='V9_ON'")
s=s.replace('const grp=S.values.V10_ON?',"const grp=S.values.VA1_ON?{...originalGroup,items:originalGroup.items.filter(it=>it[0]!=='VA1_ON'&&(it[0].startsWith('VA1_')||['V10_ESCAPE_BOOST','V10_SWITCH_RISK','V10_HEAD_UNCERT','V10_HEAD_PAD','V10_OBS','V10_EDGE','V10_LOCAL_H','V10_LOCAL_MS','V10_BUDGET','V10_PLAN_MS','V10_ROUTE_AGE','V9_ROUTES','TRACK_LAT','V2_MINL','TURN_FIX'].includes(it[0])))}:S.values.V10_ON?")
# Hide VA1 controls outside VA1, and exclude mode toggles from tune.
s=s.replace("!/^V(?:2|3|4|41|5|6|7|8|9|10|11|101|102|111)_ON$/.test(it[0])", "!it[0].startsWith('VA1_')&&!/^V(?:2|3|4|41|5|6|7|8|9|10|11|101|102|111)_ON$/.test(it[0])")
s=s.replace('last: last && {ms:', 'last: last && {va1_on:last.trace.va1_on,va1_phase:last.trace.va1_phase,va1_food_mass:last.trace.va1_food_mass,va1_crowd:last.trace.va1_crowd,ms:')
p.write_text(s)
