# V10-1 existing wrap avoidance integration — source and local verification

User request: V10-1 에 기존에 알고리즘을 찾아보면, 감김 회피 가 있는데 그것 찾아서 적용하고, 켜고 끌수 있도록해줘.

Implementation: V101_WRAP_ON default 1, isolated to plain V10-1. Home toggle 감김 회피. Original V1 food controller, V8-1, original V10, original collision/roll functions preserved. Original V1 24-sector detector and exit locks copied into independent state. Body surface within 500px; same enemy covers >=0.5, or rising >=0.4 and increases >=0.15 within ~1s. Existing WRAP_RAID and WF conditions reused, their prior values preserved. Longest free run selects an exit; behind boosting wrapper head when original WRAP_EXIT_TAIL is enabled. Different wrapper resets exit lock. Feed-to-avoid transition works independently of head-count/body-density crowd trigger. Clear state returns through original V8_CLEAR_S hold. OFF restores original V10-1 switch/control behavior; original V1 baseline already includes wrap handling and is retained. No circle/coil action added to V10.

Escape controller: separate clone of current V10 control loop, continuous collision checks unchanged. Valid routes/short candidates prefer exit alignment; exact exit-heading candidate added. Food and food detours ignored during escape, planner also receives no food; delayed prefix collision remains marked unsafe. Entering/exiting wrap invalidates stale route/plan. New trace columns record enable/active/enemy/coverage/angle.

Validation purpose: V10-1 wrap toggle must dispatch and choose checked escape commands while preserving original behavior off and food behavior outside wraps. Success criteria: no-crowd wrap triggers, toggle restores baseline, clear returns to food, safe synthetic exit chosen, blocked prefix remains unsafe, original functions/parameters unchanged.

Limits: local synthetic tests are not server survival evidence. Original sector midpoint approximation and prediction limitations remain. No new live games. Raw logs, models, prior source snapshots retained.

## manifest

```json

{
  "build": "1001-7123e2bd",
  "hashes": {
    "ext/pilot.js": "2a4c21ff79852c684fee149938acbe80cc8143338182b03e08047b01c1562605",
    "ext/mod.js": "33ec7a7570606034cb20795c9cb9574cd222b1448387055d70369527499bbbca",
    "ext/params.js": "f28c798c5d6e837dacc7016646429a8ffd087f93ef4ad2d220f8f158860983cb",
    "ext/manifest.json": "9cd080a246f30e00e129fb61042da989bc683515601985e586fbaac0c1f8246c",
    "params.json": "34c94b5007e7cac5853c08a6dcb60b7bc8f4083f0d29fa30599773d6ccd7ff99"
  },
  "before": {
    "ext/pilot.js": "abf8b50c4b41d95eecd88a3d4c0f91b309d5fc87c54cc0b0c3e4634fe90c3a16",
    "ext/mod.js": "19009c887e6637aeecbc713de611a331296a19a7f2a02bad93bc50b1d82210f9",
    "ext/params.js": "e7c50815ffcc5228a53b97176de6ac541f6f0c68b6ca69195224006373430e51",
    "ext/manifest.json": "1600aa0ed481b1e688f654d54b742338506cd2fe70a61df35d9bfc55e52d1c90",
    "params.json": "f35bba51f03edb79f19c0636c55970e9b96d5b8ffc1aa0733abf20082496778b"
  },
  "existingParameterValuesUnchanged": true
}


```

## check

```json

{
  "originalFunctionsUnchanged": 8,
  "detectorMatchesOriginal": true,
  "rising": true,
  "raid": true,
  "earlyThickWrap": true,
  "newEnemyResetsExit": true,
  "feedParityFrames": 12,
  "offParityFrames": 4,
  "wrapTriggersWithoutCrowd": true,
  "returnDelay": true,
  "safeExitAngle": 1.9634954084936211,
  "safeExitGap": 128,
  "foodIgnoredDuringEscape": true,
  "blockedPrefixRemainsUnsafe": true,
  "liveSurvivalTest": false
}

```

## mock

```json

{
  "workerWrapCommand": "v10replan",
  "coverage": 0.6666666666666666,
  "noCrowdTrigger": true,
  "uiToggleWorks": true,
  "offMode": "unwrap",
  "returnToFood": true,
  "togglePersisted": true,
  "onlyTwoVersionButtons": true,
  "V8SelectionPreserved": true,
  "errors": [],
  "scope": "local mock with real Workers; no live game"
}

```

## windows_applied

```json

{
  "applied": true,
  "version": "1001-7123e2bd",
  "existingSettingsPreserved": true,
  "activePreset": "v101_hybrid",
  "newPresetAvailable": true,
  "playing": false
}

```

## Detector and switch — exact source

```js

// V10-1 reuses the original V1 wrap detector, opening selection and locks.
// Isolated state: neither original V1 nor V8 histories are changed.
function v101Wrap(K, s, V) {
  const S=s.segs||[],sid=Array.from(s.sid||[]),ns=S.length/5,px=s.x,py=s.y,T=s.t,
    ro=R*s.sc,P=makeParams(V),H5=s.heads||[],nh=H5.length/5;
  const heads=[];for(let i=0;i<nh;i++){const h=Array.from(H5.slice(i*5,i*5+5));h.id=s.hid?.[i];if(hypot(h[0]-px,h[1]-py)<P.HEAD_R)heads.push(h);}
  const nearAll=Array.from({length:ns},(_,k)=>segDist(px,py,S,k)-S[k*5+4]);
  K.covHist ||= [];K.giantSince ||= new Map();
  for(const key of ['wrapTarget','giantTarget','escLock','escId'])if(K[key]===undefined)K[key]=null;
    // 2.d: bodies all around? Widest opening over 24 bearings within 1000 px.
    const occ = new Array(24).fill(1000), bin = new Array(ns);
    for (let k = 0; k < ns; k++) {
      const mx = (S[5 * k] + S[5 * k + 2]) / 2 - px, my = (S[5 * k + 1] + S[5 * k + 3]) / 2 - py;
      bin[k] = Math.trunc((Math.atan2(my, mx) + PI) / (2 * PI) * 24) % 24;
      occ[bin[k]] = Math.min(occ[bin[k]], Math.min(nearAll[k], 1000));
    }
    const enclosed = occ.filter(v => v < 400).length / 24;
    const wide = occ.map((v, k) => Math.min(Math.min(v, occ[(k + 23) % 24]), occ[(k + 1) % 24]));
    const esc = (argmax(wide) + .5) / 24 * 2 * PI - PI;
    // One snake covering >= half the bearings within 500 px is wrapping us: leave through the widest run it leaves open.
    let wrapCov = 0, wrapId = null, wrapEsc = null, wrapBins = null, raidHit = false, giantHit = false, giantIds = new Set(), wfHit = false, wrapHeadSp = 0;
    const covs = new Map();
    if (ns) {
      const past = (K.covHist.find(([t0]) => T - t0 <= 1) || [0, new Map()])[1];
      for (const i of uniqueSorted(sid.filter((_, k) => nearAll[k] < 500))) {
        const cov = new Array(24).fill(false);
        for (let k = 0; k < ns; k++) if (nearAll[k] < 500 && sid[k] === i) cov[bin[k]] = true;
        const mean = cov.filter(Boolean).length / 24;
        covs.set(i, mean);
        const rising = past.has(i) && mean >= .4 && mean - past.get(i) >= .15;
        // WRAP_RAID (2026-09-27): the wrapping snake's head boosting within 400 px starts the escape at cover 0.35
        const hh = P.WRAP_RAID ? heads.find(h => h.id === i) : null;
        const raiding = !!hh && mean >= .35 && hh[3] > 8 && hypot(hh[0] - px, hh[1] - py) < 400;
        // GIANT_ESCAPE (cycle 6): a snake >= GIANT_RATIO x our radius whose body covers >= GIANT_COV of the bearings and lies
        // within GIANT_D px, for GIANT_HOLD s, starts the escape whatever its head does (slow wraps: cover >= 0.4 ten
        // seconds before 7/12 deaths beside giants; 0.3 % of survived ticks)
        let giant = false, rr = 0, dmin = Infinity;
        for (let k = 0; k < ns; k++) if (sid[k] === i) { rr = S[5 * k + 4]; if (nearAll[k] < dmin) dmin = nearAll[k]; }
        // WF (user 2026-09-28): a snake at least WF_RATIO x our radius whose body already covers WF_COV of the bearings is
        // trying to wrap us -> leave through the open side now, before its head can get around (it cannot close a loop
        // on a target that keeps moving away from its body at its own speed)
        const wf = !!P.WF_ON && rr >= P.WF_RATIO * ro && mean >= P.WF_COV;
        if (P.GIANT_ON) {
          const cond = rr >= P.GIANT_RATIO * ro && mean >= P.GIANT_COV && dmin - ro <= P.GIANT_D;
          if (cond) { if (!K.giantSince.has(i)) K.giantSince.set(i, T); giantIds.add(i); } else K.giantSince.delete(i);
          giant = cond && T - K.giantSince.get(i) >= P.GIANT_HOLD;
        }
        if (mean > wrapCov && (mean >= .5 || rising || raiding || giant || wf)) {
          wrapCov = mean; wrapId = i; wrapBins = cov.slice(); raidHit = raiding; giantHit = giant; wfHit = wf;
          { const hh2 = heads.find(h => h.id === i); wrapHeadSp = hh2 ? hh2[3] : 0; }
          const am = cov.indexOf(true), free = [];
          for (let k = 0; k < 24; k++) if (!cov[(k + am) % 24]) free.push(k);
          if (!free.length) { wrapEsc = esc; continue; }
          let run = [free[0]], cur = [free[0]];
          for (let k = 1; k < free.length; k++) {
            if (free[k] - free[k - 1] !== 1) cur = [];
            cur.push(free[k]);
            if (cur.length > run.length) run = cur;
          }
          const angOf = run.map(b => ((b + am) % 24 + .5) / 24 * 2 * PI - PI);
          const hb = [], hbh = [], hbs = [];
          for (let m = 0; m < nh; m++) if (s.hid[m] === i) { hb.push(Math.atan2(H5[5 * m + 1] - py, H5[5 * m] - px)); hbh.push(H5[5 * m + 2]); hbs.push(H5[5 * m + 3]); }
          if (hb.length && angOf.length >= 3) {
            const inner = angOf.slice(1, -1);
            // WRAP_EXIT_TAIL: the opening behind the wrapping head (opposite its heading) closes last
            wrapEsc = P.WRAP_EXIT_TAIL && hbs[0] > 8 ? inner[argmax(inner.map(a => -Math.abs(wrap(a - (hbh[0] + PI)))))]
              : inner[argmax(inner.map(a => Math.abs(wrap(a - hb[0]))))];
          } else wrapEsc = angOf[angOf.length >> 1];
        }
      }
    }
    K.covHist = K.covHist.filter(([t0]) => T - t0 <= 1.2).concat([[T, covs]]);
    // WRAP_RAID target lock: the escape from snake X stays while X's head boosts within 400 px and its cover >= 0.2
    // (released 0.5 s after that stops), so a dip of the cover does not end it (cycle 1: exits ended at cover < 0.2).
    if (P.WRAP_RAID) {
      if (wrapEsc !== null) {
        if (K.wrapTarget !== null && K.wrapTarget.id !== wrapId) K.escLock = null;   // new wrapper: no stale exit
        K.wrapTarget = raidHit ? {id: wrapId, lastOk: T} : null;      // the lock only for raid-triggered escapes
      } else if (K.wrapTarget !== null) {
        const tg = K.wrapTarget, hh = heads.find(h => h.id === tg.id), m = covs.get(tg.id) || 0;
        if (hh && m >= .2 && hh[3] > 8 && hypot(hh[0] - px, hh[1] - py) < 400) tg.lastOk = T;
        if (T - tg.lastOk >= .5 || K.escLock === null) K.wrapTarget = null;
        else { wrapEsc = K.escLock[0]; wrapCov = Math.max(m, .25); wrapId = tg.id; }
      }
    } else K.wrapTarget = null;
    // GIANT_ESCAPE hold: the escape from giant X stays until its cover is below GIANT_OFF for GIANT_KEEP s or its body is gone
    if (P.GIANT_ON) {
      for (const i of [...K.giantSince.keys()]) if (!covs.has(i)) K.giantSince.delete(i);
      if (wrapEsc !== null && giantHit) {
        if (K.giantTarget === null || K.giantTarget.id !== wrapId) { K.giantTarget = {id: wrapId, low: null}; if (K.wrapTarget === null) K.escLock = null; }
        else K.giantTarget.low = null;
      } else if (K.giantTarget !== null) {
        const tg = K.giantTarget, m = covs.get(tg.id);
        if (m === undefined) K.giantTarget = null;
        else {
          tg.low = m < P.GIANT_OFF ? (tg.low === null ? T : tg.low) : null;
          if ((tg.low !== null && T - tg.low >= P.GIANT_KEEP) || K.escLock === null) K.giantTarget = null;
          else if (wrapEsc === null) { wrapEsc = K.escLock[0]; wrapCov = Math.max(m, .3); wrapId = tg.id; giantHit = true; }
        }
      }
    } else K.giantTarget = null;
    // Wrap data (cycle 1, user 2026-09-27): the snake covering most bearings within 500 px, and its widest open run.
    let covMax = 0, covId = null, covFree = 24;
    for (const [i, m] of covs) if (m > covMax) { covMax = m; covId = i; }
    if (covId !== null) {
      const cov = new Array(24).fill(false);
      for (let k = 0; k < ns; k++) if (nearAll[k] < 500 && sid[k] === covId) cov[bin[k]] = true;
      const am = cov.indexOf(true);
      let run = 0, cur = 0;
      for (let k = 1; k <= 24; k++) { cur = cov[(am + k) % 24] ? 0 : cur + 1; run = Math.max(run, cur); }
      covFree = run;
    }
    // The escape bearing is held 1.5 s (recomputed every tick it swung with the wrapper).
    if (P.GIANT_ON && wrapEsc !== null) {          // cycle 6 (Codex): a new wrapping snake must not inherit the old exit
      if (K.escId !== null && K.escId !== wrapId) K.escLock = null;   // (0928: the cover lookup threw during a hold)
      K.escId = wrapId;
    } else if (wrapEsc === null) K.escId = null;
    if (wrapEsc !== null && K.lastId !== undefined && K.lastId !== wrapId) K.escLock = null;
    if (wrapEsc === null) K.escLock = null;
    else if (K.escLock !== null && T < K.escLock[1]) wrapEsc = K.escLock[0];
    else K.escLock = [wrapEsc, T + 1.5];

  K.lastId=wrapId;
  return wrapEsc===null?null:{id:wrapId,coverage:wrapCov,angle:wrapEsc,bins:wrapBins,
    raid:raidHit,early:wfHit,headSpeed:wrapHeadSp};
}
function v101Choice(K,s,V,fallback) {
  const previous=K.phase,c=fallback();
  if(!V.V101_WRAP_ON||V.V11_ON||V.V102_ON||V.V111_ON){K.wrapState=null;K.wrapId=null;return c;}
  const e=v101Wrap(K.wrapState||(K.wrapState={}),s,V);
  const wrapChanged=(K.wrapId??null)!==(e?.id??null);K.wrapId=e?.id??null;
  if(e){K.phase='avoid';K.clearSince=null;}
  return {...c,phase:K.phase,switched:K.phase!==previous?1:0,reason:e?'wrap':c.reason,wrap:e,wrapChanged};
}



```

## Escape control — exact source

```js

  v101WrapStep(s) {
    const exit=s.wrapEscape.angle; s={...s,food:new Float64Array(0)};
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s,true),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const worldMs=performance.now()-begin,heads=this.v10Blockers(s,W),foods=this.v9FoodGoals(s,true).slice(0,3);
    const source=s.route?.algo==='v10'&&s.t>=s.route.t0&&s.t-s.route.t0<(V.V10_ROUTE_AGE??.9)?s.route:null;
    const valid=[],flat=pts=>{const a=[];for(let i=0;i<pts.length;i+=5)a.push(pts[i+1],pts[i+2]);return a;};
    let reject=source?'invalid':'pending',checked=0;
    const invalid=this.v10Invalid||(this.v10Invalid=new Map());for(const [key,t] of invalid)if(s.t-t>2)invalid.delete(key);
    // Recheck full remaining probes in one model; the local layer cannot
    // silently substitute an unrelated food/centre objective for a valid route.
    const deadline=begin+Math.max(12,V.V10_LOCAL_MS??12);
    const guides=[...(source?.routes||[])];if(this.v10Held&&!guides.some(g=>g.id===this.v10Held.id)&&s.t-this.v10Held.t0<2)guides.unshift(this.v10Held);
    guides.sort((a,b)=>Number(b.id===this.v10RouteId)-Number(a.id===this.v10RouteId));
    if(root.ok)for(const guide of guides){
      if(!guide.drivable)continue;
      const key=guide.id+':'+guide.t0;if(invalid.has(key))continue;
      if(hypot(guide.goal[0]-s.x,guide.goal[1]-s.y)<150){reject='completed';continue;}
      const r=this.v10Follow(s,PW,ph,root,guide,deadline,.9);checked++;
      if(r.ok&&r.actions.length){
        // Refresh the executed prefix; the planner independently revalidates
        // the full route. Preserve its suffix as a provisional long guide.
        const original=guide.pts||[],last=r.pts.length-5;let nearest=Infinity,idx=-1;
        for(let i=0;i<original.length;i+=5){const d=hypot(original[i+1]-r.pts[last+1],original[i+2]-r.pts[last+2]);if(d<nearest){nearest=d;idx=i;}}
        if(idx>=0){const shift=r.pts[last]-original[idx];for(let i=idx+5;i<original.length;i+=5)r.pts.push(original[i]+shift,...original.slice(i+1,i+5));}
        r.duration=r.pts.length?r.pts[r.pts.length-5]:r.duration;
        const closure=this.v10Closure(r.pts,heads);valid.push({...guide,...r,closure,foodValue:this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods)),...this.v10Utility(s,r.pts,foods,r.actions),score:(guide.score??0)+(guide.id===this.v10RouteId?10:0)});}
      else {reject=r.reason;if(r.reason==='collision')invalid.set(key,s.t);}
      if(performance.now()>deadline-(this.v10FeedTarget?3:0))break;
    }
    const heldBefore=valid.find(r=>r.id===this.v10RouteId);let picked=valid.slice().sort((a,b)=>Math.cos(b.actions[0].target-exit)-Math.cos(a.actions[0].target-exit)||a.closure.risk-b.closure.risk)[0];const selectionReason=!picked?'no_valid_route':picked.id===this.v10RouteId?'held':heldBefore?'risk_threshold':this.v10RouteId?(this.v10Held&&hypot(this.v10Held.goal[0]-s.x,this.v10Held.goal[1]-s.y)<150?'goal_reached':'held_unavailable'):'initial';if(picked){valid.splice(valid.indexOf(picked),1);valid.unshift(picked);this.v10Held=picked;}let action,pts,clear,safe,mode;
    if(picked){// Wrap escape keeps the checked route prefix and skips food detours.
      valid[0]=picked;action=picked.actions[0];pts=picked.feedPrefix||picked.pts;clear=picked.clear;safe=true;mode='v10route';this.v10RouteId=picked.id;}
    else {
      const options=[],horizon=Math.max(.6,V.V10_LOCAL_H??.9);
      const canBoost=s.L>=(V.V2_MINL??30)&&(V.V10_ESCAPE_BOOST??1)&&(this.v10DefaultBoost(s)||foods.length>0||heads.length>0);
      for(const offset of [wrap(exit-root.st.h),0,-.5,.5,-1,1,-2,2,PI])for(const boost of canBoost?[false,true]:[false]){
        const angle=root.st.h+offset,r=this.v9Roll(s,W,ph,root.st,0,horizon,root.t,angle,boost);checked++;
        const foodValue=r.ok?this.v10Pellets(s,[...root.pts,...r.pts],root.t+horizon):0;
        options.push({...r,angle,boost,score:r.t*1000+Math.min(100,r.clear)-Math.abs(offset)+(V.V10_FOOD_W??2)*200*foodValue-(boost?20:0)});
      }
      options.sort((a,b)=>Number(b.ok)-Number(a.ok)||(a.ok&&b.ok?Math.cos(b.angle-exit)-Math.cos(a.angle-exit):0)||(this.v10DefaultBoost(s)&&a.ok&&b.ok?Number(b.boost)-Number(a.boost):0)||b.score-a.score);const best=options[0];
      action={start:root.t,end:root.t+.13,target:best.angle,boost:best.boost};pts=[...root.pts,...best.pts];clear=best.clear;safe=root.ok&&best.ok;mode=safe?'v10replan':'v10emergency';
    }
    const ms=performance.now()-begin;this.v10ComputeMs=ms;
    const trace={mode,cmd:r1(deg(action.target)),boost:action.boost,n_safe:root.ok?valid.length:0,cause:source?.reason??'pending',v10_strategy:picked?'route':'replan',verified_s:picked?.partial ? .9 : 0,v10_local_ms:ms,v10_world_ms:worldMs,v10_budget_hit:ms>(deadline-begin),v10_checked:checked,v10_clear:clear,v10_root_safe:root.ok,v10_map_ms:source?.ms??0,v10_map_age:source?s.t-source.t0:-1,v10_routes:valid.length,v10_geometry_only:0,v10_route_id:picked?.id??null,v10_continuation_s:picked?picked.duration-root.t:0,v10_closure_risk:picked?.closure.risk??null,v10_closure_slack:picked?.closure.slack??null,v10_closure_cert:picked?.closure.certified??false,v10_food_risk:V.V10_FOOD_RISK??0,v10_food_value:picked?.foodValue??0,v10_pellet_value:picked?.feedValue??0,v10_selection_reason:'wrap_exit',v10_path_kind:picked?.kind??null,v10_replan:picked?0:1,v10_reject:picked?null:reject,L:s.L,sc:s.sc};
    this.last={trace,mode,selectedGuide:picked?Object.fromEntries(['id','t0','path','goal','length','kind','sector','lookScale','useBoost','score','foodTarget','entry'].map(k=>[k,picked[k]])):null,plan:pts,controls:[{...action,end:Math.min(action.end,action.start+.13)}],draw:{v9FoodPath:picked?.kind==='food_escape',chosen:flat(pts),localPath:flat(pts.filter((_,i)=>pts[i-i%5]<=root.t+.6)),localUnsafe:!safe,v9At:s.t,v9Paths:valid.map(r=>flat(r.pts)),v10Closures:valid.map(r=>({risk:r.closure.risk,certified:r.closure.certified,slack:r.closure.slack})),v9Walls:W.walls,v9Reason:picked?'long_probe':'replan',mazePath:[],safe:[],near:[],gaps:[],goal:picked?.goal??null,ro:W.ro}};
    this.prev=action.target;this.prevBoost=action.boost;return [action.target,action.boost];
  }



```

## Parent dispatch — exact source

```js

  v101Values(avoid) {
    return {...this.values, V101_ON:0,V11_ON:0,V102_ON:0,V111_ON:avoid?(this.values.V111_ON??0):0,V10_ON:avoid?1:0,V9_ON:0,V8_ON:0,V7_ON:0,V6_ON:0,V41_ON:0,V5_ON:0,V4_ON:0,V3_ON:0,V2_ON:0,PROBE_ON:0};
  }
  v101Step(s) {
    const K=this.v101||(this.v101={phase:'feed',clearSince:null});
    const fallback=()=>this.values.V11_ON?v11Choice(K,s,this.values):v8Choice(K,countHeads(s,this.values.V8_HEAD_R??450),s.t,this.values,
      this.values.V81_BODY_ON?bodyDensity(s,this.values.V81_BODY_R??450,this.values.V81_BODY_NEAR_W??2,this.values.V81_BODY_SELF_W??.1):0);
    const c=s.v8Control||v101Choice(K,s,this.values,()=>this.values.V102_ON?v102Choice(K,s,this.values,fallback):fallback());
    const key=c.phase==='avoid'?'v101Avoid':'v101Feed';
    if(!this[key])this[key]=new Pilot(this.v101Values(c.phase==='avoid'),this.profile);
    const child=this[key];TURN_FIX=!!child.values.TURN_FIX;
    if((c.switched||c.wrap?.id!==this.v101WrapId)&&c.phase==='avoid'){child.v10Held=null;child.v10Committed=null;child.v10Invalid=null;child.v10FeedTarget=null;}
    const state=c.phase==='avoid'?{...s,route:(c.switched||c.wrapChanged)?null:s.route,selectedGuide:(c.switched||c.wrapChanged)?null:s.selectedGuide}:{...s,route:null,selectedGuide:null,threat:null};
    const result=c.wrap?child.v101WrapStep({...state,wrapEscape:c.wrap}):child.step(state);this.v101WrapId=c.wrap?.id;this.last=child.last;
    Object.assign(this.last.trace,{v101_wrap_on:this.values.V101_WRAP_ON?1:0,v101_wrap_active:c.wrap?1:0,v101_wrap_id:c.wrap?.id??null,v101_wrap_cov:c.wrap?.coverage??0,v101_wrap_angle:c.wrap?.angle??null,v102_on:this.values.V102_ON?1:0,v102_food_mass:c.foodMass??null,v102_food_threshold:c.foodThreshold??null,v102_food_enabled:c.foodEnabled??0,v101_on:1,v11_on:this.values.V11_ON?1:0,v11_head_distance:Number.isFinite(c.headDistance)?c.headDistance:null,v11_body_gap:Number.isFinite(c.bodyGap)?c.bodyGap:null,v8_phase:c.phase,v8_heads:c.heads,v8_radius:c.radius,v8_threshold:c.threshold,v8_switched:c.switched,v81_on:this.values.V81_BODY_ON?1:0,v81_density:c.bodyDensity??0,v81_body_trigger:c.bodyTrigger??0,v81_reason:c.reason||''});
    this.prev=result[0];this.prevBoost=result[1];return result;
  }



```

## Browser switch — exact source

```js

    if(S.values.V101_ON&&S.values.V101_WRAP_ON&&!S.values.V11_ON&&!S.values.V102_ON&&!S.values.V111_ON){
      const segs=[],sid=[],heads=[],hid=[];
      for(const o of window.slithers){if(o===s||o.id===s.id||o.dead)continue;
        if(Number.isFinite(o.xx+o.yy)){heads.push(o.xx,o.yy,o.ang,o.sp,o.sc);hid.push(o.id);}
        let prev=null;
        for(const pt of [...(o.pts||[]),{xx:o.xx,yy:o.yy}]){
          if(pt.dying||!Number.isFinite(pt.xx+pt.yy)){prev=null;continue;}
          if(prev&&Math.min(prev.xx,pt.xx)-14.5*o.sc<=s.xx+500&&Math.max(prev.xx,pt.xx)+14.5*o.sc>=s.xx-500&&Math.min(prev.yy,pt.yy)-14.5*o.sc<=s.yy+500&&Math.max(prev.yy,pt.yy)+14.5*o.sc>=s.yy-500){segs.push(prev.xx,prev.yy,pt.xx,pt.yy,14.5*o.sc);sid.push(o.id);}prev=pt;
        }
      }
      // Baseline choice already ran; restore its prior phase for switch reporting.
      const prior=v8Control.switched?(v8Control.phase==='avoid'?'feed':'avoid'):v8Control.phase;
      v8Switch.phase=prior;
      v8Control=window.SlpPilot.v101Choice(v8Switch,{x:s.xx,y:s.yy,sc:s.sc,t:performance.now()/1000,segs,sid,heads,hid},S.values,()=>{v8Switch.phase=v8Control.phase;return v8Control;});
    }else v8Switch.wrapState=null;
    if (v8Control.switched || v8Control.wrapChanged) { route = null; if(S.values.V101_ON){plan=null;threat=null;threatVer++;} planVer++; planSentAt = 0; }
  }


```
