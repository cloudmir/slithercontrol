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
  'ttds', 'ttdh', 'branch', 'cause', 'head_hit', 'head_checked', 'ttddyn', 'dyn_id', 'dyn_kind', 'dyn_gap', 'dyn_heads', 'dyn_excluded', 'emergency', 'em_gap', 'em_unavoidable', 'unknown_at', 'verified_s', 'static_hit', 'boost_reason', 'chg', 'exit_width', 'exit_reach', 'exit_close', 'exit_slack', 'exit_unknown', 'exit_reason', 'v3_ms', 'v3_over', 'v3_full', 'v3_hold', 'v3_leaves', 'v3_eval', 'v3_cert', 'v3_ncert', 'v3_exits', 'v3_risk', 'v3_commit', 'v3_shield', 'v3_root', 'v3_keep', 'v3_local', 'v3_goal', 'v3_goal_age', 'v3_route_match', 'v3_cert_reason', 'pred25', 'herr25', 'trk_age', 'trk_cmd', 'trk_why', 'v6_intent', 'v6_goal_x', 'v6_goal_y', 'v6_reason', 'v7_phase', 'v7_heads', 'v7_radius', 'v7_threshold', 'v7_switched', 'v8_phase', 'v8_heads', 'v8_radius', 'v8_threshold', 'v8_switched', 'v81_on', 'v81_density', 'v81_body_trigger', 'v81_reason', 'v9_routes', 'v9_reason', 'v9_clear', 'v9_plan_ms']
const CLIP_MAX_FRAMES = 3600;
const OVERLAY_LINE_WIDTH = 0.5;
const PROFILES = {safe: '안전형', aggressive: '공격형'};
// Displays: the basic ones start on, the analysis ones (for tuning) start off (user 2026-09-26).
const BASIC = [['v9Map', 'V9 몸통 벽 지도'], ['v9Routes', 'V9 탈출 후보'], ['bodyRadius', '몸통 밀도 반경'], ['headRadius', '머리 개수 판단 반경'], ['path', '예측 경로'], ['mazePath', 'V6 미로 경로'], ['localPath', 'V6 근접 회피 경로'], ['gaps', '가장 가까운 3점(경계까지 px)·틈'], ['scores', '적 길이'], ['border', '경계'], ['death', '사망 지점'], ['goal', '먹이 목표']];
const ANALYSIS = [['why', '후보 탈락 이유'], ['terms', '점수 구성'], ['heads', '적 머리 예측'], ['ring', '포위 링'], ['margin', '여유 테두리'],
  ['rays', '앞길 광선'], ['held', '유지·2등 계획'], ['timeline', '타임라인'], ['deathSum', '사망 직전 요약'], ['heaps', '먹이 무더기'],
  ['squeeze', '좁아지는 통로']];
const WHY = ['#60ff60', '#ff4040', '#ff9a30', '#b070ff', '#909090', '#ff60ff'];      // pilot.js analysis.why codes 0-5
const WHY_KO = ['안전', '여유 부족', '최소 여유 부족', '막다른 길', '반대 방향', '코일 반대'];
const TERM_KO = {food: '경로 먹이', open: '끝 공간', turn: '방향 변경', thread: '좁은 틈', prog: '전진', big: '굵은 적', curl: '몸 말림',
  par: '나란히', rim: '가장자리', hunt: '추격', crowd: '혼잡', loop: '루프 탈출', goal: '먹이 무더기', heap: '잔해 부스트', wrap: '감김 출구',
  esc: '빈 쪽', away: '공격자 회피', run: '부스트 도주', cut: '가로지르기', boost: '부스트 비용', flip: '반대 회전', squeeze: '좁은 통로 탈출'};
const MODE_KO = {feed: '먹이', cruise: '순항', evade: '회피', escape: '탈출', unwrap: '감김 풀기', loop: '루프 탈출', coil: '코일', emergency: '비상'};
const TABS = [['home', '⌂', '홈'], ['tune', '⌁', '조정'], ['show', '◎', '표시'], ['preset', '◇', '보관'], ['gfx', '▦', '화면'], ['game', '⌘', '게임']];
const MODE_COL = {feed: '#4c4', cruise: '#888', evade: '#f93', escape: '#fd4', unwrap: '#f6f', loop: '#4dd', coil: '#a6f', emergency: '#f44'};

// ---------- settings (localStorage of slither.io) ----------
const FACTORY = DEF.presets || {};
const preset = name => {
  const f = FACTORY[name];
  const profile = f ? f.profile : name;
  return Object.assign({}, DEF.defaults, DEF.profiles[profile] || {}, f ? f.values : {});
};
// Built-in profiles and reviewed factory presets come from params.json; user presets live in S.presets.
const BUILTIN = Object.assign({aggressive: '공격형 (기본)', safe: '안전형 (기본)'},
  Object.fromEntries(Object.entries(FACTORY).map(([k, v]) => [k, v.label])));
function normalize(s) {
  const base = {profile: 'aggressive', preset: null, presets: {}, slots: {}, values: null, bot: false, panel: true, zoom: 1, autosave: true,
    server: '', serverSeen: {}, smallFood: false, hidePrey: false, tab: 'home', adv: false, fold: {}, open: {}, openGroup: null, games: [], history: [], death: null, pos: null, savedAt: 0,
    gfx: {low: false, simple: false, noBg: false, cap: false, res: 1, mini: false, hz: 60},
    show: Object.fromEntries([...BASIC.map(([k]) => [k, true]), ...ANALYSIS.map(([k]) => [k, false])])};
  const showDefaults = base.show;
  s = Object.assign(base, s || {}); s.show = Object.assign({}, showDefaults, s.show); delete s.show.fan;
  s.gfx = Object.assign({low: false, simple: false, noBg: false, cap: false, res: 1, mini: false, hz: 60}, s.gfx);
  if (!s.serverSeen || typeof s.serverSeen !== 'object' || Array.isArray(s.serverSeen)) s.serverSeen = {};
  // game loop timer 60 by default (user 2026-09-26 after runs/gfx_bench_20260926_214337): settings saved before get it once
  if (!s.hz60) { s.gfx.hz = 60; s.hz60 = true; }
  if (!DEF.profiles[s.profile]) s.profile = 'aggressive';
  if (!TABS.some(([k]) => k === s.tab)) s.tab = 'home';
  if (s.values?.V81_ON || s.preset === 'v81_exact') { s.values = {...s.values, V8_ON: 1}; s.preset = 'v8_exact'; }
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
const presetProfile = name => FACTORY[name] ? FACTORY[name].profile : (DEF.profiles[name] ? name : S.presets[name].profile);
const presetLabel = name => BUILTIN[name] || `${name} (${PROFILES[S.presets[name].profile]} 기반)`;
// Number keys 1-4 switch presets (user 2026-09-28): S.slots {"1": presetName}. Shift+number puts the current preset there.
const presetExists = name => !!(name && (BUILTIN[name] || S.presets[name]));
const presetShort = name => BUILTIN[name] || name;
const slotOf = name => Object.keys(S.slots).find(n => S.slots[n] === name && presetExists(name)) || null;
const unsavedKeys = () => { const cur = presetValues(S.preset); return Object.keys(cur).filter(k => S.values[k] !== cur[k]); };
function applyPreset(name) {
  if (S.values.V9_ON || name === 'v9_maze') { plan = null; commandHistory.length = 0; }
  S.preset = name; S.profile = presetProfile(name); S.values = presetValues(name); save();
  route = null; planVer++; planSentAt = 0;
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
    if (m.type === 'plan') { try { const r = m.kind === 'v9' ? pilot.v9Route(m.s, m.ver) : m.kind === 'v8' ? pilot.v8Route(m.s, m.ver) : m.kind === 'v7' ? pilot.v7Route(m.s, m.ver) : m.kind === 'v6' ? pilot.v6Route(m.s, m.ver) : pilot.v4Route(m.s, m.ver); reply(Object.assign({type: 'plan'}, r)); } catch (err) { reply({type: 'plan', ver: m.ver, error: String((err && err.stack) || err)}); } return; }
    if (m.type !== 'step') return;
    const t0 = performance.now();
    try {
      const [cmd, boost] = pilot.step(m.s);
      const d = pilot.last.draw;
      reply({id: m.id, cmd, boost, ms: performance.now() - t0, trace: pilot.last.trace, plan: pilot.last.plan || null, controls: pilot.last.controls || null,
        draw: {v9At: d.v9At, v9Paths: d.v9Paths, v9Walls: d.v9Walls, v9Map: d.v9Map, v9Reason: d.v9Reason, chosen: d.chosen, mazePath: d.mazePath, localPath: d.localPath, mazeState: d.mazeState, localUnsafe: d.localUnsafe, localAvoiding: d.localAvoiding,
          guideCert: d.guideCert, guideWidth: d.guideWidth, near: d.near, gaps: d.gaps.map(g => ({m: g.m, w: g.w})), goal: d.goal, crowdAt: d.crowdAt,
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
// planner Worker (V4 route search, contract 7): same source, its own pilot; receives 'plan' snapshots, returns versioned routes
let worker2 = null, route = null, planVer = 0, planSentAt = 0, planBusy = false;
try {
  const src2 = `(${window.slpPilotModule})(self);\nconst handle = (${makeHandler})();\nonmessage = e => handle(e.data, r => postMessage(r));`;
  worker2 = new Worker(URL.createObjectURL(new Blob([src2], {type: 'text/javascript'})));
  worker2.onmessage = e => { const r = e.data; planBusy = false; if (!r || r.type !== 'plan') return; if (r.error) { console.error('[SLP plan]', r.error); return; }
    if (r.ver === planVer) route = (r.pts || r.algo === 'v9') ? {routes: r.routes, map: r.map, algo: r.algo, ver: r.ver, t0: r.t0, pts: r.pts, exits: r.exits, ms: r.ms, partial: r.partial, certified: r.certified, reason: r.reason, minClear: r.minClear, minSlack: r.minSlack, expanded: r.expanded, mode: r.mode, goal: r.goal, intent: r.intent, foodValue: r.foodValue} : null; };
  worker2.onerror = e => { console.error('[SLP plan worker]', e.message); worker2 = null; };
} catch (e) { worker2 = null; }
function send(m, transfer) {
  if (worker2 && (m.type === 'reset' || m.type === 'params')) worker2.postMessage(m);
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
let v8Switch = {phase: 'feed', clearSince: null};
function observe() {
  const s = window.slither;
  if (!window.playing || !s || s.dead) return null;
  let v8Control = null;
  if (!S.values.V9_ON && S.values.V8_ON) {
    const seen = new Set(), r2 = S.values.V8_HEAD_R ** 2;
    for (const o of window.slithers) if (o !== s && !o.dead && Number.isFinite(o.xx + o.yy) &&
      (o.xx - s.xx) ** 2 + (o.yy - s.yy) ** 2 <= r2) seen.add(o.id);
    // Independent trigger observation: retain the original V1/V6 controller ranges below.
    let density = 0;
    if (S.values.V81_BODY_ON) {
      const segs = [], ownSegs = [], radius = S.values.V81_BODY_R ?? 450;
      for (const o of [s, ...window.slithers.filter(o => o !== s && o.id !== s.id)]) {
        if (o.dead) continue;
        const r = 14.5 * o.sc;
        let prev = null;
        for (const pt of [...(o.pts || []), {xx: o.xx, yy: o.yy}]) {
          if (pt.dying || !Number.isFinite(pt.xx + pt.yy)) { prev = null; continue; }
          if (prev && Math.min(prev.xx, pt.xx) - r <= s.xx + radius &&
              Math.max(prev.xx, pt.xx) + r >= s.xx - radius &&
              Math.min(prev.yy, pt.yy) - r <= s.yy + radius &&
              Math.max(prev.yy, pt.yy) + r >= s.yy - radius)
            (o === s ? ownSegs : segs).push(prev.xx, prev.yy, pt.xx, pt.yy, r);
          prev = pt;
        }
      }
      density = window.SlpPilot.bodyDensity({x: s.xx, y: s.yy, segs, ownSegs}, radius, S.values.V81_BODY_NEAR_W ?? 2, S.values.V81_BODY_SELF_W ?? .1);
    }
    v8Control = window.SlpPilot.v8Choice(v8Switch, seen.size, performance.now() / 1000, S.values, density);
    if (v8Control.switched) { route = null; planVer++; planSentAt = 0; }
  }
  const nine = !!S.values.V9_ON;
  const seven = !nine && !S.values.V8_ON && S.values.V7_ON;
  const six = nine ? false : S.values.V8_ON ? v8Control.phase === 'avoid' : seven || S.values.V6_ON;
  const radius = Math.max(RADIUS, nine ? S.values.V9_OBS : 0, six ? S.values.V6_OBS : 0, seven ? S.values.V7_HEAD_R : 0);
  const hx = s.xx, hy = s.yy, R2 = radius * radius, RF2 = (seven ? Math.max(S.values.FOOD_R, S.values.V6_FOOD_R ?? 3000) : six ? (S.values.V6_FOOD_R ?? 3000) : FOOD_RADIUS) ** 2;
  const inr = (x, y) => (x - hx) * (x - hx) + (y - hy) * (y - hy) < R2, inf = (x, y) => (x - hx) * (x - hx) + (y - hy) * (y - hy) < RF2;
  const segs = [], sid = [], heads = [], hid = [], food = [], own = [];
  for (const o of window.slithers) {
    if (o === s || o.dead) continue;
    const r = 14.5 * o.sc, P = o.pts;
    let px = null, py = null, pin = false;
    for (let i = 0; i <= P.length; i++) {
      let x, y;
      if (i < P.length) { if (P[i].dying) { if (nine) { px = null; py = null; pin = false; } continue; } x = P[i].xx; y = P[i].yy; } else { x = o.xx; y = o.yy; }
      if (nine && !Number.isFinite(x + y)) { px = null; py = null; pin = false; continue; }
      const inn = inr(x, y);
      if (px !== null && (inn || pin || (nine && Math.min(px,x)-r <= hx+radius && Math.max(px,x)+r >= hx-radius && Math.min(py,y)-r <= hy+radius && Math.max(py,y)+r >= hy-radius))) { segs.push(px, py, x, y, r); sid.push(o.id); }
      px = x; py = y; pin = inn;
    }
    if (inf(o.xx, o.yy)) { heads.push(o.xx, o.yy, o.ang, o.sp, o.sc); hid.push(o.id); }
  }
  for (let i = 0; i < window.foods_c; i++) { const f = window.foods[i]; if (f && !f.eaten && inf(f.xx, f.yy)) food.push(f.xx, f.yy, f.sz); }
  for (const p of s.pts) if (!p.dying) own.push(p.xx, p.yy);
  own.push(hx, hy);
  const F = a => Float64Array.from(a);
  return {v8Control, x: hx, y: hy, ang: s.ang, sp: s.sp, sc: s.sc, boost: s.md, wall: [window.grd, window.grd, window.flux_grd],
    L: snakeLen(s), t: performance.now() / 1000, cmdHistory: nine ? commandHistory.slice() : undefined,
    segs: F(segs), sid: F(sid), heads: F(heads), hid: F(hid), food: F(food), own: F(own), cmdNow: sent.ang, boostNow: !!(s.wmd)};
}
function snakeLen(o) { const sct = o.sct + o.rsc; return Math.floor((window.fpsls[sct] + o.fam / window.fmlts[sct] - 1) * 15 - 5); }

// ---------- game loop: observe -> pilot -> command; one record per game ----------
let game = null, pending = null, reqId = 0, last = null, lastPos = null;
const pct = (a, q) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return Math.round(b[Math.min(b.length - 1, Math.floor(q * b.length))] * 10) / 10; };
function startGame() {
  commandHistory.length = 0;
  v8Switch = {phase: 'feed', clearSince: null};
  game = {start: new Date(), t0: performance.now(), ticks: 0, ms: [], page_ms: [], modes: {}, trace: [], L_max: 0, squeeze: [], box: [], freezes: [], lastTick: 0, log: [], clips: [], clipFrames: 0, ep: null, fr: [], pk: [],
    profile: S.profile, preset: S.preset, values: Object.assign({}, S.values), values_hash: valuesHash(), changes: [], bot_on: S.bot, predQ: [],
    server: window.bso ? `${window.bso.ip}:${window.bso.po}` : null, errors: 0, players: 0};
  pending = null; last = null; deathBox(null);
  send({type: 'reset', ...pilotParams()});
}
function endGame() {
  const g = game; game = null; pending = null; plan = null; sent.bucket = -1; sent.ang = NaN; sent.boost = 0; route = null; planBusy = false;
  const secs = (performance.now() - g.t0) / 1000;
  if (lastPos) S.death = {x: lastPos[0], y: lastPos[1], at: Date.now()};
  const rec = {ext: VERSION, params_version: DEF.version, at: g.start.toISOString(), seconds: Math.round(secs * 10) / 10,
    L_max: g.L_max, death: S.death, server: g.server, players: g.players, rank: g.rank || null, best_rank: g.bestRank || null, profile: g.profile, preset: g.preset, values_hash: g.values_hash, values: g.values,
    changes: g.changes, bot_on_at_start: g.bot_on, ticks: g.ticks, modes: g.modes, errors: g.errors,
    squeeze_ticks: g.squeeze.length, squeeze: g.squeeze.slice(-300), freezes: g.freezes,
    decide_ms: {p50: pct(g.ms, .5), p95: pct(g.ms, .95)}, obs_to_cmd_ms: {p50: pct(g.page_ms, .5), p95: pct(g.page_ms, .95)},
    trace: g.trace, track: {frames: g.fr, packets: g.pk, keys: ['t_ms', 'ang', 'wang', 'sent', 'plan_h']}};
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
  let pred = null, pred25 = null, herr25 = null;
  const wrapA = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  for (const q of game.predQ) if (q.p25 === undefined && st.t - q.t >= .25) { q.p25 = st.t - q.t < .4 ? Math.round(Math.hypot(st.x - q.x25, st.y - q.y25) * 10) / 10 : null; q.h25 = q.p25 === null ? null : Math.round(Math.abs(wrapA(st.ang - q.h25)) * 180 / Math.PI * 10) / 10; if (q.p25 !== null) { pred25 = q.p25; herr25 = q.h25; } }
  while (game.predQ.length && st.t - game.predQ[0].t >= .5) {   // +0.5 s: where the plan said we would be (the tracker follows the plan)
    const q = game.predQ.shift(); if (st.t - q.t < .7) pred = Math.round(Math.hypot(st.x - q.x50, st.y - q.y50) * 10) / 10;
  }
  pending.pred = pred; pending.pred25 = pred25; pending.herr25 = herr25; st.pred = pred === null ? -1 : pred;
  if (S.values.V9_ON || S.values.V4_ON || S.values.V6_ON || S.values.V7_ON || S.values.V8_ON) { st.route = route;
    const v9 = !!S.values.V9_ON, v8 = !v9 && !!S.values.V8_ON, v7 = !v9 && !v8 && !!S.values.V7_ON, v6 = v8 || v7 || !!S.values.V6_ON, every = v9 ? (S.values.V9_PLAN_MS || 300) : v6 ? (S.values.V6_PLAN_MS || 400) : (S.values.V4_PLAN_MS || 350);
    const needPlan = v9 ? true : v8 ? st.v8Control.phase === 'avoid' : !v7 || window.SlpPilot.countHeads(st, S.values.V7_HEAD_R) >= S.values.V7_HEAD_N || last?.trace?.v7_phase === 'avoid';
    if (needPlan && worker2 && !planBusy && performance.now() - planSentAt >= every) { planBusy = true; planSentAt = performance.now(); planVer++;
      const cp = Object.assign({}, st, {route: undefined, segs: Float32Array.from(st.segs), sid: Float32Array.from(st.sid), heads: Float32Array.from(st.heads), hid: Float32Array.from(st.hid), food: Float32Array.from(st.food), own: Float32Array.from(st.own)});
      worker2.postMessage({type: 'plan', kind: v9 ? 'v9' : v8 ? 'v8' : v7 ? 'v7' : v6 ? 'v6' : 'v4', ver: planVer, s: cp}, [cp.segs.buffer, cp.sid.buffer, cp.heads.buffer, cp.hid.buffer, cp.food.buffer, cp.own.buffer]); } }
  pending.box = {t: Math.round(pending.at - game.t0) / 1000, x: st.x, y: st.y, ang: st.ang, sp: st.sp, sc: st.sc, boost: st.boost,
    wall: st.wall, L: st.L, v8Control: st.v8Control, cmdHistory: st.cmdHistory, segs: f32(st.segs), sid: f32(st.sid), heads: f32(st.heads), hid: f32(st.hid), food: f32(st.food), own: f32(st.own)};
  send({type: 'step', id: pending.id, s: st}, [st.segs.buffer, st.sid.buffer, st.heads.buffer, st.hid.buffer, st.food.buffer, st.own.buffer]);
}
function onResult(r) {
  if (!pending || r.id !== pending.id || !game) return;
  const obsAt = pending.at, frame = pending.box, gapNow = pending.gapNow, pred = pending.pred, pred25 = pending.pred25, herr25 = pending.herr25, obsT = pending.t; pending = null;
  if (!r.error) {
    frame.cmd = [r.cmd, r.boost]; game.box.push(frame);
    while (frame.t - game.box[0].t > BOX_S) game.box.shift();
    const tr = r.trace, q = (v, d) => v === null || v === undefined ? null : Math.round(v * d) / d;
    if ((S.values.V9_ON || S.values.V8_ON || S.values.V7_ON || S.values.V6_ON) && (tr.cause === 'changed' || tr.cause === 'old')) { route = null; planSentAt = 0; }
    game.log.push([frame.t, q(frame.x, 10), q(frame.y, 10), q(frame.ang, 1000), q(frame.sp, 100), q(frame.sc, 100), frame.L, tr.mode,
      tr.boost ? 1 : 0, tr.cmd, tr.clear, tr.hard, tr.n_safe, tr.wrap, tr.cov, tr.cov_id, tr.cov_free, tr.esc, tr.enclosed, q(gapNow, 10), tr.threat,
      tr.goal, tr.nh, tr.eat, pred, tr.sized, tr.raid, tr.guard, tr.gforce, tr.gatk, tr.giant, tr.pph, tr.pset, tr.pgap, tr.ptr, tr.ptid, tr.pstab, tr.ttd, tr.v2obj,
      tr.ttds, tr.ttdh, tr.branch, tr.cause, tr.head_hit, tr.head_checked, tr.ttddyn, tr.dyn_id, tr.dyn_kind, tr.dyn_gap, tr.dyn_heads, tr.dyn_excluded, tr.emergency, tr.em_gap, tr.em_unavoidable, tr.unknown_at, tr.verified_s, tr.static_hit, tr.boost_reason, tr.chg, tr.exit_width, tr.exit_reach, tr.exit_close, tr.exit_slack, tr.exit_unknown, tr.exit_reason, tr.v3_ms, tr.v3_over, tr.v3_full, tr.v3_hold, tr.v3_leaves, tr.v3_eval, tr.v3_cert, tr.v3_ncert, tr.v3_exits, tr.v3_risk, tr.v3_commit, tr.v3_shield, tr.v3_root, tr.v3_keep, tr.v3_local, tr.v3_goal, tr.v3_goal_age, tr.v3_route_match, tr.v3_cert_reason, pred25, herr25, plan ? Math.round(sent.planAge * 1000) / 1000 : null, Number.isFinite(sent.ang) ? Math.round(sent.ang * 180 / Math.PI * 10) / 10 : null, sent.why, tr.v6_intent, tr.v6_goal_x, tr.v6_goal_y, tr.v6_reason, tr.v7_phase, tr.v7_heads, tr.v7_radius, tr.v7_threshold, tr.v7_switched, tr.v8_phase, tr.v8_heads, tr.v8_radius, tr.v8_threshold, tr.v8_switched, tr.v81_on, tr.v81_density, tr.v81_body_trigger, tr.v81_reason, tr.v9_routes, tr.v9_reason, tr.v9_clear, tr.v9_plan_ms]);
    if (r.plan && r.plan.length >= 10) { const P = r.plan, n = P.length / 5, at = tt => { let i = 0; while (i + 1 < n && P[5 * (i + 1)] < tt) i++;
        if (i + 1 >= n) { const k = 5 * (n - 1); return [P[k + 1], P[k + 2], P[k + 3]]; }
        const k = 5 * i, t0 = P[k], t1 = P[k + 5], f = t1 > t0 ? Math.min(1, Math.max(0, (tt - t0) / (t1 - t0))) : 0, dh = ((P[k + 8] - P[k + 3] + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
        return [P[k + 1] + f * (P[k + 6] - P[k + 1]), P[k + 2] + f * (P[k + 7] - P[k + 2]), P[k + 3] + f * dh]; };
      const a = at(.25), b = at(.5); if ([a, b].every(v => v.every(Number.isFinite))) game.predQ.push({t: obsT, x25: a[0], y25: a[1], h25: a[2], x50: b[0], y50: b[1]}); }
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
    if ((S.values.V9_ON || S.values.TRACK_ON) && r.plan && r.plan.length >= 10) { plan = {T0: obsAt, pts: r.plan, controls: r.controls, n: r.plan.length / 5, tEnd: r.plan[r.plan.length - 5]}; try { track(); } catch (e) { game.errors++; console.error('[SLP track]', e); } }
    else { plan = null; applyCmd(r.cmd, r.boost, 'direct'); }
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
  if (S.values.V9_ON && !on) { plan = null; commandHistory.length = 0; }
  S.bot = on; save(); toast(on ? '● 봇 ON' : '○ 봇 OFF');
  if (on && game) { game.changes.push({t: gameT(), bot: true}); send({type: 'reset', ...pilotParams()}); }
  if (!on && game) { game.changes.push({t: gameT(), bot: false}); window.setAcceleration(0); }
  render();
}
const gameT = () => game ? Math.round(performance.now() - game.t0) / 1000 : null;
function setValue(k, v) {
  if (S.values.V9_ON || k === 'V9_ON') plan = null;
  if (v && /^V(?:2|3|4|41|5|6|7|8)_ON$/.test(k)) S.values.V9_ON = 0;
  S.values[k] = v; save();
  route = null; planVer++; planSentAt = 0;
  if (game) game.changes.push({t: gameT(), [k]: v});
  send({type: 'params', ...pilotParams()});
}

// ---------- input: bot owns the mouse while it drives (panel excepted); hotkeys; wheel zoom ----------
let panel = null, drag = null;
const inPanel = e => panel && panel.contains(e.target);
function placePanel() {
  if (!panel || !S.pos) return;
  const x = Math.min(Math.max(0, S.pos.x), Math.max(0, window.innerWidth - panel.getBoundingClientRect().width - 8)), y = Math.min(Math.max(0, S.pos.y), window.innerHeight - 30);
  Object.assign(panel.style, {left: x + 'px', top: y + 'px', right: 'auto', transformOrigin: 'top left', maxHeight: Math.min(760, Math.max(200, window.innerHeight - y - 8)) + 'px'});
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
  ctx.strokeStyle = '#a33'; ctx.lineWidth = OVERLAY_LINE_WIDTH;
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
// ---------- tracker (2026-09-30, Claude+Codex): the planner returns a time-stamped trajectory [t, x, y, heading, boost] from the
// observation time; every game loop (before oef's own send check) we pure-pursue the point TRACK_LOOK s ahead of "now" on that
// trajectory and write xm/ym only when the game's 251-step angle bucket changes. Packets are logged at ws.send; slither.wang
// (the server's target angle) and slither.ang are sampled every loop to measure command -> server -> head latency offline. ----------
let plan = null;                       // {T0: performance.now() of the observation, pts: [t,x,y,h,b,...], n, tEnd}
const sent = {ang: NaN, bucket: -1, boost: 0, at: 0, planAge: 0, why: 'none'};
const commandHistory = [];
const bucketOf = a => { let b = a % (2 * Math.PI); if (b < 0) b += 2 * Math.PI; return Math.floor(251 * b / (2 * Math.PI)); };
function applyCmd(ang, boost, why) {   // xm/ym only when the bucket changes (the game skips equal buckets anyway); boost via wmd
  const b = bucketOf(ang), cur = (window.xm || window.ym) ? bucketOf(Math.atan2(window.ym, window.xm)) : -1;   // the game's real value (a mouse move over the panel can overwrite it)
  if (b !== sent.bucket || cur !== b) { window.xm = Math.cos(ang) * 250; window.ym = Math.sin(ang) * 250; sent.bucket = b; sent.at = performance.now(); }
  sent.ang = ang; sent.why = why;
  const want = boost ? 1 : 0, s = window.slither, real = s && s.wmd ? 1 : 0;   // compare with the real wanted mode, not our memory (bot off resets it)
  if (want !== real) window.setAcceleration(want);
  sent.boost = want;
  if (S.values.V9_ON) {
    const t = performance.now() / 1000, actual = Math.atan2(window.ym, window.xm), prev = commandHistory[commandHistory.length - 1];
    if (!prev) commandHistory.push({t: t - 2, ang: s ? s.ang : actual, boost: !!real});
    if (!prev || prev.ang !== actual || prev.boost !== !!want) commandHistory.push({t, ang: actual, boost: !!want});
    while (commandHistory.length > 1 && commandHistory[1].t < t - 2) commandHistory.shift();
  } else commandHistory.length = 0;
}
function planAt(tt) {                  // interpolated [x, y, h, b] on the plan at time tt (clamped to its ends)
  const P = plan.pts, n = plan.n; let i = 0; while (i + 1 < n && P[5 * (i + 1)] < tt) i++;
  if (i + 1 >= n) { const k = 5 * (n - 1); return [P[k + 1], P[k + 2], P[k + 3], P[k + 4]]; }
  const k = 5 * i, t0 = P[k], t1 = P[k + 5], f = t1 > t0 ? Math.min(1, Math.max(0, (tt - t0) / (t1 - t0))) : 0;
  const h0 = P[k + 3], h1 = P[k + 8], dh = ((h1 - h0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return [P[k + 1] + f * (P[k + 6] - P[k + 1]), P[k + 2] + f * (P[k + 7] - P[k + 2]), h0 + f * dh, f < .5 ? P[k + 4] : P[k + 9]];
}
function track() {
  if (!game || !S.bot || !plan || !window.playing || !window.slither || window.slither.dead) return;
  const s = window.slither, now = performance.now(), tau = (now - plan.T0) / 1000; sent.planAge = tau;
  if (tau > plan.tEnd) { sent.why = 'plan_end'; return; }                                 // beyond the trajectory: keep the last command
  if (S.values.V9_ON && plan.controls?.length) {
    const when = tau + (S.values.TRACK_LAT ?? .17);
    const action = plan.controls.find(a => a.end > when + 1e-8) || plan.controls[plan.controls.length - 1];
    applyCmd(action.target, false, 'v9_controls'); return;
  }
  let ang, why, tb, th;
  if (S.values.V9_ON || S.values.TRACK_MODE) {
    // latency-compensated heading tracking (game 1 of runs/v3track_20260930_053000: command -> server heading 161 ms median, a
    // 0.13 s pursuit point led the server heading by only ~7 deg and the turn stalled): command the plan heading at tau + TRACK_LAT
    // (where the plan will be when the command takes effect) and steer back toward the path by TRACK_KLAT deg per px of lateral error
    const [px0, py0, h0] = planAt(tau), pl = planAt(tau + S.values.TRACK_LAT + .02), e = -Math.sin(h0) * (s.xx - px0) + Math.cos(h0) * (s.yy - py0);   // + = left of the path
    const corr = Math.max(-30, Math.min(30, -S.values.TRACK_KLAT * e)) * Math.PI / 180;
    ang = pl[2] + corr; tb = pl[3]; th = pl[2]; why = 'heading';
  } else {
    const look = S.values.TRACK_LOOK, pl = planAt(tau + look), dx = pl[0] - s.xx, dy = pl[1] - s.yy, d = Math.hypot(dx, dy); th = pl[2];
    ang = d >= S.values.TRACK_MIND ? Math.atan2(dy, dx) : th; tb = pl[3]; why = d >= S.values.TRACK_MIND ? 'pursuit' : 'heading0';   // too close to the point: plan heading
  }
  applyCmd(ang, tb, why);
  if (game.fr.length < 5 * 120000) game.fr.push(Math.round(now - game.t0), Math.round(s.ang * 1000) / 1000, Math.round((s.wang || 0) * 1000) / 1000, Math.round(sent.ang * 1000) / 1000, Math.round(th * 1000) / 1000);
}
function hookSocket() {                // log our own 1-byte packets (angle <= 250, boost 253/254) at the send boundary
  const ws = window.ws; if (!ws || ws.__slp || typeof ws.send !== 'function') return;
  const orig = ws.send.bind(ws);
  ws.send = function (d) { try { const b = d instanceof ArrayBuffer ? new Uint8Array(d) : d; if (game && b && b.length === 1 && (b[0] <= 250 || b[0] === 253 || b[0] === 254) && game.pk.length < 3 * 60000) game.pk.push(Math.round(performance.now() - game.t0), b[0]); } catch (e) {} return orig(d); };
  ws.__slp = 1;
}
function hookLoop() {            // game.js oef = one game step + redraw; its raf chain looks oef up globally each frame
  const orig = window.oef;
  window.oef = function () { const t = performance.now(); try { if (S.values.V9_ON || S.values.TRACK_ON) { hookSocket(); track(); } } catch (e) { console.error('[SLP track]', e); } try { return orig.apply(this, arguments); } finally { acc.loops++; acc.oef += performance.now() - t; } };
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
  ctx.font = '9.6px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = OVERLAY_LINE_WIDTH;
  // Trigger radii are world distances; visibility is independent of bot/path display.
  if (window.playing && !me.dead && !S.values.V9_ON && (S.values.V8_ON || S.values.V7_ON)) {
    const ring = (radius, color, dash) => {
      if (!(radius > 0) || !Number.isFinite(radius * g)) return;
      const x = X(me.xx), y = Y(me.yy), r = radius * g;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = OVERLAY_LINE_WIDTH;
      ctx.setLineDash(dash); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke();
      ctx.restore();
    };
    if (S.values.V8_ON && S.show.bodyRadius)
      ring(S.values.V81_BODY_R, '#50e3e6', [8, 5]);
    if (S.show.headRadius)
      ring(S.values.V8_ON ? S.values.V8_HEAD_R : S.values.V7_HEAD_R, '#ffcf5a', []);
  }
  if (S.show.border) {
    ctx.strokeStyle = 'rgba(255,80,80,.8)'; ctx.lineWidth = OVERLAY_LINE_WIDTH;
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
    ctx.strokeStyle = 'rgba(80,160,255,.95)'; ctx.fillStyle = 'rgba(80,160,255,.95)'; ctx.lineWidth = OVERLAY_LINE_WIDTH;
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
    if (last.trace.v8_phase && S.show.path) {
      ctx.font = 'bold 10.4px system-ui'; ctx.fillStyle = last.trace.v8_phase === 'avoid' ? '#ffb83d' : '#f6db52';
      ctx.fillText(`${last.trace.v81_on ? 'V8-1' : 'V8'} · ${last.trace.v8_phase === 'avoid' ? 'V6' : 'V1 잔해'} · 머리 ${last.trace.v8_heads}/${last.trace.v8_threshold}${last.trace.v81_on ? ` · 가중 몸 ${last.trace.v81_density.toFixed(1)}%` : ''}`, X(me.xx) + 22, Y(me.yy) - 68);
    }
    if (last.trace.v7_phase && S.show.path) {
      ctx.font = 'bold 10.4px system-ui'; ctx.fillStyle = last.trace.v7_phase === 'avoid' ? '#ffb83d' : '#f6db52';
      ctx.fillText(`V7 · ${last.trace.v7_phase === 'avoid' ? 'V6 회피' : 'V1 잔해 추종'} · 머리 ${last.trace.v7_heads}/${last.trace.v7_threshold}`, X(me.xx) + 22, Y(me.yy) - 68);
    }
    const a = d.an;
    if (a) analysisLayers(ctx, a, d, X, Y, g, me);
    if (S.values.V9_ON && d.v9Paths) {
      const fresh = performance.now() / 1000 - d.v9At < .2;
      const candidates = fresh ? d.v9Paths : [];
      ctx.save(); ctx.lineWidth = OVERLAY_LINE_WIDTH;
      if (fresh && S.show.v9Map) {
        ctx.strokeStyle = 'rgba(188,145,255,.55)'; ctx.setLineDash([3, 4]);
        for (const w of d.v9Walls || []) {
          const ax = X(w[0]), ay = Y(w[1]), bx = X(w[2]), by = Y(w[3]), rr = (w[4] + d.ro + S.values.V9_MARGIN) * g, a = Math.atan2(by - ay, bx - ax);
          ctx.beginPath(); ctx.arc(ax, ay, rr, a + Math.PI / 2, a + 3 * Math.PI / 2);
          ctx.arc(bx, by, rr, a - Math.PI / 2, a + Math.PI / 2); ctx.closePath(); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      if (S.show.v9Routes) {
        const colors = ['#45f08a', '#53baff', '#ffd269', '#d69aff', '#ff93bd'];
        candidates.forEach((p, i) => { ctx.strokeStyle = colors[i % colors.length]; ctx.globalAlpha = i ? .7 : 1;
          ctx.setLineDash(i ? [5, 4] : []); polyline(ctx, p, X, Y); });
        ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.fillStyle = candidates.length ? '#45f08a' : '#ffb83d'; ctx.font = '9.6px system-ui';
        ctx.fillText(candidates.length ? `V9 · 관측 내 탈출 ${candidates.length}개` : 'V9 · 탈출 경로 미확보', X(me.xx), Y(me.yy) - 48);
      }
      if (fresh && S.show.localPath && !candidates.length && d.localPath?.length) {
        ctx.strokeStyle = d.localUnsafe ? '#ff5b6b' : '#aab3bd'; ctx.setLineDash([2, 4]); polyline(ctx, d.localPath, X, Y);
      }
      ctx.restore();
    } else
    if (S.show.path && d.localPath) {
      const hx = X(me.xx), hy = Y(me.yy), maze = d.mazePath || [], local = d.localPath;
      const label = (text, color, y) => { ctx.font = 'bold 10.4px system-ui'; ctx.lineWidth = 4; ctx.strokeStyle = '#101820'; ctx.strokeText(text, hx + 22, y); ctx.fillStyle = color; ctx.fillText(text, hx + 22, y); };
      if (S.show.mazePath !== false) {
        const color = d.mazeState === 'food' ? '#f6db52' : d.mazeState === 'explore' ? '#9bc4ff' : d.guideCert === 1 ? '#45f08a' : '#ffb83d';
        if (maze.length >= 4) { ctx.strokeStyle = color; ctx.lineWidth = OVERLAY_LINE_WIDTH; ctx.setLineDash([9, 5]); polyline(ctx, maze, X, Y); ctx.setLineDash([]);
          const k = maze.length - 2; ctx.beginPath(); ctx.arc(X(maze[k]), Y(maze[k + 1]), 5, 0, 2 * Math.PI); ctx.stroke(); }
        label(maze.length ? ({food: '미로 · 잔해로 이동', explore: '미로 · 잔해 탐색', exit: '미로 · 탈출 경로', partial: '미로 · 탈출 탐색 (부분)'}[d.mazeState] || '미로 · 재탐색') : '미로 · 재탐색', maze.length ? color : '#aab3bd', hy - 48);
      }
      if (S.show.localPath !== false) {
        const color = d.localUnsafe ? '#ff5b6b' : '#44dfff';
        if (local.length >= 4) { ctx.strokeStyle = color; ctx.lineWidth = OVERLAY_LINE_WIDTH; polyline(ctx, local, X, Y); }
        label(d.localUnsafe ? '근접 · 충돌 예상' : d.localAvoiding ? '근접 · 회피 중' : '근접 · 주행 예측', color, hy - 28);
      }
    } else if (S.show.path && d.chosen.length) {
      const mode = last.trace.mode;
      ctx.strokeStyle = d.guideCert === 1 ? '#45f08a' : d.guideCert === 0 ? '#ffb83d' : mode === 'emergency' ? '#ff4040' : mode === 'coil' ? '#ff60ff' : last.boost ? '#ffd040' : '#60ff60';
      ctx.lineWidth = OVERLAY_LINE_WIDTH; ctx.beginPath(); ctx.moveTo(X(me.xx), Y(me.yy));
      for (let k = 0; k < d.chosen.length; k += 2) ctx.lineTo(X(d.chosen[k]), Y(d.chosen[k + 1]));
      ctx.stroke();
    }
    if (S.show.gaps) {
      // the 3 nearest body points: line from our head, label = px to the death boundary (0 = contact), red inside SAFE
      d.near.forEach((n, i) => {
        const dead = n.dead === undefined ? n.gap : n.dead;
        const col = dead < 0 ? '#ff4040' : dead < S.values.SAFE ? '#ffd040' : i === 0 ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.55)';
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = OVERLAY_LINE_WIDTH;
        ctx.beginPath(); ctx.moveTo(X(me.xx), Y(me.yy)); ctx.lineTo(X(n.x), Y(n.y)); ctx.stroke();
        ctx.beginPath(); ctx.arc(X(n.x), Y(n.y), 3, 0, 2 * Math.PI); ctx.fill();
        ctx.font = i === 0 ? 'bold 10.4px system-ui' : '9.6px system-ui';
        ctx.fillText(`${dead.toFixed(0)}px`, X(n.x) + 5, Y(n.y) - 6);
        ctx.font = '9.6px system-ui';
      });
      ctx.strokeStyle = '#40e0ff'; ctx.fillStyle = '#40e0ff';
      for (const gp of d.gaps) {
        const x = X(gp.m[0]), y = Y(gp.m[1]);
        ctx.beginPath(); ctx.arc(x, y, Math.max(3, g * gp.w / 2), 0, 2 * Math.PI); ctx.stroke();
        ctx.fillText(`틈 ${gp.w.toFixed(0)}`, x, y - 8);
      }
      if (d.attacker) { ctx.strokeStyle = '#ff4040'; ctx.lineWidth = OVERLAY_LINE_WIDTH; ctx.beginPath(); ctx.arc(X(d.attacker[0]), Y(d.attacker[1]), 30, 0, 2 * Math.PI); ctx.stroke(); }
    }
    if (S.show.goal) {
      ctx.lineWidth = OVERLAY_LINE_WIDTH;
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
    for (const o of window.slithers) {
      if (o === me || o.dead || Math.hypot(o.xx - me.xx, o.yy - me.yy) > 2500) continue;
      const r = 14.5 * o.sc, radius = Math.max(0, (r + thickOff(r) + V().SAFE) * g);
      ctx.strokeStyle = 'rgba(255,220,0,.45)'; ctx.lineWidth = OVERLAY_LINE_WIDTH;
      let prev = null;
      for (const q of [...o.pts, {xx: o.xx, yy: o.yy}]) {
        if (q.dying || Math.hypot(q.xx - me.xx, q.yy - me.yy) > 1100) { prev = null; continue; }
        if (prev) {
          const ax = X(prev.xx), ay = Y(prev.yy), bx = X(q.xx), by = Y(q.yy);
          const angle = Math.atan2(by - ay, bx - ax), nx = -Math.sin(angle) * radius, ny = Math.cos(angle) * radius;
          ctx.beginPath(); ctx.moveTo(ax + nx, ay + ny); ctx.lineTo(bx + nx, by + ny);
          ctx.arc(bx, by, radius, angle + Math.PI / 2, angle - Math.PI / 2, true);
          ctx.lineTo(ax - nx, ay - ny);
          ctx.arc(ax, ay, radius, angle - Math.PI / 2, angle + Math.PI / 2, true);
          ctx.closePath(); ctx.stroke();
        }
        prev = q;
      }
    }
  }
  if (sh.heads) for (const h of a.heads) {       // head forecasts: cruise, surprise boost, (turning) arc
    ctx.strokeStyle = h.attacker ? 'rgba(255,60,60,.95)' : 'rgba(120,220,255,.75)'; ctx.lineWidth = OVERLAY_LINE_WIDTH;
    for (let p = 0; p < h.pts.length / 30; p++) polyline(ctx, h.pts.slice(p * 30, p * 30 + 30), X, Y);
  }
  if (sh.held) {
    ctx.lineWidth = OVERLAY_LINE_WIDTH;
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
    ctx.lineWidth = OVERLAY_LINE_WIDTH;
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
    ctx.strokeStyle = '#fff'; ctx.lineWidth = OVERLAY_LINE_WIDTH;
    ctx.beginPath(); ctx.arc(X(a.ends[2 * a.i]), Y(a.ends[2 * a.i + 1]), 8, 0, 2 * Math.PI); ctx.stroke();
  }
  if (sh.ring) {                 // 24 bearings: nearest body (red < 150, yellow < 400 px), the wrapper's bins, exits
    const rg = a.ring, R0 = Math.max(46, d.ro * g + 34), R1 = R0 + 12;
    for (let b = 0; b < 24; b++) {
      const a0 = b / 24 * 2 * Math.PI - Math.PI, a1 = a0 + 2 * Math.PI / 24, o = rg.occ[b];
      ctx.fillStyle = o < 150 ? 'rgba(255,60,60,.8)' : o < 400 ? 'rgba(255,200,60,.65)' : o < 1000 ? 'rgba(120,210,120,.4)' : 'rgba(120,210,120,.12)';
      ctx.beginPath(); ctx.arc(hx, hy, R1, a0, a1); ctx.arc(hx, hy, R0, a1, a0, true); ctx.closePath(); ctx.fill();
      if (rg.bins && rg.bins[b]) { ctx.strokeStyle = '#ff60ff'; ctx.lineWidth = OVERLAY_LINE_WIDTH; ctx.beginPath(); ctx.arc(hx, hy, R1 + 3, a0, a1); ctx.stroke(); }
    }
    const arrow = (ang, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = OVERLAY_LINE_WIDTH; ctx.beginPath();
      ctx.moveTo(hx + Math.cos(ang) * (R1 + 6), hy + Math.sin(ang) * (R1 + 6)); ctx.lineTo(hx + Math.cos(ang) * (R1 + 34), hy + Math.sin(ang) * (R1 + 34)); ctx.stroke();
    };
    arrow(rg.esc, '#ffffff');
    if (rg.wrapEsc !== null) arrow(rg.wrapEsc, '#ff60ff');
    ctx.fillStyle = '#fff';
    ctx.fillText(`둘러쌈 ${rg.enclosed.toFixed(2)} · 감김 ${rg.wrapCov.toFixed(2)}${rg.curl ? ` · 말림 ${rg.curl.toFixed(2)}` : ''}`, hx, hy + R1 + 20);
  }
  if (sh.squeeze && a.squeeze) {                // narrowing corridor: wall A (red), B's head and its cut-in forecasts
    const q = a.squeeze;
    ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(255,80,220,.9)'; ctx.lineWidth = OVERLAY_LINE_WIDTH;
    for (const l of q.long) polyline(ctx, l, X, Y, q.b[0], q.b[1]);
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ff4040'; ctx.lineWidth = OVERLAY_LINE_WIDTH; ctx.beginPath(); ctx.arc(X(q.a[0]), Y(q.a[1]), 10, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = '#ff50dc'; ctx.beginPath(); ctx.arc(X(q.b[0]), Y(q.b[1]), 16, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#ff90e8';
    ctx.fillText(`좁아지는 통로 · A ${q.gapA.toFixed(0)} · B ${q.gapB.toFixed(0)} · B가 ${q.ahead > -50 ? '앞/옆' : '뒤'}`, hx, hy - Math.max(46, d.ro * g + 34) - 26);
  }
  if (sh.heaps) for (const h of a.heaps) {      // food heaps: mass, rivals (heads within 350 px)
    const x = X(h.x), y = Y(h.y), rr = Math.max(6, Math.sqrt(h.mass) * 1.2 * g);
    ctx.strokeStyle = 'rgba(255,210,80,.85)'; ctx.lineWidth = OVERLAY_LINE_WIDTH; ctx.beginPath(); ctx.arc(x, y, rr, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#ffd050'; ctx.fillText(`${h.mass.toFixed(0)} · 경쟁 ${h.rivals}`, x, y - rr - 4);
  }
}

// ---------- analysis widgets (DOM): score terms, timeline, death summary ----------
const box = (id, css) => {
  let e = document.getElementById(id);
  if (!e) { e = el('div', {id, style: 'position:fixed;z-index:2147482999;background:rgba(18,20,30,.85);color:#dde;font:9.6px sans-serif;border-radius:6px;padding:6px;' + css}); document.body.append(e); }
  return e;
};
const drop = id => { const e = document.getElementById(id); if (e) e.remove(); };
function canvasIn(e, w, h) {
  let c = e.querySelector('canvas');
  if (!c) { c = el('canvas', {width: w, height: h}); e.append(c); }
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.font = '8.8px sans-serif';
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
  ctx.lineWidth = OVERLAY_LINE_WIDTH; ctx.strokeStyle = '#667'; ctx.beginPath(); ctx.moveTo(x0, 52); ctx.lineTo(x0, H); ctx.stroke();
}
function timelineTo(ctx, tr, W, H, span) {
  ctx.lineWidth = OVERLAY_LINE_WIDTH;
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
const CSS = `#slp{--mint:#54f2c2;--cyan:#60a5fa;--violet:#9b8cff;--ink:#070d18;--panel:#0c1423;--card:#121d30;--line:#ffffff14;--muted:#8491aa;position:fixed;top:12px;right:12px;width:484px;max-height:calc(100vh - 24px);display:flex;flex-direction:column;z-index:2147483000;color:#eef4ff;font:9.6px/1.4 Inter,ui-sans-serif,system-ui,'Malgun Gothic',sans-serif;background:linear-gradient(145deg,rgba(12,20,35,.97),rgba(6,12,23,.98));border:1px solid #ffffff1c;border-radius:22px;box-shadow:0 28px 80px #000c,0 0 0 1px #0008 inset;overflow:hidden;backdrop-filter:blur(24px) saturate(145%)}
#slp:before{content:'';position:absolute;inset:0 0 auto;height:150px;pointer-events:none;background:radial-gradient(circle at 12% 0,#54f2c21b,transparent 52%),radial-gradient(circle at 82% 0,#9b8cff20,transparent 48%)}
#slp .top{position:relative;padding:16px 18px 13px;border-bottom:1px solid var(--line)}
#slp .title{display:flex;align-items:center;gap:11px;cursor:move;user-select:none;color:var(--muted);font-size:8.4px;letter-spacing:.02em}
#slp .title .logo{width:112px;height:58px;display:flex;align-items:center;justify-content:center;flex:none;overflow:visible}#slp .title .logo img{display:block;width:112px;height:70px;object-fit:contain;filter:drop-shadow(0 7px 8px #160d1738)}
#slp .title .tt{flex:1;line-height:1.25}#slp .title b{display:block;color:#f8fbff;font-size:11.2px;letter-spacing:.08em}#slp .title .st{color:#7f8da6;font-size:8.4px;margin-top:2px}
#slp button{background:#18253a;color:#eaf1ff;border:1px solid #ffffff17;border-radius:9px;padding:6px 10px;margin:0;cursor:pointer;font:inherit;transition:background .15s,border-color .15s,transform .15s,box-shadow .15s}#slp button:hover{background:#22334d;border-color:#ffffff2b}#slp button:active{transform:translateY(1px)}#slp button.on{background:#153b35;border-color:#54f2c270}
#slp button.ico{padding:4px 7px;background:transparent;border-color:transparent;color:#7f8da6;font-size:12.8px}#slp button.ico:hover{color:#fff;background:#ffffff0d}
#slp button.bot{font-weight:800;padding:8px 14px;min-width:104px;border-radius:12px;letter-spacing:.04em}#slp button.go{background:linear-gradient(135deg,#4bf0b9,#32c989);border-color:#7effd0;color:#041b14;box-shadow:0 8px 24px #38dda632}#slp button.stop{background:#111b2b;border-color:#ffffff1a;color:#8e9ab0}
#slp .presetbar{display:flex;align-items:center;gap:7px;margin-top:12px;padding:7px;background:#050b15a8;border:1px solid #ffffff12;border-radius:12px}
#slp select,#slp input[type=number],#slp input[type=search]{background:#080f1d;color:#eef4ff;border:1px solid #ffffff20;border-radius:9px;font:inherit;padding:6px 8px;min-width:0;outline:none}#slp select:focus,#slp input:focus{border-color:#60a5fa90;box-shadow:0 0 0 3px #60a5fa18}
#slp input[type=range]{flex:0 0 118px;margin:0;accent-color:var(--mint)}#slp input[type=number]{width:57px;text-align:right;font-variant-numeric:tabular-nums}
#slp .fill{flex:1}#slp .row{box-sizing:border-box;display:flex;align-items:center;gap:7px;margin:5px 0}#slp .row.wrap{flex-wrap:wrap}
#slp .badge{padding:3px 8px;border-radius:999px;font-size:8px;white-space:nowrap;font-weight:700}#slp .badge.mod{background:#422f08;color:#ffd86a;border:1px solid #ffd35a35}#slp .badge.ok{background:#0c3328;color:#69ecc0;border:1px solid #54f2c22c}#slp .badge.key{background:#1f2c48;color:#bdd4ff}#slp .badge.key.on{background:#5366e8;color:#fff}
#slp .status{display:grid;grid-template-columns:1.15fr .9fr .8fr 1.2fr;gap:7px;margin-top:10px}#slp .tile{background:linear-gradient(145deg,#152136,#0f192a);border:1px solid #ffffff12;border-radius:12px;padding:8px 10px;min-width:0;box-shadow:0 10px 24px #0002}#slp .tile .tl{font-size:7.2px;color:#70809a;letter-spacing:.09em;text-transform:uppercase}#slp .tile .tv{font-size:10.4px;font-weight:800;color:#f5f8ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;margin-top:1px}#slp .note{grid-column:1/-1;color:#ffd86a;font-size:8.4px;padding:4px 2px}
#slp .frame{display:grid;grid-template-columns:76px minmax(0,1fr);min-height:0;flex:1}#slp .tabs{box-sizing:border-box;display:flex;flex-direction:column;gap:5px;padding:12px 8px;background:#060d18;border-right:1px solid var(--line)}#slp .tabs button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:52px;padding:4px;border:0;border-radius:12px;background:transparent;color:#68768f;font-size:8px}#slp .tabs button:hover{background:#ffffff08;color:#cbd7e9}#slp .tabs button.act{color:var(--mint);background:linear-gradient(145deg,#18322f,#10231f);box-shadow:0 0 0 1px #54f2c229 inset}#slp .navwrap{display:flex;flex-direction:column;align-items:center;gap:3px}#slp .navic{font-size:13.6px;line-height:1}#slp .navtx{font-size:7.6px;font-weight:700;letter-spacing:.04em}
#slp .body{min-width:0;overflow:auto;padding:13px 14px 16px;background:linear-gradient(180deg,#0d1626,#0a1220);scrollbar-width:thin;scrollbar-color:#30415d transparent}#slp .eyebrow{color:#66758e;font-size:7.6px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin:3px 2px 7px}#slp .hero{padding:11px;border:1px solid #ffffff12;border-radius:15px;background:linear-gradient(135deg,#142238,#11192b);box-shadow:0 16px 30px #0003;margin-bottom:12px}
#slp .seg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:#070e1a;border:1px solid #ffffff16;border-radius:12px;padding:4px;margin:0}#slp .seg button{flex:1;border:0;background:transparent;color:#7f8ba2;padding:9px 5px;border-radius:9px;font-weight:800}#slp .seg button.on{background:linear-gradient(135deg,var(--mint),#43d79e);color:#041913;box-shadow:0 6px 18px #3fe0aa30}
#slp .list{border:1px solid #ffffff12;border-radius:14px;overflow:hidden;margin:6px 0;background:#101b2d;box-shadow:0 12px 26px #00025}#slp .quick-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;border:0;background:none;box-shadow:none;overflow:visible}#slp .quick-grid .li{min-height:84px;display:grid;grid-template-columns:36px minmax(0,1fr);grid-template-rows:auto auto;align-items:start;gap:8px 10px;padding:12px 14px;border:1px solid #ffffff12;border-radius:14px;background:linear-gradient(145deg,#152238,#101a2c);box-shadow:0 10px 24px #00025}#slp .quick-grid .li .ic{grid-row:1/3}#slp .quick-grid .li .sw{grid-column:2;justify-self:end;align-self:end}#slp .quick-control{grid-column:2;display:flex;align-items:center;gap:12px;width:100%;min-width:0}#slp .quick-control input[type=range]{flex:1 1 0;width:0;min-width:0;height:28px;cursor:ew-resize}#slp .quick-control input[type=number]{flex:0 0 64px;width:64px;box-sizing:border-box}#slp .quick-control input:disabled{cursor:default;opacity:.45}
#slp .li{display:flex;align-items:center;gap:10px;padding:10px 11px;border-bottom:1px solid #ffffff0c;transition:background .15s,border-color .15s}#slp .li:hover{background:#ffffff06}#slp .li:last-child{border-bottom:0}#slp .li .ic{width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#263854,#1b2941);display:flex;align-items:center;justify-content:center;font-size:12px;flex:none;color:#bcd4ff;box-shadow:0 0 0 1px #ffffff0e inset}#slp .li .txt{flex:1;min-width:0}#slp .li .t{font-weight:800;color:#edf4ff;font-size:9.6px}#slp .li .s{font-size:8px;color:#8290a8;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}#slp .li.chg{border-color:#d7aa322d}#slp .li.chg .t{color:#ffd86a}#slp .li.off{opacity:.42}
#slp .sw{width:42px;height:24px;border-radius:14px;background:#3b465a;border:0;padding:0;position:relative;flex:none;cursor:pointer;box-shadow:0 0 0 1px #ffffff14 inset}#slp .sw i{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#d8dfeb;transition:left .18s,background .18s;box-shadow:0 2px 7px #0008}#slp .sw.on{background:linear-gradient(90deg,#2ac98e,#55edbd)}#slp .sw.on i{left:21px;background:#fff}#slp .sw.half{background:#b98b2f}#slp .sw.half i{left:12px}#slp .sw.dis{opacity:.35;cursor:not-allowed}
#slp .num{width:62px;text-align:right;background:#080f1d;color:#f3f7ff;border:1px solid #ffffff20;border-radius:9px;padding:6px 8px}#slp details.exp{margin-top:10px}#slp details.exp summary{cursor:pointer;color:#74829b;font-size:8px;margin:6px 2px;list-style:none}#slp details.exp summary::before{content:'+  '}#slp details.exp[open] summary::before{content:'−  '}
#slp .grp{border:1px solid #ffffff11;border-radius:12px;margin:7px 0;background:#101a2b;overflow:hidden}#slp .grp h4{margin:0;padding:10px 11px;cursor:pointer;font-size:9.2px;background:#152137;color:#c9d7eb}.grp.open{box-sizing:border-box}#slp .grp.open{border-color:#54f2c24b;background:#0f1c2b}#slp .grp.open h4{border-bottom:1px solid #ffffff12;background:linear-gradient(90deg,#16322f,#152137);color:#a8f5da}#slp .grp .it{padding:0 10px}#slp .grp h4 .lab{flex:1}#slp .it.off{opacity:.42}#slp .lab.off{text-decoration:line-through}#slp .lab.warn{color:#ffd86a}#slp .rnote{font-size:7.6px;color:#77839a;width:100%;margin-top:-2px}
#slp .sl{margin:4px 0 9px}#slp .sl .row{margin:0}#slp .sl input[type=range]{display:block;width:100%}#slp .lab{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#slp .chg{color:#ffd86a}#slp .hide{visibility:hidden}#slp .sub{color:#7e8ba2}#slp .hint{color:#718098;font-size:8px;margin:9px 2px}#slp h5{margin:14px 0 6px;font-size:8.8px;color:#a9c9ff;display:flex;align-items:center;gap:6px}#slp h5 .lab{flex:1}
#slp .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}#slp .grid button{text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#slp .hist{display:flex;align-items:center;gap:7px;padding:8px;border-radius:10px;background:#101a2b;border:1px solid #ffffff0f;margin:5px 0}#slp .hist.cur{border-color:#54f2c25c}#slp .box{background:#070e1a;border:1px solid #ffffff11;border-radius:10px;padding:7px 8px;font-variant-numeric:tabular-nums}#slp .lvl{text-align:center;margin:3px 0 8px}
#slp .srvlist{display:grid;gap:7px;margin-top:8px}#slp .srv{display:grid;grid-template-columns:34px minmax(0,1fr) 58px;gap:7px 9px;align-items:center;width:100%;padding:9px 10px;text-align:left;background:linear-gradient(145deg,#2b466f,#263a61);border:1px solid #dceaff35;border-radius:13px}#slp .srv:hover{background:linear-gradient(145deg,#365983,#304a76)}#slp .srv.sel{border-color:#6ff2c7;box-shadow:0 0 0 1px #54f2c242 inset,0 8px 20px #0b203b55}#slp .srv .name{font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#slp .srv .meta{font-size:7.6px;color:#bfcee7;margin-top:1px}#slp .srv .cnt{text-align:right;font-weight:900;font-size:10.4px;color:#fff;font-variant-numeric:tabular-nums}#slp .srv .cnt small{display:block;font-size:6.8px;font-weight:600;color:#aebed9}#slp .sig{width:29px;height:25px;display:flex;align-items:flex-end;justify-content:center;gap:2px}#slp .sig i{display:block;width:4px;border-radius:3px 3px 1px 1px;background:currentColor;opacity:.18}#slp .sig i:nth-child(1){height:7px}#slp .sig i:nth-child(2){height:12px}#slp .sig i:nth-child(3){height:18px}#slp .sig i:nth-child(4){height:24px}#slp .sig.l1 i:nth-child(-n+1),#slp .sig.l2 i:nth-child(-n+2),#slp .sig.l3 i:nth-child(-n+3),#slp .sig.l4 i:nth-child(-n+4){opacity:1}#slp .pop{grid-column:2/4;height:5px;border-radius:5px;background:#132540;overflow:hidden;box-shadow:0 0 0 1px #ffffff12 inset}#slp .pop i{display:block;height:100%;min-width:0;border-radius:inherit;background:linear-gradient(90deg,#4fd9ff,#5bf0bb,#ffd166,#ff718f);box-shadow:0 0 8px currentColor}
#slp-toast{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483001;pointer-events:none;background:rgba(29,74,132,.95);color:#fff;font:bold 12px system-ui,sans-serif;padding:8px 18px;border-radius:12px;box-shadow:0 10px 30px #0008;opacity:0;transition:opacity .25s}#slp-toast.warn{background:rgba(133,83,13,.96)}
#slp-mini{position:fixed;top:10px;right:10px;z-index:2147483000;background:rgba(7,13,24,.92);color:#e5edf9;font:9.6px system-ui,sans-serif;padding:8px 12px;border-radius:12px;border:1px solid #ffffff1c;box-shadow:0 12px 32px #0008;cursor:pointer;backdrop-filter:blur(14px)}
/* Bright spectrum theme: clearer surfaces and distinct colors for each area. */
#slp{--card:#263b60;--line:#c8ddff30;--muted:#bdcbea;background:linear-gradient(145deg,rgba(38,56,94,.98),rgba(24,37,69,.98));border-color:#b8d2ff55;box-shadow:0 28px 80px #071022b8,0 0 0 1px #e2edff20 inset}
#slp:before{height:220px;background:radial-gradient(circle at 4% 0,#20e7d74d,transparent 38%),radial-gradient(circle at 58% 0,#a879ff45,transparent 40%),radial-gradient(circle at 100% 12%,#ff67913d,transparent 38%)}
#slp .top{background:linear-gradient(120deg,#294a70d9,#3c326fd1 52%,#71365dc4);border-bottom-color:#dce8ff38}
#slp .title .st,#slp .eyebrow,#slp .hint,#slp .sub,#slp .rnote{color:#b9c8e5}#slp .title b{color:#fff}
#slp button{background:#36577e;color:#fff;border-color:#c9dcff38}#slp button:hover{background:#4670a0;border-color:#ddebff70}#slp button.stop{background:#324568;border-color:#9cb8e850;color:#dbe7ff}
#slp .presetbar{background:#213759d9;border-color:#b8d5ff42}#slp select,#slp input[type=number],#slp input[type=search],#slp .num{background:#192d50;color:#fff;border-color:#9fc4ff65}
#slp .status .tile:nth-child(1){background:linear-gradient(145deg,#236a72,#204d70)}#slp .status .tile:nth-child(2){background:linear-gradient(145deg,#684898,#473e83)}#slp .status .tile:nth-child(3){background:linear-gradient(145deg,#b75a45,#81455f)}#slp .status .tile:nth-child(4){background:linear-gradient(145deg,#34734f,#316280)}
#slp .tile{border-color:#e7f1ff35}#slp .tile .tl{color:#d5e4ff}#slp .tile .tv{color:#fff}
#slp .tabs{background:linear-gradient(180deg,#20385e,#192b4b);border-right-color:#c8dcff33}#slp .tabs button{color:#c8d7ee}#slp .tabs button:nth-child(1){color:#62f0bd}#slp .tabs button:nth-child(2){color:#6ed7ff}#slp .tabs button:nth-child(3){color:#a99cff}#slp .tabs button:nth-child(4){color:#ffcc67}#slp .tabs button:nth-child(5){color:#ff8ca6}#slp .tabs button:nth-child(6){color:#7ee3da}#slp .tabs button:hover{background:#ffffff14;color:#fff}#slp .tabs button.act{color:#fff;background:linear-gradient(145deg,#3b8fa1,#6459b8);box-shadow:0 0 0 1px #e2f5ff80 inset,0 7px 18px #09152d60}
#slp .body{background:linear-gradient(180deg,#263b62,#1c3052);scrollbar-color:#729fe0 transparent}#slp .hero{background:linear-gradient(135deg,#35557f,#433f79);border-color:#dceaff42}
#slp .seg{background:#1c3152;border-color:#dceaff3d}#slp .seg button{color:#c4d2ea}#slp .seg button.on{background:linear-gradient(135deg,#58f0c3,#59c7ff);color:#09223a}
#slp .list{background:#263e64;border-color:#dceaff35}#slp .quick-grid .li{border-color:#e5efff44;box-shadow:0 10px 24px #101a343d}#slp .quick-grid .li:nth-child(1){background:linear-gradient(145deg,#245f70,#29496f)}#slp .quick-grid .li:nth-child(2){background:linear-gradient(145deg,#594d8b,#3d4d7d)}#slp .quick-grid .li:nth-child(3){background:linear-gradient(145deg,#8a573a,#5e4f70)}#slp .quick-grid .li:nth-child(4){background:linear-gradient(145deg,#8b4268,#514c83)}
#slp .li .ic{background:linear-gradient(145deg,#4c78aa,#504f9b);color:#fff;border:1px solid #dceaff42}#slp .quick-grid .li:nth-child(1) .ic{background:#22bfa0}#slp .quick-grid .li:nth-child(2) .ic{background:#8170e8}#slp .quick-grid .li:nth-child(3) .ic{background:#ed8b43}#slp .quick-grid .li:nth-child(4) .ic{background:#e45a91}#slp .li .t{color:#fff}#slp .li .s{color:#d1dcf0}
#slp .grp{background:#294267;border-color:#d8e8ff32}#slp .grp h4{background:#36557d;color:#f3f7ff}#slp .grp:nth-of-type(4n+1) h4{border-left:4px solid #52e4bc}#slp .grp:nth-of-type(4n+2) h4{border-left:4px solid #6dcfff}#slp .grp:nth-of-type(4n+3) h4{border-left:4px solid #af91ff}#slp .grp:nth-of-type(4n) h4{border-left:4px solid #ff9d67}#slp .grp.open{background:#274669;border-color:#79e6d78a}#slp .grp.open h4{background:linear-gradient(90deg,#337c78,#4b518b);color:#fff}
#slp .hist,#slp .box{background:#263f66;border-color:#d8e8ff35}#slp h5{color:#d8e7ff}
@media(max-width:540px){#slp{width:calc(100vw - 16px);right:8px}.quick-grid,.status-grid{grid-template-columns:1fr}.frame{grid-template-columns:66px minmax(0,1fr)}.tabs{padding:14px 7px}.tab{width:52px}.tab span{font-size:6.4px}}
/* Compact UI: 80% fonts, compact profile buttons and tuning-height rows. */
#slp,#slp-mini,#slp-terms{transform:none!important}
#slp-toast,#slp-death,#slp-tl{transform:translateX(-50%)!important}
#slp{width:min(430px,calc(100vw - 16px));max-height:min(760px,calc(100vh - 24px));border-radius:16px}
#slp .top{padding:8px 10px}
#slp .title{gap:6px}
#slp .title .logo{width:72px;height:34px}
#slp .title .logo img{width:72px;height:46px}
#slp button{padding:4px 7px}
#slp button.bot{padding:5px 9px;min-width:86px}
#slp .presetbar{gap:5px;margin-top:6px;padding:4px}
#slp select,#slp input[type=number],#slp input[type=search],#slp .num{padding:4px 6px}
#slp .status{gap:4px;margin-top:6px}
#slp .tile{padding:5px 6px}
#slp .frame{grid-template-columns:56px minmax(0,1fr)}
#slp .tabs{gap:3px;padding:7px 4px}
#slp .tabs button{height:42px;padding:3px}
#slp .navwrap{gap:2px}
#slp .body{padding:8px 9px}
#slp .eyebrow{margin:2px 1px 4px}
#slp .hero{padding:6px;margin-bottom:7px}
#slp .seg{padding:3px}
#slp .seg button{padding:6px 3px}
#slp .list{margin:4px 0}
#slp .quick-grid{gap:5px}
#slp .quick-grid .li{min-height:0;grid-template-columns:28px minmax(0,1fr);gap:4px 7px;padding:6px 8px;border-radius:10px}
#slp .quick-control{gap:7px}
#slp .quick-control input[type=range]{height:24px}
#slp .li{gap:7px;padding:6px 8px}
#slp .li .ic{width:26px;height:26px;border-radius:8px}
#slp details.exp{margin-top:6px}
#slp details.exp summary{margin:4px 1px}
#slp .grp{margin:5px 0}
#slp .grp h4{padding:6px 8px}
#slp .grp .it{padding:0 7px}
#slp .row{gap:5px;margin:3px 0}
#slp .sl{margin:3px 0 6px}
#slp .hint{margin:5px 1px}
#slp h5{margin:9px 0 4px}
#slp .grid{gap:4px}
#slp .hist{gap:5px;padding:5px;margin:3px 0}
#slp .box{padding:5px 6px}
#slp .srvlist{gap:5px;margin-top:5px}
#slp .srv{padding:6px 7px;gap:5px 6px}
#slp-mini{padding:5px 8px}
#slp-toast{padding:5px 12px}
#slp .seg{display:flex;flex-wrap:wrap;gap:3px;padding:3px}
#slp .seg button{flex:1 0 27px;min-width:0;height:24px;padding:3px;border-radius:7px;white-space:nowrap}
#slp .hero{padding:3px;margin-bottom:5px}
#slp .quick-grid{gap:3px}
#slp .quick-grid .li{grid-template-columns:minmax(0,1fr) 56px;gap:2px 6px;padding:4px 7px}
#slp .quick-grid .li .ic,#slp .quick-grid .li .s{display:none}
#slp .radius-title{display:flex;align-items:center;gap:5px;flex-wrap:wrap}#slp .radius-toggle{padding:1px 5px;font-size:8px;line-height:16px;white-space:nowrap}
#slp .quick-grid .li .txt{grid-column:1;grid-row:1;align-self:center}
#slp .quick-grid .li .sw{grid-column:2;grid-row:1}
#slp .quick-control{display:contents}
#slp .quick-control input[type=number]{grid-column:2;grid-row:1;width:56px;padding:2px 4px}
#slp .quick-control input[type=range]{grid-column:1/-1;grid-row:2;width:100%;height:16px}
#slp-terms,#slp-tl,#slp-death{font-size:9.6px!important}`;
let hudEl = null, miniEl = null, bodyEl = null, shownTab = null, tuneFilter = '', histFilter = 'all';
const scrollMem = {};
function updateHud() {
  if (miniEl) miniEl.textContent = `SLP 봇 ${S.bot ? 'ON' : 'OFF'} · ${slotOf(S.preset) ? `[${slotOf(S.preset)}] ` : ''}${presetShort(S.preset)}${unsavedKeys().length ? ' (수정됨)' : ''}` +
    (notes ? ` · ${notes}` : ' · 클릭 또는 H: 패널 열기');
  if (!hudEl) return;
  const t = last && game && S.bot ? last.trace : null, sp = (txt, css = '') => el('span', {style: css}, txt);
  // status tiles (design 2026-09-29, after the Suite / 143X panels): mode · decision ms · FPS · length/rank
  const tile = (lab, val, css = '', title = '') => el('div', {class: 'tile', title}, el('div', {class: 'tl'}, lab), el('div', {class: 'tv', style: css}, val));
  const modeTxt = !S.bot ? '꺼짐' : !game ? '대기' : !t ? '판단 대기' : (t.v8_phase ? `${t.v81_on ? 'V8-1' : 'V8'} · ${t.v8_phase === 'avoid' ? 'V6' : 'V1 잔해'} (${t.v8_heads}/${t.v8_threshold})${t.v81_on ? ` · 가중 몸 ${t.v81_density.toFixed(1)}%` : ''}` : t.v7_phase ? `V7 · ${t.v7_phase === 'avoid' ? 'V6 회피' : 'V1 잔해'} (${t.v7_heads}/${t.v7_threshold})` : (MODE_KO[t.mode] || t.mode)) + (t.boost ? ' ⚡' : '');
  const modeCss = !S.bot ? 'color:#8a94b0' : t ? `color:${MODE_COL[t.mode] || '#ddd'}` : 'color:#8a94b0';
  const lenTxt = game && window.slither ? String(snakeLen(window.slither)) : '-', rankTxt = window.rank > 0 && window.slither_count > 0 ? `${window.rank}/${window.slither_count}` : '-';
  hudEl.replaceChildren(
    tile('모드', modeTxt, modeCss, t ? `여유 ${t.clear} · 안전 후보 ${t.n_safe} · 위협 ${t.threat}` : '봇 상태'),
    tile('판단', last ? `${last.ms.toFixed(0)}ms` : '-', last && last.ms > 33 ? 'color:#f6c453' : '', '판단 한 번에 걸린 시간 (틱 33ms)'),
    tile('FPS', String(fps), '', `게임 ${perf ? perf.loops : '-'}/s · 화면 ${perf ? perf.raf : '-'}/s · 핑 ${ping === null ? '-' : Math.round(ping)}ms · 메인 스레드 ${perf ? perf.busy : '-'}%`),
    tile('길이 · 순위', `${lenTxt} · ${rankTxt}`, '', `줌 ×${S.zoom.toFixed(2)}`),
    ...(notes ? [el('div', {class: 'note'}, '⚠ ' + notes)] : []));
}
setInterval(updateHud, 250);
function fmt(v, step) { const dec = step < 1 ? Math.min(3, String(step).split('.')[1].length) : 0; return Number(v).toFixed(dec); }
const stamp5 = at => { const d = new Date(at), p2 = n => String(n).padStart(2, '0'); return `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
let seenSavedAt = 0;
function rememberServerPlayers() {
  if (!window.playing || !window.bso || !(window.slither_count > 0)) return;
  const key = `${window.bso.ip}:${window.bso.po}`, now = Date.now(), players = Number(window.slither_count);
  const prev = S.serverSeen[key];
  S.serverSeen[key] = {players, at: now};
  if (!prev || prev.players !== players || now - seenSavedAt >= 60000) { seenSavedAt = now; save(); }
}
setInterval(rememberServerPlayers, 1000);
const ageTxt = at => { const m = Math.max(0, Math.floor((Date.now() - at) / 60000)); return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`; };
function pingLook(ms) {
  if (!(ms > 0) || ms >= 9e6) return {level: 0, color: '#8b98ad', text: '측정 전'};
  if (ms <= 70) return {level: 4, color: '#59efb9', text: `${Math.round(ms)}ms`};
  if (ms <= 120) return {level: 3, color: '#62d8ff', text: `${Math.round(ms)}ms`};
  if (ms <= 200) return {level: 2, color: '#ffd166', text: `${Math.round(ms)}ms`};
  return {level: 1, color: '#ff718f', text: `${Math.round(ms)}ms`};
}
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
  const nav = el('div', {class: 'tabs'}, ...TABS.map(([k, icon, label]) => btn(
    el('span', {class: 'navwrap'}, el('span', {class: 'navic'}, icon), el('span', {class: 'navtx'}, label)),
    false, () => { S.tab = k; save(); render(); }, label, k === S.tab ? 'act' : '')));
  const top = el('div', {class: 'top'},
    el('div', {class: 'title', title: '끌어서 옮기기', onmousedown: e => {
      if (e.target.tagName === 'BUTTON') return;
      const r = panel.getBoundingClientRect(); drag = {dx: e.clientX - r.left, dy: e.clientY - r.top}; e.preventDefault();
    }}, el('span', {class: 'logo'}, el('img', {src: document.documentElement.getAttribute('data-slp-cat-icon') || '', alt: '발로 두드리는 고양이'})), el('div', {class: 'tt'}, el('b', {}, 'SLP MOD'), el('div', {class: 'st'}, `${S.values.V9_ON ? 'V9 · 다중 탈출' : S.values.V8_ON ? (S.values.V81_BODY_ON ? 'V8-1 · 머리+몸통 혼잡' : 'V8 · 원본 V1+V6') : S.values.V7_ON ? 'V7 · 잔해+혼잡 회피' : S.values.V6_ON ? 'V6 · 미로+근접' : S.values.V5_ON ? 'V5 · 시퀀스 탐색' : S.values.V4_ON ? 'V4 · 미로 풀이' : S.values.V2_ON && S.values.V3_ON ? 'V3 · 가용 경로 계획' : S.values.V2_ON ? 'V2 · 시간 여유 판단' : `V1 · ${PROFILES[S.profile]}`} · ${VERSION}`)),
      btn(S.bot ? '● 봇 ON' : '○ 봇 OFF', false, () => setBot(!S.bot), '봇 켜기/끄기 (T)', `bot ${S.bot ? 'go' : 'stop'}`),
      btn('—', false, () => { S.panel = false; save(); render(); }, '패널 숨기기 (H)', 'ico')),
    el('div', {class: 'presetbar'},
      ...(slotOf(S.preset) ? [el('span', {class: 'badge key', title: `${slotOf(S.preset)}번 키 프리셋`}, slotOf(S.preset))] : []), psel,
      el('span', {class: `badge ${modified ? 'mod' : 'ok'}`, title: modified ? `프리셋과 다른 값: ${changed.join(', ')}` : '프리셋 값 그대로'},
        modified ? `수정 ${changed.length}` : '저장됨'),
      ...(modified ? [btn('저장', false, saveCur, '지금 값을 이 프리셋에 저장 (기본 프리셋이면 새 이름으로)')] : [])),
    hudEl);
  bodyEl = el('div', {class: 'body'});
  const B = (...kids) => bodyEl.append(...kids);

  if (S.tab === 'home') {
    // ---- 홈 (user 2026-09-29: 직관적으로, 짧게, 예쁘게): V1/V2 선택 + 근거 있는 스위치만, 한 줄 근거 ----
    const rstate0 = ruleState();
    const sw = (key, title, ev, icon = '•') => {
      const it = DEF.ui.flatMap(g => g.items).find(x => x[0] === key); if (!it) return null;
      const [, , min, max, step] = it, v = S.values[key], rs = rstate0[key], off = !!(rs && rs.off);
      let ctl;
      if (min === 0 && max === 1 && step === 1)
        ctl = el('button', {class: 'sw' + (v ? ' on' : '') + (off ? ' dis' : ''), title: off && rs ? rs.why.join('\n') : (v ? '켜짐 — 누르면 끔' : '꺼짐 — 누르면 켬'),
          onclick: () => { if (off) return; setValue(key, v ? 0 : 1); render(); }}, el('i'));
      else {
        const num = el('input', {type: 'number', class: 'num', min, max, step, value: fmt(v, step), 'aria-label': title + ' 숫자'});
        const slider = el('input', {type: 'range', min, max, step, value: v, 'aria-label': title + ' 슬라이더'});
        num.disabled = slider.disabled = off;
        slider.oninput = () => { num.value = fmt(slider.value, step); };
        const commit = x => { if (!Number.isFinite(x) || S.values[key] === x) return; setValue(key, x); render(); };
        slider.onchange = () => commit(Number(slider.value));
        num.onchange = () => commit(Math.min(max, Math.max(min, Number(num.value))));
        ctl = el('div', {class: 'quick-control'}, slider, num);
      }
      const displayKey = {V9_OBS: 'v9Map', V9_ROUTES: 'v9Routes', V81_BODY_R: 'bodyRadius', V8_HEAD_R: 'headRadius', V7_HEAD_R: 'headRadius'}[key];
      const displayName = {v9Map: 'V9 몸통 벽 지도 표시', v9Routes: 'V9 탈출 후보 표시', bodyRadius: '몸통 밀도 반경 표시', headRadius: '머리 개수 판단 반경 표시'}[displayKey];
      const heading = el('div', {class: 't' + (displayKey ? ' radius-title' : '')}, el('span', {}, title));
      if (displayKey) heading.append(el('button', {class: 'radius-toggle' + (S.show[displayKey] ? ' on' : ''),
        role: 'switch', 'aria-label': displayName, 'aria-checked': String(!!S.show[displayKey]), title: `${displayName} — 화면 표시만 켜기/끄기`,
        onclick: () => { S.show[displayKey] = !S.show[displayKey]; save(); render(); }}, S.show[displayKey] ? '표시 ON' : '표시 OFF'));
      return el('div', {class: 'li' + (off ? ' off' : '') + (v !== cur[key] ? ' chg' : ''), title: `${title} — ${ev}\n${key} · 프리셋 값 ${cur[key]}`},
        el('span', {class: 'ic'}, icon), el('div', {class: 'txt'}, heading, el('div', {class: 's'}, ev)), ctl);
    };
    const v9 = !!S.values.V9_ON, v8 = !v9 && !!S.values.V8_ON, v7 = !v9 && !v8 && !!S.values.V7_ON, v6 = !v9 && !v8 && !v7 && !!S.values.V6_ON, v41 = !v9 && !v8 && !v7 && !v6 && !!S.values.V41_ON, v5 = !v9 && !v8 && !v7 && !v6 && !v41 && !!S.values.V5_ON, v4 = !v9 && !v8 && !v7 && !v6 && !v5 && !v41 && !!S.values.V4_ON, v2 = !v9 && !v8 && !v7 && !v6 && !v4 && !v5 && !v41 && !!S.values.V2_ON, v3 = v2 && !!S.values.V3_ON;
    const seg = el('div', {class: 'seg'},
      btn('V1', !v9 && !v8 && !v7 && !v2 && !v4 && !v5 && !v41 && !v6, () => { setValue('V9_ON', 0); setValue('V8_ON', 0); setValue('V7_ON', 0); setValue('V6_ON', 0); setValue('V41_ON', 0); setValue('V5_ON', 0); setValue('V2_ON', 0); setValue('V3_ON', 0); setValue('V4_ON', 0); render(); }, '기존 판단: 프리셋의 모든 값을 사용'),
      btn('V2', v2 && !v3, () => { setValue('V9_ON', 0); setValue('V8_ON', 0); setValue('V7_ON', 0); setValue('V6_ON', 0); setValue('V41_ON', 0); setValue('V5_ON', 0); setValue('V4_ON', 0); setValue('V2_ON', 1); setValue('V3_ON', 0); render(); }, 'V2: 시간 여유 판단'),
      btn('V3', v3, () => { setValue('V9_ON', 0); setValue('V8_ON', 0); setValue('V7_ON', 0); setValue('V6_ON', 0); setValue('V41_ON', 0); setValue('V5_ON', 0); setValue('V4_ON', 0); setValue('V2_ON', 1); setValue('V3_ON', 1); render(); }, 'V3: 가용 경로 계획'),
      btn('V4', v4, () => { setValue('V9_ON', 0); setValue('V8_ON', 0); setValue('V7_ON', 0); setValue('V6_ON', 0); setValue('V41_ON', 0); setValue('V5_ON', 0); setValue('V4_ON', 1); render(); }, 'V4: 몸·벽·적 전방 도달 영역을 벽으로 보고 격자 시간 탐색으로 출구를 찾음 (2026-09-30)'),
      btn('V4.1', v41, () => { setValue('V9_ON', 0); setValue('V8_ON', 0); setValue('V7_ON', 0); setValue('V6_ON', 0); setValue('V41_ON', 1); render(); }, 'V4.1: 최초 미로 풀이(48px 격자·전방 원뿔 도달장·Dijkstra) 보존판 — 근접 회피 모드'),
      btn('V5', v5, () => { setValue('V9_ON', 0); setValue('V8_ON', 0); setValue('V7_ON', 0); setValue('V6_ON', 0); setValue('V41_ON', 0); setValue('V4_ON', 0); setValue('V2_ON', 0); setValue('V3_ON', 0); setValue('V5_ON', 1); render(); }, 'V5: 2단계 원호 시퀀스 100개를 매 틱 평가 — 먹이 실섭취·목표 접근·적 도달 위험 비용 (2026-09-30)'),
      btn('V6', v6, () => { setValue('V9_ON', 0); setValue('V8_ON', 0); setValue('V7_ON', 0); setValue('V41_ON', 0); setValue('V5_ON', 0); setValue('V4_ON', 0); setValue('V2_ON', 0); setValue('V3_ON', 0); setValue('V6_ON', 1); render(); }, 'V6: 비동기 2차원 미로 안내선 + 매 틱 연속 원호 근접 회피'),
      btn('V7', v7, () => { setValue('V9_ON', 0); setValue('V8_ON', 0); for (const k of ['V6_ON','V41_ON','V5_ON','V4_ON','V3_ON','V2_ON','PROBE_ON']) setValue(k, 0); setValue('V7_ON', 1); render(); }, '현재 V1 설정으로 추종하고, 반경 안 머리 개수가 기준 이상이면 V6로 회피'),
      btn('V8', v8 && !S.values.V81_BODY_ON, () => { applyPreset('v8_exact'); }, '저장된 잔해 적극 V1과 기존 V6 설정·관측·판단을 사용'),
      btn('V8-1', v8 && !!S.values.V81_BODY_ON, () => { if (!v8) applyPreset('v8_exact'); setValue('V81_BODY_ON', 1); render(); }, 'V8 + 몸통 밀도: 머리 수 또는 주변 몸통 점유율이 기준 이상이면 V6 회피. 반경·점유율 조정 가능'),
      btn('V9', v9, () => applyPreset('v9_maze'), '적 몸통을 벽으로 지도화하고 실제 회전 가능한 다중 탈출 궤적을 탐색·추종'));
    const BUNDLE = ['TURN_FIX', 'RAIDER_ON', 'SIZE_SAFE', 'SIZE_GATE', 'HEAD_RAYS', 'WRAP_RAID', 'WRAP_EXIT_TAIL', 'HEAP_GATE', 'SIZE_PROFILE'];
    const bOn = BUNDLE.filter(k => S.values[k]).length;
    const bundleRow = el('div', {class: 'li'}, el('span', {class: 'ic'}, '📦'), el('div', {class: 'txt'}, el('div', {class: 't'}, '검증 묶음'), el('div', {class: 's'}, `사이클 2 A/B 채택 8개 + 크기 프로필 · ${bOn}/${BUNDLE.length} 켬`)),
      el('button', {class: 'sw' + (bOn === BUNDLE.length ? ' on' : bOn ? ' half' : ''), title: '묶음 전체 켜기/끄기',
        onclick: () => { const on = bOn === BUNDLE.length ? 0 : 1; for (const k of BUNDLE) setValue(k, on); render(); }}, el('i')));
    const rows = v9
      ? [sw('V9_OBS', '미로 지도 반경', '현재 관측된 몸통을 벽으로 만드는 범위', '🗺'), sw('V9_EDGE', '탈출 목표 거리', '지도 안 탐색 경계까지의 목표. 지도 반경보다 80px 이상 작게 제한', '↗'), sw('V9_MARGIN', '몸통·벽 여유', '내 두께와 적 두께에 더할 여유 (px)', '↔'), sw('V9_ROUTES', '탈출 후보 수', '서로 다른 출구 방향의 통과 검증 경로만 표시', '⑶'), sw('V9_H', '미로 탐색 시간', '실제 회전·속도로 탐색할 최대 시간 (s)', '⏱'), sw('V9_HEAD_PAD', '적 머리 예측 여유', '적의 현재 진행 예측에 더하는 불확실성 여유', '🛡')]
      : v8
      ? [sw('V81_BODY_ON', '몸통 밀도 회피 사용', '켜면 V8-1: 머리 수 또는 몸통 가중 점유율로 V6 전환', '🛡'), sw('V81_BODY_R', '몸통 밀도 판정 반경', '내 머리 중심 원 안의 적·내 몸통을 검사 (px)', '◎'), sw('V81_BODY_PCT', '회피 전환 점유율 (%)', '가중 점유율이 이 값 이상이면 V6 회피. 낮을수록 더 일찍 전환', '🛡'), sw('V81_BODY_NEAR_W', '몸통 근접 가중치', '0=거리 가중 없음. 기본2: 중심 최대3배, 경계1배. 높을수록 가까운 몸통을 중시. 전체 가중 면적으로 정규화한 점유율 사용', '◎'), sw('V81_BODY_SELF_W', '내 몸통 밀도 가중치', '5=적 몸통의 5배, 1=동일, 0.1=1/10, 0.01=1/100. 가까울수록 근접 가중치도 동일 적용. 겹친 영역은 중복 합산하지 않음', '◎'), sw('V8_HEAD_R', '혼잡 판정 반경', '내 머리에서 이 거리 안의 적 머리만 셈', '◎'), sw('V8_HEAD_N', 'V6 전환 머리 개수', '이 개수 이상이면 원본 V6 사용', '🛡'), sw('V8_CLEAR_S', 'V1 복귀 대기', '머리·몸통 발동 조건이 모두 해제된 상태가 지속되면 V1 복귀', '⏱'), sw('W_GOAL', 'V1 잔해 목표 끌림', '저장된 잔해 적극 설정에서 조정', '🎯'), sw('FOOD_R', 'V1 잔해 탐색 범위', '원본 V1 먹이 탐색 반경', '🔭'), sw('BOOST_COST', 'V1 부스트 비용', '낮을수록 부스트 적극 사용', '⚡'), sw('V6_MARGIN', 'V6 몸·벽 여유', '원본 V6 설정에서 조정', '↔'), sw('V6_SAFETY', 'V6 적 도달 여유', '원본 V6 설정에서 조정', '🛡'), sw('V6_CENTER_W', 'V6 중심 이동 가중치', '원본 V6 설정에서 조정', '◎')]
      : v7
      ? [sw('V7_HEAD_R', '혼잡 판정 반경', '내 머리에서 이 거리 안의 적 머리만 셈', '◎'), sw('V7_HEAD_N', 'V6 전환 머리 개수', '이 개수 이상이면 즉시 V6 회피', '🛡'), sw('V7_CLEAR_S', 'V1 복귀 대기', '기준보다 적은 상태가 이 시간 지속되면 먹이 추종 복귀', '⏱'), sw('W_GOAL', 'V1 잔해 목표 끌림', '평상시 V1의 무더기 추종 가중치', '🎯'), sw('FOOD_R', 'V1 잔해 탐색 범위', '평상시 V1 먹이 탐색 반경', '🔭'), sw('BOOST_COST', 'V1 부스트 비용', '낮을수록 V1 부스트 적극 사용', '⚡'), sw('REMAINS', '잔해 판정 크기', '평상시 V1의 큰 먹이 판정', '✨'), sw('REMAINS_ONLY', '잔해만 무더기로', '평상시 일반 먹이는 무더기 목표에서 제외', '🎯'), sw('V6_MARGIN', 'V6 몸·벽 여유', '혼잡 회피 중 사용할 추가 여유', '↔'), sw('V6_SAFETY', 'V6 적 도달 여유', '혼잡 회피 중 적보다 먼저 통과할 시간', '🛡'), sw('V6_CENTER_W', 'V6 중심 이동 가중치', '회피 후보에서 안쪽 선호', '◎')]
      : v6
      ? [sw('V6_FOOD_R', '잔해 탐색 범위', '관측된 먼 잔해까지 목표로 선택. 미로는 가까운 경로부터 확인', '🔭'), sw('V6_HEAP_SIZE', '잔해 무더기 크기', '큰 값일수록 넓게 묶어 총량으로 목표 선택', '✨'), sw('V6_GOAL_W', '잔해 목표 끌림', '안전 후보에서 목표 경로 추종 강도. 0이면 잔해 목표 끔', '🎯'), sw('V6_BOOST_W', '잔해 부스트 선호', '목표에 가까워지는 안전한 부스트에 가점. 0이면 가점 없음', '⚡'), sw('V6_BOOST_MIN_MASS', '부스트 최소 잔해량', '무더기 크기 합계가 이 값 이상일 때 부스트 가점', '✨'), sw('V6_BOOST_MIN_DIST', '부스트 최소 거리', '가까운 잔해에는 부스트 가점 억제', '↔'), sw('V6_CENTER_W', '중심 이동 가중치', '잔해 목표가 없을 때 맵 중심 쪽 선호. 중심 가까이에서는 약해짐. 0이면 끔', '◎'), sw('V6_FOOD_W', '잔해 수집 가중치', '안전 후보에서 경로 주변 큰 먹이를 먹는 행동 가중치', '🍽'), sw('V6_REMAINS_MIN', '잔해 판정 크기', '이 크기 이상의 먹이만 목표와 수집 평가에 포함', '✨'), sw('V6_EDGE', '미로 목표 거리', '멀리 탐색할 목표 반경. 통로가 막히면 부분 경로까지만 표시', '🗺'), sw('V6_H', '미로 탐색 시간', '먼 경로까지 탐색할 시간 범위', '⏱'), sw('V6_PLAN_MS', '미로 재탐색 주기', 'Worker가 거시 안내선을 갱신하는 간격', '🗺'), sw('V6_ROUTE_AGE', '경로 유효 나이', '이보다 낡은 안내선은 즉시 폐기', '⏱'), sw('V6_LOCAL_H', '근접 회피 지평', '매 틱 연속 원호를 검사하는 시간', '🛡'), sw('V6_MARGIN', '몸·벽 여유', '실측 사망 경계를 반영한 추가 여유', '↔'), sw('V6_SAFETY', '적 도달 여유', '적보다 먼저 통과해야 하는 시간', '⚡')]
      : v5
      ? [sw('V5_W_FOOD', '먹이 가중', '경로에서 실제 먹는 양 × 이 값', '🍖'), sw('V5_TG', '먹이 환산 시간', '작을수록 가까운 먹이 우선, 클수록 먼 무더기도 쫓음', '🎯'), sw('V5_W_RISK', '적 위험 비용', '적이 먼저 닿는 칸 비용 · 클수록 잘 피함', '⚠'), sw('V5_W_TURN', '회전 비용', '클수록 제자리 회전 억제', '🌀'), sw('V5_W_BOOST', '부스트 비용', '초당 비용', '🚀'), sw('V4_MARGIN', '벽 여유', '몸·경계에서 이만큼 떨어짐 (V4와 공유)', '↔'), sw('TRACK_LAT', '지연 보상', '명령→서버 지연 s', '⚡')]
      : v4
      ? [sw('V4_HEADR', '적 머리 탐색 반경', '이 거리 안의 머리를 전 방향 도달장에 반영', '◉'), sw('V4_SAFETY', '도달 안전 여유', '적이 먼저 닿는 칸은 이만큼 일찍 벽', '⏱'), sw('V4_MARGIN', '벽 여유', '몸·경계에서 이만큼 떨어짐', '↔'), sw('V4_EDGE', '출구 링', '이 반경 밖 열린 칸 = 출구', '◎'), sw('TRACK_LAT', '지연 보상', '명령→서버 지연 s', '⚡')]
      : v3
      ? [sw('V3_BUDGET', '계산 예산 ms', '초과하면 직전 검증 명령 유지', '⏱'), sw('V3_RISKW', '위험 감점', '미커밋 상대 시나리오 위험 × 이 값', '⚠'),
         sw('V2_WALLSHRINK', '벽 축소 대응', 'V3도 같은 벽 외삽 사용', '🧱'), sw('V2_WRAP', '감김 감시', '출구 방향 가중', '🌀'), sw('V2_REMAINS', '잔해 크기', '사체 먹이 14~16', '🍖')]
      : v2
      ? [sw('V2_WALLSHRINK', '벽 축소 대응', '경기장이 줄어드는 만큼 미리 비킴 · 벽 사망 2건 대응', '🧱'),
         sw('V2_STRAIGHT', '직진 기준 안전', '실제로 갈 경로로 여유 판정 · 통로·벽 진입 3건 대응', '➜'),
         sw('V2_WRAP', '감김 감시', '1150px · 덮개 0.54 · 이후 11판 감김 0', '🌀'),
         sw('V2_REMAINS', '잔해 크기', '사체 먹이 14~16 · 20이면 잔해를 못 봄', '🍖')]
      : [sw('GUARD_ON', '공격 가드', 'A/B 20판 끊김 4→1 · 사망 1.44→0.47/10분', '🛡'),
         bundleRow,
         sw('REMAINS', '잔해 크기', '12 권장 · 20이면 잔해 0', '🍖'),
         sw('REMAINS_ONLY', '잔해만 무더기로', '일반 먹이는 무더기 목표에서 제외', '🎯')];
    const exp = v2 && !v3 ? [sw('V2_CHG', '돌진 궤적 장애물', '미검증', '🧪'), sw('V2_BOOSTFREE', '위험 시 부스트 면제', '근거 부정 · 부스트 중 끊김 사망', '🧪')] : [];
    B(el('div', {class: 'eyebrow'}, 'Control profile'), el('div', {class: 'hero'}, seg),
      el('div', {class: 'eyebrow'}, v2 ? 'Survival core' : 'Verified controls'),
      el('div', {class: 'list quick-grid'}, ...rows.filter(Boolean)),
      ...(exp.length ? [el('details', {class: 'exp'}, el('summary', {}, '실험 항목 (근거 없음)'), el('div', {class: 'list'}, ...exp.filter(Boolean)))] : []),
      el('div', {class: 'hint'}, `${modified ? `노란 이름 = 프리셋과 다른 값 ${changed.length}개 · ` : ''}세부 수치는 '상세' 탭`));
  } else if (S.tab === 'tune') {
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
      const folded = S.openGroup !== gk, advOn = S.adv || !nCore || !!S.open[grp.group];   // accordion: one group open (2026-09-29)
      const nChg = grp.items.filter(it => S.values[it[0]] !== cur[it[0]]).length;
      const box_ = el('div', {class: 'grp' + (folded ? '' : ' open')}, el('h4', {onclick: () => { S.openGroup = folded ? gk : null; save(); render(); }, title: folded ? '펼치기' : '접기'},
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
    if (S.show.bodyRadius || S.show.headRadius) legend.push(el('div', {}, '몸통 밀도 반경 = 청록 점선 · 머리 개수 판단 반경 = 노랑 실선. 내 머리 중심, 설정 px와 동일. 표시 스위치는 판정 조건에 영향 없음.'));
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
    // ac is only the official list's activity weight. Exact population is recorded only after a real visit.
    const byServer = new Map();
    for (const o of (window.sos || []).filter(o => o && o.ip && !String(o.ip).startsWith('['))) {
      const key = `${o.ip}:${o.po}`, old = byServer.get(key);
      if (!old || (o.ptm || 9e9) < (old.ptm || 9e9)) byServer.set(key, o);
    }
    for (const key of Object.keys(S.serverSeen)) if (!byServer.has(key)) {
      const p = key.lastIndexOf(':'); byServer.set(key, {ip: key.slice(0, p), po: Number(key.slice(p + 1)), ptm: 9e9, ac: 0, old: true});
    }
    const sos = [...byServer.values()].sort((a, b) => ((a.ptm || 9e9) - (b.ptm || 9e9)) || ((b.ac || 0) - (a.ac || 0)));
    const selectServer = key => { S.server = key; save(); render(); note(key ? `${key} — 다음 판 서버` : '서버 자동 선택'); };
    const signal = p => el('span', {class: `sig l${p.level}`, style: `color:${p.color}`, title: `핑 ${p.text}`}, el('i'), el('i'), el('i'), el('i'));
    const srvCard = o => {
      const key = `${o.ip}:${o.po}`, p = pingLook(o.ptm), seen = S.serverSeen[key], players = seen && Number(seen.players);
      const pct = players > 0 ? Math.min(100, players / 6) : 0;
      return el('button', {class: `srv${S.server === key ? ' sel' : ''}`, onclick: () => selectServer(key), title: seen ? `마지막 실제 접속자 ${players}명 · ${new Date(seen.at).toLocaleString()}` : '아직 방문하지 않아 실제 인원 기록 없음'},
        signal(p),
        el('div', {}, el('div', {class: 'name'}, `${key}${o.sid ? ` · #${o.sid}` : ''}`), el('div', {class: 'meta'}, `${p.text} · ${seen ? `실제 인원 ${ageTxt(seen.at)}` : `미방문 · 활동값 ${o.ac || 0}`}`)),
        el('div', {class: 'cnt'}, seen ? String(players) : '—', el('small', {}, seen ? '명' : '기록 없음')),
        el('span', {class: 'pop', title: seen ? `${players}명 / 그래프 상한 600명` : '방문 후 실제 인원이 기록됩니다'}, el('i', {style: `width:${pct}%`})));
    };
    const cur_ = window.bso ? `${window.bso.ip}:${window.bso.po}` : '-';
    B(el('h5', {}, el('span', {class: 'lab'}, '서버 선택'), btn('↻', false, render, '핑·목록 표시 새로고침', 'ico')),
      el('div', {class: 'hint'}, `지금 접속: ${cur_}${window.bso && window.bso.sid ? ` (#${window.bso.sid})` : ''} · 인원은 실제 방문 때만 기록`),
      el('button', {class: `srv${!S.server ? ' sel' : ''}`, onclick: () => selectServer(''), title: '게임의 기본 서버 자동 선택'},
        el('span', {class: 'sig l4', style: 'color:#9b8cff'}, el('i'), el('i'), el('i'), el('i')),
        el('div', {}, el('div', {class: 'name'}, '자동 선택'), el('div', {class: 'meta'}, '게임 기본 · 다음 판부터')), el('div', {class: 'cnt'}, 'AUTO', el('small', {}, '서버')),
        el('span', {class: 'pop'}, el('i', {style: 'width:100%;background:linear-gradient(90deg,#9b8cff,#60a5fa)'}))),
      el('div', {class: 'srvlist'}, ...sos.map(srvCard)),
      el('h5', {}, '판 기록'),
      el('div', {class: 'row'}, chip('판이 끝나면 기록(JSON) 자동 저장', S.autosave, () => { S.autosave = !S.autosave; save(); render(); }, '다운로드 폴더에 저장')),
      el('h5', {}, `최근 판 (${S.games.length})`),
      el('div', {class: 'box', style: 'white-space:pre'}, S.games.slice(0, 10).map(g =>
        `${stamp5(g.at)}  ${String(Math.round(g.seconds)).padStart(4)}초  길이 ${String(g.L_max).padStart(5)}  ${g.preset && !BUILTIN[g.preset] ? g.preset : PROFILES[g.profile] || g.profile}`).join('\n') || '아직 없음'),
      el('h5', {}, '단축키'),
      el('div', {class: 'box', style: 'line-height:1.7'}, 'T  봇 켜기/끄기', el('br'), 'H  패널 숨기기/보이기', el('br'), 'Z  줌 초기화 · 마우스 휠  줌', el('br'), '1~4  프리셋 전환 · Shift+1~4  지금 프리셋을 그 키에'),
      el('div', {class: 'row', style: 'margin-top:10px'}, btn('패널 위치 초기화', false, () => { S.pos = null; save(); render(); })));
  }
  panel.append(top, el('div', {class: 'frame'}, nav, bodyEl));
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
      last: last && {ms: last.ms, mode: last.trace.mode, v9_routes: last.trace.v9_routes, v9_reason: last.trace.v9_reason, squeeze: last.trace.squeeze, v7_phase: last.trace.v7_phase, v7_heads: last.trace.v7_heads, v8_phase: last.trace.v8_phase, v8_heads: last.trace.v8_heads, v81_density: last.trace.v81_density, v81_reason: last.trace.v81_reason}, squeeze_ticks: game && game.squeeze.length})};
  console.log('[SLP] MOD', VERSION, 'ready; worker', !!worker);
}, 100);
})();
