import collections,gzip,json,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;run=ROOT/'runs/t2_20261002_082349'
def update():
 s=json.loads((run/'summary.json').read_text());games=[]
 for g in s['games']:
  k=g['game'];rows=[json.loads(x) for x in (run/f'game_{k:02}_trace_live.jsonl').read_text().splitlines()];frames=json.load(gzip.open(run/f'slp_{k:02}_box.json.gz'))['frames'];valid=[r for r in rows if r.get('t2_valid')];dt=[b['t']-a['t'] for a,b in zip(frames,frames[1:])];errors=[]
  for suffix in [f'slp_{k:02}.json',f'slp_{k:02}_log.json.gz',f'slp_{k:02}_box.json.gz']:
   try:
    f=run/suffix;json.loads(gzip.decompress(f.read_bytes()) if suffix.endswith('.gz') else f.read_text())
   except Exception as e:errors.append(str(e))
  games.append({'game':k,'seconds':g['seconds'],'observations':g['follow_samples'],'valid_ticks':len(valid),'stable_levels':g['levels'],'boost_frames':sum(r['sp']>8 for r in frames),'max_frame_interval_s':max(dt,default=0),'measurement_exclusions':dict(collections.Counter(r.get('t2_reason') for r in rows if r.get('t2_enemy_r') and not r.get('t2_valid'))),'death_exclusions':g['excluded'],'file_errors':errors})
 a={'run':str(run.relative_to(ROOT)),'build':s['build'],'updated':time.strftime('%F %T'),'ended':s.get('ended'),'games':games};(HERE/'monitor.json').write_text(json.dumps(a,ensure_ascii=False,indent=2));lines=['# T2 판별 수집 점검',f"\n갱신 {a['updated']} · 빌드 {a['build']} · 원본 {a['run']}",'\n대상 관측은 유효 측정 수가 아니다. 안정 단계가 있어야 간격 경계의 근거로 사용할 수 있다.','\n|판|초|대상 관측|유효 틱|안정 단계|부스트속도 프레임|파일 오류|','|---|---:|---:|---:|---:|---:|---:|']
 for g in games:lines.append('|'+ '|'.join(str(g[x]) for x in ['game','seconds','observations','valid_ticks','stable_levels','boost_frames'])+'|'+str(len(g['file_errors']))+'|')
 for g in games:lines.extend([f"\n## {g['game']}판",'측정 제외: '+json.dumps(g['measurement_exclusions'],ensure_ascii=False),'사망 경계 제외: '+', '.join(g['death_exclusions'])])
 (HERE/'PER_GAME.md').write_text('\n'.join(lines));return bool(s.get('ended'))
if __name__=='__main__':
 while True:
  try:
   if update():break
  except Exception as e:print(repr(e),flush=True)
  time.sleep(10)
