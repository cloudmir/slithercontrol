# T5 전체 적 외곽선 표시·릴리즈 원본

User direct request: 이번에는 주변에 있는 모든 적들의 외곽선라인 (지금 주행라인으로 그리고 있는) 을 그리는 기능을 개발해서 릴리즈해줘 T5로

Scope: T4 follower retained; T5 adds two offset rails for all visible live enemies, including short and unselected enemies. The rails are head-centre guide lines, not literal sprite borders or certified safe paths. Offset = enemy radius + own radius + T4_GAP (currently user-selected -5px).

Windows existing MOD extension reloaded while idle, T5 selected, existing T4 tuning and bot state preserved; no game started. Build 1002-9011616e.

## Geometry and recorded replay output

```json
{
  "straight_offset": 29.5,
  "both_sides": true,
  "disconnected_no_bridge": true,
  "short_enemy_included": true,
  "invalid_degenerate_finite": true,
  "curve_offset_passed": true,
  "old_methods_preserved": 9,
  "recorded_command_matches": 20,
  "dense_enemies": 40,
  "dense_segments": 4000,
  "dense_rails": 80,
  "dense_geometry_average_ms": 26.454917399999978,
  "scope": "geometry display and replay command equivalence; no new live survival trial"
}
```


## Real local Chromium / Worker verification

```json
{
  "realWorkerT5": true,
  "bot_off_and_path_off_draw": true,
  "two_visible_live_enemies": 2,
  "rails": 4,
  "short_enemy_included": true,
  "dead_and_own_excluded": true,
  "line_width_px": 0.5,
  "display_toggle": true,
  "T4_and_V1_switch_off": true,
  "persisted": true,
  "page_errors": [],
  "display_geometry_ms": 0.19999998807907104
}
```


## Windows release before / after and production hashes

```json
{
  "before": {
    "version": "1002-317482f8",
    "bot": false,
    "playing": false,
    "values": {
      "LAT": 0.1,
      "HARD": 0,
      "SAFE": 10,
      "TIGHT": 5,
      "SAFE_HEADS": 18,
      "HARD_PHYS": 5,
      "CREDIT": 25,
      "THICK_OFF_THIN": 0,
      "THICK_OFF_MID": 0,
      "THICK_OFF_THICK": 0,
      "REACH": 700,
      "HEAD_R": 900,
      "HEAD_NEAR": 150,
      "REMAINS": 12,
      "FOOD_R": 3000,
      "EAT": 30,
      "W_FOOD": 2,
      "W_GOAL": 40,
      "BOOST_COST": 30,
      "W_RUN": 40,
      "BOOST_DWELL": 0.285,
      "W_OPEN": 0.05,
      "W_ESC": 0,
      "W_AWAY": 0,
      "W_CUT": 60,
      "W_TURN": 0.12,
      "SWITCH": 8,
      "W_WRAP": 100,
      "BIG_RATIO": 1.5,
      "W_BIG": 0,
      "W_PROG": 20,
      "W_WP": 40,
      "LOOP_STRAIGHT": 0.5,
      "W_CURL": 60,
      "CURL_ON": 0.25,
      "W_PAR": 0,
      "LONG_RATIO": 1.5,
      "W_CENTER": 40,
      "RIM": 0.5,
      "W_CROWD": 60,
      "CROWD_R": 700,
      "W_HUNT": 40,
      "W_THREAD": 40,
      "LONG_T": 3.8,
      "LONG_SAFE": 10,
      "SIDE_HOLD": 0.6,
      "CONFIRM": 2,
      "PEND_GAP": 0.1,
      "MAX_REL_DEG": 150,
      "CALM_RATE_DEG": 90,
      "COIL_ON": 0.9,
      "COIL_OFF": 0.5,
      "GAP_EXTRA": 120,
      "GAP_R": 450,
      "THREAD_TOL": 3,
      "W_CENTRE": 40,
      "SQUEEZE_ON": 1,
      "CORRIDOR_W": 160,
      "SQUEEZE_R": 500,
      "SQUEEZE_ANGLE": 60,
      "W_SQUEEZE": 40,
      "TURN_FIX": 1,
      "RAIDER_ON": 1,
      "SIZE_SAFE": 1,
      "SIZE_GATE": 1,
      "HEAD_RAYS": 1,
      "WRAP_RAID": 1,
      "WRAP_EXIT_TAIL": 1,
      "MODE_DWELL": 0.6,
      "BOOST_DANGER": 10,
      "HEAP_GATE": 1,
      "SIZE_PROFILE": 1,
      "SIZE_SC": 2.3,
      "RIVAL_R": 700,
      "GUARD_ON": 1,
      "GUARD_R": 900,
      "GUARD_T": 2.5,
      "GUARD_TTC": 1.2,
      "W_GUARD": 40,
      "GIANT_ON": 0,
      "GIANT_RATIO": 1.5,
      "GIANT_COV": 0.35,
      "GIANT_D": 250,
      "GIANT_HOLD": 0.7,
      "GIANT_OFF": 0.25,
      "GIANT_KEEP": 1.5,
      "PROBE_ON": 0,
      "PROBE_GAP0": 4,
      "PROBE_JUMP": -4,
      "PROBE_STEP": 1,
      "PROBE_FLOOR": -30,
      "PROBE_MIN_L": 0,
      "BOUND_CAL": 0,
      "BOUND_GAP": -5,
      "REMAINS_ONLY": 0,
      "WF_ON": 0,
      "WF_RATIO": 1,
      "WF_COV": 0.2,
      "WF_ANG": 50,
      "WF_BOOST_COV": 0.4,
      "NOWRAP_ON": 0,
      "NW_RATIO": 1,
      "NW_SPEED": 1,
      "NW_MARGIN": 0,
      "V2_ON": 0,
      "V2_H": 5,
      "V2_TOK": 2.5,
      "V2_MARGIN": 10,
      "V2_MINL": 80,
      "V2_HEAPW": 0.2,
      "V2_HEAPMIN": 60,
      "V2_BCOST": 60,
      "V2_HYST": 5,
      "V2_CONE": 120,
      "V2_TOKS": 5,
      "V2_WTTD": 8,
      "V2_WRAPCOV": 0.54,
      "V2_WRAPR": 1150,
      "V2_WRAPANG": 60,
      "V2_WRAPRATIO": 0,
      "V2_ARCMIN": 2,
      "V2_CHGR": 1000,
      "V2_WALLSHRINK": 1,
      "V2_STRAIGHT": 1,
      "V2_WRAP": 1,
      "V2_CHG": 0,
      "V2_BOOSTFREE": 0,
      "V2_REMAINS": 12,
      "V2_EXIT_ON": 0,
      "V2_EXIT_EDGE": 900,
      "V2_EXIT_SAMPLE": 4,
      "V2_EXIT_MIN_WIDTH": 32,
      "V2_EXIT_MIN_SLACK": 0.5,
      "V2_EXIT_WIDTH_W": 0.08,
      "V2_EXIT_SLACK_W": 8,
      "V2_EXIT_REFINE_TOP": 8,
      "V3_ON": 0,
      "V3_DT": 0.09,
      "V3_STEPS": 10,
      "V3_HC": 5,
      "V3_TOP": 12,
      "V3_BUDGET": 25,
      "V3_EDGE": 900,
      "V3_OBS": 1150,
      "V3_HEADPAD": 10,
      "V3_MIN_WIDTH": 32,
      "V3_MIN_SLACK": 0.5,
      "V3_CLOSE": 450,
      "V3_COMMIT_HOLD": 1,
      "V3_SHIELD": 8,
      "V3_BEAM1": 10,
      "V3_BEAM2": 40,
      "V3_BEAM3": 160,
      "V3_CMD_STEP": 2,
      "V3_SWITCH": 25,
      "TRACK_ON": 1,
      "TRACK_LOOK": 0.13,
      "TRACK_MIND": 15,
      "V3_RISKW": 40,
      "TRACK_MODE": 1,
      "TRACK_LAT": 0.17,
      "TRACK_KLAT": 0.6,
      "V4_ON": 0,
      "V4_CELL": 64,
      "V4_OBS": 1150,
      "V4_EDGE": 700,
      "V4_H": 6,
      "V4_MARGIN": 10,
      "V4_SAFETY": 0.3,
      "V4_HUG": 0.3,
      "V4_FOODW": 0.05,
      "V4_TIMEW": 1,
      "V4_HYST": 0.15,
      "V4_DIRS": 24,
      "V4_ARC": 1.5,
      "V4_MEM": 4,
      "V4_TURNW": 0.03,
      "V4_HEADR": 1300,
      "V4_PLAN_MS": 350,
      "V4_PLAN_BUDGET": 40,
      "V4_LOCAL_H": 0.9,
      "V4_ROUTE_AGE": 1,
      "V6_ON": 0,
      "V6_CELL": 48,
      "V6_OBS": 1400,
      "V6_EDGE": 1000,
      "V6_H": 8,
      "V6_MARGIN": 10,
      "V6_SAFETY": 0.3,
      "V6_CLEAR_W": 0.6,
      "V6_HEADR": 1300,
      "V6_PLAN_MS": 400,
      "V6_PLAN_BUDGET": 60,
      "V6_LOCAL_H": 1.1,
      "V6_ROUTE_AGE": 0.8,
      "V5_ON": 0,
      "V5_STAGE": 0.6,
      "V5_W_FOOD": 3,
      "V5_W_OPEN": 0.1,
      "V5_W_RISK": 4000,
      "V5_W_TURN": 0.5,
      "V5_W_BOOST": 8,
      "V5_W_STICK": 6,
      "V5_EATR": 30,
      "V5_REMAINSX": 4,
      "V5_HYST": 20,
      "V41_ON": 0,
      "V41_CELL": 48,
      "V41_OBS": 1150,
      "V41_EDGE": 700,
      "V41_H": 6,
      "V41_MARGIN": 10,
      "V41_SAFETY": 0.3,
      "V41_HUG": 0.3,
      "V41_FOODW": 0.05,
      "V41_TIMEW": 1,
      "V41_HYST": 0.15,
      "V41_CONE": 150,
      "V41_FIRST": 100,
      "V41_ASSUME_BOOST": 0,
      "V5_TG": 12,
      "V5_EXPLOREV": 10,
      "V6_FOOD_W": 1,
      "V6_REMAINS_MIN": 12,
      "V6_FOOD_R": 3000,
      "V6_HEAP_SIZE": 250,
      "V6_GOAL_W": 1.5,
      "V6_BOOST_W": 80,
      "V6_BOOST_MIN_MASS": 48,
      "V6_BOOST_MIN_DIST": 150,
      "V6_CENTER_W": 2,
      "V7_ON": 0,
      "V7_HEAD_R": 450,
      "V7_HEAD_N": 3,
      "V7_CLEAR_S": 1,
      "V8_ON": 0,
      "V8_HEAD_R": 450,
      "V8_HEAD_N": 3,
      "V8_CLEAR_S": 1,
      "V81_BODY_ON": 0,
      "V81_BODY_R": 450,
      "V81_BODY_PCT": 18,
      "V81_BODY_NEAR_W": 2,
      "V81_BODY_SELF_W": 0.1,
      "V9_ON": 0,
      "V9_OBS": 1200,
      "V9_EDGE": 900,
      "V9_H": 8,
      "V9_MARGIN": 5,
      "V9_ROUTES": 3,
      "V9_BUDGET": 100,
      "V9_PLAN_MS": 300,
      "V9_ROUTE_AGE": 0.65,
      "V9_HEAD_PAD": 20,
      "V9_FOOD_W": 2,
      "V9_FOOD_R": 3000,
      "V9_BOOST_ON": 1,
      "V9_CENTER_W": 2,
      "V9_REMAINS_MIN": 12,
      "V9_HEAP_SIZE": 160,
      "V9_BOOST_MIN_MASS": 48,
      "V9_BOOST_MIN_DIST": 180,
      "V9_TARGET_HOLD": 1.2,
      "V10_ON": 0,
      "V10_OBS": 3000,
      "V10_EDGE": 2100,
      "V10_MARGIN": 3,
      "V10_BUDGET": 90,
      "V10_ROUTE_AGE": 0.9,
      "V10_PLAN_MS": 300,
      "V10_ESCAPE_BOOST": 1,
      "V10_LOCAL_H": 0.9,
      "V10_HEAD_PAD": 12,
      "V10_HEAD_UNCERT": 1,
      "V10_FOOD_RISK": 0,
      "V10_FOOD_W": 2,
      "V10_SWITCH_RISK": 0.75,
      "V10_BOOST_COST": 0,
      "V101_ON": 0,
      "V11_ON": 0,
      "V11_HEAD_R": 250,
      "V11_BODY_GAP": 80,
      "V11_CLEAR_S": 1,
      "V102_ON": 0,
      "V102_FOOD_ON": 1,
      "V102_FOOD_MIN": 100,
      "V102_FOOD_R": 3000,
      "V102_HEAP_SIZE": 160,
      "V111_ON": 0,
      "V101_WRAP_ON": 1,
      "VA1_ON": 0,
      "VA1_FOOD_W": 6,
      "VA1_FOOD_R": 3000,
      "VA1_GAP": 1.5,
      "VA1_CENTER_W": 2,
      "VA1_CROWD_W": 2,
      "VA1_CROWD_TARGET": 4,
      "VA1_BOOST_COST": 0,
      "T1_ON": 0,
      "T1_BIN": 0,
      "T2_ON": 0,
      "T2_MIN_LEN": 600,
      "T2_GAP0": 6,
      "T3_ON": 0,
      "T3_MIN_LEN": 600,
      "T3_GAP0": 40,
      "T3_BIN": 0,
      "T3_SPEED": 0,
      "T4_ON": 1,
      "T4_GAP": -5,
      "T4_MIN_LEN": 600,
      "T4_BOOST": 1,
      "T4_APPROACH": 30,
      "HEAP_BOOST": 0
    },
    "preset": "t4_close"
  },
  "after": {
    "version": "1002-9011616e",
    "bot": false,
    "playing": false,
    "preset": "t5_contours",
    "T5_ON": 1,
    "T4_ON": 0,
    "T4_GAP": -5,
    "T4_MIN_LEN": 600,
    "T4_BOOST": 1,
    "T4_APPROACH": 30,
    "enemyContours": true
  },
  "applied": true,
  "new_game_started": false,
  "hashes": {
    "ext/pilot.js": "e34acd75677f7ce7c45f6ace362c53c10bdc55fcd37e168c15749af00a70c170",
    "ext/mod.js": "8032ab834616ecb98dbcbed761d9969a7a180dc4e968e35a6f5b55ec2e652336",
    "params.json": "600051ecb2599f48216110471a463294caba1270c783309e6c9d2aa5937dae7c",
    "ext/params.js": "9b81fcec1577d4f657b742fb04ec09a72825538ec3bd6443cb273c34683368ba",
    "ext/manifest.json": "d67700b2bd94c3fe920114fc2d8bb6dabb160ec5dc6ab61edfa8a027d04b1cba"
  }
}
```


## Exact production geometry

```javascript
function t5Contours(s, gap=-5) {
  const S=s.segs, ids=s.sid, ro=R*s.sc, groups=new Map(), result=[];
  for(let k=0;k<ids.length;k++){if(!groups.has(ids[k]))groups.set(ids[k],[]);groups.get(ids[k]).push(k);}
  for(const [id,keys]of groups){let points=[],cum=[];
    const flush=()=>{if(points.length<2){points=[];cum=[];return;}
      const end=cum[cum.length-1],at=a=>{a=clip(a,0,end);let lo=0,hi=points.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(cum[m]<=a)lo=m;else hi=m;}const u=(a-cum[lo])/(cum[hi]-cum[lo]||1),p=points[lo],q=points[hi];return [p[0]+u*(q[0]-p[0]),p[1]+u*(q[1]-p[1])];};
      const rails=[[],[]];for(let j=0;j<points.length;j++){const p=points[j],a=at(cum[j]-35),b=at(cum[j]+35),dx=b[0]-a[0],dy=b[1]-a[1],n=hypot(dx,dy);if(n<1e-7)continue;const D=Math.max(0,ro+p[2]+gap),nx=-dy/n,ny=dx/n;rails[0].push(p[0]+nx*D,p[1]+ny*D);rails[1].push(p[0]-nx*D,p[1]-ny*D);}
      for(let j=0;j<2;j++)if(rails[j].length>=4)result.push({id,side:j? -1:1,points:rails[j]});points=[];cum=[];
    };
    for(const k of keys){const [ax,ay,bx,by,r]=S.slice(k*5,k*5+5);if(!Number.isFinite(ax+ay+bx+by+r)||r<0){flush();continue;}if(hypot(bx-ax,by-ay)<1e-7)continue;
      const last=points[points.length-1];if(last&&hypot(ax-last[0],ay-last[1])>2)flush();
      if(!points.length){points.push([ax,ay,r]);cum.push(0);}const prev=points[points.length-1];points.push([bx,by,r]);cum.push(cum[cum.length-1]+hypot(bx-prev[0],by-prev[1]));
    }flush();
  }return result;
}

```


## Exact follower wrapper

```javascript
  t5Step(s) {
    const command=this.t4Step(s);this.last.trace.t5_on=1;return command;
  }


```


## Exact production display geometry

```javascript
function t5DisplayPaths(me, g, vx, vy, cx, cy) {
  const now=performance.now(),gap=S.values.T4_GAP??-5;
  if(now-t5Display.at<100&&t5Display.sc===me.sc&&t5Display.gap===gap)return t5Display.paths;
  const start=performance.now(),segs=[],sid=[],halfX=cx/Math.max(.02,g),halfY=cy/Math.max(.02,g);
  for(const o of window.slithers){if(o===me||o.id===me.id||o.dead)continue;const r=14.5*o.sc,margin=Math.max(0,14.5*me.sc+r+gap);let prev=null;
    for(let j=0;j<=(o.pts||[]).length;j++){const p=j<(o.pts||[]).length?o.pts[j]:o;if(p.dying||!Number.isFinite(p.xx+p.yy)){prev=null;continue;}
      if(prev&&Math.min(prev.xx,p.xx)-margin<=vx+halfX&&Math.max(prev.xx,p.xx)+margin>=vx-halfX&&Math.min(prev.yy,p.yy)-margin<=vy+halfY&&Math.max(prev.yy,p.yy)+margin>=vy-halfY){segs.push(prev.xx,prev.yy,p.xx,p.yy,r);sid.push(o.id);}prev=p;
    }
  }
  const paths=window.SlpPilot.t5Contours({segs,sid,sc:me.sc},gap);
  t5Display={at:now,paths,ms:performance.now()-start,sc:me.sc,gap};return paths;
}
```


## Exact overlay render

```javascript
      ctx.lineTo(ex + Math.cos(a + 2.5) * 10, ey + Math.sin(a + 2.5) * 10); ctx.lineTo(ex + Math.cos(a - 2.5) * 10, ey + Math.sin(a - 2.5) * 10); ctx.fill();
      ctx.fillText(`사망 ${Math.round(Math.hypot(S.death.x - me.xx, S.death.y - me.yy))}`, ex, ey - 14);
    }
  }
  if(window.playing&&!me.dead&&S.values.T5_ON&&S.show.enemyContours){
    ctx.save();ctx.lineWidth=OVERLAY_LINE_WIDTH;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash([]);
    const selected=S.bot?last?.trace?.t4_target:null;
    for(const p of t5DisplayPaths(me,g,vx,vy,cx,cy)){ctx.strokeStyle=p.id===selected?'#70ffbd':'#56d8ff';polyline(ctx,p.points,X,Y);}
    ctx.restore();
  }else if(t5Display.paths.length)t5Display={at:-Infinity,paths:[],ms:0,sc:null,gap:null};
  const d = last && game && S.bot ? last.draw : null;
  if (d) {
    if (last.trace.v8_phase && S.show.path) {
      ctx.font = 'bold 10.4px system-ui'; ctx.fillStyle = last.trace.v101_wrap_active?'감김 탈출':last.trace.v8_phase === 'avoid' ? '#ffb83d' : '#f6db52';
```


## Artifact paths

research/t5_contours_20261002/check.mjs, mock.py, release.py, preview.png, live_release.png. Prior source snapshot: before/.

Display refresh: 100ms cache; two 0.5-screen-pixel rails, cyan for other enemies and green for selected enemy. Works with bot OFF and predicted-path display OFF. Display toggle: 표시 → T5 적 외곽선. Dense geometry benchmark is synthetic local work time, not a live FPS result. No new live survival test.
