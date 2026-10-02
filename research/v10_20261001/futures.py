import json,gzip
from pathlib import Path
out=Path('research/v10_20261001');fixtures=json.load(open(out/'fixtures.json'));data={};past={}
for p in sorted(set(f['source'] for f in fixtures)):
 F=json.load(gzip.open(p))['frames'];selected=[]
 for entry in [f for f in fixtures if f['source']==p]:
  t=entry['frame']['t'];future=[]
  past[p+':'+str(entry['before'])]=[min(F,key=lambda f:abs(f['t']-(t-dt))) for dt in [.2,.1]]
  for step in range(1,12):
   stamp=t+step*.1
   if stamp>F[-1]['t']:break
   f=min(F,key=lambda f:abs(f['t']-stamp))
   if abs(f['t']-stamp)>.06:continue
   future.append({k:f[k] for k in ['t','segs','heads','hid','sc','wall']})
  data[p+':'+str(entry['before'])]=future
(out/'past.json').write_text(json.dumps(past));(out/'futures.json').write_text(json.dumps(data));print(len(data))
