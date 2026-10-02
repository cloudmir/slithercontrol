"""Train direct-action PPO on full pre-death worlds, in resumable model chunks."""
import argparse,hashlib,json,time,os
from pathlib import Path
import numpy as np
import torch
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import SubprocVecEnv
from stable_baselines3.common.callbacks import BaseCallback
from recovery_env import RecoveryEnv

ROOT=Path('runs/recovery_v1')
SOURCES=['recovery_env.py','train_recovery.py','sim_active.py','geometry.py','brain.py']

class Stats(BaseCallback):
    def __init__(self):super().__init__();self.episodes=[]
    def _on_step(self):
        for done,info in zip(self.locals['dones'],self.locals['infos']):
            if done:self.episodes.append({k:info[k] for k in ['is_success','valid','elapsed','seed','lead']})
        if self.num_timesteps%512==0:
            print(json.dumps(dict(training_steps=self.num_timesteps,episodes=len(self.episodes))),flush=True)
        return True

def main(a):
    torch.set_num_threads(1)
    metas=[json.loads(p.read_text()) for p in ROOT.glob('*.case.json')]
    assert sum(d['split']=='train' for d in metas)==5,'reproduce every training death first'
    hashes={s:hashlib.sha256(Path(s).read_bytes()).hexdigest() for s in SOURCES}
    hp=ROOT/'training_sources.json'
    if hp.exists():assert json.loads(hp.read_text())==hashes,'training source drift'
    else:hp.write_text(json.dumps(hashes,indent=2))
    weights=ROOT/'models';weights.mkdir(exist_ok=True)
    available=sorted(weights.glob('ppo_*.zip'))
    steps=int(available[-1].stem.split('_')[1]) if available else 0
    if steps>=a.total:print(json.dumps(dict(complete=True,steps=steps)));return
    leads=(6,) if steps<8192 else ((4,6) if steps<16384 else (2,4,6))
    vec=SubprocVecEnv([lambda:RecoveryEnv(leads=leads) for _ in range(a.envs)],start_method='fork')
    vec.seed(271800+steps)
    if available:model=PPO.load(available[-1],env=vec,device='cpu')
    else:
        model=PPO('MlpPolicy',vec,n_steps=128,batch_size=256,n_epochs=6,learning_rate=3e-4,
            gamma=.9975,gae_lambda=.99,ent_coef=.02,clip_range=.2,seed=2718,device='cpu',
            policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])))
        model.save(weights/'ppo_000000.zip')
    stats=Stats();started=time.monotonic()
    model.learn(total_timesteps=min(a.chunk,a.total-steps),reset_num_timesteps=False,callback=stats)
    dest=weights/f'ppo_{model.num_timesteps:06d}.zip';tmp=weights/f'pending_{os.getpid()}.zip'
    model.save(tmp);tmp.replace(dest);vec.close()
    rows=stats.episodes
    result=dict(complete=model.num_timesteps>=a.total,steps=model.num_timesteps,leads=leads,
        wall_s=time.monotonic()-started,episodes=len(rows),successes=sum(r['is_success'] for r in rows),
        success_rate=float(np.mean([r['is_success'] for r in rows])) if rows else None,
        mean_life_s=float(np.mean([r['elapsed'] for r in rows])) if rows else None,
        invalid=sum(not r['valid'] for r in rows),model=str(dest),shield_interventions=0)
    with (ROOT/'training.jsonl').open('a') as f:f.write(json.dumps(result)+'\n')
    print(json.dumps(result),flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--chunk',type=int,default=2048);ap.add_argument('--total',type=int,default=65536);ap.add_argument('--envs',type=int,default=4)
    main(ap.parse_args())
