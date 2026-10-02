"""First-life, activity-constrained local evaluation with immutable run manifests.

Example: python evaluate_active.py --seeds 10 --seconds 600 --workers 3 --out runs/active_test.json
"""
import argparse
from collections import deque
from concurrent.futures import ProcessPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import time
import numpy as np
from scipy.stats import beta
from geometry import point_segment
from activity import ActivityRules, ActivityMonitor, measure

SETTINGS={
    'normal':dict(n_bots=50,hunters=.3,delay=2,crowd=.3),
    'hard':dict(n_bots=55,hunters=.45,delay=3,crowd=.5),
}


def controller(name,rules):
    import brain as B
    if name=='active':
        from active import ActiveController
        return ActiveController(rules)
    pl=B.Planner()
    def ctrl(S):
        E=pl.evaluate(S)
        best=int(np.argmax(pl.score(E)))
        a=pl.shield(E,0,best) if name=='straight' else best
        return pl.action_to_cmd(E,a),E
    return ctrl


def independent_danger(S):
    """Policy-independent near-term danger used only for inactivity exception accounting."""
    import brain as B
    p=np.array([S['x'],S['y']]); r=B.BODY_R*S['sc']
    v=np.array([np.cos(S['ang']),np.sin(S['ang'])])*S['sp']*B.SPF
    end=p+v*.8
    wall=S['wall'][2]-np.linalg.norm(end-S['wall'][:2])-r<20
    body=False
    if len(S['segs']):
        from geometry import segment_distance
        body=bool((segment_distance(p,end,S['segs'][:,:2],S['segs'][:,2:4])-r-S['segs'][:,4]<20).any())
    head=False
    if len(S['heads']):
        h=S['heads']; rel=h[:,:2]-p
        hv=np.column_stack([np.cos(h[:,2]),np.sin(h[:,2])])*h[:,3,None]*B.SPF
        d=point_segment(np.zeros_like(rel),rel,rel+(hv-v)*.8)-r-B.BODY_R*h[:,4]
        head=bool((d<30).any())
    return bool(wall or body or head)


def episode(job):
    name,setting,seed,seconds,rule_dict,trace_dir=job
    from sim_active import World,DT
    rules=ActivityRules(**rule_dict)
    t0=time.monotonic()
    try:
        w=World(seed=seed,L0=100,**SETTINGS[setting])
        ctrl=controller(name,rules); monitor=ActivityMonitor(rules)
        tail=deque(maxlen=120)
        initial=w.snakes[0]['L']; boost=0.; timings=[]; cmd=None; E=None
        samples=[]; min_count=10000; max_count=0
        for k in range(round(seconds/DT)):
            if k%2==0:
                S=w.state(); t=time.perf_counter()
                cmd,E=ctrl(S); timings.append(time.perf_counter()-t)
                M=measure(S,rules=rules)
                active=bool(M['active'][0]); danger=independent_danger(S)
                count=int(M['heads'][0]); min_count=min(count,min_count); max_count=max(count,max_count)
                tail.append(dict(t=w.t,x=S['x'],y=S['y'],L=S['L'],ang=S['ang'],cmd=cmd,
                    state={key:(value.tolist() if isinstance(value,np.ndarray) else value) for key,value in S.items()},
                    status=getattr(ctrl,'last',None),heads=S['heads'].tolist(),segs=S['segs'].tolist(),
                    pending=S['pending'],active=active,danger=danger))
            w.step(cmd)
            monitor.update(w.t,DT,active,danger)
            ag=w.snakes[0]; boost+=DT*bool(ag['boost'] and ag['sp']>10)
            if k%300==0:
                samples.append(dict(t=round(w.t,3),L=ag['L'],heads=count,active=active))
            if not ag['alive']:
                break
        a=monitor.result(); alive=bool(w.snakes[0]['alive'])
        population_fraction=1-w.spawn_wait_s/max(w.t*w.target_bots,1e-9)
        population_ok=population_fraction>=.99 and w.min_live_bots>=.9*w.target_bots
        result=dict(controller=name,setting=setting,seed=seed,valid=bool(population_ok),
            population_fraction=population_fraction,min_live_bots=w.min_live_bots,
            population_ok=bool(population_ok),spawn_wait_s=w.spawn_wait_s,
            seconds=w.t,requested_seconds=seconds,alive=alive,**a,
            success=bool(population_ok and alive and a['activity_ok']),L_start=initial,L_end=ag['L'],
            gain=ag['L']-initial,boost_fraction=boost/max(w.t,1e-9),
            decision_ms_p50=float(np.percentile(timings,50)*1000),
            decision_ms_p95=float(np.percentile(timings,95)*1000),
            decision_over_66ms=float(np.mean(np.array(timings)>2*DT)),
            head_count_range=[min_count,max_count],cause=ag.get('cause'),samples=samples,
            wall_seconds=time.monotonic()-t0)
        if trace_dir and (not alive or not a['activity_ok']):
            dest=Path(trace_dir)/f'{name}_{setting}_{seed}.json'
            dest.write_text(json.dumps(dict(result=result,tail=list(tail))))
            result['trace']=str(dest)
        return result
    except Exception as ex:
        # Invalid runs remain in the denominator of submitted jobs and invalidate target certification.
        return dict(controller=name,setting=setting,seed=seed,valid=False,error=repr(ex),wall_seconds=time.monotonic()-t0)


def interval(success,total):
    if not total: return [0.,1.]
    return [float(beta.ppf(.025,success,total-success+1)) if success else 0.,
            float(beta.ppf(.975,success+1,total-success)) if success<total else 1.]


def summarize(results):
    out={}
    for name,setting in sorted({(r['controller'],r['setting']) for r in results}):
        rows=[r for r in results if r['controller']==name and r['setting']==setting]
        valid=[r for r in rows if r['valid']]
        n=len(valid); success=sum(r['success'] for r in valid); alive=sum(r['alive'] for r in valid)
        ci=interval(success,n)
        out[f'{name}/{setting}']=dict(attempted=len(rows),valid=n,invalid=len(rows)-n,
            survival_rate=alive/n if n else 0,activity_success_rate=success/n if n else 0,
            success_ci95=ci,mean_life_s=float(np.mean([r['seconds'] for r in valid])) if n else 0,
            mean_gain=float(np.mean([r['gain'] for r in valid])) if n else 0,
            mean_off_fraction=float(np.mean([r['off_fraction'] for r in valid])) if n else 0,
            target_90_certified=bool(n==len(rows) and n and all(r['requested_seconds']>=600 for r in valid) and ci[0]>=.9))
    return out


def main(a):
    os.environ['OPENBLAS_NUM_THREADS']='1'
    out=Path(a.out)
    if out.exists(): raise SystemExit('Refusing to overwrite an existing experiment: '+str(out))
    rules=ActivityRules(**json.loads(Path(a.rules).read_text())) if a.rules else ActivityRules()
    paths=['active.py','sim_active.py','brain.py','geometry.py','activity.py','evaluate_active.py']
    snapshots=out.with_suffix('').as_posix()+'_sources'
    Path(snapshots).mkdir(exist_ok=False)
    for p in paths:
        (Path(snapshots)/p).write_bytes(Path(p).read_bytes())
    manifest=dict(at=time.strftime('%FT%T%z'),rules=rules.to_dict(),settings=SETTINGS,
        source_hashes={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths},
        args=vars(a),fixed_initial_length=100,decision_interval_s=2/30,
        source_snapshot=snapshots,
        note='Local model only. CI describes independent seed outcomes, not live-site performance.')
    out.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2))
    trace_dir=out.with_suffix('').as_posix()+'_traces'; Path(trace_dir).mkdir(exist_ok=True)
    jobs=[(n,s,a.seed0+i,a.seconds,rules.to_dict(),trace_dir) for n in a.controllers.split(',') for s in a.settings.split(',') for i in range(a.seeds)]
    results=[]
    partial=out.with_suffix('.jsonl')
    with ProcessPoolExecutor(max_workers=a.workers) as pool,partial.open('x') as log:
        for fut in as_completed([pool.submit(episode,j) for j in jobs]):
            r=fut.result(); results.append(r); log.write(json.dumps(r)+'\n'); log.flush()
            print(f"{r['controller']} {r['setting']} seed={r['seed']} valid={r['valid']} t={r.get('seconds',0):.1f} alive={r.get('alive')} activity={r.get('activity_ok')} {r.get('error','')}",flush=True)
    report=dict(manifest=manifest,results=sorted(results,key=lambda r:(r['controller'],r['setting'],r['seed'])),summary=summarize(results))
    out.write_text(json.dumps(report,indent=2))
    print(json.dumps(report['summary'],indent=2),flush=True)


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--controllers',default='straight,planner,active')
    ap.add_argument('--settings',default='normal')
    ap.add_argument('--seeds',type=int,default=10)
    ap.add_argument('--seed0',type=int,default=50000)
    ap.add_argument('--seconds',type=float,default=600)
    ap.add_argument('--workers',type=int,default=3)
    ap.add_argument('--rules')
    ap.add_argument('--out',default='runs/active_test.json')
    a=ap.parse_args()
    if a.seconds<=0 or a.seeds<1 or a.workers<1: ap.error('positive duration/seeds/workers required')
    if set(a.controllers.split(','))-{'active','straight','planner'}: ap.error('unknown controller')
    if set(a.settings.split(','))-SETTINGS.keys(): ap.error('unknown setting')
    main(a)
