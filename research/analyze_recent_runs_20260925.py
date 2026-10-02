"""Offline P18 movement audit; no browser/production imports or mutations.

All movement diagnostics use stored observations, not server collision truth.
"""
from pathlib import Path
import collections
import gzip
import hashlib
import json
import pickle
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SHA = 'ddffaf1dc2a8f6a561d04e15cb477fddcee3f26a4c2192a5c638850bddf93920'
def wrap(a): return (a+np.pi)%(2*np.pi)-np.pi
def pct(a):
    a=np.asarray(a, float)
    return dict(n=len(a),p10=float(np.percentile(a,10)),p50=float(np.median(a)),p90=float(np.percentile(a,90))) if len(a) else None
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def gap(s):
    g=s['segs'].astype(float);p=np.array([s['x'],s['y']]);ab=g[:,2:4]-g[:,:2]
    q=g[:,:2]+np.clip(((p-g[:,:2])*ab).sum(1)/np.maximum((ab*ab).sum(1),1e-9),0,1)[:,None]*ab
    d=np.linalg.norm(p-q,axis=1)-g[:,4]-14.5*s['sc']
    return d,int(np.argmin(d))
def coverage(s,owner):
    g=s['segs'][s['sid']==owner].astype(float)
    if not len(g):return 0.
    p=np.array([s['x'],s['y']]);ab=g[:,2:4]-g[:,:2]
    q=g[:,:2]+np.clip(((p-g[:,:2])*ab).sum(1)/np.maximum((ab*ab).sum(1),1e-9),0,1)[:,None]*ab
    near=np.linalg.norm(p-q,axis=1)-g[:,4]<500
    mid=(g[:,:2]+g[:,2:4])/2-p
    bins=((np.arctan2(mid[:,1],mid[:,0])+np.pi)/(2*np.pi)*24).astype(int)%24
    return len(np.unique(bins[near]))/24
def spans(t,on):
    starts=np.flatnonzero(on&~np.r_[False,on[:-1]])
    stops=np.flatnonzero(on&~np.r_[on[1:],False])
    return [(float(t[a]),float(t[b]),int(a),int(b)) for a,b in zip(starts,stops)]
def movement(t,xy,ang,cmd,end,width=5):
    m=(t>=end-width)&(t<=end)
    if m.sum()<10 or np.ptp(t[m])<width-.25:return None
    distance=np.linalg.norm(np.diff(xy[m],axis=0),axis=1).sum()
    yaw=np.diff(np.unwrap(ang[m]));a=cmd[m]
    return dict(straightness=float(np.linalg.norm(xy[m][-1]-xy[m][0])/max(distance,1e-9)),
                distance=float(distance),net_yaw_deg=float(np.degrees(yaw.sum())),
                abs_yaw_deg=float(np.degrees(abs(yaw).sum())),
                cmd_jumps90=int((abs(wrap(np.diff(a)))>np.pi/2).sum()))
def head_predictions(h,omega):
    tt=np.arange(1,16)*.08;rate=(14-np.interp(h[4],[1,1.4,1.9,2.6,3.5],[5.79,5.89,6.12,6.33,6.83]))/.57
    wlim=np.radians(np.interp(h[4],[1,2,3.5],[230,200,130]));omega=np.clip(omega,-wlim,wlim)
    out=[]
    for w in ([0,omega] if abs(omega)>.5 else [0]):
        a=h[2]+w*(tt-.04);u=np.c_[np.cos(a),np.sin(a)]
        for v in [np.full(15,max(h[3],4)),np.minimum(14,max(h[3],4)+rate*tt)]:
            out.append(h[:2]+np.cumsum(u*(v*31*.08)[:,None],axis=0))
    return np.array(out)

def main():
    result={'scope':'2026-09-25 P18 finished games at/after 17:06:51, fixed recorded controller hash',
            'code_hash':SHA,'current_files':{f:digest(ROOT/f) for f in ['pilot.py','run_live.py','deaths.py','batch_stats.py']},
            'games':[],'excluded':[]}
    modes=collections.Counter();totals=collections.Counter();allwins=[];errors={h:[] for h in [.32,.64,.96]}
    for path in sorted((ROOT/'runs').glob('live_20260925_*.jsonl')):
        if path.name<'live_20260925_170651.jsonl':continue
        try:r=json.loads(path.read_text())
        except Exception as e:result['excluded'].append({'path':str(path.relative_to(ROOT)),'error':type(e).__name__});continue
        if r.get('status')!='finished' or r.get('code_sha256')!=SHA:continue
        tr=r['trace'];t=np.array([x['t'] for x in tr]);dt=np.r_[np.diff(t),0.]
        cmd=np.radians([x['cmd'] for x in tr]);boost=np.array([x['boost'] for x in tr]);L=np.array([x['L'] for x in tr])
        goal=np.array([x['goal'] for x in tr]);hard=np.array([x['hard'] for x in tr]);ns=np.array([x['n_safe'] for x in tr]);th=np.array([x['threat'] for x in tr])
        ms=np.array([x['mode'] for x in tr]);wr=np.array([x['wrap'] for x in tr]);T=t[-1]
        for key in np.unique(ms):modes[key]+=float(dt[ms==key].sum())
        totals['observed_s']+=float(dt.sum());totals['boost_s']+=float(dt[boost].sum());totals['goal144_s']+=float(dt[goal>=144].sum())
        totals['goal_positive_s']+=float(dt[goal>0].sum());totals['safe_s']+=float(dt[ns>0].sum())
        jumps=abs(wrap(np.diff(cmd)))>np.pi/2
        totals['jumps90']+=int(jumps.sum());totals['boost_toggles']+=int((boost[1:]!=boost[:-1]).sum())
        # Repeated ABC where B departs >90 degrees and C returns within 20 degrees of A, all within .25 s.
        aba=[]
        for i in np.flatnonzero(jumps):
            k=np.flatnonzero((t>t[i+1])&(t<=t[i]+.25)&(abs(wrap(cmd-cmd[i]))<np.radians(20)))
            if len(k):aba.append((int(i),int(k[0])))
        recent=t>=T-5
        row={'name':path.stem,'source_sha256':digest(path),'runner_sha256':r.get('runner_sha256'),'profile':r.get('profile'),
             'reason':r['reason'],'seconds':r['seconds'],'L_max':r['L_max'],'L_start':int(L[0]),'L_end':int(L[-1]),
             'growth_peak_per_min':float((L.max()-L[0])/(T-t[0])*60),'growth_net_per_min':float((L[-1]-L[0])/(T-t[0])*60),
             'L_increases_sum':int(np.maximum(np.diff(L),0).sum()),'L_decreases_sum':int(np.maximum(-np.diff(L),0).sum()),
             'boost_share_time':float(dt[boost].sum()/dt.sum()),'goal144_share_time':float(dt[goal>=144].sum()/dt.sum()),
             'last5_goal144':bool((goal[recent]>=144).any()),'last_boost':bool(boost[-1]),'last_safe':int(ns[-1]),'last_hard':float(hard[-1]),
             'jumps90_per_min':float(jumps.sum()/(T-t[0])*60),'aba_returns':len(aba),
             'stage_ms':r.get('stage_ms'),'last_trace':tr[-1],
             'samples':[{**min(tr,key=lambda x:abs(x['t']-(T-lead))),'lead_target':lead} for lead in [5,2,1,.5,0]]}
        # Value of goal>=144 is a cluster score, not confirmation of pursuing remains.
        # Distinct exposure episodes are just descriptive, never classified as successful attacks.
        row['threat_runs_last5']=len(spans(t[recent],th[recent]>0))
        bp=path.with_suffix('')/'blackbox.pkl.gz'
        try:box=pickle.load(gzip.open(bp))
        except Exception as e:row['blackbox_error']=type(e).__name__;result['games'].append(row);continue
        row['blackbox_sha256']=digest(bp)
        bt=np.array([z['state']['t'] for z in box]);B=bt[-1]
        xy=np.array([[z['state']['x'],z['state']['y']] for z in box]);ang=np.array([z['state']['ang'] for z in box]);bc=np.array([z['cmd'][0] for z in box])
        row['box_seconds']=float(np.ptp(bt));row['motion_end5']=movement(bt,xy,ang,bc,B);row['motion_base5']=movement(bt,xy,ang,bc,B-15)
        row['client_md_share_box']=float(np.average([z['state']['boost'] for z in box[:-1]],weights=np.diff(bt)))
        err=wrap(bc-ang);flip=(np.sign(err[1:])!=np.sign(err[:-1]))&(abs(err[1:])>np.radians(30))&(abs(err[:-1])>np.radians(30))
        row['turn_side_flips_last5']=int(flip[bt[1:]>=B-5].sum())
        row['box_aba_examples']=[]
        for i in np.flatnonzero(abs(wrap(np.diff(bc)))>np.pi/2):
            ks=np.flatnonzero((bt>bt[i+1])&(bt<=bt[i]+.25)&(abs(wrap(bc-bc[i]))<np.radians(20)))
            if len(ks):
                k=ks[0]
                row['box_aba_examples'].append(dict(before_end_s=float(B-bt[i]),duration=float(bt[k]-bt[i]),
                    cmd_deg=np.degrees(bc[[i,i+1,k]]).tolist(),actual_yaw_deg=float(np.degrees(wrap(ang[k]-ang[i]))),
                    modes=[box[j]['last']['trace']['mode'] for j in [i,i+1,k]],
                    safe=[box[j]['last']['trace']['n_safe'] for j in [i,i+1,k]]))
        for end in np.arange(bt[0]+5,B+.001,5):
            m=movement(bt,xy,ang,bc,end)
            if m:allwins.append(dict(game=path.stem,lead_s=float(B-end),**m))
        dd,j=gap(box[-1]['state']);owner=int(box[-1]['state']['sid'][j]);row['nearest_body_owner']=owner;row['last_body_gap']=float(dd[j])
        # Quantized coverage is angular occupancy, not proof of a closed loop.
        cov=np.array([coverage(z['state'],owner) for z in box[::4]]);ct=bt[::4]
        row['nearest_owner_cov_max']=float(cov.max());row['coverage_samples']=[]
        for threshold in [.4,.5,.9]:
            idx=np.flatnonzero(cov>=threshold)
            if len(idx):
                z=box[int(idx[0])*4];s=z['state'];o=dict(threshold=threshold,lead_s=float(B-s['t']),observed_cover=float(cov[idx[0]]),
                     x=float(s['x']),y=float(s['y']),ang_deg=float(np.degrees(s['ang'])),**z['last']['trace'])
                row['coverage_samples'].append(o)
        row['state_samples']=[]
        for lead in [5,2,1,.5,0]:
            z=min(box,key=lambda z:abs(z['state']['t']-(B-lead)));s=z['state'];d,j=gap(s)
            hs=s['heads'];hm=s['hid']==owner;h=hs[hm]
            food=s['food'];dist=np.linalg.norm(food[:,:2]-[s['x'],s['y']],axis=1) if len(food) else np.zeros(0)
            row['state_samples'].append(dict(lead_target=lead,lead_actual=float(B-s['t']),pos=[s['x'],s['y']],angle_deg=float(np.degrees(s['ang'])),
                  sp=s['sp'],observed_sc=s['sc'],nearest_gap=float(d[j]),nearest_id=int(s['sid'][j]),
                  owner_head=h[0].tolist() if len(h) else None,owner_head_distance=float(np.linalg.norm(h[0,:2]-[s['x'],s['y']])) if len(h) else None,
                  remains_near150=int(((dist<150)&(food[:,2]>=12)).sum()) if len(food) else 0,
                  **z['last']['trace']))
        # Does recent heading extrapolation cover later observed head positions? Paired observation, not counterfactual.
        last_sample=-1e9
        for i,z in enumerate(box):
            s=z['state']
            if i==0 or bt[i]-last_sample<.4 or B-bt[i]<1.:continue
            last_sample=bt[i];previous=box[i-1]['state']
            for hid,h in zip(s['hid'],s['heads']):
                if np.linalg.norm(h[:2]-xy[i])>=900:continue
                h0=previous['heads'][previous['hid']==hid]
                omega=float(wrap(h[2]-h0[0,2])/(bt[i]-bt[i-1])) if len(h0) and .01<bt[i]-bt[i-1]<.25 else 0.
                pred=head_predictions(h,omega)
                for horizon,step in [(.32,3),(.64,7),(.96,11)]:
                    k=int(np.argmin(abs(bt-(bt[i]+horizon))))
                    if abs(bt[k]-bt[i]-horizon)>.045:continue
                    ss=box[k]['state'];future=ss['heads'][ss['hid']==hid]
                    if not len(future):continue
                    d=float(np.linalg.norm(pred[:,step]-future[0,:2],axis=1).min())
                    errors[horizon].append(dict(game=path.stem,error_px=d,combined_radius=float(14.5*(s['sc']+h[4]))))
        result['games'].append(row)
    rows=result['games'];valid=[r for r in rows if 'blackbox_error' not in r]
    result['summary']={'games':len(rows),'blackboxes':len(valid),'seconds':pct([r['seconds'] for r in rows]),
       'L_max':pct([r['L_max'] for r in rows]),'growth_peak_per_min':pct([r['growth_peak_per_min'] for r in rows]),
       'growth_net_per_min':pct([r['growth_net_per_min'] for r in rows]),'total_observed_seconds':totals['observed_s'],
       'mode_share_time':{k:v/totals['observed_s'] for k,v in modes.items()},
       'boost_share_time':totals['boost_s']/totals['observed_s'],'goal144_share_time':totals['goal144_s']/totals['observed_s'],
       'goal_positive_share_time':totals['goal_positive_s']/totals['observed_s'],'safe_share_time':totals['safe_s']/totals['observed_s'],
       'jumps90_per_min':totals['jumps90']/totals['observed_s']*60,'boost_toggles_per_min':totals['boost_toggles']/totals['observed_s']*60,
       'aba_returns':sum(r['aba_returns'] for r in rows),'last5_goal144_games':sum(r['last5_goal144'] for r in rows),
       'last_boost_games':sum(r['last_boost'] for r in rows),'last_safe_positive_games':sum(r['last_safe']>0 for r in rows),
       'turn_side_flips_last5':pct([r['turn_side_flips_last5'] for r in valid]),
       'box_seconds':pct([r['box_seconds'] for r in valid]),'movement_windows':len(allwins),
       'movement_low_straightness_share':float(np.mean([w['straightness']<.3 for w in allwins])),
       'low_straightness_large_net_turn_share':float(np.mean([abs(w['net_yaw_deg'])>180 for w in allwins if w['straightness']<.3])),
       'end5_straightness':pct([r['motion_end5']['straightness'] for r in valid if r['motion_end5']]),
       'base5_straightness':pct([r['motion_base5']['straightness'] for r in valid if r['motion_base5']]),
       'head_forecast_errors':{str(h):{'min_distance_to_modeled_head_endpoints':pct([e['error_px'] for e in es]),
          'outside_combined_radius_share':float(np.mean([e['error_px']>e['combined_radius'] for e in es]))} for h,es in errors.items()}}
    result['movement_windows']=allwins
    out=ROOT/'research/recent_runs_analysis_20260925.json';out.write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result['summary'],ensure_ascii=False,indent=2))

if __name__=='__main__':main()
