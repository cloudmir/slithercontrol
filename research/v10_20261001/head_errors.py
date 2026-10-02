import json,math,collections,statistics
from pathlib import Path
out=Path('research/v10_20261001');F=json.load(open(out/'fixtures.json'));past=json.load(open(out/'past.json'));future=json.load(open(out/'futures.json'));errors=collections.defaultdict(list)
for f in F:
 if 'cycle4_' not in f['source']:continue
 key=f['source']+':'+str(f['before']);s=f['frame'];old=past[key][-1];dt=s['t']-old['t'];hist={id:old['heads'][i*5:i*5+5] for i,id in enumerate(old['hid'])}
 for i,id in enumerate(s['hid']):
  h=s['heads'][i*5:i*5+5]
  if math.hypot(h[0]-s['x'],h[1]-s['y'])>1000:continue
  w=0 if id not in hist or dt<=0 else max(-2,min(2,((h[2]-hist[id][2]+math.pi)%(2*math.pi)-math.pi)/dt))
  for q in future[key]:
   if id not in q.get('hid',[]):continue
   j=q['hid'].index(id);real=q['heads'][j*5:j*5+5];t=q['t']-s['t'];a=h[2]+w*t/2;factor=math.sin(w*t/2)/(w*t/2) if abs(w*t)>1e-8 else 1
   # Residual to either maintained-speed or instant-boost forecast.
   err=min(math.hypot(real[0]-h[0]-math.cos(a)*v*t*factor,real[1]-h[1]-math.sin(a)*v*t*factor) for v in [h[3]*31,434])
   errors[round(t,1)].append(err)
result={t:dict(n=len(v),p50=statistics.median(v),p90=sorted(v)[int(.9*len(v))],p95=sorted(v)[int(.95*len(v))]) for t,v in sorted(errors.items())}
(out/'head_errors.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
