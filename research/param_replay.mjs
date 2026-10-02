// Are the current values any good? (user 2026-09-27 "계속 데이터를 수집하고 지금 파라메터 등이 유효한지 확인하자")
// Replays each MOD black box (last 30 s before a death) through ext/pilot.js with several value sets and scores every
// decision by what really happened next: the drawn gap of its 1.2 s path against the bodies and wall recorded later
// (others fixed - they do not react to a different move of ours; open loop, one decision held for 1.2 s).
//   node research/param_replay.mjs <run dir with slp_*.json + slp_*_box.json.gz> [...more dirs]
// Prints per value set: decisions that would have touched (gap < 0) in the last 10 s / 3 s, and at 3.0 / 2.0 / 1.2 s
// before death; plus how often the replay with the played values matches the recorded command (sanity).
import fs from 'node:fs'; import vm from 'node:vm'; import zlib from 'node:zlib'; import path from 'node:path';
vm.runInThisContext(fs.readFileSync('ext/pilot.js', 'utf8'));
const {Pilot, makeParams, paths, R, ANGLES} = globalThis.SlpPilot;
const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
const SAFETY = ['SAFE', 'SAFE_HEADS', 'TIGHT', 'HARD_PHYS', 'THICK_OFF_THIN', 'THICK_OFF_MID', 'THICK_OFF_THICK', 'HARD', 'CREDIT',
  'HEAD_NEAR', 'LONG_SAFE', 'LONG_T', 'HEAD_R', 'REACH'];

function segGap(x, y, S, ro) {         // min drawn gap from point to recorded bodies (segs x0,y0,x1,y1,r)
  let g = Infinity;
  for (let i = 0; i < S.length; i += 5) {
    const ax = S[i], ay = S[i + 1], dx = S[i + 2] - ax, dy = S[i + 3] - ay;
    const l2 = dx * dx + dy * dy, u = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(x - ax - u * dx, y - ay - u * dy) - S[i + 4] - ro;
    if (d < g) g = d;
  }
  return g;
}
function realized(frames, times, k, pos, t) {    // one path (N points at t) from frame k; NaN if not fully observed
  const f0 = frames[k], ro = R * f0.sc;
  let g = Infinity, j = k;
  for (let n = 0; n < t.length; n++) {
    const target = f0.t + t[n];
    while (j + 1 < frames.length && Math.abs(times[j + 1] - target) <= Math.abs(times[j] - target)) j++;
    if (Math.abs(times[j] - target) > .06) return NaN;
    const f = frames[j], x = pos[2 * n], y = pos[2 * n + 1], w = f.wall;
    if (!f.near) {
      const out = [];
      for (let i = 0; i < f.segs.length; i += 5) if (Math.min(Math.hypot(f.segs[i] - f.x, f.segs[i + 1] - f.y), Math.hypot(f.segs[i + 2] - f.x, f.segs[i + 3] - f.y)) < 800)
        out.push(f.segs[i], f.segs[i + 1], f.segs[i + 2], f.segs[i + 3], f.segs[i + 4]);
      f.near = out;
    }
    g = Math.min(g, w[2] - Math.hypot(x - w[0], y - w[1]) - ro, segGap(x, y, f.near, ro));
  }
  return g;
}
const state = f => ({x: f.x, y: f.y, ang: f.ang, sp: f.sp, sc: f.sc, L: f.L, t: f.t, boost: f.boost, wall: f.wall,
  segs: Float64Array.from(f.segs), sid: Float64Array.from(f.sid), heads: Float64Array.from(f.heads), hid: Float64Array.from(f.hid),
  food: Float64Array.from(f.food), own: Float64Array.from(f.own)});

const games = [];
for (const dir of process.argv.slice(2))
  for (const n of fs.readdirSync(dir).filter(n => /^slp_.*\.json$/.test(n)).sort()) {
    const box = path.join(dir, n.replace(/\.json$/, '_box.json.gz'));
    if (fs.existsSync(box)) games.push({name: n.replace(/\.json$/, ''), rec: JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')),
      frames: JSON.parse(zlib.gunzipSync(fs.readFileSync(box))).frames});
  }
if (!games.length) { console.error('no slp_*.json + _box.json.gz'); process.exit(1); }
const played = games[0].rec.values, prof = games[0].rec.profile;
const sets = {
  '지금 값 (판에서 쓴 값)': played,
  '공격형 기본': {...params.defaults, ...params.profiles.aggressive},
  '안전형 기본': {...params.defaults, ...params.profiles.safe},
  '지금 값 + 안전 여유만 기본': {...played, ...Object.fromEntries(SAFETY.map(k => [k, {...params.defaults, ...params.profiles[prof]}[k]]))},
};
const diff = Object.entries(played).filter(([k, v]) => v !== {...params.defaults, ...params.profiles[prof]}[k]);
console.log(`${games.length} deaths; played values differ from ${prof} defaults in: ${diff.map(([k, v]) => `${k}=${v}`).join(', ')}`);
console.log(`mid-game value changes: ${games.map(g => g.rec.changes.filter(c => Object.keys(c).some(k => k in params.defaults)).length).join(', ')}`);

const table = {};
for (const [name, vals] of Object.entries(sets)) {
  const P = makeParams(vals), row = {n10: 0, bad10: 0, n3: 0, bad3: 0, at: {3: [], 2: [], 1.2: []}, match: [0, 0], touched: []};
  for (const g of games) {
    const F = g.frames, times = F.map(f => f.t), T = times[times.length - 1];
    const pilot = new Pilot(vals, prof);
    for (let k = 0; k < F.length; k++) {
      const f = F[k], [cmd, boost] = pilot.step(state(f));
      if (name.startsWith('지금 값 (')) { row.match[1]++; if (Math.abs(Math.atan2(Math.sin(cmd - f.cmd[0]), Math.cos(cmd - f.cmd[0]))) < .09 && boost === f.cmd[1]) row.match[0]++; }
      const before = T - f.t;
      const moment = [3, 2, 1.2].find(m => Math.abs(before - m) < .02 && !row.at[m].some(x => x.game === g.name));
      if (before > 10 || (k % 3 && !moment)) continue;
      const prev = k ? F[k - 1].cmd[0] : f.ang, pb = k ? F[k - 1].cmd[1] : false;
      const {pos, t} = paths(P, f.x, f.y, f.ang, f.sp, f.sc, prev, [cmd], [boost], pb);
      const gap = realized(F, times, k, pos, t);
      if (Number.isNaN(gap)) continue;
      if (moment) row.at[moment].push({game: g.name, gap: Math.round(gap)});
      if (k % 3) continue;
      row.n10++; row.bad10 += gap < 0;
      if (gap < 0 && name.startsWith('지금 값 (')) {
        const hd = [...ANGLES.map(a => f.ang + a), ...ANGLES.map(a => f.ang + a)], bs = [...ANGLES.map(() => false), ...ANGLES.map(() => true)];
        const all = paths(P, f.x, f.y, f.ang, f.sp, f.sc, prev, hd, bs, pb), N = all.t.length;
        let ok = 0;
        for (let c = 0; c < hd.length; c++) if (realized(F, times, k, all.pos.subarray(2 * c * N, 2 * (c + 1) * N), all.t) >= 0) ok++;
        const tr = g.rec.trace.find(x => Math.abs(x.t - f.t) < .001);
        row.touched.push({ok, hard: tr ? tr.hard : null, gap, before});
      }
      if (before <= 3) { row.n3++; row.bad3 += gap < 0; }
    }
  }
  table[name] = row;
}
const pct = (a, b) => b ? `${Math.round(100 * a / b)}% (${a}/${b})` : '-';
console.log('\nvalue set                      | touch within 1.2 s: last 10 s | last 3 s | decisions safe at 3.0 / 2.0 / 1.2 s before death');
for (const [name, r] of Object.entries(table)) {
  const at = m => `${r.at[m].filter(x => x.gap >= 0).length}/${r.at[m].length}`;
  console.log(`${name.padEnd(26)} | ${pct(r.bad10, r.n10).padEnd(16)} | ${pct(r.bad3, r.n3).padEnd(14)} | ${at(3)} / ${at(2)} / ${at(1.2)}`);
}
const tt = table['지금 값 (판에서 쓴 값)'].touched, med = a => a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : '-';
console.log(`\nplayed values, decisions that touched within 1.2 s (${tt.length}):`);
console.log(`  some of the 48 basic maneuvers stayed clear (choice/prediction problem): ${tt.filter(x => x.ok > 0).length}` +
  ` (median clear maneuvers ${med(tt.filter(x => x.ok > 0).map(x => x.ok))}); none stayed clear (already trapped): ${tt.filter(x => !x.ok).length}`);
const pr = tt.filter(x => x.hard !== null);
console.log(`  planner's own predicted gap for those decisions: median ${med(pr.map(x => x.hard))} px; predicted >= 10 px but touched: ${pr.filter(x => x.hard >= 10).length}/${pr.length}`);
console.log(`  by time before death: ${[[10, 3], [3, 1.2], [1.2, 0]].map(([a, b]) => { const w = tt.filter(x => x.before <= a && x.before > b); return `${a}-${b} s: ${w.filter(x => x.ok > 0).length} choice / ${w.filter(x => !x.ok).length} trapped`; }).join(', ')}`);
const m = table['지금 값 (판에서 쓴 값)'].match;
console.log(`\nreplay with the played values = recorded command (±5°, same boost): ${pct(m[0], m[1])}`);
console.log('per death, gap (px) of the decision at 3.0 / 2.0 / 1.2 s before death:');
for (const g of games) console.log(`  ${g.name} ${String(g.rec.seconds).padStart(6)}s ` + Object.entries(table).map(([name, r]) =>
  `${name.slice(0, 6)} ${[3, 2, 1.2].map(mm => (r.at[mm].find(x => x.game === g.name) || {gap: '·'}).gap).join('/')}`).join(' | '));
