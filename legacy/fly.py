"""Fruit-fly connectome controller: a MaleCNS v1.0 visuomotor subcircuit with fixed wiring (LIF neurons)
drives the snake from the same senses the planner uses. Only the input gains and the motor readout are tuned.

  python fly.py build            # extract the subcircuit from data/*.feather -> data/fly_circuit.npz
  python fly.py test             # food / threat on the left and right -> descending-neuron spikes
  python fly.py tune --gens 4    # CEM on input gains + readout (wiring fixed) -> runs/fly_params.json

Data: Male CNS Connectome Project v1.0 (FlyEM / HHMI Janelia, Univ. Cambridge, MRC LMB, Google Research), CC BY 4.0.
LIF parameters: Shiu et al., Nature 2024. Circuit choice and hex->azimuth approximation follow bugrax/flybrain-snake (MIT).
"""
import argparse, json, time
from multiprocessing import Pool
import numpy as np
import brain as B

DATA = 'data/'
FOOD, LOOM, EXTRA = ['LC10a'], ['LC4', 'LPLC2'], ['LC6', 'LC16', 'LC11']
STEER, ESCAPE, GF = ['DNa01', 'DNa02', 'DNa03', 'DNa13', 'DNa15'], ['DNp02', 'DNp03', 'DNp04', 'DNp11'], ['DNp01']
SIGN = {'acetylcholine': 1, 'dopamine': 1, 'octopamine': 1, 'serotonin': 1, 'gaba': -1, 'glutamate': -1, 'histamine': -1}
W_SYN = 0.275            # mV per synapse (Shiu et al. 2024)


def build(min_hop=20, min_edge=5):
    import pandas as pd, pyarrow as pa, pyarrow.ipc as ipc, pyarrow.compute as pc
    ann = pd.read_feather(DATA + 'body-annotations-male-cns-v1.0-minconf-0.5.feather',
                          columns=['bodyId', 'type', 'somaSide', 'assignedOlHex1', 'assignedOlHex2', 'somaLocation'])
    ann['type'] = ann['type'].astype(str)
    seeds = ann[ann['type'].isin(FOOD + LOOM + EXTRA)]
    readout = ann[ann['type'].isin(STEER + ESCAPE + GF)]
    hexed = ann[ann['assignedOlHex1'].notna()].set_index('bodyId')[['assignedOlHex1', 'assignedOlHex2']]
    seed_set, hex_set = pa.array(seeds['bodyId'].values), pa.array(hexed.index.values)
    reader = ipc.open_file(pa.memory_map(DATA + 'connectome-weights-male-cns-v1.0-minconf-0.5.feather'))

    def scan(mask_fn):
        out = []
        for i in range(reader.num_record_batches):
            b = reader.get_batch(i)
            m = mask_fn(b.column(0), b.column(1), b.column(2))
            if pc.any(m).as_py():
                out.append(b.filter(m).to_pandas())
        return pd.concat(out) if out else pd.DataFrame(columns=['body_pre', 'body_post', 'weight'])

    t0 = time.time()
    e1 = scan(lambda pre, post, w: pc.or_(pc.is_in(pre, seed_set), pc.and_(pc.is_in(post, seed_set), pc.is_in(pre, hex_set))))
    out_of_seeds = e1[e1.body_pre.isin(seeds.bodyId)]
    hop = out_of_seeds.groupby('body_post').weight.sum()
    nodes = np.unique(np.concatenate([seeds.bodyId.values, readout.bodyId.values, hop[hop >= min_hop].index.values]))
    print(f'pass 1 {time.time() - t0:.0f}s: {len(nodes)} neurons', flush=True)
    node_set = pa.array(nodes)
    e2 = scan(lambda pre, post, w: pc.and_(pc.and_(pc.is_in(pre, node_set), pc.is_in(post, node_set)), pc.greater_equal(w, min_edge)))
    print(f'pass 2 {time.time() - t0:.0f}s: {len(e2)} connections, {e2.weight.sum()} synapses', flush=True)

    nt = pd.read_feather(DATA + 'body-neurotransmitters-male-cns-v1.0.feather', columns=['body', 'consensus_nt', 'predicted_nt'])
    nt = nt[nt.body.isin(nodes)].set_index('body')
    name = nt['consensus_nt'].fillna(nt['predicted_nt']).reindex(nodes).fillna('unknown').astype(str).str.lower()
    sign = name.map(lambda s: SIGN.get(s, 1)).values                      # unknown treated as excitatory
    idx = {b: i for i, b in enumerate(nodes)}
    pre_i, post_i = e2.body_pre.map(idx).values, e2.body_post.map(idx).values
    info = ann.set_index('bodyId').reindex(nodes)

    # receptive field of each seed LC: synapse-weighted hex position of its columnar inputs
    col = e1[e1.body_post.isin(seeds.bodyId) & e1.body_pre.isin(hexed.index)]
    col = col.join(hexed, on='body_pre')
    rf = col.groupby('body_post').apply(lambda d: pd.Series({
        'h1': np.average(d.assignedOlHex1, weights=d.weight), 'h2': np.average(d.assignedOlHex2, weights=d.weight)}))
    rf = rf.reindex(nodes)
    soma = np.array([s if isinstance(s, np.ndarray) else [np.nan] * 3 for s in info['somaLocation']], float)
    np.savez_compressed(DATA + 'fly_circuit.npz', body=nodes, type=info['type'].astype(str).values,
                        side=info['somaSide'].astype(str).values, nt=name.values, sign=sign,
                        pre=pre_i, post=post_i, count=e2.weight.values, rf_h1=rf['h1'].values, rf_h2=rf['h2'].values, soma=soma)
    print(f'saved data/fly_circuit.npz ({time.time() - t0:.0f}s)')


def azimuth(h1, h2, side):
    """Approximate hex column -> azimuth (deg, + = right eye / right turn). 5.1 deg inter-ommatidial angle."""
    az = np.abs(h1 - h2) * 5.1 * 0.87 + 5
    return np.where(side == 'L', -az, az)


class Circuit:
    """LIF network (Shiu et al. 2024): v_rest=v_reset=-52 mV, v_th=-45 mV, tau_m=20 ms, tau_syn=5 ms, refractory 2.2 ms,
    delay 1.8 ms, 0.275 mV/synapse; plus spike-frequency adaptation (1 mV/spike, 150 ms) to stop reverberation."""

    def __init__(self, path=DATA + 'fly_circuit.npz', seed=0, rewire=False):
        from scipy import sparse
        d = np.load(path, allow_pickle=True)
        self.type, self.side, n = d['type'], d['side'], len(d['body'])
        self.soma = d['soma'] if 'soma' in d else np.full((n, 3), np.nan)        # for the viewer's brain map
        pre = d['pre']
        if rewire:                                     # control: same synapse counts, presynaptic partners shuffled
            pre = np.random.default_rng(1234).permutation(pre)
        w = d['count'] * W_SYN * d['sign'][pre]
        self.W = sparse.csr_matrix((w, (d['post'], pre)), shape=(n, n))
        self.n, self.rng = n, np.random.default_rng(seed)
        az = azimuth(d['rf_h1'], d['rf_h2'], self.side)
        self.food = np.flatnonzero(np.isin(self.type, FOOD) & np.isfinite(az))
        self.loom = np.flatnonzero(np.isin(self.type, LOOM) & np.isfinite(az))
        self.az_food, self.az_loom = np.radians(az[self.food]), np.radians(az[self.loom])
        grp = lambda types, s: np.flatnonzero(np.isin(self.type, types) & (self.side == s))
        self.out = {k: (grp(t, 'L'), grp(t, 'R')) for k, t in (('steer', STEER), ('escape', ESCAPE), ('gf', GF))}
        self.reset()

    def reset(self):
        self.v = np.full(self.n, -52.0)
        self.g = np.zeros(self.n)
        self.a = np.zeros(self.n)
        self.ref = np.zeros(self.n)
        self.q = [np.zeros(self.n, bool), np.zeros(self.n, bool)]     # 2-step (~1.8 ms) synaptic delay

    def run(self, rate, w_in, ms):
        """Simulate `ms` 1-ms steps with Poisson input `rate` (Hz per neuron); return spike counts per neuron."""
        counts = np.zeros(self.n)
        ds, dm, da = np.exp(-1 / 5), 1 / 20, np.exp(-1 / 150)
        for _ in range(int(ms)):
            s = self.q.pop(0)
            self.g = self.g * ds + (self.W @ s if s.any() else 0) + w_in * (self.rng.random(self.n) < rate * 1e-3)
            live = self.ref <= 0
            self.v = np.where(live, self.v + dm * (-52.0 - self.v + self.g - self.a), self.v)
            spk = live & (self.v > -45.0)
            self.v[spk], self.ref[spk] = -52.0, 2.2
            self.ref -= 1
            self.a = self.a * da + spk
            self.q.append(spk)
            counts += spk
        return counts


FLY_SPACE = dict(rate_food=(0, 300), rate_loom=(0, 300), w_in=(2, 20), sigma=(0.15, 1.2), open_w=(0, 2),
                 k_steer=(0, 3), k_esc=(0, 3), thr_gf=(1, 20), thr_esc=(1, 40))
FLY_DEF = dict(rate_food=200, rate_loom=200, w_in=10.0, sigma=0.45, open_w=0.7, k_steer=1.2, k_esc=1.5, thr_gf=4, thr_esc=12)


def senses(E, pl, p):
    """Per-heading food attraction and threat (same evaluation the planner uses), sampled at each LC's azimuth."""
    K = int(pl.p['K'])
    rel = pl.rel[:K]
    threat = np.maximum(1 - np.minimum(E['tc'][:K], E['horizon']) / E['horizon'], p['open_w'] * (1 - E['open']))
    return rel, E['far'], np.clip(threat, 0, 1)


def make_fly(params=None, shield=False, planner_params=None, window_ms=66, seed=0, rewire=False):
    p = {**FLY_DEF, **(params or {})}
    pl = B.Planner(**(planner_params or {}))
    c = Circuit(seed=seed, rewire=rewire)
    K = int(pl.p['K'])

    def field(rel, prof, az):
        lim = np.radians(85)                          # RFs span ~5..85 deg; more lateral stimuli hit the outermost RFs
        d = B.wrap(np.clip(rel[None, :], -lim, lim) - az[:, None])
        return (prof[None, :] * np.exp(-d ** 2 / (2 * p['sigma'] ** 2))).max(1)

    def ctrl(S):
        E = pl.evaluate(S)
        rel, food, threat = senses(E, pl, p)
        rate = np.zeros(c.n)
        rate[c.food] = p['rate_food'] * field(rel, food, c.az_food)
        rate[c.loom] = p['rate_loom'] * field(rel, threat, c.az_loom)
        n = c.run(rate, p['w_in'], window_ms)
        (sl, sr), (el, er), (gl, gr) = [(n[a].sum(), n[b].sum()) for a, b in c.out.values()]
        turn = p['k_steer'] * (sr - sl) / (sr + sl + 3) - p['k_esc'] * (er - el) / (er + el + 3)
        scale = window_ms / 66                          # thresholds were tuned on 66 ms windows
        boost = gl + gr >= p['thr_gf'] * scale or el + er >= p['thr_esc'] * scale
        a = int(np.argmin(np.abs(B.wrap(pl.rel[:K] - np.clip(turn, -np.pi, np.pi))))) + K * boost
        if shield:
            a = pl.shield(E, a, int(np.argmax(pl.score(E))))
        ctrl.act = 0.6 * ctrl.act + n                  # smoothed spikes per neuron, for the viewer
        ctrl.last = dict(steer=(sl, sr), escape=(el, er), gf=(gl, gr), turn=float(turn), boost=bool(boost), rate=rate)
        return pl.action_to_cmd(E, a), E
    ctrl.pl, ctrl.circuit, ctrl.act, ctrl.last = pl, c, np.zeros(c.n), None
    return ctrl


def test():
    """Propagation check: a food item or a looming threat on one side -> which descending neurons fire."""
    ctrl = make_fly()
    base = dict(x=0, y=0, ang=0.0, tgt=0.0, sp=5.8, sc=1.0, L=50, boost=False, wall=(0, 0, 9000),
                heads=np.zeros((0, 5)), segs=np.zeros((0, 5)), food=np.zeros((0, 3)))
    cases = {'food right': dict(food=np.array([[300, 300, 10.0]])), 'food left': dict(food=np.array([[300, -300, 10.0]])),
             'threat right': dict(heads=np.array([[250, 150, np.pi * 1.15, 12, 1.5]])),
             'threat left': dict(heads=np.array([[250, -150, -np.pi * 1.15, 12, 1.5]]))}
    for name, extra in cases.items():
        t = time.time()
        cmd, E = ctrl(dict(base, **extra))
        print(f'{name:13s} turn {np.degrees(B.wrap(cmd[0])):+6.0f} deg boost {cmd[1]!s:5s} {ctrl.last} {1000 * (time.time() - t):.0f} ms')


def planner_params():
    import os
    return json.load(open('runs/best_params.json')) if os.path.exists('runs/best_params.json') else None


def _job(args):
    params, seed, minutes = args
    from sim import run
    from tune import HARD
    return run(make_fly(params, planner_params=planner_params(), seed=seed), minutes, seed=seed, **HARD)


def tune(a):
    """CEM with the same development seeds every generation, then a pick on separate validation seeds."""
    from tune import fitness
    names = list(FLY_SPACE)
    lo, hi = (np.array([FLY_SPACE[k][i] for k in names]) for i in (0, 1))
    decode = lambda z: {k: float(v) for k, v in zip(names, lo + np.clip(z, 0, 1) * (hi - lo))}
    rng = np.random.default_rng(a.seed)
    dev = [int(s) for s in rng.integers(1 << 30, size=a.seeds)]
    val = [int(s) for s in rng.integers(1 << 30, size=a.val_seeds)]
    mu, sd = (np.array([FLY_DEF[k] for k in names]) - lo) / (hi - lo), np.full(len(names), 0.25)
    seen = []
    with Pool(a.workers) as pool:
        for gen in range(a.gens):
            t0 = time.time()
            Z = [mu.copy()] + [mu + sd * rng.normal(size=len(mu)) for _ in range(a.pop)]
            res = pool.map(_job, [(decode(z), s, a.minutes) for z in Z for s in dev])
            fit = [fitness(res[i * a.seeds:(i + 1) * a.seeds]) for i in range(len(Z))]
            with open('runs/fly_tune.jsonl', 'a') as f:
                for z, (fv, d, g, k) in zip(Z, fit):
                    f.write(json.dumps(dict(gen=gen, fit=fv, deaths_per_10min=d, growth_per_min=g, kills_per_10min=k, params=decode(z))) + '\n')
            seen += [(fit[i][0], decode(Z[i])) for i in range(len(Z))]
            order = np.argsort([-x[0] for x in fit])
            elite = np.array([np.clip(Z[i], 0, 1) for i in order[:max(2, len(Z) // 4)]])
            mu, sd = 0.3 * mu + 0.7 * elite.mean(0), np.maximum(0.05, 0.3 * sd + 0.7 * elite.std(0))
            print(f'gen {gen}: mean deaths/10min {fit[0][1]:.2f} | best deaths/10min {fit[order[0]][1]:.2f} '
                  f'kills/10min {fit[order[0]][3]:.2f} | {time.time() - t0:.0f}s', flush=True)
        seen.sort(key=lambda x: -x[0])
        cands = [('defaults', dict(FLY_DEF)), ('cem_mean', decode(mu))] + [(f'top{j}', p) for j, (_, p) in enumerate(seen[:4])]
        res = pool.map(_job, [(p, s, a.minutes) for _, p in cands for s in val])
    table = []
    for j, (name, p) in enumerate(cands):
        fv, d, g, k = fitness(res[j * a.val_seeds:(j + 1) * a.val_seeds])
        table.append(dict(name=name, fit=fv, deaths_per_10min=d, growth_per_min=g, kills_per_10min=k, params=p))
        print(f'validation {name:9s} deaths/10min {d:.2f} growth {g:.0f}', flush=True)
    json.dump(table, open('runs/fly_tune_validation.json', 'w'), indent=1)
    best = max(table, key=lambda r: r['fit'])
    json.dump(best['params'], open('runs/fly_params.json', 'w'), indent=1)
    print(f"wrote runs/fly_params.json ({best['name']})")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['build', 'test', 'tune'])
    ap.add_argument('--gens', type=int, default=4)
    ap.add_argument('--pop', type=int, default=10)
    ap.add_argument('--minutes', type=float, default=3)
    ap.add_argument('--seeds', type=int, default=3)
    ap.add_argument('--val-seeds', type=int, default=8)
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--seed', type=int, default=0)
    a = ap.parse_args()
    {'build': lambda: build(), 'test': test, 'tune': lambda: tune(a)}[a.cmd]()
