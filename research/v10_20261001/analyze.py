"""Reproducible predeath geometry labels (not causal ground truth) and raw calibration evidence."""
import gzip,json,math,hashlib,statistics,collections
from pathlib import Path
OUT=Path('research/v10_20261001')
def read(p):return json.load(gzip.open(p) if str(p).endswith('.gz') else open(p))
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def pct(x,q):return round(sorted(x)[min(len(x)-1,int(len(x)*q))],3) if x else None
def nearest(f):
 a=[];ro=14.5*f['sc'];S=f['segs']
 for i in range(0,len(S),5):
  x,y,b,c,r=S[i:i+5];dx=b-x;dy=c-y;u=max(0,min(1,((f['x']-x)*dx+(f['y']-y)*dy)/max(dx*dx+dy*dy,1e-9)));xx=x+u*dx;yy=y+u*dy
  a.append((math.hypot(f['x']-xx,f['y']-yy)-ro-r,f['sid'][i//5],r,xx,yy))
 return sorted(a)
def features(f):
 n=nearest(f);ro=14.5*f['sc'];heads=f['heads'];hg=min((math.hypot(heads[i]-f['x'],heads[i+1]-f['y'])-ro-14.5*heads[i+4] for i in range(0,len(heads),5)),default=1e6)
 sectors=set();left=right=False
 for gap,id,r,x,y in n:
  if gap>300:continue
  a=math.atan2(y-f['y'],x-f['x']);sectors.add(int((a+math.pi)*24/(2*math.pi))%24)
  rel=(a-f['ang']+math.pi)%(2*math.pi)-math.pi
  if gap<100 and abs(rel)<2.4:
   left|=rel<0;right|=rel>0
 wall=f['wall'][2]-math.hypot(f['x']-f['wall'][0],f['y']-f['wall'][1])-ro
 tags=[]
 if hg<120:tags.append('head_intercept')
 if len(sectors)>=15:tags.append('encirclement')
 if left and right:tags.append('bilateral_corridor')
 if wall<150:tags.append('arena_wall')
 if n and n[0][0]<60:tags.append('body_contact')
 if not tags:tags=['unresolved']
 return dict(tags=tags,head_gap=hg,body_gap=n[0][0] if n else None,coverage=len(sectors)/24,wall_gap=wall)
rows=[];fixtures=[];speed=collections.defaultdict(list);caps=0;hashes={};timings=[]
for run in ['cycle4_20260927_140522','cycle5confirm_20260927_181535','v2live3_20260929_091255']:
 d=Path('runs')/run;summary=read(d/'summary.json')
 for game in summary['games']:
  k=game['k'];p=d/f'slp_{k:02d}_box.json.gz'
  if not p.exists():continue
  if game.get('capped'):caps+=1;continue
  b=read(p);F=b['frames'];end=F[-1]['t'];hashes[str(p)]=digest(p)
  sample=[min(F,key=lambda f:abs(f['t']-(end-dt))) for dt in [8,4,2,1,.25]]
  seq=[dict(t=f['t'],**features(f)) for f in sample];tags=sorted(set(t for q in seq[-3:] for t in q['tags']))
  rows.append(dict(path=str(p),ext=b.get('ext'),seconds=game['seconds'],predeath=seq,tags=tags))
  for dt,f in zip([8,4,2,1,.25],sample):fixtures.append(dict(source=str(p),before=dt,frame=f))
  for a,f in zip(F,F[1:]):
   dt=f['t']-a['t']
   if not .015<dt<.12:continue
   v=math.hypot(f['x']-a['x'],f['y']-a['y'])/dt
   if v<800:speed['own_boost' if f['sp']>12 else 'own_cruise' if f['sp']<8 else 'own_ramp'].append(v)
   H={id:a['heads'][5*i:5*i+5] for i,id in enumerate(a['hid'])}
   for i,id in enumerate(f['hid']):
    if id not in H:continue
    h=f['heads'][5*i:5*i+5];old=H[id];v=math.hypot(h[0]-old[0],h[1]-old[1])/dt
    if v<800:speed['enemy_boost' if h[3]>12 else 'enemy_cruise' if h[3]<8 else 'enemy_ramp'].append(v)
  if game.get('decide_p95') is not None:timings.append(game['decide_p95'])
  print(run,k,flush=True)
probe=[]
for run in ['probe_20260928_113252','probe2_20260928_120148','probe3_20260928_122443']:
 for p in sorted((Path('runs')/run).glob('slp_*_log.json.gz')):
  L=read(p);rowslog=[dict(zip(L['keys'],r)) for r in L['log']];fol=[r for r in rowslog if r.get('pph')==1 and r.get('pgap') is not None];hashes[str(p)]=digest(p)
  if not fol:continue
  last=fol[-1];held=[r for r in fol if r['pset']==last['pset'] and r['t']>last['t']-.5]
  probe.append(dict(source=str(p),our_r=last['sc']*14.5,enemy_r=last['ptr'],last_gap=last['pgap'],last_follow_age=rowslog[-1]['t']-last['t'],held_gap_range=[min(r['pgap'] for r in held),max(r['pgap'] for r in held)],target_id=last['ptid'],exact_boundary=False))
result=dict(deaths=len(rows),excluded_caps=caps,labels=dict(collections.Counter(t for r in rows for t in r['tags'])),label_type='overlapping geometric predeath indicators, not verified causes',speed={k:dict(n=len(v),p50=pct(v,.5),p95=pct(v,.95),p99=pct(v,.99)) for k,v in speed.items()},probe_samples=len(probe),exact_boundary=False,probe_warning='last alive sample is not contact time; curved tracking, other attackers and latency confound thresholds',source_hashes=hashes)
(OUT/'analysis.json').write_text(json.dumps(result,indent=2));(OUT/'deaths.json').write_text(json.dumps(rows));(OUT/'probe_samples.json').write_text(json.dumps(probe));(OUT/'fixtures.json').write_text(json.dumps(fixtures));print(json.dumps({k:v for k,v in result.items() if k!='source_hashes'},indent=2))
