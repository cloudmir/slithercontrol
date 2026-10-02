import gzip,json,sys,math,bisect
import numpy as np
from pathlib import Path
p=Path(sys.argv[1]);raw=json.load(gzip.open(p/'slp_01_box.json.gz','rt'))['frames'];frames=[]
for s in raw:
 heads={h:s['heads'][i*5:i*5+5]for i,h in enumerate(s['hid'])};w={h['id']:h['w']for h in (s.get('threat')or{}).get('heads',[])};targets={h['id']:h for h in s.get('headTargets',[])};frames.append((s['t'],s['x'],s['y'],heads,w,targets))
del raw;times=[s[0]for s in frames];errs={mode:{t:[]for t in [.1,.2,.3,.5,.75,1]}for mode in ['old','target']}
def predict(h,w,dt,mode,target):
 v=h[3]*31;angle=h[2]
 if mode=='target':
  delta=(target['target']-angle+math.pi)%(2*math.pi)-math.pi
  rate=math.radians(float(np.interp(h[4],[1,1.5,2,2.5,3,3.5],[230,215,176,147,126,110])))
  w=math.copysign(rate,delta);turn=min(dt,abs(delta)/rate)
 else: w=max(-2,min(2,w));turn=dt
 a=angle+w*turn/2;factor=math.sin(w*turn/2)/(w*turn/2)if abs(w*turn)>1e-8 else 1
 return [(h[0]+speed*(turn*factor*math.cos(a)+(dt-turn)*math.cos(angle+w*turn)),h[1]+speed*(turn*factor*math.sin(a)+(dt-turn)*math.sin(angle+w*turn)))for speed in [v,max(v,434)]]
for s in frames[::3]:
 for horizon in errs['old']:
  j=bisect.bisect_left(times,s[0]+horizon)
  if j>=len(frames)or abs(times[j]-s[0]-horizon)>.045:continue
  nxt=frames[j];dt=nxt[0]-s[0]
  for hid,h in s[3].items():
   if hid not in nxt[3]or hid not in s[5]or math.hypot(h[0]-s[1],h[1]-s[2])>800:continue
   q=nxt[3][hid]
   if math.hypot(q[0]-h[0],q[1]-h[1])>600*dt+30:continue
   for mode in errs:
    pts=predict(h,s[4].get(hid,0),dt,mode,s[5][hid]);errs[mode][horizon].append(min(math.hypot(q[0]-x,q[1]-y)for x,y in pts))
r={'run':str(p),'limitations':'Same matched observations; overlapping samples; current target may change later; not survival validation.','errors':{mode:{str(t):{'n':len(e),'p50':round(float(np.percentile(e,50)),2),'p95':round(float(np.percentile(e,95)),2),'p99':round(float(np.percentile(e,99)),2)}for t,e in es.items()if e}for mode,es in errs.items()}}
(p/'head_target_errors.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
