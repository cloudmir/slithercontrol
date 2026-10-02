import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const d=JSON.parse(fs.readFileSync('research/v10_death_cause_20261001/input.json')),out=[];const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
for(const t of [103.904,104.126,104.252,104.29,104.335]){
 const s=d.frames.reduce((a,b)=>Math.abs(a.t-t)<Math.abs(b.t-t)?a:b),wireHistory=[];let ang=d.frames[0].ang,boost=d.frames[0].boost;
 wireHistory.push({t:-2,ang,boost,estimated:true});
 for(let i=0;i<d.packets.length;i+=2){const at=d.packets[i]/1000,b=d.packets[i+1];if(at>s.t)break;if(b<=250)ang=b*2*Math.PI/251;else if(b===253)boost=true;else if(b===254)boost=false;else continue;wireHistory.push({t:at,ang,boost,byte:b});}
 const p=new SlpPilot.Pilot(d.values,'safe');p.step(d.frames[0]);p.v10ComputeMs=3;const wired={...s,wireHistory,wireNow:{ang,boost},sendWaitMs:0,boostWaitMs:0},r=p.v10Root(wired,p.v10World(s,true),p.v4Physics(s.sc)),wanted=s.t+r.t,lo=d.frames.filter(q=>q.t<=wanted).at(-1),hi=d.frames.find(q=>q.t>=wanted);if(!lo||!hi)continue;const u=(wanted-lo.t)/(hi.t-lo.t),actual={x:lo.x+u*(hi.x-lo.x),y:lo.y+u*(hi.y-lo.y),ang:lo.ang+u*wrap(hi.ang-lo.ang)};
 out.push({t:s.t,predictedTurn:wrap(r.st.h-s.ang),actualTurn:wrap(actual.ang-s.ang),positionError:Math.hypot(r.st.x-actual.x,r.st.y-actual.y),rootSafe:r.ok,rootGap:r.clear});
}assert(out.at(-1).predictedTurn>0);fs.writeFileSync('research/v10_wire_fix_20261001/replay.json',JSON.stringify({rows:out,limits:['Historical send phase unavailable: diagnostic sets both gate waits0','Packet+TRACK_LAT .06 is model; interpolation used; not counterfactual survival']},null,2));console.log(out);
