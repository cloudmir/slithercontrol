// Live A/B report (tuning cycles, records/current/decision-cycle1-wrap-20260927.md): per arm, from the whole-game logs
// (slp_k_log.json.gz) and records of a research/mod_deaths_live.py run with arms. Survival, growth, deaths per 10 min,
// wrap episodes (one snake covers >= 0.3 of the bearings within 500 px; ended = 2 s below 0.2) and how many ended in the
// death (and the death type from analysis/report.txt, research/mod_deaths.py), near misses (our real clearance gap_now dropping below 5 px), time in escape, page stalls.
//   node research/ab_report.mjs <run dir> [...]
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';

const arms = {};
for (const dir of process.argv.slice(2)) {
  // death type per game from research/mod_deaths.py (deaths.py: wrapped / cut_off / trapped / sudden), when it has run
  const rep = path.join(dir, 'analysis', 'report.txt'), cats = {};
  if (fs.existsSync(rep)) for (const m of fs.readFileSync(rep, 'utf8').matchAll(/\/(slp_\d+)\s+[\d.]+s L\s*\d+ (\w+)/g)) cats[m[1]] = m[2];
  for (const n of fs.readdirSync(dir).filter(n => /^slp_\d+\.json$/.test(n)).sort()) {
    const base = path.join(dir, n.replace(/\.json$/, '')), armFile = base + '.arm';
    if (!fs.existsSync(base + '_log.json.gz')) continue;
    const arm = fs.existsSync(armFile) ? fs.readFileSync(armFile, 'utf8').trim() : '-';
    const rec = JSON.parse(fs.readFileSync(base + '.json', 'utf8')), L = JSON.parse(zlib.gunzipSync(fs.readFileSync(base + '_log.json.gz')));
    const ix = Object.fromEntries(L.keys.map((k, i) => [k, i])), rows = L.log;
    const g = {name: n, seconds: rec.seconds, Lmax: rec.L_max, L0: rows[0][ix.L], L1: rows[rows.length - 1][ix.L], eps: 0, epDeaths: 0,
      near: 0, esc: 0, n: rows.length, cat: cats[n.replace(/\.json$/, '')] || '?', stall: (rec.freezes || []).some(([t, ms]) => t >= rec.seconds - 10 && ms > 1000) || !!rec.capped, capped: !!rec.capped};   // capped (time limit) games are not deaths
    let ep = false, low = null, below = false;
    for (const r of rows) {
      const cov = r[ix.cov] || 0, t = r[ix.t];
      if (!ep && cov >= .3) { ep = true; low = null; g.eps++; }
      else if (ep) { low = cov < .2 ? (low === null ? t : low) : null; if (low !== null && t - low >= 2) ep = false; }
      const gap = r[ix.gap_now];
      if (gap !== null && gap < 5 && !below) { g.near++; below = true; } else if (gap !== null && gap >= 10) below = false;
      if (r[ix.esc] !== null) g.esc++;
    }
    if (ep && !g.stall) g.epDeaths++;
    (arms[arm] = arms[arm] || []).push(g);
  }
}
const med = a => a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : NaN, sum = a => a.reduce((s, x) => s + x, 0);
console.log('arm | games | survival s median (mean) | deaths/10 min | growth L/min median | wrap episodes | ended in death | near misses/min | escape on | stall deaths');
for (const [arm, gs] of Object.entries(arms).sort()) {
  const mins = sum(gs.map(g => g.seconds)) / 60, deaths = gs.filter(g => !g.stall).length, eps = sum(gs.map(g => g.eps)), ed = sum(gs.map(g => g.epDeaths));
  console.log(`${arm.padEnd(3)} | ${String(gs.length).padStart(5)} | ${String(Math.round(med(gs.map(g => g.seconds)))).padStart(6)} (${Math.round(mins * 60 / gs.length)})`.padEnd(38) +
    `| ${(deaths / mins * 10).toFixed(2).padStart(6)}        | ${Math.round(med(gs.map(g => (g.L1 - g.L0) / g.seconds * 60))).toString().padStart(8)}           | ` +
    `${String(eps).padStart(6)}        | ${ed}/${eps} (${Math.round(100 * ed / eps)}%)`.padEnd(22) +
    `| ${(sum(gs.map(g => g.near)) / mins).toFixed(2).padStart(8)}        | ${Math.round(100 * sum(gs.map(g => g.esc)) / sum(gs.map(g => g.n)))}%`.padEnd(24) + `| ${gs.filter(g => g.stall).length}`);
}
for (const [arm, gs] of Object.entries(arms).sort()) console.log(`  ${arm}: ` + gs.map(g => `${g.name.slice(4, 6)} ${Math.round(g.seconds)}s L${g.Lmax} ${g.cat}${g.epDeaths ? ' in-episode' : ''}${g.capped ? ' CAP' : g.stall ? ' STALL' : ''}`).join(' | '));
// "ended in death" above counts any death inside an episode (cov >= 0.2 at the end): nearly every death is. The death type
// from deaths.py says whether the ring killed us.
for (const [arm, gs] of Object.entries(arms).sort()) {
  const mins = sum(gs.map(g => g.seconds)) / 60, by = {};
  for (const g of gs.filter(g => !g.stall)) by[g.cat] = (by[g.cat] || 0) + 1;
  console.log(`  ${arm} deaths by type (per 10 min): ` + Object.entries(by).sort().map(([c, k]) => `${c} ${k} (${(k / mins * 10).toFixed(2)})`).join(', '));
}
// B vs A with 95% intervals: games resampled within each arm (bootstrap, 4000 draws, fixed seed). Small samples: read the width.
if (arms.A && arms.B) {
  let s = 1; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const draw = gs => gs.map(() => gs[Math.floor(rnd() * gs.length)]);
  const stats = gs => ({'deaths/10 min': gs.filter(g => !g.stall).length / sum(gs.map(g => g.seconds)), 'survival median': med(gs.map(g => g.seconds)),
    'growth median': med(gs.map(g => (g.L1 - g.L0) / g.seconds)), 'wrap episodes ended in death': sum(gs.map(g => g.epDeaths)) / sum(gs.map(g => g.eps)),
    'wrapped deaths/10 min': gs.filter(g => !g.stall && g.cat === 'wrapped').length / sum(gs.map(g => g.seconds)),
    'other deaths/10 min': gs.filter(g => !g.stall && g.cat !== 'wrapped').length / sum(gs.map(g => g.seconds))});
  const point = stats(arms.B), a0 = stats(arms.A), boot = Array.from({length: 4000}, () => { const b = stats(draw(arms.B)), a = stats(draw(arms.A)); return Object.fromEntries(Object.keys(b).map(k => [k, b[k] / a[k]])); });
  console.log('B / A ratio (95% bootstrap interval, share of draws < 1):');
  for (const k in point) {
    const v = boot.map(r => r[k]).filter(Number.isFinite).sort((x, y) => x - y);
    console.log(`  ${k.padEnd(30)} ${(point[k] / a0[k]).toFixed(2)}  [${v[Math.floor(v.length * .025)].toFixed(2)}, ${v[Math.floor(v.length * .975)].toFixed(2)}]  ${Math.round(100 * v.filter(x => x < 1).length / v.length)}%`);
  }
}
