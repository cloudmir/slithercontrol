from pathlib import Path
import json
p=Path('ext/pilot.js');s=p.read_text();a=s.index('  v10Compare(a,b)');b=s.index('  v10Route(s,ver)',a)
s=s[:a]+'''  v10Utility(s,pts,foods,actions=[]) {
    if(pts.length<5)return {centerValue:0,approachValue:0,boostCost:0};
    const end=pts.length-5,x=pts[end+1],y=pts[end+2];
    const radius=hypot(s.x-s.wall[0],s.y-s.wall[1]);
    const centerValue=clip((radius-hypot(x-s.wall[0],y-s.wall[1]))/1500,-1,1)*Math.min(1,radius/3000);
    // Progress towards distant heaps remains valuable before contact. It is
    // measured from the current observation, never accumulated by circling.
    let approachValue=0;
    for(const g of foods){const d=hypot(g.x-s.x,g.y-s.y),left=hypot(g.x-x,g.y-y);
      approachValue=Math.max(approachValue,clip((d-left)/Math.max(300,d),0,1)*g.mass/(g.mass+80));}
    const boostSeconds=actions.reduce((n,a)=>n+(a.boost?Math.max(0,a.end-a.start):0),0);
    return {centerValue,approachValue,boostCost:boostSeconds*.04};
  }
  v10Compare(a,b) {
    const V=this.values,appetite=clip((V.V10_FOOD_RISK??0)/100,0,1);
    const risk=q=>q.closure?.risk??q.risk??0;
    const cost=q=>(8-7*appetite)*risk(q)-(V.V10_FOOD_W??2)*((q.foodValue??0)+.45*(q.approachValue??0))
      -(V.V9_CENTER_W??2)*.08*(q.centerValue??0)+(q.boostCost??0);
    return cost(a)-cost(b)||risk(a)-risk(b)||Number(!!b.closure?.certified)-Number(!!a.closure?.certified)||b.score-a.score;
  }
''' +s[b:]
s=s.replace('closure,foodValue,pts:r.pts','closure,foodValue,...this.v10Utility(s,r.pts,foods,r.actions),pts:r.pts')
s=s.replace('(V.V10_FOOD_RISK??0)>0','(V.V10_FOOD_W??2)>0')
s=s.replace("const score=distance-turn*12+foodValue*edge*.8+(food?0:centerGain*(V.V9_CENTER_W??2)*.03);","const score=distance-turn*12;")
s=s.replace('next.push(q);','Object.assign(q,this.v10Utility(s,q.pts,foods,q.actions));next.push(q);')
s=s.replace('if(distance>=edge){complete.push(q);continue;}','Object.assign(q,this.v10Utility(s,q.pts,foods,q.actions));if(distance>=edge){complete.push(q);continue;}')
s=s.replace('foodValue:this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods)),score:','foodValue:this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods)),...this.v10Utility(s,r.pts,foods,r.actions),score:')
p.write_text(s)
p=Path('params.json');d=json.loads(p.read_text());d['defaults']['V10_FOOD_W']=2
for v in d['presets'].values():
 if v['values'].get('V10_ON'):v['values']['V10_FOOD_W']=2
for g in d['ui']:
 if g['group'].startswith('V10'):g['items'].insert(2,['V10_FOOD_W','먹이 추구 강도',0,5,.25,False])
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
p=Path('ext/mod.js');s=p.read_text().replace("? [sw('V10_FOOD_RISK'","? [sw('V10_FOOD_W','먹이 추구 강도','먼 잔해 접근과 경로상 섭취 이득. 높일수록 적극 추구'),sw('V10_FOOD_RISK'")
s=s.replace('잔해가 없을 때 중앙 접근','잔해 유무와 무관하게 중앙 복귀 이득 반영');p.write_text(s)
