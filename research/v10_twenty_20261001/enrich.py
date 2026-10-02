import time,json,gzip,sys,hashlib
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent))
from report import render
run=Path(sys.argv[1]);last_signature=None
while True:
 try:
  raw=(run/'summary.json').read_bytes();summary=json.loads(raw);signature=(len(summary['games']),bool(summary.get('completed')),summary.get('error'))
  if signature!=last_signature:
   for a in summary['games']:
    k=a['game'];cameras=[json.loads(q) for q in (run/f'game_{k:02}_camera.jsonl').read_text().splitlines()]
    with gzip.open(run/f'game_{k:02}_observations.jsonl.gz','rt') as f:observations=[json.loads(q) for q in f]
    # Align Python monotonic capture time with the logged page/game time using
    # actual paired observations, rather than treating both clocks as identical.
    wanted=a['last_observation_at']-.55
    anchor=min(observations,key=lambda q:abs(q['state']['t']-wanted))
    eligible=[q for q in cameras if q['t']<=anchor['elapsed']]
    shot=(eligible[-1] if eligible else cameras[0]);paired=min(observations,key=lambda q:abs(q['elapsed']-shot['t']))
    image=Image.open(run/shot['file']).convert('RGB');image.thumbnail((900,650));image.save(run/f'death_{k:02}.jpg',quality=62)
    a.update(photo=f'death_{k:02}.jpg',photo_at=shot['t'],photo_game_at=paired['state']['t'],photo_alignment='Captured Python time aligned through paired observation; nearest preceding ~0.55s before last logged position; not exact death instant',photo_source=shot['file'])
    (run/f'analysis_{k:02}.json').write_text(json.dumps(a,ensure_ascii=False,indent=2))
   # Do not replace a newer collector summary.
   if (run/'summary.json').read_bytes()!=raw:continue
   (run/'summary.tmp').write_text(json.dumps(summary,ensure_ascii=False,indent=2));(run/'summary.tmp').replace(run/'summary.json');render(run)
   (run/'render_status.json').write_text(json.dumps({'games':len(summary['games']),'completed':summary.get('completed',False),'clock_alignment':True,'at':time.time()},indent=2))
   print('RENDER',signature,flush=True);last_signature=signature
  if summary.get('completed') or summary.get('error'):break
 except Exception as e:
  print('RETRY',type(e).__name__,str(e)[:160],flush=True)
 time.sleep(5)
