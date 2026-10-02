  t4Step(s) {
    // Fixed user-selected offset follower. Every tick is recorded; no stability gate controls approach.
    const {x:px,y:py,ang,sp,sc,t:T,segs:S,sid,heads:H,hid}=s,V=this.values,ro=R*sc;
    const start=V.T4_GAP??-5,bin=r=>r<20?0:r<30?1:r<40?2:r<50?3:4;
    const pr=this.t4Probe||(this.t4Probe={id:null,set:start,phase:'align',episode:0,history:[],normalVelocity:0,quantError:0,since:T,commandGap:null,lastT:T});
    const byId=new Map();for(let k=0;k<sid.length;k++){if(!byId.has(sid[k]))byId.set(sid[k],[]);byId.get(sid[k]).push(k);}
    const point=(c,a)=>{a=clip(a,0,c.len);let i=0;while(i<c.ks.length-1&&c.cum[i+1]<a)i++;const k=c.ks[i],L=c.cum[i+1]-c.cum[i],u=L?(a-c.cum[i])/L:0;return {x:S[k*5]+(S[k*5+2]-S[k*5])*u,y:S[k*5+1]+(S[k*5+3]-S[k*5+1])*u,k,a};};
    const closest=(c,x,y)=>{let q=null;for(let i=0;i<c.ks.length;i++){const k=c.ks[i],dx=S[k*5+2]-S[k*5],dy=S[k*5+3]-S[k*5+1],u=clip(((x-S[k*5])*dx+(y-S[k*5+1])*dy)/(dx*dx+dy*dy||1),0,1),qx=S[k*5]+dx*u,qy=S[k*5+1]+dy*u,d=hypot(x-qx,y-qy);if(!q||d<q.d)q={x:qx,y:qy,d,a:c.cum[i]+u*(c.cum[i+1]-c.cum[i]),i,k};}return q;};
    const tangent=(c,a)=>{const p=point(c,a-35),q=point(c,a+35);return Math.atan2(q.y-p.y,q.x-p.x);};
    const candidates=[];for(const [id,all]of byId){const total=all.reduce((n,k)=>n+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]),0);if(total<(V.T4_MIN_LEN??1000))continue;
      let ks=[];const flush=()=>{if(!ks.length)return;const cum=[0];for(const k of ks)cum.push(cum.at(-1)+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]));if(cum.at(-1)<300)return;const c={id,ks:[...ks],cum,len:cum.at(-1),total,r:S[ks[0]*5+4]};c.q=closest(c,px,py);c.h=tangent(c,c.q.a);c.gap=c.q.d-ro-c.r;c.bend=Math.max(...[-100,-50,0,50,100].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;c.contactBend=Math.max(...[-ro,ro].map(d=>Math.abs(wrap(tangent(c,c.q.a+d)-c.h))))*2;candidates.push(c);};
      for(const k of all){const last=ks.at(-1);if(last!==undefined&&hypot(S[k*5]-S[last*5+2],S[k*5+1]-S[last*5+3])>2){flush();ks=[];}ks.push(k);}flush();}
    const score=c=>c.q.d;
    let tg=candidates.filter(c=>c.id===pr.id).sort((a,b)=>a.q.d-b.q.d)[0];
    if(tg&&(tg.q.d>1400||tg.bend>rad(45)||tg.contactBend>rad(10)||(pr.dir>0?tg.len-tg.q.a:tg.q.a)<220))tg=null;
    const eligible=c=>c.q.d<1400&&c.bend<rad(30)&&c.contactBend<rad(6)&&Math.max(c.len-c.q.a,c.q.a)>500;
    // Check a real turn before leaving an existing close body for a longer one.
    const transferClear=c=>{const velocity=Math.max(5.5,sp)*PX_PER_SP,ph=this.v4Physics(sc),dir=c.len-c.q.a>500?1:-1,h=c.h+(dir<0?PI:0),side=sign(Math.cos(h)*(py-c.q.y)-Math.sin(h)*(px-c.q.x))||1;
      const cmd=h-side*Math.asin(.30);let st={x:px,y:py,h:ang,v:velocity};
      for(let n=0;n<28;n++){const tt=(n+1)*.025;st=this.v4Adv(st,n<4?(s.cmdNow??ang):cmd,n<4?!!s.boostNow:false,.025,ph);
        for(let k=0;k<sid.length;k++){const allowed=sid[k]===tg.id||sid[k]===c.id?start:8;if(segDist(st.x,st.y,S,k)-ro-S[k*5+4]<allowed)return false;}
        for(let j=0;j<hid.length;j++){const speed=H[j*5+3]*PX_PER_SP;if(hypot(st.x-H[j*5]-speed*tt*Math.cos(H[j*5+2]),st.y-H[j*5+1]-speed*tt*Math.sin(H[j*5+2]))-ro-R*H[j*5+4]<25)return false;}
        if(s.wall&&s.wall[2]-hypot(st.x-s.wall[0],st.y-s.wall[1])-ro<25)return false;
      }return closest(c,st.x,st.y).d<c.q.d-3;
    };
    // Start with the nearest eligible long body; upgrade only after a longer candidate persists.
    let switchReason='retained';
    if(tg&&T-pr.acquired>=2){
      const longer=candidates.filter(c=>eligible(c)&&c.id!==tg.id&&c.total>tg.total*1.05&&c.q.d<1000&&transferClear(c)).sort((a,b)=>score(a)-score(b))[0];
      if(longer){
        if(pr.upgradeId!==longer.id){pr.upgradeId=longer.id;pr.upgradeSince=T;}
        if(T-pr.upgradeSince>=.5){pr.departingId=tg.id;pr.departUntil=T+.7;tg=null;pr.upgrade=longer;switchReason='longer_visible_target';}
      }else{pr.upgradeId=null;pr.upgrade=null;}
    }

    if(!tg){tg=pr.upgrade||candidates.filter(eligible).sort((a,b)=>score(a)-score(b))[0];pr.upgrade=null;pr.upgradeId=null;if(tg){pr.id=tg.id;pr.set=start;pr.commandGap=Math.max(start,tg.gap);pr.phase='align';pr.episode++;pr.history=[];pr.normalVelocity=0;pr.acquired=T;pr.since=T;delete pr.prev;
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
        for(const k of keys){const isTrack=tg&&sid[k]===tg.id&&local.has(k),allow=isTrack||(sid[k]===pr.departingId&&T<pr.departUntil)?start:8;
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
    const phase=tg?(pr.phase==='follow'?'follow':'align'):'seek',trace={mode:'probe',boost,cmd:r1(deg(cmd)),L:s.L,sc:r2(sc),prof:this.profile,nh:hid.length,t4_on:1,t4_phase:phase,t4_episode:pr.episode,t4_speed:sp,t4_requested_speed:0,t4_command_gap:pr.commandGap,t4_gap_error:tg?gap-start:null,t4_own_r:ro,t4_enemy_r:tg?.r??null,t4_gap:gap,t4_set:pr.set,t4_target:tg?.id??null,t4_level:event,t4_hold:hold,t4_heading_error:heading,t4_lateral:lateral,t4_bend:bend,t4_contact_bend:tg?.contactBend??null,t4_valid:+valid,t4_reason:reason,t4_visible_length:tg?.total??0,t4_selection:switchReason,t4_boost_reason:changed?'entry_turn_no_boost':boost?pr.phase==='follow'?'boost_measure':'catch_target':'cruise_measure',t4_enemy_speed:enemySpeed,t4_remaining:remaining,t4_boost:+boost,t4_guard_clear:chosen.clear,t4_guard_changed:+changed,pph:valid?1:phase==='seek'?0:2,pset:pr.set,pgap:gap,ptr:tg?.r??null,ptid:tg?.id??null,pstab:this.t4Serial??0};
    this.last={mode:'probe',trace,draw:{chosen:path,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:tg?[{id:tg.id,x:tg.q.x,y:tg.q.y,r:tg.r,gap}]:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro,analysis:null}};this.prev=cmd;this.prevBoost=boost;return [cmd,boost];
  }
