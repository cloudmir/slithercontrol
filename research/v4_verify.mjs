// Layered V4 regression: synthetic behaviour checks plus closed-loop decision replay on black-box observations.
// Usage: node research/v4_verify.mjs run1_box.json.gz ...
import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';

vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const cfg = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const values = {...cfg.defaults, V4_ON: 1};
const flat = a => Float64Array.from(a || []);
const state = f => ({...f, segs: flat(f.segs), sid: flat(f.sid), heads: flat(f.heads), hid: flat(f.hid), food: flat(f.food), own: flat(f.own), cmdNow: f.cmd?.[0] ?? f.ang, boostNow: !!f.cmd?.[1]});
const wrap = a => { let x = (a + Math.PI) % (2 * Math.PI); if (x < 0) x += 2 * Math.PI; return x - Math.PI; };
const pct = (a, p) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };

function synthetic() {
  const base = {x: 30000, y: 30000, ang: 0, sp: 6.12, sc: 2, L: 1000, t: 10, segs: [], sid: [], heads: [], hid: [], own: [], wall: [32550, 32550, 20000], cmd: [0, false]};
  const run = food => { const p = new globalThis.SlpPilot.Pilot(values, 'safe'), s = state({...base, food}); const [cmd, boost] = p.step(s); return {cmd, boost, p, s}; };
  const empty = run([]), food = run([30000, 30400, 15, 30020, 30420, 15, 29980, 30410, 15]);
  if (Math.abs(wrap(empty.cmd)) > .05) throw new Error('empty world must continue straight');
  if (!(food.cmd > .1 && food.boost && food.p.last.trace.mode === 'v4foodlocal')) throw new Error('food target must turn and boost');
  const planner = new globalThis.SlpPilot.Pilot(values, 'safe'), route = planner.v4Route(food.s, 1); food.s.route = route;
  const follower = new globalThis.SlpPilot.Pilot(values, 'safe'); follower.step(food.s);
  if (!route.pts || route.mode !== 'food' || follower.last.draw.chosen.length <= 36 || !follower.last.draw.goal) throw new Error('food route/overlay missing');
  const memory = new globalThis.SlpPilot.Pilot(values, 'safe'), b = state({...base, food: [], sid: [7], segs: [100, 0, 140, 0, 15]});
  memory.v4World(b); memory.v4World({...b, t: 10.1, segs: flat([300, 0, 340, 0, 15])});
  if (memory.v4mem.get(7)?.parts.size !== 2) throw new Error('body memory erased a prior observed segment');
  return {empty_cmd_deg: empty.cmd * 180 / Math.PI, food_cmd_deg: food.cmd * 180 / Math.PI, food_boost: food.boost, route_mode: route.mode, route_points: route.pts.length / 5, overlay_points: follower.last.draw.chosen.length / 2};
}

function replay(file) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(file))), frames = data.frames;
  const planner = new globalThis.SlpPilot.Pilot(values, 'safe'), driver = new globalThis.SlpPilot.Pilot(values, 'safe');
  let route = null, nextPlan = -Infinity, ver = 0, prevCmd = null, flips = 0, foodModes = 0, cruiseTurns = 0, routeUsed = 0, maxDraw = 0;
  const dm = [], pm = [];
  for (const f of frames) {
    const s = state(f);
    if (s.t >= nextPlan) { const t0 = performance.now(); route = planner.v4Route(s, ++ver); pm.push(performance.now() - t0); nextPlan = s.t + values.V4_PLAN_MS / 1000; }
    s.route = route; const t0 = performance.now(); const [cmd] = driver.step(s); dm.push(performance.now() - t0);
    const tr = driver.last.trace; if (tr.v3_cert) routeUsed++; if (String(tr.mode).includes('food')) foodModes++;
    if (String(tr.mode).includes('cruise') && Math.abs(wrap(cmd - s.ang)) > Math.PI / 6) cruiseTurns++;
    if (prevCmd !== null && Math.abs(wrap(cmd - prevCmd)) > Math.PI / 6) flips++; prevCmd = cmd;
    maxDraw = Math.max(maxDraw, driver.last.draw.chosen.length / 2);
  }
  return {file, frames: frames.length, d_p50: pct(dm, .5), d_p95: pct(dm, .95), d_max: Math.max(...dm), c_p50: pct(pm, .5), c_p95: pct(pm, .95), c_max: Math.max(...pm), flips, food_modes: foodModes, cruise_turns: cruiseTurns, route_use: routeUsed / frames.length, max_draw_points: maxDraw};
}

const result = {synthetic: synthetic(), replay: process.argv.slice(2).map(replay)};
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
