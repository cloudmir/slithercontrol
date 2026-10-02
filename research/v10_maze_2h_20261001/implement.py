from pathlib import Path
p=Path('ext/pilot.js');s=p.read_text();a=s.index('  v10Route(s,ver)');b=s.index('  // Same feedback law',a)
methods=Path('research/v10_maze_2h_20261001/maze_methods.txt').read_text().replace('poinT(k)','point(k)').replace('    function point(k){return point(k);}\n','')
route='''  v10Choose(routes,heldId) {
    routes.sort((a,b)=>this.v10Compare(a,b));
    const held=routes.find(r=>r.id===heldId),threshold=this.values.V10_SWITCH_RISK??.75;
    if(held){const safer=routes.filter(r=>(r.closure?.risk??1)<(held.closure?.risk??1)-.08).sort((a,b)=>a.closure.risk-b.closure.risk);
      if((held.closure?.risk??1)<=threshold||!safer.length)return held;
      return safer[0];}
    return routes[0];
  }
  v10Route(s,ver) {
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const deadline=begin+(V.V10_BUDGET??90),edge=Math.min(Math.max(V.V10_EDGE??1450,(s.viewRadius??0)*.85),W.obs-150);
    const heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3),routes=[];let expanded=0,geometry=0;const failures={};
    const result=reason=>({algo:'v10',ver,t0:s.t,routes,certified:routes.some(r=>r.certified),reason,ms:performance.now()-begin,expanded,geometry,failures,map:{radius:W.obs,target:edge},walls:W.walls});
    if(!root.ok)return result('prefix_collision');
    const accept=(guide,id)=>{
      const r=this.v10Follow(s,PW,ph,root,guide,deadline);
      if(!r.ok){failures[r.reason]=(failures[r.reason]||0)+1;return false;}
      const closure=this.v10Closure(r.pts,heads),foodValue=this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods));
      routes.push({...guide,id,t0:s.t,geometryOnly:false,drivable:true,certified:closure.certified,closure,foodValue,...this.v10Utility(s,r.pts,foods,r.actions),pts:r.pts,actions:r.actions,clear:r.clear,duration:r.duration,length:r.travel,score:guide.score??0});return true;
    };
    const old=this.v10Committed;
    if(old&&s.t>=old.t0&&s.t-old.t0<2&&hypot(old.goal[0]-s.x,old.goal[1]-s.y)>180)accept(old,old.id);
    const maze=this.v10MazeGuides(s,W,root,edge,Math.min(deadline-25,begin+(V.V10_BUDGET??90)*.55));
    expanded=maze.expanded;geometry=maze.guides.length;
    // Independent exit sectors survive topology search; preferences rank only
    // routes that have actually been found, never eliminate search branches.
    const goals=maze.guides.sort((a,b)=>{
      const cost=g=>{const x=g.goal[0],y=g.goal[1];let food=0;for(const f of foods)food=Math.max(food,(hypot(f.x-s.x,f.y-s.y)-hypot(f.x-x,f.y-y))/Math.max(300,hypot(f.x-s.x,f.y-s.y)));
        return g.length-(V.V10_FOOD_W??2)*food*200-(V.V9_CENTER_W??2)*.05*(hypot(s.x-s.wall[0],s.y-s.wall[1])-hypot(x-s.wall[0],y-s.wall[1]));};return cost(a)-cost(b);});
    for(const g of goals){
      if(performance.now()>deadline-2)break;
      if(routes.some(r=>r.sector===g.sector))continue;
      if(!accept(g,`${ver}:${g.sector}`)&&performance.now()<deadline-4)accept({...g,lookScale:.4},`${ver}:${g.sector}`);
      if(routes.length>=Math.max(3,V.V9_ROUTES??3))break;
    }
    const picked=this.v10Choose(routes,old?.id);
    if(picked){routes.splice(routes.indexOf(picked),1);routes.unshift(picked);}this.v10Committed=picked||null;
    return result(routes.length?'maze_routes':maze.reason==='maze'?'no_drivable_route':maze.reason);
  }
'''
s=s[:a]+methods+route+s[b:]
s=s.replace("if(root.ok)for(const guide of source?.routes||[]){","const guides=[...(source?.routes||[])];if(this.v10Held&&!guides.some(g=>g.id===this.v10Held.id)&&s.t-this.v10Held.t0<2)guides.unshift(this.v10Held);\n    guides.sort((a,b)=>Number(b.id===this.v10RouteId)-Number(a.id===this.v10RouteId));\n    if(root.ok)for(const guide of guides){")
s=s.replace('valid.sort((a,b)=>this.v10Compare(a,b));const picked=valid[0];','const picked=this.v10Choose(valid,this.v10RouteId);if(picked){valid.splice(valid.indexOf(picked),1);valid.unshift(picked);this.v10Held={...picked,t0:s.t};}')
p.write_text(s)
