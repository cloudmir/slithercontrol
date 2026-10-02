// SLP MOD: our pilot (ext/pilot.js, same decisions as pilot.py) inside the vanilla slither.io page, with a tuning
// panel, an overlay of what it decides, and view features in the spirit of NTL (zoom, scores, death point, border,
// small food, no prey, FPS/ping, server choice). No game code is replaced: we read its globals and wrap redraw/connect.
// Keys (not while typing): T bot on/off, H panel, Z zoom reset, mouse wheel zoom.
(() => {
'use strict';
if (window.__slp) return;
const DEF = window.SLP_PARAMS, VERSION = DEF.__ext_version || 'dev';
const LS = 'slp.v1', RADIUS = 1150, FOOD_RADIUS = 3000;      // observation radii as run_live.py
const TRACE_KEEP = 900;                                        // decisions kept per game record (~30 s)
// Black box (user 2026-09-27 "죽었을때 데이터 분석 ... 안죽도록 분석"): the last BOX_S s of observations (every snake body,
// head and food the pilot saw) with the command decided on each, saved at death as <record>_box.json.gz.
// research/mod_deaths.py turns it into run_live's blackbox so deaths.py and the "way out" oracle read it as they are.
const BOX_S = 60;                                             // 60 s: the killer's approach starts ~10-15 s out (2026-09-27)
// Whole-game decision log + wrap clips (cycle 1 "감김", user 2026-09-27): one row per decision, and the full observations
// of every wrap episode (a snake covering >= 30% of the bearings within 500 px) from 2 s before it until it ends.
const LOG_KEYS = ['t', 'x', 'y', 'ang', 'sp', 'sc', 'L', 'mode', 'boost', 'cmd', 'clear', 'hard', 'n_safe', 'wrap', 'cov', 'cov_id',
  'cov_free', 'esc', 'enclosed', 'gap_now', 'threat', 'goal', 'nh', 'eat', 'pred', 'sized', 'raid', 'guard', 'gforce', 'gatk', 'giant', 'pph', 'pset', 'pgap', 'ptr', 'ptid', 'pstab', 'ttd', 'v2obj',
  'ttds', 'ttdh', 'branch', 'cause', 'head_hit', 'head_checked', 'ttddyn', 'dyn_id', 'dyn_kind', 'dyn_gap', 'dyn_heads', 'dyn_excluded', 'emergency', 'em_gap', 'em_unavoidable', 'unknown_at', 'verified_s', 'static_hit', 'boost_reason', 'chg']
const CLIP_MAX_FRAMES = 3600;
const PROFILES = {safe: '안전형', aggressive: '공격형'};
// Displays: the basic ones start on, the analysis ones (for tuning) start off (user 2026-09-26).
const BASIC = [['path', '예측 경로'], ['gaps', '가장 가까운 3점(경계까지 px)·틈'], ['scores', '적 길이'], ['border', '경계'], ['death', '사망 지점'], ['goal', '먹이 목표']];
const ANALYSIS = [['why', '후보 탈락 이유'], ['terms', '점수 구성'], ['heads', '적 머리 예측'], ['ring', '포위 링'], ['margin', '여유 테두리'],
  ['rays', '앞길 광선'], ['held', '유지·2등 계획'], ['timeline', '타임라인'], ['deathSum', '사망 직전 요약'], ['heaps', '먹이 무더기'],
  ['squeeze', '좁아지는 통로']];
const WHY = ['#60ff60', '#ff4040', '#ff9a30', '#b070ff', '#909090', '#ff60ff'];      // pilot.js analysis.why codes 0-5
const WHY_KO = ['안전', '여유 부족', '최소 여유 부족', '막다른 길', '반대 방향', '코일 반대'];
const TERM_KO = {food: '경로 먹이', open: '끝 공간', turn: '방향 변경', thread: '좁은 틈', prog: '전진', big: '굵은 적', curl: '몸 말림',
  par: '나란히', rim: '가장자리', hunt: '추격', crowd: '혼잡', loop: '루프 탈출', goal: '먹이 무더기', heap: '잔해 부스트', wrap: '감김 출구',
  esc: '빈 쪽', away: '공격자 회피', run: '부스트 도주', cut: '가로지르기', boost: '부스트 비용', flip: '반대 회전', squeeze: '좁은 통로 탈출'};
const MODE_KO = {feed: '먹이', cruise: '순항', evade: '회피', escape: '탈출', unwrap: '감김 풀기', loop: '루프 탈출', coil: '코일', emergency: '비상'};
const TABS = [['tune', '튜닝'], ['show', '표시'], ['preset', '프리셋'], ['gfx', '그래픽'], ['game', '게임']];
const MODE_COL = {feed: '#4c4', cruise: '#888', evade: '#f93', escape: '#fd4', unwrap: '#f6f', loop: '#4dd', coil: '#a6f', emergency: '#f44'};

// ---------- settings (localStorage of slither.io) ----------
const preset = name => Object.assign({}, DEF.defaults, DEF.profiles[name] || {});
// Presets: the two built-in ones come from params.json; saved ones live in S.presets {name: {profile, values}}.
const BUILTIN = {aggressive: '공격형 (기본)', safe: '안전형 (기본)'};
function normalize(s) {
  const base = {profile: 'aggressive', preset: null, presets: {}, slots: {}, values: null, bot: false, panel: true, zoom: 1, autosave: true,
    server: '', smallFood: false, hidePrey: false, tab: 'tune', adv: false, fold: {}, open: {}, games: [], history: [], death: null, pos: null, savedAt: 0,
    gfx: {low: false, simple: false, noBg: false, cap: false, res: 1, mini: false, hz: 60},
    show: Object.fromEntries([...BASIC.map(([k]) => [k, true]), ...ANALYSIS.map(([k]) => [k, false])])};
  s = Object.assign(base, s || {}); s.show = Object.assign(base.show, s.show); delete s.show.fan;
  s.gfx = Object.assign({low: false, simple: false, noBg: false, cap: false, res: 1, mini: false, hz: 60}, s.gfx);
  // game loop timer 60 by default (user 2026-09-26 after runs/gfx_bench_20260926_214337): settings saved before get it once
  if (!s.hz60) { s.gfx.hz = 60; s.hz60 = true; }
  if (!DEF.profiles[s.profile]) s.profile = 'aggressive';
  if (!TABS.some(([k]) => k === s.tab)) s.tab = 'tune';
  s.values = Object.assign(preset(s.profile), s.values || {});
  for (const k of Object.keys(s.values)) if (!(k in DEF.defaults)) delete s.values[k];
  if (!s.preset || (!BUILTIN[s.preset] && !s.presets[s.preset])) s.preset = s.profile;
  return s;
}
const S = normalize((() => { try { return JSON.parse(localStorage.getItem(LS)); } catch (e) { return null; } })());
// The last settings: saved on every change, here and in the extension's storage (store.js); the newer copy wins on load.
let saveTimer = null;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    S.savedAt = Date.now();
    localStorage.setItem(LS, JSON.stringify(S));
    window.postMessage({slpStore: 'save', data: JSON.parse(JSON.stringify(S))}, '*');
  }, 200);
};
window.addEventListener('message', e => {
  if (e.source !== window || !e.data) return;
  if (e.data.slpStore === 'stale') return note('확장이 다시 로드됨 — F5로 새로고침하세요 (그 전까지 설정은 이 주소에만 저장)');
  if (e.data.slpStore !== 'load') return;
  const d = e.data.data;
  if (d && (d.savedAt || 0) > (S.savedAt || 0)) {
    Object.assign(S, normalize(d));
    localStorage.setItem(LS, JSON.stringify(S));
    if (typeof send === 'function') send({type: 'params', values: S.values, profile: S.profile});
    if (typeof render === 'function') render();
  } else if (!d || (S.savedAt || 0) > (d.savedAt || 0)) save();
});
window.postMessage({slpStore: 'get'}, '*');
const presetValues = name => BUILTIN[name] ? preset(name) : Object.assign(preset(S.presets[name].profile), S.presets[name].values);
const presetProfile = name => BUILTIN[name] ? name : S.presets[name].profile;
const presetLabel = name => BUILTIN[name] || `${name} (${PROFILES[S.presets[name].profile]} 기반)`;
// Number keys 1-4 switch presets (user 2026-09-28): S.slots {"1": presetName}. Shift+number puts the current preset there.
const presetExists = name => !!(name && (BUILTIN[name] || S.presets[name]));
const presetShort = name => BUILTIN[name] || name;
const slotOf = name => Object.keys(S.slots).find(n => S.slots[n] === name && presetExists(name)) || null;
const unsavedKeys = () => { const cur = presetValues(S.preset); return Object.keys(cur).filter(k => S.values[k] !== cur[k]); };
function applyPreset(name) {
  S.preset = name; S.profile = presetProfile(name); S.values = presetValues(name); save();
  if (game) game.changes.push({t: gameT(), preset: name});
  send({type: 'params', ...pilotParams()}); render();
  toast(`${slotOf(name) ? `[${slotOf(name)}] ` : ''}${presetShort(name)}`);
}
function presetKey(n, assign) {
  if (assign) { S.slots[n] = S.preset; save(); toast(`${n}번 키 ← ${presetShort(S.preset)}`); return note(`${n}번 키 = ${presetShort(S.preset)}`); }
  const name = S.slots[n];
  if (!presetExists(name)) { toast(`${n}번 키 비어 있음 — Shift+${n}로 지정`, true); return note(`${n}번 키에 프리셋이 없습니다 — 원하는 프리셋을 고른 뒤 Shift+${n}`); }
  if (name === S.preset) { toast(`[${n}] ${presetShort(name)}`); return note(`[${n}] ${presetShort(name)} (이미 사용 중)`); }
  const changed = unsavedKeys();
  if (changed.length) { toast(`전환 안 함 — 저장 안 된 수정 ${changed.length}개`, true); return note(`저장 안 된 수정 ${changed.length}개가 있어 전환하지 않음 — 저장하거나 되돌린 뒤 다시 ${n}`); }
  applyPreset(name); note(`[${n}] ${presetShort(name)} 으로 전환`);
}
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); }
const valuesHash = (v = S.values) => hash(JSON.stringify(Object.keys(v).sort().map(k => [k, v[k]])));
// Settings history (user 2026-09-26: load from the list, not from a file): every finished game and every preset save
// or export keeps the values it used; newest first, 40 kept.
function pushHistory(e) {
  S.history.unshift(Object.assign({at: new Date().toISOString(), profile: S.profile, preset: S.preset,
    values: Object.assign({}, S.values), hash: valuesHash()}, e));
  S.history = S.history.slice(0, 40);
}

// ---------- pilot: in a Worker (same source as window.SlpPilot), main thread if a Worker cannot start ----------
function makeHandler() {
  let pilot = null;
  return (m, reply) => {
    const P = (typeof self !== 'undefined' && self.SlpPilot) || window.SlpPilot;
    if (m.type === 'reset' || !pilot) pilot = new P.Pilot(m.values, m.profile);
    if (m.type === 'params') pilot.setParams(m.values, m.profile);
    if (m.type !== 'step') return;
    const t0 = performance.now();
    try {
      const [cmd, boost] = pilot.step(m.s);
      const d = pilot.last.draw;
      reply({id: m.id, cmd, boost, ms: performance.now() - t0, trace: pilot.last.trace,
        draw: {chosen: d.chosen, near: d.near, gaps: d.gaps.map(g => ({m: g.m, w: g.w})), goal: d.goal, crowdAt: d.crowdAt,
          wp: d.wp, attacker: d.attacker, ro: d.ro, an: d.analysis}});
    } catch (err) { reply({id: m.id, error: String((err && err.stack) || err)}); }
  };
}
let worker = null, local = null;
try {
  const src = `(${window.slpPilotModule})(self);\nconst handle = (${makeHandler})();\nonmessage = e => handle(e.data, r => postMessage(r));`;
  worker = new Worker(URL.createObjectURL(new Blob([src], {type: 'text/javascript'})));
  worker.onmessage = e => onResult(e.data);
  worker.onerror = e => { note('Worker 오류: ' + e.message + ' → 메인 스레드로 전환'); worker = null; };
} catch (e) { worker = null; }
function send(m, transfer) {
  if (worker) return worker.postMessage(m, transfer || []);
  if (!local) local = makeHandler();
  local(m, onResult);
}
// ---------- option rules (user 2026-09-28: overlapping / dead options are disabled or flagged by their relations) ----------
// DEF.rules: {if: {k, eq|ne|le|lt|ge|gt: number | "@KEY" | ["@KEY", factor]}, target, effect: "off" (greyed; force = value the
// pilot gets, else the raw value stays) | "warn" (shown, not changed), text}.
const ruleVal = (v, x) => Array.isArray(x) ? ruleVal(v, x[0]) * x[1] : typeof x === 'string' && x[0] === '@' ? v[x.slice(1)] : x;
function ruleHolds(v, c) {
  const a = v[c.k];
  if ('eq' in c) return a === ruleVal(v, c.eq); if ('ne' in c) return a !== ruleVal(v, c.ne);
  if ('le' in c) return a <= ruleVal(v, c.le); if ('lt' in c) return a < ruleVal(v, c.lt);
  if ('ge' in c) return a >= ruleVal(v, c.ge); if ('gt' in c) return a > ruleVal(v, c.gt);
  return false;
}
function ruleState(v = S.values) {         // key -> {off, force, why: [text]}
  const st = {};
  for (const r of DEF.rules || []) {
    if (!ruleHolds(v, r.if)) continue;
    const s = st[r.target] || (st[r.target] = {off: false, force: undefined, why: []});
    if (r.effect === 'off') { s.off = true; if (r.force !== undefined) s.force = r.force; }
    s.why.push((r.effect === 'off' ? '비활성: ' : '주의: ') + r.text);
  }
  return st;
}
function effectiveValues(v = S.values) {   // what the pilot runs: raw values, with "off + force" rules applied
  const out = Object.assign({}, v), st = ruleState(v);
  for (const k in st) if (st[k].off && st[k].force !== undefined) out[k] = st[k].force;
  return out;
}
const pilotParams = () => ({values: effectiveValues(), profile: S.profile});

// ---------- observation (as run_live.py OBSERVE_JS) ----------
function observe() {
  const s = window.slither;
  if (!window.playing || !s || s.dead) return null;
  const hx = s.xx, hy = s.yy, R2 = RADIUS * RADIUS, RF2 = FOOD_RADIUS * FOOD_RADIUS;
  const inr = (x, y) => (x - hx) * (x - hx) + (y - hy) * (y - hy) < R2, inf = (x, y) => (x - hx) * (x - hx) + (y - hy) * (y - hy) < RF2;
  const segs = [], sid = [], heads = [], hid = [], food = [], own = [];
  for (const o of window.slithers) {
    if (o === s || o.dead) continue;
    const r = 14.5 * o.sc, P = o.pts;
    let px = null, py = null, pin = false;
    for (let i = 0; i <= P.length; i++) {
      let x, y;
      if (i < P.length) { if (P[i].dying) continue; x = P[i].xx; y = P[i].yy; } else { x = o.xx; y = o.yy; }
      const inn = inr(x, y);
      if (px !== null && (inn || pin)) { segs.push(px, py, x, y, r); sid.push(o.id); }
      px = x; py = y; pin = inn;
    }
    if (inf(o.xx, o.yy)) { heads.push(o.xx, o.yy, o.ang, o.sp, o.sc); hid.push(o.id); }
  }
  for (let i = 0; i < window.foods_c; i++) { const f = window.foods[i]; if (f && !f.eaten && inf(f.xx, f.yy)) food.push(f.xx, f.yy, f.sz); }
  for (const p of s.pts) if (!p.dying) own.push(p.xx, p.yy);
  own.push(hx, hy);
  const F = a => Float64Array.from(a);
  return {x: hx, y: hy, ang: s.ang, sp: s.sp, sc: s.sc, boost: s.md, wall: [window.grd, window.grd, window.flux_grd],
    L: snakeLen(s), t: performance.now() / 1000,
    segs: F(segs), sid: F(sid), heads: F(heads), hid: F(hid), food: F(food), own: F(own)};
}
function snakeLen(o) { const sct = o.sct + o.rsc; return Math.floor((window.fpsls[sct] + o.fam / window.fmlts[sct] - 1) * 15 - 5); }

// ---------- game loop: observe -> pilot -> command; one record per game ----------
let game = null, pending = null, reqId = 0, last = null, lastPos = null;
const pct = (a, q) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return Math.round(b[Math.min(b.length - 1, Math.floor(q * b.length))] * 10) / 10; };
function startGame() {
  game = {start: new Date(), t0: performance.now(), ticks: 0, ms: [], page_ms: [], modes: {}, trace: [], L_max: 0, squeeze: [], box: [], freezes: [], lastTick: 0, log: [], clips: [], clipFrames: 0, ep: null,
    profile: S.profile, preset: S.preset, values: Object.assign({}, S.values), values_hash: valuesHash(), changes: [], bot_on: S.bot, predQ: [],
    server: window.bso ? `${window.bso.ip}:${window.bso.po}` : null, errors: 0, players: 0};
  pending = null; last = null; deathBox(null);
  send({type: 'reset', ...pilotParams()});
}
function endGame() {
  const g = game; game = null; pending = null;
  const secs = (performance.now() - g.t0) / 1000;
  if (lastPos) S.death = {x: lastPos[0], y: lastPos[1], at: Date.now()};
  const rec = {ext: VERSION, params_version: DEF.version, at: g.start.toISOString(), seconds: Math.round(secs * 10) / 10,
    L_max: g.L_max, death: S.death, server: g.server, players: g.players, rank: g.rank || null, best_rank: g.bestRank || null, profile: g.profile, preset: g.preset, values_hash: g.values_hash, values: g.values,
    changes: g.changes, bot_on_at_start: g.bot_on, ticks: g.ticks, modes: g.modes, errors: g.errors,
    squeeze_ticks: g.squeeze.length, squeeze: g.squeeze.slice(-300), freezes: g.freezes,
    decide_ms: {p50: pct(g.ms, .5), p95: pct(g.ms, .95)}, obs_to_cmd_ms: {p50: pct(g.page_ms, .5), p95: pct(g.page_ms, .95)},
    trace: g.trace};
  S.games.unshift({at: rec.at, seconds: rec.seconds, L_max: rec.L_max, profile: rec.profile, preset: rec.preset, hash: rec.values_hash, ticks: rec.ticks});
  S.games = S.games.slice(0, 30);
  // the values in effect when the game ended (mid-game tuning included); the start values too when they differ
  pushHistory({at: rec.at, kind: 'game', seconds: rec.seconds, L_max: rec.L_max, profile: g.profile, preset: g.preset,
    changes: g.changes.filter(c => Object.keys(c).some(k => k in DEF.defaults)).length,
    start: valuesHash() !== g.values_hash ? {values: g.values, hash: g.values_hash} : null});
  window.__slpLastRecord = rec;
  save();
  if (S.show.deathSum && g.trace.length) deathBox(g.trace, g.freezes);
  const p2 = n => String(n).padStart(2, '0'), s0 = g.start;
  const stamp = `${s0.getFullYear()}${p2(s0.getMonth() + 1)}${p2(s0.getDate())}_${p2(s0.getHours())}${p2(s0.getMinutes())}${p2(s0.getSeconds())}`;
  if (S.autosave && g.ticks > 0) download(`slp_${stamp}.json`, rec);
  if (g.box.length) saveBox(g, rec, `slp_${stamp}_box.json.gz`);
  if (g.ep) g.clips.push({start: g.ep.start, end: rec.seconds, died: true, frames: []});     // frames: the black box
  if (g.log.length) saveLog(g, rec, `slp_${stamp}_log.json.gz`);
  render();
}
const serFrames = frames => {
  const round = (a, d) => Array.from(a, v => Math.round(v * d) / d);
  return frames.map(f => Object.assign({}, f, {segs: round(f.segs, 10), sid: Array.from(f.sid), heads: round(f.heads, 1000),
    hid: Array.from(f.hid), food: round(f.food, 10), own: round(f.own, 10)}));
};
const gzip = obj => new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
function saveBox(g, rec, name) {
  gzip({v: 1, ext: VERSION, at: rec.at, seconds: rec.seconds, frames: serFrames(g.box)}).then(blob => {
    window.__slpLastBox = blob;
    if (S.autosave) download(name, blob);
  }).catch(e => console.error('[SLP box]', e));
}
function saveLog(g, rec, name) {
  gzip({v: 1, ext: VERSION, at: rec.at, seconds: rec.seconds, keys: LOG_KEYS, log: g.log,
    clips: g.clips.map(c => ({start: c.start, end: c.end, died: c.died, frames: serFrames(c.frames)}))}).then(blob => {
    window.__slpLastLog = blob;
    if (S.autosave) download(name, blob);
  }).catch(e => console.error('[SLP log]', e));
}
function download(name, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(obj instanceof Blob ? obj : new Blob([JSON.stringify(obj)], {type: 'application/json'}));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
function tick() {
  const alive = window.playing && window.slither && !window.slither.dead;
  if (alive && !game) startGame();
  if (!alive && game) endGame();
  if (!game) return;
  const now = performance.now();          // page stalls (runs/mod_deaths_20260927_001524 game 3: 4.2 s, then death)
  if (game.lastTick && now - game.lastTick > 300) game.freezes.push([Math.round(game.lastTick - game.t0) / 1000, Math.round(now - game.lastTick)]);
  game.lastTick = now;
  const s = window.slither;
  lastPos = [s.xx, s.yy];
  game.L_max = Math.max(game.L_max, snakeLen(s));
  if (window.slither_count > game.players) game.players = window.slither_count;
  if (window.rank > 0) { game.rank = window.rank; if (!game.bestRank || window.rank < game.bestRank) game.bestRank = window.rank; }   // HUD rank (V2 goal: #1)   // players on the server (HUD 'of N'; sos.ac is not that)
  if (!S.bot) return;
  if (pending && performance.now() - pending.at < 250) return;          // still deciding (a lost reply expires)
  const st = observe();
  if (!st) return;
  pending = {id: ++reqId, at: performance.now(), t: st.t};
  const f32 = a => Float32Array.from(a);                                  // copies: the buffers go to the worker
  const ro = 14.5 * st.sc, S5 = st.segs;             // our real clearance now (drawn bodies and wall)
  let gapNow = st.wall[2] - Math.hypot(st.x - st.wall[0], st.y - st.wall[1]) - ro;
  for (let i = 0; i < S5.length; i += 5) {
    const ax = S5[i], ay = S5[i + 1], dx = S5[i + 2] - ax, dy = S5[i + 3] - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 1e-9 ? Math.max(0, Math.min(1, ((st.x - ax) * dx + (st.y - ay) * dy) / l2)) : 0;
    gapNow = Math.min(gapNow, Math.hypot(st.x - ax - u * dx, st.y - ay - u * dy) - S5[i + 4] - ro);
  }
  pending.gapNow = gapNow;
  // prediction error: where the plan chosen ~0.5 s ago said we would be now vs where we are (model check, 2026-09-27)
  let pred = null;
  while (game.predQ.length && st.t - game.predQ[0].t >= .48) {
    const q = game.predQ.shift(), d = Math.hypot(st.x - q.x, st.y - q.y);
    const stable = last && Math.abs(((last.cmd - q.cmd + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) < .26 && last.boost === q.boost;
    pred = stable ? Math.round(d * 10) / 10 : null;          // a changed command is not a model error
  }
  pending.pred = pred; st.pred = pred === null ? -1 : pred;
  pending.box = {t: Math.round(pending.at - game.t0) / 1000, x: st.x, y: st.y, ang: st.ang, sp: st.sp, sc: st.sc, boost: st.boost,
    wall: st.wall, L: st.L, segs: f32(st.segs), sid: f32(st.sid), heads: f32(st.heads), hid: f32(st.hid), food: f32(st.food), own: f32(st.own)};
  send({type: 'step', id: pending.id, s: st}, [st.segs.buffer, st.sid.buffer, st.heads.buffer, st.hid.buffer, st.food.buffer, st.own.buffer]);
}
function onResult(r) {
  if (!pending || r.id !== pending.id || !game) return;
  const obsAt = pending.at, frame = pending.box, gapNow = pending.gapNow, pred = pending.pred, obsT = pending.t; pending = null;
  if (!r.error) {
    frame.cmd = [r.cmd, r.boost]; game.box.push(frame);
    while (frame.t - game.box[0].t > BOX_S) game.box.shift();
    const tr = r.trace, q = (v, d) => v === null || v === undefined ? null : Math.round(v * d) / d;
    game.log.push([frame.t, q(frame.x, 10), q(frame.y, 10), q(frame.ang, 1000), q(frame.sp, 100), q(frame.sc, 100), frame.L, tr.mode,
      tr.boost ? 1 : 0, tr.cmd, tr.clear, tr.hard, tr.n_safe, tr.wrap, tr.cov, tr.cov_id, tr.cov_free, tr.esc, tr.enclosed, q(gapNow, 10), tr.threat,
      tr.goal, tr.nh, tr.eat, pred, tr.sized, tr.raid, tr.guard, tr.gforce, tr.gatk, tr.giant, tr.pph, tr.pset, tr.pgap, tr.ptr, tr.ptid, tr.pstab, tr.ttd, tr.v2obj,
      tr.ttds, tr.ttdh, tr.branch, tr.cause, tr.head_hit, tr.head_checked, tr.ttddyn, tr.dyn_id, tr.dyn_kind, tr.dyn_gap, tr.dyn_heads, tr.dyn_excluded, tr.emergency, tr.em_gap, tr.em_unavoidable, tr.unknown_at, tr.verified_s, tr.static_hit, tr.boost_reason, tr.chg]);
    if (r.draw && r.draw.chosen && r.draw.chosen.length >= 12) game.predQ.push({t: obsT, x: r.draw.chosen[10], y: r.draw.chosen[11], cmd: r.cmd, boost: r.boost});   // k = 5 -> +0.48 s
    const ep = game.ep;                       // wrap episode: starts at cov >= .3, ends after 2 s below .2 (or 25 s)
    if (!ep && tr.cov >= .3) game.ep = {start: frame.t, low: null};
    else if (ep) {
      ep.low = tr.cov < .2 ? (ep.low === null ? frame.t : ep.low) : null;
      if ((ep.low !== null && frame.t - ep.low >= 2) || frame.t - ep.start > 25) {
        const frames = game.box.filter(f => f.t >= ep.start - 2 && f.t <= frame.t);
        if (game.clipFrames + frames.length <= CLIP_MAX_FRAMES) { game.clips.push({start: ep.start, end: frame.t, died: false, frames}); game.clipFrames += frames.length; }
        else game.clips.push({start: ep.start, end: frame.t, died: false, frames: []});
        game.ep = null;
      }
    }
  }
  if (r.error) { game.errors++; note('판단 오류: ' + r.error.split('\n')[0]); console.error('[SLP]', r.error); return; }
  if (S.bot && window.playing && window.slither && !window.slither.dead) {
    window.xm = Math.cos(r.cmd) * 250; window.ym = Math.sin(r.cmd) * 250;
    window.setAcceleration(r.boost ? 1 : 0);
  }
  const pageMs = performance.now() - obsAt;
  last = r; game.ticks++; game.ms.push(r.ms); game.page_ms.push(pageMs);
  game.modes[r.trace.mode] = (game.modes[r.trace.mode] || 0) + 1;
  game.trace.push(Object.assign({t: Math.round((obsAt - game.t0)) / 1000, ms: Math.round(r.ms * 10) / 10, page_ms: Math.round(pageMs * 10) / 10}, r.trace));
  if (game.trace.length > TRACE_KEEP) game.trace.shift();
  if (r.trace.squeeze) game.squeeze.push([Math.round(obsAt - game.t0) / 1000, ...r.trace.squeeze, r.trace.mode, r.trace.boost]);
}
setInterval(() => { const t = performance.now(); tick(); acc.bot += performance.now() - t; }, 1000 / 30);

// Top-centre box for key actions (user 2026-09-28): preset switch / key assign / bot on-off, seen even with the panel hidden.
let toastEl = null, toastTimer = null;
function toast(text, warn = false) {
  if (!document.body) return;
  if (!toastEl) { toastEl = el('div', {id: 'slp-toast'}); document.body.append(toastEl); }
  toastEl.textContent = text; toastEl.className = warn ? 'warn' : ''; toastEl.style.opacity = '1';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, warn ? 2500 : 1600);
}
function setBot(on) {
  S.bot = on; save(); toast(on ? '● 봇 ON' : '○ 봇 OFF');
  if (on && game) { game.changes.push({t: gameT(), bot: true}); send({type: 'reset', ...pilotParams()}); }
  if (!on && game) { game.changes.push({t: gameT(), bot: false}); window.setAcceleration(0); }
  render();
}
const gameT = () => game ? Math.round(performance.now() - game.t0) / 1000 : null;
function setValue(k, v) {
  S.values[k] = v; save();
  if (game) game.changes.push({t: gameT(), [k]: v});
  send({type: 'params', ...pilotParams()});
}

// ---------- input: bot owns the mouse while it drives (panel excepted); hotkeys; wheel zoom ----------
let panel = null, drag = null;
const inPanel = e => panel && panel.contains(e.target);
function placePanel() {
  if (!panel || !S.pos) return;
  const x = Math.min(Math.max(0, S.pos.x), window.innerWidth - 60), y = Math.min(Math.max(0, S.pos.y), window.innerHeight - 30);
  Object.assign(panel.style, {left: x + 'px', top: y + 'px', right: 'auto', maxHeight: Math.max(200, window.innerHeight - y - 8) + 'px'});
}
window.addEventListener('mousemove', e => {
  if (!drag) return;
  S.pos = {x: e.clientX - drag.dx, y: e.clientY - drag.dy}; placePanel(); e.stopImmediatePropagation();
}, true);
window.addEventListener('mouseup', e => { if (drag) { drag = null; save(); e.stopImmediatePropagation(); } }, true);
for (const ev of ['mousemove', 'mousedown', 'mouseup'])
  window.addEventListener(ev, e => { if (S.bot && game && !inPanel(e)) e.stopImmediatePropagation(); }, true);
window.addEventListener('keydown', e => {
  const tg = e.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable);
  if (typing || e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === 't') setBot(!S.bot);
  else if (k === 'h') { S.panel = !S.panel; save(); render(); }
  else if (k === 'z') setZoom(1);
  else if (/^Digit[1-4]$/.test(e.code)) presetKey(e.code.slice(5), e.shiftKey);
  else return;
  e.stopImmediatePropagation();
}, true);
window.addEventListener('wheel', e => {
  if (inPanel(e) || !window.slither) return;
  setZoom(S.zoom * (e.deltaY > 0 ? .9 : 1 / .9));
  e.preventDefault();
}, {capture: true, passive: false});
function setZoom(z) {
  S.zoom = Math.min(4, Math.max(.2, z)); save();
  if (S.zoom === 1 && window.slither) window.gsc = defaultGsc();
  render();
}
const defaultGsc = () => .64285 + .514285714 / Math.max(1, (window.slither.sct + 16) / 36);    // game.js redraw

// ---------- redraw wrapper: zoom, small food, no prey before the game draws; overlay after ----------
let frames = 0, fps = 0, ping = null, pingWait = false, lastDraw = 0;
// Main-thread cost by part (user 2026-09-26: check the graphics options really help). ms summed over one second.
const acc = {loops: 0, oef: 0, draw: 0, overlay: 0, bot: 0, widgets: 0};
let perf = null, rafN = 0;
(function rafCount() { rafN++; requestAnimationFrame(rafCount); })();    // the browser's screen updates (timer loop draws more)
// Lighter graphics (user 2026-09-26): canvas resolution scale on top of game.js resize(), which only runs on window
// changes; the game's mobile body drawing (render_mode 1); low quality handled per frame in the redraw wrapper.
function hookResize() {
  const orig = window.resize;
  if (typeof orig !== 'function') return;
  window.resize = function () {
    const r = orig.apply(this, arguments), k = S.gfx.res;
    if (k !== 1) {
      const w = Math.max(320, Math.round(window.mww * k)), h = Math.max(200, Math.round(window.mhh * k));
      Object.assign(window, {mww: w, mhh: h, mwwp50: w + 50, mhhp50: h + 50, mwwp150: w + 150, mhhp150: h + 150, mww2: w / 2, mhh2: h / 2});
      window.mc.width = w; window.mc.height = h;
      window.csc = Math.min(window.ww / w, window.hh / h);
      window.trf(window.mc, `scale(${window.csc},${window.csc})`);
      window.mc.style.left = Math.floor(window.ww / 2 - w / 2) + 'px'; window.mc.style.top = Math.floor(window.hh / 2 - h / 2) + 'px';
      if (typeof window.rdgbg === 'function') window.rdgbg();
    }
    return r;
  };
}
function applyGfx(key) {
  const G = S.gfx;
  if (!key || key === 'simple') window.render_mode = G.simple ? 1 : 2;
  if (key === 'low' && !G.low) { window.want_quality = 1; window.high_quality = true; }
  if (key === 'hz') applyLoop();
  if ((!key || key === 'res') && typeof window.resize === 'function') {
    window.lww = 0; window.resize();                                          // game's sizing, then ours
    if (window.slither) window.gsc = defaultGsc() * S.zoom * G.res;          // the game only eases gsc back very slowly
  }
}
// Graphics quality slider (0 = fastest .. 4 = the game as is); each level is a set of the toggles below.
const GFX_LEVELS = [
  ['최소: 선·원, 해상도 50%, 30FPS', {mini: true, low: true, simple: true, noBg: true, cap: true, res: .5}],
  ['선·원만, 해상도 75%', {mini: true, low: true, simple: true, noBg: true, cap: false, res: .75}],
  ['게임 단순 몸, 해상도 75%', {mini: false, low: true, simple: true, noBg: true, cap: false, res: .75}],
  ['글로우·배경 끔', {mini: false, low: true, simple: false, noBg: true, cap: false, res: 1}],
  ['원래 그래픽', {mini: false, low: false, simple: false, noBg: false, cap: false, res: 1}]];
const gfxLevel = () => GFX_LEVELS.findIndex(([, v]) => Object.keys(v).every(k => S.gfx[k] === v[k]));
// "선·원만": replaces game.js redraw while playing. Keeps what redraw does besides drawing (view follow, fps, iiv,
// the length/rank box), then draws the border, food squares, each snake as one thick line and its head as a dot.
function miniDraw() {
  const me = window.slither, ctx = window.mc.getContext('2d'), W = window;
  W.fps++;
  if (W.fvtg > 0) {
    W.fvtg--; W.fvx = W.fvxs[W.fvpos]; W.fvy = W.fvys[W.fvpos]; W.fvxs[W.fvpos] = 0; W.fvys[W.fvpos] = 0;
    if (++W.fvpos >= W.vfc) W.fvpos = 0;
  }
  if (W.follow_view) { W.view_xx = me.xx + me.fx + W.fvx; W.view_yy = me.yy + me.fy + W.fvy; }
  const g = W.gsc = defaultGsc() * S.zoom * S.gfx.res, vx = W.view_xx, vy = W.view_yy, cx = W.mww2, cy = W.mhh2, grd = W.grd;
  W.view_ang = Math.atan2(vy - grd, vx - grd); W.view_dist = Math.hypot(vx - grd, vy - grd);
  const x1 = vx - cx / g - 84, x2 = vx + cx / g + 84, y1 = vy - cy / g - 84, y2 = vy + cy / g + 84;     // game.js bpx/bpy
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W.mww, W.mhh);
  ctx.strokeStyle = '#a33'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx + g * (grd - vx), cy + g * (grd - vy), g * W.flux_grd, 0, 2 * Math.PI); ctx.stroke();
  for (const big of [false, true]) {                                      // food: one fill per colour; remains in yellow
    ctx.beginPath();
    for (let i = 0; i < W.foods_c; i++) {
      const f = W.foods[i];
      if (!f || (f.sz >= S.values.REMAINS) !== big || f.rx < x1 || f.rx > x2 || f.ry < y1 || f.ry > y2) continue;
      const d = Math.max(2, g * f.sz * f.rad * .8);
      ctx.rect(cx + g * (f.rx - vx) - d / 2, cy + g * (f.ry - vy) - d / 2, d, d);
    }
    ctx.fillStyle = big ? '#fc4' : '#696'; ctx.fill();
  }
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const o of W.slithers) {
    if (o.dead) continue;
    const hx = o.xx + o.fx, hy = o.yy + o.fy, P = o.pts;
    let iiv = hx >= x1 && hx <= x2 && hy >= y1 && hy <= y2;
    ctx.beginPath(); ctx.moveTo(cx + g * (hx - vx), cy + g * (hy - vy));
    for (let j = P.length - 1; j >= 0; j--) {
      const q = P[j]; if (q.dying) continue;
      const x = q.xx + q.fx, y = q.yy + q.fy;
      if (!iiv && x >= x1 && x <= x2 && y >= y1 && y <= y2) iiv = true;
      ctx.lineTo(cx + g * (x - vx), cy + g * (y - vy));
    }
    if (o.iiv !== iiv) { o.iiv = iiv; if (iiv) o.ehang = o.wehang = o.ang; }   // as game.js redraw
    if (!iiv) continue;
    ctx.strokeStyle = o.cs || '#888'; ctx.lineWidth = Math.max(1, 29 * o.sc * g); ctx.stroke();
    ctx.fillStyle = o === me ? '#fff' : '#f66';
    ctx.beginPath(); ctx.arc(cx + g * (hx - vx), cy + g * (hy - vy), Math.max(2, 7 * o.sc * g), 0, 2 * Math.PI); ctx.fill();
  }
  if (W.wumsts && W.rank > 0 && W.slither_count > 0) {                   // game.js: length/rank box, English only
    W.wumsts = false;
    W.lbf.innerHTML = `<span style="font-size: 14px;"><span style="opacity: .4;">Your length: </span><span style="opacity: .8; font-weight: bold;">${snakeLen(me)}</span></span>`
      + `<BR><span style="opacity: .3;">Your rank: </span><span style="opacity: .35;">${W.rank}</span><span style="opacity: .3;"> of </span><span style="opacity: .35;">${W.slither_count}</span>`;
  }
}
function setGfx(changes) { Object.assign(S.gfx, changes); save(); for (const k of Object.keys(changes)) applyGfx(k); render(); }
setInterval(() => {
  const n = Math.max(1, acc.loops), f = Math.max(1, frames), r = x => Math.round(x * 10) / 10;
  perf = {loops: acc.loops, fps: frames, raf: rafN, game: r((acc.oef - acc.draw - acc.overlay) / n), draw: r(acc.draw / f), overlay: r(acc.overlay / f),
    bot: r(acc.bot), widgets: r(acc.widgets), busy: Math.round((acc.oef + acc.bot + acc.widgets) / 10)};
  fps = frames; frames = rafN = 0; for (const k in acc) acc[k] = 0;
}, 1000);
function hookLoop() {            // game.js oef = one game step + redraw; its raf chain looks oef up globally each frame
  const orig = window.oef;
  window.oef = function () { const t = performance.now(); try { return orig.apply(this, arguments); } finally { acc.loops++; acc.oef += performance.now() - t; } };
}
// Game loop speed, as NTL's "FPS limiter": 0 = the game's requestAnimationFrame loop (display refresh), N = oef() from
// a timer N times a second (game.js supports it: no_raf). Not before animating: startAnimation() adds its own timer then.
let loopTimer = null;
function applyLoop() {
  const hz = S.gfx.hz;
  clearInterval(loopTimer); loopTimer = null;
  if (hz && !window.animating) return void setTimeout(applyLoop, 500);
  if (hz) { window.no_raf = true; loopTimer = setInterval(() => window.oef(), 1000 / hz); }
  else if (window.no_raf) { window.no_raf = false; requestAnimationFrame(() => window.oef()); }
}
function hookRedraw() {
  const orig = window.redraw;
  window.redraw = function () {
    if (window.wfpr) pingWait = true;
    else if (pingWait) { pingWait = false; const v = window.timeObj.now() - window.last_ping_mtm; ping = ping === null ? v : ping * .7 + v * .3; }
    const G = S.gfx;
    if (G.low) { window.want_quality = 0; window.high_quality = false; }       // the game's own low quality: no glow
    const t0 = performance.now();
    if (G.cap && t0 - lastDraw < 1000 / 30 - 3) return;                      // at most ~30 draws/s; a slower loop is not thinned
    lastDraw = t0;
    frames++;
    if ((S.zoom !== 1 || G.res !== 1) && window.slither) window.gsc = defaultGsc() * S.zoom * G.res;   // same view on a smaller canvas
    const preys = window.preys, rads = [], bg = window.bgp2;
    if (G.noBg) window.bgp2 = null;                                            // no hex pattern: plain black
    if (S.hidePrey) window.preys = [];
    if (S.smallFood) for (let i = 0; i < window.foods_c; i++) { const f = window.foods[i]; if (f) { rads.push(f, f.rad); f.rad *= .45; } }
    try { return G.mini && window.playing && window.slither && window.animating && !window.choosing_skin ? miniDraw() : orig.apply(this, arguments); }
    finally {
      const t1 = performance.now();
      if (G.noBg) window.bgp2 = bg;
      if (S.hidePrey) window.preys = preys;
      for (let i = 0; i < rads.length; i += 2) rads[i].rad = rads[i + 1];
      try { overlay(); } catch (e) { console.error('[SLP overlay]', e); }
      acc.draw += t1 - t0; acc.overlay += performance.now() - t1;
    }
  };
}
function overlay() {
  if (!window.slither || !window.mc) return;
  const ctx = window.mc.getContext('2d'), g = window.gsc, vx = window.view_xx, vy = window.view_yy, cx = window.mww2, cy = window.mhh2;
  const X = x => cx + g * (x - vx), Y = y => cy + g * (y - vy), me = window.slither;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  if (S.show.border) {
    ctx.strokeStyle = 'rgba(255,80,80,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(window.grd), Y(window.grd), g * window.flux_grd, 0, 2 * Math.PI); ctx.stroke();
  }
  if (S.show.scores) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const o of window.slithers) {
      if (o === me || o.dead) continue;
      const x = X(o.xx), y = Y(o.yy);
      if (x < -50 || y < -50 || x > window.mww + 50 || y > window.mhh + 50) continue;
      ctx.fillText(String(snakeLen(o)), x, y - 14 * o.sc * g - 8);
    }
  }
  if (S.show.death && S.death) {
    const x = X(S.death.x), y = Y(S.death.y);
    ctx.strokeStyle = 'rgba(80,160,255,.95)'; ctx.fillStyle = 'rgba(80,160,255,.95)'; ctx.lineWidth = 2;
    if (x > 10 && y > 10 && x < window.mww - 10 && y < window.mhh - 10) {
      ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8); ctx.stroke();
    } else {
      const a = Math.atan2(y - cy, x - cx), rr = Math.min(cx, cy) - 30, ex = cx + Math.cos(a) * rr, ey = cy + Math.sin(a) * rr;
      ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * 12, ey + Math.sin(a) * 12);
      ctx.lineTo(ex + Math.cos(a + 2.5) * 10, ey + Math.sin(a + 2.5) * 10); ctx.lineTo(ex + Math.cos(a - 2.5) * 10, ey + Math.sin(a - 2.5) * 10); ctx.fill();
      ctx.fillText(`사망 ${Math.round(Math.hypot(S.death.x - me.xx, S.death.y - me.yy))}`, ex, ey - 14);
    }
  }
  const d = last && game && S.bot ? last.draw : null;
  if (d) {
    const a = d.an;
    if (a) analysisLayers(ctx, a, d, X, Y, g, me);
    if (S.show.path && d.chosen.length) {
      const mode = last.trace.mode;
      ctx.strokeStyle = mode === 'emergency' ? '#ff4040' : mode === 'coil' ? '#ff60ff' : last.boost ? '#ffd040' : '#60ff60';
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(me.xx), Y(me.yy));
      for (let k = 0; k < d.chosen.length; k += 2) ctx.lineTo(X(d.chosen[k]), Y(d.chosen[k + 1]));
      ctx.stroke();
    }
    if (S.show.gaps) {
      // the 3 nearest body points: line from our head, label = px to the death boundary (0 = contact), red inside SAFE
      d.near.forEach((n, i) => {
        const dead = n.dead === undefined ? n.gap : n.dead;
        const col = dead < 0 ? '#ff4040' : dead < S.values.SAFE ? '#ffd040' : i === 0 ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.55)';
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = i === 0 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(X(me.xx), Y(me.yy)); ctx.lineTo(X(n.x), Y(n.y)); ctx.stroke();
        ctx.beginPath(); ctx.arc(X(n.x), Y(n.y), 3, 0, 2 * Math.PI); ctx.fill();
        ctx.font = i === 0 ? 'bold 13px system-ui' : '12px system-ui';
        ctx.fillText(`${dead.toFixed(0)}px`, X(n.x) + 5, Y(n.y) - 6);
        ctx.font = '12px system-ui';
      });
      ctx.strokeStyle = '#40e0ff'; ctx.fillStyle = '#40e0ff';
      for (const gp of d.gaps) {
        const x = X(gp.m[0]), y = Y(gp.m[1]);
        ctx.beginPath(); ctx.arc(x, y, Math.max(3, g * gp.w / 2), 0, 2 * Math.PI); ctx.stroke();
        ctx.fillText(`틈 ${gp.w.toFixed(0)}`, x, y - 8);
      }
      if (d.attacker) { ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(d.attacker[0]), Y(d.attacker[1]), 30, 0, 2 * Math.PI); ctx.stroke(); }
    }
    if (S.show.goal) {
      ctx.lineWidth = 2;
      if (d.goal) { ctx.strokeStyle = '#ffd040'; ctx.beginPath(); ctx.arc(X(d.goal[0]), Y(d.goal[1]), 12, 0, 2 * Math.PI); ctx.stroke(); }
      if (d.crowdAt) { ctx.strokeStyle = '#6090ff'; ctx.beginPath(); ctx.arc(X(d.crowdAt[0]), Y(d.crowdAt[1]), 18, 0, 2 * Math.PI); ctx.stroke(); }
      if (d.wp) { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(X(d.wp[0]), Y(d.wp[1]), 8, 0, 2 * Math.PI); ctx.stroke(); }
    }
  }
  ctx.restore();
}

const V = () => S.values;
function thickOff(r) {            // pilot.js P.thickOff (display)
  const v = V(), xp = [14.5, 29, 50.75], fp = [v.THICK_OFF_THIN, v.THICK_OFF_MID, v.THICK_OFF_THICK];
  if (r <= xp[0]) return fp[0]; if (r >= xp[2]) return fp[2];
  const j = r < xp[1] ? 0 : 1;
  return fp[j] + (fp[j + 1] - fp[j]) * (r - xp[j]) / (xp[j + 1] - xp[j]);
}
function polyline(ctx, pts, X, Y, x0, y0) {
  ctx.beginPath(); if (x0 !== undefined) ctx.moveTo(X(x0), Y(y0));
  for (let k = 0; k < pts.length; k += 2) (k || x0 !== undefined) ? ctx.lineTo(X(pts[k]), Y(pts[k + 1])) : ctx.moveTo(X(pts[k]), Y(pts[k + 1]));
  ctx.stroke();
}
function analysisLayers(ctx, a, d, X, Y, g, me) {
  const sh = S.show, hx = X(me.xx), hy = Y(me.yy);
  if (sh.margin) {               // keep-out zone: body + per-thickness extra + base margin (SAFE)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const o of window.slithers) {
      if (o === me || o.dead || Math.hypot(o.xx - me.xx, o.yy - me.yy) > 2500) continue;
      const r = 14.5 * o.sc;
      ctx.strokeStyle = 'rgba(255,220,0,.14)'; ctx.lineWidth = 2 * (r + thickOff(r) + V().SAFE) * g;
      ctx.beginPath(); let on = false;
      for (const q of o.pts) {
        if (q.dying) continue;
        if (Math.hypot(q.xx - me.xx, q.yy - me.yy) > 1100) { on = false; continue; }
        on ? ctx.lineTo(X(q.xx), Y(q.yy)) : ctx.moveTo(X(q.xx), Y(q.yy)); on = true;
      }
      if (on) ctx.lineTo(X(o.xx), Y(o.yy));
      ctx.stroke();
    }
  }
  if (sh.heads) for (const h of a.heads) {       // head forecasts: cruise, surprise boost, (turning) arc
    ctx.strokeStyle = h.attacker ? 'rgba(255,60,60,.95)' : 'rgba(120,220,255,.75)'; ctx.lineWidth = h.attacker ? 2.5 : 1.2;
    for (let p = 0; p < h.pts.length / 30; p++) polyline(ctx, h.pts.slice(p * 30, p * 30 + 30), X, Y);
  }
  if (sh.held) {
    ctx.lineWidth = 2;
    if (a.runnerPath) { ctx.setLineDash([2, 5]); ctx.strokeStyle = 'rgba(120,170,255,.9)'; polyline(ctx, a.runnerPath, X, Y, me.xx, me.yy); }
    if (a.held !== a.i) { ctx.setLineDash([7, 5]); ctx.strokeStyle = 'rgba(210,210,210,.85)'; polyline(ctx, a.heldPath, X, Y, me.xx, me.yy); }
    ctx.setLineDash([]);
    const e = a.heldPath.length - 2;
    ctx.fillStyle = '#ddd';
    ctx.fillText(a.holdBy === 'confirm' ? '유지: 새 계획 확인 대기' : a.holdBy === 'dwell' ? '유지: 부스트 전환 대기'
      : a.held === a.i ? '직전 계획 유지' : `직전 계획 버림 (${a.plans.held.safe ? '점수' : '안전하지 않음'})`, X(a.heldPath[e]), Y(a.heldPath[e + 1]) + 16);
  }
  if (sh.rays) {                 // look-ahead from the chosen plan's end: worst gap on each ray vs LONG_SAFE
    const r = a.rays;
    ctx.lineWidth = 1.5;
    for (let f = 0; f < r.fan.length; f++) {
      const h = r.h + r.fan[f], x1 = r.x + Math.cos(h) * r.len, y1 = r.y + Math.sin(h) * r.len;
      ctx.strokeStyle = ctx.fillStyle = r.worst[f] >= r.need ? 'rgba(120,255,160,.7)' : 'rgba(255,90,90,.8)';
      ctx.beginPath(); ctx.moveTo(X(r.x), Y(r.y)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke();
      ctx.fillText(r.worst[f] > 900 ? '∞' : r.worst[f].toFixed(0), X(x1), Y(y1));
    }
  }
  if (sh.why) {                  // every candidate's end: colour = why it is not safe (circle cruise, square boost)
    const half = a.why.length / 2;
    for (let c = 0; c < a.why.length; c++) {
      const x = X(a.ends[2 * c]), y = Y(a.ends[2 * c + 1]);
      ctx.fillStyle = WHY[a.why[c]] || '#555';
      if (c >= half) ctx.fillRect(x - 3.5, y - 3.5, 7, 7); else { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 2 * Math.PI); ctx.fill(); }
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(a.ends[2 * a.i]), Y(a.ends[2 * a.i + 1]), 8, 0, 2 * Math.PI); ctx.stroke();
  }
  if (sh.ring) {                 // 24 bearings: nearest body (red < 150, yellow < 400 px), the wrapper's bins, exits
    const rg = a.ring, R0 = Math.max(46, d.ro * g + 34), R1 = R0 + 12;
    for (let b = 0; b < 24; b++) {
      const a0 = b / 24 * 2 * Math.PI - Math.PI, a1 = a0 + 2 * Math.PI / 24, o = rg.occ[b];
      ctx.fillStyle = o < 150 ? 'rgba(255,60,60,.8)' : o < 400 ? 'rgba(255,200,60,.65)' : o < 1000 ? 'rgba(120,210,120,.4)' : 'rgba(120,210,120,.12)';
      ctx.beginPath(); ctx.arc(hx, hy, R1, a0, a1); ctx.arc(hx, hy, R0, a1, a0, true); ctx.closePath(); ctx.fill();
      if (rg.bins && rg.bins[b]) { ctx.strokeStyle = '#ff60ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, R1 + 3, a0, a1); ctx.stroke(); }
    }
    const arrow = (ang, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(hx + Math.cos(ang) * (R1 + 6), hy + Math.sin(ang) * (R1 + 6)); ctx.lineTo(hx + Math.cos(ang) * (R1 + 34), hy + Math.sin(ang) * (R1 + 34)); ctx.stroke();
    };
    arrow(rg.esc, '#ffffff');
    if (rg.wrapEsc !== null) arrow(rg.wrapEsc, '#ff60ff');
    ctx.fillStyle = '#fff';
    ctx.fillText(`둘러쌈 ${rg.enclosed.toFixed(2)} · 감김 ${rg.wrapCov.toFixed(2)}${rg.curl ? ` · 말림 ${rg.curl.toFixed(2)}` : ''}`, hx, hy + R1 + 20);
  }
  if (sh.squeeze && a.squeeze) {                // narrowing corridor: wall A (red), B's head and its cut-in forecasts
    const q = a.squeeze;
    ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,80,220,.9)'; ctx.lineWidth = 2;
    for (const l of q.long) polyline(ctx, l, X, Y, q.b[0], q.b[1]);
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(q.a[0]), Y(q.a[1]), 10, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = '#ff50dc'; ctx.beginPath(); ctx.arc(X(q.b[0]), Y(q.b[1]), 16, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#ff90e8';
    ctx.fillText(`좁아지는 통로 · A ${q.gapA.toFixed(0)} · B ${q.gapB.toFixed(0)} · B가 ${q.ahead > -50 ? '앞/옆' : '뒤'}`, hx, hy - Math.max(46, d.ro * g + 34) - 26);
  }
  if (sh.heaps) for (const h of a.heaps) {      // food heaps: mass, rivals (heads within 350 px)
    const x = X(h.x), y = Y(h.y), rr = Math.max(6, Math.sqrt(h.mass) * 1.2 * g);
    ctx.strokeStyle = 'rgba(255,210,80,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, rr, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#ffd050'; ctx.fillText(`${h.mass.toFixed(0)} · 경쟁 ${h.rivals}`, x, y - rr - 4);
  }
}

// ---------- analysis widgets (DOM): score terms, timeline, death summary ----------
const box = (id, css) => {
  let e = document.getElementById(id);
  if (!e) { e = el('div', {id, style: 'position:fixed;z-index:2147482999;background:rgba(18,20,30,.85);color:#dde;font:12px sans-serif;border-radius:6px;padding:6px;' + css}); document.body.append(e); }
  return e;
};
const drop = id => { const e = document.getElementById(id); if (e) e.remove(); };
function canvasIn(e, w, h) {
  let c = e.querySelector('canvas');
  if (!c) { c = el('canvas', {width: w, height: h}); e.append(c); }
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.font = '11px sans-serif';
  return ctx;
}
function drawTerms() {
  if (!S.show.terms || !last || !game || !S.bot || !last.draw.an) return drop('slp-terms');
  const a = last.draw.an, P1 = a.plans.chosen, P2 = a.plans.runner;
  const names = [...new Set([...Object.keys(P1.terms || {}), ...Object.keys((P2 && P2.terms) || {})])]
    .sort((x, y) => (Math.abs(P1.terms[y] || 0) + Math.abs((P2.terms || {})[y] || 0)) - (Math.abs(P1.terms[x] || 0) + Math.abs((P2.terms || {})[x] || 0))).slice(0, 12);
  const W = 330, H = 58 + names.length * 16, e = box('slp-terms', 'left:8px;top:8px;pointer-events:none');
  const ctx = canvasIn(e, W, H), scale = Math.max(1, ...names.map(n => Math.max(Math.abs(P1.terms[n] || 0), Math.abs((P2.terms || {})[n] || 0)))) / 95;
  const plan = (p, lab) => p && p.terms ? `${lab} ${p.turn >= 0 ? '+' : ''}${p.turn.toFixed(0)}°${p.boost ? ' 부스트' : ''}${p.safe ? '' : ' (위험)'} 총 ${p.total.toFixed(1)}` : `${lab} 없음`;
  ctx.fillStyle = '#9cf'; ctx.fillText('점수 구성: 고른 계획(초록) vs 2등(파랑)', 4, 12);
  ctx.fillStyle = '#dde'; ctx.fillText(plan(P1, '고름'), 4, 28); ctx.fillText(plan(P2, '2등'), 4, 43);
  if (P2 && P2.terms) ctx.fillText(`차이 ${(P1.total - P2.total).toFixed(1)} · 교체 문턱 ${a.SWITCH}${a.holdBy ? ' · ' + (a.holdBy === 'confirm' ? '확인 대기' : '부스트 유지') : ''}`, 200, 12);
  const x0 = 200;
  names.forEach((n, k) => {
    const y = 58 + k * 16, v1 = P1.terms[n] || 0, v2 = (P2.terms || {})[n] || 0;
    ctx.fillStyle = '#ccd'; ctx.textAlign = 'right'; ctx.fillText(TERM_KO[n] || n, 98, y + 9); ctx.textAlign = 'left';
    ctx.fillStyle = '#4c4'; ctx.fillRect(x0, y, v1 / scale, 6);
    ctx.fillStyle = '#58f'; ctx.fillRect(x0, y + 7, v2 / scale, 5);
    ctx.fillStyle = '#aab'; ctx.fillText(v1.toFixed(1), 102, y + 9); ctx.fillText(v2.toFixed(1), 142, y + 9);
  });
  ctx.strokeStyle = '#667'; ctx.beginPath(); ctx.moveTo(x0, 52); ctx.lineTo(x0, H); ctx.stroke();
}
function timelineTo(ctx, tr, W, H, span) {
  if (!tr.length) return;
  const tEnd = tr[tr.length - 1].t, t0 = tEnd - span, X = t => (t - t0) / span * (W - 40) + 36;
  const top = 10, bot = H - 14, Yc = v => bot - (Math.max(-30, Math.min(100, v)) + 30) / 130 * (bot - top);
  ctx.fillStyle = '#aab'; ctx.fillText('여유', 2, Yc(40)); ctx.fillText('0', 24, Yc(0) + 4);
  ctx.strokeStyle = '#733'; ctx.beginPath(); ctx.moveTo(36, Yc(0)); ctx.lineTo(W - 4, Yc(0)); ctx.stroke();
  const pts = tr.filter(x => x.t >= t0);
  for (const x of pts) {                         // mode strip, boost ticks, threat bars
    const px = X(x.t);
    ctx.fillStyle = MODE_COL[x.mode] || '#888'; ctx.fillRect(px, 0, 3, 6);
    if (x.boost) { ctx.fillStyle = '#fd4'; ctx.fillRect(px, H - 5, 2, 5); }
    if (x.threat > 0) { ctx.fillStyle = 'rgba(255,70,70,.35)'; ctx.fillRect(px, bot - x.threat * 30, 2, x.threat * 30); }
  }
  const line = (key, col, map, dash) => {
    ctx.strokeStyle = col; ctx.setLineDash(dash || []); ctx.beginPath();
    pts.forEach((x, k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, X(x.t), map(x[key])));
    ctx.stroke(); ctx.setLineDash([]);
  };
  line('thr', '#fd4', Yc, [3, 3]);
  line('clear', '#6f6', Yc);
  line('ms', 'rgba(120,160,255,.8)', v => bot - Math.min(60, v || 0) / 60 * (bot - top));
  ctx.fillStyle = '#6f6'; ctx.fillText('여유', W - 70, 18); ctx.fillStyle = '#fd4'; ctx.fillText('문턱', W - 40, 18);
  ctx.fillStyle = '#8af'; ctx.fillText('판단ms', W - 70, 30); ctx.fillStyle = '#f66'; ctx.fillText('위협', W - 30, 30);
}
function drawTimeline() {
  if (!S.show.timeline || !game || !game.trace.length) return drop('slp-tl');
  const e = box('slp-tl', 'left:50%;bottom:8px;transform:translateX(-50%);pointer-events:none');
  timelineTo(canvasIn(e, 560, 130), game.trace, 560, 130, 20);
}
function deathBox(tr, freezes = []) {
  if (!tr) return drop('slp-death');
  const tEnd = tr[tr.length - 1].t, tail = tr.filter(x => x.t >= tEnd - 3);
  const modes = tail.map(x => x.mode).filter((m, k, arr) => !k || m !== arr[k - 1]).join(' → ');
  const e = box('slp-death', 'left:50%;top:60px;transform:translateX(-50%);cursor:pointer;border:1px solid #f66');
  e.onclick = () => drop('slp-death'); e.innerHTML = '';
  const min = tail.reduce((m, x) => Math.min(m, x.clear), Infinity);
  e.append(el('div', {style: 'color:#f88;font-weight:bold'}, '사망 직전 3초 (클릭해서 닫기)'),
    el('div', {style: 'white-space:pre'}, `모드: ${modes}\n최소 여유 ${min.toFixed(1)} · 마지막 여유 ${tail[tail.length - 1].clear} · 안전 후보 ${tail[0].n_safe} → ${tail[tail.length - 1].n_safe}\n` +
      `위협 최대 ${Math.max(...tail.map(x => x.threat)).toFixed(2)} · 부스트 ${Math.round(100 * tail.filter(x => x.boost).length / tail.length)}% · 감김 최대 ${Math.max(...tail.map(x => x.wrap)).toFixed(2)}`),
    ...freezes.filter(([t]) => t >= tEnd - 10).map(([t, ms]) => el('div', {style: 'color:#f88'},
      `⚠ 페이지 멈춤 ${(ms / 1000).toFixed(1)}초 (사망 ${Math.max(0, tEnd - t).toFixed(1)}초 전부터) — 이 동안 봇·화면 정지, 서버는 계속 진행`)));
  timelineTo(canvasIn(e, 560, 120), tail, 560, 120, 3);
}
setInterval(() => {
  const t = performance.now();
  try { drawTerms(); drawTimeline(); } catch (err) { console.error('[SLP widgets]', err); }
  acc.widgets += performance.now() - t;
}, 200);

// ---------- server choice: forceOnce (game.js) before each connect ----------
function hookConnect() {
  const orig = window.connect;
  window.connect = function () {
    // the game's own server list (chooseServer: bso = pick, forcing = true, no fobso) wins over our setting
    // (user 2026-09-27: every pick went to 8127 because we forced S.server on each connect). connect() clears forcing.
    if (window.forcing) { /* keep the game's pick */ }
    else if (S.server) { const [ip, po] = S.server.split(':'); window.forceOnce(ip, po); }
    return orig.apply(this, arguments);
  };
}

// ---------- panel ----------
// Tabs (user 2026-09-26: "상단에 탭을 이용하여 주요 기능들을 구분"). Always on top: title (drag), bot switch, preset,
// live status. Tabs: 튜닝 (sliders), 표시 (overlays), 프리셋 (save, history), 그래픽, 게임 (server, games, keys).
let notes = '', noteTimer = null;
function note(t) {
  notes = t; clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { notes = ''; updateHud(); }, 8000);
  render();
}
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e[k] = v; else e.setAttribute(k, v);
  }
  for (const c of kids) e.append(c);
  return e;
};
const CSS = `#slp .it.off{opacity:.45}#slp .lab.off{text-decoration:line-through}#slp .lab.warn{color:#fc6}#slp .rnote{font-size:10px;color:#aaa;width:100%;margin-top:-2px}#slp{position:fixed;top:8px;right:8px;width:372px;max-height:calc(100vh - 16px);display:flex;flex-direction:column;z-index:2147483000;
 background:rgba(15,18,28,.95);color:#dde3f0;font:12px/1.4 system-ui,'Malgun Gothic',sans-serif;border:1px solid #2a3350;border-radius:10px;
 box-shadow:0 6px 24px #000c;overflow:hidden}
#slp .top{padding:6px 8px 0;background:#161b2b;border-bottom:1px solid #2a3350}
#slp .title{display:flex;align-items:center;gap:6px;cursor:move;user-select:none;color:#6f7a99;font-size:11px}
#slp .title b{flex:1;color:#e8edff;font-size:13px}
#slp .body{flex:1;overflow:auto;padding:2px 8px 10px}
#slp button{background:#2a3148;color:#e6eaf7;border:1px solid #3d4766;border-radius:5px;padding:3px 8px;margin:0;cursor:pointer;font:inherit}
#slp button:hover{background:#343d5a}
#slp button.on{background:#1f6b3d;border-color:#3fa565}
#slp button.ico{padding:1px 6px;background:none;border-color:transparent;color:#8a94b0}
#slp button.ico:hover{color:#fff;background:#2a3148}
#slp button.bot{font-weight:600;padding:5px 10px;min-width:86px}
#slp button.go{background:#1f7a41;border-color:#45c16d}
#slp button.stop{background:#4a2630;border-color:#8a4050}
#slp select,#slp input[type=number],#slp input[type=search]{background:#0d101a;color:#e6eaf7;border:1px solid #3d4766;border-radius:5px;font:inherit;padding:2px 4px;min-width:0}
#slp input[type=range]{flex:0 0 108px;margin:0;accent-color:#4f8cff}
#slp input[type=number]{width:52px;text-align:right;font-variant-numeric:tabular-nums}
#slp .row{display:flex;align-items:center;gap:6px;margin:4px 0}
#slp .row.wrap{flex-wrap:wrap}
#slp .sl{margin:2px 0 6px}#slp .sl .row{margin:0}#slp .sl input[type=range]{display:block;width:100%}
#slp .fill{flex:1}
#slp .lab{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#slp .chg{color:#ffcf40}
#slp .hide{visibility:hidden}
#slp .status{background:#0b0e17;border:1px solid #232b44;border-radius:6px;padding:4px 6px;margin:6px 0 0;font-variant-numeric:tabular-nums;min-height:34px}
#slp .chip{display:inline-block;padding:0 7px;border-radius:9px;color:#111;font-weight:600;margin-right:4px}
#slp .badge{padding:1px 7px;border-radius:9px;font-size:11px;white-space:nowrap;font-weight:normal}
#slp .badge.mod{background:#5a4a14;color:#ffd75a}
#slp .badge.ok{background:#173a26;color:#6fd08f}
#slp .badge.key{background:#2a3350;color:#cfe0ff;font-weight:bold}
#slp .badge.key.on{background:#3d6bff;color:#fff}
#slp .sub{color:#8a94b0}
#slp .hint{color:#6f7a99;font-size:11px;margin:6px 0}
#slp .tabs{display:flex;margin:6px -8px 0}
#slp .tabs button{flex:1;border:0;border-radius:0;background:none;color:#8a94b0;padding:7px 0 6px;border-bottom:2px solid transparent}
#slp .tabs button:hover{color:#e6eaf7;background:#1d2338}
#slp .tabs button.act{color:#fff;border-bottom-color:#4f8cff;background:#1d2338;font-weight:600}
#slp h5{margin:12px 0 4px;font-size:12px;color:#9fc0ff;display:flex;align-items:center;gap:6px}
#slp h5 .lab{flex:1}
#slp .grp{background:#171c2c;border:1px solid #232b44;border-radius:7px;margin:6px 0;padding:0 8px 2px}
#slp .grp h4{margin:0 -8px;padding:6px 8px;font-size:12px;color:#cfe0ff;cursor:pointer;user-select:none;display:flex;gap:6px;align-items:center}
#slp .grp h4 .lab{flex:1}
#slp .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
#slp .grid button{text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#slp .hist{display:flex;align-items:center;gap:6px;padding:5px 6px;border-radius:6px;background:#171c2c;border:1px solid transparent;margin:4px 0}
#slp .hist.cur{border-color:#3fa565}
#slp .box{background:#0b0e17;border:1px solid #232b44;border-radius:6px;padding:4px 6px;font-variant-numeric:tabular-nums}
#slp .lvl{text-align:center;margin:2px 0 6px}
#slp-toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483001;pointer-events:none;
  background:rgba(40,70,160,.92);color:#fff;font:bold 16px system-ui,sans-serif;padding:7px 18px;border-radius:8px;
  box-shadow:0 4px 18px rgba(0,0,0,.45);opacity:0;transition:opacity .25s}
#slp-toast.warn{background:rgba(150,100,10,.94)}
#slp-mini{position:fixed;top:8px;right:8px;z-index:2147483000;background:rgba(15,18,28,.9);color:#dde3f0;font:12px system-ui,sans-serif;
 padding:5px 10px;border-radius:8px;border:1px solid #2a3350;cursor:pointer}`;
let hudEl = null, miniEl = null, bodyEl = null, shownTab = null, tuneFilter = '', histFilter = 'all';
const scrollMem = {};
function updateHud() {
  if (miniEl) miniEl.textContent = `SLP 봇 ${S.bot ? 'ON' : 'OFF'} · ${slotOf(S.preset) ? `[${slotOf(S.preset)}] ` : ''}${presetShort(S.preset)}${unsavedKeys().length ? ' (수정됨)' : ''}` +
    (notes ? ` · ${notes}` : ' · 클릭 또는 H: 패널 열기');
  if (!hudEl) return;
  const t = last && game && S.bot ? last.trace : null, sp = (txt, css = '') => el('span', {style: css}, txt);
  const l1 = !S.bot ? [sp('봇 꺼짐 — T 키 또는 왼쪽 버튼으로 켜기', 'color:#8a94b0')]
    : !game ? [sp('판 시작을 기다리는 중', 'color:#8a94b0')]
    : !t ? [sp('판단 대기', 'color:#8a94b0')]
    : [el('span', {class: 'chip', style: `background:${MODE_COL[t.mode] || '#888'}`}, MODE_KO[t.mode] || t.mode),
      ...(t.boost ? [el('span', {class: 'chip', style: 'background:#fd4'}, '부스트')] : []),
      sp(`여유 ${t.clear} · 안전 후보 ${t.n_safe} · 위협 ${t.threat}`)];
  const l2 = `FPS ${fps} (게임 ${perf ? perf.loops : '-'} · 화면 ${perf ? perf.raf : '-'}/s) · 판단 ${last ? last.ms.toFixed(1) : '-'}ms · 핑 ${ping === null ? '-' : Math.round(ping)}ms` +
    (game && window.slither ? ` · 길이 ${snakeLen(window.slither)}` : '') + ` · 줌 ×${S.zoom.toFixed(2)}`;
  const l3 = perf ? `1프레임 게임 ${perf.game} · 그리기 ${perf.draw} · 표시 ${perf.overlay}ms · 메인 스레드 ${perf.busy}%` : '';
  hudEl.replaceChildren(el('div', {}, ...l1), el('div', {class: 'sub'}, l2),
    el('div', {class: 'sub', title: 'FPS = 초당 그린 횟수, 게임 = 초당 게임 계산 횟수(조작 전송도 여기서), 화면 = 브라우저가 실제로 화면을 갱신한 횟수.\n1프레임: 게임 = 게임 계산(그리기 제외), 그리기 = 게임 또는 선·원 그리기, 표시 = MOD 오버레이. 메인 스레드 = 게임 루프·봇 관측·분석 창이 1초 중 쓴 비율 (네트워크 처리 제외)'}, l3),
    ...(notes ? [el('div', {style: 'color:#fb4'}, '⚠ ' + notes)] : []));
}
setInterval(updateHud, 250);
function fmt(v, step) { const dec = step < 1 ? Math.min(3, String(step).split('.')[1].length) : 0; return Number(v).toFixed(dec); }
const stamp5 = at => { const d = new Date(at), p2 = n => String(n).padStart(2, '0'); return `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
function render() {
  if (!document.body) return;
  if (!document.getElementById('slp-css')) document.head.append(el('style', {id: 'slp-css'}, CSS));
  if (bodyEl) scrollMem[shownTab] = bodyEl.scrollTop;
  const refocus = document.activeElement && document.activeElement.id === 'slp-q';
  if (panel) panel.remove(); if (miniEl) miniEl.remove();
  panel = miniEl = hudEl = bodyEl = null;
  const guard = e => { for (const ev of ['mousemove', 'mousedown', 'mouseup', 'click', 'wheel', 'contextmenu', 'keydown', 'keyup']) e.addEventListener(ev, x => x.stopPropagation()); return e; };
  if (!S.panel) {
    miniEl = guard(el('div', {id: 'slp-mini', onclick: () => { S.panel = true; save(); render(); }}));
    document.body.append(miniEl); updateHud(); return;
  }
  const btn = (label, on, f, title = '', cls = '') => el('button', {class: `${on ? 'on ' : ''}${cls}`, onclick: f, title}, label);
  const chip = (label, on, f, title = '') => btn(`${on ? '✓' : '○'} ${label}`, on, f, title);
  const tog = (label, key, obj = S.show) => chip(label, obj[key], () => { obj[key] = !obj[key]; save(); render(); });
  // presets: built-ins cannot be overwritten or deleted
  const cur = presetValues(S.preset), changed = Object.keys(cur).filter(k => S.values[k] !== cur[k]), modified = changed.length > 0;
  const loadPreset = applyPreset;
  const savePreset = name => {
    S.presets[name] = {profile: S.profile, values: Object.assign({}, S.values), savedAt: Date.now()};
    S.preset = name; pushHistory({kind: 'save', label: name}); save(); note(`프리셋 '${name}' 저장됨`);
  };
  const saveAs = () => {
    const name = (window.prompt('새 프리셋 이름', BUILTIN[S.preset] ? `${PROFILES[S.profile]} 조정` : S.preset) || '').trim();
    if (!name) return;
    if (BUILTIN[name] || Object.values(BUILTIN).includes(name)) return note('기본 프리셋 이름은 쓸 수 없습니다');
    if (S.presets[name] && !window.confirm(`'${name}' 프리셋을 덮어쓸까요?`)) return;
    savePreset(name);
  };
  const saveCur = () => BUILTIN[S.preset] ? saveAs() : savePreset(S.preset);
  const loadHistory = (e, useStart) => {
    if (modified && !window.confirm('저장하지 않은 수정이 있습니다. 기록의 값을 불러올까요? (수정한 값은 사라집니다)')) return;
    const v = useStart ? e.start.values : e.values;
    S.profile = DEF.profiles[e.profile] ? e.profile : S.profile;
    S.values = Object.assign(preset(S.profile), v);
    S.preset = e.preset && (BUILTIN[e.preset] || S.presets[e.preset]) ? e.preset : S.profile;   // shown as modified if it differs
    save();
    if (game) game.changes.push({t: gameT(), load: useStart ? e.start.hash : e.hash});
    send({type: 'params', ...pilotParams()}); note(`설정 불러옴 (#${useStart ? e.start.hash : e.hash})`);
  };
  const psel = el('select', {class: 'fill', title: '프리셋 고르기', onchange: e => {
    if (modified && !window.confirm('저장하지 않은 수정이 있습니다. 다른 프리셋을 불러올까요? (수정한 값은 사라집니다)')) return render();
    loadPreset(e.target.value);
  }});
  for (const k of [...Object.keys(BUILTIN), ...Object.keys(S.presets).sort()])
    psel.append(Object.assign(el('option', {value: k}, presetLabel(k)), {selected: k === S.preset}));

  // ----- top: title, bot + preset, status, tabs -----
  panel = guard(el('div', {id: 'slp'}));
  hudEl = el('div', {class: 'status'});
  const top = el('div', {class: 'top'},
    el('div', {class: 'title', title: '끌어서 옮기기', onmousedown: e => {
      if (e.target.tagName === 'BUTTON') return;
      const r = panel.getBoundingClientRect(); drag = {dx: e.clientX - r.left, dy: e.clientY - r.top}; e.preventDefault();
    }}, el('b', {}, '☰ SLP MOD'), el('span', {}, VERSION), btn('—', false, () => { S.panel = false; save(); render(); }, '패널 숨기기 (H)', 'ico')),
    el('div', {class: 'row'},
      btn(S.bot ? '● 봇 ON' : '○ 봇 OFF', false, () => setBot(!S.bot), '봇 켜기/끄기 (T)', `bot ${S.bot ? 'go' : 'stop'}`),
      ...(slotOf(S.preset) ? [el('span', {class: 'badge key', title: `${slotOf(S.preset)}번 키 프리셋`}, slotOf(S.preset))] : []), psel,
      el('span', {class: `badge ${modified ? 'mod' : 'ok'}`, title: modified ? `프리셋과 다른 값: ${changed.join(', ')}` : '프리셋 값 그대로'},
        modified ? `수정 ${changed.length}` : '저장됨'),
      ...(modified ? [btn('저장', false, saveCur, '지금 값을 이 프리셋에 저장 (기본 프리셋이면 새 이름으로)')] : [])),
    hudEl,
    el('div', {class: 'tabs'}, ...TABS.map(([k, lab]) => btn(lab, false, () => { S.tab = k; save(); render(); }, '', k === S.tab ? 'act' : ''))));
  bodyEl = el('div', {class: 'body'});
  const B = (...kids) => bodyEl.append(...kids);

  if (S.tab === 'tune') {
    // sliders by group; core items always, the rest with "고급 항목"; search shows every match
    const q = el('input', {id: 'slp-q', type: 'search', class: 'fill', placeholder: '항목 검색 (이름 또는 키)', value: tuneFilter});
    B(el('div', {class: 'row'}, q, btn('고급 항목', S.adv, () => { S.adv = !S.adv; save(); render(); }, '모든 그룹의 고급 항목 보이기')),
      el('div', {class: 'row sub'}, el('span', {class: 'lab'}, modified ? `프리셋과 다른 값 ${changed.length}개 — 노란 이름` : '모든 값이 프리셋과 같음'),
        ...(modified ? [btn('모두 되돌리기', false, () => loadPreset(S.preset), '프리셋에 저장된 값으로')] : [])));
    const rows = [];
    const rstate = ruleState();
    const codeOf = {};                                      // key -> "B3": group letter + 1-based item index
    DEF.ui.forEach((g, gi) => g.items.forEach((it, ii) => { codeOf[it[0]] = String.fromCharCode(65 + gi) + (ii + 1); }));
    const sliderRow = ([key, label0, min, max, step]) => {
      const label = `${codeOf[key]} ${label0}`;
      const v = S.values[key], reset = () => { setValue(key, cur[key]); render(); }, rs = rstate[key];
      const why = rs ? rs.why.join('\n') : '';
      const lab = el('span', {class: 'lab' + (v !== cur[key] ? ' chg' : '') + (rs && rs.off ? ' off' : rs ? ' warn' : ''),
        title: `${label}\n${key} · 프리셋 값 ${cur[key]} · 범위 ${min}~${max}${why ? '\n' + why : ''}`, ondblclick: reset}, (rs ? (rs.off ? '⊘ ' : '⚠ ') : '') + label);
      const rst = btn('↺', false, reset, `프리셋 값 ${cur[key]}(으)로`, 'ico' + (v !== cur[key] ? '' : ' hide'));
      const note = rs ? el('div', {class: 'sub rnote'}, rs.why[0] + (rs.off && rs.force !== undefined ? ` (적용값 ${rs.force})` : '')) : null;
      const wrapRow = row => { if (rs && rs.off) row.classList.add('off'); if (note) row.append(note); return row; };
      if (min === 0 && max === 1 && step === 1)
        return wrapRow(el('div', {class: 'row it'}, lab, btn(v ? '켜짐' : '꺼짐', !!v, () => { if (rs && rs.off) return; setValue(key, v ? 0 : 1); render(); }), rst));
      const r = el('input', {type: 'range', min, max, step, value: v}), num = el('input', {type: 'number', min, max, step, value: fmt(v, step)});
      if (rs && rs.off) { r.disabled = true; num.disabled = true; }
      r.oninput = () => { num.value = fmt(r.value, step); lab.classList.toggle('chg', Number(r.value) !== cur[key]); };
      r.onchange = () => { setValue(key, Number(r.value)); render(); };
      num.onchange = () => {
        const x = Math.min(max, Math.max(min, Number(num.value)));
        if (num.value === '' || !Number.isFinite(x)) return render();
        setValue(key, x); render();
      };
      return wrapRow(el('div', {class: 'it sl'}, el('div', {class: 'row'}, lab, num, rst), r));      // slider full width: finer steps
    };
    for (const grp of DEF.ui) {
      // a group of advanced items only starts folded and shows them all when opened (user 2026-09-26: "옵션 창이 안펴진다");
      // a mixed group shows its core items, the advanced ones behind its own button or the global "고급 항목"
      const gk = 'g:' + grp.group, nCore = grp.items.filter(it => it[5]).length, nAdv = grp.items.length - nCore;
      const folded = gk in S.fold ? !!S.fold[gk] : !nCore, advOn = S.adv || !nCore || !!S.open[grp.group];
      const nChg = grp.items.filter(it => S.values[it[0]] !== cur[it[0]]).length;
      const box_ = el('div', {class: 'grp'}, el('h4', {onclick: () => { S.fold[gk] = !folded; save(); render(); }, title: folded ? '펼치기' : '접기'},
        el('span', {class: 'lab'}, `${folded ? '▸' : '▾'} ${String.fromCharCode(65 + DEF.ui.indexOf(grp))}. ${grp.group}${folded ? ` (${grp.items.length})` : ''}`),
        ...(!folded && nCore && nAdv && !S.adv ? [btn(advOn ? `고급 ${nAdv} 숨기기` : `고급 ${nAdv} 보기`, advOn,
          e => { e.stopPropagation(); S.open[grp.group] = !S.open[grp.group]; save(); render(); }, '이 그룹의 고급 항목')] : []),
        ...(nChg ? [el('span', {class: 'badge mod'}, `수정 ${nChg}`)] : [])));
      for (const it of grp.items) { const row = sliderRow(it); rows.push([row, `${it[1]} ${it[0]}`.toLowerCase(), it[5] || advOn, folded]); box_.append(row); }
      B(box_);
    }
    const filter = () => {
      const f = tuneFilter.trim().toLowerCase();
      for (const [row, txt, core, folded] of rows) row.style.display = (f ? txt.includes(f) : !folded && (core || S.adv)) ? '' : 'none';
      for (const g of bodyEl.querySelectorAll('.grp')) g.style.display = !f || [...g.querySelectorAll('.it')].some(r => r.style.display !== 'none') ? '' : 'none';
    };
    q.oninput = () => { tuneFilter = q.value; filter(); };
    filter();
    const nOff = Object.values(rstate).filter(s => s.off).length, nWarn = Object.values(rstate).filter(s => !s.off).length;
    B(el('div', {class: 'hint'}, `↺ 또는 이름 더블클릭: 프리셋 값으로 · 숫자 칸에 직접 입력 가능 · 이름에 마우스를 올리면 키와 범위 · ⊘ 비활성 ${nOff}(관계 규칙으로 잠김) · ⚠ 주의 ${nWarn}`),
      el('div', {class: 'hint'}, '판단 순서: 안전 필터(여유 → 앞길 → 공격자 충돌 시각 → 거대 뱀 몸 → 회전 일관성) → 남은 후보의 점수 합(먹이·잔해·전진·회피·출구…) → 후보 0이면 비상. 필터가 지운 후보에는 점수 항이 작용하지 않음.'));
  } else if (S.tab === 'show') {
    const onA = ANALYSIS.filter(([k]) => S.show[k]).length, setAll = on => { for (const [k] of ANALYSIS) S.show[k] = on; save(); render(); };
    B(el('h5', {}, '기본 표시'),
      el('div', {class: 'grid'}, ...BASIC.map(([k, l]) => tog(l, k)), tog('먹이 작게', 'smallFood', S), tog('prey 숨기기', 'hidePrey', S)),
      el('div', {class: 'row'}, el('span', {class: 'lab sub'}, `줌 ×${S.zoom.toFixed(2)} — 마우스 휠로 조절`), btn('줌 초기화 (Z)', false, () => setZoom(1))),
      el('h5', {}, el('span', {class: 'lab'}, `분석 표시 — 튜닝용 (${onA}/${ANALYSIS.length})`),
        btn('모두 켜기', false, () => setAll(true)), btn('모두 끄기', false, () => setAll(false))),
      el('div', {class: 'grid'}, ...ANALYSIS.map(([k, l]) => tog(l, k))));
    const legend = [];
    if (S.show.why) legend.push(el('div', {}, '후보 끝점 (○ 평속, □ 부스트): ', ...WHY_KO.map((t, k) => el('span', {style: `color:${WHY[k]};margin-right:6px`}, '● ' + t))));
    if (S.show.ring) legend.push(el('div', {}, '포위 링: 빨강 <150px, 노랑 <400px, 보라 테두리 = 감는 적, 흰 화살표 = 가장 빈 쪽, 보라 화살표 = 감김 출구'));
    if (S.show.held) legend.push(el('div', {}, '회색 점선 = 직전 계획, 파란 점선 = 2등 계획'));
    legend.push(el('div', {}, '모드 색: ', ...Object.keys(MODE_COL).map(m => el('span', {class: 'chip', style: `background:${MODE_COL[m]}`}, MODE_KO[m]))));
    B(el('h5', {}, '범례'), el('div', {class: 'box', style: 'line-height:1.8'}, ...legend));
  } else if (S.tab === 'preset') {
    B(el('h5', {}, '프리셋'),
      el('div', {class: 'sub'}, `${presetLabel(S.preset)} · ${modified ? `저장 안 된 수정 ${changed.length}개` : '저장된 값 그대로'}`),
      el('div', {class: 'row wrap'},
        btn('저장', false, saveCur, '지금 값을 이 프리셋에 저장 (기본 프리셋이면 새 이름으로)'),
        btn('새 이름으로 저장', false, saveAs),
        btn('되돌리기', false, () => loadPreset(S.preset), '이 프리셋에 저장된 값으로'),
        btn('삭제', false, () => {
          if (BUILTIN[S.preset]) return note('기본 프리셋은 지울 수 없습니다');
          if (!window.confirm(`'${S.preset}' 프리셋을 지울까요? (지금 값은 그대로 유지)`)) return;
          delete S.presets[S.preset]; S.preset = S.profile; save(); render();
        }, '저장한 프리셋 지우기 (기본 프리셋 제외)'),
        btn('JSON 내보내기', false, () => {
          download(`slp_params_${S.preset}_${valuesHash()}.json`, {preset: S.preset, profile: S.profile, values: S.values, params_version: DEF.version, ext: VERSION});
          pushHistory({kind: 'export'}); save(); render();
        }, '지금 값을 파일로 (다운로드 폴더)')),
      el('div', {class: 'hint'}, '마지막 설정은 자동으로 저장되고 다음에 열 때 복원됩니다.'),
      el('h5', {}, '숫자 키 (1~4로 전환 · Shift+숫자로 지금 프리셋 지정)'),
      ...['1', '2', '3', '4'].map(n => el('div', {class: 'row'},
        el('span', {class: `badge key${S.slots[n] === S.preset && presetExists(S.preset) ? ' on' : ''}`}, n),
        el('span', {class: 'lab fill'}, presetExists(S.slots[n]) ? presetShort(S.slots[n]) : '— 비어 있음'),
        btn('지금 프리셋 지정', false, () => { presetKey(n, true); render(); }, `${presetShort(S.preset)} → ${n}번 키`),
        ...(S.slots[n] ? [btn('비우기', false, () => { delete S.slots[n]; save(); render(); })] : []))));
    const kinds = [['all', '전체'], ['game', '판'], ['save', '저장·내보내기']];
    const shown = S.history.filter(e => histFilter === 'all' || (histFilter === 'game' ? e.kind === 'game' : e.kind !== 'game'));
    B(el('h5', {}, el('span', {class: 'lab'}, `설정 기록 (${shown.length})`),
      ...kinds.map(([k, l]) => btn(l, histFilter === k, () => { histFilter = k; render(); }))));
    if (!shown.length) B(el('div', {class: 'hint'}, '아직 기록이 없습니다. 판이 끝나거나 프리셋을 저장·내보내면 여기에 쌓입니다.'));
    const now = valuesHash();
    for (const e of shown) {
      const who = e.preset && !BUILTIN[e.preset] ? e.preset : PROFILES[e.profile] || e.profile;
      const what = e.kind === 'game' ? `판 ${Math.round(e.seconds)}초 · 길이 ${e.L_max}` : e.kind === 'save' ? `프리셋 저장 '${e.label}'` : '내보내기';
      const extra = e.kind === 'game' && e.changes ? ` · 판 중 조정 ${e.changes}회` : '';
      B(el('div', {class: 'hist' + (e.hash === now ? ' cur' : ''), title: e.hash === now ? '지금 값과 같음' : ''},
        el('div', {class: 'lab'}, el('div', {}, `${stamp5(e.at)} · ${what}`), el('div', {class: 'sub'}, `${who} · #${e.hash}${extra}`)),
        btn(e.start ? '끝 값' : '불러오기', false, () => loadHistory(e, false), e.start ? '판이 끝날 때의 값' : '이 값으로'),
        ...(e.start ? [btn('시작 값', false, () => loadHistory(e, true), `판을 시작할 때의 값 #${e.start.hash}`)] : [])));
    }
  } else if (S.tab === 'gfx') {
    const G = S.gfx, lv = gfxLevel(), top_ = GFX_LEVELS.length - 1;
    const lvText = v => v < 0 ? '사용자 지정 (아래 세부 설정)' : `${v} · ${GFX_LEVELS[v][0]}`, lvVal = el('b', {}, lvText(lv));
    const q = el('input', {type: 'range', class: 'fill', min: 0, max: top_, step: 1, value: lv < 0 ? top_ : lv});
    q.oninput = () => { lvVal.textContent = lvText(Number(q.value)); };
    q.onchange = () => setGfx(GFX_LEVELS[Number(q.value)][1]);
    const res = el('select', {onchange: e => setGfx({res: Number(e.target.value)})});
    for (const [v, t] of [[1, '100%'], [.75, '75%'], [.5, '50%']]) res.append(Object.assign(el('option', {value: v}, t), {selected: G.res === v}));
    const hzSel = el('select', {onchange: e => setGfx({hz: Number(e.target.value)})});
    for (const v of [0, 30, 60, 90, 120, 144]) hzSel.append(Object.assign(el('option', {value: v}, v ? `타이머 ${v}/s${v === 60 ? ' (기본)' : ''}` : '화면 갱신 (게임 원래)'), {selected: G.hz === v}));
    B(el('h5', {}, '그래픽 품질'),
      el('div', {class: 'row'}, el('span', {class: 'sub'}, '빠름'), q, el('span', {class: 'sub'}, '원래')),
      el('div', {class: 'lvl'}, lvVal),
      el('div', {class: 'hint'}, '0~1: 게임 그리기 대신 선·원만 그림 (가장 가벼움). 봇 판단과 분석 표시는 그대로입니다.'),
      el('h5', {}, '세부 설정'),
      el('div', {class: 'grid'},
        chip('선·원만 그리기', G.mini, () => setGfx({mini: !G.mini}), '게임 그리기를 대신함: 테두리, 먹이 점(잔해 노랑), 몸 = 굵은 선, 머리 = 점. 이름·스킨·prey 없음'),
        chip('저화질 (글로우 끔)', G.low, () => setGfx({low: !G.low}), '게임 자체의 저화질: 먹이·부스트 빛 번짐을 끔'),
        chip('단순 몸 그리기', G.simple, () => setGfx({simple: !G.simple}), '게임의 모바일 방식: 몸을 마디 그림 대신 선으로'),
        chip('배경 끄기', G.noBg, () => setGfx({noBg: !G.noBg}), '육각 무늬 배경 대신 검은 바탕'),
        chip('30FPS 제한', G.cap, () => setGfx({cap: !G.cap}), '초당 30번까지만 그림 (게임 계산·봇 판단은 그대로). 이미 30 이하면 영향 없음')),
      el('div', {class: 'row'}, el('span', {class: 'lab'}, '해상도 (낮추면 가볍고 흐려짐)'), res),
      el('div', {class: 'row'}, el('span', {class: 'lab', title: '타이머 60(기본) = 게임을 초당 60번 돌림: 봇 명령이 제때 나감(게임은 루프 안에서 조작을 전송). 화면 갱신 = 게임 원래 방식(브라우저 화면 갱신에 맞춤)'}, '게임 루프'), hzSel),
      el('div', {class: 'hint'}, '상태 칸 셋째 줄: 1프레임에 걸린 시간(게임 계산 · 그리기 · MOD 표시)과 메인 스레드 사용률.'));
  } else {
    const srv = el('select', {class: 'fill', onchange: e => { S.server = e.target.value; save(); }});
    srv.append(Object.assign(el('option', {value: ''}, '자동 (게임 기본)'), {selected: !S.server}));
    // ac: the list's activity value (NOT the player count — that is slither_count in the HUD); sorted by ping, then ac
    const sos = (window.sos || []).filter(o => o && o.ip && !String(o.ip).startsWith('[')).slice()
      .sort((a, b) => ((a.ptm || 9e9) - (b.ptm || 9e9)) || ((b.ac || 0) - (a.ac || 0)));
    for (const o of sos) {
      const v = `${o.ip}:${o.po}`;
      srv.append(Object.assign(el('option', {value: v}, `${v} · ac ${o.ac || 0}${o.ptm && o.ptm < 9e6 ? ` · ${o.ptm}ms` : ''}`), {selected: v === S.server}));
    }
    if (S.server && !sos.some(o => `${o.ip}:${o.po}` === S.server)) srv.append(Object.assign(el('option', {value: S.server}, S.server), {selected: true}));
    const cur_ = window.bso ? `${window.bso.ip}:${window.bso.po}` : '-';
    B(el('h5', {}, '서버 (다음 판부터)'),
      el('div', {class: 'row'}, srv, btn('↻', false, render, '목록 새로고침', 'ico')),
      el('div', {class: 'sub'}, `지금 접속: ${cur_}${window.bso && window.bso.sid ? ` (ID ${window.bso.sid})` : ''} · 게임 목록에서 고른 서버가 우선`),
      el('h5', {}, '판 기록'),
      el('div', {class: 'row'}, chip('판이 끝나면 기록(JSON) 자동 저장', S.autosave, () => { S.autosave = !S.autosave; save(); render(); }, '다운로드 폴더에 저장')),
      el('h5', {}, `최근 판 (${S.games.length})`),
      el('div', {class: 'box', style: 'white-space:pre'}, S.games.slice(0, 10).map(g =>
        `${stamp5(g.at)}  ${String(Math.round(g.seconds)).padStart(4)}초  길이 ${String(g.L_max).padStart(5)}  ${g.preset && !BUILTIN[g.preset] ? g.preset : PROFILES[g.profile] || g.profile}`).join('\n') || '아직 없음'),
      el('h5', {}, '단축키'),
      el('div', {class: 'box', style: 'line-height:1.7'}, 'T  봇 켜기/끄기', el('br'), 'H  패널 숨기기/보이기', el('br'), 'Z  줌 초기화 · 마우스 휠  줌', el('br'), '1~4  프리셋 전환 · Shift+1~4  지금 프리셋을 그 키에'),
      el('div', {class: 'row', style: 'margin-top:10px'}, btn('패널 위치 초기화', false, () => { S.pos = null; save(); render(); })));
  }
  panel.append(top, bodyEl);
  document.body.append(panel);
  placePanel(); updateHud();
  bodyEl.scrollTop = scrollMem[S.tab] || 0; shownTab = S.tab;
  if (refocus) { const q = document.getElementById('slp-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
}

// ---------- start once the game script is up ----------
const boot = setInterval(() => {
  if (typeof window.redraw !== 'function' || typeof window.connect !== 'function' || !window.mc || !document.body) return;
  clearInterval(boot);
  hookRedraw(); hookLoop(); hookConnect(); hookResize(); applyGfx(); applyLoop(); render();
  window.__slp = {S, version: VERSION, worker: !!worker, setBot, setGfx, GFX_LEVELS, perf: () => perf, setValue: (k, v) => { setValue(k, v); render(); }, setZoom,
    lastRecord: () => window.__slpLastRecord, trace: n => game ? game.trace.slice(-n) : [],
    lastBox: async (which = '__slpLastBox') => {       // gzip bytes as base64, for test scripts (also '__slpLastLog')
      const b = window[which]; if (!b) return null;
      const u = new Uint8Array(await b.arrayBuffer()); let s = '';
      for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
      return btoa(s);
    },
    boxSize: () => game ? {frames: game.box.length, floats: game.box.reduce((n, f) => n + f.segs.length + f.heads.length + f.food.length + f.own.length, 0)} : null,
    terms: () => last && last.draw.an && last.draw.an.plans && last.draw.an.plans.chosen.terms,
    status: () => ({bot: S.bot, game: !!game, ticks: game && game.ticks, fps, ping, errors: game && game.errors,
      last: last && {ms: last.ms, mode: last.trace.mode, squeeze: last.trace.squeeze}, squeeze_ticks: game && game.squeeze.length})};
  console.log('[SLP] MOD', VERSION, 'ready; worker', !!worker);
}, 100);
})();
