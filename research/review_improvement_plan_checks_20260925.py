"""Bounded offline audit of the plan's oracle evaluator, without executing it as a script."""
from pathlib import Path
import ast,gzip,hashlib,json,pickle,sys
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import pilot
source=ROOT/'research/oracle_deaths_20260925.py'
tree=ast.parse(source.read_text())
functions=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('arr','realized')]
ns={'np':np,'pilot':pilot}
exec(compile(ast.Module(body=functions,type_ignores=[]),str(source),'exec'),ns)
saved=json.loads((ROOT/'research/oracle_deaths_20260925.json').read_text())
out={'hashes':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['IMPROVEMENT_PLAN_20260925.md','pilot.py','run_live.py','research/oracle_deaths_20260925.py','research/false_alarm_20260925.py']},
     'no_way_rows':[r for r in saved if r['category']=='no_way'],'coverage':[]}
manifest=json.loads((ROOT/'research/recent_runs_analysis_20260925.json').read_text())
for row in manifest['games']:
    if row.get('blackbox_error'):continue
    b=pickle.load(gzip.open(ROOT/'runs'/row['name']/'blackbox.pkl.gz'))
    ts=np.array([z['state']['t'] for z in b]);T=ts[-1]
    k=int(np.argmin(abs(ts-(T-1.2))));target=ts[k]+np.arange(1,16)*pilot.DT
    err=np.min(abs(ts[:,None]-target),axis=0)
    inspected=(err<=.06)
    out['coverage'].append(dict(game=row['name'],target_end_minus_last_observation_s=float(target[-1]-T),
        nearest_observation_errors=err.tolist(),skipped_steps=int((~inspected).sum()),
        targets_beyond_last_observation=int((target>T+1e-9).sum()),
        last_observed_time=float(T)))
# One point where no nearby-in-time state exists: g stays +inf and the caller counts this as safe.
ns['times_all']=np.array([0.])
st=[{'segs':np.array([[-1.,-1.,1.,1.,1.]])}]
x=ns['realized'](np.zeros((1,1,2)),0.,np.array([.08]),st,1.)[0]
out['missing_observation_counterexample']={'returned_gap':str(x),'caller_counts_safe':bool(x>0)}
# Constant observed states, body well away, but candidate well outside wall: wall is not inspected at all.
ns['times_all']=np.array([0.,.08])
st=[{'segs':np.array([[500.,500.,600.,500.,1.]]),'wall':(0.,0.,10.)}]*2
x=ns['realized'](np.array([[[20.,0.]]]),0.,np.array([.08]),st,1.)[0]
out['wall_counterexample']={'body_gap':float(x),'actual_wall_gap':-11.,'caller_counts_safe':bool(x>0)}
out['summary']={'no_way_games':len(out['no_way_rows']),
    'no_way_with_positive_candidates':sum(next(m for m in r['moments'] if m['before']==1.2)['oracle_safe']>0 for r in out['no_way_rows']),
    'games_with_skipped_steps':sum(r['skipped_steps']>0 for r in out['coverage']),
    'total_skipped_steps':sum(r['skipped_steps'] for r in out['coverage']),
    'games_with_endpoint_past_last_observation':sum(r['targets_beyond_last_observation']>0 for r in out['coverage'])}
p=ROOT/'research/review_improvement_plan_checks_20260925.json';p.write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({'summary':out['summary'],'missing':out['missing_observation_counterexample'],'wall':out['wall_counterexample']},indent=2))
print('skipped',[(r['game'],r['skipped_steps']) for r in out['coverage'] if r['skipped_steps']])
