"""Frozen, first-life stage comparison. Local simulator only, no auto-respawn.

Results are append-only. Evaluation subprocesses run from a source snapshot;
subsequent development cannot change an experiment already in progress.
"""
import argparse
from collections import Counter, deque
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict
import hashlib
import json
import os
import pickle
from pathlib import Path
import subprocess
import sys
import time
import numpy as np
from activity import ActivityRules, ActivityMonitor, measure
from evaluate_active import SETTINGS, independent_danger, summarize
from staged import Config, make_controller, observe
from sim_active import World, DT

FILES = ['staged.py','staged_reference.py','evaluate_staged.py','sim_active.py','brain.py','geometry.py',
         'activity.py','evaluate_active.py','active.py']


def write_json(path, value):
    path = Path(path)
    temporary = path.with_name(path.name+'.tmp')
    temporary.write_text(json.dumps(value, indent=2))
    temporary.replace(path)


def episode(job):
    name, setting, seed, seconds, out, config = job
    started = time.monotonic()
    result = dict(controller=name, setting=setting, seed=seed, valid=False,
                  requested_seconds=seconds)
    try:
        w = World(seed=seed, L0=100, **SETTINGS[setting])
        if name == 'active':
            from active import ActiveController
            ctrl = ActiveController()
        else:
            ctrl = make_controller(name, config)
        mon = ActivityMonitor()
        timing, samples = [], []
        modes = Counter(); tail = deque(maxlen=60)
        boost = 0.; cmd = None; E = None
        key=f'{name}_{setting}_{seed}'
        checkpoint=Path(out)/(key+'.checkpoint.pkl')
        k_start=0
        if checkpoint.exists():
            # Only snapshots produced in this experiment's local directory.
            with checkpoint.open('rb') as handle: saved=pickle.load(handle)
            w,ctrl,mon,timing,samples,modes,tail,boost,cmd,E,k_start=saved
        for k in range(k_start,round(seconds/DT)):
            if k % 2 == 0:
                s = observe(w)
                t = time.perf_counter(); cmd, E = ctrl(s); timing.append(time.perf_counter()-t)
                m = measure(s); active = bool(m['active'][0]); danger = independent_danger(s)
                modes[ctrl.last.get('mode', 'unknown')] += 1
                # Half-second traces bound I/O while preserving visible geometry.
                if k % 16 == 0:
                    tail.append(dict(t=w.t, state={key:(value.tolist() if isinstance(value,np.ndarray) else value)
                        for key,value in s.items()}, cmd=cmd, status=ctrl.last.copy()))
            w.step(cmd)
            mon.update(w.t, DT, active, danger)
            a = w.snakes[0]
            boost += DT*bool(a['boost'] and a['sp']>10)
            if k % 300 == 0:
                samples.append(dict(t=w.t, L=a['L'], active=active, heads=int(m['heads'][0])))
            if (k+1)%600==0:
                tmp=checkpoint.with_suffix('.tmp')
                with tmp.open('wb') as handle:
                    pickle.dump((w,ctrl,mon,timing,samples,modes,tail,boost,cmd,E,k+1),handle)
                tmp.replace(checkpoint)
                write_json(Path(out)/(key+'.status.json'),dict(seconds=w.t,length=a['L'],mode=ctrl.last.get('mode'),updated=time.time()))
            if not a['alive']: break
        population = 1-w.spawn_wait_s/max(w.t*w.target_bots, 1e-9)
        valid = population>=.99 and w.min_live_bots>=.9*w.target_bots
        activity = mon.result()
        result.update(valid=bool(valid), seconds=w.t, alive=bool(a['alive']), **activity,
            success=bool(valid and a['alive'] and activity['activity_ok']),
            L_start=100., L_end=a['L'], gain=a['L']-100.,
            boost_fraction=boost/max(w.t, 1e-9), population_fraction=population,
            min_live_bots=w.min_live_bots, cause=a.get('cause'), modes=dict(modes),
            decision_ms_p50=float(np.percentile(timing, 50)*1000),
            decision_ms_p95=float(np.percentile(timing, 95)*1000),
            decision_over_66ms=float(np.mean(np.array(timing)>2*DT)), samples=samples)
        trace = Path(out)/f'{name}_{setting}_{seed}_trace.json'
        write_json(trace,dict(result=result, tail=list(tail)))
        result['trace'] = str(trace)
    except Exception as exc:
        result.update(error=repr(exc))
    result['wall_seconds'] = time.monotonic()-started
    write_json(Path(out)/f'{name}_{setting}_{seed}.json',result)
    return result


def main(a):
    out = Path(a.out).resolve()
    if not a.frozen:
        out.mkdir(parents=True, exist_ok=False)
        snapshot = out/'sources'; snapshot.mkdir()
        hashes = {}
        for f in FILES:
            data = Path(__file__).with_name(f).read_bytes()
            (snapshot/f).write_bytes(data); hashes[f] = hashlib.sha256(data).hexdigest()
        config = asdict(Config()); config.pop('stage')
        plan = dict(created=time.strftime('%FT%T%z'), args=vars(a), config=config,
                    source_hashes=hashes, rules=ActivityRules().to_dict(), settings=SETTINGS,
                    decision_interval=2*DT, initial_length=100,
                    first_life=True, note='Finite local sample, not live-site certification.')
        (out/'manifest.json').write_text(json.dumps(plan, indent=2))
        command = [sys.executable, str(snapshot/'evaluate_staged.py'), '--frozen',
            '--out', str(out), '--controllers', a.controllers, '--settings', a.settings,
            '--seed0', str(a.seed0), '--seeds', str(a.seeds), '--seconds', str(a.seconds),
            '--workers', str(a.workers)]
        return subprocess.call(command, cwd=snapshot)
    plan = json.loads((out/'manifest.json').read_text())
    for key in ('controllers','settings','seed0','seeds','seconds'):
        if getattr(a,key) != plan['args'][key]:
            raise ValueError(f'resume configuration differs: {key}')
    for filename, expected in plan['source_hashes'].items():
        actual=hashlib.sha256(Path(__file__).with_name(filename).read_bytes()).hexdigest()
        if actual != expected:
            raise ValueError(f'frozen source changed: {filename}')
    jobs = [(n, setting, a.seed0+i, a.seconds, str(out), plan['config'])
            for n in a.controllers.split(',') for setting in a.settings.split(',') for i in range(a.seeds)]
    results = []
    remaining=[]
    for job in jobs:
        p=out/f'{job[0]}_{job[1]}_{job[2]}.json'
        if p.exists(): results.append(json.loads(p.read_text()))
        else: remaining.append(job)
    with ProcessPoolExecutor(max_workers=a.workers) as pool, (out/'progress.jsonl').open('a') as log:
        for future in as_completed([pool.submit(episode, j) for j in remaining]):
            r = future.result(); results.append(r)
            log.write(json.dumps(r)+'\n'); log.flush()
            print(f"{r['controller']} {r['setting']} seed={r['seed']} valid={r['valid']} "
                  f"t={r.get('seconds',0):.1f} alive={r.get('alive')} activity={r.get('activity_ok')} "
                  f"gain={r.get('gain',0):.0f} ms={r.get('decision_ms_p95',0):.1f} {r.get('error','')}", flush=True)
            report = dict(planned=len(jobs), completed=len(results), complete=len(jobs)==len(results),
                          results=results, summary=summarize(results))
            temp = out/'summary.tmp'; temp.write_text(json.dumps(report, indent=2)); temp.replace(out/'summary.json')
    report = dict(planned=len(jobs), completed=len(results), complete=len(jobs)==len(results),
                  results=results, summary=summarize(results))
    temp = out/'summary.tmp'; temp.write_text(json.dumps(report, indent=2)); temp.replace(out/'summary.json')
    return 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--controllers', default='gap,predict,coil')
    ap.add_argument('--settings', default='normal')
    ap.add_argument('--seeds', type=int, default=3)
    ap.add_argument('--seed0', type=int, default=61000)
    ap.add_argument('--seconds', type=float, default=180)
    ap.add_argument('--workers', type=int, default=3)
    ap.add_argument('--out', required=True)
    ap.add_argument('--frozen', action='store_true', help=argparse.SUPPRESS)
    a = ap.parse_args()
    if set(a.controllers.split(','))-{'gap','predict','circle','circle_v0','coil','active'}: ap.error('unknown controller')
    if set(a.settings.split(','))-SETTINGS.keys(): ap.error('unknown setting')
    if min(a.seeds, a.seconds, a.workers)<1: ap.error('positive seeds, seconds and workers required')
    sys.exit(main(a))
