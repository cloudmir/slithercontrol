import json,gzip,math,sys
from pathlib import Path
out=Path(sys.argv[1]); reports=[]
for p in sorted(out.glob('slp_[0-9][0-9].json')):
 r=json.loads(p.read_text());b=json.load(gzip.open(p.with_name(p.stem+'_box.json.gz')));l=json.load(gzip.open(p.with_name(p.stem+'_log.json.gz')));rows=[dict(zip(l['keys'],x)) for x in l['log']];end=b['frames'][-1]['t'];tail=[x for x in rows if x['t']>=end-3];f=b['frames'][-1]
 jumps=[]
 for a,c in zip(tail,tail[1:]):
  if a.get('cmd') is not None and c.get('cmd') is not None:
   delta=abs((c['cmd']-a['cmd']+180)%360-180)
   if delta>=90:jumps.append({'t':c['t'],'degrees':round(delta,1),'mode':c['mode']})
 bad=[x for x in tail if x.get('n_safe')==0];heads=[]
 for i in range(0,len(f['heads']),5):
  x,y,h,sp,sc=f['heads'][i:i+5];heads.append({'id':f['hid'][i//5],'center_distance':round(math.hypot(x-f['x'],y-f['y']),1),'sp':sp})
 heads.sort(key=lambda x:x['center_distance'])
 d={'game':p.stem,'end':end,'last3s_decisions':len(tail),'last3s_boost_decisions':sum(bool(x.get('boost')) for x in tail),'last3s_turn_jumps90':jumps,'first_no_safe_before_end_s':round(end-bad[0]['t'],3) if bad else None,'last3s_root_unsafe':sum(x.get('v10_root_safe') is False or x.get('v10_root_safe')==0 for x in tail),'last3s_checked_min':min(x.get('v10_checked',999) for x in tail),'nearest_final_heads':heads[:2],'changes':r['changes'],'freezes':r.get('freezes')}
 reports.append(d)
(out/'details.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(json.dumps(reports,ensure_ascii=False,indent=2))
