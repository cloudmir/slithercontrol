import json,gzip,math,bisect,sys,statistics
from pathlib import Path
r=Path(sys.argv[1]);fs=json.loads(gzip.decompress((r/'slp_01_box.json.gz').read_bytes()))['frames'];hist={}
for f in fs:
 for c in f.get('cmdHistory',[]):hist[c['t']]=c['ang']
ht=sorted(hist);ha=[hist[t] for t in ht]
def wrap(x):return (x+math.pi)%(2*math.pi)-math.pi
def interp(x):
 xs=[1,1.5,2,2.5,3,3.5];ys=[230,215,176,147,126,110]
 if x<=xs[0]:return ys[0]*math.pi/180
 if x>=xs[-1]:return ys[-1]*math.pi/180
 i=bisect.bisect_right(xs,x)-1;return (ys[i]+(ys[i+1]-ys[i])*(x-xs[i])/(xs[i+1]-xs[i]))*math.pi/180
pairs=[]
for a,b in zip(fs,fs[1:]):
 dt=b['t']-a['t'];dh=wrap(b['ang']-a['ang'])
 if not .015<dt<.08 or abs(dh)>.5:continue
 if abs(dh)<.02:continue
 pairs.append((a['t'],dt,a['ang'],dh,interp(a['sc'])))
def loss(lag,scale,part):
 es=[]
 for t,dt,h,dh,w in part:
  j=bisect.bisect_right(ht,t+dt*.5-lag)-1
  if j<0:continue
  target=wrap(ha[j]-h);pred=max(-w*dt*scale,min(w*dt*scale,target));es.append(abs(wrap(dh-pred)))
 return sum(min(e,.3)**2 for e in es)/max(1,len(es))
mid=len(pairs)//2;train,test=pairs[:mid],pairs[mid:];rank=sorted((loss(l/100,sc/10,train),l/100,sc/10) for l in range(0,36) for sc in range(7,14));best=rank[0];out={'run':str(r),'frames':len(fs),'turn_pairs':len(pairs),'fit_first_half':{'lag':best[1],'scale':best[2],'loss':best[0]},'heldout_loss_baseline':loss(.17,1,test),'heldout_loss_fit':loss(best[1],best[2],test),'best10':rank[:10],'limits':'One-step heading fit using actual command history; excludes near-straight frames. Not server RTT, not closed-loop validation.'};(r/'turn_delay_fit.json').write_text(json.dumps(out,indent=2));print(json.dumps(out))
