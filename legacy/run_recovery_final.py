"""Bounded final-evaluation waves, after validation has frozen model selection."""
import argparse,json,subprocess,sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
ROOT=Path('runs/recovery_v1')

def main(stage):
    selection=json.loads((ROOT/'selection.json').read_text())
    assert all((ROOT/f'{s}.case.json').exists() for s in [56002,56007,56008])
    jobs=[]
    if stage=='short':
        for label,model in [('original',None),('untrained',str(ROOT/'models/ppo_000000.zip')),('selected',selection['model'])]:
            out=ROOT/f'test_{label}.json'
            if out.exists():continue
            args=['evaluate_recovery.py','--split','test','--out',str(out)]
            args+=['--baseline'] if model is None else ['--model',model]
            jobs.append((label,args))
    else:
        for label,model in [('untrained',str(ROOT/'models/ppo_000000.zip')),('selected',selection['model'])]:
            dest=ROOT/f'world_{label}'
            for seed in (57000,57001,57002):
                if (dest/f'{seed}.json').exists():continue
                jobs.append((f'{label}_{seed}',['eval_recovery_world.py','--model',model,'--seed',str(seed),'--dir',str(dest),'--wall-budget','35']))
    def run(job):
        label,args=job
        r=subprocess.run([sys.executable,*args],text=True,capture_output=True)
        return dict(label=label,code=r.returncode,output=r.stdout[-2000:],error=r.stderr[-2000:])
    with ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(run,jobs[:3]))
    for r in results:print(json.dumps(r),flush=True)
    if any(r['code'] for r in results):raise RuntimeError('evaluation worker failed; inspect output')
    print(json.dumps(dict(stage=stage,remaining_before_wave=len(jobs))),flush=True)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--stage',choices=['short','world'],required=True);main(ap.parse_args().stage)
