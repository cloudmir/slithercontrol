import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const cfg=JSON.parse(fs.readFileSync('params.json')),V={...cfg.defaults,...cfg.presets.v9_maze.values,V9_BUDGET:500};
const base={x:30000,y:30000,ang:0,sp:6.12,sc:2,L:1000,t:10,cmdNow:0,boostNow:false,wall:[30000,30000,20000],segs:[],sid:[],heads:[],hid:[],food:[],own:[]};
const walls=(lines)=>({segs:lines.flat(),sid:lines.map((_,i)=>i+1)});
const cases={open:{},corridor:walls([[29000,29900,32000,29900,20],[29000,30100,32000,30100,20]]),frontWall:walls([[30200,29300,30200,30700,20]]),closed:walls([[29700,29700,30300,29700,20],[30300,29700,30300,30300,20],[30300,30300,29700,30300,20],[29700,30300,29700,29700,20]]),uTurn:walls([[29800,29800,30400,29800,20],[30400,29800,30400,30200,20],[30400,30200,29800,30200,20]])};
const out={};
for(const [name,patch] of Object.entries(cases)){
 const s={...base,...patch},p=new SlpPilot.Pilot(V,'safe'),r=p.v9Route(s,1),local=new SlpPilot.Pilot(V,'safe');local.step({...s,route:r});
 out[name]={routes:r.routes.length,reason:r.reason,ms:r.ms,expanded:r.expanded,used:local.last.trace.v9_routes};
 console.log(name,out[name]);
 // Independent dense geometry check of every drawn line segment + heading speed.
 for(const route of r.routes){const P=route.pts,ph=p.v4Physics(s.sc);
  for(let k=5;k<P.length;k+=5){const dt=P[k]-P[k-5],dh=Math.atan2(Math.sin(P[k+3]-P[k-2]),Math.cos(P[k+3]-P[k-2]));assert(Math.abs(dh)<=ph.w*dt+1e-7);
   for(let j=0;j<=10;j++){const f=j/10,x=P[k-4]+f*(P[k+1]-P[k-4]),y=P[k-3]+f*(P[k+2]-P[k-3]);
    for(let m=0;m<s.segs.length;m+=5){const [ax,ay,bx,by,r]=s.segs.slice(m,m+5),dx=bx-ax,dy=by-ay,u=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));assert(Math.hypot(x-ax-u*dx,y-ay-u*dy)>=r+14.5*s.sc+V.V9_MARGIN-1e-6,`${name} wall intersection`)}
   }
  }
 }
 if(name==='closed')assert.equal(r.routes.length,0);else assert(r.routes.length>0,`${name} no route`);
 if(name==='open')assert(r.routes.length>=3);
 assert.equal(local.last.trace.v9_routes,r.routes.length);
}
fs.writeFileSync('research/v9_20261001/check.json',JSON.stringify(out,null,2));
