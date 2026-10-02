"""Reproduce v5 deaths exactly and capture full reactive worlds before contact."""
import argparse,hashlib,json,pickle,time,subprocess,sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np
from sim_active import World,DT
from active import ActiveController
from evaluate_active import SETTINGS
from evaluate_chunk import atomic_bytes

PLAN={'train':[56000,56001,56003,56004,56005],'validation':[56006],'test':[56002,56007,56008]}
ROOT=Path('runs/recovery_v1')
SOURCES=['sim_active.py','brain.py','geometry.py','active.py','activity.py']

class Capture:
    def __init__(self,seed,reference):
        self.w=World(seed=seed,L0=100,**SETTINGS['normal'])
        self.ctrl=ActiveController();self.k=0;self.cmd=None;self.previous=None;self.snapshots={}
        self.targets={2*round((reference['seconds']-lead)/DT/2):lead for lead in (2,4,6)}
        self.checked=0
    def step(self,expected):
        S=None
        if self.k%2==0:
            S=self.w.state()
            if self.k in expected:
                ref=expected[self.k]
                for key in ['x','y','ang','L','tgt']:
                    if not np.isclose(S[key],ref[key],rtol=0,atol=1e-6):
                        raise ValueError(f'reproduction drift k={self.k} {key}: {S[key]} vs {ref[key]}')
                if not np.allclose(S['heads'],np.array(ref['heads']).reshape(-1,5),rtol=0,atol=1e-6):raise ValueError('head reproduction drift')
                self.checked+=1
            if self.k in self.targets:
                lead=self.targets[self.k]
                self.snapshots[lead]=pickle.dumps(dict(world=self.w,controller=self.ctrl,
                    previous=self.previous or S,original_command=self.cmd,k=self.k),pickle.HIGHEST_PROTOCOL)
            self.cmd,_=self.ctrl(S)
            self.previous=S
        self.w.step(self.cmd);self.k+=1


def run_case(seed,wall):
    root=ROOT;root.mkdir(exist_ok=True)
    meta=root/f'{seed}.case.json';checkpoint=root/f'{seed}.capture.pkl'
    if meta.exists():return json.loads(meta.read_text())
    hashes={n:hashlib.sha256(Path(n).read_bytes()).hexdigest() for n in SOURCES}
    ref=json.loads(Path(f'runs/active_final_v5/active_normal_{seed}.json').read_text())
    for name,h in hashes.items():
        if ref['provenance']['hashes'][name]!=h:raise ValueError('source drift: '+name)
    trace=json.loads(Path(ref['trace']).read_text())
    expected={round(q['t']/DT):q['state'] for q in trace['tail']}
    start=time.monotonic();cap=pickle.loads(checkpoint.read_bytes()) if checkpoint.exists() else Capture(seed,ref)
    saved=time.monotonic()
    while cap.w.snakes[0]['alive'] and cap.k<=round(ref['seconds']/DT)+2 and time.monotonic()-start<wall:
        cap.step(expected)
        if time.monotonic()-saved>=15:
            atomic_bytes(checkpoint,pickle.dumps(cap,pickle.HIGHEST_PROTOCOL));saved=time.monotonic()
    if not cap.w.snakes[0]['alive']:
        actual=cap.w.snakes[0]
        assert abs(cap.w.t-ref['seconds'])<DT/2 and actual['cause']==ref['cause']
        assert abs(actual['L']-ref['L_end'])<1e-6 and cap.checked==len(expected)
        assert set(cap.snapshots)=={2,4,6}
        split=next(key for key,seeds in PLAN.items() if seed in seeds)
        files=[]
        for lead,data in sorted(cap.snapshots.items()):
            p=root/f'{seed}_lead{lead}.pkl';atomic_bytes(p,data)
            files.append(dict(path=str(p),sha256=hashlib.sha256(data).hexdigest(),lead=lead))
        result=dict(seed=seed,split=split,complete=True,reproduced=True,death_s=cap.w.t,
                    matched_observations=cap.checked,hashes=hashes,snapshots=files)
        atomic_bytes(meta,json.dumps(result,indent=2).encode());checkpoint.unlink(missing_ok=True)
        return result
    assert cap.w.snakes[0]['alive'] and cap.k<=round(ref['seconds']/DT)+2
    atomic_bytes(checkpoint,pickle.dumps(cap,pickle.HIGHEST_PROTOCOL))
    return dict(seed=seed,complete=False,seconds=cap.w.t,target=ref['seconds'])


def main(a):
    ROOT.mkdir(exist_ok=True)
    plan=dict(splits=PLAN,lead_seconds=[2,4,6],recovery_after_original_death_s=6,
              whole_world_test_seeds=[57000,57001,57002],shield=False,
              note='Splits are by original death, not adjacent frames. All counterpart snakes remain reactive.')
    dest=ROOT/'plan.json'
    if dest.exists():assert json.loads(dest.read_text())==plan
    else:dest.write_text(json.dumps(plan,indent=2))
    if a.case is not None:
        print(json.dumps(run_case(a.case,a.wall_budget)),flush=True);return
    todo=[s for seeds in PLAN.values() for s in seeds if not (ROOT/f'{s}.case.json').exists()]
    def work(seed):
        p=subprocess.run([sys.executable,__file__,'--case',str(seed),'--wall-budget',str(a.wall_budget)],capture_output=True,text=True)
        return dict(seed=seed,code=p.returncode,output=p.stdout[-1500:],error=p.stderr[-1500:])
    workers=2 if all((ROOT/f'{s}.case.json').exists() for s in PLAN['train']) else 4
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results=list(pool.map(work,todo[:workers]))
    for r in results:print(json.dumps(r),flush=True)
    if any(r['code'] for r in results):raise RuntimeError('capture worker failed; inspect output')
    done=sum((ROOT/f'{s}.case.json').exists() for seeds in PLAN.values() for s in seeds)
    print(json.dumps(dict(completed=done,total=9)),flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--case',type=int);ap.add_argument('--wall-budget',type=float,default=35)
    main(ap.parse_args())
