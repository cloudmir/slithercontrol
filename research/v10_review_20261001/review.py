import json,gzip,hashlib,math,collections
from pathlib import Path
p=Path('research/v10_review_20261001'); page=json.loads((p/'page_0.json').read_text()); record=page['record']
box=json.load(gzip.open(p/'page_0_box.json.gz')); log=json.load(gzip.open(p/'page_0_log.json.gz')); rows=[dict(zip(log['keys'],r)) for r in log['log']]
frames=[]
for f in box['frames']:
 if f['t']<58.5:continue
 nearest=None
 for i in range(0,len(f['segs']),5):
  x,y,bx,by,r=f['segs'][i:i+5];dx=bx-x;dy=by-y;u=max(0,min(1,((f['x']-x)*dx+(f['y']-y)*dy)/max(1e-12,dx*dx+dy*dy)));d=math.hypot(f['x']-x-u*dx,f['y']-y-u*dy)-r
  if nearest is None or d<nearest['head_center_to_body_surface']:
   tangent=math.atan2(dy,dx);angle=abs((f['ang']-tangent+math.pi)%(2*math.pi)-math.pi)
   nearest={'sid':f['sid'][i//5],'head_center_to_body_surface':d,'heading_vs_segment_degrees':math.degrees(angle)}
 frames.append({k:f[k] for k in ['t','ang','cmd','actualCommand']}|{'nearest':nearest})
summary={'build':page['version'],'seconds':record['seconds'],'ticks':record['ticks'],'errors':record['errors'],'decide_ms':record['decide_ms'],'obs_to_cmd_ms':record['obs_to_cmd_ms'],'route_reason_counts':dict(collections.Counter(r.get('cause') for r in rows)),'route_count_counts':dict(collections.Counter(r.get('v10_routes') for r in rows)),'tracker_reason_counts':dict(collections.Counter(r.get('trk_why') for r in rows)),'last_frames':frames,'limitations':['Last alive frame is not the exact server collision position.','One completed live game; not evidence of failure rate across games.','Expired fallback is observed; whether a different late command would prevent death remains unproven.','Map budget counts are decision frames reusing route results, not independent planner executions.']}
(p/'analysis.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
paths=['ext/pilot.js','ext/mod.js','params.json',str(p/'page_0.json'),str(p/'page_0_box.json.gz'),str(p/'page_0_log.json.gz')]
parts=['# V10 actual live failure review, 2026-10-01','## Input SHA256',json.dumps({x:hashlib.sha256(Path(x).read_bytes()).hexdigest() for x in paths},indent=2),'## Derived log observations (reproducible by review.py)',json.dumps(summary,ensure_ascii=False,indent=2)]
for file,a,b in [('ext/mod.js',634,645),('ext/pilot.js',2153,2165),('ext/pilot.js',2210,2235)]:
 lines=Path(file).read_text().splitlines();parts+=['## '+file, '\n'.join(f'{i+1}: {lines[i]}' for i in range(a-1,b))]
(p/'source.txt').write_text('\n\n'.join(parts))
print(json.dumps({k:v for k,v in summary.items() if k!='last_frames'},ensure_ascii=False,indent=2));print('last_frame',frames[-1])
