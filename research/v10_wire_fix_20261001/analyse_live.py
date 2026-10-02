import gzip,json,math,hashlib,collections,sys
from pathlib import Path
out=Path('research/v10_wire_fix_20261001');run=Path(sys.argv[1] if len(sys.argv)>1 else 'runs/v10_wire_live_20261001_192903')
rec=json.loads((run/'slp_01.json').read_text());box=json.loads(gzip.decompress((run/'slp_01_box.json.gz').read_bytes()));log=json.loads(gzip.decompress((run/'slp_01_log.json.gz').read_bytes()));frames=box['frames'];trace=[dict(zip(log['keys'],r)) for r in log['log']]
pk=rec['track']['packets'];packets=[(pk[i]/1000,pk[i+1]) for i in range(0,len(pk),2)];by_byte=collections.defaultdict(list)
for t,b in packets:by_byte[b].append(t)
events={};bad=[];angles=[];gates=[];near_half=[]
for f in frames:
 for q in f.get('wireHistory',[]):
  if 'byte' not in q:continue
  key=(q['t'],q['byte']);events[key]=q
  if q['byte']<=250:
   err=abs(q['ang']-q['byte']*2*math.pi/251);angles.append(err)
   if err>1e-12:bad.append({'type':'angle','event':q})
  if not any(abs(t-q['t'])<=.0011 for t in by_byte[q['byte']]):bad.append({'type':'timestamp','event':q})
 if 'sendWaitMs' in f:gates.append((f['sendWaitMs'],f['boostWaitMs']))
 history=f.get('wireHistory',[]);active=next((q for q in reversed(history) if q['t']<=f['t']-rec['values']['TRACK_LAT']),f.get('wireNow'))
 if active:
  delta=math.atan2(math.sin(active['ang']-f['ang']),math.cos(active['ang']-f['ang']))
  if abs(abs(delta)-math.pi)<2*math.pi/251:near_half.append({'t':f['t'],'heading':f['ang'],'packet_target':active['ang'],'turn_sign':1 if delta>0 else -1})
end=frames[-1];ro=14.5*end['sc'];nearest=[]
for i in range(0,len(end['segs']),5):
 ax,ay,bx,by,r=end['segs'][i:i+5];dx,dy=bx-ax,by-ay;u=max(0,min(1,((end['x']-ax)*dx+(end['y']-ay)*dy)/max(1e-9,dx*dx+dy*dy)))
 nearest.append({'id':end['sid'][i//5],'physical_gap':math.hypot(end['x']-ax-u*dx,end['y']-ay-u*dy)-r-ro})
nearest.sort(key=lambda q:q['physical_gap'])
tail=[r for r in trace if r.get('t',0)>=end['t']-1]
res={'build':json.loads((run/'initial.json').read_text())['version'],'run':str(run),'seconds':rec['seconds'],'max_length':rec['L_max'],'capped':rec['capped'],'death':rec['death'],'server':rec['server'],'players':rec['players'],'errors':rec['errors'],'settings_changes':rec['changes'],'modes':rec['modes'],'decide_ms':rec['decide_ms'],'obs_to_cmd_ms':rec['obs_to_cmd_ms'],'saved_last_window_frames':len(frames),'verified_wire_events_in_saved_window':len(events),'packet_history_mismatches':len(bad),'mismatch_examples':bad[:5],'angle_max_error_rad':max(angles,default=None),'send_gate_range_ms':{'angle':[min(q[0] for q in gates),max(q[0] for q in gates)],'boost':[min(q[1] for q in gates),max(q[1] for q in gates)]} if gates else None,'near_half_turn_frames':len(near_half),'near_half_turn_examples':near_half[:5],'emergency_frames':sum(r.get('mode')=='v10emergency' for r in trace),'recovery_frames':sum(bool(r.get('v10_recovery')) for r in trace),'last_observed_nearest_bodies':nearest[:3],'last_second_trace':[{k:r.get(k) for k in ['t','mode','cmd','boost','v10_clear','v10_root_safe','v10_recovery','v10_recovery_terminal','v10_recovery_body_gap','trk_why']} for r in tail], 'raw_hashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in run.glob('slp_01*')},'limits':['Single live game does not establish improved survival rate.','Near-half-turn wire history is checked against packets, not proof of exact server turn response.','TRACK_LAT retained; future send gates and server response remain estimates.','Nearest body in last alive observation is not independently confirmed server killer.']}
assert len(events)>0,'no actual wire exposure';assert not bad,bad[:2]
(out/(sys.argv[2] if len(sys.argv)>2 else 'live_verification.json')).write_text(json.dumps(res,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in res.items() if k not in ['last_second_trace','raw_hashes','near_half_turn_examples','mismatch_examples']},ensure_ascii=False))
