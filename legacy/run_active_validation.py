"""Run bounded waves of a predeclared validation plan; repeat safely until done.

python run_active_validation.py --plan runs/active_final_v4_plan.json --dir runs/active_final_v4
Each invocation advances at most four episodes by 45 seconds of computation.
It executes the experiment's frozen source snapshot when available.
"""
import argparse,fcntl,json,subprocess,sys
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path


def jobs(plan):
    result=[('active','normal',s) for s in plan['normal_seeds'][:3]]
    result += [(n,'normal',s) for s in plan['baseline_seeds'] for n in ('straight','planner')]
    result += [('active','normal',s) for s in plan['normal_seeds'][3:]]
    result += [('active','hard',s) for s in plan['hard_seeds']]
    return result


def main(a):
    plan=json.loads(Path(a.plan).read_text());root=Path(a.dir).resolve();root.mkdir(exist_ok=True)
    rules=Path(plan.get('rules','runs/active_rules_v1.json')).resolve()
    cwd=root/'sources' if (root/'sources').exists() else Path.cwd()
    expected=jobs(plan)
    pending=[j for j in expected if not (root/('_'.join(map(str,j))+'.json')).exists()]
    def work(job):
        name,setting,seed=job;ident=f'{name}_{setting}_{seed}'
        with (root/(ident+'.lock')).open('w') as lock:
            try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            except BlockingIOError:return dict(job=ident,busy=True)
            cmd=[sys.executable,'evaluate_chunk.py','--controller',name,'--setting',setting,
                 '--seed',str(seed),'--seconds',str(plan['seconds']),'--wall-budget',str(a.wall_budget),
                 '--dir',str(root),'--rules',str(rules)]
            p=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,timeout=a.wall_budget+90)
            try:r=json.loads(p.stdout.strip().splitlines()[-1])
            except (ValueError,IndexError):r=dict(job=ident,error=p.stderr[-1500:],returncode=p.returncode)
            return r
    with ThreadPoolExecutor(max_workers=a.workers) as pool:
        for f in as_completed([pool.submit(work,j) for j in pending[:a.chunks]]):
            print(json.dumps(f.result()),flush=True)
    completed=[];missing=[]
    for j in expected:
        p=root/('_'.join(map(str,j))+'.json')
        if p.exists():completed.append(json.loads(p.read_text()))
        else:missing.append(j)
    # Summarize after all workers finish to avoid competing summary writers.
    from evaluate_active import summarize
    summary=summarize(completed)
    report=dict(plan=plan,planned=len(expected),completed=len(completed),missing=missing,summary=summary)
    for v in summary.values():
        v['target_90_certified']=bool(v['target_90_certified'] and not missing)
    (root.parent/(root.name+'_planned_summary.json')).write_text(json.dumps(report,indent=2))
    print(json.dumps(dict(planned=len(expected),completed=len(completed),remaining=len(missing))),flush=True)


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--plan',default='runs/active_final_v4_plan.json')
    ap.add_argument('--dir',default='runs/active_final_v4')
    ap.add_argument('--workers',type=int,default=4)
    ap.add_argument('--chunks',type=int,default=4)
    ap.add_argument('--wall-budget',type=float,default=45)
    a=ap.parse_args()
    if min(a.workers,a.chunks,a.wall_budget)<=0:ap.error('positive limits required')
    main(a)
