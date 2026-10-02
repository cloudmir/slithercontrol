"""Cross-entropy tuning of planner weights in the sim: survival first, growth second (see fitness). Every generation uses the same development
seeds (paired comparisons); the final pick is made on separate validation seeds among defaults, the CEM mean
and the best individuals.

  python tune.py --gens 6 --pop 10 --minutes 4 --seeds 3 --workers 3
Writes runs/tune.jsonl (every evaluation) and runs/best_params.json.
"""
import argparse, json, time
from multiprocessing import Pool
import numpy as np
import brain as B
from sim import make_ctrl, run

SPACE = dict(buffer=(0, 20), margin=(0, 40), head_k=(0.0, 0.3), H=(1.0, 2.4), lat=(0.08, 0.25), w_risk=(0, 3), w_clear=(0, 3),
             clear_scale=(50, 300), w_open=(0, 3), w_future=(0, 3), w_escape=(0, 5), w_food=(0, 2), w_far=(0, 1.5),
             w_kill=(0, 4), w_turn=(0, 0.6), boost_cost=(0, 2))
HARD = dict(n_bots=55, hunters=0.45, delay=3, crowd=0.5)   # crowds, cutters and encirclers
names = list(SPACE)
lo, hi = np.array([SPACE[k][0] for k in names]), np.array([SPACE[k][1] for k in names])


def decode(z):
    return {k: float(v) for k, v in zip(names, lo + np.clip(z, 0, 1) * (hi - lo))}


def encode(p):
    return (np.array([p[k] for k in names]) - lo) / (hi - lo)


def job(args):
    params, seed, minutes = args
    return run(make_ctrl(params), minutes, seed=seed, **HARD)


GROWTH_W = 0.03     # survival first, length second: 1000 growth/min is worth 0.3 deaths per 10 min; kills not rewarded


def fitness(rs):
    """deaths per 10 min dominate; growth (length gained per minute) is the secondary goal"""
    d = np.mean([r['deaths'] / r['minutes'] * 10 for r in rs])
    k = np.mean([r['kills'] / r['minutes'] * 10 for r in rs])
    g = np.mean([r['growth_per_min'] for r in rs])
    return -d + GROWTH_W * g / 100, d, g, k


def main(a):
    rng = np.random.default_rng(a.seed)
    dev = [int(s) for s in rng.integers(1 << 30, size=a.seeds)]            # same seeds every generation
    val = [int(s) for s in rng.integers(1 << 30, size=a.val_seeds)]        # only for the final pick
    mu, sd = encode(B.DEF), np.full(len(names), 0.25)
    seen = []
    with Pool(a.workers) as pool:
        for gen in range(a.gens):
            t0 = time.time()
            Z = [mu.copy()] + [mu + sd * rng.normal(size=len(mu)) for _ in range(a.pop)]
            P = [decode(z) for z in Z]
            res = pool.map(job, [(p, s, a.minutes) for p in P for s in dev])
            fit = [fitness(res[i * a.seeds:(i + 1) * a.seeds]) for i in range(len(P))]
            with open('runs/tune.jsonl', 'a') as f:
                for i, (p, (fv, d, g, k)) in enumerate(zip(P, fit)):
                    f.write(json.dumps(dict(gen=gen, mean=i == 0, fit=fv, deaths_per_10min=d, growth_per_min=g, kills_per_10min=k, params=p)) + '\n')
            seen += [(fit[i][0], P[i]) for i in range(len(P))]
            order = np.argsort([-x[0] for x in fit])
            elite = np.array([np.clip(Z[i], 0, 1) for i in order[:max(2, len(Z) // 4)]])
            mu = 0.3 * mu + 0.7 * elite.mean(0)
            sd = np.maximum(0.05, 0.3 * sd + 0.7 * elite.std(0))
            i = order[0]
            print(f'gen {gen}: mean-candidate deaths/10min {fit[0][1]:.2f} | best deaths/10min {fit[i][1]:.2f} '
                  f'kills/10min {fit[i][3]:.2f} | {time.time() - t0:.0f}s', flush=True)
        # final pick on fresh validation seeds
        seen.sort(key=lambda x: -x[0])
        top = []
        for _, p in seen:                                  # distinct top individuals only
            if all(any(abs(p[k] - q[k]) > 1e-6 for k in names) for q in top):
                top.append(p)
            if len(top) == 4:
                break
        cands = [('defaults', {k: B.DEF[k] for k in names}), ('cem_mean', decode(mu))] + [(f'top{j}', p) for j, p in enumerate(top)]
        res = pool.map(job, [(p, s, a.minutes) for _, p in cands for s in val])
        table = []
        for j, (name, p) in enumerate(cands):
            fv, d, g, k = fitness(res[j * a.val_seeds:(j + 1) * a.val_seeds])
            table.append(dict(name=name, fit=fv, deaths_per_10min=d, kills_per_10min=k, growth_per_min=g, params=p))
            print(f'validation {name:9s} deaths/10min {d:.2f} kills/10min {k:.2f} growth {g:.0f}', flush=True)
    json.dump(table, open('runs/tune_validation.json', 'w'), indent=1)
    best = max(table, key=lambda r: r['fit'])
    json.dump(best['params'], open('runs/best_params.json', 'w'), indent=1)
    print(f"wrote runs/best_params.json ({best['name']}, validation deaths/10min {best['deaths_per_10min']:.2f})")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--gens', type=int, default=6)
    ap.add_argument('--pop', type=int, default=10)
    ap.add_argument('--minutes', type=float, default=4)
    ap.add_argument('--seeds', type=int, default=6)
    ap.add_argument('--val-seeds', type=int, default=8)
    ap.add_argument('--workers', type=int, default=3)
    ap.add_argument('--seed', type=int, default=0)
    main(ap.parse_args())
