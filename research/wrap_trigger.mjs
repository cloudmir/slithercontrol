// Cycle 1: which wrap trigger? From whole-game logs (slp_k_log.json.gz, ext 0927-d3c13245+), for trigger candidates
// "one snake covers >= COV of the bearings within 500 px for >= HOLD s", count per game minute how often it fires
// (the cost: time taken away from feeding) and how often a death follows within 20 s of a firing (the benefit).
// A trigger that fires before most deaths but rarely otherwise is what the escape should start on.
//   node research/wrap_trigger.mjs <run dir> [...]
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';

const games = [];
for (const dir of process.argv.slice(2))
  for (const n of fs.readdirSync(dir).filter(n => /^slp_\d+_log\.json\.gz$/.test(n)).sort()) {
    const L = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, n))));
    const ix = Object.fromEntries(L.keys.map((k, i) => [k, i]));
    const rows = L.log.map(r => ({t: r[ix.t], cov: r[ix.cov] || 0, id: r[ix.cov_id], mode: r[ix.mode], gap: r[ix.gap_now]}));
    const rec = JSON.parse(fs.readFileSync(path.join(dir, n.replace('_log.json.gz', '.json')), 'utf8'));
    const stall = (rec.freezes || []).some(([t, ms]) => t >= rec.seconds - 10 && ms > 1000);
    games.push({name: n.replace('_log.json.gz', ''), rows, end: rows[rows.length - 1].t, stall});
  }
const minutes = games.reduce((a, g) => a + g.end / 60, 0), deaths = games.filter(g => !g.stall).length;
console.log(`${games.length} games, ${minutes.toFixed(1)} min, ${deaths} deaths (stall deaths excluded: ${games.filter(g => g.stall).length})`);
console.log('trigger (cov >= C for >= H s) | firings/min | deaths preceded by a firing within 20 s | lead time before death (median s)');
for (const C of [.3, .35, .4, .45, .5]) for (const H of [.5, 1, 2]) {
  let fires = 0, caught = 0; const leads = [];
  for (const g of games) {
    let since = null, id = null, armed = true, first = null;
    for (const r of g.rows) {
      if (r.cov >= C && (id === null || r.id === id)) { if (since === null) { since = r.t; id = r.id; } }
      else { since = null; id = null; armed = true; }
      if (since !== null && r.t - since >= H && armed) {
        fires++; armed = false;
        if (!g.stall && g.end - r.t <= 20 && first === null) first = r.t;
      }
    }
    if (first !== null) { caught++; leads.push(g.end - first); }
  }
  const med = leads.length ? leads.sort((a, b) => a - b)[leads.length >> 1].toFixed(1) : '-';
  console.log(`  cov >= ${C.toFixed(2)} for ${H} s`.padEnd(31) + `| ${(fires / minutes).toFixed(2).padStart(6)}      | ${caught}/${deaths}`.padEnd(46) + `| ${med}`);
}
