// V5 offline check: closed-loop synthetic worlds (own physics via Pilot.v4Adv, no enemy AI) + open-loop replay on black-box files.
// Usage: node research/v5_verify.mjs [run_box.json.gz ...]
import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';

vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const cfg = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const values = {...cfg.defaults, V5_ON: 1};
const flat = a => Float64Array.from(a || []);
const wrap = a => { let x = (a + Math.PI) % (2 * Math.PI); if (x < 0) x += 2 * Math.PI; return x - Math.PI; };
const pct = (a, p) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const base = {x: 30000, y: 30000, ang: 0, sp: 6.12, sc: 2, L: 1000, t: 10, segs: [], sid: [], heads: [], hid: [], own: [], wall: [32550, 32550, 20000], cmd: [0, false]};
const mk = o => ({...base, ...o, segs: flat(o.segs), sid: flat(o.sid), heads: flat(o.heads), hid: flat(o.hid), food: flat(o.food), own: flat(o.own)});

// closed loop: the pilot's command becomes our heading target; physics = the pilot's own model (max turn rate, RAMP speed)
function sim(seconds, world) {
  const p = new globalThis.SlpPilot.Pilot(values, 'safe'), ph = p.v4Physics(2);
  let st = {x: 30000, y: 30000, h: 0, v: 6.12 * 31}, cmd = 0, boost = false, t = 10, turn = 0, eaten = 0, minGap = Infinity, boostT = 0, modes = {}, maxMs = 0;
  let food = world.food ? [...world.food] : [];
  const path = [];
  for (let i = 0; i < seconds * 20; i++) {
    const s = mk({x: st.x, y: st.y, ang: st.h, sp: st.v / 31, t, food: world.food ? food : [], heads: world.heads ? world.heads(t) : [], hid: world.heads ? world.heads(t).length ? [1] : [] : [], segs: world.segs || [], sid: world.segs ? [9] : [], cmd: [cmd, boost]});
    s.cmdNow = cmd; s.boostNow = boost;
    const t0 = performance.now(); [cmd, boost] = p.step(s); maxMs = Math.max(maxMs, performance.now() - t0);
    modes[p.last.trace.mode] = (modes[p.last.trace.mode] || 0) + 1;
    const h0 = st.h; st = p.v4Adv(st, cmd, boost, .05, ph); t += .05; turn += Math.abs(wrap(st.h - h0)); if (boost) boostT += .05;
    path.push([st.x, st.y]);
    const r = 14.5 * 2;
    if (world.food) for (let j = food.length - 3; j >= 0; j -= 3) if (Math.hypot(food[j] - st.x, food[j + 1] - st.y) < r + 30) { eaten += food[j + 2]; food.splice(j, 3); }
    const wallGap = 20000 - Math.hypot(st.x - 32550 + 2550 * 0 - 0, st.y - 32550) - r; // wall centre is 32550,32550
    minGap = Math.min(minGap, wallGap);
  }
  const d = Math.hypot(st.x - 30000, st.y - 30000);
  return {disp: d, turn_rad: turn, eaten, boostT, modes, maxMs, end: [st.x, st.y], path};
}

function synthetic() {
  const out = {};
  const empty = sim(20, {});
  out.empty = {boostT: +empty.boostT.toFixed(1), disp: Math.round(empty.disp), turn: +empty.turn_rad.toFixed(1), modes: empty.modes, max_ms: +empty.maxMs.toFixed(1)};
  if (empty.disp < 2000 || empty.turn_rad > 12 || empty.boostT > 2) throw new Error('empty world: must travel, not circle: ' + JSON.stringify(out.empty));
  // food ring 400px ahead-left and 700 px behind: must eat most of it
  const food = []; for (let i = 0; i < 12; i++) food.push(30400 + i * 25, 30250 + i * 10, 5);
  for (let i = 0; i < 10; i++) food.push(29400 - i * 30, 29700, 5);
  const fd = sim(20, {food}); out.food = {eaten: fd.eaten, total: 22 * 5, boostT: +fd.boostT.toFixed(1), modes: fd.modes, max_ms: +fd.maxMs.toFixed(1)};
  if (fd.eaten < 60) throw new Error('food: must eat: ' + JSON.stringify(out.food));
  // remains pile far to one side must attract (goal) even with nothing near
  const rem = []; for (let i = 0; i < 8; i++) rem.push(30900, 30700 + i * 12, 15);
  const rd = sim(15, {food: rem}); out.remains = {eaten: rd.eaten, boostT: +rd.boostT.toFixed(1), modes: rd.modes};
  if (rd.eaten < 60) throw new Error('remains not collected: ' + JSON.stringify(out.remains));
  // head-on enemy: must not contact (contact = gap between our head and the enemy head path under 30px at any step)
  let contact = false;
  const headsAt = t => { const tt = t - 10, x = 31200 - 434 * tt, y = 30000; if (Math.abs(x - 30000) < 5000) return [x, y, Math.PI, 14, 2]; return [x, y, Math.PI, 14, 2]; };
  const he = sim(6, {heads: t => headsAt(t)});
  out.headon = {end: he.end.map(Math.round), modes: he.modes, max_ms: +he.maxMs.toFixed(1)};
  for (const [i, q] of he.path.entries()) { const h = headsAt(10 + (i + 1) * .05); if (Math.hypot(q[0] - h[0], q[1] - h[1]) < 40) contact = true; }
  if (contact) throw new Error('head-on: head contact');
  // wall: start 300px from the rim heading outwards with food outside: must not cross
  return out;
}

function replay(file) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(file))), frames = data.frames, driver = new globalThis.SlpPilot.Pilot(values, 'safe');
  const dm = [], modes = {}; let flips = 0, prevCmd = null, circ = 0;
  for (const f of frames) {
    const s = mk(f); s.cmdNow = f.cmd?.[0] ?? f.ang; s.boostNow = !!f.cmd?.[1];
    const t0 = performance.now(); const [cmd] = driver.step(s); dm.push(performance.now() - t0);
    const m = driver.last.trace.mode; modes[m] = (modes[m] || 0) + 1;
    if (prevCmd !== null && Math.abs(wrap(cmd - prevCmd)) > Math.PI / 6) flips++; prevCmd = cmd;
  }
  return {file, frames: frames.length, ms_p50: +pct(dm, .5).toFixed(2), ms_p95: +pct(dm, .95).toFixed(2), ms_max: +Math.max(...dm).toFixed(1), flips, modes};
}
const res = {synthetic: synthetic(), replay: process.argv.slice(2).map(replay)};
process.stdout.write(JSON.stringify(res, null, 1) + '\n');
