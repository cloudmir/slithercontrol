"""Same descriptive low-progress turning metric for both live runs."""
import json,gzip,math,sys
from pathlib import Path
for folder in sys.argv[1:]:
 p=Path(folder);d=json.load(gzip.open(p/'slp_01_log.json.gz','rt'));rs=[dict(zip(d['keys'],a)) for a in d['log']];bins={}
 for r in rs:bins.setdefault(int(r['t']//5),[]).append(r)
 events=[];total=0
 for rows in bins.values():
  if rows[-1]['t']-rows[0]['t']<4.5:continue
  total+=1
  path=sum(math.hypot(b['x']-a['x'],b['y']-a['y']) for a,b in zip(rows,rows[1:]));net=math.hypot(rows[-1]['x']-rows[0]['x'],rows[-1]['y']-rows[0]['y'])
  turn=sum(abs(math.atan2(math.sin(b['ang']-a['ang']),math.cos(b['ang']-a['ang']))) for a,b in zip(rows,rows[1:]))
  if path>100 and net/path<.3 and turn>math.pi:
   events.append({'t0':rows[0]['t'],'t1':rows[-1]['t'],'path_px':round(path),'net_px':round(net),'turn_deg':round(turn*180/math.pi),'gain':rows[-1]['L']-rows[0]['L'],'food_fraction':round(sum(r.get('v6_intent')=='food' for r in rows)/len(rows),2)})
 result={'definition':'5s windows with net displacement/path length <0.3 and total absolute heading change >180deg; includes loops and oscillation, not all are failures','windows':total,'low_progress_turning':len(events),'share_percent':round(len(events)*100/max(total,1),1),'low_gain_events':sum(e['gain']<5 for e in events),'events':events}
 (p/'turning_analysis.json').write_text(json.dumps(result,indent=1));print(folder,{k:v for k,v in result.items() if k not in ['events','definition']})
