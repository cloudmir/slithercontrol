"""Offline, fixed-input audit. Does not start a browser or modify production code.
Inputs frozen under research/evening_review_inputs; output is not survival evidence.
"""
import copy, gzip, hashlib, json, os, pickle, re, types
from pathlib import Path
import numpy as np
os.environ['PILOT_MODE'] = 'aggressive'
ROOT = Path(__file__).resolve().parents[1]
SNAP = ROOT/'research/evening_review_inputs'

def load(path, name, instrument=False):
    src = path.read_text()
    if instrument:
        src = src.replace('        for h in heads:          # 3.c:', '        review_cut = np.zeros(2*C)\n        for h in heads:          # 3.c:')
        src = src.replace('            score += W_CUT*cut', '            score += W_CUT*cut\n            review_cut += W_CUT*cut')
        src = src.replace('        if ring and coil_hard > HARD:', '        review_before_dwell = None\n        if ring and coil_hard > HARD:')
        src = src.replace('            if bool(bst[i]) != self.prev_boost and s[\'t\']-self.boost_since < BOOST_DWELL:', '            review_before_dwell = i\n            if bool(bst[i]) != self.prev_boost and s[\'t\']-self.boost_since < BOOST_DWELL:')
        src = src.replace('        held_i = 2*C-1', '''        self.review = dict(wrap=wrap_esc is not None, attacker=attacker is not None,
            cut_selected=float(review_cut[i]), cut_any=bool(review_cut.any()),
            dwell_changed=bool(review_before_dwell is not None and bst[i] != bst[review_before_dwell]),
            boost_before=bool(bst[review_before_dwell]) if review_before_dwell is not None else None,
            boost_after=bool(bst[i]), hard_before=float(hard[review_before_dwell]) if review_before_dwell is not None else None,
            hard_after=float(hard[i]), t_since_boost=float(s['t']-self.boost_since),
            why_coil_mismatch=bool(mode=='coil' and abs(coil_hard-min(gap_static[i],gap_heads[i]))>.2))
        held_i = 2*C-1''')
    mod = types.ModuleType(name)
    exec(compile(src, str(path), 'exec'), mod.__dict__)
    return mod

def state(r):
    s = dict(r['state'])
    for k, w in [('segs',5),('heads',5),('food',3),('own',2)]: s[k]=np.asarray(s[k],float).reshape(-1,w)
    for k in ['sid','hid']: s[k]=np.asarray(s[k],float)
    return s

def metrics(a,b,t,m):
    a,b,t=np.array(a),np.array(b),np.array(t)
    mins=(t[-1]-t[0])/60
    back=sum(abs(old.wrap(a[k]-a[k-1]))>np.pi/2 and
        (abs(old.wrap(a[(t>t[k]) & (t<=t[k]+.25)]-a[k-1]))<np.radians(20)).any() for k in range(1,len(t)))
    return dict(boost_toggles_min=float(np.count_nonzero(np.diff(b))/mins), returns_min=float(back/mins),
        emergency_share=m.count('emergency')/len(m))

old=load(SNAP/'before_maneuver.py','old')
new=load(SNAP/'pilot_reviewed.py','new',True)
games=re.findall(r'^_20260925_\d{6}', (ROOT/'research/replay_flap_20260925.txt').read_text(), re.M)
rows=[]; examples=[]; cut_examples=[]; counters={k:0 for k in ['ticks','wrap_ticks','wrap_cut_available','wrap_cut_selected','dwell_changes','dwell_in_attack','dwell_in_wrap','dwell_blocks_boost_on_in_attack','coil_why_mismatch','cut_ablation_tested','cut_ablation_command_changed']}
for game in games:
    path=ROOT/'runs'/('live'+game)/'blackbox.pkl.gz'
    box=pickle.load(gzip.open(path))
    co,cn=old.Pilot(),new.Pilot()
    values=[[[],[],[],[]],[[],[],[],[]]]
    for r in box:
        s=state(r)
        # Keep a pre-call state for a bounded one-step ablation. The main replay is unchanged.
        prior=copy.deepcopy(cn) if counters['cut_ablation_tested']<60 else None
        for ctrl,v in zip((co,cn),values):
            (a,b),_=ctrl(s); v[0].append(a);v[1].append(b);v[2].append(s['t']);v[3].append(ctrl.last['mode'])
        d=cn.review; counters['ticks']+=1
        counters['wrap_ticks']+=d['wrap']; counters['wrap_cut_available']+=d['wrap'] and d['cut_any']
        counters['wrap_cut_selected']+=d['wrap'] and d['cut_selected']>0
        counters['coil_why_mismatch']+=d['why_coil_mismatch']
        if d['dwell_changed']:
            counters['dwell_changes']+=1; counters['dwell_in_attack']+=d['attacker']; counters['dwell_in_wrap']+=d['wrap']
            counters['dwell_blocks_boost_on_in_attack']+=d['attacker'] and d['boost_before'] and not d['boost_after']
            if len(examples)<5 or (d['attacker'] and d['boost_before'] and not d['boost_after'] and len(examples)<12):
                examples.append(dict(game=game,t=s['t'],mode=cn.last['mode'],**d))
        if prior is not None and d['wrap'] and d['cut_any']:
            counters['cut_ablation_tested']+=1
            wc=new.W_CUT;new.W_CUT=0
            try: (a0,b0),_=prior(s)
            finally: new.W_CUT=wc
            changed=abs(new.wrap(a0-values[1][0][-1]))>1e-8 or b0!=values[1][1][-1]
            counters['cut_ablation_command_changed']+=changed
            if changed and len(cut_examples)<6:
                cut_examples.append(dict(game=game,t=s['t'],with_cut=[values[1][0][-1],values[1][1][-1]],without_cut=[a0,b0],exit=cn.last['trace']['esc'],hard_with=cn.last['trace']['hard'],hard_without=prior.last['trace']['hard']))
    row=dict(game=game,frames=len(box),old=metrics(*values[0]),new=metrics(*values[1]))
    rows.append(row);print(json.dumps(row),flush=True)
out=dict(note='Open-loop replay, initialized at the start of each saved terminal window. Not full-game or survival evidence.',
    inputs={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [SNAP/'before_maneuver.py',SNAP/'pilot_reviewed.py']},
    rows=rows,counters=counters,dwell_examples=examples,cut_examples=cut_examples,
    medians={version:{key:float(np.median([r[version][key] for r in rows])) for key in rows[0][version]} for version in ['old','new']})
(ROOT/'research/review_evening_changes_20260925.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps({k:out[k] for k in ['counters','medians','cut_examples']},ensure_ascii=False),flush=True)
