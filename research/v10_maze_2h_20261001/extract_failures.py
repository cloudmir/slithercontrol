import gzip,json,sys,bisect
from pathlib import Path
r=Path(sys.argv[1]);out=Path(sys.argv[2]);rows=[json.loads(x) for x in (r/'game_01_trace_live.jsonl').read_text().splitlines()];ts=[q['t'] for q in rows];result=[];last=-100
with gzip.open(r/'game_01_observations.jsonl.gz','rt') as f:
 for line in f:
  s=json.loads(line)['state'];i=max(0,bisect.bisect_right(ts,s['t'])-1);q=rows[i]
  if s['t']-last<1 or q.get('mode')=='v10route' or not q.get('v10_root_safe'):continue
  result.append(s);last=s['t']
out.write_text(json.dumps(result));print(json.dumps([{'t':s['t'],'routes':len(s.get('route',{}).get('routes',[])),'reason':s.get('route',{}).get('reason')} for s in result]))
