  v10Step(s) {
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const worldMs=performance.now()-begin,heads=this.v10Blockers(s,W);
    const source=s.route?.algo==='v10'&&s.t>=s.route.t0&&s.t-s.route.t0<(V.V10_ROUTE_AGE??.9)?s.route:null;
    const valid=[],flat=pts=>{const a=[];for(let i=0;i<pts.length;i+=5)a.push(pts[i+1],pts[i+2]);return a;};
    let reject=source?'invalid':'pending',checked=0;
    // Recheck full remaining probes in one model; the local layer cannot
    // silently substitute an unrelated food/centre objective for a valid route.
    const deadline=begin+Math.max(12,V.V10_LOCAL_MS??3);
    if(root.ok)for(const guide of source?.routes||[]){
      if(!guide.drivable)continue;
      if(hypot(guide.goal[0]-s.x,guide.goal[1]-s.y)<150){reject='completed';continue;}
      const r=this.v10Follow(s,PW,ph,root,guide,deadline);checked++;
      if(r.ok&&r.actions.length){const closure=this.v10Closure(r.pts,heads);valid.push({...guide,...r,closure,score:(guide.score??0)+(guide.id===this.v10RouteId?10:0)});}
      else reject=r.reason;
      if(performance.now()>deadline)break;
    }
    valid.sort((a,b)=>this.v10Compare(a,b));const picked=valid[0];let action,pts,clear,safe,mode;
    if(picked){action=picked.actions[0];pts=picked.pts;clear=picked.clear;safe=true;mode='v10route';this.v10RouteId=picked.id;}
    else {
      const options=[],horizon=Math.max(.6,V.V10_LOCAL_H??.9);
      const canBoost=s.L>=(V.V2_MINL??30)&&(V.V10_ESCAPE_BOOST??1);
      for(const offset of [0,-.5,.5,-1,1,-2,2,PI])for(const boost of canBoost?[false,true]:[false]){
        const angle=root.st.h+offset,r=this.v9Roll(s,W,ph,root.st,0,horizon,root.t,angle,boost);checked++;
        options.push({...r,angle,boost,score:r.t*1000+Math.min(100,r.clear)-Math.abs(offset)});
      }
      options.sort((a,b)=>Number(b.ok)-Number(a.ok)||b.score-a.score);const best=options[0];
      action={start:root.t,end:root.t+.13,target:best.angle,boost:best.boost};pts=[...root.pts,...best.pts];clear=best.clear;safe=root.ok&&best.ok;mode=safe?'v10replan':'v10emergency';
    }
    const ms=performance.now()-begin;this.v10ComputeMs=ms;
    const trace={mode,cmd:r1(deg(action.target)),boost:action.boost,n_safe:root.ok?valid.length:0,cause:source?.reason??'pending',v10_strategy:picked?'route':'replan',v10_local_ms:ms,v10_world_ms:worldMs,v10_budget_hit:ms>(V.V10_LOCAL_MS??3),v10_checked:checked,v10_clear:clear,v10_root_safe:root.ok,v10_map_ms:source?.ms??0,v10_map_age:source?s.t-source.t0:-1,v10_routes:valid.length,v10_geometry_only:0,v10_route_id:picked?.id??null,v10_continuation_s:picked?picked.duration-root.t:0,v10_closure_risk:picked?.closure.risk??null,v10_closure_slack:picked?.closure.slack??null,v10_closure_cert:picked?.closure.certified??false,v10_replan:picked?0:1,v10_reject:picked?null:reject,L:s.L,sc:s.sc};
    this.last={trace,mode,plan:pts,controls:[{...action,end:Math.min(action.end,action.start+.13)}],draw:{chosen:flat(pts),localPath:flat(pts.filter((_,i)=>pts[i-i%5]<=root.t+.6)),localUnsafe:!safe,v9At:s.t,v9Paths:valid.map(r=>flat(r.pts)),v10Closures:valid.map(r=>({risk:r.closure.risk,certified:r.closure.certified,slack:r.closure.slack})),v9Walls:W.walls,v9Reason:picked?'long_probe':'replan',mazePath:[],safe:[],near:[],gaps:[],goal:picked?.goal??null,ro:W.ro}};
    this.prev=action.target;this.prevBoost=action.boost;return [action.target,action.boost];
  }
