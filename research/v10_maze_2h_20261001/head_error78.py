import gzip,json,sys,math,bisect
import numpy as np
from pathlib import Path
out=[]
for name in sys.argv[1:]:
 p=Path(name);raw=json.load(gzip.open(p/'slp_01_box.json.gz','rt'))['frames'];frames=[]
 for s in raw:
  heads={h:s['heads'][i*5:i*5+5]for i,h in enumerate(s['hid'])};w={h['id']:h['w']for h in (s.get('threat')or{}).get('heads',[])};frames.append((s['t'],s['x'],s['y'],heads,w))
 del raw;times=[s[0]for s in frames];errs={t:[]for t in [.1,.2,.3,.5,.75,1]};outside={t:0 for t in errs};total={t:0 for t in errs}
 for s in frames[::3]:
  for horizon in errs:
   j=bisect.bisect_left(times,s[0]+horizon)
   if j>=len(frames)or abs(times[j]-s[0]-horizon)>.045:continue
   nxt=frames[j];dt=nxt[0]-s[0]
   for hid,h in s[3].items():
    if hid not in nxt[3]or math.hypot(h[0]-s[1],h[1]-s[2])>800:continue
    q=nxt[3][hid]
    if math.hypot(q[0]-h[0],q[1]-h[1])>600*dt+30:continue
    w=max(-2,min(2,s[4].get(hid,0)));a=h[2]+w*dt/2;factor=math.sin(w*dt/2)/(w*dt/2)if abs(w*dt)>1e-8 else 1
    pts=[(h[0]+v*dt*factor*math.cos(a),h[1]+v*dt*factor*math.sin(a))for v in [h[3]*31,max(h[3]*31,434)]];err=min(math.hypot(q[0]-x,q[1]-y)for x,y in pts);errs[horizon].append(err)
    unc=12*min(dt,1.5)+float(np.interp(min(dt,.35),[0,.1,.2,.3,.4],[0,9,21,39,68]));total[horizon]+=1;outside[horizon]+=err>unc
 r={'run':name,'measure':'Actual enemy position vs closest cruise/boost constant-turn forecast, turn clipped2rad/s. Near heads<=800px, stride3. Descriptive samples overlap, no independent confidence guarantee.','errors':{str(t):{'n':len(e),'p50':round(float(np.percentile(e,50)),2),'p95':round(float(np.percentile(e,95)),2),'p99':round(float(np.percentile(e,99)),2),'outside_existing_envelope':outside[t]/total[t]}for t,e in errs.items()if e}};out.append(r)
Path('research/v10_maze_2h_20261001/head_errors78.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
