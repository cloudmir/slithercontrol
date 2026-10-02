"""Resumable first-life evaluator. A wall-time-limited invocation never loses a life.

python evaluate_chunk.py --seed 54000 --controller active --seconds 600 --wall-budget 90 --dir runs/active_validation
Repeat the same command until complete. Checkpoints include RNG, world, controller,
command queue and activity monitor. Source/rule drift is rejected on resume.
"""
import argparse,hashlib,json,pickle,time,os
from collections import deque
from pathlib import Path
import numpy as np
import brain as B
from sim_active import World,DT
from active import ActiveController
from activity import ActivityRules,ActivityMonitor,measure
from evaluate_active import SETTINGS,independent_danger,summarize

SOURCES=['active.py','sim_active.py','brain.py','activity.py','geometry.py','evaluate_active.py','evaluate_chunk.py']


class LegacyController:
    def __init__(self,name):self.name=name;self.pl=B.Planner()
    def __call__(self,S):
        E=self.pl.evaluate(S);best=int(np.argmax(self.pl.score(E)))
        a=self.pl.shield(E,0,best) if self.name=='straight' else best
        return self.pl.action_to_cmd(E,a),E


class Episode:
    def __init__(self,name,setting,seed,seconds,rules):
        self.name,self.setting,self.seed,self.seconds=name,setting,seed,seconds
        self.rules=rules
        self.w=World(seed=seed,L0=100,**SETTINGS[setting])
        self.ctrl=ActiveController(rules) if name=='active' else LegacyController(name)
        self.monitor=ActivityMonitor(rules)
        self.k=0;self.cmd=None;self.active=False;self.danger=False
        self.boost=0.;self.timings=[];self.samples=[];self.tail=deque(maxlen=120)
        self.wall=0.;self.initial=self.w.snakes[0]['L'];self.head_counts=[]

    @property
    def complete(self):return self.k>=round(self.seconds/DT) or not self.w.snakes[0]['alive']

    def step(self):
        w=self.w
        if self.k%2==0:
            S=w.state();t=time.perf_counter()
            self.cmd,E=self.ctrl(S);self.timings.append(time.perf_counter()-t)
            m=measure(S,rules=self.rules)
            self.active=bool(m['active'][0]);self.danger=independent_danger(S)
            self.head_counts.append(int(m['heads'][0]))
            self.tail.append(dict(t=w.t,x=S['x'],y=S['y'],L=S['L'],ang=S['ang'],cmd=self.cmd,
                state={key:(v.tolist() if isinstance(v,np.ndarray) else v) for key,v in S.items()},
                status=getattr(self.ctrl,'last',None),heads=S['heads'].tolist(),segs=S['segs'].tolist(),
                pending=S['pending'],active=self.active,danger=self.danger))
        w.step(self.cmd);self.k+=1
        self.monitor.update(w.t,DT,self.active,self.danger)
        ag=w.snakes[0];self.boost+=DT*bool(ag['boost'] and ag['sp']>10)
        if self.k%300==0:
            self.samples.append(dict(t=w.t,L=ag['L'],heads=self.head_counts[-1],active=self.active))

    def result(self):
        ag=self.w.snakes[0];a=self.monitor.result()
        alive=bool(ag['alive']);full=self.k>=round(self.seconds/DT)
        population_fraction=1-self.w.spawn_wait_s/max(self.w.t*self.w.target_bots,1e-9)
        population_ok=population_fraction>=.99 and self.w.min_live_bots>=.9*self.w.target_bots
        return dict(controller=self.name,setting=self.setting,seed=self.seed,valid=bool(population_ok),
            population_fraction=population_fraction,min_live_bots=self.w.min_live_bots,
            population_ok=bool(population_ok),spawn_wait_s=self.w.spawn_wait_s,
            complete=self.complete,seconds=self.w.t,requested_seconds=self.seconds,
            alive=alive,**a,success=bool(population_ok and full and alive and a['activity_ok']),
            L_start=self.initial,L_end=ag['L'],gain=ag['L']-self.initial,
            boost_fraction=self.boost/max(self.w.t,1e-9),cause=ag.get('cause'),samples=self.samples,
            decision_ms_p50=float(np.percentile(self.timings,50)*1000) if self.timings else 0.,
            decision_ms_p95=float(np.percentile(self.timings,95)*1000) if self.timings else 0.,
            decision_over_66ms=float(np.mean(np.array(self.timings)>2*DT)) if self.timings else 0.,
            head_count_range=[min(self.head_counts),max(self.head_counts)] if self.head_counts else [],wall_seconds=self.wall)


def atomic_bytes(path,data):
    tmp=path.with_suffix(path.suffix+f'.{os.getpid()}.tmp');tmp.write_bytes(data);tmp.replace(path)


def main(a):
    root=Path(a.dir);root.mkdir(exist_ok=True)
    rules=ActivityRules(**json.loads(Path(a.rules).read_text())) if a.rules else ActivityRules()
    hashes={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in SOURCES}
    ident=f'{a.controller}_{a.setting}_{a.seed}'
    checkpoint=root/(ident+'.pkl');resultfile=root/(ident+'.json')
    provenance=dict(hashes=hashes,rules=rules.to_dict(),setting=SETTINGS[a.setting],
        controller=a.controller,seed=a.seed,seconds=a.seconds,initial_length=100)
    if resultfile.exists():
        r=json.loads(resultfile.read_text())
        if r['provenance']!=provenance:raise SystemExit('Existing result provenance differs; use a new experiment directory')
        print(json.dumps({k:r.get(k) for k in ('controller','seed','complete','seconds','alive','success','valid','error')}));return
    manifest=root/(ident+'.manifest.json')
    if manifest.exists() and json.loads(manifest.read_text())!=provenance:
        raise SystemExit('Source/rule drift detected; preserve this run and use a new experiment directory')
    manifest.write_text(json.dumps(provenance,indent=2))
    snapshot=root/'sources';snapshot.mkdir(exist_ok=True)
    for p in SOURCES:
        dest=snapshot/p
        if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()!=hashes[p]:
            raise SystemExit('Experiment source snapshot differs')
        if not dest.exists():atomic_bytes(dest,Path(p).read_bytes())
    t0=time.monotonic(); ep=None
    try:
        if checkpoint.exists():
            # Only load checkpoints written locally by this evaluator, never external pickle files.
            ep=pickle.loads(checkpoint.read_bytes())
        else:
            ep=Episode(a.controller,a.setting,a.seed,a.seconds,rules)
        last_save=time.monotonic()
        while not ep.complete and time.monotonic()-t0<a.wall_budget:
            ep.step()
            if time.monotonic()-last_save>20:
                atomic_bytes(checkpoint,pickle.dumps(ep,pickle.HIGHEST_PROTOCOL));last_save=time.monotonic()
        ep.wall+=time.monotonic()-t0
        r=ep.result();r['provenance']=provenance
        if ep.complete:
            trace=root/(ident+'_trace.json')
            if not r['success']:
                atomic_bytes(trace,json.dumps(dict(result=r,tail=list(ep.tail))).encode());r['trace']=str(trace)
            atomic_bytes(resultfile,json.dumps(r,indent=2).encode())
            checkpoint.unlink(missing_ok=True)
        else:
            atomic_bytes(checkpoint,pickle.dumps(ep,pickle.HIGHEST_PROTOCOL))
        print(json.dumps({k:r.get(k) for k in ('controller','seed','complete','seconds','alive','success','gain','off_fraction','decision_ms_p95')}),flush=True)
    except Exception as ex:
        r=dict(controller=a.controller,setting=a.setting,seed=a.seed,valid=False,
               complete=True,error=repr(ex),provenance=provenance)
        atomic_bytes(resultfile,json.dumps(r,indent=2).encode())
        print(json.dumps(r),flush=True)
    documents=[json.loads(p.read_text()) for p in root.glob('*.json') if not p.name.endswith(('_trace.json','.manifest.json')) and p.name!='summary.json']
    completed=[r for r in documents if 'controller' in r and 'valid' in r]
    atomic_bytes(root/'summary.json',json.dumps(summarize(completed),indent=2).encode())


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--controller',choices=['active','straight','planner'],default='active')
    ap.add_argument('--setting',choices=list(SETTINGS),default='normal')
    ap.add_argument('--seed',type=int,required=True)
    ap.add_argument('--seconds',type=float,default=600)
    ap.add_argument('--wall-budget',type=float,default=45)
    ap.add_argument('--dir',default='runs/active_validation')
    ap.add_argument('--rules',default='runs/active_rules_v1.json')
    a=ap.parse_args()
    if a.seconds<=0 or a.wall_budget<=0:ap.error('positive time limits required')
    main(a)
