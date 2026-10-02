from pathlib import Path
import json
p=Path('ext/pilot.js');s=p.read_text()
def method(name,nextname):return s[s.index('  '+name+'('):s.index('  '+nextname+'(')]
route=method('v10Route','v10Follow').replace('  v10Route(','  va1BuildRoute(')
a=route.index('    const goals=maze.guides.sort(');b=route.index('    goals.sort(',a)
route=route[:a]+'''    const goals=maze.guides.sort((a,b)=>{
      const value=g=>{const pts=[0,s.x,s.y,s.ang,0,2,...g.goal,s.ang,0],u=this.v10Utility(s,pts,foods,[]);
        return g.length-700*(this.values.VA1_FOOD_W??6)*(u.approachValue+(g.foodTarget?g.foodTarget.mass/(g.foodTarget.mass+80):0))
          -500*(this.values.VA1_CENTER_W??2)*u.centerValue-500*(this.values.VA1_CROWD_W??2)*u.crowdValue;};
      return value(a)-value(b);
    });
'''+route[b:]
follow=method('v10Follow','v10Root').replace('  v10Follow(','  va1Follow(').replace('let boost=this.v10DefaultBoost(s)||','let boost=this.v10DefaultBoost(s)&&Math.abs(wrap(angle-st.h))<.3&&distance>Math.max(90,R*s.sc*2)||')
new='''  // VA1 uses one food/escape objective. Nearby enemies never disable food.
  va1Core() {
    if(!this.va1Pilot){
      const q=this.va1Pilot=new Pilot(this.va1Values(),this.profile);
      q.v9FoodGoals=(s,enabled=true)=>this.va1Foods(s,enabled);
      q.v10Utility=(s,pts,foods,actions)=>this.va1Utility(s,pts,foods,actions);
      q.v10Compare=(a,b)=>this.va1Compare(a,b);
      q.v10Choose=(routes,id)=>this.va1Choose(routes,id);
      q.v10Follow=q.va1Follow;
      q.v111Local=(s,W,ph,root,canBoost)=>this.va1Local(q,s,W,ph,root,canBoost);
      // Near food pursues the pellet using feedback, then rejoins a validated exit.
      q.v10DefaultBoost=s=>!!(q.values.V10_ESCAPE_BOOST??1)&&s.L>=(q.values.V2_MINL??30)&&q.values.V10_BOOST_COST===0;
    }
    return this.va1Pilot;
  }
  va1Values() {return {...this.values,VA1_ON:0,V101_ON:0,V11_ON:0,V111_ON:0,V102_ON:0,V10_ON:1,
    V10_FOOD_W:this.values.VA1_FOOD_W??6,V10_MARGIN:this.values.VA1_GAP??1.5,V9_FOOD_R:this.values.VA1_FOOD_R??3000,
    V10_BOOST_COST:this.values.VA1_BOOST_COST??0,V9_REMAINS_MIN:12,V9_CENTER_W:this.values.VA1_CENTER_W??2};}
  va1Foods(s,enabled=true) {
    if(!enabled||(this.values.VA1_FOOD_W??6)<=0)return [];
    const bins=new Map(),cell=120,radius=this.values.VA1_FOOD_R??3000;
    for(let i=0;i<s.food.length;i+=3){const [x,y,m]=s.food.slice(i,i+3),d=hypot(x-s.x,y-s.y);
      if(![x,y,m].every(Number.isFinite)||m<=0||d>radius||d<R*s.sc*.6)continue;
      const key=Math.floor(x/cell)+','+Math.floor(y/cell),g=bins.get(key)||{mass:0,x,y,d};
      g.mass+=m*(m>=12?2:1);if(d<g.d){g.x=x;g.y=y;g.d=d;}bins.set(key,g);}
    const goals=[...bins.values()].map(g=>({...g,score:g.mass/(g.d+100)})).sort((a,b)=>b.score-a.score);
    const old=this.va1Target&&goals.find(g=>hypot(g.x-this.va1Target.x,g.y-this.va1Target.y)<120);
    if(old&&s.t-this.va1Target.since<1&&goals[0].score<old.score*1.35){goals.splice(goals.indexOf(old),1);goals.unshift(old);old.since=this.va1Target.since;}
    if(goals.length){goals[0].since??=s.t;this.va1Target=goals[0];}else this.va1Target=null;
    return goals;
  }
  va1Crowd(s,x,y) {
    const seen=new Map(),radius=900,target=Math.max(1,this.values.VA1_CROWD_TARGET??4);
    for(let i=0;i<s.heads.length;i+=5)seen.set(s.hid?.[i/5]??('h'+i),{x:s.heads[i],y:s.heads[i+1]});
    // Head outside the view: use the nearest observed body point once per snake.
    for(let i=0;i<s.segs.length;i+=5){const id=s.sid?.[i/5]??('b'+i);if(seen.has(id))continue;
      const a=s.segs,dx=a[i+2]-a[i],dy=a[i+3]-a[i+1],u=clip(((s.x-a[i])*dx+(s.y-a[i+1])*dy)/Math.max(1,dx*dx+dy*dy),0,1);
      const p={x:a[i]+u*dx,y:a[i+1]+u*dy};seen.set(id,p);}
    let count=0;for(const p of seen.values())count+=Math.exp(-((hypot(p.x-x,p.y-y)/radius)**2));
    return {count,value:Math.exp(-((count-target)/target)**2)};
  }
  va1Utility(s,pts,foods,actions=[]) {
    if(pts.length<5)return {centerValue:0,crowdValue:0,approachValue:0,boostCost:0};
    const n=pts.length-5,x=pts[n+1],y=pts[n+2],travel=hypot(x-s.x,y-s.y),scale=Math.max(200,travel);
    const radius=hypot(s.x-s.wall[0],s.y-s.wall[1]);
    const centerValue=clip((radius-hypot(x-s.wall[0],y-s.wall[1]))/scale,-1,1)*Math.min(1,radius/2000);
    const crowdValue=clip((this.va1Crowd(s,x,y).value-this.va1Crowd(s,s.x,s.y).value)*4,-1,1);
    let approachValue=0;for(const g of foods){const d=hypot(g.x-s.x,g.y-s.y);let left=d;
      for(let i=0;i<pts.length;i+=5)left=Math.min(left,hypot(g.x-pts[i+1],g.y-pts[i+2]));
      approachValue=Math.max(approachValue,clip((d-left)/Math.max(200,Math.min(600,d)),0,1)*g.mass/(g.mass+40));}
    return {centerValue,crowdValue,approachValue,boostCost:actions.reduce((n,a)=>n+(a.boost?Math.max(0,a.end-a.start):0),0)*(this.values.VA1_BOOST_COST??0)};
  }
  va1Compare(a,b) {
    const cost=q=>4*(q.closure?.risk??q.risk??0)-(this.values.VA1_FOOD_W??6)*((q.foodValue??0)+(q.approachValue??0))
      -.45*(this.values.VA1_CENTER_W??2)*(q.centerValue??0)-.6*(this.values.VA1_CROWD_W??2)*(q.crowdValue??0)+(q.boostCost??0);
    return cost(a)-cost(b)||(a.duration??0)-(b.duration??0);
  }
  va1Choose(routes,id) {
    routes.sort((a,b)=>this.va1Compare(a,b));const held=routes.find(q=>q.id===id),best=routes[0];
    if(!held||!best)return best;
    if((held.closure?.risk??0)>(this.values.V10_SWITCH_RISK??.75)){const safer=routes.find(q=>(q.closure?.risk??1)<held.closure.risk-.05);if(safer)return safer;}
    // Keep a safe heading unless a material food gain justifies changing it.
    return this.va1Compare(best,held)<-1&&this.va1Now-(this.va1Changed??-Infinity)>.6?(this.va1Changed=this.va1Now,best):held;
  }
  va1Local(q,s,W,ph,root,canBoost) {
    const foods=this.va1Foods(s).slice(0,4),heads=q.v10Blockers(s,W),horizon=this.values.V10_LOCAL_H??1.05;
    const targets=foods.map(g=>({angle:Math.atan2(g.y-root.st.y,g.x-root.st.x),food:g}));
    if(Number.isFinite(s.cmdNow))targets.push({angle:s.cmdNow});
    for(const offset of [0,-.25,.25,-.5,.5,-1,1,-1.5,1.5,-2,2,PI])targets.push({angle:root.st.h+offset});
    const safe=[];
    for(const target of targets)for(const boost of canBoost?[false,true]:[false]){
      // Tight turns cruise; accelerating expands the turn radius.
      if(boost&&Math.abs(wrap(target.angle-root.st.h))>.4)continue;
      let st=root.st,t=root.t,clear=root.clear,ok=root.ok,pts=[...root.pts];
      if(!ok)continue;
      while(t-root.t<horizon-1e-8){const angle=target.food?Math.atan2(target.food.y-st.y,target.food.x-st.x):target.angle;
        const near=target.food&&hypot(target.food.x-st.x,target.food.y-st.y)<Math.max(90,R*s.sc*2);
        const useBoost=boost&&!near&&Math.abs(wrap(angle-st.h))<.4;
        const r=q.v9Roll(s,W,ph,st,0,Math.min(.12,horizon-(t-root.t)),t,angle,useBoost);clear=Math.min(clear,r.clear);
        if(!r.ok){ok=false;break;}pts.push(...r.pts);st=r.st;t=r.t;
        if(target.food&&hypot(target.food.x-st.x,target.food.y-st.y)<R*s.sc+6){const tail=q.v9Roll(s,W,ph,st,0,.45,t,st.h,false);if(!tail.ok){ok=false;break;}pts.push(...tail.pts);clear=Math.min(clear,tail.clear);st=tail.st;t=tail.t;break;}}
      if(!ok)continue;
      const u=this.va1Utility(s,pts,foods,[{start:root.t,end:t,boost}]),foodValue=q.v10Pellets(s,pts,t),closure=q.v10Closure(pts,heads);
      safe.push({ok:true,st,t,pts:pts.slice(root.pts.length),clear,angle:target.angle,boost:boost&&!(target.food&&target.food.d<90),...u,foodValue,closure,recovery:false,evaluated:t-root.t});
    }
    safe.sort((a,b)=>this.va1Compare(a,b));
    if(safe.length){const best=safe[0];if((this.values.VA1_BOOST_COST??0)===0){const fast=safe.find(r=>r.boost&&Math.abs(wrap(r.angle-best.angle))<.1&&this.va1Compare(r,best)<.15);if(fast)return fast;}return best;}
    // All unsafe: continue all turn candidates uniformly, never mark them safe.
    return Pilot.prototype.v111Local.call(q,s,W,ph,root,canBoost);
  }
  va1Route(s,ver) {const q=this.va1Core();this.va1Now=s.t;return q.va1BuildRoute(s,ver);}
  va1Step(s) {const q=this.va1Core();this.va1Now=s.t;const result=q.v111Step(s);this.last=q.last;
    const c=this.va1Crowd(s,s.x,s.y),foods=this.va1Foods(s);
    Object.assign(this.last.trace,{va1_on:1,va1_food_mass:foods[0]?.mass??0,va1_crowd:c.count,va1_phase:q.last.trace.mode==='v10emergency'?'emergency':q.last.trace.v10_pellet_value>0||foods.length?'food':'centre'});
    this.prev=result[0];this.prevBoost=result[1];return result;
  }
'''
s=s.replace('  // V10-1 shares the exact V8-1 switch',new+route+follow+'  // V10-1 shares the exact V8-1 switch')
s=s.replace('  setParams(values, profile) {','  setParams(values, profile) { this.va1Target=null;this.va1Changed=null;')
s=s.replace('    for(const [key,avoid]','    if(this.va1Pilot)this.va1Pilot.setParams(this.va1Values(),this.profile);\n    for(const [key,avoid]',1)
s=s.replace('    if (this.values.V101_ON) return','    if (this.values.VA1_ON) return this.va1Step(s);\n    if (this.values.V101_ON) return',1)
p.write_text(s)
# Isolated preset. Other presets explicitly disable the new flag.
p=Path('params.json');d=json.loads(p.read_text());defaults={'VA1_ON':0,'VA1_FOOD_W':6,'VA1_FOOD_R':3000,'VA1_GAP':1.5,'VA1_CENTER_W':2,'VA1_CROWD_W':2,'VA1_CROWD_TARGET':4,'VA1_BOOST_COST':0}
d['defaults'].update(defaults)
for v in d['presets'].values():v['values']['VA1_ON']=0
v={**d['presets']['v10_layered']['values'],**defaults,'VA1_ON':1,'V10_ON':1,'V101_ON':0,'V11_ON':0,'V111_ON':0,'V102_ON':0,'V10_FOOD_W':6,'V10_MARGIN':1.5,'V9_FOOD_R':3000,'V10_OBS':3000,'V10_EDGE':1450,'V9_ROUTES':4,'V10_LOCAL_H':1.05,'V10_LOCAL_MS':16,'V10_BUDGET':90,'V10_BOOST_COST':0,'V10_HEAD_PAD':8,'V10_HEAD_UNCERT':1,'V9_CENTER_W':2}
d['presets']['va1']={'label':'VA1 · 먹이·정밀 탈출','profile':'aggressive','values':v}
items=[['VA1_ON','VA1 사용',0,1,1,'bool'],['VA1_FOOD_W','먹이 추종 강도',0,12,.5,'num'],['VA1_FOOD_R','먹이 탐색 반경',500,5000,100,'num'],['VA1_GAP','근접 통과 여유',0,20,.5,'num'],['VA1_CENTER_W','중앙 선호',0,8,.5,'num'],['VA1_CROWD_W','혼잡 지역 선호',0,8,.5,'num'],['VA1_CROWD_TARGET','주변 적 목표 수',1,12,1,'num'],['VA1_BOOST_COST','부스트 소모 비용',0,1,.05,'num']]
# Match the established item schema.
print('schema',d['ui'][0]['items'][0])
d['ui'].append({'label':'VA1 먹이·정밀 탈출','items':items})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
