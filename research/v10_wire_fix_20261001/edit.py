from pathlib import Path
p=Path('ext/pilot.js');s=p.read_text()
s=s.replace('  v9Roll(s, W, ph, start, turn, duration, t0, target = null, boost = false) {','''  // Protocol v5 target is a 0..250 byte. Use exactly that target in V10
  // simulation; epsilon only keeps decoded bucket boundaries idempotent.
  v10WireAngle(angle) {
    const a=((angle%TAU)+TAU)%TAU;
    return (Math.floor(251*a/TAU+1e-10)%251)*TAU/251;
  }
  v9Roll(s, W, ph, start, turn, duration, t0, target = null, boost = false) {''')
s=s.replace('next = this.v4Adv(st, target === null ? st.h + turn * ph.w * dt : target, boost, dt, ph);','next = this.v4Adv(st, this.values.V10_ON ? this.v10WireAngle(target === null ? st.h + turn * ph.w * dt : target) : (target === null ? st.h + turn * ph.w * dt : target), boost, dt, ph);')
s=s.replace('const until=lag+age+Math.min(.03,(this.v10ComputeMs??3)/1000),history=s.cmdHistory||[];','''const compute=Math.min(.03,(this.v10ComputeMs??3)/1000);
    const wired=Array.isArray(s.wireHistory),wait=wired?Math.max(0,s.sendWaitMs??0,s.boostWaitMs??0)/1000:0;
    const until=lag+age+Math.max(compute,wait),history=wired?s.wireHistory.slice():(s.cmdHistory||[]);
    // A previous input can be transmitted while the worker computes. Its
    // estimated send slot is separate from confirmed socket sends.
    if(wired&&s.wirePending&&Math.max(s.sendWaitMs??0,s.boostWaitMs??0)/1000<age+compute){
      history.push({t:s.t+Math.max(s.sendWaitMs??0,s.boostWaitMs??0)/1000,ang:s.wirePending.ang,boost:s.wirePending.boost,estimated:true});
    }''')
s=s.replace('let active={ang:Number.isFinite(s.cmdNow)?s.cmdNow:s.ang,boost:!!s.boostNow};','let active={ang:wired?(s.wireNow?.ang??s.ang):(Number.isFinite(s.cmdNow)?s.cmdNow:s.ang),boost:wired?!!s.wireNow?.boost:!!s.boostNow};')
s=s.replace('next=this.v4Adv(st,angle,boost,dt,ph);','next=this.v4Adv(st,this.v10WireAngle(angle),boost,dt,ph);')
p.write_text(s)
p=Path('ext/mod.js');s=p.read_text()
s=s.replace('const commandHistory = [];','''const commandHistory = [];
const wireHistory = [];
let wireGame = null, wireNow = null;
function wireSnapshot() {
  const snake=window.slither,now=performance.now()/1000;
  if(wireGame!==game){wireGame=game;wireHistory.length=0;wireNow=snake?{t:now-2,ang:snake.ang,boost:!!snake.md,estimated:true}:null;}
  const clock=window.timeObj?.now?.();
  const gate=(last,period)=>Number.isFinite(clock)&&Number.isFinite(last)?Math.max(0,period-(clock-last)):period;
  return {wireHistory:wireHistory.slice(),wireNow:wireNow?{...wireNow}:null,
    wirePending:{ang:bucketOf(Math.atan2(window.ym||0,window.xm||0))*2*Math.PI/251,boost:!!snake?.wmd},
    sendWaitMs:gate(window.last_e_mtm,34),boostWaitMs:gate(window.last_accel_mtm,51)};
}
function recordWire(byte) {
  wireSnapshot();const t=performance.now()/1000;
  if(!wireNow)return;
  if(!wireHistory.length)wireHistory.push({...wireNow});
  wireNow={t,ang:byte<=250?byte*2*Math.PI/251:wireNow.ang,boost:byte===253?true:byte===254?false:wireNow.boost,byte,id:activeDecisionId};
  wireHistory.push({...wireNow});
  while(wireHistory.length>1&&wireHistory[1].t<t-2)wireHistory.shift();
}''')
s=s.replace('Math.floor(251 * b / (2 * Math.PI));','Math.floor(251 * b / (2 * Math.PI) + 1e-10) % 251;')
s=s.replace('window.xm = Math.cos(ang) * 250; window.ym = Math.sin(ang) * 250;', '''const input=S.values.V10_ON?(b+.5)*2*Math.PI/251:ang; window.xm = Math.cos(input) * 250; window.ym = Math.sin(input) * 250;''')
s=s.replace('sent.ang = ang; sent.why = why;','sent.ang = S.values.V10_ON?b*2*Math.PI/251:ang; sent.why = why;')
s=s.replace('L: snakeLen(s), t: performance.now() / 1000, cmdHistory:', 'L: snakeLen(s), ...(S.values.V10_ON?wireSnapshot():{}), t: performance.now() / 1000, cmdHistory:')
s=s.replace('v8Control: st.v8Control, cmdHistory:', '''v8Control: st.v8Control, wireHistory:st.wireHistory?.map(q=>({...q,t:q.t-game.t0/1000})),wireNow:st.wireNow?{...st.wireNow,t:st.wireNow.t-game.t0/1000}:undefined,wirePending:st.wirePending,sendWaitMs:st.sendWaitMs,boostWaitMs:st.boostWaitMs, cmdHistory:''')
old="ws.send = function (d) { try { const b = d instanceof ArrayBuffer ? new Uint8Array(d) : d; if (game && b && b.length === 1 && (b[0] <= 250 || b[0] === 253 || b[0] === 254) && game.pk.length < 3 * 60000) game.pk.push(Math.round(performance.now() - game.t0), b[0]); } catch (e) {} return orig(d); };"
new="""ws.send = function (d) {
    const result=orig(d); // Failed sends must never become prediction inputs.
    try { const b = d instanceof ArrayBuffer ? new Uint8Array(d) : d;
      if (game && b && b.length === 1 && (b[0] <= 250 || b[0] === 253 || b[0] === 254)) {
        if(game.pk.length < 3 * 60000)game.pk.push(Math.round(performance.now() - game.t0), b[0]);
        recordWire(b[0]);
      }
    } catch (e) {} return result;
  };"""
assert old in s;s=s.replace(old,new);p.write_text(s)
