from pathlib import Path
import json
p=Path('ext/pilot.js');s=p.read_text()
s=s.replace('v9FoodGoals(s) {','v9FoodGoals(s, enabled = this.values.V9_FOOD_W ?? 2) {').replace('if (!(V.V9_FOOD_W ?? 2)) { this.v9FoodTarget', 'if (!enabled) { this.v9FoodTarget')
a=s.index('  v10Compare(a,b) {');b=s.index('  v10Route(s,ver)',a)
s=s[:a]+'''  // One policy for beam pruning, completed probes and current revalidation.
  // Risk and food value are bounded indices, not calibrated probabilities.
  v10FoodRewards(s,pts,foods,previous=[]) {
    return foods.map((g,k)=>{
      let best=previous[k]||0;
      for(let i=5;i<pts.length;i+=5){
        const ax=pts[i-4],ay=pts[i-3],dx=pts[i+1]-ax,dy=pts[i+2]-ay;
        const u=clip(((g.x-ax)*dx+(g.y-ay)*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);
        const gap=Math.max(0,hypot(g.x-ax-u*dx,g.y-ay-u*dy)-R*s.sc);
        const t=pts[i-5]+u*(pts[i]-pts[i-5]);
        best=Math.max(best,Math.exp(-gap/120)/(1+t/4));
      }
      return best;
    });
  }
  v10FoodValue(foods,rewards) {
    return Math.min(1,foods.reduce((sum,g,k)=>sum+(rewards[k]||0)*g.mass/(g.mass+80),0));
  }
  v10Compare(a,b) {
    const appetite=clip((this.values.V10_FOOD_RISK??0)/100,0,1);
    const risk=q=>q.closure?.risk??q.risk??0,food=q=>q.foodValue??0;
    // 0 preserves risk-first selection. Higher values accept extra risk only
    // in return for reachable food along the path; no food means no incentive.
    return (risk(a)-appetite*food(a))-(risk(b)-appetite*food(b))||
      Number(!!b.closure?.certified)-Number(!!a.closure?.certified)||risk(a)-risk(b)||
      (b.closure?.first??1e6)-(a.closure?.first??1e6)||food(b)-food(a)||b.score-a.score;
  }
''' +s[b:]
s=s.replace('heads=this.v10Blockers(s,W),food=this.v9FoodGoals(s)[0],routes=[]','heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3),food=foods[0],routes=[]')
s=s.replace('const closure=this.v10Closure(r.pts,heads);\n      routes.push', 'const closure=this.v10Closure(r.pts,heads),foodValue=this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods));\n      routes.push')
s=s.replace('certified:closure.certified,closure,pts:r.pts','certified:closure.certified,closure,foodValue,pts:r.pts')
s=s.replace('((V.V10_ESCAPE_BOOST??1)||(V.V9_BOOST_ON&&food?.mass>=(V.V9_BOOST_MIN_MASS??48)))','(V.V10_ESCAPE_BOOST??1)')
s=s.replace('family:0,boost:false,risk:0}', 'family:0,boost:false,risk:0,riskSum:0,riskWeight:0,foodRewards:[]}')
s=s.replace('        for(const angle of angles)for(const boost', '''        // Include food-directed controls in the same long-route search.
        for(let k=0;k<foods.length;k++)if((n.foodRewards?.[k]||0)<.2){const g=foods[k],a=Math.atan2(g.y-n.st.y,g.x-n.st.x);if(!angles.some(b=>Math.abs(wrap(a-b))<.05))angles.push(a);}
        for(const angle of angles)for(const boost''')
s=s.replace('const risk=n.risk+stage*clip((r.t+.1-close)/.6,0,1)/(1+r.t);\n          const gain=food?food.d-hypot(r.st.x-food.x,r.st.y-food.y):0;', '''const riskWeight=n.riskWeight+stage/(1+r.t),riskSum=n.riskSum+stage*clip((r.t+.1-close)/.6,0,1)/(1+r.t),risk=riskSum/riskWeight;
          const foodRewards=this.v10FoodRewards(s,[n.t,n.st.x,n.st.y,n.st.h,0,...r.pts],foods,n.foodRewards),foodValue=this.v10FoodValue(foods,foodRewards);''')
s=s.replace('distance-turn*12+gain*(V.V9_FOOD_W??2)*.08+', 'distance-turn*12+')
s=s.replace('turn,score,risk,boost,family:', 'turn,score,risk,riskSum,riskWeight,foodRewards,foodValue,boost,family:')
s=s.replace('next.sort((a,b)=>a.risk-b.risk||b.score-a.score)', 'next.sort((a,b)=>this.v10Compare(a,b))')
s=s.replace('complete.sort((a,b)=>a.risk-b.risk||b.score-a.score)', 'complete.sort((a,b)=>this.v10Compare(a,b))')
s=s.replace('const worldMs=performance.now()-begin,heads=this.v10Blockers(s,W);','const worldMs=performance.now()-begin,heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3);')
s=s.replace('const deadline=begin+Math.max(12,V.V10_LOCAL_MS??3);','const deadline=begin+12;')
s=s.replace('valid.push({...guide,...r,closure,score:', 'valid.push({...guide,...r,closure,foodValue:this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods)),score:')
s=s.replace('v10_budget_hit:ms>(V.V10_LOCAL_MS??3)','v10_budget_hit:ms>12')
s=s.replace('v10_closure_cert:picked?.closure.certified??false,','v10_closure_cert:picked?.closure.certified??false,v10_food_risk:V.V10_FOOD_RISK??0,v10_food_value:picked?.foodValue??0,')
p.write_text(s)
p=Path('params.json');d=json.loads(p.read_text());d['defaults']['V10_FOOD_RISK']=0
d['defaults'].pop('V10_LOCAL_MS',None)
for v in d['presets'].values():
 v['values'].pop('V10_LOCAL_MS',None)
 if v['values'].get('V10_ON'):v['values']['V10_FOOD_RISK']=0
for g in d['ui']:
 g['items']=[x for x in g['items'] if x[0]!='V10_LOCAL_MS']
 if g['group'].startswith('V10'):
  g['items'].insert(1,['V10_FOOD_RISK','먹이 위험 감수 · 0 안전 ↔ 100 적극',0,100,5,True])
  for it in g['items']:
   if it[0]=='V10_ESCAPE_BOOST':it[1]='부스트 허용'
   if it[0]=='V10_LOCAL_H':it[2]=.6
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=Path('ext/mod.js');s=p.read_text();s=s.replace("'v10_closure_cert','v10_observe_ms'", "'v10_closure_cert','v10_food_risk','v10_food_value','v10_observe_ms'")
s=s.replace('tr.v10_closure_cert,tr.v10_observe_ms','tr.v10_closure_cert,tr.v10_food_risk,tr.v10_food_value,tr.v10_observe_ms')
a=s.index("      ? [sw('V9_FOOD_W'",s.index('const rows = S.values.V10_ON'));b=s.index('\n',a)
s=s[:a]+'''      ? [sw('V10_FOOD_RISK','먹이 위험 감수','0 안전 우선 ↔ 100 적극 수집. 경로상 잔해 이득에 한해 차단 위험 감수. 사망 확률 % 아님'),sw('V9_FOOD_R','잔해 탐색 범위','현재 관측된 큰 먹이만 탐색'),sw('V9_CENTER_W','중앙 이동 가중치','잔해가 없을 때 중앙 접근'),sw('V10_ESCAPE_BOOST','부스트 허용','잔해 수집·탈출 경로 모두 가속 후보 검사'),sw('V10_OBS','지도 최소 반경','전체 화면 범위를 포함'),sw('V10_EDGE','지도 목표 거리','긴 경로의 전 구간 통과·차단 시간 비교'),sw('V10_MARGIN','몸통·벽 여유','표시 두께 기준 추가 여유'),sw('V10_HEAD_UNCERT','머리 예측 오차 배율','근접 머리 예측 여유'),sw('V10_LOCAL_H','근접 검사 시간','긴 경로가 없을 때 검사할 시간'),sw('V9_ROUTES','지도 후보 수','출구까지 주행 검증할 후보 수')]''' +s[b:]
# V10 tune panel shows only controls actually read by its pipeline; other modes
# retain their own sliders and saved settings.
s=s.replace('    for (const grp of DEF.ui) {', '''    const v10Shared=new Set(['V9_FOOD_R','V9_CENTER_W','V9_REMAINS_MIN','V9_HEAP_SIZE','V9_TARGET_HOLD','V9_ROUTES','V2_MINL','TRACK_LAT','TURN_FIX']);
    for (const originalGroup of DEF.ui) {
      const grp=S.values.V10_ON?{...originalGroup,items:originalGroup.items.filter(it=>it[0].startsWith('V10_')||v10Shared.has(it[0]))}:originalGroup;
      if(!grp.items.length)continue;''')
s=s.replace('DEF.ui.indexOf(grp)', 'DEF.ui.indexOf(originalGroup)')
p.write_text(s)
