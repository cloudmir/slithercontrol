// node ext/test/replay.mjs states.json profile -> JSON [{cmd, boost, ms, ...trace}] (research/mod_parity.py js)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
vm.runInThisContext(fs.readFileSync(path.join(here, '..', 'pilot.js'), 'utf8'));
const params = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'params.json'), 'utf8'));
const [, , file, profile = 'aggressive', over = '{}'] = process.argv;   // over: JSON of value overrides
const flat = a => Float64Array.from(Array.isArray(a) ? a.flat() : []);
const pilot = new globalThis.SlpPilot.Pilot({...params.defaults, ...params.profiles[profile], ...JSON.parse(over)}, profile);
const out = [];
for (const s of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  const st = {...s, segs: flat(s.segs), sid: flat(s.sid), heads: flat(s.heads), hid: flat(s.hid), food: flat(s.food), own: flat(s.own)};
  const t0 = performance.now();
  const [cmd, boost] = pilot.step(st);
  out.push({...pilot.last.trace, cmd, boost, ms: performance.now() - t0});
}
process.stdout.write(JSON.stringify(out));
