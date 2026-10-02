"""Phase 1 (zero-base plan): measure the live game instead of assuming it.

An in-page recorder (MEASURE_JS) watches every snake the client knows about:
- Death events. The client sets o.dead=true (and stops moving the head) the
  moment the server's kill message arrives (research/game.js: `if(is_kill){
  o.dead=true ...}`). At that frame we store the victim's head, its last ~12
  alive frames, and the distance from its head to every other snake's body
  polyline and head, with both thicknesses. Deaths of other players are free
  data on the kill distance by thickness: we do not have to die to learn it.
- Motion samples every 100 ms for every visible snake: position, angle, the
  client's speed field (sp) and scale (sc). Offline this gives cruise and boost
  speed by size, acceleration when a boost starts, and turn rate by size.

usage (offline): .venv/bin/python measure.py runs/live_staged_*/measure.json.gz ...
"""
import gzip
import json
import sys
import numpy as np

MEASURE_JS = """() => {
  if (window.__meas) return true;
  const M = window.__meas = {ev: [], smp: [], uid: new WeakMap(), hist: new WeakMap(), gone: new WeakSet(), n: 0, lastS: 0};
  const body = (o) => { const a = []; for (const p of o.pts) if (!p.dying) a.push(p.xx, p.yy); a.push(o.xx, o.yy); return a; };
  const segDist = (px, py, a) => {
    let best = 1e9;
    for (let i = 0; i + 3 < a.length; i += 2) {
      const x1 = a[i], y1 = a[i+1], dx = a[i+2] - x1, dy = a[i+3] - y1, L = dx*dx + dy*dy;
      let t = L > 0 ? ((px - x1)*dx + (py - y1)*dy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x1 + t*dx - px, ey = y1 + t*dy - py, d = Math.sqrt(ex*ex + ey*ey);
      if (d < best) best = d;
    }
    return best;
  };
  M.tick = () => {
    if (!window.slithers) return;
    const now = performance.now(), me = window.slither, sample = now - M.lastS >= 100;
    for (const o of slithers) {
      if (!M.uid.has(o)) M.uid.set(o, ++M.n);
      const u = M.uid.get(o);
      let h = M.hist.get(o); if (!h) { h = []; M.hist.set(o, h); }
      if (!o.dead) {
        h.push([now, o.xx, o.yy, o.ang, o.sp, o.sc]); if (h.length > 12) h.shift();
        if (sample) M.smp.push(now, u, o.xx, o.yy, o.ang, o.sp, o.sc, o === me ? 1 : 0);
      } else if (!M.gone.has(o)) {
        M.gone.add(o);
        const near = [];
        for (const q of slithers) {
          if (q === o || q.dead) continue;
          const d = segDist(o.xx, o.yy, body(q)), dh = Math.hypot(q.xx - o.xx, q.yy - o.yy);
          if (d < 500) near.push([M.uid.get(q) || 0, d, dh, q.sc, q.sp, q === me ? 1 : 0, q.ang]);
        }
        M.ev.push({t: now, u, me: o === me, x: o.xx, y: o.yy, ang: o.ang, sp: o.sp, sc: o.sc, hist: h.slice(), near,
                   wall: [window.grd, window.flux_grd], view: me ? [me.xx, me.yy] : null});
      }
    }
    if (sample) M.lastS = now;
  };
  setInterval(M.tick, 16);
  window.__measDrain = () => { const out = {ev: M.ev, smp: M.smp}; M.ev = []; M.smp = []; return out; };
  return true;
}"""

BODY_R = 14.5


def load(paths):
    ev, smp = [], []
    for p in paths:
        d = json.load(gzip.open(p))
        ev += d['ev']; smp += d['smp']
    return ev, np.asarray(smp, float).reshape(-1, 8)


def deaths(ev):
    """One row per observed death with a body nearby: victim r, nearest body owner r, drawn gap."""
    rows = []
    for e in ev:
        if not e['near']:
            continue
        rv = BODY_R*e['sc']
        k = min(e['near'], key=lambda n: n[1]-BODY_R*n[3])
        u, d, dh, sck = k[0], k[1], k[2], k[3]
        rk = BODY_R*sck
        wall_gap = e['wall'][1]-np.hypot(e['x']-e['wall'][0], e['y']-e['wall'][0])
        rows.append(dict(me=e['me'], rv=rv, rk=rk, centre=d, gap=d-rv-rk, head=dh-rv-rk, sp=e['sp'],
                         wall=wall_gap, n_near=len(e['near'])))
    return rows


def speeds(smp):
    """Per snake consecutive samples -> measured px/s, turn deg/s, with sc and the sp field."""
    out = []
    for u in np.unique(smp[:, 1]):
        s = smp[smp[:, 1] == u]
        if len(s) < 3:
            continue
        dt = np.diff(s[:, 0])/1000
        ok = (dt > .05) & (dt < .3)
        v = np.hypot(np.diff(s[:, 2]), np.diff(s[:, 3]))/np.maximum(dt, 1e-3)
        w = np.degrees(np.abs((np.diff(s[:, 4])+np.pi) % (2*np.pi)-np.pi))/np.maximum(dt, 1e-3)
        out.append(np.column_stack((s[1:, 6], s[1:, 5], v, w))[ok])
    return np.vstack(out) if out else np.empty((0, 4))


def main(paths):
    ev, smp = load(paths)
    rows = deaths(ev)
    print(f'{len(ev)} death events, {len(rows)} with a body within 500 px; {len(smp)} motion samples')
    if rows:
        g = np.array([r['gap'] for r in rows]); ratio = np.array([r['rk']/r['rv'] for r in rows])
        print('drawn gap to nearest body at death (px): p10 %.1f  p50 %.1f  p90 %.1f' % tuple(np.percentile(g, [10, 50, 90])))
        for lo, hi in ((0, .8), (.8, 1.25), (1.25, 2), (2, 99)):
            m = (ratio >= lo) & (ratio < hi)
            if m.any():
                print(f'  killer/victim thickness {lo}-{hi}: n {m.sum():3d}  gap p10 {np.percentile(g[m], 10):6.1f}'
                      f'  p50 {np.percentile(g[m], 50):6.1f}  p90 {np.percentile(g[m], 90):6.1f}')
    sp = speeds(smp)
    if len(sp):
        print(f'{len(sp)} speed samples')
        for lo, hi in ((0, .6), (.6, 1), (1, 1.5), (1.5, 2.5), (2.5, 9)):
            m = (sp[:, 0] >= lo) & (sp[:, 0] < hi)
            if m.sum() > 20:
                v, field, w = sp[m, 2], sp[m, 1], sp[m, 3]
                print(f'  sc {lo}-{hi}: n {m.sum():5d}  px/s p50 {np.percentile(v, 50):5.0f}  p95 {np.percentile(v, 95):5.0f}'
                      f'  sp-field p50 {np.percentile(field, 50):5.2f} max {field.max():5.2f}  turn deg/s p95 {np.percentile(w, 95):4.0f}')


if __name__ == '__main__':
    main(sys.argv[1:])
