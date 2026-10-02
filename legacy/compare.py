"""Compare controllers in the sim on held-out seeds, normal and hard settings. Writes runs/compare.json.

  python compare.py --minutes 5 --seeds 4 --workers 4
"""
import argparse, importlib.util, json, os, time
from multiprocessing import Pool
import numpy as np
from sim import make_ctrl, run
from tune import HARD

CTRLS = {
    'planner_v1': dict(params='runs/preview_params.json', brain='research/brain_v1.py'),   # before the v2 rewrite
    'planner_default': dict(),
    'planner_tuned': dict(params='runs/best_params.json'),
    # RL policies were trained on features from the first tuning's params: keep them pinned to that file
    'rl_bc': dict(params='runs/best_params_v2cem.json', model='runs/bc.zip'),
    'rl_ppo': dict(params='runs/best_params_v2cem.json', model='runs/ppo.zip'),
    'rl_ppo_shield': dict(params='runs/best_params_v2cem.json', model='runs/ppo.zip', shield=True),
    'fly': dict(params='runs/best_params.json', fly='runs/fly_params.json'),                 # connectome, wiring fixed
    'fly_shield': dict(params='runs/best_params.json', fly='runs/fly_params.json', shield=True),
    # ablations: is it the connectome or the shield?
    'straight_shield': dict(params='runs/best_params.json', straight=True),                 # no policy, shield only
    'fly_rewired_shield': dict(params='runs/best_params.json', fly='runs/fly_params.json', shield=True, rewire=True),
    'fly_shield_default': dict(fly='runs/fly_params.json', shield=True),                   # same planner params as planner_default
}
SETTINGS = {'normal': dict(), 'hard': HARD}


def job(args):
    name, setting, seed, minutes = args
    import torch
    torch.set_num_threads(1)
    c = CTRLS[name]
    params = json.load(open(c['params'])) if c.get('params') else None
    brain = None
    if c.get('brain'):
        spec = importlib.util.spec_from_file_location('brain_alt', c['brain'])
        brain = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(brain)
    if c.get('straight'):
        import brain as B
        pl = B.Planner(**(params or {}))

        def ctrl(S):
            E = pl.evaluate(S)
            return pl.action_to_cmd(E, pl.shield(E, 0, int(np.argmax(pl.score(E))))), E
        ctrl.pl = pl
    elif c.get('fly'):
        import fly
        ctrl = fly.make_fly(json.load(open(c['fly'])), c.get('shield', False), params, seed=seed, rewire=c.get('rewire', False))
    else:
        ctrl = make_ctrl(params, c.get('model'), c.get('shield', False), **({'brain': brain} if brain else {}))
    r = run(ctrl, minutes, seed=seed, **SETTINGS[setting])
    pl = getattr(ctrl, 'pl', None)
    r['intervention'] = pl.n_int / pl.n_dec if getattr(pl, 'n_dec', 0) else None     # share of shield overrides
    return name, setting, r


def main(a):
    names = [n for n, c in CTRLS.items() if all(os.path.exists(c[k]) for k in ('params', 'model', 'brain', 'fly') if k in c)]
    if a.only:
        names = [n for n in names if n in a.only.split(',')]
    jobs = [(n, s, a.seed0 + i, a.minutes) for n in names for s in SETTINGS for i in range(a.seeds)]
    t0 = time.time()
    with Pool(a.workers) as pool:
        res = pool.map(job, jobs)
    out = {}
    for n, s, r in res:
        o = out.setdefault(n, {}).setdefault(s, dict(minutes=0, deaths=0, kills=0, growth=[], boost=[], causes={}, per_seed_deaths=[], intervention=[]))
        o['minutes'] += r['minutes']
        o['deaths'] += r['deaths']
        o['kills'] += r['kills']
        o['per_seed_deaths'].append(r['deaths'])
        o['boost'].append(r['boost_frac'])
        if r.get('intervention') is not None:
            o['intervention'].append(r['intervention'])
        o['growth'].append(r['growth_per_min'])
        for k, v in r['causes'].items():
            o['causes'][k] = o['causes'].get(k, 0) + v
    for n in out:
        for s, o in out[n].items():
            o['deaths_per_10min'] = o['deaths'] / o['minutes'] * 10
            o['kills_per_10min'] = o['kills'] / o['minutes'] * 10
            o['growth_per_min'] = float(np.mean(o.pop('growth')))
            o['boost_frac'] = float(np.mean(o.pop('boost')))
            iv = o.pop('intervention')
            o['shield_intervention'] = float(np.mean(iv)) if iv else None
            print(f"{n:16s} {s:6s} deaths/10min {o['deaths_per_10min']:5.2f} ({o['deaths']} in {o['minutes']:.0f} min)  "
                  f"kills/10min {o['kills_per_10min']:5.2f}  growth/min {o['growth_per_min']:6.0f}  boost {o['boost_frac']:.0%}  causes {o['causes']}")
    json.dump(dict(at=time.strftime('%F %T'), minutes_per_seed=a.minutes, seeds=a.seeds, seed0=a.seed0, results=out),
              open(a.out, 'w'), indent=1)
    print(f'{time.time() - t0:.0f}s, wrote {a.out}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--minutes', type=float, default=5)
    ap.add_argument('--seeds', type=int, default=4)
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--only', help='comma-separated controller names')
    ap.add_argument('--out', default='runs/compare.json')
    ap.add_argument('--seed0', type=int, default=10_000, help='first held-out seed')
    main(ap.parse_args())
