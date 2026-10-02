  // T6 uses the T5 surface rails as navigation vertices. Geometric guidance
  // is kept separate from swept, time-dependent, physically drivable motion.
  t6Graph(s, W) {
    const begin=performance.now(),edge=Math.min(this.values.T6_EDGE??650,W.obs-180),spacing=64;
    const nodes=[],bins=new Map(),dedup=new Set(),key=(x,y)=>Math.floor(x/128)+','+Math.floor(y/128);
    const add=(x,y,rail=false)=>{
      if(hypot(x-s.x,y-s.y)>edge+60)return;
      const tag=Math.round(x/10)+','+Math.round(y/10);if(dedup.has(tag))return;
      const p={x,y,rail},clear=W.check(p,p,0,0,.4,false);if(clear<0)return;
      dedup.add(tag);p.clear=clear;p.i=nodes.length;nodes.push(p);const k=key(x,y);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p.i);
    };
    add(s.x,s.y);if(!nodes.length)return {routes:[],nodes:0,rails:0,reason:'root_inside',ms:performance.now()-begin};
    const rails=t5Contours(s,(this.values.T4_GAP??-5)+2);
    // Downsample arc length, retaining endpoints; every enemy contributes.
    for(const rail of rails){const p=rail.points;for(let i=0;i+3<p.length;i+=2){const d=hypot(p[i+2]-p[i],p[i+3]-p[i+1]),n=Math.max(1,Math.ceil(d/spacing));
      for(let j=0;j<n;j++)add(p[i]+(p[i+2]-p[i])*j/n,p[i+1]+(p[i+3]-p[i+1])*j/n,true);}add(p.at(-2),p.at(-1),true);}
    for(let x=-Math.ceil(edge/spacing);x<=Math.ceil(edge/spacing);x++)for(let y=-Math.ceil(edge/spacing);y<=Math.ceil(edge/spacing);y++)add(s.x+x*spacing,s.y+y*spacing);
    const dist=new Float64Array(nodes.length).fill(Infinity),prev=new Int32Array(nodes.length).fill(-1),done=new Uint8Array(nodes.length),heap=[];
    const push=(id,d)=>{heap.push([id,d]);let c=heap.length-1;while(c){const p=(c-1)>>1;if(heap[p][1]<=d)break;[heap[p],heap[c]]=[heap[c],heap[p]];c=p;}};
    const pop=()=>{const q=heap[0],end=heap.pop();if(heap.length){heap[0]=end;let c=0;for(;;){let k=c,l=c*2+1,r=l+1;if(l<heap.length&&heap[l][1]<heap[k][1])k=l;if(r<heap.length&&heap[r][1]<heap[k][1])k=r;if(k===c)break;[heap[c],heap[k]]=[heap[k],heap[c]];c=k;}}return q;};
    const exits=[];let checks=0,complete=true;dist[0]=0;push(0,0);
    while(heap.length){const [i,d]=pop();if(done[i])continue;done[i]=1;const p=nodes[i],radius=hypot(p.x-s.x,p.y-s.y);
      if(radius>=edge-45&&p.clear>=20){const a=Math.atan2(p.y-s.y,p.x-s.x),end={x:p.x+120*Math.cos(a),y:p.y+120*Math.sin(a)};
        if(W.check(p,end,0,0,1,false)>=0)exits.push(i);}
      if((checks>300&&performance.now()-begin>18)||checks>24000){complete=false;break;}
      const bx=Math.floor(p.x/128),by=Math.floor(p.y/128);
      for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const j of bins.get(x+','+y)||[]){
        if(done[j])continue;const q=nodes[j],len=hypot(p.x-q.x,p.y-q.y);if(len>125||len<1)continue;
        const cost=d+len*(1+Math.max(0,8-Math.min(p.clear,q.clear))*.006);if(cost>=dist[j])continue;
        checks++;if(W.check(p,q,0,0,.5,false)<0)continue;dist[j]=cost;prev[j]=i;push(j,cost);
      }
    }
    exits.sort((a,b)=>dist[a]-dist[b]);const routes=[];
    for(const i of exits){const end=nodes[i],a=Math.atan2(end.y-s.y,end.x-s.x);
      if(routes.some(r=>Math.abs(wrap(a-r.angle))<.65))continue;
      const chain=[];for(let j=i;j>=0;j=prev[j])chain.push(nodes[j]);chain.reverse();const points=[];for(const q of chain)points.push(q.x,q.y);
      routes.push({points,goal:{x:end.x,y:end.y},angle:a,length:dist[i]});if(routes.length===3)break;
    }
    return {routes,nodes:nodes.length,rails:rails.length,checks,reason:routes.length?'connected':complete?'no_exit':'budget',ms:performance.now()-begin};
  }

  t6GuideAt(route,st,look=100) {
    const P=route.points;let near=null;
    for(let i=0;i+3<P.length;i+=2){const dx=P[i+2]-P[i],dy=P[i+3]-P[i+1],len=hypot(dx,dy),u=clip(((st.x-P[i])*dx+(st.y-P[i+1])*dy)/(len*len||1),0,1),x=P[i]+u*dx,y=P[i+1]+u*dy,d=hypot(x-st.x,y-st.y);
      if(!near||d<near.d)near={i,u,x,y,d,len};}
    if(!near)return {angle:st.h,remaining:Infinity};
    let remaining=(1-near.u)*near.len;
    for(let i=near.i+2;i+3<P.length;i+=2)remaining+=hypot(P[i+2]-P[i],P[i+3]-P[i+1]);
    let x=near.x,y=near.y,walk=look;
    for(let i=near.i;i+3<P.length;i+=2){const dx=P[i+2]-x,dy=P[i+3]-y,len=hypot(dx,dy);if(len>=walk){x+=dx*walk/(len||1);y+=dy*walk/(len||1);break;}walk-=len;x=P[i+2];y=P[i+3];}
    return {angle:Math.atan2(y-st.y,x-st.x),remaining:remaining+near.d*2,d:near.d};
  }

  t6Step(s) {
    const started=performance.now(),V=this.values,W=this.t6World(s),ph=this.v4Physics(s.sc),root=this.v9Root(s,W,ph);
    const cache=this.t6Guide,needs=!cache||s.t-cache.at>.30||hypot(s.x-cache.x,s.y-cache.y)>80||cache.invalid;
    let graph=cache?.graph;if(needs){graph=this.t6Graph(s,W);this.t6Guide={graph,at:s.t,x:s.x,y:s.y,invalid:false};}
    const routes=graph.routes,canBoost=!!(V.T6_BOOST??1)&&s.L>=(V.V2_MINL??200),quant=a=>(Math.floor(((a%TAU+TAU)%TAU)/TAU*251)+.5)*TAU/251;
    const previous=this.t6Goal;
    const metric=(q)=>{
      if(!routes.length)return -hypot(q.st.x-s.x,q.st.y-s.y)/ph.vb-Math.min(100,q.clear)/700;
      let best=Infinity;
      routes.forEach((r,i)=>{const g=this.t6GuideAt(r,q.st);const hold=previous&&hypot(previous.x-r.goal.x,previous.y-r.goal.y)<100?.12:0;
        const score=g.remaining/ph.vb+Math.max(0,6-q.clear)*.004-hold;if(score<best){best=score;q.route=i;}});return best;
    };
    let pool=[],safeCount=0,mode='escape',chosen=null,depth=0;
    if(root.ok){
      const angles=[];for(let i=0;i<16;i++)angles.push(s.ang+i*TAU/16);
      for(const r of routes)angles.push(this.t6GuideAt(r,root.st).angle);
      const unique=[...new Set(angles.map(quant))];
      // Check every first command before spending time on deeper branches.
      for(const cmd of unique)for(const boost of canBoost?[false,true]:[false]){
        const r=this.v9Roll(s,W,ph,root.st,0,.55,root.t,cmd,boost);
        if(!r.ok)continue;safeCount++;const q={...r,cmd,boost,pts:[...root.pts,...r.pts],clear:Math.min(root.clear,r.clear),route:0};q.score=metric(q);pool.push(q);
      }
      pool.sort((a,b)=>a.score-b.score);pool=pool.slice(0,6);chosen=pool[0];
      const deadline=performance.now()+16;
      for(let layer=0;layer<8&&pool.length&&performance.now()<deadline;layer++){
        const next=[];for(const q of pool){const aim=routes.length?this.t6GuideAt(routes[q.route],q.st).angle:q.st.h;
          for(const cmd of [...new Set([aim,aim-.6,aim+.6,q.st.h,q.st.h-1.2,q.st.h+1.2].map(quant))])for(const boost of canBoost?[false,true]:[false]){
            const r=this.v9Roll(s,W,ph,q.st,0,.25,q.t,cmd,boost);if(!r.ok)continue;
            const z={...r,cmd:q.cmd,boost:q.boost,pts:[...q.pts,...r.pts],clear:Math.min(q.clear,r.clear),route:q.route};z.score=metric(z);next.push(z);
          }
          if(performance.now()>deadline)break;
        }
        // Keep alternatives with distinct position, heading and speed.
        next.sort((a,b)=>a.score-b.score);const bins=new Set();pool=[];
        for(const q of next){const k=Math.round(q.st.x/24)+','+Math.round(q.st.y/24)+','+Math.round(q.st.h/.3)+','+Math.round(q.st.v/80);if(bins.has(k))continue;bins.add(k);pool.push(q);if(pool.length===6)break;}
        if(pool.length){chosen=pool[0];depth=layer+1;}
      }
    }
    let unsafe=false;
    if(!chosen){
      // A failed latency root / all rejected candidates is not a certified
      // straight-ahead route. Evaluate full recovery arcs without early exit.
      unsafe=true;mode='recovery';this.t6Guide.invalid=true;
      const choices=[];
      for(let i=0;i<24;i++){const cmd=quant(s.ang+i*TAU/24);let st={x:s.x,y:s.y,h:s.ang,v:s.sp*PX_PER_SP},clear=Infinity,exposure=0,points=[0,s.x,s.y,s.ang,s.boostNow?1:0];
        for(let j=0;j<30;j++){const t=j*.025,next=this.v4Adv(st,j*.025<(V.TRACK_LAT??.10)?(s.cmdNow??s.ang):cmd,j*.025<(V.TRACK_LAT??.10)?!!s.boostNow:false,.025,ph),g=W.check(st,next,t,t+.025,.2);clear=Math.min(clear,g);exposure+=Math.max(0,-g)*.025;st=next;points.push(t+.025,st.x,st.y,st.h,0);}
        const end=W.check(st,st,.75,.75,.2),score=-exposure+end*.05+clear*.02;choices.push({cmd,boost:false,pts:points,clear,t:.75,st,score});
      }
      chosen=choices.sort((a,b)=>b.score-a.score)[0];
    }else if(!routes.length){mode='search';this.t6Guide.invalid=graph.reason==='budget';}
    const guide=routes[chosen.route??0],pts=[];for(let i=0;i<chosen.pts.length;i+=5)pts.push(chosen.pts[i+1],chosen.pts[i+2]);
    if(guide&&!unsafe)this.t6Goal={...guide.goal};else this.t6Goal=null;
    const trace={mode:unsafe?'emergency':'escape',boost:chosen.boost,cmd:r1(deg(chosen.cmd)),L:s.L,sc:r2(s.sc),prof:this.profile,nh:s.hid.length,t6_on:1,t6_phase:mode,t6_routes:routes.length,t6_nodes:graph.nodes,t6_rails:graph.rails,t6_graph_reason:graph.reason,t6_graph_ms:graph.ms,t6_root_safe:root.ok,t6_clear:chosen.clear,t6_checked_s:chosen.t,t6_depth:depth,t6_safe_commands:safeCount,t6_goal:guide?.goal??null,t6_ms:performance.now()-started,t6_gap:V.T4_GAP??-5};
    this.last={mode:trace.mode,trace,draw:{chosen:pts,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro:W.ro,analysis:null,t6Guides:routes.map(r=>r.points),t6Unsafe:unsafe,t6Path:pts}};
    this.prev=chosen.cmd;this.prevBoost=chosen.boost;return [chosen.cmd,chosen.boost];
  }
