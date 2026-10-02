"""Direct-action RL from reproducible pre-death worlds; no planner or shield in step."""
import json,pickle,hashlib
from pathlib import Path
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from scipy.spatial import cKDTree
import brain as B
from sim_active import DT

ANGLES=np.radians([-160,-110,-75,-50,-30,-15,0,15,30,50,75,110,160])
N_ACTIONS=len(ANGLES)*2
OBS_SIZE=241


def encode(S):
    h=np.array([S['x'],S['y']]);a=S['ang'];c,s=np.cos(a),np.sin(a)
    rot=np.array([[c,-s],[s,c]])
    angles=np.arange(32)*2*np.pi/32
    probes=np.stack([np.cos(angles),np.sin(angles)],-1)[:,None,:]*np.array([50,130,300,650])[None,:,None]
    world=probes.reshape(-1,2)@rot.T+h
    clearance=np.full(128,200.)
    obs=B.dense(S['segs'])
    if len(obs):
        obs=np.vstack([obs,S['segs'][:,[2,3,4]]])
        d,j=cKDTree(obs[:,:2]).query(world,k=min(4,len(obs)))
        if d.ndim==1:d=d[:,None];j=j[:,None]
        clearance=(d-obs[j,2]-B.BODY_R*S['sc']).min(1)
    wall=S['wall'][2]-np.linalg.norm(world-S['wall'][:2],axis=1)-B.BODY_R*S['sc']
    clearance=np.clip(np.minimum(clearance,wall)/200,-1,1)
    heads=np.zeros((8,8));hd=S['heads']
    if len(hd):
        ids=np.argsort(np.linalg.norm(hd[:,:2]-h,axis=1))[:8];q=hd[ids]
        rel=(q[:,:2]-h)@rot
        vel=np.column_stack([np.cos(q[:,2]),np.sin(q[:,2])])*q[:,3,None]*B.SPF
        own=np.array([c,s])*S['sp']*B.SPF
        heads[:len(q),:2]=rel/1600
        heads[:len(q),2:4]=(vel-own)@rot/(B.NSP3*B.SPF*2)
        heads[:len(q),4]=np.sin(q[:,2]-a);heads[:len(q),5]=np.cos(q[:,2]-a)
        heads[:len(q),6]=B.BODY_R*q[:,4]/80;heads[:len(q),7]=1
    food=np.zeros(16);near=np.ones(16);F=S['food']
    if len(F):
        d=np.linalg.norm(F[:,:2]-h,axis=1)
        theta=B.wrap(np.arctan2(F[:,1]-h[1],F[:,0]-h[0])-a)
        ix=np.floor((theta+np.pi)/(2*np.pi)*16).astype(int)%16
        np.add.at(food,ix,F[:,2]/(1+d/200))
        np.minimum.at(near,ix,d/1600)
        food=np.clip(np.log1p(food)/7,0,2)
    center=(np.asarray(S['wall'][:2])-h)@rot/S['wall'][2]
    own=np.array([np.log1p(S['L'])/10,S['sc']/6,S['sp']/B.NSP3,float(S['boost']),
                  B.wrap(S['tgt']-a)/np.pi,(S['wall'][2]-np.linalg.norm(h-S['wall'][:2]))/S['wall'][2],*center])
    queue=np.zeros((3,3))
    for j,cmd in enumerate(S.get('pending',[])[:3]):
        if cmd is not None:queue[j]=[B.wrap(cmd[0]-a)/np.pi,float(cmd[1]),1]
    out=np.concatenate([clearance,heads.ravel(),food,near,own,queue.ravel()]).astype(np.float32)
    assert out.shape==(OBS_SIZE,) and np.isfinite(out).all()
    return out


def command(S,action):
    action=int(action)
    return float(B.wrap(S['ang']+ANGLES[action%len(ANGLES)])),bool(action//len(ANGLES))


def rotate_state(S,angle):
    c,s=np.cos(angle),np.sin(angle);rot=np.array([[c,-s],[s,c]])
    S=dict(S);xy=np.array([S['x'],S['y']])@rot.T;S['x'],S['y']=xy
    S['ang']+=angle;S['tgt']+=angle
    for key in ['food','heads','segs']:
        q=S[key].copy()
        if len(q):
            q[:,:2]=q[:,:2]@rot.T
            if key=='heads':q[:,2]+=angle
            if key=='segs':q[:,2:4]=q[:,2:4]@rot.T
        S[key]=q
    S['pending']=[None if q is None else (q[0]+angle,q[1]) for q in S.get('pending',[])]
    return S


def rotate_world(w,angle):
    if not angle:return
    c,s=np.cos(angle),np.sin(angle);rot=np.array([[c,-s],[s,c]])
    w.food[:,:2]=w.food[:,:2]@rot.T
    for q in w.snakes:
        q['x'],q['y']=np.array([q['x'],q['y']])@rot.T
        q['pts']=(np.array(q['pts'])@rot.T).tolist()
        q['ang']+=angle;q['tgt']+=angle
    w.queue=[None if q is None else (q[0]+angle,q[1]) for q in w.queue]
    w.rebuild()


class RecoveryEnv(gym.Env):
    def __init__(self,root='runs/recovery_v1',split='train',leads=(2,4,6),augment=True):
        super().__init__();self.root=Path(root);self.augment=augment;self.leads=tuple(leads)
        self.cases=[]
        for p in sorted(self.root.glob('*.case.json')):
            d=json.loads(p.read_text())
            if d['split']==split:
                assert d['complete'] and d['reproduced'], 'unverified death snapshot'
                for q in d['snapshots']:
                    if q['lead'] in leads:self.cases.append(dict(**q,seed=d['seed'],death_s=d['death_s']))
        if not self.cases:raise ValueError('no reproduced cases for '+split)
        self.cache={q['path']:Path(q['path']).read_bytes() for q in self.cases}
        for q in self.cases:
            assert hashlib.sha256(self.cache[q['path']]).hexdigest()==q['sha256'], 'snapshot drift'
        self.action_space=spaces.Discrete(N_ACTIONS)
        self.observation_space=spaces.Box(-np.inf,np.inf,(OBS_SIZE*2,),np.float32)
        self.w=None
    def reset(self,seed=None,options=None):
        super().reset(seed=seed);options=options or {}
        index=options.get('case',int(self.np_random.integers(len(self.cases))))
        self.case=self.cases[index];snap=pickle.loads(self.cache[self.case['path']])
        self.w=snap['world'];self.original_controller=snap['controller']
        angle=options.get('rotation',self.np_random.uniform(-np.pi,np.pi) if self.augment else 0.)
        previous=rotate_state(snap['previous'],angle);rotate_world(self.w,angle)
        self.previous=encode(previous);current=encode(self.w.state())
        self.start_t=self.w.t;self.start_L=self.w.snakes[0]['L'];self.last_L=self.start_L
        self.initial_wait=self.w.spawn_wait_s;self.min_population=sum(q['bot'] and q['alive'] for q in self.w.snakes)
        self.limit=round((self.case['death_s']-self.start_t+6)/DT);self.k=0;self.food_reward=0.
        self.last_obs=np.r_[self.previous,current].astype(np.float32);self.previous=current
        return self.last_obs,dict(seed=self.case['seed'],lead=self.case['lead'])
    def step(self,action):return self.step_command(command(self.w.state(),action))
    def step_command(self,cmd):
        for _ in range(min(2,self.limit-self.k)):
            self.w.step(cmd);self.k+=1
            self.min_population=min(self.min_population,sum(q['bot'] and q['alive'] for q in self.w.snakes))
            if not self.w.snakes[0]['alive']:break
        ag=self.w.snakes[0];alive=bool(ag['alive']);complete=self.k>=self.limit
        current=encode(self.w.state());obs=np.r_[self.previous,current].astype(np.float32);self.previous=current
        # Any completed recovery has greater total reward than any death, even with food.
        reward=5*2/max(self.limit,1)
        extra=min(1-self.food_reward,max(0,ag['L']-self.last_L)*.001)
        self.food_reward+=extra;self.last_L=ag['L'];reward+=extra
        if not alive:reward-=10
        elif complete:reward+=5
        elapsed=self.w.t-self.start_t
        population_fraction=1-(self.w.spawn_wait_s-self.initial_wait)/max(elapsed*self.w.target_bots,1e-9)
        valid=population_fraction>=.99 and self.min_population>=.9*self.w.target_bots
        info=dict(is_success=bool(alive and complete and valid),alive=alive,valid=valid,
            elapsed=elapsed,original_death_after=self.case['death_s']-self.start_t,
            gain=ag['L']-self.start_L,seed=self.case['seed'],lead=self.case['lead'],
            population_fraction=population_fraction,shield_interventions=0)
        return obs,float(reward),bool(not alive or complete),False,info


class RecoveryController:
    def __init__(self,model):
        self.model=model;self.reset()
    def reset(self):self.previous=None;self.last={}
    def __call__(self,S):
        current=encode(S)
        if self.previous is None:self.previous=current
        obs=np.r_[self.previous,current].astype(np.float32);self.previous=current
        a,_=self.model.predict(obs,deterministic=True)
        cmd=command(S,a);self.last=dict(action=int(a),boost=cmd[1],shield_interventions=0)
        return cmd,None
