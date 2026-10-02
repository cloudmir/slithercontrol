import gzip,json,sys,math,collections
from pathlib import Path
import numpy as np
p=Path(sys.argv[1]);a=json.load(gzip.open(p/'slp_01_log.json.gz','rt'));rows=[dict(zip(a['keys'],r)) for r in a['log']];sec=rows[-1]['t']-rows[0]['t'];route=[r for r in rows if r['mode']=='v10route'];switch=[];last=None
for r in rows:
 if r.get('v10_route_id'):
  if last and r['v10_route_id']!=last['v10_route_id']:switch.append({'t':r['t'],'before':last['v10_route_id'],'after':r['v10_route_id'],'oldrisk':last.get('v10_closure_risk'),'newrisk':r.get('v10_closure_risk'),'dt':r['t']-last['t']})
  last=r
rev=0;lastturn=0
for a,b in zip(rows,rows[1:]):
 d=(b['cmd']-a['cmd']+180)%360-180
 if abs(d)>45:
  if d*lastturn<0:rev+=1
  lastturn=d
q=lambda k:{str(n):round(float(np.percentile([r[k] for r in rows if r.get(k) is not None],n)),2) for n in [50,95,99]} if any(r.get(k) is not None for r in rows) else {}
out={'build':json.load(open(p/'slp_01.json'))['ext'],'seconds':sec,'route_percent':len(route)/len(rows)*100,'route_switches':len(switch),'switches_per_min':len(switch)*60/sec,'low_risk_switches':sum((r['oldrisk'] or 0)<=.75 for r in switch),'large_command_reversals_per_min':rev*60/sec,'pellet_detour_percent':sum((r.get('v10_pellet_value')or 0)>0 for r in rows)/len(rows)*100,'pred25':q('pred25'),'herr25':q('herr25'),'command_age':q('v10_result_age_ms'),'switches':switch,'limits':'Route IDs can change after invalidation/completion; low-risk switches alone do not prove an erroneous switch. Reversal is command change, not actual head reversal.'}
(p/'route_metrics.json').write_text(json.dumps(out,indent=2));print(json.dumps({k:v for k,v in out.items() if k!='switches'},indent=2))
