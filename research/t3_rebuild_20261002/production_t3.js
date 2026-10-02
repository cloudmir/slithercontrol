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