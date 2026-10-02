  // V10 contracts: static geometric guides != time-validated local trajectories.
  // Three independent workers; only the fast worker returns actuator commands.
  v10World(s, local = false) {
    const V=this.values, radius=local?620:(V.V10_OBS??1800);
    const segs=[],sid=[];
    for(let i=0;i<s.segs.length;i+=5){const a=s.segs;
      if(Math.min(a[i],a[i+2])-a[i+4]>s.x+radius || Math.max(a[i],a[i+2])+a[i+4]<s.x-radius || Math.min(a[i+1],a[i+3])-a[i+4]>s.y+radius || Math.max(a[i+1],a[i+3])+a[i+4]<s.y-radius)continue;
      segs.push(...a.slice(i,i+5));sid.push(s.sid?.[i/5]);
    }
    const saved=this.values;
    this.values={...V,V9_OBS:radius,V9_MARGIN:V.V10_MARGIN??3};
    // Uncertain last-alive probe points do not justify subtracting a fitted death
    // offset. Use visible radii + explicit margin; retain raw calibration data.
    const W=this.v9World({...s,segs,sid,heads:[]});this.values=saved;
    const staticCheck=W.check,headList=[];
    for(let i=0;i<s.heads.length;i+=5){const [x,y,h,sp,sc]=s.heads.slice(i,i+5);
      if(hypot(x-s.x,y-s.y)>radius+550)continue;
      const hist=s.threat?.heads?.find(q=>q.id===s.hid?.[i/5]);
      headList.push({x,y,h,v:sp*PX_PER_SP,r:R*sc,w:hist?.w??0});
    }
    const pointD=(ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,u=clip(-(ax*dx+ay*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);return hypot(ax+u*dx,ay+u*dy);};
    const predict=(h,t,boost)=>{
      const v=boost?Math.max(h.v,BOOST_SP*PX_PER_SP):h.v;
      // Constant turn estimate, capped horizon: this is a forecast, not intent.
      const w=clip(h.w,-2,2),a=h.h+w*t/2,d=v*t;
      return {x:h.x+Math.cos(a)*d,y:h.y+Math.sin(a)*d};
    };
    W.check=(a,b,t0=0,t1=t0,pad=0,dynamic=true)=>{
      let gap=staticCheck(a,b,t0,t1,pad,false);if(gap<0||!dynamic)return gap;
      for(const h of headList)for(const boost of [false,true]){
        const p=predict(h,t0,boost),q=predict(h,t1,boost),unc=(V.V10_HEAD_PAD??12)*Math.min(t1,1.5);
        const g=pointD(a.x-p.x,a.y-p.y,b.x-q.x,b.y-q.y)-W.ro-h.r-W.margin-pad-unc;
        gap=Math.min(gap,g);if(gap<0)return gap;
        // Newly laid body is occupied up to arrival time, never a permanent
        // whole-horizon cone. Approximate curved trail with short swept chords.
        for(let t=0;t<t1;t+=.2){const u=predict(h,t,boost),v=predict(h,Math.min(t+.2,t1),boost);
          const dx=v.x-u.x,dy=v.y-u.y;
          const near=p=>{const f=clip(((p.x-u.x)*dx+(p.y-u.y)*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1);return hypot(p.x-u.x-f*dx,p.y-u.y-f*dy);};
          gap=Math.min(gap,Math.min(near(a),near(b))-W.ro-h.r-W.margin-pad-unc-Math.max(h.v,434)*.2*Math.abs(h.w)*.2/8);
          if(gap<0)return gap;
        }
      }return gap;
    };
    return W;
  }
  v10Threat(s,ver=0){
    const t0=performance.now(),previous=this.v10History,heads=[],sectors=new Set();let awayX=0,awayY=0,attack=0,tailX=0,tailY=0;
    for(let i=0;i<s.heads.length;i+=5){const [x,y,h,sp,sc]=s.heads.slice(i,i+5),id=s.hid?.[i/5],dx=s.x-x,dy=s.y-y,d=hypot(dx,dy),old=previous?.heads.find(q=>q.id===id),dt=previous?s.t-previous.t0:0;
      const w=old&&dt>.01&&dt<1?wrap(h-old.h)/dt:0,v=sp*PX_PER_SP;
      const toward=(dx*Math.cos(h)+dy*Math.sin(h))/Math.max(1,d),score=toward>.4?clip((700-d)/700,0,1)*toward:0;
      attack=Math.max(attack,score);awayX+=dx/Math.max(1,d)*score;awayY+=dy/Math.max(1,d)*score;
      // Prefer the direction behind a threatening head. This does not assume
      // that a truncated observed body endpoint is the actual tail.
      tailX-=Math.cos(h)*score;tailY-=Math.sin(h)*score;
      heads.push({id,x,y,h,v,w,score});
    }
    let left=Infinity,right=Infinity,minGap=Infinity;
    for(let i=0;i<s.segs.length;i+=5){const gap=segDist(s.x,s.y,s.segs,i/5)-R*s.sc-s.segs[i+4];minGap=Math.min(minGap,gap);
      if(gap>350)continue;
      const ax=s.segs[i]-s.x,ay=s.segs[i+1]-s.y,bx=s.segs[i+2]-s.x,by=s.segs[i+3]-s.y;
      for(let j=0;j<=4;j++){const a=Math.atan2(ay+(by-ay)*j/4,ax+(bx-ax)*j/4);sectors.add(Math.floor((a+PI)*24/TAU)%24);}
      const a=wrap(Math.atan2(ay+by,ax+bx)-s.ang);if(Math.abs(a)<2.5){if(a<0)left=Math.min(left,gap);else right=Math.min(right,gap);}
    }
    const coverage=sectors.size/24,wall=s.wall[2]-hypot(s.x-s.wall[0],s.y-s.wall[1])-R*s.sc;
    const corridor=left<100&&right<100,closing=previous&&s.t-previous.t0<1?(previous.gap-minGap)/Math.max(.02,s.t-previous.t0):0;
    let strategy=wall<160?'arena':attack>.22?'intercept':coverage>.6?'wrap':corridor?'corridor':minGap<80?'body':'cruise';
    const threat={t0:s.t,ver,heads,attack,coverage,gap:minGap,closing,strategy,away:Math.atan2(awayY,awayX),tail:Math.atan2(tailY,tailX),ms:performance.now()-t0};
    this.v10History=threat;return threat;
  }
  v10Route(s,ver){
    const begin=performance.now(),V=this.values,W=this.v10World(s),cell=V.V10_CELL??24,edge=Math.min(V.V10_EDGE??1450,W.obs-80),budget=V.V10_BUDGET??90;
    const foods=this.v9FoodGoals(s),food=foods[0],T=s.threat&&s.t-s.threat.t0<.8?s.threat:this.v10Threat(s);
    const goals=[];if(food&&food.d<edge)goals.push({x:food.x,y:food.y,kind:'food'});
    const centerA=Math.atan2(s.wall[1]-s.y,s.wall[0]-s.x),cd=hypot(s.x-s.wall[0],s.y-s.wall[1]);
    let sectors=Array.from({length:16},(_,i)=>{const a=s.ang+i*TAU/16;let score=Math.cos(wrap(a-s.ang));
      if(food)score+=(V.V9_FOOD_W??2)*Math.cos(wrap(a-Math.atan2(food.y-s.y,food.x-s.x)));
      else score+=(V.V9_CENTER_W??2)*clip((cd-2000)/2000,0,1)*Math.cos(wrap(a-centerA));
      if(T.strategy!=='cruise')score+=(V.V10_TAIL_W??2)*T.attack*Math.cos(wrap(a-T.tail))+2*T.coverage*Math.cos(wrap(a-T.away));
      return {a,score};}).sort((a,b)=>b.score-a.score);
    for(const q of sectors)goals.push({x:s.x+edge*Math.cos(q.a),y:s.y+edge*Math.sin(q.a),kind:'escape'});
    const routes=[];let expanded=0,exhausted=false;
    const collisionCache=new Map();
    const point=(x,y)=>({x:s.x+x*cell,y:s.y+y*cell});
    const edgeOK=(x,y,nx,ny)=>{const key=[x,y,nx,ny].join(',');if(collisionCache.has(key))return collisionCache.get(key);const g=W.check(point(x,y),point(nx,ny),0,0,.2,false);collisionCache.set(key,g);return g;};
    for(const goal of goals){
      if(routes.length>=(V.V9_ROUTES??3)||performance.now()-begin>budget){exhausted=true;break;}
      const perEnd=Math.min(begin+budget,performance.now()+Math.max(8,budget/5)),heap=[];
      const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
      const pop=()=>{const n=heap[0],v=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=v.f)break;heap[i]=heap[c];i=c;}heap[i]=v;}return n;};
      const h=(x,y)=>hypot(s.x+x*cell-goal.x,s.y+y*cell-goal.y),cost=new Map([['0,0',0]]);
      push({x:0,y:0,g:0,f:h(0,0),p:null});let found=null;
      while(heap.length){if((expanded++&31)===0&&performance.now()>perEnd)break;const n=pop(),pos=point(n.x,n.y);if(n.g>cost.get(n.x+','+n.y))continue;
        if(h(n.x,n.y)<cell*1.6 && W.check(pos,goal,0,0,.2,false)>=0){found=n;break;}
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
          const x=n.x+dx,y=n.y+dy;if(hypot(x*cell,y*cell)>W.obs-30)continue;
          const gap=edgeOK(n.x,n.y,x,y);if(gap<0)continue;
          const g=n.g+cell*hypot(dx,dy)*(1+1/(Math.max(1,gap)+4)),key=x+','+y;
          if(g>=(cost.get(key)??Infinity))continue;cost.set(key,g);push({x,y,g,f:g+1.12*h(x,y),p:n});
        }
      }
      if(!found)continue;
      let points=[goal];for(let n=found;n;n=n.p)points.push(point(n.x,n.y));points.reverse();
      // Exact line-of-sight simplification; never smooth across a capsule wall.
      const path=[points[0]];let i=0;
      while(i<points.length-1){let j=points.length-1;while(j>i+1&&W.check(points[i],points[j],0,0,.3,false)<0)j--;path.push(points[j]);i=j;}
      let length=0;for(let j=1;j<path.length;j++)length+=hypot(path[j].x-path[j-1].x,path[j].y-path[j-1].y);
      const first=path[1],angle=Math.atan2(first.y-s.y,first.x-s.x);
      if(goal.kind==='escape'&&routes.some(r=>r.kind==='escape'&&Math.abs(wrap(r.angle-angle))<.3))continue;
      routes.push({path,kind:goal.kind,angle,length,target:food||null,goal:[goal.x,goal.y],geometryOnly:true});
    }
    return {algo:'v10',ver,t0:s.t,routes,reason:routes.length?'mapped':exhausted?'budget':'no_map_route',certified:false,ms:performance.now()-begin,expanded,map:{radius:W.obs,cell},walls:W.walls};
  }
  v10Step(s){
    TURN_FIX=!!this.values.TURN_FIX;
    const begin=performance.now(),V=this.values,W=this.v10World(s,true),ph=this.v4Physics(s.sc),root=this.v9Root(s,W,ph);
    const T=s.threat&&s.t-s.threat.t0>=0&&s.t-s.threat.t0<.65?s.threat:this.v10Threat(s),foods=this.v9FoodGoals(s),food=foods[0];
    const source=s.route?.algo==='v10'&&s.t-s.route.t0>=0&&s.t-s.route.t0<(V.V10_ROUTE_AGE??.9)?s.route:null;
    const guides=source?.routes||[],look=Math.max(110,ph.cs*.7),candidates=[];
    for(let n=0;n<guides.length;n++){
      const route=guides[n];if(route.kind==='food'&&!food)continue;
      let nearest=0,dist=Infinity;
      for(let i=0;i<route.path.length;i++){const d=hypot(route.path[i].x-root.st.x,route.path[i].y-root.st.y);if(d<dist){dist=d;nearest=i;}}
      // Project onto the path before choosing a forward lookahead. A simplified
      // long segment has only two endpoints; nearest vertex alone goes backward.
      let aim=null,bestDist=Infinity;
      for(let i=1;i<route.path.length;i++){
        const a=route.path[i-1],b=route.path[i],dx=b.x-a.x,dy=b.y-a.y,len=hypot(dx,dy),u=clip(((root.st.x-a.x)*dx+(root.st.y-a.y)*dy)/Math.max(1,len*len),0,1),d=hypot(root.st.x-a.x-u*dx,root.st.y-a.y-u*dy);
        if(d<bestDist){bestDist=d;const f=Math.min(1,u+look/Math.max(1,len));aim={x:a.x+f*dx,y:a.y+f*dy};}
      }
      if(aim)candidates.push({angle:Math.atan2(aim.y-root.st.y,aim.x-root.st.x),route:n,aim});
    }
    if(!candidates.length){let a=food?Math.atan2(food.y-s.y,food.x-s.x):s.ang;
      if(!food&&hypot(s.x-s.wall[0],s.y-s.wall[1])>2500&&(V.V9_CENTER_W??2)>0)a=Math.atan2(s.wall[1]-s.y,s.wall[0]-s.x);
      candidates.push({angle:a,route:-1});}
    if(T.strategy==='intercept'||T.strategy==='wrap')candidates.push({angle:T.away,route:-1},{angle:T.tail,route:-1});
    if(T.strategy==='arena')candidates.push({angle:Math.atan2(s.wall[1]-s.y,s.wall[0]-s.x),route:-1});
    const base=candidates[0].angle;
    for(const da of [0,-.25,.25,-.6,.6,-1.2,1.2,-2.2,2.2,PI])candidates.push({angle:root.st.h+da,route:-1});
    const choices=[];let checked=0,budgetHit=false;
    for(const c of candidates)for(const boost of [false,true]){
      const escape=T.strategy!=='cruise';
      if(boost&&!(escape?(V.V10_ESCAPE_BOOST??1):(V.V9_BOOST_ON&&food&&food.mass>=(V.V9_BOOST_MIN_MASS??48)&&food.d>(V.V9_BOOST_MIN_DIST??180))))continue;
      // A complete first trajectory is always checked. Budget never converts an
      // unchecked path into a safe candidate; count actual overruns in telemetry.
      if(checked>=4&&performance.now()-begin>(V.V10_LOCAL_MS??3)){budgetHit=true;continue;}
      const horizon=V.V10_LOCAL_H??.9;
      const r=this.v9Roll(s,W,ph,root.st,0,horizon,root.t,c.angle,boost);checked++;
      const movement=hypot(r.st.x-root.st.x,r.st.y-root.st.y);
      let score=(r.ok?10000:0)+r.t*600+Math.min(50,Math.max(-100,r.clear))*.6;
      score+=movement*(.5+Math.cos(wrap(c.angle-base))*.35);
      if(c.route>=0)score+=100-c.route*15;
      if(this.v10LastAngle!==undefined)score+=20*Math.cos(wrap(c.angle-this.v10LastAngle));
      if(escape)score+=60*T.attack*Math.cos(wrap(c.angle-T.tail))+70*T.coverage*Math.cos(wrap(c.angle-T.away));
      if(boost)score+=escape?70:30;
      choices.push({...c,...r,score,boost});
    }
    choices.sort((a,b)=>b.score-a.score);const best=choices[0];this.v10LastAngle=best.angle;
    const unsafe=!root.ok||!best.ok,pts=[...root.pts,...best.pts],flat=p=>{const out=[];for(let i=0;i<p.length;i+=5)out.push(p[i+1],p[i+2]);return out;};
    // Only one short command slice may be executed. Expired plans are discarded
    // by the browser tracker; a guide is never replayed as actuator commands.
    const controls=[{start:root.t,end:Math.min(best.t,root.t+.13),target:best.angle,boost:best.boost}],ms=performance.now()-begin;
    const trace={mode:'v10'+(unsafe?'emergency':T.strategy),cmd:r1(deg(best.angle)),boost:best.boost,n_safe:choices.filter(q=>q.ok).length,cause:source?.reason??'pending',v10_strategy:T.strategy,v10_local_ms:ms,v10_budget_hit:budgetHit||ms>(V.V10_LOCAL_MS??3),v10_checked:checked,v10_clear:best.clear,v10_root_safe:root.ok,v10_map_ms:source?.ms??0,v10_map_age:source?s.t-source.t0:-1,v10_routes:guides.length,v10_threat_ms:T.ms,v10_attack:T.attack,v10_closing:T.closing,v10_coverage:T.coverage,v10_geometry_only:1,L:s.L,sc:s.sc};
    this.last={trace,mode:trace.mode,plan:pts,controls,draw:{chosen:flat(pts),localPath:flat(pts),localUnsafe:unsafe,v9At:s.t,v9Paths:guides.map(r=>r.path.flatMap(p=>[p.x,p.y])),v9Walls:source?.walls??W.walls,v9Reason:source?.reason??'pending',v9FoodPath:guides[0]?.kind==='food',mazePath:[],safe:[],near:[],gaps:[],goal:food?[food.x,food.y]:null,ro:W.ro}};
    this.prev=best.angle;this.prevBoost=best.boost;return [best.angle,best.boost];
  }
