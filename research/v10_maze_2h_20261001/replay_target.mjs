import fs from 'node:fs';import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync(process.argv[2],'utf8'));const D=JSON.parse(fs.readFileSync('params.json')),V={...D.defaults,...JSON.parse(fs.readFileSync('runs/v10_maze_cycle11_20261001_150146/initial.json')).values,V10_BUDGET:500};
const states=JSON.parse(fs.readFileSync('research/v10_maze_2h_20261001/cycle11_last_states.json')),rows=[];
for(const s of states){s.cmdNow=s.actualCommand?.ang??s.ang;s.boostNow=s.actualCommand?.boost??s.boost;const p=new SlpPilot.Pilot(V,'safe'),r=p.v10Route(s,1);p.step({...s,route:r});rows.push({t:s.t,route:r.routes.length,reason:r.reason,mode:p.last.trace.mode,cmd:p.last.cmd,boost:p.last.boost});}
console.log(JSON.stringify(rows));
