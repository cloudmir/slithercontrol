"""Why does the agent die? Replays the hard sim and classifies every death from what the planner knew:
spawn (<3 s alive) / trapped (no hard-safe option in the last 4 decisions) / mispredicted (the command actually
executing at impact - commands land `delay` steps late - was predicted safe) / unsafe_choice (it was not, although
a safe option existed at that decision).

  python deaths.py --ctrl planner_default,planner_tuned,fly_shield --seeds 8 --minutes 3
"""
import argparse, collections, json
from multiprocessing import Pool
import numpy as np
import brain as B, sim
from tune import HARD


def make(name, seed):
    params = json.load(open('runs/best_params.json'))
    if name.startswith('fly'):
        import fly
        return fly.make_fly(json.load(open('runs/fly_params.json')), 'shield' in name, params, seed=seed)
    return sim.make_ctrl(None if name == 'planner_default' else params)


def job(args):
    name, seed, minutes = args
    ctrl, w = make(name, seed), sim.World(seed=seed, **HARD)
    hist, out, t_life, cmd = collections.deque(maxlen=10), [], 0.0, None
    for k in range(int(minutes * 60 / sim.DT)):
        if k % 2 == 0:
            S = w.state()
            cmd, E = ctrl(S)
            pl = ctrl.pl
            a = int(np.argmin(np.abs(B.wrap(pl.rel - (cmd[0] - E['base']))) + 10 * (pl.bst != cmd[1])))
            hist.append((k, bool((E['tc'] > E['horizon']).any()), bool(E['tc'][a] > E['horizon'])))
        w.step(cmd)
        t_life += sim.DT
        if not w.snakes[0]['alive']:
            active = [h for h in hist if h[0] <= k - w.delay] or list(hist)[:1]     # command executing at impact
            kind = ('spawn' if t_life < 3 else 'trapped' if not any(h[1] for h in list(hist)[-4:])
                    else 'mispredicted' if active[-1][2] else 'unsafe_choice')
            out.append(dict(t=round(t_life, 1), kind=kind, cause=w.snakes[0]['cause']))
            w.respawn_agent()
            t_life, cmd = 0.0, None
            hist.clear()
    return name, out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--ctrl', default='planner_default,fly_shield')
    ap.add_argument('--seeds', type=int, default=8)
    ap.add_argument('--minutes', type=float, default=3)
    ap.add_argument('--workers', type=int, default=4)
    a = ap.parse_args()
    jobs = [(n, 30_000 + i, a.minutes) for n in a.ctrl.split(',') for i in range(a.seeds)]
    with Pool(a.workers) as pool:
        res = pool.map(job, jobs)
    report = {}
    for n, deaths in res:
        report.setdefault(n, []).extend(deaths)
    for n, d in report.items():
        print(f'{n}: {len(d)} deaths in {a.seeds * a.minutes:.0f} min | kinds {dict(collections.Counter(x["kind"] for x in d))} '
              f'| killers {dict(collections.Counter(x["cause"] for x in d))} | median life {np.median([x["t"] for x in d]) if d else 0:.0f}s')
    json.dump(report, open('runs/deaths.json', 'w'), indent=1)
