"""Summarize recorded food-route intent and geometric approaches, not inferred consumption."""
import gzip,json,math,sys
from collections import Counter
from pathlib import Path
root=Path(sys.argv[1]); rec=json.loads((root/'slp_01.json').read_text()); data=json.load(gzip.open(root/'slp_01_log.json.gz','rt'))
rows=[dict(zip(data['keys'],r)) for r in data['log']]
seconds=Counter(); episodes=[]; episode=None
for i,r in enumerate(rows):
    dt=max(0,min(.5,rows[i+1]['t']-r['t'])) if i+1<len(rows) else 0
    intent=r.get('v6_intent','unrecorded');seconds[intent]+=dt
    g=(r.get('v6_goal_x'),r.get('v6_goal_y'))
    valid=intent=='food' and all(isinstance(x,(int,float)) for x in g)
    if episode and (not valid or math.dist(g,episode['goal'])>72):
        episodes.append(episode);episode=None
    if valid:
        d=math.dist((r['x'],r['y']),g)
        if episode is None:episode={'t0':r['t'],'t1':r['t'],'goal':g,'start_dist':d,'min_dist':d,'L0':r['L'],'L1':r['L']}
        episode.update(t1=r['t'],L1=r['L'],min_dist=min(d,episode['min_dist']))
if episode:episodes.append(episode)
long=[e for e in episodes if e['t1']-e['t0']>=.5]
end=rows[-1];begin=rows[0];duration=end['t']-begin['t'];total=sum(seconds.values())
out={'build':rec['ext'],'capped':rec.get('capped',False),'seconds':rec['seconds'],'L_max':rec['L_max'],'L_first':begin['L'],'L_last':end['L'],'net_L_per_min':round((end['L']-begin['L'])*60/max(duration,1),1),'best_rank':rec.get('best_rank'),'errors':rec['errors'],'decide_ms':rec['decide_ms'],'obs_to_cmd_ms':rec['obs_to_cmd_ms'],'setting_changes':len(rec.get('changes',[])), 'intent_seconds':{k:round(v,1) for k,v in seconds.items()},'intent_percent':{k:round(v/total*100,1) for k,v in seconds.items()},'food_target_episodes_05s':len(long),'approached_within_80px':sum(e['min_dist']<80 for e in long),'distance_reduced_100px':sum(e['start_dist']-e['min_dist']>100 for e in long),'approach_note':'Geometric approach to a selected target, not proof of eating that particular food; episodes may split on route invalidation.', 'modes':rec['modes'],'last3s':[{k:r.get(k) for k in ['t','L','mode','v6_intent','v6_reason','n_safe','gap_now','ttds','ttdh','pred25','herr25','boost']} for i,r in enumerate(rows) if r['t']>end['t']-3 and i%6==0]}
# Non-overlapping 3-second windows: >=300deg signed rotation, <100px net progress,
# and the whole window within 150px of its start. This is a measured motion pattern,
# not automatically a failure (a food patch can legitimately require turns).
windows=[]; win=[]; start=rows[0]['t']
for r in rows:
    if r['t']-start>=3 and win:
        a=win[0];z=win[-1]
        rotation=sum(math.atan2(math.sin(b['ang']-a0['ang']),math.cos(b['ang']-a0['ang'])) for a0,b in zip(win,win[1:]))
        net=math.dist((a['x'],a['y']),(z['x'],z['y']))
        span=max(math.dist((a['x'],a['y']),(q['x'],q['y'])) for q in win)
        if abs(rotation)>=math.radians(300) and net<100 and span<150:
            windows.append({'t0':a['t'],'t1':z['t'],'turn_deg':round(math.degrees(rotation)), 'net_px':round(net,1),'L_gain':z['L']-a['L'],'intent':Counter(q.get('v6_intent','unrecorded') for q in win).most_common(1)[0][0]})
        win=[];start=r['t']
    win.append(r)
out['tight_circle_windows_3s']=len(windows)
out['tight_circle_seconds']=round(sum(w['t1']-w['t0'] for w in windows),1)
out['tight_circle_low_gain_windows']=sum(w['L_gain']<5 for w in windows)
(root/'circling_windows.json').write_text(json.dumps(windows,ensure_ascii=False,indent=1))
(root/'food_analysis.json').write_text(json.dumps(out,ensure_ascii=False,indent=1));(root/'food_targets.json').write_text(json.dumps(episodes,ensure_ascii=False,indent=1))
print(json.dumps({k:v for k,v in out.items() if k!='last3s'},ensure_ascii=False,indent=1))
