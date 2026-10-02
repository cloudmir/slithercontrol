# T3 guard audit at16px

User direct question: 더 붙어도 되는데 회피 알고리즘 때문에 더 못 붙는건가?

## Actual code
```js
  t3Step(s) {
    // Metrology follower: continuous offset tracking and sample quality are separate states.
    const {x:px,y:py,ang,sp,sc,t:T,segs:S,sid,heads:H,hid}=s,V=this.values,ro=R*sc;
    const start=V.T3_GAP0??40,bin=r=>r<20?0:r<30?1:r<40?2:r<50?3:4;
    const pr=this.t3Probe||(this.t3Probe={id:null,set:start,phase:'align',episode:0,history:[],normalVelocity:0,quantError:0,since:T});
    const byId=new Map();for(let k=0;k<sid.length;k++){if(!byId.has(sid[k]))byId.set(sid[k],[]);byId.get(sid[k]).push(k);}
    const point=(c,a)=>{a=clip(a,0,c.len);let i=0;while(i<c.ks.length-1&&c.cum[i+1]<a)i++;const k=c.ks[i],L=c.cum[i+1]-c.cum[i],u=L?(a-c.cum[i])/L:0;return {x:S[k*5]+(S[k*5+2]-S[k*5])*u,y:S[k*5+1]+(S[k*5+3]-S[k*5+1])*u,k,a};};
    const closest=(c,x,y)=>{let q=null;for(let i=0;i<c.ks.length;i++){const k=c.ks[i],dx=S[k*5+2]-S[k*5],dy=S[k*5+3]-S[k*5+1],u=clip(((x-S[k*5])*dx+(y-S[k*5+1])*dy)/(dx*dx+dy*dy||1),0,1),qx=S[k*5]+dx*u,qy=S[k*5+1]+dy*u,d=hypot(x-qx,y-qy);if(!q||d<q.d)q={x:qx,y:qy,d,a:c.cum[i]+u*(c.cum[i+1]-c.cum[i]),i,k};}return q;};
    const tangent=(c,a)=>{const p=point(c,a-35),q=point(c,a+35);return Math.atan2(q.y-p.y,q.x-p.x);};
    const candidates=[];for(const [id,all]of byId){const total=all.reduce((n,k)=>n+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]),0);if(total<(V.T3_MIN_LEN??600))continue;
      let ks=[];const flush=()=>{if(!ks.length)return;const cum=[0];for(const k of ks)cum.push(cum.at(-1)+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]));if(cum.at(-1)<300)return;const c={id,ks:[...ks],cum,len:cum.at(-1),total,r:S[ks[0]*5+4]};c.q=closest(c,px,py);c.h=tangent(c,c.q.a);c.gap=c.q.d-ro-c.r;c.bend=Math.max(...[-100,-50,0,50,100].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;c.contactBend=Math.max(...[-ro,ro].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;candidates.push(c);};
      for(const k of all){const last=ks.at(-1);if(last!==undefined&&hypot(S[k*5]-S[last*5+2],S[k*5+1]-S[last*5+3])>2){flush();ks=[];}ks.push(k);}flush();}
    const score=c=>c.q.d+Math.min(c.bend,PI)*100+Math.abs(bin(c.r)-(V.T3_BIN??0))*40-100*Math.min(c.len/2500,1);
    let tg=candidates.filter(c=>c.id===pr.id).sort((a,b)=>a.q.d-b.q.d)[0];
    if(tg&&(tg.q.d>1400||tg.bend>rad(45)||tg.contactBend>rad(10)||(pr.dir>0?tg.len-tg.q.a:tg.q.a)<220))tg=null;
    const eligible=c=>c.q.d<1400&&c.bend<rad(30)&&c.contactBend<rad(6)&&Math.max(c.len-c.q.a,c.q.a)>500;
    if(tg&&pr.phase==='align'&&T-pr.acquired>4){const best=candidates.filter(c=>eligible(c)&&c.q.d<1100).sort((a,b)=>score(a)-score(b))[0];if(best&&best.id!==tg.id&&score(best)+250<score(tg))tg=null;}
    if(!tg){tg=candidates.filter(eligible).sort((a,b)=>score(a)-score(b))[0];if(tg){pr.id=tg.id;pr.set=start;pr.phase='align';pr.episode++;pr.history=[];pr.normalVelocity=0;pr.acquired=T;pr.since=T;delete pr.prev;
      // Pick headward travel where possible; either endpoint must have a real connected runway.
      pr.dir=tg.len-tg.q.a>500?1:tg.q.a>500?-1:1;const h=tg.h+(pr.dir<0?PI:0);pr.side=sign(Math.cos(h)*(py-tg.q.y)-Math.sin(h)*(px-tg.q.x))||1;}}
    let heading=null,lateral=null,gap=null,bend=null,remaining=null,reason='no_target',enemySpeed=null,event=null,hold=null,boost=false,desired=ang,path=[];
    const velocity=Math.max(5.5,sp)*PX_PER_SP,ph=this.v4Physics(sc),lat=.10;
    if(tg){gap=tg.gap;bend=tg.bend;remaining=pr.dir>0?tg.len-tg.q.a:tg.q.a;const h=tg.h+(pr.dir<0?PI:0),nx=-Math.sin(h)*pr.side,ny=Math.cos(h)*pr.side;heading=Math.abs(wrap(ang-h));
      const prev=pr.prev,dt=prev?T-prev.t:0;lateral=prev&&dt>.005&&dt<.2&&prev.id===tg.id?(gap-prev.gap)/dt:0;
      if(prev&&dt>.005&&dt<.2&&heading<rad(30)&&Math.abs(lateral)<120){const measured=velocity*(Math.cos(ang)*nx+Math.sin(ang)*ny)-lateral;pr.normalVelocity=pr.normalVelocity*.85+clip(measured,-60,60)*.15;}else pr.normalVelocity*=.95;
      pr.prev={t:T,gap,id:tg.id};const predicted=gap+lat*lateral,normal=clip(pr.normalVelocity-2.4*(predicted-pr.set),-velocity*.45,velocity*.35);
      const ahead=point(tg,tg.q.a+pr.dir*clip(velocity*.3,50,130)),future=tangent(tg,ahead.a)+(pr.dir<0?PI:0);
      desired=h+clip(wrap(future-h),-rad(30),rad(30))*.6+pr.side*Math.asin(clip(normal/velocity,-.5,.4));
      if(heading>rad(60))desired=h;
      for(let j=0;j<hid.length;j++)if(hid[j]===tg.id)enemySpeed=H[j*5+3];
      boost=!!V.T3_SPEED&&pr.phase==='follow'&&heading<rad(8)&&bend<rad(15)&&remaining>velocity*.7+100;
      if(pr.phase==='align'&&gap>250&&heading<rad(12)&&bend<rad(15)&&remaining>600)boost=true;
      const D=ro+tg.r+pr.set;for(let a=0;a<Math.min(remaining,500);a+=40){const p=point(tg,tg.q.a+pr.dir*a),th=tangent(tg,p.a)+(pr.dir<0?PI:0);path.push(p.x-Math.sin(th)*pr.side*D,p.y+Math.cos(th)*pr.side*D);}
      reason=remaining<150?'body_endpoint':bend>rad(6)?'curve':heading>rad(8)?'align':'clean';
    }else{pr.id=null;pr.history=[];delete pr.prev;const w=s.wall||[30000,30000,20000];desired=hypot(px-w[0],py-w[1])>200?Math.atan2(w[1]-py,w[0]-px):ang;}
    const local=new Set();if(tg)for(let i=0;i<tg.ks.length;i++)if(Math.abs((tg.cum[i]+tg.cum[i+1])/2-tg.q.a)<450)local.add(tg.ks[i]);
    const keys=[];for(let k=0;k<sid.length;k++)if(segDist(px,py,S,k)-S[k*5+4]-ro<BOOST_SP*PX_PER_SP+80)keys.push(k);
    const check=(cmd,accel)=>{let st={x:px,y:py,h:ang,v:velocity},clear=Infinity,track=0;const horizon=pr.phase==='follow'?.40:.70,steps=Math.ceil(horizon/.025);
      for(let n=0;n<steps;n++){const tt=(n+1)*.025;st=this.v4Adv(st,n<4?(s.cmdNow??ang):cmd,n<4?!!s.boostNow:accel,.025,ph);
        for(const k of keys){const isTrack=tg&&sid[k]===tg.id&&local.has(k),allow=isTrack?pr.phase==='follow'?pr.set-8:8:16;clear=Math.min(clear,segDist(st.x,st.y,S,k)-ro-S[k*5+4]-allow);}
        for(let j=0;j<hid.length;j++){const speed=H[j*5+3]*PX_PER_SP;clear=Math.min(clear,hypot(st.x-H[j*5]-speed*tt*Math.cos(H[j*5+2]),st.y-H[j*5+1]-speed*tt*Math.sin(H[j*5+2]))-ro-R*H[j*5+4]-25);}
        if(s.wall)clear=Math.min(clear,s.wall[2]-hypot(st.x-s.wall[0],st.y-s.wall[1])-ro-25);
      }
      if(tg){const q=closest(tg,st.x,st.y),e=q.d-ro-tg.r-pr.normalVelocity*horizon-pr.set;track=(e/35)**2*.4+Math.abs(wrap(cmd-desired))**2*3;}
      else track=Math.abs(wrap(cmd-desired))**2;return {cmd,boost:accel,clear,track,st};};
    let chosen=check(desired,boost),changed=false;
    if(chosen.clear<0){const choices=[check(desired,false),...[-PI,-PI/2,-PI/3,-PI/6,0,PI/6,PI/3,PI/2].map(d=>check(ang+d,false))],safe=choices.filter(q=>q.clear>=0);chosen=(safe.length?safe:choices).sort((a,b)=>safe.length?a.track-b.track:b.clear-a.clear)[0];changed=true;reason=safe.length?'entry_collision_turn':'entry_no_safe_turn';path=[px,py,chosen.st.x,chosen.st.y];}
    boost=chosen.boost;
    let interference=false;for(let k=0;k<sid.length;k++)if((!tg||sid[k]!==tg.id)&&segDist(px,py,S,k)-ro-S[k*5+4]<35){reason='body_interference';interference=true;break;}
    for(let j=0;j<hid.length;j++)if(hypot(H[j*5]-px,H[j*5+1]-py)<250){reason='head_interference';interference=true;break;}
    if(s.wall&&s.wall[2]-hypot(px-s.wall[0],py-s.wall[1])-ro<100){reason='wall_interference';interference=true;}
    // Parallel holding can occur on a bend; bend data is not accepted as a straight collision offset.
    if(tg&&!changed&&!interference&&remaining>150&&heading<rad(15)&&Math.abs(gap-pr.set)<8){pr.history.push({t:T,gap,err:Math.abs(gap-pr.set),ro,rt:tg.r,heading,lateral:Math.abs(lateral),speed:sp,boost:+boost,bend,contactBend:tg.contactBend});while(pr.history.length&&T-pr.history[0].t>1.5)pr.history.shift();}
    else pr.history=[];
    const a=pr.history,med=k=>a.map(q=>q[k]).sort((x,y)=>x-y)[a.length>>1],range=k=>Math.max(...a.map(q=>q[k]))-Math.min(...a.map(q=>q[k]));
    let valid=false;
    if(a.length>=15&&T-a[0].t>=.75&&T-pr.since>=1.5&&med('err')<2&&range('gap')<3&&med('heading')<rad(8)&&med('lateral')<10&&range('ro')<.3&&range('rt')<.3&&range('speed')<1&&range('boost')===0){
      pr.phase='follow';hold={t:T,target:tg.id,episode:pr.episode,set:pr.set,gap:med('gap'),duration:T-a[0].t,samples:a.length,heading:med('heading'),bend:med('bend'),speed:med('speed'),own_r:med('ro'),enemy_r:med('rt')};
      if(Math.max(...a.map(q=>q.bend))<=rad(30)&&Math.max(...a.map(q=>q.contactBend))<=rad(6)){event={...hold,geometry_class:Math.max(...a.map(q=>q.bend))<=rad(6)?'straight':'gentle_curve',bend_max:Math.max(...a.map(q=>q.bend)),contact_bend_max:Math.max(...a.map(q=>q.contactBend)),gap_range:range('gap'),heading_max:Math.max(...a.map(q=>q.heading)),serial:(this.t3Serial=(this.t3Serial??0)+1),requested_speed:V.T3_SPEED??0,gap_min:Math.min(...a.map(q=>q.gap)),gap_max:Math.max(...a.map(q=>q.gap)),lateral:med('lateral'),boost:!!med('boost'),speed_class:med('speed')>8?'boost_speed':'cruise_speed',enemy_speed:enemySpeed};pr.set=Math.max(-30,pr.set-1);pr.history=[];pr.since=T;valid=true;}
    }
    if(tg&&!changed&&!interference&&(reason==='clean'||reason==='curve'&&bend<=rad(30)&&tg.contactBend<=rad(6))&&pr.phase==='follow')valid=true;
    const quantum=TAU/251,code=((chosen.cmd%TAU+TAU)%TAU)/quantum,lo=Math.floor(code),fraction=code-lo;pr.quantError+=fraction;const up=pr.quantError>=1?1:0;if(up)pr.quantError-=1;const cmd=(lo+up+.15)*quantum;
    const phase=tg?(pr.phase==='follow'?'follow':'align'):'seek',trace={mode:'probe',boost,cmd:r1(deg(cmd)),L:s.L,sc:r2(sc),prof:this.profile,nh:hid.length,t3_on:1,t3_phase:phase,t3_episode:pr.episode,t3_speed:sp,t3_requested_speed:V.T3_SPEED??0,t3_own_r:ro,t3_enemy_r:tg?.r??null,t3_gap:gap,t3_set:pr.set,t3_target:tg?.id??null,t3_level:event,t3_hold:hold,t3_heading_error:heading,t3_lateral:lateral,t3_bend:bend,t3_contact_bend:tg?.contactBend??null,t3_valid:+valid,t3_reason:reason,t3_visible_length:tg?.total??0,t3_boost_reason:changed?'entry_turn_no_boost':boost?pr.phase==='follow'?'boost_measure':'catch_target':'cruise_measure',t3_enemy_speed:enemySpeed,t3_remaining:remaining,t3_boost:+boost,t3_guard_clear:chosen.clear,t3_guard_changed:+changed,pph:valid?1:phase==='seek'?0:2,pset:pr.set,pgap:gap,ptr:tg?.r??null,ptid:tg?.id??null,pstab:this.t3Serial??0};
    this.last={mode:'probe',trace,draw:{chosen:path,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:tg?[{id:tg.id,x:tg.q.x,y:tg.q.y,r:tg.r,gap}]:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro,analysis:null}};this.prev=cmd;this.prevBoost=boost;return [cmd,boost];
  }


```

## Raw execution and computed trace counts
```json
{
  "build": "1002-11dad5e1",
  "production_sha256": "a1a2ac6049df35a89fe06ee19a52ec3d34cd2d9528e7a46c4d56193b7318d146",
  "run": "runs/t3_20261002_101048",
  "completed": true,
  "games": 6,
  "qualified_alive_levels": 9,
  "game6_levels": [
    {
      "t": 49.845,
      "target": 96,
      "episode": 5,
      "set": 16,
      "gap": 14.794829866332634,
      "duration": 0.7681000000238782,
      "samples": 24,
      "heading": 0.015327082289356753,
      "bend": 0.020312859963231844,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "straight",
      "bend_max": 0.02894950597335999,
      "contact_bend_max": 0.003401986544746549,
      "gap_range": 1.8088648039505983,
      "heading_max": 0.061200168534975674,
      "serial": 1,
      "requested_speed": 0,
      "gap_min": 14.372408391559233,
      "gap_max": 16.18127319550983,
      "lateral": 4.95499054201279,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": 7,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    },
    {
      "t": 51.349,
      "target": 96,
      "episode": 5,
      "set": 15,
      "gap": 14.15868859455297,
      "duration": 1.4720999999642572,
      "samples": 45,
      "heading": 0.024876275125286895,
      "bend": 0.0055829787353038896,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "straight",
      "bend_max": 0.013260276280124828,
      "contact_bend_max": 0.0015497566641720084,
      "gap_range": 1.8788058409428743,
      "heading_max": 0.09863560587513476,
      "serial": 2,
      "requested_speed": 0,
      "gap_min": 12.950060999541492,
      "gap_max": 14.828866840484366,
      "lateral": 4.433237238228609,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": 7,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    },
    {
      "t": 52.871,
      "target": 96,
      "episode": 5,
      "set": 14,
      "gap": 12.816655490848987,
      "duration": 1.4743000000119082,
      "samples": 45,
      "heading": 0.021227243717190092,
      "bend": 0.01116233080225193,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "straight",
      "bend_max": 0.012760452435330194,
      "contact_bend_max": 0.0019934187286274607,
      "gap_range": 2.879205202532148,
      "heading_max": 0.1533800949618893,
      "serial": 3,
      "requested_speed": 0,
      "gap_min": 11.610063601182603,
      "gap_max": 14.48926880371475,
      "lateral": 5.163902939253211,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": 7,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    },
    {
      "t": 54.394,
      "target": 96,
      "episode": 5,
      "set": 13,
      "gap": 11.967252808330315,
      "duration": 1.489499999999964,
      "samples": 43,
      "heading": 0.020260280142252896,
      "bend": 0.011461639231063359,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "straight",
      "bend_max": 0.012537045716344508,
      "contact_bend_max": 0.0019934186590138125,
      "gap_range": 2.0415837442129288,
      "heading_max": 0.07519796305802195,
      "serial": 4,
      "requested_speed": 0,
      "gap_min": 11.235225916966328,
      "gap_max": 13.276809661179257,
      "lateral": 4.436981313741558,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": 7,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    },
    {
      "t": 55.915,
      "target": 96,
      "episode": 5,
      "set": 12,
      "gap": 10.223616069298629,
      "duration": 1.48159999996426,
      "samples": 39,
      "heading": 0.019192212264592,
      "bend": 0.009722681093692565,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "straight",
      "bend_max": 0.013216311001973402,
      "contact_bend_max": 0.0019384575430994033,
      "gap_range": 2.503328514797488,
      "heading_max": 0.14846416725491096,
      "serial": 5,
      "requested_speed": 0,
      "gap_min": 9.623960738141463,
      "gap_max": 12.12728925293895,
      "lateral": 3.0350717022399016,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": 7,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    },
    {
      "t": 57.428,
      "target": 96,
      "episode": 5,
      "set": 11,
      "gap": 9.779245646527343,
      "duration": 1.4873999999761054,
      "samples": 45,
      "heading": 0.01341912219828778,
      "bend": 0.013660745363937465,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "straight",
      "bend_max": 0.013852647386890737,
      "contact_bend_max": 0.002169106252060793,
      "gap_range": 2.367984555627231,
      "heading_max": 0.13075239548486906,
      "serial": 6,
      "requested_speed": 0,
      "gap_min": 8.260547994957165,
      "gap_max": 10.628532550584396,
      "lateral": 4.228090640870178,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": 7,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    },
    {
      "t": 58.952,
      "target": 96,
      "episode": 5,
      "set": 10,
      "gap": 8.623617766364575,
      "duration": 1.2671999999880654,
      "samples": 39,
      "heading": 0.014017544187346687,
      "bend": 0.018477616707752276,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "straight",
      "bend_max": 0.031062185806136178,
      "contact_bend_max": 0.004017052731137838,
      "gap_range": 2.4656902259516187,
      "heading_max": 0.09424542835514416,
      "serial": 7,
      "requested_speed": 0,
      "gap_min": 8.094021520683327,
      "gap_max": 10.559711746634946,
      "lateral": 3.0989948085621104,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": 11.055555555555555,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    },
    {
      "t": 60.469,
      "target": 96,
      "episode": 5,
      "set": 9,
      "gap": 7.974945215235138,
      "duration": 1.392500000000041,
      "samples": 41,
      "heading": 0.02243075638043379,
      "bend": 0.06427310289582167,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "gentle_curve",
      "bend_max": 0.11175227240165686,
      "contact_bend_max": 0.014296994236286942,
      "gap_range": 2.6117769350498605,
      "heading_max": 0.10523756761728364,
      "serial": 8,
      "requested_speed": 0,
      "gap_min": 7.227500606068901,
      "gap_max": 9.839277541118761,
      "lateral": 4.532088377939113,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": 7,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    },
    {
      "t": 61.99,
      "target": 96,
      "episode": 5,
      "set": 8,
      "gap": 6.494380159465663,
      "duration": 1.4644999999999868,
      "samples": 43,
      "heading": 0.022878261894401675,
      "bend": 0.19203601975630846,
      "speed": 5.79,
      "own_r": 15.320754716981131,
      "enemy_r": 60.325471698113205,
      "geometry_class": "gentle_curve",
      "bend_max": 0.2915445765069453,
      "contact_bend_max": 0.03930211118421223,
      "gap_range": 2.900993915715219,
      "heading_max": 0.14972901179480758,
      "serial": 9,
      "requested_speed": 0,
      "gap_min": 5.551354356903715,
      "gap_max": 8.452348272618934,
      "lateral": 5.011070516456627,
      "boost": false,
      "speed_class": "cruise_speed",
      "enemy_speed": null,
      "game": 6,
      "run": "t3_20261002_101048",
      "kind": "alive",
      "protocol": "parallel_offset_t3_rebuild",
      "build": "1002-11dad5e1",
      "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
    }
  ],
  "audit": [
    {
      "game": 1,
      "target_ticks": 293,
      "near40_ticks": 0,
      "near_guard_changed": 0,
      "near_phase": {},
      "near_reasons": {},
      "within8px_goal_ticks": 0,
      "within8px_goal_guard": 0,
      "within8px_goal_heading_under15": 0,
      "min_gap": 78.27315116235505,
      "min_set": 16
    },
    {
      "game": 2,
      "target_ticks": 332,
      "near40_ticks": 0,
      "near_guard_changed": 0,
      "near_phase": {},
      "near_reasons": {},
      "within8px_goal_ticks": 0,
      "within8px_goal_guard": 0,
      "within8px_goal_heading_under15": 0,
      "min_gap": 264.77621727520466,
      "min_set": 16
    },
    {
      "game": 3,
      "target_ticks": 552,
      "near40_ticks": 71,
      "near_guard_changed": 14,
      "near_phase": {
        "align": 71
      },
      "near_reasons": {
        "curve": 36,
        "entry_no_safe_turn": 4,
        "head_interference": 31
      },
      "within8px_goal_ticks": 33,
      "within8px_goal_guard": 8,
      "within8px_goal_heading_under15": 31,
      "min_gap": 16.88854202363456,
      "min_set": 16
    },
    {
      "game": 4,
      "target_ticks": 960,
      "near40_ticks": 66,
      "near_guard_changed": 25,
      "near_phase": {
        "align": 66
      },
      "near_reasons": {
        "entry_collision_turn": 20,
        "head_interference": 24,
        "curve": 22
      },
      "within8px_goal_ticks": 33,
      "within8px_goal_guard": 9,
      "within8px_goal_heading_under15": 32,
      "min_gap": 19.297544451472778,
      "min_set": 16
    },
    {
      "game": 5,
      "target_ticks": 778,
      "near40_ticks": 156,
      "near_guard_changed": 37,
      "near_phase": {
        "align": 156
      },
      "near_reasons": {
        "curve": 72,
        "entry_collision_turn": 13,
        "clean": 11,
        "entry_no_safe_turn": 9,
        "head_interference": 51
      },
      "within8px_goal_ticks": 110,
      "within8px_goal_guard": 21,
      "within8px_goal_heading_under15": 102,
      "min_gap": -2.7875211560379647,
      "min_set": 16
    },
    {
      "game": 6,
      "target_ticks": 2011,
      "near40_ticks": 1005,
      "near_guard_changed": 159,
      "near_phase": {
        "align": 584,
        "follow": 421
      },
      "near_reasons": {
        "curve": 358,
        "align": 35,
        "clean": 443,
        "entry_collision_turn": 31,
        "entry_no_safe_turn": 12,
        "head_interference": 121,
        "body_interference": 5
      },
      "within8px_goal_ticks": 827,
      "within8px_goal_guard": 53,
      "within8px_goal_heading_under15": 822,
      "min_gap": -11.031299348530027,
      "min_set": 7
    }
  ]
}
```

Limits: guard changed flags do not identify which obstacle triggered the veto. No causality claim that every approach was rejected solely because of the followed body. Alive levels do not establish a universal collision boundary.
