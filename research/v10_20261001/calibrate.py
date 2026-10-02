import json,gzip,math,statistics,collections,hashlib
from pathlib import Path
out=Path('research/v10_20261001');groups=collections.defaultdict(lambda:dict(alive=[],terminal=[],games=set()));rows=[]
for run in ['probe_20260928_113252','probe2_20260928_120148','probe3_20260928_122443']:
 for p in sorted((Path('runs')/run).glob('slp_*_log.json.gz')):
  L=json.load(gzip.open(p));R=[dict(zip(L['keys'],r)) for r in L['log']];window=[]
  for r in R:
   if r.get('pph')!=1 or r.get('pgap') is None:window=[];continue
   if window and (r['ptid']!=window[-1]['ptid'] or r['pset']!=window[-1]['pset'] or r['t']-window[-1]['t']>.15):window=[]
   window.append(r);window=[q for q in window if r['t']-q['t']<=.6]
   if r['t']-window[0]['t']<.45:continue
   key=(int(r['sc']*14.5//5)*5,int(r['ptr']//10)*10);g=groups[key];g['games'].add(str(p));g['alive'].append(statistics.median(q['pgap'] for q in window))
  last=R[-1]
  if last.get('pph')==1 and last.get('pgap') is not None:
   key=(int(last['sc']*14.5//5)*5,int(last['ptr']//10)*10);groups[key]['terminal'].append(last['pgap']);groups[key]['games'].add(str(p))
for (ro,rt),g in sorted(groups.items()):
 rows.append(dict(our_radius_bin=[ro,ro+5],enemy_radius_bin=[rt,rt+10],games=sorted(g['games']),alive_windows=len(g['alive']),alive_gap_min=min(g['alive']) if g['alive'] else None,last_alive_gap=g['terminal'],exact_death_boundary=None,applied_offset=0))
(out/'thickness_bins.json').write_text(json.dumps(rows,indent=2))
# Remove unresolved from a game with any concrete geometric indicator. Keep all
# per-frame indicators; none is a causal claim about actual server collision.
a=json.load(open(out/'analysis.json'));deaths=json.load(open(out/'deaths.json'))
for d in deaths:
 if len(d['tags'])>1:d['tags']=[t for t in d['tags'] if t!='unresolved']
a['labels']=dict(collections.Counter(t for d in deaths for t in d['tags']));a['thickness_bins']=len(rows)
(out/'analysis.json').write_text(json.dumps(a,indent=2));(out/'deaths.json').write_text(json.dumps(deaths));print(a['labels'],len(rows))
