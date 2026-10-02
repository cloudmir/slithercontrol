# V10 death cause: actuator input mismatch

{
  "build": "1001-10f3faa7",
  "run": "runs/v10_recovery_live_20261001_155641",
  "confirmed_implementation_mismatch": [
    "applyCmd records unquantized atan2(xm,ym) and input-write time in commandHistory",
    "Game client sends floor(251*angle/(2*pi)) on a >33ms send gate; packet timestamps are later",
    "v10Root replays commandHistory using fixed TRACK_LAT=.06; it does not consume logged outgoing packet time/bucket"
  ],
  "boundary_example": {
    "t": 104.335,
    "observed_heading": 4.727510130238209,
    "history_target": 1.5908844429633298,
    "history_time": 104.26480000001192,
    "packet_bucket": 63,
    "packet_time": 104.285,
    "bucket_angle": 1.5770544794912906,
    "history_shortest_turn": -3.1366256872748792,
    "bucket_shortest_turn": 3.132729656432668
  },
  "root_replay": {
    "t": 104.335,
    "ang": 4.727510130238209,
    "modelHistory": {
      "t": 104.26480000001192,
      "ang": 1.5908844429633298,
      "boost": true,
      "id": 2387
    },
    "packet": {
      "at": 104.285,
      "byte": 63,
      "angle": 1.5770544794912906
    },
    "predictedTurn": -0.2497862536269322,
    "actualAt": 104.398,
    "actualTurn": 0.29639419472684647,
    "positionError": 14.699718343012172,
    "rootSafe": true,
    "rootGap": 42.267059852830805
  },
  "fit": {
    "packets": {
      "train_frames": 40,
      "test_frames": 19,
      "best_train": {
        "lag": 0.05,
        "scale": 1,
        "mean": 2.639898503503985,
        "px": 7.441883812053213
      },
      "test_heading_mean_deg": 4.596528236899164,
      "test_position_mean_px": 7.521954609183644
    },
    "applied": {
      "train_frames": 40,
      "test_frames": 19,
      "best_train": {
        "lag": 0.06,
        "scale": 1,
        "mean": 3.088413072247122,
        "px": 7.230068651948395
      },
      "test_heading_mean_deg": 13.913923703089509,
      "test_position_mean_px": 10.915922536187226
    },
    "applied_quantized": {
      "train_frames": 40,
      "test_frames": 19,
      "best_train": {
        "lag": 0.06,
        "scale": 1,
        "mean": 2.835247801272135,
        "px": 7.2228519488531475
      },
      "test_heading_mean_deg": 14.81447548472363,
      "test_position_mean_px": 10.957910452103231
    }
  },
  "interpretation": "Confirmed actuator-input representation mismatch; highly sensitive near half-turn. Actual body approach and late emergency are observed. Contribution to death is supported by opposite turn during near-wall trajectory, but no proof of sole causation or counterfactual survival.",
  "limits": [
    "Bucket-to-angle decoding uses251 consistent with client encoding and best observed fits; server source unavailable",
    "Interpolated actual heading/position at104.398s; root diagnostic assumes previous computation3ms and no unrecorded inputAge",
    "Fit windows overlap and are from one game; numerical lag is response fit, not measured RTT",
    "Current target may change again; fixed-command earlier analysis did not isolate this",
    "No product code edits, new deployment or live game in cause analysis"
  ],
  "recommendation": [
    "Replay actual packet bucket and send timestamps for pending commands",
    "Quantize candidate controls before physical simulation",
    "Account for next outgoing send slot and latency variation",
    "Protect near-half-turn direction consistency; reject paths whose margin is smaller than measured tracking uncertainty"
  ]
}
## ext/mod.js
618: const commandHistory = [];
619: const bucketOf = a => { let b = a % (2 * Math.PI); if (b < 0) b += 2 * Math.PI; return Math.floor(251 * b / (2 * Math.PI)); };
620: function applyCmd(ang, boost, why) {   // xm/ym only when the bucket changes (the game skips equal buckets anyway); boost via wmd
621:   const b = bucketOf(ang), cur = (window.xm || window.ym) ? bucketOf(Math.atan2(window.ym, window.xm)) : -1;   // the game's real value (a mouse move over the panel can overwrite it)
622:   if (b !== sent.bucket || cur !== b) { window.xm = Math.cos(ang) * 250; window.ym = Math.sin(ang) * 250; sent.bucket = b; sent.at = performance.now(); }
623:   sent.ang = ang; sent.why = why;
624:   const want = boost ? 1 : 0, s = window.slither, real = s && s.wmd ? 1 : 0;   // compare with the real wanted mode, not our memory (bot off resets it)
625:   if (want !== real) window.setAcceleration(want);
626:   sent.boost = want;
627:   if ((S.values.V10_ON || S.values.V9_ON)) {
628:     const t = performance.now() / 1000, actual = Math.atan2(window.ym, window.xm), prev = commandHistory[commandHistory.length - 1];
629:     if (!prev) commandHistory.push({t: t - 2, ang: s ? s.ang : actual, boost: !!real});
630:     if (!prev || prev.ang !== actual || prev.boost !== !!want) commandHistory.push({t, ang: actual, boost: !!want, id:activeDecisionId});
631:     while (commandHistory.length > 1 && commandHistory[1].t < t - 2) commandHistory.shift();
632:   } else commandHistory.length = 0;
633: }
634: function planAt(tt) {                  // interpolated [x, y, h, b] on the plan at time tt (clamped to its ends)
635:   const P = plan.pts, n = plan.n; let i = 0; while (i + 1 < n && P[5 * (i + 1)] < tt) i++;
636:   if (i + 1 >= n) { const k = 5 * (n - 1); return [P[k + 1], P[k + 2], P[k + 3], P[k + 4]]; }

## ext/pilot.js
2413:   v10Root(s,W,ph){
2414:     const lag=Math.max(0,this.values.TRACK_LAT??.17),age=Math.max(0,s.inputAgeMs??0)/1000;
2415:     const until=lag+age+Math.min(.03,(this.v10ComputeMs??3)/1000),history=s.cmdHistory||[];
2416:     let st={x:s.x,y:s.y,h:s.ang,v:s.sp*PX_PER_SP},t=0,clear=Infinity,ok=true,hitAt=null;
2417:     const pts=[0,s.x,s.y,s.ang,s.boostNow?1:0];
2418:     while(t<until-1e-8){const stamp=s.t+t-lag;let active={ang:Number.isFinite(s.cmdNow)?s.cmdNow:s.ang,boost:!!s.boostNow};
2419:       if(history.length){active=history[0];for(const q of history){if(q.t>stamp+1e-8)break;active=q;}}
2420:       const next=history.find(q=>q.t>stamp+1e-8),dt=Math.min(.04,until-t,next?next.t-stamp:Infinity);
2421:       const nextSt=this.v4Adv(st,active.ang,!!active.boost,dt,ph);
2422:       const pad=Math.max(st.v,nextSt.v)*dt*Math.abs(wrap(nextSt.h-st.h))/8+.15;
2423:       const gap=W.check(st,nextSt,t,t+dt,pad);clear=Math.min(clear,gap);
2424:       if(gap<0){ok=false;hitAt??=t;}
2425:       // Commands already sent cannot be replaced before their arrival time.
2426:       // Continue the kinematic prefix even if its collision prediction fails;
2427:       // retain that failure instead of pretending the new action starts early.
2428:       st=nextSt;t+=dt;pts.push(t,st.x,st.y,st.h,active.boost?1:0);
2429:     }return {ok,st,t,pts,clear,hitAt};

## research/game1107249518-current-20260929.js
219: fps>=32)if(wdfg>0){wdfg*=.987;wdfg-=.1;if(wdfg<=0)high_quality=true}tapkps+=apkps;tpkps+=pkps;apkps=0;pkps=0;rdps=0;rfps=0;rnps=0;rsps=0;reps=0;fps=0;lrd_mtm=timeObj.now()}if(slither!=null){if(slither.md!=slither.wmd&&ctm-last_accel_mtm>50){slither.md=slither.wmd;last_accel_mtm=ctm;if(protocol_version>=5){var ba=new Uint8Array(1);if(slither.md)ba[0]=253;else ba[0]=254;ws.send(ba)}else{var ba=new Uint8Array(2);ba[0]=109;ba[1]=slither.md?1:0;ws.send(ba)}}if(xm!=lsxm||ym!=lsym)want_e=true;slither.eang=
220: Math.atan2(ym,xm);if(want_e&&ctm-last_e_mtm>33){want_e=false;last_e_mtm=ctm;lsxm=xm;lsym=ym;d2=xm*xm+ym*ym;if(d2>256){ang=Math.atan2(ym,xm);slither.eang=ang}else ang=slither.wang;ang%=pi2;if(ang<0)ang+=pi2;if(protocol_version>=5){sang=Math.floor((250+1)*ang/pi2);if(sang!=lsang){lsang=sang;var ba=new Uint8Array(1);ba[0]=sang&255;lpstm=ctm;ws.send(ba.buffer)}}else{sang=Math.floor(16777215*ang/pi2);if(sang!=lsang){lsang=sang;var ba=new Uint8Array(1+3);ba[0]=101;ba[1]=sang>>16&255;ba[2]=sang>>8&255;ba[3]=
221: sang&255;lpstm=ctm;ws.send(ba.buffer)}}}}var mang,vang,tang,emang;if(!choosing_skin)for(var i=slithers.length-1;i>=0;i--){var o=slithers[i];mang=mamu*vfr*o.scang*o.spang;var csp=o.sp*vfr/4;if(csp>o.msl)csp=o.msl;if(!o.dead){if(o.tsp!=o.sp)if(o.tsp<o.sp){o.tsp+=(o.sp-o.tsp)*.1;o.tsp+=1E-4;if(o.tsp>o.sp)o.tsp=o.sp}else{o.tsp+=(o.sp-o.tsp)*.3;o.tsp-=1E-4;if(o.tsp<o.sp)o.tsp=o.sp}if(o.tsp>o.fsp)o.sfr+=(o.tsp-o.fsp)*vfr*.021;if(o.fltg>0){var k=vfrb;if(k>o.fltg)k=o.fltg;o.fltg-=k;for(qq=0;qq<k;qq++){o.fl=

## root_compare.json
[
  {
    "t": 103.904,
    "ang": 5.052132192324374,
    "modelHistory": {
      "t": 103.82769999998807,
      "ang": 0.1884108968798824,
      "boost": true,
      "id": 2378
    },
    "packet": {
      "at": 103.814,
      "byte": 5,
      "angle": 0.1251630539278802
    },
    "predictedTurn": 0.2497862536269313,
    "actualAt": 103.967,
    "actualTurn": 0.33112012442504213,
    "positionError": 5.461355719337633,
    "rootSafe": true,
    "rootGap": 128
  },
  {
    "t": 104.126,
    "ang": 4.972577598131795,
    "modelHistory": {
      "t": 104.01460000002383,
      "ang": -3.0279547531491287,
      "boost": true,
      "id": 2382
    },
    "packet": {
      "at": 104.022,
      "byte": 130,
      "angle": 3.254239402124885
    },
    "predictedTurn": -0.2497862536269322,
    "actualAt": 104.18900000000001,
    "actualTurn": -0.30692031425247457,
    "positionError": 11.926041765839058,
    "rootSafe": true,
    "rootGap": 113.84675443839525
  },
  {
    "t": 104.252,
    "ang": 4.468814022148878,
    "modelHistory": {
      "t": 104.14190000003576,
      "ang": 1.5264838002894725,
      "boost": true,
      "id": 2384
    },
    "packet": {
      "at": 104.198,
      "byte": 50,
      "angle": 1.251630539278802
    },
    "predictedTurn": 0.2061727807714524,
    "actualAt": 104.315,
    "actualTurn": 0.21138162292770876,
    "positionError": 4.523788391825567,
    "rootSafe": true,
    "rootGap": 65.57540392997552
  },
  {
    "t": 104.29,
    "ang": 4.621052538624568,
    "modelHistory": {
      "t": 104.19749999999999,
      "ang": 1.2540942483872006,
      "boost": true,
      "id": 2385
    },
    "packet": {
      "at": 104.198,
      "byte": 50,
      "angle": 1.251630539278802
    },
    "predictedTurn": 0.2497862536269322,
    "actualAt": 104.35300000000001,
    "actualTurn": 0.19064757704154545,
    "positionError": 5.244690037915451,
    "rootSafe": true,
    "rootGap": 48.37555787173605
  },
  {
    "t": 104.335,
    "ang": 4.727510130238209,
    "modelHistory": {
      "t": 104.26480000001192,
      "ang": 1.5908844429633298,
      "boost": true,
      "id": 2387
    },
    "packet": {
      "at": 104.285,
      "byte": 63,
      "angle": 1.5770544794912906
    },
    "predictedTurn": -0.2497862536269322,
    "actualAt": 104.398,
    "actualTurn": 0.29639419472684647,
    "positionError": 14.699718343012172,
    "rootSafe": true,
    "rootGap": 42.267059852830805
  }
]