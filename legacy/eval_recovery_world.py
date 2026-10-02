"""Resumable fresh-world evaluation, direct neural actions, first life only."""
import argparse,hashlib,json,pickle,time
from pathlib import Path
from collections import deque
import numpy as np
import torch
from stable_baselines3 import PPO
from sim_active import World,DT
from evaluate_active import SETTINGS,independent_danger
from activity import ActivityMonitor,measure
from recovery_env import RecoveryController
from evaluate_chunk import atomic_bytes


def main(a):
    torch.set_num_threads(1);root=Path(a.dir);root.mkdir(exist_ok=True)
    result_path=root/f'{a.seed}.json';cp=root/f'{a.seed}.pkl'
    signature=dict(model=str(Path(a.model).resolve()),model_sha256=hashlib.sha256(Path(a.model).read_bytes()).hexdigest(),
        sources={n:hashlib.sha256(Path(n).read_bytes()).hexdigest() for n in ['recovery_env.py','sim_active.py','activity.py','eval_recovery_world.py']},
        seed=a.seed,seconds=600,settings=SETTINGS['normal'],initial_length=100)
    if result_path.exists():
        r=json.loads(result_path.read_text());assert r['signature']==signature;print(json.dumps(r));return
    model=PPO.load(a.model,device='cpu');ctrl=RecoveryController(model)
    if cp.exists():
        d=pickle.loads(cp.read_bytes());assert d['signature']==signature;ctrl.previous=d['previous']
    else:
        d=dict(signature=signature,w=World(seed=a.seed,L0=100,**SETTINGS['normal']),monitor=ActivityMonitor(),k=0,cmd=None,
               active=False,danger=False,previous=None,timings=[],snapshots=deque(maxlen=4),samples=[])
    w=d['w'];start=time.monotonic();saved=start
    while w.snakes[0]['alive'] and d['k']<round(600/DT) and time.monotonic()-start<a.wall_budget:
        if d['k']%2==0:
            if d['k']%60==0:
                d['snapshots'].append(pickle.dumps(dict(world=w,previous=ctrl.previous,cmd=d['cmd'],k=d['k']),pickle.HIGHEST_PROTOCOL))
            S=w.state();t=time.perf_counter();d['cmd'],_=ctrl(S);d['timings'].append(time.perf_counter()-t)
            d['active']=bool(measure(S)['active'][0]);d['danger']=independent_danger(S)
        w.step(d['cmd']);d['k']+=1;d['monitor'].update(w.t,DT,d['active'],d['danger'])
        if d['k']%300==0:d['samples'].append(dict(t=w.t,L=w.snakes[0]['L']))
        if time.monotonic()-saved>15:
            d['previous']=ctrl.previous;atomic_bytes(cp,pickle.dumps(d,pickle.HIGHEST_PROTOCOL));saved=time.monotonic()
    complete=not w.snakes[0]['alive'] or d['k']>=round(600/DT)
    if complete:
        ag=w.snakes[0];activity=d['monitor'].result()
        fraction=1-w.spawn_wait_s/max(w.t*w.target_bots,1e-9);valid=fraction>=.99 and w.min_live_bots>=.9*w.target_bots
        r=dict(signature=signature,complete=True,valid=valid,seconds=w.t,alive=bool(ag['alive']),**activity,
               success=bool(valid and ag['alive'] and activity['activity_ok']),L_end=ag['L'],cause=ag.get('cause'),
               decision_ms_p95=float(np.percentile(d['timings'],95)*1000),shield_interventions=0,
               population_fraction=fraction,samples=d['samples'])
        if not ag['alive']:
            failure=root/f'{a.seed}.failure.pkl'
            atomic_bytes(failure,pickle.dumps(dict(signature=signature,death_s=w.t,snapshots=list(d['snapshots'])),pickle.HIGHEST_PROTOCOL))
            r['future_failure_archive']=str(failure)
        atomic_bytes(result_path,json.dumps(r,indent=2).encode());cp.unlink(missing_ok=True)
    else:
        d['previous']=ctrl.previous;atomic_bytes(cp,pickle.dumps(d,pickle.HIGHEST_PROTOCOL))
        r=dict(complete=False,seconds=w.t,seed=a.seed)
    print(json.dumps(r),flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);ap.add_argument('--seed',type=int,required=True);ap.add_argument('--dir',required=True);ap.add_argument('--wall-budget',type=float,default=35)
    main(ap.parse_args())
