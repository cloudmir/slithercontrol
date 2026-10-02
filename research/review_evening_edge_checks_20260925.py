"""Small offline counterexamples for evening review. No production edits."""
import ast, copy, hashlib, json, sys, types
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
src=ROOT/'research/evening_review_inputs/pilot_reviewed.py'
p=types.ModuleType('frozen_pilot');exec(compile(src.read_text(),str(src),'exec'),p.__dict__)
p.set_profile('aggressive')
c=p.Pilot();c(p._state(t=1.,food=np.array([[0.,600.,15.]]*12)))
pending=c.pend
c(p._state(t=1.03,segs=np.array([[-1000.,0.,1000.,0.,1000.]]),sid=np.array([1.])))
out=dict(pending_across_emergency=dict(before=pending,after=c.pend,mode=c.last['mode'],same_pending=c.pend==pending))
p.set_profile('safe')
c=p.Pilot();c.prev_boost=True;c.boost_since=0.
for t in [.90,.95]: c(p._state(t=t))
c_no_dwell=copy.deepcopy(c)
s=p._state(t=1.,heads=np.array([[100.,350.,-np.pi/2,6.,1.5]]),hid=np.array([4.]))
(a,b),_=c(s)
limit=p.BOOST_DWELL;p.BOOST_DWELL=0.
try: (a0,b0),_=c_no_dwell(s)
finally: p.BOOST_DWELL=limit
out['new_attack_after_recent_boost_off']=dict(profile='safe',boost_off_at=.95,attack_at=1.,
    normal=dict(boost=b,angle_deg=float(np.degrees(a)),mode=c.last['mode'],predicted_gap=c.last['trace']['hard']),
    without_dwell=dict(boost=b0,angle_deg=float(np.degrees(a0)),mode=c_no_dwell.last['mode'],predicted_gap=c_no_dwell.last['trace']['hard']),
    note='Synthetic same observed state and same controller history; only BOOST_DWELL differs. Not a demonstrated death.')
path=ROOT/'research/oracle_deaths_20260925.py'
tree=ast.parse(path.read_text());ns={'np':np,'pilot':p}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['arr','realized']],type_ignores=[]),str(path),'exec'),ns)
ns['times_all']=np.array([0.])
x=ns['realized'](np.zeros((1,1,2)),0.,np.array([.08]),[{'segs':np.array([[-1.,-1.,1.,1.,1.]])}],1.)[0]
out['oracle_missing_observation']=dict(gap=str(x),counted_safe=bool(x>0))
ns['times_all']=np.array([0.,.08])
x=ns['realized'](np.array([[[20.,0.]]]),0.,np.array([.08]),[{'segs':np.array([[500.,500.,600.,500.,1.]]),'wall':(0.,0.,10.)}]*2,1.)[0]
out['oracle_wall']=dict(body_gap=float(x),wall_gap=-11,counted_safe=bool(x>0))
out['hashes']={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [src,path,ROOT/'research/false_alarm_20260925.py',ROOT/'run_live.py',ROOT/'CHANGES_20260925_evening.md']}
(ROOT/'research/review_evening_edge_checks_20260925.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps(out,ensure_ascii=False,indent=2))
