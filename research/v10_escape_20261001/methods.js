  // V10 long probes share one geometry/physics model with the actuator.
  // Risk is a reachability index, not an empirically calibrated probability.
  v10ProbeWorld(W) {
    const near = 1.2;
    return {...W, check:(a,b,t0=0,t1=t0,pad=0)=>{
      const gap=W.check(a,b,t0,t1,pad,false);
      if(gap<0||t0>=near)return gap;
      const end=Math.min(t1,near),f=t1>t0?(end-t0)/(t1-t0):1;
      return Math.min(gap,W.check(a,{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f},t0,end,pad,true));
    }};
  }
  v10Blockers(s,W) {
    const heads=[];
    for(let i=0;i<s.heads.length;i+=5){
      const [x,y,h,sp,sc]=s.heads.slice(i,i+5),ph=this.v4Physics(sc);
      if(![x,y,h,sp,sc].every(Number.isFinite))continue;
      heads.push({id:s.hid?.[i/5]??i/5,x,y,h,v:Math.max(ph.vb,sp*PX_PER_SP),v0:sp*PX_PER_SP,rate:ph.rate,w:ph.w,r:R*sc+W.ro+W.margin+(this.values.V10_HEAD_PAD??12)});
    }return heads;
  }
  v10EarliestBlock(head,a,b,pad=0) {
    // A disk encloses the entire swept chord. Maximum progress towards its
    // centre is integrated under the turn-rate bound. Instant maximum speed,
    // optional stopping, and ignored enemy obstacles enlarge the reachable set:
    // this is a LOWER bound on interception time, never a guaranteed attack.
    const x=(a.x+b.x)/2-head.x,y=(a.y+b.y)/2-head.y;
    const d=Math.max(0,hypot(x,y)-head.r-hypot(b.x-a.x,b.y-a.y)/2-pad);
    if(d===0)return 0;
    const angle=Math.abs(wrap(Math.atan2(y,x)-head.h)),w=Math.max(1e-6,head.w),v=head.v;
    const beta=Math.min(angle,PI/2),delay=Math.max(0,(angle-PI/2)/w),arc=v*Math.sin(beta)/w;
    const turnBound=d<arc?delay+(beta-Math.asin(clip(Math.sin(beta)-d*w/v,-1,1)))/w:angle/w+(d-arc)/v;
    const v0=head.v0??v,rate=Math.max(1e-6,head.rate??1),ramp=Math.max(0,(v-v0)/rate),rampDistance=(v0+v)*ramp/2;
    const speedBound=d<=rampDistance?(-v0+Math.sqrt(v0*v0+2*rate*d))/rate:ramp+(d-rampDistance)/v;
    return Math.max(turnBound,speedBound);
  }
  v10Closure(pts,heads) {
    let slack=Infinity,exposure=0,weight=0,first=Infinity,enemy=null;const segments=[];
    // Group only a few points; enclosing radius includes every curve vertex,
    // so no narrow interception between sampled endpoints is skipped.
    for(let i=0;i+5<pts.length;){
      let j=i+5;while(j+5<pts.length&&pts[j+5]-pts[i]<=.16)j+=5;
      const a={x:pts[i+1],y:pts[i+2]},b={x:pts[j+1],y:pts[j+2]},mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      let radius=hypot(b.x-a.x,b.y-a.y)/2;
      for(let k=i;k<=j;k+=5)radius=Math.max(radius,hypot(pts[k+1]-mx,pts[k+2]-my));
      const pad=radius-hypot(b.x-a.x,b.y-a.y)/2+1;let earliest=Infinity,id=null;
      for(const head of heads){const t=this.v10EarliestBlock(head,a,b,pad);if(t<earliest){earliest=t;id=head.id;}}
      const margin=earliest-pts[j]-.1,dt=pts[j]-pts[i],wt=dt/(1+pts[j]);
      if(margin<slack){slack=margin;enemy=id;}
      if(margin<=0)first=Math.min(first,pts[i]);
      exposure+=wt*clip(-margin/.6,0,1);weight+=wt;
      segments.push({t:pts[j],blockAt:Number.isFinite(earliest)?earliest:null,slack:Number.isFinite(margin)?margin:null,enemy:id});i=j;
    }
    return {risk:weight?exposure/weight:0,slack:Number.isFinite(slack)?slack:null,first:Number.isFinite(first)?first:null,enemy,certified:slack>0,scope:'observed_heads_turn_speed_bounds',segments};
  }
  v10Compare(a,b) {
    // Timing dominates width and food. Never use an additive width bonus to
    // overrule a lower closure risk. Commitment resolves near-equal costs only.
    return Number(b.closure.certified)-Number(a.closure.certified)||a.closure.risk-b.closure.risk||
      (b.closure.first??1e6)-(a.closure.first??1e6)||b.score-a.score;
  }
  v10Route(s,ver) {
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s),PW=this.v10ProbeWorld(W),ph=this.v4Physics(s.sc),root=this.v10Root(s,W,ph);
    const deadline=begin+(V.V10_BUDGET??90),edge=Math.min(Math.max(V.V10_EDGE??1450,(s.viewRadius??0)*.85),W.obs-150);
    const heads=this.v10Blockers(s,W),food=this.v9FoodGoals(s)[0],routes=[],complete=[];let expanded=0;
    const result=reason=>({algo:'v10',ver,t0:s.t,routes,certified:routes.some(r=>r.certified),reason,ms:performance.now()-begin,expanded,map:{radius:W.obs,target:edge},walls:W.walls});
    if(!root.ok)return result('prefix_collision');
    const accept=(guide,id)=>{
      const r=this.v10Follow(s,PW,ph,root,guide,deadline);
      if(!r.ok)return false;
      const closure=this.v10Closure(r.pts,heads);
      routes.push({...guide,id,t0:s.t,geometryOnly:false,drivable:true,certified:closure.certified,closure,pts:r.pts,actions:r.actions,clear:r.clear,duration:r.duration,length:r.travel,score:guide.score??0});return true;
    };
    const old=this.v10Committed;
    if(old&&s.t>=old.t0&&s.t-old.t0<2&&hypot(old.goal[0]-s.x,old.goal[1]-s.y)>220)accept(old,old.id);
    const canBoost=s.L>=(V.V2_MINL??30)&&((V.V10_ESCAPE_BOOST??1)||(V.V9_BOOST_ON&&food?.mass>=(V.V9_BOOST_MIN_MASS??48)));
    const stage=.6,depths=Math.min(60,Math.ceil(edge/Math.max(80,ph.cs)/stage*2)+3);
    let beam=[{st:root.st,t:root.t,pts:root.pts,actions:[],clear:root.clear,length:0,turn:0,family:0,boost:false,risk:0}];
    for(let depth=0;depth<depths&&beam.length&&performance.now()<deadline-10;depth++){
      const next=[];
      for(const n of beam){
        const angles=depth===0?Array.from({length:16},(_,i)=>s.ang+i*TAU/16):[n.st.h,n.st.h-.65,n.st.h+.65];
        for(const angle of angles)for(const boost of depth===0&&canBoost?[false,true]:[n.boost]){
          if(performance.now()>=deadline-10)break;
          const r=this.v9Roll(s,PW,ph,n.st,0,stage,n.t,angle,boost);expanded++;if(!r.ok)continue;
          const distance=hypot(r.st.x-s.x,r.st.y-s.y),length=n.length+hypot(r.st.x-n.st.x,r.st.y-n.st.y),turn=n.turn+Math.abs(wrap(r.st.h-n.st.h));
          let close=Infinity;for(const h of heads)close=Math.min(close,this.v10EarliestBlock(h,n.st,r.st,4));
          const risk=n.risk+stage*clip((r.t+.1-close)/.6,0,1)/(1+r.t);
          const gain=food?food.d-hypot(r.st.x-food.x,r.st.y-food.y):0;
          const centerGain=hypot(s.x-s.wall[0],s.y-s.wall[1])-hypot(r.st.x-s.wall[0],r.st.y-s.wall[1]);
          const score=distance-turn*12+gain*(V.V9_FOOD_W??2)*.08+(food?0:centerGain*(V.V9_CENTER_W??2)*.03);
          const q={...r,pts:[...n.pts,...r.pts],actions:[...n.actions,{start:n.t,end:r.t,target:angle,boost}],length,clear:Math.min(n.clear,r.clear),turn,score,risk,boost,family:depth===0?Math.floor((wrap(angle-s.ang)+PI)/(.5)):n.family};
          if(distance>=edge){complete.push(q);continue;}next.push(q);
        }
      }
      // Preserve distinct initial branches and speed choices while extending
      // all of them towards the requested probe boundary (not a 4.2 s cutoff).
      next.sort((a,b)=>a.risk-b.risk||b.score-a.score);const cells=new Set(),families=new Map();beam=[];
      for(const q of next){const key=[Math.round((q.st.x-s.x)/80),Math.round((q.st.y-s.y)/80),Math.round(wrap(q.st.h)/.5),q.boost].join(',');const family=q.family+':'+q.boost;if(cells.has(key)||(families.get(family)||0)>=1)continue;cells.add(key);families.set(family,(families.get(family)||0)+1);beam.push(q);if(beam.length>=12)break;}
      if(complete.length>=6)break;
    }
    complete.sort((a,b)=>a.risk-b.risk||b.score-a.score);
    for(const q of complete){
      if(performance.now()>=deadline)break;
      const angle=Math.atan2(q.st.y-s.y,q.st.x-s.x);
      if(routes.some(r=>Math.abs(wrap(Math.atan2(r.goal[1]-s.y,r.goal[0]-s.x)-angle))<.5))continue;
      const path=[];for(let i=0;i<q.pts.length;i+=5)path.push({x:q.pts[i+1],y:q.pts[i+2]});
      accept({path,goal:[q.st.x,q.st.y],length:q.length,kind:'escape',angle,useBoost:q.boost,lookScale:.65,score:q.score},`${ver}:${routes.length}`);
      if(routes.length>=(V.V9_ROUTES??3))break;
    }
    routes.sort((a,b)=>this.v10Compare(a,b));this.v10Committed=routes[0]||null;
    return result(routes.length?'long_probe':performance.now()>=deadline-10?'budget':'no_drivable_route');
  }
