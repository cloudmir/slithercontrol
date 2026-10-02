"""Follow-up diagnostics of goal semantics, boost persistence and observed speed."""
from pathlib import Path
import gzip,json,pickle
import numpy as np
from analyze_recent_runs_20260925 import ROOT,pct,wrap

data=json.loads((ROOT/'research/recent_runs_analysis_20260925.json').read_text())
out={'goal':{'checked':0,'score_matched':0,'high_score':0,'high_score_without_remains':0,'examples':[]},'games':[]}
duration_on=[];duration_off=[];speedrat=[];coil=[]
for row in data['games']:
    p=ROOT/'runs'/f"{row['name']}.jsonl";r=json.loads(p.read_text());tr=r['trace']
    t=np.array([z['t'] for z in tr]);b=np.array([z['boost'] for z in tr]);L=np.array([z['L'] for z in tr])
    change=np.r_[0,np.flatnonzero(b[1:]!=b[:-1])+1,len(b)]
    local=[]
    for a,e in zip(change[:-1],change[1:]):
        if e==len(b):continue # last interval censored
        dur=float(t[e]-t[a]);(duration_on if b[a] else duration_off).append(dur)
        local.append((dur,bool(b[a])))
    growing=[]
    for t0 in np.arange(t[0],t[-1]-5,5):
        m=(t>=t0)&(t<t0+5)
        if m.sum()>2:growing.append(dict(net=int(L[m][-1]-L[m][0]),boost=float(np.mean(b[m]))))
    o=dict(name=row['name'],boost_toggle_runs=len(local),boost_on_duration=pct([x for x,y in local if y]),
           boost_off_duration=pct([x for x,y in local if not y]),windows=growing)
    if 'blackbox_error' in row:out['games'].append(o);continue
    box=pickle.load(gzip.open(p.with_suffix('')/'blackbox.pkl.gz'));bt=np.array([z['state']['t'] for z in box])
    # Sample all fourth states to reconstruct the same logged food goal score; no policy execution.
    for z in box[::4]:
        s=z['state'];f=s['food'];trace=z['last']['trace']
        if not len(f):continue
        dist=np.linalg.norm(f[:,:2]-[s['x'],s['y']],axis=1);f=f[dist<3000]
        if not len(f):continue
        val=np.where(f[:,2]>=12,4*f[:,2],f[:,2]);keys,inv=np.unique(np.floor(f[:,:2]/250).astype(int),axis=0,return_inverse=True)
        mass=np.bincount(inv,val);centres=(keys+.5)*250;gd=np.linalg.norm(centres-[s['x'],s['y']],axis=1);k=int(np.argmax(mass/(gd+400)))
        out['goal']['checked']+=1
        matched=abs(float(mass[k])-trace['goal'])<.11
        out['goal']['score_matched']+=int(matched)
        if not matched or trace['goal']<144:continue
        out['goal']['high_score']+=1
        grains=f[inv==k];none=not (grains[:,2]>=12).any()
        out['goal']['high_score_without_remains']+=int(none)
        if none and len(out['goal']['examples'])<5:
            out['goal']['examples'].append(dict(game=row['name'],lead_s=float(bt[-1]-s['t']),score=trace['goal'],grains=len(grains),
                    max_food_size=float(grains[:,2].max()),distance_to_cell=float(gd[k]),mode=trace['mode'],boost=trace['boost']))
    # 0.2s chord speed / integral of reported sp*31. Spatial corrections/turning/time skew all affect it.
    for i in range(0,len(box),5):
        k=int(np.argmin(abs(bt-(bt[i]+.2))))
        if k<=i or abs(bt[k]-bt[i]-.2)>.045:continue
        a,c=box[i]['state'],box[k]['state'];pred=sum((bt[j+1]-bt[j])*(box[j]['state']['sp']+box[j+1]['state']['sp'])*31/2 for j in range(i,k))
        actual=np.hypot(a['x']-c['x'],a['y']-c['y'])
        if pred>0:speedrat.append(float(actual/pred))
    o['coil_rows']=[]
    for z in box:
        if z['last']['trace']['mode']=='coil':
            s=z['state'];coil.append((row['name'],s['t'],s['sp'],s['sc'],z['last']['trace']['hard']))
            o['coil_rows'].append(dict(t=s['t'],sp=s['sp'],sc=s['sc'],hard=z['last']['trace']['hard']))
    out['games'].append(o)
out['summary']={'boost_on_duration':pct(duration_on),'boost_off_duration':pct(duration_off),
 'boost_on_under100ms':float(np.mean(np.array(duration_on)<.1)),
 'boost_off_under100ms':float(np.mean(np.array(duration_off)<.1)),
 'observed_chord_vs_sp31_ratio_200ms':pct(speedrat),
 'ratio_over1_25':float(np.mean(np.array(speedrat)>1.25)),
 'goal_high_without_remains_share':out['goal']['high_score_without_remains']/max(out['goal']['high_score'],1),
 'coil_ticks':len(coil),'coil_games':sorted(set(x[0] for x in coil)),
 'coil_hard_under5':sum(x[4]<5 for x in coil),
 'five_sec_windows':sum(len(x['windows']) for x in out['games']),
 'nonpositive_growth_windows':sum(z['net']<=0 for x in out['games'] for z in x['windows'])}
(ROOT/'research/recent_runs_followup_20260925.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({'summary':out['summary'],'goal':out['goal']},ensure_ascii=False,indent=2))
