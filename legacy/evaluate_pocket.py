"""Frozen local comparison: geometric pocket fixtures and separate reactive worlds."""
import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import numpy as np
from pocket import PocketController
from pocket2 import Pocket2Controller
from pocket3 import Pocket3Controller
from pocket4 import Pocket4Controller
from pocket5 import Pocket5Controller
from pocket6 import Pocket6Controller
from pocket7 import Pocket7Controller
from pocket8 import Pocket8Controller
from pocket10 import Pocket10Controller
from pocket11 import Pocket11Controller
from pocket12 import Pocket12Controller
from pocket13 import Pocket13Controller
from pocket_scenarios import PocketArena, KINDS
from staged import make_controller, observe
from sim_active import World, DT
from activity import ActivityMonitor, measure
from evaluate_active import SETTINGS, independent_danger

FILES=['pocket.py','pocket2.py','pocket3.py','pocket4.py','pocket5.py','pocket6.py','pocket7.py','pocket8.py','pocket10.py','pocket11.py','pocket12.py','pocket13.py','pocket_scenarios.py','evaluate_pocket.py','staged.py','staged_reference.py',
       'sim_active.py','brain.py','geometry.py','activity.py','evaluate_active.py','active.py']


def write(path,obj):
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(obj,indent=2));tmp.replace(path)


def episode(job):
    name,kind,seed,seconds=job
    c={'pocket':PocketController,'pocket2':Pocket2Controller,'pocket3':Pocket3Controller,'pocket4':Pocket4Controller,'pocket5':Pocket5Controller,'pocket6':Pocket6Controller,'pocket7':Pocket7Controller,'pocket8':Pocket8Controller,'pocket10':Pocket10Controller,'pocket11':Pocket11Controller,'pocket12':Pocket12Controller,'pocket13':Pocket13Controller}.get(name,lambda:make_controller(name))()
    w=World(seed=seed,L0=100,**SETTINGS['normal']) if kind=='normal' else PocketArena(kind,seed)
    mon=ActivityMonitor();times=[];modes=Counter();cmd=None;minimum=1e9;last={};trace=[]
    started=time.monotonic()
    for k in range(round(seconds/DT)):
        if k and k%900==0:
            print(json.dumps(dict(progress=True,controller=name,kind=kind,seed=seed,t=w.t)),flush=True)
        if k%2==0:
            s=observe(w) if kind=='normal' else w.state()
            begin=time.perf_counter();cmd,e=c(s);times.append(time.perf_counter()-begin)
            modes[c.last.get('mode','unknown')]+=1
            if kind=='normal': active=bool(measure(s)['active'][0]);danger=independent_danger(s)
            if k%30==0: trace.append(dict(t=s['t'],x=s['x'],y=s['y'],L=s['L'],mode=c.last.get('mode'),radius=c.last.get('radius')))
            minimum=min(minimum,float(c.last.get('clearance',1e9)))
        w.step(cmd)
        if kind=='normal':
            mon.update(w.t,DT,active,danger);alive=w.snakes[0]['alive'];length=w.snakes[0]['L'];cause=w.snakes[0].get('cause')
        else: alive=w.alive;length=w.L;cause=w.cause
        if not alive: break
    result=dict(controller=name,kind=kind,seed=seed,cap_s=seconds,seconds=w.t,alive=bool(alive),
                L_end=length,gain=length-100,cause=cause,modes=dict(modes),
                decision_ms_p95=float(np.percentile(times,95)*1000),decision_ms_max=max(times)*1000,
                wall_seconds=time.monotonic()-started,trace=trace)
    if kind=='normal':
        population=1-w.spawn_wait_s/max(w.t*w.target_bots,1e-9)
        valid=population>=.99 and w.min_live_bots>=.9*w.target_bots
        result.update(**mon.result(),valid=bool(valid),population_fraction=population)
        result['success']=bool(valid and alive and result['activity_ok'])
    else:
        result.update(escaped=w.escaped,food_eaten=w.food_eaten,
                      success=bool(alive and (w.escaped if kind=='opening' else True)),
                      scope='prescribed geometry only; not reactive opponents or activity-qualified play')
    return result


def main(a):
    out=Path(a.out).resolve()
    if not a.frozen:
        out.mkdir(parents=True,exist_ok=False);snapshot=out/'sources';snapshot.mkdir()
        hashes={}
        for name in FILES:
            data=Path(__file__).with_name(name).read_bytes();(snapshot/name).write_bytes(data);hashes[name]=hashlib.sha256(data).hexdigest()
        write(out/'manifest.json',dict(args=vars(a),hashes=hashes,created=time.strftime('%FT%T%z'),
            note='Synthetic fixtures and reactive normal play are reported separately. No live trial.'))
        return subprocess.call([sys.executable,str(snapshot/'evaluate_pocket.py'),'--frozen','--out',str(out),
            '--cases',a.cases,'--controllers',a.controllers,'--seeds',str(a.seeds),'--seed0',str(a.seed0),
            '--seconds',str(a.seconds),'--workers',str(a.workers)],cwd=snapshot)
    manifest=json.loads((out/'manifest.json').read_text())
    for name,sha in manifest['hashes'].items():
        if hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()!=sha: raise ValueError('source changed')
    for key in ('cases','controllers','seed0','seeds','seconds'):
        if getattr(a,key)!=manifest['args'][key]: raise ValueError('frozen conditions changed: '+key)
    jobs=[(c,k,a.seed0+i,a.seconds) for k in a.cases.split(',') for c in a.controllers.split(',') for i in range(a.seeds)]
    results=[]
    with ProcessPoolExecutor(max_workers=a.workers) as pool:
        for f in as_completed([pool.submit(episode,j) for j in jobs]):
            r=f.result();results.append(r);write(out/f"{r['controller']}_{r['kind']}_{r['seed']}.json",r)
            print(json.dumps({k:v for k,v in r.items() if k!='trace'}),flush=True)
            write(out/'summary.json',dict(planned=len(jobs),completed=len(results),results=results))
    return 0


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--frozen',action='store_true');p.add_argument('--out',required=True)
    p.add_argument('--cases',default=','.join(KINDS));p.add_argument('--controllers',default='coil,pocket')
    p.add_argument('--seed0',type=int,default=71000);p.add_argument('--seeds',type=int,default=2)
    p.add_argument('--seconds',type=float,default=30);p.add_argument('--workers',type=int,default=3)
    args=p.parse_args()
    if args.seconds<=0 or args.seeds<=0 or args.workers<=0: p.error('positive seconds, seeds and workers required')
    raise SystemExit(main(args))
