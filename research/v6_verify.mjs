// V6 offline verification: synthetic maze/local-avoidance checks plus open-loop death-box replay.
// Usage: node research/v6_verify.mjs [slp_*_box.json.gz ...]
import fs from 'node:fs';
import zlib from 'node:zlib';
import vm from 'node:vm';

vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const cfg = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const values = {...cfg.defaults, V2_ON: 0, V3_ON: 0, V4_ON: 0, V5_ON: 0, V41_ON: 0, V6_ON: 1};
const F = a => Float64Array.from(a || []);
const pct = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const wrap = a => { let x = (a + Math.PI) % (2 * Math.PI); if (x < 0) x += 2 * Math.PI; return x - Math.PI; };
const base = {x: 30000, y: 30000, ang: 0, sp: 6.12, sc: 2, L: 1000, t: 10, segs: [], sid: [], heads: [], hid: [], food: [], own: [], wall: [30000, 30000, 20000], cmdNow: 0, boostNow: false};
const state = o => ({...base, ...o, segs: F(o.segs), sid: F(o.sid), heads: F(o.heads), hid: F(o.hid), food: F(o.food), own: F(o.own)});

function synthetic() {
  const out = {};
  {
    const planner = new globalThis.SlpPilot.Pilot(values, 'safe'), local = new globalThis.SlpPilot.Pilot(values, 'safe');
    const s = state({}); const route = planner.v6Route(s, 1); s.route = route; const [cmd] = local.step(s);
    out.open = {certified: route.certified, points: route.pts?.length / 5, route_ms: +route.ms.toFixed(2), cmd_deg: +(cmd * 180 / Math.PI).toFixed(1), mode: local.last.trace.mode};
    if (route.intent !== 'explore' || route.certified || route.pts.length < 15 || Math.abs(wrap(cmd)) > .4 || local.last.draw.localAvoiding) throw new Error('open guide failed: ' + JSON.stringify(out.open));
    const d = local.last.draw, end = route.pts.length - 5;
    out.open.macro_distance = Math.round(Math.hypot(route.pts[end + 1] - s.x, route.pts[end + 2] - s.y));
    if (!d.mazePath?.length || !d.localPath?.length || out.open.macro_distance < values.V6_EDGE) throw new Error('separate long macro/local paths missing');
    const stale = state({route: {...route, t0: s.t - values.V6_ROUTE_AGE - 1}}); local.step(stale);
    if (local.last.draw.mazePath.length || !local.last.draw.localPath.length || local.last.draw.mazeState !== 'old') throw new Error('stale macro path still displayed or local path missing');
  }
  {
    // A narrow north-south passage. The guide must run between both bodies rather than through either wall.
    const segs = [29900, 29100, 29900, 30900, 15, 30100, 29100, 30100, 30900, 15];
    const planner = new globalThis.SlpPilot.Pilot(values, 'safe'), local = new globalThis.SlpPilot.Pilot(values, 'safe');
    const s = state({ang: -Math.PI / 2, cmdNow: -Math.PI / 2, segs, sid: [11, 12]}); const route = planner.v6Route(s, 2); s.route = route; local.step(s);
    const xs = []; for (let i = 1; route.pts && i < route.pts.length; i += 5) xs.push(route.pts[i]);
    out.corridor = {certified: route.certified, points: xs.length, min_x: Math.round(Math.min(...xs)), max_x: Math.round(Math.max(...xs)), min_clear: +route.minClear.toFixed(1), mode: local.last.trace.mode};
    if (route.intent !== 'explore' || xs.some(x => x <= 29900 || x >= 30100) || local.last.draw.chosen.length < 4) throw new Error('corridor guide failed: ' + JSON.stringify(out.corridor));
  }
  {
    // An enemy charging head-on invalidates the macro line; the local layer must issue a turning avoidance command.
    const planner = new globalThis.SlpPilot.Pilot(values, 'safe'), local = new globalThis.SlpPilot.Pilot(values, 'safe');
    const clean = state({}); const route = planner.v6Route(clean, 3);
    const s = state({route, heads: [30400, 30000, Math.PI, 14, 2], hid: [7]}); const [cmd] = local.step(s);
    out.head_on = {mode: local.last.trace.mode, cause: local.last.trace.cause, cmd_deg: +(wrap(cmd) * 180 / Math.PI).toFixed(1), safe: local.last.trace.n_safe};
    if (Math.abs(wrap(cmd)) < .2 || local.last.trace.mode === 'v6guide') throw new Error('local avoidance failed: ' + JSON.stringify(out.head_on));
  }
  {
    // Off-axis food must become the macro goal and turn the actual local command.
    const planner = new globalThis.SlpPilot.Pilot(values, 'safe'), local = new globalThis.SlpPilot.Pilot(values, 'safe');
    const s = state({food: [30408, 30312, 20, 30409, 30313, 20]});
    const route = planner.v6Route(s, 4); s.route = route; const [cmd] = local.step(s);
    out.food = {intent: route.intent, goal: route.goal, cmd_deg: cmd * 180 / Math.PI, state: local.last.draw.mazeState};
    if (route.intent !== 'food' || Math.hypot(route.goal.x - 30408, route.goal.y - 30312) > 70 || cmd < .05 || local.last.draw.mazeState !== 'food') throw new Error('food not pursued: ' + JSON.stringify(out.food));
    // Consumed/disappeared food cannot retain a phantom goal.
    const gone = planner.v6Route(state({t: 11}), 5);
    if (gone.intent !== 'explore') throw new Error('consumed food target retained');
  }
  {
    // A wall directly ahead triggers escape; food across a solid wall is not a reachable target.
    const segs = [30200, 28000, 30200, 32000, 20];
    const planner = new globalThis.SlpPilot.Pilot(values, 'safe');
    const danger = planner.v6Route(state({segs, sid: [17], food: [30500,30000,50]}), 6);
    out.wall = {intent: danger.intent, reason: danger.reason};
    if (danger.intent !== 'escape') throw new Error('wall did not trigger escape');
    const safe = new globalThis.SlpPilot.Pilot(values, 'safe');
    const behind = safe.v6Route(state({ang: Math.PI, cmdNow: Math.PI, segs, sid: [17], food: [30500,30000,50, 29600,30000,20]}), 7);
    if (behind.intent !== 'food' || behind.goal.x > 30200) throw new Error('unreachable food chosen');
  }
  {
    const planner = new globalThis.SlpPilot.Pilot(values, 'safe'), local = new globalThis.SlpPilot.Pilot(values, 'safe');
    const small = state({food: [30200,30000,5, 30200,30100,8, 30300,30000,11]});
    small.route = planner.v6Route(small, 8); local.step(small);
    if (small.route.intent !== 'explore' || local.last.trace.eat !== 0) throw new Error('ordinary food affects V6');
    const mixed = state({food: [30200,30000,5, 30408,30312,20]});
    const big = planner.v6Route(mixed, 9);
    if (big.intent !== 'food' || Math.hypot(big.goal.x-30408,big.goal.y-30312)>70) throw new Error('large food not preferred exclusively');
    const passed = state({t:10.4, x:big.goal.x + 35,y:big.goal.y,food:[30408,30312,20]});
    const next = planner.v6Route(passed,10);
    if (next.intent !== 'explore') throw new Error('passed food retargeted');
    // A close forward waypoint must cause passage, not a loop with its endpoint at the food.
    const close = state({food:[30072,30024,20]}); close.route=new globalThis.SlpPilot.Pilot(values,'safe').v6Route(close,11);local.step(close);
    const plan=local.last.plan, dx=plan[plan.length-4]-close.x;
    out.remains_only={small:small.route.intent,big:big.intent,passed:next.intent,close_forward_px:Math.round(dx)};
    if (dx<120) throw new Error('close food still encourages a loop: '+JSON.stringify(out.remains_only));
  }
  return out;
}

function replay(file) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(file))), frames = data.frames || [];
  const planner = new globalThis.SlpPilot.Pilot(values, 'safe'), local = new globalThis.SlpPilot.Pilot(values, 'safe');
  let route = null, lastPlan = -Infinity, version = 0, guide = 0, cert = 0, hard = 0, prev = null, turns = 0; const planReasons = {}, causes = {};
  const macroMs = [], localMs = [];
  for (const f of frames) {
    const s = state(f); s.cmdNow = f.cmd?.[0] ?? f.ang; s.boostNow = !!f.cmd?.[1];
    if (s.t - lastPlan >= values.V6_PLAN_MS / 1000) { const t0 = performance.now(); route = planner.v6Route(s, ++version); macroMs.push(performance.now() - t0); lastPlan = s.t; const why = route.reason || 'none'; planReasons[why] = (planReasons[why] || 0) + 1; }
    s.route = route; const t0 = performance.now(); const [cmd] = local.step(s); localMs.push(performance.now() - t0);
    if (local.last.draw.guideCert >= 0) guide++; if (local.last.trace.v3_cert) cert++; if (local.last.trace.mode === 'v6hard') hard++;
    causes[local.last.trace.cause] = (causes[local.last.trace.cause] || 0) + 1;
    if (local.last.trace.cause === 'changed' || local.last.trace.cause === 'old') { route = null; lastPlan = -Infinity; }
    if (prev !== null && Math.abs(wrap(cmd - prev)) > Math.PI / 6) turns++; prev = cmd;
  }
  const val = a => a.length ? {p50: +pct(a, .5).toFixed(2), p95: +pct(a, .95).toFixed(2), max: +Math.max(...a).toFixed(2)} : null;
  return {file, frames: frames.length, macro: val(macroMs), local: val(localMs), guide_rate: frames.length ? +(guide / frames.length).toFixed(3) : 0, certified_rate: frames.length ? +(cert / frames.length).toFixed(3) : 0, plan_reasons: planReasons, local_causes: causes, hard, turns};
}

const result = {synthetic: synthetic(), replay: process.argv.slice(2).map(replay)};
for (const r of result.replay) {
  if (r.guide_rate < .5) throw new Error(`guide unavailable in most replay frames: ${r.file}`);
  if (r.local.p95 > 5) throw new Error(`local p95 over 5ms: ${r.file} ${r.local.p95}`);
  if (r.macro.max > values.V6_PLAN_BUDGET + 2) throw new Error(`macro over budget: ${r.file} ${r.macro.max}`);
}
process.stdout.write(JSON.stringify(result, null, 1) + '\n');
