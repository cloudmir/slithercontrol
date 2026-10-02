"""Held-out death recovery evaluation. Original cases, not frames, define splits."""
import argparse,json,time,pickle,hashlib
from pathlib import Path
import numpy as np
import torch
from stable_baselines3 import PPO
from recovery_env import RecoveryEnv
ROOT=Path('runs/recovery_v1')


def evaluate(model_path,split='validation',baseline=False):
    torch.set_num_threads(1)
    env=RecoveryEnv(split=split,augment=False)
    model=None if baseline else PPO.load(model_path,device='cpu')
    rows=[]
    for i,case in enumerate(env.cases):
        obs,_=env.reset(seed=123,options=dict(case=i,rotation=0))
        done=False;started=time.monotonic();decisions=0;boost_steps=0
        while not done:
            if baseline:
                cmd,_=env.original_controller(env.w.state())
                obs,r,done,_,info=env.step_command(cmd)
            else:
                a,_=model.predict(obs,deterministic=True)
                obs,r,done,_,info=env.step(a)
            decisions+=1;boost_steps+=bool(env.w.snakes[0]['boost'])
        if baseline:
            info['original_death_reproduced']=bool(not info['alive'] and abs(info['elapsed']-info['original_death_after'])<.035)
            assert info['original_death_reproduced'],'counterfactual baseline failed reproduction'
        rows.append(dict(**info,wall_s=time.monotonic()-started,decisions=decisions,
            boost_fraction=boost_steps/max(decisions,1),snapshot_sha256=case['sha256']))
    result=dict(model='v5_original' if baseline else str(model_path),split=split,
        death_events=len({r['seed'] for r in rows}),windows=len(rows),valid=sum(r['valid'] for r in rows),
        recoveries=sum(r['is_success'] for r in rows),
        mean_survival=float(np.mean([r['elapsed'] for r in rows])),
        mean_survival_fraction=float(np.mean([r['elapsed']/(r['original_death_after']+6) for r in rows])),
        model_sha256=None if baseline else hashlib.sha256(Path(model_path).read_bytes()).hexdigest(),
        sources={n:hashlib.sha256(Path(n).read_bytes()).hexdigest() for n in ['evaluate_recovery.py','recovery_env.py','sim_active.py']},
        rows=rows,note='Offsets from a single death are correlated, not independent trials. Survival here does not establish ten-minute success.')
    return result

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--model');ap.add_argument('--split',choices=['train','validation','test'],default='validation');ap.add_argument('--baseline',action='store_true');ap.add_argument('--out',required=True)
    a=ap.parse_args();out=Path(a.out)
    if out.exists():print(out.read_text());raise SystemExit(0)
    r=evaluate(a.model,a.split,a.baseline);out.write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if k!='rows'}))
