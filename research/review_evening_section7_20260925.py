"""Bounded review of section 7. Read current production code; no live run or source edits."""
import ast,copy,gzip,hashlib,json,pickle,sys,textwrap
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import pilot as p
out={}
p.set_profile('safe');c=p.Pilot();c.prev_boost=True;c.boost_since=0.
for t in [.90,.95]: c(p._state(t=t))
c(p._state(t=1.,heads=np.array([[100.,350.,-np.pi/2,6.,1.5]]),hid=np.array([4.])))
out['attack_after_boost_off']=c.last['trace']
p.set_profile('aggressive');c=p.Pilot()
c(p._state(t=1.,food=np.array([[0.,600.,15.]]*12)));before=c.pend
c(p._state(t=1.03,segs=np.array([[-1000.,0.,1000.,0.,1000.]]),sid=np.array([1.])))
out['pending_emergency']={'before':before,'after':c.pend,'mode':c.last['mode']}
p.set_profile('safe');q=np.linspace(0,2*np.pi,73);xy=400*np.column_stack((np.cos(q),np.sin(q)))
c=p.Pilot();c(p._state(segs=np.column_stack((xy[:-1],xy[1:],np.full(72,25.))),sid=np.arange(72.)))
out['held_fail_counterexample']=c.last['trace']
f=ROOT/'research/oracle_deaths_20260925.py';tree=ast.parse(f.read_text());ns={'np':np,'pilot':p}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['arr','realized']],type_ignores=[]),str(f),'exec'),ns)
far={'segs':np.array([[500.,500.,600.,500.,1.]]),'wall':(0.,0.,10000.)}
ns['times_all']=np.array([0.]);gap=ns['realized'](np.zeros((1,1,2)),0.,np.array([.08]),[far],1.)[0]
out['oracle_missing_is_unknown']=bool(np.isnan(gap))
ns['times_all']=np.array([.08]);wall=dict(far,wall=(0.,0.,10.))
out['oracle_wall_gap']=float(ns['realized'](np.array([[[20.,0.]]]),0.,np.array([.08]),[wall],1.)[0])
# Independently recalculate the stored planner_ok example with the current evaluator.
game='live_20260925_171431';box=pickle.load(gzip.open(ROOT/'runs'/game/'blackbox.pkl.gz'))
ts=np.array([r['state']['t'] for r in box]);k=int(np.argmin(abs(ts-(ts[-1]-1.2))));s=box[k]['state']
prev,pb=box[k-1]['cmd'];hd,bst=box[k]['cmd']
pos,t=p.paths(np.array([s['x'],s['y']]),s['ang'],s['sp'],s['sc'],prev,np.array([hd]),np.array([bst]),pb)
ns['times_all']=ts;g=ns['realized'](pos,s['t'],t,[r['state'] for r in box],p.R*s['sc'])[0]
rows=json.loads((ROOT/'research/oracle_deaths_20260925.json').read_text())
row=next(r for r in rows if r['game'].endswith('171431'))
out['planner_ok_counterexample']=dict(game=game,stored=row,recomputed_chosen_gap=float(g))
# Execute the actual false-alarm evaluator's observation loop on a missing-middle example.
src=(ROOT/'research/false_alarm_20260925.py').read_text()
a=src.index('        for m, dt in enumerate(v[\'t\']):');b=src.index('        if accepted:',a)
code=textwrap.dedent(src[a:b]);code=code.replace('if not seen: continue','if not seen: raise RuntimeError("no observations")')
def eval_partial(times,states):
 env=dict(np=np,pilot=p,arr=ns['arr'],ts=np.array(times),states=states,s={'t':0.},
          v={'t':np.array([.08,.16,.24])},pos=np.zeros((3,2)),ro=1.,g=np.inf,seen=[])
 exec(code,env);return dict(gap=float(env['g']),seen=env['seen'])
near={'segs':np.array([[-1.,0.,1.,0.,1.]]),'wall':far['wall']}
out['false_alarm_missing_middle']=dict(partial=eval_partial([.08,.24],[far,far]),
    complete=eval_partial([.08,.16,.24],[far,near,far]),note='Synthetic example: skipped middle can hide contact; no claim that all 18 misses or 59 false alarms are wrong.')
out['hashes']={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['pilot.py','run_live.py','CHANGES_20260925_evening.md','research/oracle_deaths_20260925.py','research/false_alarm_20260925.py','records/claim-pilot-live-20260925.md']}
out['record_bytes']=(ROOT/'records/claim-pilot-live-20260925.md').stat().st_size
path=ROOT/'research/review_evening_section7_20260925.json';path.write_text(json.dumps(out,ensure_ascii=False,indent=2,default=lambda v:v.item()))
print(json.dumps(out,ensure_ascii=False,indent=2,default=lambda v:v.item()))
