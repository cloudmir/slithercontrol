# V10 emergency recovery implementation and local verification

{
  "build": "1001-8ef6d22b",
  "hashes": {
    "ext/pilot.js": "bea9863808b30b063dcd120c3d960c30c040b956d128fe93f244ad8eadeea5d0",
    "ext/mod.js": "30eca3628e7e428a73253210ed63039d5af4f61f24406ef314a2968b129765cf",
    "ext/params.js": "deaef2f101efaa2dac81acdb0f1a50d3f34cc7f184d3ea640bc2bba58282449d",
    "ext/manifest.json": "36109f886558c414120100244e276b448784558b181586cf5b39430d30633dd2",
    "params.json": "77ad8bf9d028df5ca682f8cefb7fef8058065600e6c7cbb4c7dffeabcb4cac78"
  },
  "scope": "V10 emergency recovery selection and diagnostic collision depth; no live game or browser reload",
  "pending": [
    "actual server collision calibration",
    "maze budget reliability beyond existing local regressions",
    "live food/boost comparison and matched A/B"
  ],
  "limits": [
    "Recovery remains unsafe even when diagnostic gap improves",
    "12ms additional recovery target checked between equal candidate rounds; one round can exceed it",
    "maximum recovery horizon .32 seconds; timing budget can shorten it",
    "Original recorded frames use fixed observations; continued survival unproven"
  ]
}

## check.json
{
  "checks": [
    "continuous_overlap_evaluation",
    "turn_recovery_beats_straight",
    "never_certified_safe",
    "wall_order_independent_depth",
    "safe_empty_command_unchanged",
    "last_death_changes_direction"
  ],
  "synthetic": {
    "straightDepth": 1.1929016431704498,
    "turnDepth": 0.2721630026023908
  },
  "replay": [
    {
      "t": 143.753,
      "before": [
        2.8255795113433337,
        false
      ],
      "after": [
        2.8255795113433337,
        false
      ],
      "mode": "v10emergency",
      "recovery": true,
      "depth": 0,
      "terminal": 13.051568692873834,
      "oldMs": 56.76382800000002,
      "ms": 76.030482
    },
    {
      "t": 143.838,
      "before": [
        3.171833059002075,
        false
      ],
      "after": [
        3.171833059002075,
        false
      ],
      "mode": "v10emergency",
      "recovery": true,
      "depth": 0,
      "terminal": 3.207053729844778,
      "oldMs": 27.845079999999996,
      "ms": 48.731183999999985
    },
    {
      "t": 143.936,
      "before": [
        3.5808793516514728,
        false
      ],
      "after": [
        3.0808793516514728,
        false
      ],
      "mode": "v10emergency",
      "recovery": true,
      "depth": 0.4665122433561599,
      "terminal": -7.733549760462149,
      "oldMs": 14.532656000000031,
      "ms": 33.017668000000015
    },
    {
      "t": 144.058,
      "before": [
        3.580879351651473,
        false
      ],
      "after": [
        3.080879351651473,
        false
      ],
      "mode": "v10emergency",
      "recovery": true,
      "depth": 1.1869136163808274,
      "terminal": -17.153430108125175,
      "oldMs": 12.39229400000005,
      "ms": 33.83675400000004
    },
    {
      "t": 144.143,
      "before": [
        3.580879351651473,
        false
      ],
      "after": [
        3.080879351651473,
        false
      ],
      "mode": "v10emergency",
      "recovery": true,
      "depth": 1.739003867484021,
      "terminal": -24.261491647244814,
      "oldMs": 19.378250999999977,
      "ms": 37.03343899999999
    },
    {
      "t": 144.239,
      "before": [
        3.580879351651473,
        false
      ],
      "after": [
        3.080879351651473,
        false
      ],
      "mode": "v10emergency",
      "recovery": true,
      "depth": 2.199776931720346,
      "terminal": -30.145645660710922,
      "oldMs": 12.507745999999997,
      "ms": 33.181025999999974
    },
    {
      "t": 144.338,
      "before": [
        3.580879351651473,
        false
      ],
      "after": [
        3.080879351651473,
        false
      ],
      "mode": "v10emergency",
      "recovery": true,
      "depth": 3.521326895634865,
      "terminal": -33.86282308228934,
      "oldMs": 15.276670999999965,
      "ms": 34.78551700000003
    }
  ],
  "limits": [
    "fixed observed world/model replay; actual survival unproven"
  ]
}

## boost_check.json
[
  {
    "name": "zero_empty",
    "boost": true
  },
  {
    "name": "unsafe_boost_falls_back",
    "boost": false
  },
  {
    "name": "positive_empty",
    "boost": false
  },
  {
    "name": "switch_off",
    "boost": false
  },
  {
    "name": "too_short",
    "boost": false
  }
]

## maze_check.json
[
  {
    "i": 0,
    "t": 10,
    "reason": "maze_routes",
    "ms": 47.170667,
    "routes": 3,
    "geometry": 8,
    "failures": {},
    "local": "v10route",
    "localms": 1.4429959999999937
  },
  {
    "i": 1,
    "t": 129.971,
    "reason": "maze_routes",
    "ms": 78.07474300000001,
    "routes": 2,
    "geometry": 2,
    "failures": {},
    "local": "v10route",
    "localms": 10.025722000000002
  },
  {
    "i": 2,
    "t": 139.997,
    "reason": "maze_routes",
    "ms": 72.99629100000001,
    "routes": 2,
    "geometry": 2,
    "failures": {},
    "local": "v10route",
    "localms": 7.492171999999982
  },
  {
    "i": 3,
    "t": 150.017,
    "reason": "maze_routes",
    "ms": 69.85608400000001,
    "routes": 3,
    "geometry": 7,
    "failures": {},
    "local": "v10route",
    "localms": 5.032406000000037
  },
  {
    "i": 4,
    "t": 160.01,
    "reason": "maze_routes",
    "ms": 80.67319699999996,
    "routes": 1,
    "geometry": 2,
    "failures": {
      "collision": 2
    },
    "local": "v10route",
    "localms": 6.968636000000004
  },
  {
    "i": 5,
    "t": 170.014,
    "reason": "maze_routes",
    "ms": 69.56982799999997,
    "routes": 1,
    "geometry": 2,
    "failures": {
      "collision": 2
    },
    "local": "v10route",
    "localms": 4.625404000000003
  },
  {
    "i": 6,
    "t": 180.02,
    "reason": "maze_routes",
    "ms": 52.951437999999996,
    "routes": 1,
    "geometry": 1,
    "failures": {},
    "local": "v10route",
    "localms": 5.198740000000043
  }
]

## structural.json
{
  "retain_selected_below_threshold": {
    "pass": true
  },
  "switch_above_threshold": {
    "pass": true
  },
  "invalid_held_is_not_preserved": {
    "pass": true
  },
  "empty_world_multiple_routes": {
    "pass": true,
    "routes": 3,
    "ms": 48.10124499999999
  },
  "sketch_of_f73_open_four_sides_not_exact_replay": {
    "pass": true,
    "routes": 3,
    "ms": 63.703439999999986
  },
  "closed_ring_does_not_invent_escape": {
    "pass": true,
    "reason": "grid_disconnected"
  },
  "near_food_detour_rejoins_selected_route": {
    "pass": true,
    "food": 0.5292300399795056
  },
  "pellets_behind_wall_not_chased": {
    "pass": true
  },
  "planner_revalidates_actuator_selected_route": {
    "pass": true,
    "held": "11:0"
  },
  "repair_same_exit_when_distant_body_moves": {
    "pass": true,
    "routes": 3
  },
  "positive_cost_no_boost_without_food_or_near_threat": {
    "pass": true
  }
}

## Exact code diff
--- before/pilot.js
+++ ext/pilot.js
@@ -1764,17 +1764,17 @@
       const [x, y, h, sp, sc] = s.heads.slice(i, i + 5); if (![x, y, h, sp, sc].every(Number.isFinite)) continue;
       heads.push({x, y, vx: Math.cos(h) * sp * PX_PER_SP, vy: Math.sin(h) * sp * PX_PER_SP, r: R * sc});
     }
-    const check = (a, b, t0 = 0, t1 = t0, pad = 0, dynamic = true) => {
+    const check = (a, b, t0 = 0, t1 = t0, pad = 0, dynamic = true, exhaustive = false) => {
       let gap = Math.min(128, obs - Math.max(hypot(a.x - s.x, a.y - s.y), hypot(b.x - s.x, b.y - s.y)) - pad);
       gap = Math.min(gap, s.wall[2] - Math.max(hypot(a.x - s.wall[0], a.y - s.wall[1]), hypot(b.x - s.wall[0], b.y - s.wall[1])) - ro - margin - pad);
-      if (gap < 0) return gap;
+      if (gap < 0 && !exhaustive) return gap;
       const seen = new Set();
       for (let x = Math.floor((Math.min(a.x, b.x) - pad) / cell); x <= Math.floor((Math.max(a.x, b.x) + pad) / cell); x++)
         for (let y = Math.floor((Math.min(a.y, b.y) - pad) / cell); y <= Math.floor((Math.max(a.y, b.y) + pad) / cell); y++)
           for (const id of bins.get(x + ',' + y) || []) if (!seen.has(id)) {
             seen.add(id); const w = walls[id];
             gap = Math.min(gap, segmentD(a.x, a.y, b.x, b.y, w[0], w[1], w[2], w[3]) - w[4] - ro - margin - pad);
-            if (gap < 0) return gap;
+            if (gap < 0 && !exhaustive) return gap;
           }
       if (dynamic) for (const h of heads) {
         // Forecast only, not a guarantee of enemy intent. Rechecked every tick.
@@ -1783,7 +1783,7 @@
         gap = Math.min(gap, pointD(0, 0, ax, ay, bx, by) - ro - h.r - margin - pad - uncertainty);
         // The moving head leaves a new body wall behind it during this forecast.
         gap = Math.min(gap, segmentD(a.x, a.y, b.x, b.y, h.x, h.y, h.x + h.vx * t1, h.y + h.vy * t1) - ro - h.r - margin - pad - uncertainty);
-        if (gap < 0) return gap;
+        if (gap < 0 && !exhaustive) return gap;
       }
       return gap;
     };
@@ -2052,8 +2052,8 @@
       const tail=v*(t-turn),heading=h.h+w*turn;
       const p={x:h.x+Math.cos(a)*d+Math.cos(heading)*tail,y:h.y+Math.sin(a)*d+Math.sin(heading)*tail};h.cache.set(key,p);return p;
     };
-    W.check=(a,b,t0=0,t1=t0,pad=0,dynamic=true)=>{
-      let gap=staticCheck(a,b,t0,t1,pad,false);if(gap<0||!dynamic)return gap;
+    W.check=(a,b,t0=0,t1=t0,pad=0,dynamic=true,exhaustive=false)=>{
+      let gap=staticCheck(a,b,t0,t1,pad,false,exhaustive);if((gap<0&&!exhaustive)||!dynamic)return gap;
       for(const h of headList){
         if(hypot(a.x-h.x,a.y-h.y)>434*t1+W.ro+h.r+W.margin+pad+40+hypot(b.x-a.x,b.y-a.y))continue;
         for(const boost of [false,true]){
@@ -2061,7 +2061,7 @@
         // Cycle4 calibration p95 residuals, rounded upward. Only the near-term
         // command window uses this envelope; longer predictions remain provisional.
         const g=pointD(a.x-p.x,a.y-p.y,b.x-q.x,b.y-q.y)-W.ro-h.r-W.margin-pad-unc;
-        gap=Math.min(gap,g);if(gap<0)return gap;
+        gap=Math.min(gap,g);if(gap<0&&!exhaustive)return gap;
         // Newly laid body is occupied up to arrival time, never a permanent
         // whole-horizon cone. Approximate curved trail with short swept chords.
         for(let t=0;t<t1;t+=.2){const u=predict(h,t,boost),v=predict(h,Math.min(t+.2,t1),boost);
@@ -2071,7 +2071,7 @@
           let distance=Math.min(near(a),near(b),pointD(a.x-u.x,a.y-u.y,b.x-u.x,b.y-u.y),pointD(a.x-v.x,a.y-v.y,b.x-v.x,b.y-v.y));
           if(Math.abs(den)>1e-9){const rx=u.x-a.x,ry=u.y-a.y,ta=(rx*dy-ry*dx)/den,tb=(rx*ey-ry*ex)/den;if(ta>=0&&ta<=1&&tb>=0&&tb<=1)distance=0;}
           gap=Math.min(gap,distance-W.ro-h.r-W.margin-pad-unc-Math.max(h.v,434)*.2*Math.abs(h.w)*.2/8);
-          if(gap<0)return gap;
+          if(gap<0&&!exhaustive)return gap;
         }
       }}return gap;
     };
@@ -2490,6 +2490,27 @@
       best={...best,pts:full,feedPrefix:full,closure:this.v10Closure(full,feedHeads)};
     }
     return best;
+  }
+  // Diagnostic rollout only: a predicted collision never becomes a safe path.
+  // Evaluate beyond initial overlap to distinguish recovery from deeper intrusion.
+  v10Recovery(s,W,ph,root,angle,boost,horizon) {
+    let st={...root.st},t=root.t,clear=Infinity,depthArea=0,terminal=0,unsafeSeconds=0;
+    const pts=[];
+    while(t<root.t+horizon-1e-8){
+      const dt=Math.min(.04,root.t+horizon-t),next=this.v4Adv(st,angle,boost,dt,ph);
+      const pad=Math.max(st.v,next.v)*dt*Math.abs(wrap(next.h-st.h))/8+.15;
+      const gap=W.check(st,next,t,t+dt,pad,true,true);
+      clear=Math.min(clear,gap);terminal=gap;
+      depthArea+=Math.max(0,-gap)*dt/(1+4*(t-root.t));
+      if(gap<0)unsafeSeconds+=dt;
+      t+=dt;st=next;pts.push(t,st.x,st.y,st.h,boost?1:0);
+    }
+    return {ok:false,st,t,pts,clear,angle,boost,depthArea,terminal,unsafeSeconds};
+  }
+  v10RecoveryCompare(a,b) {
+    // Neither food nor a straight-heading bonus can override penetration cost.
+    return a.depthArea-b.depthArea || b.clear-a.clear || b.terminal-a.terminal ||
+      a.unsafeSeconds-b.unsafeSeconds || Number(a.boost)-Number(b.boost);
   }
   v10Step(s) {
     TURN_FIX=!!this.values.TURN_FIX;
@@ -2520,7 +2541,7 @@
       else {reject=r.reason;if(r.reason==='collision')invalid.set(key,s.t);}
       if(performance.now()>deadline-(this.v10FeedTarget?3:0))break;
     }
-    const heldBefore=valid.find(r=>r.id===this.v10RouteId);let picked=this.v10Choose(valid,this.v10RouteId);const selectionReason=!picked?'no_valid_route':picked.id===this.v10RouteId?'held':heldBefore?'risk_threshold':this.v10RouteId?(this.v10Held&&hypot(this.v10Held.goal[0]-s.x,this.v10Held.goal[1]-s.y)<150?'goal_reached':'held_unavailable'):'initial';if(picked){valid.splice(valid.indexOf(picked),1);valid.unshift(picked);this.v10Held=picked;}let action,pts,clear,safe,mode;
+    const heldBefore=valid.find(r=>r.id===this.v10RouteId);let picked=this.v10Choose(valid,this.v10RouteId);const selectionReason=!picked?'no_valid_route':picked.id===this.v10RouteId?'held':heldBefore?'risk_threshold':this.v10RouteId?(this.v10Held&&hypot(this.v10Held.goal[0]-s.x,this.v10Held.goal[1]-s.y)<150?'goal_reached':'held_unavailable'):'initial';if(picked){valid.splice(valid.indexOf(picked),1);valid.unshift(picked);this.v10Held=picked;}let action,pts,clear,safe,mode,recovery=null;
     if(picked){picked=this.v10FeedPrefix(s,PW,ph,root,picked,deadline);valid[0]=picked;action=picked.actions[0];pts=picked.feedPrefix||picked.pts;clear=picked.clear;safe=true;mode='v10route';this.v10RouteId=picked.id;}
     else {
       const options=[],horizon=Math.max(.6,V.V10_LOCAL_H??.9);
@@ -2530,11 +2551,31 @@
         const foodValue=r.ok?this.v10Pellets(s,[...root.pts,...r.pts],root.t+horizon):0;
         options.push({...r,angle,boost,score:r.t*1000+Math.min(100,r.clear)-Math.abs(offset)+(V.V10_FOOD_W??2)*200*foodValue-(boost?20:0)});
       }
-      options.sort((a,b)=>Number(b.ok)-Number(a.ok)||(this.v10DefaultBoost(s)&&a.ok&&b.ok?Number(b.boost)-Number(a.boost):0)||b.score-a.score);const best=options[0];
+      options.sort((a,b)=>Number(b.ok)-Number(a.ok)||(this.v10DefaultBoost(s)&&a.ok&&b.ok?Number(b.boost)-Number(a.boost):0)||b.score-a.score);let best=options[0];
+      if(!root.ok||!best.ok){
+        // Short recovery horizon bounds the expensive exhaustive collision pass.
+        // Cruise turns are compared symmetrically before boosting finalists.
+        const recoveryH=Math.min(horizon,.32),recoveryDeadline=performance.now()+12;
+        const recoveries=options.map(q=>({...q,st:{...root.st},t:root.t,pts:[],clear:Infinity,depthArea:0,terminal:0,unsafeSeconds:0,ok:false}));
+        // Advance every direction through the same time slice. A budget stop
+        // cannot favour whichever direction happened to be evaluated first.
+        let evaluated=0;
+        do {
+          const dt=Math.min(.04,recoveryH-evaluated);
+          for(const q of recoveries){
+            const r=this.v10Recovery(s,W,ph,{st:q.st,t:q.t},q.angle,q.boost,dt);
+            q.st=r.st;q.t=r.t;q.pts.push(...r.pts);q.clear=Math.min(q.clear,r.clear);
+            q.depthArea+=r.depthArea/(1+4*evaluated);q.terminal=r.terminal;q.unsafeSeconds+=r.unsafeSeconds;
+          }
+          evaluated+=dt;
+        } while(evaluated<recoveryH-1e-8&&performance.now()<recoveryDeadline);
+        recoveries.sort((a,b)=>this.v10RecoveryCompare(a,b));
+        recovery=best=recoveries[0];recovery.physicalGap=W.check(best.st,best.st,best.t,best.t,-W.margin,false,true);checked+=recoveries.length;
+      }
       action={start:root.t,end:root.t+.13,target:best.angle,boost:best.boost};pts=[...root.pts,...best.pts];clear=best.clear;safe=root.ok&&best.ok;mode=safe?'v10replan':'v10emergency';
     }
     const ms=performance.now()-begin;this.v10ComputeMs=ms;
-    const trace={mode,cmd:r1(deg(action.target)),boost:action.boost,n_safe:root.ok?valid.length:0,cause:source?.reason??'pending',v10_strategy:picked?'route':'replan',verified_s:picked?.partial ? .9 : 0,v10_local_ms:ms,v10_world_ms:worldMs,v10_budget_hit:ms>(deadline-begin),v10_checked:checked,v10_clear:clear,v10_root_safe:root.ok,v10_map_ms:source?.ms??0,v10_map_age:source?s.t-source.t0:-1,v10_routes:valid.length,v10_geometry_only:0,v10_route_id:picked?.id??null,v10_continuation_s:picked?picked.duration-root.t:0,v10_closure_risk:picked?.closure.risk??null,v10_closure_slack:picked?.closure.slack??null,v10_closure_cert:picked?.closure.certified??false,v10_food_risk:V.V10_FOOD_RISK??0,v10_food_value:picked?.foodValue??0,v10_pellet_value:picked?.feedValue??0,v10_selection_reason:selectionReason,v10_path_kind:picked?.kind??null,v10_replan:picked?0:1,v10_reject:picked?null:reject,L:s.L,sc:s.sc};
+    const trace={mode,cmd:r1(deg(action.target)),boost:action.boost,n_safe:root.ok?valid.length:0,cause:source?.reason??'pending',v10_strategy:picked?'route':'replan',verified_s:picked?.partial ? .9 : 0,v10_local_ms:ms,v10_world_ms:worldMs,v10_budget_hit:ms>(deadline-begin),v10_checked:checked,v10_clear:clear,v10_root_safe:root.ok,v10_recovery:!!recovery,v10_recovery_s:recovery?recovery.t-root.t:0,v10_recovery_depth:recovery?.depthArea??null,v10_recovery_terminal:recovery?.terminal??null,v10_recovery_body_gap:recovery?.physicalGap??null,v10_recovery_unsafe_s:recovery?.unsafeSeconds??null,v10_map_ms:source?.ms??0,v10_map_age:source?s.t-source.t0:-1,v10_routes:valid.length,v10_geometry_only:0,v10_route_id:picked?.id??null,v10_continuation_s:picked?picked.duration-root.t:0,v10_closure_risk:picked?.closure.risk??null,v10_closure_slack:picked?.closure.slack??null,v10_closure_cert:picked?.closure.certified??false,v10_food_risk:V.V10_FOOD_RISK??0,v10_food_value:picked?.foodValue??0,v10_pellet_value:picked?.feedValue??0,v10_selection_reason:selectionReason,v10_path_kind:picked?.kind??null,v10_replan:picked?0:1,v10_reject:picked?null:reject,L:s.L,sc:s.sc};
     this.last={trace,mode,selectedGuide:picked?Object.fromEntries(['id','t0','path','goal','length','kind','sector','lookScale','useBoost','score','foodTarget','entry'].map(k=>[k,picked[k]])):null,plan:pts,controls:[{...action,end:Math.min(action.end,action.start+.13)}],draw:{v9FoodPath:picked?.kind==='food_escape',chosen:flat(pts),localPath:flat(pts.filter((_,i)=>pts[i-i%5]<=root.t+.6)),localUnsafe:!safe,v9At:s.t,v9Paths:valid.map(r=>flat(r.pts)),v10Closures:valid.map(r=>({risk:r.closure.risk,certified:r.closure.certified,slack:r.closure.slack})),v9Walls:W.walls,v9Reason:picked?'long_probe':'replan',mazePath:[],safe:[],near:[],gaps:[],goal:picked?.goal??null,ro:W.ro}};
     this.prev=action.target;this.prevBoost=action.boost;return [action.target,action.boost];
   }
