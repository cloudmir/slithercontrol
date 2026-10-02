"""Deep analysis of the MOD runs (user 2026-09-27: longest survival + fastest food): per game and pooled, from the
whole-game 30 Hz decision logs (slp_k_log.json.gz), black boxes (slp_k_box.json.gz, last 30 s) and deaths.py report.
  python3 research/deep_20260927/analyze.py runs/mod_deaths_20260927_001524 runs/cycle1_wrap_20260927_010623 runs/cycle1_ab_20260927_070646
Out: research/deep_20260927/summary.json (also read by the HTML viz) and a text digest on stdout."""
import gzip, json, re, sys, math
from collections import Counter, defaultdict
from pathlib import Path
import numpy as np

games = []
for rd in map(Path, sys.argv[1:]):
    cats = {}
    rep = rd / "analysis" / "report.txt"
    if rep.exists():
        for m in re.finditer(r'/(slp_\d+)\s+([\d.]+)s L\s*(\d+) (\w+)\s+killer r(\d+) head (\d+)px boostK (\d) remains (\d) boostUs (\d) stuck ([\d.]+)s rev3s (\d+) mode2s (\w+)', rep.read_text()):
            cats[m[1]] = dict(cat=m[4], killer=int(m[5]), killer_head_px=int(m[6]), killer_boost=int(m[7]), remains=int(m[8]), boost_us=int(m[9]), stuck=float(m[10]), rev3s=int(m[11]), mode2s=m[12])
    for rec in sorted(rd.glob('slp_*.json')):
        name = rec.stem
        logf = rec.with_name(name + '_log.json.gz')
        if not logf.exists(): continue
        r = json.load(open(rec)); L = json.load(gzip.open(logf, 'rt'))
        ix = {k: i for i, k in enumerate(L['keys'])}; rows = L['log']
        arm = (rec.with_name(name + '.arm').read_text().strip() if rec.with_name(name + '.arm').exists() else '-')
        t = np.array([x[ix['t']] for x in rows], float); T = t[-1]
        Lv = np.array([x[ix['L']] for x in rows], float)
        boost = np.array([x[ix['boost']] for x in rows], float)
        nsafe = np.array([x[ix['n_safe']] for x in rows], float)
        cov = np.array([x[ix['cov']] or 0 for x in rows], float)
        covfree = np.array([x[ix['cov_free']] if x[ix['cov_free']] is not None else 24 for x in rows], float)
        gapnow = np.array([x[ix['gap_now']] if x[ix['gap_now']] is not None else np.nan for x in rows], float)
        clear = np.array([x[ix['clear']] for x in rows], float)
        threat = np.array([x[ix['threat']] or 0 for x in rows], float)
        encl = np.array([x[ix['enclosed']] or 0 for x in rows], float)
        cmd = np.array([x[ix['cmd']] for x in rows], float)
        esc = np.array([x[ix['esc']] is not None for x in rows])
        modes = [x[ix['mode']] for x in rows]
        dL = np.diff(Lv)
        g = dict(run=rd.name, name=name, arm=arm, seconds=float(r['seconds']), L_max=r['L_max'], ext=r.get('ext'), ticks=len(rows),
                 growth_per_min=float((Lv[-1] - Lv[0]) / T * 60), L_end=int(Lv[-1]),
                 boost_share=float(boost.mean()), L_lost_boost=float(-dL[(dL < 0) & (boost[1:] > 0)].sum()),
                 L_gain=float(dL[dL > 0].sum()), L_lost_boost_per_min=float(-dL[(dL < 0) & (boost[1:] > 0)].sum() / T * 60),
                 mode_share={m: c / len(rows) for m, c in Counter(modes).items()}, esc_share=float(esc.mean()),
                 near5_per_min=0.0, **cats.get(name, {}))
        # near misses (gap_now < 5, re-armed at 10)
        below = False; near = 0
        for v in gapnow:
            if not np.isnan(v) and v < 5 and not below: near += 1; below = True
            elif not np.isnan(v) and v >= 10: below = False
        g['near5_per_min'] = near / T * 60
        # boost share by mode
        g['boost_by_mode'] = {m: float(boost[[k for k, mm in enumerate(modes) if mm == m]].mean()) for m in set(modes)}
        # pre-death indicators (windows before death), sampled per 0.5 s for the viz (last 15 s)
        win = lambda a, b: (t >= T - a) & (t < T - b)
        def share(mask, arr): return float(arr[mask].mean()) if mask.any() else None
        # last tick with n_safe > 0 -> "no-way" lead time
        ok = np.where(nsafe > 0)[0]
        g['noway_lead_s'] = float(T - t[ok[-1]]) if len(ok) else None
        # continuous no-safe streak longest in last 5 s
        # first time cov >= .35 in the final continuous run (cov stays >= .2 until death)
        k = len(rows) - 1
        while k > 0 and cov[k] >= .2: k -= 1
        run_start = k + 1
        first35 = next((j for j in range(run_start, len(rows)) if cov[j] >= .35), None)
        g['wrap_onset_lead_s'] = float(T - t[first35]) if first35 is not None else None
        g['wrap_run_lead_s'] = float(T - t[run_start]) if run_start < len(rows) - 1 else None
        g['cov_at_onset_free'] = int(covfree[first35]) if first35 is not None else None
        # zigzag: command reversals > 90 deg between decisions 0.5 s apart, last 10 s vs whole game, per second
        def rev_rate(mask):
            idx = np.where(mask)[0]
            if len(idx) < 20: return None
            c = cmd[idx]; tt = t[idx]; n = 0
            j0 = 0
            for j in range(len(idx)):
                while tt[j] - tt[j0] > .5: j0 += 1
                d = abs((c[j] - c[j0] + 180) % 360 - 180)
                if d > 90: n += 1
            return n / (tt[-1] - tt[0] + 1e-9) / 15   # ~15 decisions per 0.5 s: reversal share
        g['zigzag_last10'] = rev_rate(win(10, 0)); g['zigzag_base'] = rev_rate(t < T - 15)
        # mode changes per second last 10 s vs base
        def mode_changes(mask):
            ms = [modes[j] for j in np.where(mask)[0]]
            if len(ms) < 20: return None
            return sum(1 for a, b in zip(ms, ms[1:]) if a != b) / ((t[mask][-1] - t[mask][0]) + 1e-9)
        g['modechg_last10'] = mode_changes(win(10, 0)); g['modechg_base'] = mode_changes(t < T - 15)
        g['boost_last5'] = share(win(5, 0), boost); g['boost_5_15'] = share(win(15, 5), boost)
        g['threat_last5'] = share(win(5, 0), threat); g['encl_last5'] = share(win(5, 0), encl)
        g['esc_last10'] = share(win(10, 0), esc.astype(float))
        g['mode_5s_before'] = modes[int(np.searchsorted(t, T - 5))] if T > 5 else None
        g['mode_2s_before'] = modes[int(np.searchsorted(t, T - 2))] if T > 2 else None
        # sampled series (last 15 s, 0.25 s) for the viz
        ts = np.arange(max(0, T - 15), T + 1e-9, .25)
        idxs = np.clip(np.searchsorted(t, ts), 0, len(rows) - 1)
        g['series'] = dict(t=[round(float(T - t[j]), 2) for j in idxs], cov=[float(cov[j]) for j in idxs], n_safe=[int(nsafe[j]) for j in idxs],
                           clear=[float(clear[j]) for j in idxs], gap=[None if np.isnan(gapnow[j]) else float(gapnow[j]) for j in idxs],
                           boost=[int(boost[j]) for j in idxs], mode=[modes[j] for j in idxs], cov_free=[int(covfree[j]) for j in idxs],
                           threat=[float(threat[j]) for j in idxs])
        # black box: nearest other head distance + its speed over last 30 s, and the killer's
        boxf = rec.with_name(name + '_box.json.gz')
        if boxf.exists():
            b = json.load(gzip.open(boxf, 'rt')); fr = b['frames']
            # killer = owner of the body piece nearest our head at the last frame (deaths.py); report's 'r22' is a radius
            lf = fr[-1]; Sg = np.asarray(lf['segs'], float).reshape(-1, 5); sids = [int(v) for v in lf['sid']]
            kid = None
            if len(Sg):
                P0 = np.array([lf['x'], lf['y']]); A = Sg[:, :2]; B = Sg[:, 2:4]; AB = B - A
                tt = np.clip(((P0 - A) * AB).sum(1) / np.maximum((AB * AB).sum(1), 1e-9), 0, 1)
                dd = np.hypot(*(A + tt[:, None] * AB - P0).T) - Sg[:, 4]
                kid = sids[int(dd.argmin())]
            g['killer_id'] = kid
            hd, kd, ksp, bt, nheads = [], [], [], [], []
            for f in fr:
                H = np.asarray(f['heads'], float).reshape(-1, 5); hid = [int(v) for v in f['hid']]
                d = np.hypot(H[:, 0] - f['x'], H[:, 1] - f['y']) if len(H) else np.array([])
                bt.append(f['t']); hd.append(float(d.min()) if len(d) else None); nheads.append(int((d < 500).sum()) if len(d) else 0)
                if kid in hid: j = hid.index(kid); kd.append(float(d[j])); ksp.append(float(H[j, 3]))
                else: kd.append(None); ksp.append(None)
            bt = np.array(bt); Tb = bt[-1]
            g['box'] = dict(t=[round(float(Tb - x), 2) for x in bt][::4], head_d=hd[::4], killer_d=kd[::4], killer_sp=ksp[::4], nheads500=nheads[::4])
            ks = [s for s, tt in zip(ksp, bt) if s is not None and Tb - tt <= 5]
            g['killer_boost_last5'] = float(np.mean([s > 8 for s in ks])) if ks else None
            ks2 = [s for s, tt in zip(ksp, bt) if s is not None and 15 >= Tb - tt > 5]
            g['killer_boost_5_15'] = float(np.mean([s > 8 for s in ks2])) if ks2 else None
            kd5 = [x for x, tt in zip(kd, bt) if x is not None and Tb - tt <= 5]; kd15 = [x for x, tt in zip(kd, bt) if x is not None and 15 >= Tb - tt > 10]
            g['killer_d_min5'] = min(kd5) if kd5 else None; g['killer_d_10_15'] = float(np.median(kd15)) if kd15 else None
            g['nheads500_last5'] = float(np.mean([n for n, tt in zip(nheads, bt) if Tb - tt <= 5]))
        # hazard by L bucket: seconds spent per bucket
        g['L_time'] = {}
        for lo in (0, 500, 1000, 2000, 4000, 8000):
            hi = {0: 500, 500: 1000, 1000: 2000, 2000: 4000, 4000: 8000, 8000: 1e9}[lo]
            m = (Lv >= lo) & (Lv < hi); g['L_time'][str(lo)] = float(m.sum() / 30)
        g['L_death_bucket'] = str(max(lo for lo in (0, 500, 1000, 2000, 4000, 8000) if Lv[-1] >= lo))
        # growth: L/min by L bucket
        g['growth_by_L'] = {}
        for lo in (0, 500, 1000, 2000, 4000, 8000):
            hi = {0: 500, 500: 1000, 1000: 2000, 2000: 4000, 4000: 8000, 8000: 1e9}[lo]
            m = (Lv[1:] >= lo) & (Lv[1:] < hi)
            if m.sum() > 300: g['growth_by_L'][str(lo)] = float(dL[m].sum() / (m.sum() / 30) * 60)
        games.append(g)

# pooled
def med(a): a = [x for x in a if x is not None]; return float(np.median(a)) if a else None
pool = dict(n=len(games), total_min=sum(g['seconds'] for g in games) / 60, survival_median=med([g['seconds'] for g in games]),
            growth_median=med([g['growth_per_min'] for g in games]), cats=dict(Counter(g.get('cat', '?') for g in games)),
            remains=sum(g.get('remains', 0) for g in games), killer_boost=sum(g.get('killer_boost', 0) for g in games),
            boost_us=sum(g.get('boost_us', 0) for g in games),
            noway_lead_median=med([g['noway_lead_s'] for g in games]), wrap_onset_lead_median=med([g['wrap_onset_lead_s'] for g in games]),
            wrap_run_lead_median=med([g['wrap_run_lead_s'] for g in games]),
            zigzag_last10=med([g['zigzag_last10'] for g in games]), zigzag_base=med([g['zigzag_base'] for g in games]),
            modechg_last10=med([g['modechg_last10'] for g in games]), modechg_base=med([g['modechg_base'] for g in games]),
            boost_share=med([g['boost_share'] for g in games]), boost_last5=med([g['boost_last5'] for g in games]), boost_5_15=med([g['boost_5_15'] for g in games]),
            L_lost_boost_per_min=med([g['L_lost_boost_per_min'] for g in games]),
            killer_boost_last5=med([g.get('killer_boost_last5') for g in games]), killer_boost_5_15=med([g.get('killer_boost_5_15') for g in games]),
            killer_d_10_15=med([g.get('killer_d_10_15') for g in games]), nheads500_last5=med([g.get('nheads500_last5') for g in games]),
            mode_5s_before=dict(Counter(g['mode_5s_before'] for g in games)), mode_2s_before=dict(Counter(g['mode_2s_before'] for g in games)))
# hazard by L
Lt = defaultdict(float); Ld = Counter()
for g in games:
    for k, v in g['L_time'].items(): Lt[k] += v
    Ld[g['L_death_bucket']] += 1
pool['hazard_by_L'] = {k: dict(minutes=Lt[k] / 60, deaths=Ld[k], deaths_per_10min=(Ld[k] / (Lt[k] / 60) * 10 if Lt[k] > 0 else None)) for k in sorted(Lt, key=int)}
gb = defaultdict(list)
for g in games:
    for k, v in g['growth_by_L'].items(): gb[k].append(v)
pool['growth_by_L'] = {k: med(v) for k, v in sorted(gb.items(), key=lambda kv: int(kv[0]))}
# mode share pooled (time-weighted) and boost by mode
ms = Counter(); bm = defaultdict(list)
for g in games:
    for m, s in g['mode_share'].items(): ms[m] += s * g['ticks']
    for m, s in g['boost_by_mode'].items(): bm[m].append(s)
tot = sum(ms.values()); pool['mode_share'] = {m: v / tot for m, v in ms.items()}; pool['boost_by_mode'] = {m: med(v) for m, v in bm.items()}
# per arm / run
by = defaultdict(list)
for g in games: by[g['run'] + ':' + g['arm']].append(g)
pool['by_run_arm'] = {k: dict(n=len(v), survival_median=med([g['seconds'] for g in v]), growth_median=med([g['growth_per_min'] for g in v]),
                              deaths_per_10min=len(v) / (sum(g['seconds'] for g in v) / 60) * 10, cats=dict(Counter(g.get('cat', '?') for g in v)),
                              boost_share=med([g['boost_share'] for g in v]), L_max_median=med([g['L_max'] for g in v])) for k, v in by.items()}
out = Path('research/deep_20260927/summary.json'); out.write_text(json.dumps(dict(pool=pool, games=games), ensure_ascii=False))
p = dict(pool); p.pop('by_run_arm')
print(json.dumps(p, ensure_ascii=False, indent=1))
print('by run/arm:'); [print(' ', k, json.dumps(v, ensure_ascii=False)) for k, v in pool['by_run_arm'].items()]
print('\nper game (run name arm sec Lmax cat | noway_lead wrap_onset_lead wrap_run_lead | zig10/base modechg10/base | boost5/5-15 | killerBoost5/5-15 killer_d_10_15 nheads5 | mode5s mode2s remains):')
for g in games:
    f = lambda v, n=1: '-' if v is None else (f'{v:.{n}f}' if isinstance(v, float) else str(v))
    print(f" {g['run'][:12]} {g['name']} {g['arm']} {g['seconds']:.0f}s L{g['L_max']} {g.get('cat','?'):8}| {f(g['noway_lead_s'])} {f(g['wrap_onset_lead_s'])} {f(g['wrap_run_lead_s'])} | {f(g['zigzag_last10'],2)}/{f(g['zigzag_base'],2)} {f(g['modechg_last10'],2)}/{f(g['modechg_base'],2)} | {f(g['boost_last5'],2)}/{f(g['boost_5_15'],2)} | {f(g.get('killer_boost_last5'),2)}/{f(g.get('killer_boost_5_15'),2)} {f(g.get('killer_d_10_15'),0)} {f(g.get('nheads500_last5'),1)} | {g['mode_5s_before']} {g['mode_2s_before']} {g.get('remains','-')}")

# ---- physics check (reproducible): saturated turn rate, cruise speed, command lag, from the black boxes ----
# Turn: frames i where |wrap(cmd-ang)| > 70 deg and the next 8 frames all keep the same sign with |rel| > 50 deg
# (command saturated for ~0.25 s); rate = |wrap(ang[i+7]-ang[i])| / (t[i+7]-t[i]) if 0.2 < dt < 0.35, grouped by sc rounded
# to 0.5. Includes the ~0.1 s command latency inside the window (the same for every sc; sc 1 matches the model).
wrapA = lambda a: (a + np.pi) % (2 * np.pi) - np.pi
turn, lag, spn = defaultdict(list), defaultdict(list), defaultdict(list)
for g in games:
    fr = json.load(gzip.open(Path('runs') / g['run'] / (g['name'] + '_box.json.gz'), 'rt'))['frames']
    t = np.array([f['t'] for f in fr]); ang = np.array([f['ang'] for f in fr]); cmd = np.array([f['cmd'][0] for f in fr])
    sc = np.array([f['sc'] for f in fr]); sp = np.array([f['sp'] for f in fr]); md = np.array([f['boost'] for f in fr]); bst = np.array([f['cmd'][1] for f in fr])
    rel = wrapA(cmd - ang)
    for i in range(len(fr) - 12):
        if abs(rel[i]) > np.radians(70) and all(np.sign(rel[i:i + 8]) == np.sign(rel[i])) and all(abs(rel[i:i + 8]) > np.radians(50)):
            dt = t[i + 7] - t[i]
            if .2 < dt < .35: turn[round(sc[i] * 2) / 2].append(abs(np.degrees(wrapA(ang[i + 7] - ang[i]))) / dt)
        for k in range(1, 9):
            if abs(rel[i]) > np.radians(30): lag[k].append(np.sign(wrapA(ang[i + k] - ang[i])) == np.sign(rel[i]))
        if i > 10 and not md[i] and not bst[i] and not any(md[i - 10:i]): spn[round(sc[i] * 2) / 2].append(sp[i])
model = lambda s: float(np.interp(s, [1, 2, 3.5], [230, 200, 130]))
cruise = lambda s: float(np.interp(s, [1, 1.4, 1.9, 2.6, 3.5], [5.79, 5.89, 6.12, 6.33, 6.83]))
pool['turn_model'] = {str(k): dict(measured=round(float(np.median(v))), n=len(v), model=round(model(k))) for k, v in sorted(turn.items()) if len(v) > 10}
pool['lag_agree'] = {str(k): round(float(np.mean(v)), 2) for k, v in lag.items()}
pool['cruise_model'] = {str(k): dict(measured=round(float(np.median(v)), 2), model=round(cruise(k), 2), n=len(v)) for k, v in sorted(spn.items()) if len(v) > 20}
out.write_text(json.dumps(dict(pool=pool, games=games), ensure_ascii=False))
print('turn model:', pool['turn_model']); print('lag:', pool['lag_agree']); print('cruise:', pool['cruise_model'])
