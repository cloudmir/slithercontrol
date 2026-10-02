import collections,gzip,json
from pathlib import Path
H=Path(__file__).resolve().parent;R=H.parents[1];names=['t2_20261002_082349','t2_20261002_083430'];d=json.loads((H/'data.json').read_text());games=[g for g in d['games'] if g['run'] in names];levels=[q for q in d['levels'] if q['run'] in names];death=next(q for q in d['deaths'] if q['kind']=='death_candidate' and q['run'] in names);run=R/'runs'/death['run'];frames=json.load(gzip.open(run/'slp_11_box.json.gz'))['frames']
from report import nearest
curve=[]
for f in frames:
 if f['t']>=28:
  q=nearest(f,436)
  if q:curve.append([f['t'],q['gap'],f['sp']])
a={'games':games,'levels':levels,'death':death,'curve':curve,'reasons':dict(collections.Counter(x for g in games for x in g['excluded']))}
s=(H/'summary_template.html').read_text().replace('__DATA__',json.dumps(a,ensure_ascii=False).replace('</','<\\/'));(H/'summary.html').write_text(s)
