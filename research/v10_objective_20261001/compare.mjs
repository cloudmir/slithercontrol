import fs from 'node:fs';import vm from 'node:vm';import zlib from 'node:zlib';
vm.runInThisContext(fs.readFileSync('ext/pilot.js','utf8'));
const runs=['runs/v10_recovery_live_20261001_155641/slp_01','runs/v10_wire_live_20261001_192903/slp_01','runs/v10_twenty_20261001_195831/slp_01','runs/v10_twenty_20261001_195831/slp_02'],results=[];
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
for(const run of runs){const rec=JSON.parse(fs.readFileSync(run+'.json')),fs0=JSON.parse(zlib.gunzipSync(fs.readFileSync(run+'_box.json.gz'))).frames,lg=JSON.parse(zlib.gunzipSync(fs.readFileSync(run+'_log.json.gz'))),rows=lg.log.map(q=>Object.fromEntries(lg.keys.map((k,i)=>[k,q[i]]))),p=new SlpPilot.Pilot(rec.values,rec.profile);p.step(fs0[0]);const scores=[];
 for(let i=8;i+4<fs0.length;i+=5){const s=fs0[i],row=rows.reduce((a,b)=>Math.abs(a.t-s.t)<Math.abs(b.t-s.t)?a:b);if(!row.mode?.startsWith('v10')||!s.cmdHistory?.length)continue;
 const H=.05,lag=rec.values.TRACK_LAT,lo=fs0.filter(q=>q.t<=s.t+H).at(-1),hi=fs0.find(q=>q.t>=s.t+H);if(!lo||!hi||hi.t-lo.t>.1)continue;
 // 50ms horizon < retained 60ms lag: no future-issued command can arrive.
 if(lag<H)continue;
 let wh=s.wireHistory;if(!wh){const pk=rec.track.packets;let ang=fs0[0].ang,boost=!!s.boost;wh=[{t:-2,ang,boost}];for(let j=0;j<pk.length;j+=2){const t=pk[j]/1000,b=pk[j+1];if(t>s.t)break;if(b<=250)ang=b*2*Math.PI/251;else if(b===253)boost=true;else if(b===254)boost=false;else continue;wh.push({t,ang,boost});}}
 const ph=p.v4Physics(s.sc),u=(s.t+H-lo.t)/Math.max(1e-9,hi.t-lo.t),actual={x:lo.x+u*(hi.x-lo.x),y:lo.y+u*(hi.y-lo.y),h:lo.ang+u*wrap(hi.ang-lo.ang)};
 function simulate(history){let st={x:s.x,y:s.y,h:s.ang,v:s.sp*31},t=0;while(t<H-1e-9){const stamp=s.t+t-lag;let q=history[0];for(const a of history){if(a.t>stamp+1e-9)break;q=a;}const next=history.find(q=>q.t>stamp+1e-9),dt=Math.min(.01,H-t,next?next.t-stamp:Infinity);st=p.v4Adv(st,q.ang,!!q.boost,dt,ph);t+=dt;}return {heading_deg:Math.abs(wrap(st.h-actual.h))*180/Math.PI,position_px:Math.hypot(st.x-actual.x,st.y-actual.y),sign:Math.sign(wrap(st.h-s.ang))};}
 const old=simulate(s.cmdHistory),wire=simulate(wh);scores.push({t:s.t,old,wire,actualSign:Math.sign(wrap(actual.h-s.ang))});
 }
 function summary(key){const h=scores.map(q=>q[key].heading_deg).sort((a,b)=>a-b),x=scores.map(q=>q[key].position_px);return {heading_mean_deg:mean(h),heading_p95_deg:h[Math.floor(h.length*.95)],position_mean_px:mean(x),wrong_turn_over_3deg:scores.filter(q=>q[key].sign&&q.actualSign&&q[key].sign!==q.actualSign&&q[key].heading_deg>3).length};}
 results.push({run,n:scores.length,applied_input:summary('old'),actual_wire:summary('wire'),changes:rec.changes?.length??0,examples:scores.filter(q=>q.old.heading_deg-q.wire.heading_deg>3).slice(0,5)});
}
fs.writeFileSync('research/v10_objective_20261001/compare.json',JSON.stringify({horizon_s:.05,results,limits:['Same recorded observations and same50ms horizon, no future commands used','Retained user TRACK_LAT; no fitting to these results','Overlapping samples within games, not independent episodes','Recorded server/client motion interpolation, physics and delay not exact','Offline representation comparison, not old bot vs new bot live A/B']},null,2));console.log(results.map(({examples,...r})=>r));
