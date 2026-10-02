# T4 fixed -5px experiment and rollback — original execution evidence

User original direct instruction: 내가 정해줄께, -5를 안전 오프셋으로 설정하고. 가장 딱 붙어서 따라가는 모델로 새로 만들어서 테스트를해봐
User target-selection steering: 대상 선정을 1000이상이면 그냥 가까운것을 선정하는것이 낫지 않을까? 그보다 긴 적이 나오면 그쪽으로 옮기고.
User latest direct instruction: 그냥 롤백하자.
Rollback scope communicated to user: 방금 바꾼 대상 선정 방식(1000px·더 긴 적으로 전환)을 되돌리고 테스트를 중지하겠습니다. T4의 −5px 설정은 유지하겠습니다.

The latest target-selection change was rolled back; its earlier implementation and test outcomes are historical, not adopted behavior. Restored build1002-317482f8 matches research/t4_fixed_20261002/revision1 exactly. T4 remains an independent fixed -5px follower, target minimum observed body length600px, nearest eligible connected target. User -5 is an experimental parameter choice and not verified universal safety. Old T3 source methods were preserved, but its continuous live supervisor was stopped for the new explicitly requested model/test. Neither live collector was restarted after rollback.

Raw runs: runs/t4_20261002_121802 (old restored build: 3 deaths, 1 user-stop record, interrupted for selection steering); runs/t4_20261002_122618 (discarded selector build1002-cf60dae3: 2 deaths then latest user rollback stopped before third game). Neither five-game batch completed. Original logs, code snapshots, images and analyses remain preserved. No universal safe offset or tracking success criterion was established. Source backup before T4: research/t4_fixed_20261002/before. Latest rejected selector files: research/t4_fixed_20261002/revision2_rolled_back.

## rollback_files.json

```json
{
  "restored_build": "1002-317482f8",
  "matches_snapshot": true,
  "scope": "rollback newest target selection only; retain T4 fixed -5px; no live test restart"
}
```
## rollback_browser.json

```json
{
  "build": "1002-317482f8",
  "bot": false,
  "playing": false,
  "T4_ON": 1,
  "T4_GAP": -5,
  "T4_MIN_LEN": 600,
  "preset": "t4_close"
}
```
## replaced_t3.json

```json
{
  "at": "2026-10-02 12:09:22",
  "old": {
    "updated": "2026-10-02 12:09:12",
    "supervisor_pid": 1288059,
    "mode": "until_dataset_coverage",
    "global_batch_or_time_cap": null,
    "criteria": {
      "enemy_radius_bins": [
        "<20",
        "20–30",
        "30–40",
        "40–50",
        "≥50"
      ],
      "actual_speeds": [
        "cruise_speed",
        "boost_speed"
      ],
      "geometries": [
        "straight",
        "gentle_curve"
      ],
      "own_radius_bin_width_px": 2,
      "minimum_independent_alive_games": 3,
      "minimum_independent_qualified_death_games": 3,
      "closest_alive_gap_per_game_max_px": 0,
      "note": "Operational dataset coverage; not all continuous radii or a guaranteed safe offset."
    },
    "state": "collecting",
    "batch": 13,
    "pid": 1503919,
    "build": "1002-11dad5e1",
    "log": "research/t3_rebuild_20261002/continuous_20261002_103125_0013.log",
    "run": "runs/t3_20261002_120229",
    "start_gap": 16,
    "enemy_bin_request": 2,
    "speed_request": "boost_speed",
    "completed_conditions": 0,
    "total_conditions": 20
  },
  "reason": "User authorized new fixed -5px follower and live test"
}
```
## Raw summary t4_20261002_121802

```json
{
  "out": "runs/t4_20261002_121802",
  "protocol": "fixed_minus5_t4",
  "purpose": "T4: validate closest parallel tracking at user-selected -5px fixed gap",
  "games": [
    {
      "run": "t4_20261002_121802",
      "game": 1,
      "build": "1002-317482f8",
      "seconds": 15.3,
      "end": "death",
      "errors": 0,
      "source": "/home/datawave/Work_AI/슬리더/runs/t4_20261002_121802/slp_01_log.json.gz",
      "target_ticks": 22,
      "target_seconds": 0.8179999999999996,
      "near_seconds": 0,
      "longest_near_seconds": 0,
      "parallel_median_gap": 436.41598836391245,
      "parallel_median_abs_error": 441.41598836391245,
      "min_gap": 434.1058240400414,
      "target_ids": 2,
      "boost_ticks": 3,
      "actual_boost_speed_ticks": 0,
      "death": {
        "nearest": {
          "id": 372,
          "gap": 4.059885456708924,
          "enemy_r": 15.7,
          "own_r": 14.773584905660377
        },
        "last_target": 495,
        "same_target": false,
        "phase": "align",
        "target_gap": 443.4905606831205,
        "heading_error": 0.28641904120845174,
        "reason": "head_interference",
        "window_s": 0.02800000000000047,
        "speed": 5.777777777777778,
        "note": "Last recorded geometry; killer and server contact location unverified."
      }
    },
    {
      "run": "t4_20261002_121802",
      "game": 2,
      "build": "1002-317482f8",
      "seconds": 24.4,
      "end": "death",
      "errors": 0,
      "source": "/home/datawave/Work_AI/슬리더/runs/t4_20261002_121802/slp_02_log.json.gz",
      "target_ticks": 349,
      "target_seconds": 12.865000000000002,
      "near_seconds": 0.9430000000000014,
      "longest_near_seconds": 0.42499999999999716,
      "parallel_median_gap": 19.238763922423573,
      "parallel_median_abs_error": 24.238763922423573,
      "min_gap": -4.4575659528017795,
      "target_ids": 3,
      "boost_ticks": 23,
      "actual_boost_speed_ticks": 7,
      "death": {
        "nearest": {
          "id": 116,
          "gap": -15.087518341630373,
          "enemy_r": 14.6,
          "own_r": 14.636792452830191
        },
        "last_target": null,
        "same_target": false,
        "phase": "seek",
        "target_gap": null,
        "heading_error": null,
        "reason": "head_interference",
        "window_s": 0.05299999999999727,
        "speed": 5.777777777777778,
        "note": "Last recorded geometry; killer and server contact location unverified."
      }
    },
    {
      "run": "t4_20261002_121802",
      "game": 3,
      "build": "1002-317482f8",
      "seconds": 64.1,
      "end": "death",
      "errors": 0,
      "source": "/home/datawave/Work_AI/슬리더/runs/t4_20261002_121802/slp_03_log.json.gz",
      "target_ticks": 1565,
      "target_seconds": 57.611000000000004,
      "near_seconds": 7.672000000000001,
      "longest_near_seconds": 2.317999999999998,
      "parallel_median_gap": 177.70627829255062,
      "parallel_median_abs_error": 182.70627829255062,
      "min_gap": -13.375258552225091,
      "target_ids": 6,
      "boost_ticks": 76,
      "actual_boost_speed_ticks": 52,
      "death": {
        "nearest": {
          "id": 98,
          "gap": -13.436354460948621,
          "enemy_r": 49,
          "own_r": 18.056603773584904
        },
        "last_target": 98,
        "same_target": true,
        "phase": "align",
        "target_gap": -13.375258552225091,
        "heading_error": 0.3114338286701397,
        "reason": "head_interference",
        "window_s": 0.11499999999999488,
        "speed": 5.833333333333333,
        "note": "Last recorded geometry; killer and server contact location unverified."
      }
    },
    {
      "run": "t4_20261002_121802",
      "game": 4,
      "build": "1002-317482f8",
      "seconds": 23.2,
      "end": "user_stop",
      "errors": 0,
      "source": "/home/datawave/Work_AI/슬리더/runs/t4_20261002_121802/slp_04_log.json.gz",
      "target_ticks": 456,
      "target_seconds": 16.299,
      "near_seconds": 2.870000000000001,
      "longest_near_seconds": 1.1359999999999992,
      "parallel_median_gap": -1.3321894838554584,
      "parallel_median_abs_error": 3.6678105161445416,
      "min_gap": -6.352978086734765,
      "target_ids": 2,
      "boost_ticks": 36,
      "actual_boost_speed_ticks": 25,
      "death": null
    }
  ],
  "planned_games": 5,
  "game_cap_s": 120,
  "batch_cap_s": 3600,
  "camera_interval_s": 0.5,
  "target_min_visible_length_px": 600,
  "gap_start_px": -5.0,
  "started": "2026-10-02 12:18:02",
  "hashes": {
    "ext/pilot.js": "0a6e54e9e20a11cc0b574047639b41c8dcc3941077437ed1f7f02a3af4d4f525",
    "ext/mod.js": "d963efb8f0793227525048d6b563dc63924e4d547f5ebbe17026f3a694540b7a",
    "params.json": "80086f04aabd9f6eb83d04b805aa423fa92f32e7ca9e29fe561a8a89a0b0c858"
  },
  "success_criteria": "at least 2 independent games with near tracking (-5±2px, heading<15deg) continuously >=3s, no judgement errors",
  "build": "1002-317482f8",
  "requested_server": null,
  "completed": false,
  "page_errors": [],
  "selected_model": "T4 fixed -5px",
  "settings_restored": false,
  "ended": "2026-10-02 12:21:22"
}
```
## Raw summary t4_20261002_122618

```json
{
  "out": "runs/t4_20261002_122618",
  "protocol": "fixed_minus5_t4",
  "purpose": "T4: validate closest parallel tracking at user-selected -5px fixed gap",
  "games": [
    {
      "run": "t4_20261002_122618",
      "game": 1,
      "build": "1002-cf60dae3",
      "seconds": 11.1,
      "end": "death",
      "errors": 0,
      "source": "/home/datawave/Work_AI/슬리더/runs/t4_20261002_122618/slp_01_log.json.gz",
      "target_ticks": 51,
      "target_seconds": 1.6809999999999992,
      "near_seconds": 0,
      "longest_near_seconds": 0,
      "parallel_median_gap": 67.57629736545717,
      "parallel_median_abs_error": 72.57629736545717,
      "min_gap": 53.68777069951236,
      "target_ids": 1,
      "boost_ticks": 0,
      "actual_boost_speed_ticks": 0,
      "death": {
        "nearest": {
          "id": 149,
          "gap": -2.995879904517343,
          "enemy_r": 34.1,
          "own_r": 14.636792452830191
        },
        "last_target": null,
        "same_target": false,
        "phase": "seek",
        "target_gap": null,
        "heading_error": null,
        "reason": "body_interference",
        "window_s": 0.02099999999999902,
        "speed": 5.79,
        "note": "Last recorded geometry; killer and server contact location unverified."
      }
    },
    {
      "run": "t4_20261002_122618",
      "game": 2,
      "build": "1002-cf60dae3",
      "seconds": 70.2,
      "end": "death",
      "errors": 0,
      "source": "/home/datawave/Work_AI/슬리더/runs/t4_20261002_122618/slp_02_log.json.gz",
      "target_ticks": 708,
      "target_seconds": 28.635999999999996,
      "near_seconds": 0,
      "longest_near_seconds": 0,
      "parallel_median_gap": 900.570378110116,
      "parallel_median_abs_error": 905.570378110116,
      "min_gap": -1.7367489303161179,
      "target_ids": 7,
      "boost_ticks": 21,
      "actual_boost_speed_ticks": 0,
      "death": {
        "nearest": {
          "id": 141,
          "gap": -5.820482717722003,
          "enemy_r": 39.7,
          "own_r": 15.867924528301886
        },
        "last_target": 376,
        "same_target": false,
        "phase": "align",
        "target_gap": 341.36809941981574,
        "heading_error": 2.738818840628472,
        "reason": "body_interference",
        "window_s": 0.025000000000005684,
        "speed": 5.777777777777778,
        "note": "Last recorded geometry; killer and server contact location unverified."
      }
    }
  ],
  "planned_games": 5,
  "game_cap_s": 120,
  "batch_cap_s": 3600,
  "camera_interval_s": 0.5,
  "target_min_visible_length_px": 1000,
  "gap_start_px": -5.0,
  "started": "2026-10-02 12:26:18",
  "hashes": {
    "ext/pilot.js": "c87d213f4d9cc271a013c96ca3b798a0b96e1f0c8b8b5ab90757671705578339",
    "ext/mod.js": "0a787049f8a9e1e244d7cbec7faf57c37cb2bde4f3e771c94f98a3edb57c56e2",
    "params.json": "609b3f58c718ca0145b567b37f8c2deb1ac85de102931b03ff85f9ce1e38601d"
  },
  "success_criteria": "at least 2 independent games with near tracking (-5±2px, heading<15deg) continuously >=3s, no judgement errors",
  "build": "1002-cf60dae3",
  "requested_server": null,
  "completed": false,
  "page_errors": [],
  "selected_model": "T4 fixed -5px",
  "settings_restored": false,
  "ended": "2026-10-02 12:28:27"
}
```
## Restored hashes

```json
{
  "ext/pilot.js": "0a6e54e9e20a11cc0b574047639b41c8dcc3941077437ed1f7f02a3af4d4f525",
  "ext/mod.js": "d963efb8f0793227525048d6b563dc63924e4d547f5ebbe17026f3a694540b7a",
  "params.json": "80086f04aabd9f6eb83d04b805aa423fa92f32e7ca9e29fe561a8a89a0b0c858",
  "ext/params.js": "28ed929be00f2c6af5b1814736b9f1120d590cdbc01fe6f51886e8a5c030a7ba",
  "ext/manifest.json": "d2463d2f2a3560c2349080ad5e5a9d45f234efe3de36d1758263b46f63bc4ef5"
}
```
## Exact restored T4 method

```js
  t4Step(s) {
    // Fixed user-selected offset follower. Every tick is recorded; no stability gate controls approach.
    const {x:px,y:py,ang,sp,sc,t:T,segs:S,sid,heads:H,hid}=s,V=this.values,ro=R*sc;
    const start=V.T4_GAP??-5,bin=r=>r<20?0:r<30?1:r<40?2:r<50?3:4;
    const pr=this.t4Probe||(this.t4Probe={id:null,set:start,phase:'align',episode:0,history:[],normalVelocity:0,quantError:0,since:T,commandGap:null,lastT:T});
    const byId=new Map();for(let k=0;k<sid.length;k++){if(!byId.has(sid[k]))byId.set(sid[k],[]);byId.get(sid[k]).push(k);}
    const point=(c,a)=>{a=clip(a,0,c.len);let i=0;while(i<c.ks.length-1&&c.cum[i+1]<a)i++;const k=c.ks[i],L=c.cum[i+1]-c.cum[i],u=L?(a-c.cum[i])/L:0;return {x:S[k*5]+(S[k*5+2]-S[k*5])*u,y:S[k*5+1]+(S[k*5+3]-S[k*5+1])*u,k,a};};
    const closest=(c,x,y)=>{let q=null;for(let i=0;i<c.ks.length;i++){const k=c.ks[i],dx=S[k*5+2]-S[k*5],dy=S[k*5+3]-S[k*5+1],u=clip(((x-S[k*5])*dx+(y-S[k*5+1])*dy)/(dx*dx+dy*dy||1),0,1),qx=S[k*5]+dx*u,qy=S[k*5+1]+dy*u,d=hypot(x-qx,y-qy);if(!q||d<q.d)q={x:qx,y:qy,d,a:c.cum[i]+u*(c.cum[i+1]-c.cum[i]),i,k};}return q;};
    const tangent=(c,a)=>{const p=point(c,a-35),q=point(c,a+35);return Math.atan2(q.y-p.y,q.x-p.x);};
    const candidates=[];for(const [id,all]of byId){const total=all.reduce((n,k)=>n+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]),0);if(total<(V.T4_MIN_LEN??600))continue;
      let ks=[];const flush=()=>{if(!ks.length)return;const cum=[0];for(const k of ks)cum.push(cum.at(-1)+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]));if(cum.at(-1)<300)return;const c={id,ks:[...ks],cum,len:cum.at(-1),total,r:S[ks[0]*5+4]};c.q=closest(c,px,py);c.h=tangent(c,c.q.a);c.gap=c.q.d-ro-c.r;c.bend=Math.max(...[-100,-50,0,50,100].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;c.contactBend=Math.max(...[-ro,ro].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;candidates.push(c);};
      for(const k of all){const last=ks.at(-1);if(last!==undefined&&hypot(S[k*5]-S[last*5+2],S[k*5+1]-S[last*5+3])>2){flush();ks=[];}ks.push(k);}flush();}
    const score=c=>c.q.d+Math.min(c.bend,PI)*100-100*Math.min(c.len/2500,1);
    let tg=candidates.filter(c=>c.id===pr.id).sort((a,b)=>a.q.d-b.q.d)[0];
    if(tg&&(tg.q.d>1400||tg.bend>rad(45)||tg.contactBend>rad(10)||(pr.dir>0?tg.len-tg.q.a:tg.q.a)<220))tg=null;
    const eligible=c=>c.q.d<1400&&c.bend<rad(30)&&c.contactBend<rad(6)&&Math.max(c.len-c.q.a,c.q.a)>500;
    if(tg&&pr.phase==='align'&&T-pr.acquired>4){const best=candidates.filter(c=>eligible(c)&&c.q.d<1100).sort((a,b)=>score(a)-score(b))[0];if(best&&best.id!==tg.id&&score(best)+250<score(tg))tg=null;}
    if(!tg){tg=candidates.filter(eligible).sort((a,b)=>score(a)-score(b))[0];if(tg){pr.id=tg.id;pr.set=start;pr.commandGap=Math.max(start,tg.gap);pr.phase='align';pr.episode++;pr.history=[];pr.normalVelocity=0;pr.acquired=T;pr.since=T;delete pr.prev;
      // Pick headward travel where possible; either endpoint must have a real connected runway.
      pr.dir=tg.len-tg.q.a>500?1:tg.q.a>500?-1:1;const h=tg.h+(pr.dir<0?PI:0);pr.side=sign(Math.cos(h)*(py-tg.q.y)-Math.sin(h)*(px-tg.q.x))||1;}}
    let heading=null,lateral=null,gap=null,bend=null,remaining=null,reason='no_target',enemySpeed=null,event=null,hold=null,boost=false,desired=ang,path=[];
    const velocity=Math.max(5.5,sp)*PX_PER_SP,ph=this.v4Physics(sc),lat=.10;
    const tickDt=clip(T-pr.lastT,0,.1);pr.lastT=T;
    if(tg){gap=tg.gap;bend=tg.bend;remaining=pr.dir>0?tg.len-tg.q.a:tg.q.a;const h=tg.h+(pr.dir<0?PI:0),nx=-Math.sin(h)*pr.side,ny=Math.cos(h)*pr.side;heading=Math.abs(wrap(ang-h));
      const prev=pr.prev,dt=prev?T-prev.t:0;lateral=prev&&dt>.005&&dt<.2&&prev.id===tg.id?(gap-prev.gap)/dt:0;
      if(prev&&dt>.005&&dt<.2&&heading<rad(30)&&Math.abs(lateral)<120){const measured=velocity*(Math.cos(ang)*nx+Math.sin(ang)*ny)-lateral;pr.normalVelocity=pr.normalVelocity*.85+clip(measured,-60,60)*.15;}else pr.normalVelocity*=.95;
      pr.prev={t:T,gap,id:tg.id};if(heading<rad(25))pr.commandGap=Math.max(start,pr.commandGap-(V.T4_APPROACH??30)*tickDt);
      pr.phase=heading<rad(15)?'follow':'align';
      const predicted=gap+lat*lateral,normal=clip(pr.normalVelocity-4*(predicted-pr.commandGap),-velocity*.30,velocity*.35);
      const ahead=point(tg,tg.q.a+pr.dir*clip(velocity*.3,50,130)),future=tangent(tg,ahead.a)+(pr.dir<0?PI:0);
      desired=h+clip(wrap(future-h),-rad(30),rad(30))*.6+pr.side*Math.asin(clip(normal/velocity,-.5,.4));
      if(heading>rad(60))desired=h;
      for(let j=0;j<hid.length;j++)if(hid[j]===tg.id)enemySpeed=H[j*5+3];
      boost=!!(V.T4_BOOST??1)&&heading<rad(12)&&bend<rad(15)&&remaining>600&&(gap>80||(enemySpeed>8&&Math.abs(gap-start)<8));
      const D=ro+tg.r+pr.set;for(let a=0;a<Math.min(remaining,500);a+=40){const p=point(tg,tg.q.a+pr.dir*a),th=tangent(tg,p.a)+(pr.dir<0?PI:0);path.push(p.x-Math.sin(th)*pr.side*D,p.y+Math.cos(th)*pr.side*D);}
      reason=remaining<150?'body_endpoint':bend>rad(6)?'curve':heading>rad(8)?'align':'clean';
    }else{pr.id=null;pr.history=[];delete pr.prev;const w=s.wall||[30000,30000,20000];desired=hypot(px-w[0],py-w[1])>200?Math.atan2(w[1]-py,w[0]-px):ang;}
    const local=new Set();if(tg)for(let i=0;i<tg.ks.length;i++)if(Math.abs((tg.cum[i]+tg.cum[i+1])/2-tg.q.a)<450)local.add(tg.ks[i]);
    const keys=[];for(let k=0;k<sid.length;k++)if(segDist(px,py,S,k)-S[k*5+4]-ro<BOOST_SP*PX_PER_SP+80)keys.push(k);
    const check=(cmd,accel)=>{let st={x:px,y:py,h:ang,v:velocity},clear=Infinity,track=0;const horizon=pr.phase==='follow'?.40:.70,steps=Math.ceil(horizon/.025);
      for(let n=0;n<steps;n++){const tt=(n+1)*.025;st=this.v4Adv(st,n<4?(s.cmdNow??ang):cmd,n<4?!!s.boostNow:accel,.025,ph);
        for(const k of keys){const isTrack=tg&&sid[k]===tg.id&&local.has(k),allow=isTrack?start:8;
          const th=tg?tg.h+(pr.dir<0?PI:0):0,shift=isTrack?pr.normalVelocity*tt*pr.side:0;clear=Math.min(clear,segDist(st.x+Math.sin(th)*shift,st.y-Math.cos(th)*shift,S,k)-ro-S[k*5+4]-allow);}
        for(let j=0;j<hid.length;j++){const speed=H[j*5+3]*PX_PER_SP;clear=Math.min(clear,hypot(st.x-H[j*5]-speed*tt*Math.cos(H[j*5+2]),st.y-H[j*5+1]-speed*tt*Math.sin(H[j*5+2]))-ro-R*H[j*5+4]-25);}
        if(s.wall)clear=Math.min(clear,s.wall[2]-hypot(st.x-s.wall[0],st.y-s.wall[1])-ro-25);
      }
      if(tg){const q=closest(tg,st.x,st.y),e=q.d-ro-tg.r-pr.normalVelocity*horizon-pr.commandGap;track=(e/12)**2+Math.abs(wrap(cmd-desired))**2*3;}
      else track=Math.abs(wrap(cmd-desired))**2;return {cmd,boost:accel,clear,track,st};};
    let chosen=check(desired,boost),changed=false;
    if(chosen.clear<0){const choices=[check(desired,false),...[-.12,-.06,-.03,-.015,-.0075,0,.0075,.015,.03,.06,.12].map(d=>check(desired+d,false)),...[-PI,-PI/2,-PI/3,-PI/6,0,PI/6,PI/3,PI/2].map(d=>check(ang+d,false))],safe=choices.filter(q=>q.clear>=0);chosen=(safe.length?safe:choices).sort((a,b)=>safe.length?a.track-b.track:b.clear-a.clear)[0];changed=true;reason=safe.length?'entry_collision_turn':'entry_no_safe_turn';path=[px,py,chosen.st.x,chosen.st.y];}
    boost=chosen.boost;
    let interference=false;for(let k=0;k<sid.length;k++)if((!tg||sid[k]!==tg.id)&&segDist(px,py,S,k)-ro-S[k*5+4]<35){reason='body_interference';interference=true;break;}
    for(let j=0;j<hid.length;j++)if(hypot(H[j*5]-px,H[j*5+1]-py)<250){reason='head_interference';interference=true;break;}
    if(s.wall&&s.wall[2]-hypot(px-s.wall[0],py-s.wall[1])-ro<100){reason='wall_interference';interference=true;}
    // Quality labels never erase the raw approach or postpone the fixed gap objective.
    const valid=!!tg&&!changed&&!interference&&heading<rad(15);
    if(tg&&heading<rad(15)&&Math.abs(gap-start)<2)hold={t:T,target:tg.id,gap,heading,speed:sp,own_r:ro,enemy_r:tg.r};
    const quantum=TAU/251,code=((chosen.cmd%TAU+TAU)%TAU)/quantum,lo=Math.floor(code),fraction=code-lo;pr.quantError+=fraction;const up=pr.quantError>=1?1:0;if(up)pr.quantError-=1;const cmd=(lo+up+.15)*quantum;
    const phase=tg?(pr.phase==='follow'?'follow':'align'):'seek',trace={mode:'probe',boost,cmd:r1(deg(cmd)),L:s.L,sc:r2(sc),prof:this.profile,nh:hid.length,t4_on:1,t4_phase:phase,t4_episode:pr.episode,t4_speed:sp,t4_requested_speed:0,t4_command_gap:pr.commandGap,t4_gap_error:tg?gap-start:null,t4_own_r:ro,t4_enemy_r:tg?.r??null,t4_gap:gap,t4_set:pr.set,t4_target:tg?.id??null,t4_level:event,t4_hold:hold,t4_heading_error:heading,t4_lateral:lateral,t4_bend:bend,t4_contact_bend:tg?.contactBend??null,t4_valid:+valid,t4_reason:reason,t4_visible_length:tg?.total??0,t4_boost_reason:changed?'entry_turn_no_boost':boost?pr.phase==='follow'?'boost_measure':'catch_target':'cruise_measure',t4_enemy_speed:enemySpeed,t4_remaining:remaining,t4_boost:+boost,t4_guard_clear:chosen.clear,t4_guard_changed:+changed,pph:valid?1:phase==='seek'?0:2,pset:pr.set,pgap:gap,ptr:tg?.r??null,ptid:tg?.id??null,pstab:this.t4Serial??0};
    this.last={mode:'probe',trace,draw:{chosen:path,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:tg?[{id:tg.id,x:tg.q.x,y:tg.q.y,r:tg.r,gap}]:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro,analysis:null}};this.prev=cmd;this.prevBoost=boost;return [cmd,boost];
  }

```
