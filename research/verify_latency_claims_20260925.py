"""Read-only analysis of existing P18 recordings and analytic toy geometry."""
from pathlib import Path
import gzip
import hashlib
import json
import pickle
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
def wrap(a):
    return (a+np.pi)%(2*np.pi)-np.pi

def agreement(t,a,cmd,lags,window=.06):
    want=np.sign(wrap(cmd-a)); big=np.abs(wrap(cmd-a))>np.radians(10)
    values=[]
    for lag in lags:
        a1=np.interp(t+lag,t,a); a2=np.interp(t+lag+window,t,a)
        ok=(t+lag>=t[0])&(t+lag+window<t[-1])&big
        values.append(float(np.mean((np.sign(a2-a1)==want)[ok])) if ok.any() else None)
    return values

def main():
    out={'hashes':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['pilot.py','run_live.py','research/game.js']}}
    lags=np.arange(0,.45,.03)
    rows=[]; curves=[]; expanded=[]
    neg_lags=np.arange(-.15,.451,.03)
    for p in sorted((ROOT/'runs').glob('live_20260925_17*/blackbox.pkl.gz')):
        try:
            b=pickle.load(gzip.open(p))
        except Exception as e:
            rows.append({'file':str(p.relative_to(ROOT)),'load_error':type(e).__name__}); continue
        t=np.array([r['state']['t'] for r in b]);a=np.unwrap([r['state']['ang'] for r in b])
        cmd=np.radians([r['last']['trace']['cmd'] for r in b])
        v=agreement(t,a,cmd,lags);curves.append(v)
        expanded.append(agreement(t,a,cmd,neg_lags))
        meta=json.loads(p.parent.with_suffix('.jsonl').read_text())
        rows.append({'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
                     'n':len(b),'loop_ms':meta.get('loop_ms'),'stage_ms':meta.get('stage_ms'),
                     'best_lag_ms':round(float(lags[np.argmax(v)])*1000),
                     'agreement_zero':v[0],'agreement_best':max(v)})
    out['p18_files']=rows
    out['original_sign_method']={'lags_ms':np.round(lags*1000).astype(int).tolist(),
        'game_mean_agreement':np.mean(curves,axis=0).tolist(),
        'expanded_lags_ms':np.round(neg_lags*1000).astype(int).tolist(),
        'expanded_agreement':np.mean(expanded,axis=0).tolist()}
    stages=[r['stage_ms']['obs_to_cmd'] for r in rows if 'stage_ms' in r]
    out['obs_to_cmd_summary']={'game_p50_range':np.ptp([s[0] for s in stages]).item(),
        'game_p50_minmax':[min(s[0] for s in stages),max(s[0] for s in stages)],
        'median_game_p50':float(np.median([s[0] for s in stages])),
        'game_p95_minmax':[min(s[1] for s in stages),max(s[1] for s in stages)]}
    # Known zero-delay synthetic system: periodic heading u, angle follows it exactly.
    # Algorithm compares heading error with a future 60ms window and cannot identify onset uniquely.
    t=np.arange(0,10,.01); a=.8*np.sin(2*np.pi*t/2)
    cmd=a.copy()
    out['synthetic_exact_tracking']={'true_delay_ms':0,'qualifying_samples':int((abs(wrap(cmd-a))>np.radians(10)).sum())}
    # Nonzero constant target error with sustained turning: indistinguishable delays.
    a=1.0*t;cmd=a+.5
    vals=agreement(t,a,cmd,lags)
    out['synthetic_sustained_turn']={'note':'Constant positive angular velocity and target 0.5 rad ahead: every lag matches.',
                                   'agreement':vals}
    # The 3 short games immediately preceding the quoted design discussion.
    out['p18b_three_deaths']=[]
    for name in ['live_20260925_183803','live_20260925_183834','live_20260925_183915']:
        meta=json.loads((ROOT/'runs'/f'{name}.jsonl').read_text());tr=meta['trace']
        b=pickle.load(gzip.open(ROOT/'runs'/name/'blackbox.pkl.gz'));T=b[-1]['state']['t']
        s=b[-1]['state']; p=np.array([s['x'],s['y']]);segs=s['segs']
        aa=segs[:,:2]; ab=segs[:,2:4]-aa
        q=aa+np.clip(((p-aa)*ab).sum(1)/np.maximum((ab*ab).sum(1),1e-9),0,1)[:,None]*ab
        d=np.linalg.norm(p-q,axis=1)-segs[:,4]-14.5*s['sc']
        j=int(np.argmin(d));sid=int(s['sid'][j])
        samples=[]
        for lead in [2.,1.,.5,0.]:
            z=min(b,key=lambda z:abs(z['state']['t']-(T-lead)));s0=z['state'];h=s0['heads'][s0['hid']==sid]
            samples.append({'lead_s':lead,'trace':z['last']['trace'],
                'nearest_body_owner_head':h[0].tolist() if len(h) else None,
                'head_dist':float(np.linalg.norm(h[0,:2]-[s0['x'],s0['y']])) if len(h) else None,
                'our_sp':s0['sp'],'our_sc':s0['sc']})
        start=T
        for x in reversed(tr):
            if x.get('mode')!='emergency':break
            start=x['t']
        out['p18b_three_deaths'].append({'file':name,'seconds':meta['seconds'],
            'terminal_emergency_s':T-start,'last_observed_body_gap':float(d[j]),
            'inferred_nearest_owner':sid,'samples':samples})
    v=180.;omega=np.radians(230);radius=v/omega
    out['toy_wall_geometry']={'speed_px_s':v,'omega_deg_s':230,'radius':radius,
        'turn90_s':float((np.pi/2)/omega),'definition':'g is free forward head clearance to a static infinite perpendicular wall; constant speed, turn after latency.',
        'required_gap_at_latency_100ms':v*.1+radius,'required_gap_at_latency_70ms':v*.07+radius,
        'at_gap60_latency100ms_safe':bool(60>v*.1+radius),'at_gap60_latency70ms_safe':bool(60>v*.07+radius),
        'saving30ms_cruise_px':v*.03,'saving30ms_boost_px':434*.03,
        'saving200ms_boost_px':434*.2}
    print(json.dumps(out,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
