import json,gzip,math
from pathlib import Path
raw=json.load(gzip.open('runs/v10_maze_cycle5_20261001_140421/slp_01_box.json.gz','rt'))['frames'];out=[]
for s in raw[::2]:
 if not s.get('selectedGuide'):continue
 q={k:s.get(k)for k in ['t','x','y','ang','sp','sc','L','wall','cmdHistory','actualCommand','selectedGuide','threat']};q.update(segs=[],sid=[],heads=[],hid=[],food=[],own=[])
 for i in range(0,len(s['segs']),5):
  a,b,c,d,r=s['segs'][i:i+5]
  if min(a,c)-r>s['x']+620 or max(a,c)+r<s['x']-620 or min(b,d)-r>s['y']+620 or max(b,d)+r<s['y']-620:continue
  q['segs']+=s['segs'][i:i+5];q['sid'].append(s['sid'][i//5])
 for i in range(0,len(s['heads']),5):
  if math.hypot(s['heads'][i]-s['x'],s['heads'][i+1]-s['y'])>1200:continue
  q['heads']+=s['heads'][i:i+5];q['hid'].append(s['hid'][i//5])
 for i in range(0,len(s['food']),3):
  if math.hypot(s['food'][i]-s['x'],s['food'][i+1]-s['y'])<500:q['food']+=s['food'][i:i+3]
 out.append(q)
Path('research/v10_maze_2h_20261001/feed_replay_states.json').write_text(json.dumps(out));print(len(out))
