"""Bounded continuation of the user-approved T3 measurement, no production edits."""
import collections,hashlib,json,os,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];os.chdir(ROOT);HERE=Path(__file__).resolve().parent
PREVIOUS=1196385;FIRST=ROOT/'runs/t3_20261002_095256';STOP=HERE/'STOP_CONTINUATION';started=time.monotonic()
hashes={n:hashlib.sha256(Path(n).read_bytes()).hexdigest() for n in ['ext/pilot.js','ext/mod.js','params.json']}
def status(**kw):(HERE/'continuation.json').write_text(json.dumps({'updated':time.strftime('%F %T'),'scope':'Continue observed alive-gap measurements; no production safe offset asserted',**kw},ensure_ascii=False,indent=2))
def unchanged():return all(hashlib.sha256(Path(n).read_bytes()).hexdigest()==h for n,h in hashes.items())
status(state='waiting_for_current_batch',pid=PREVIOUS,next_start_gap=32,max_additional_batches=4,total_cap_s=3600)
while Path(f'/proc/{PREVIOUS}').exists():
 if STOP.exists() or time.monotonic()-started>=3600:status(state='stopped');raise SystemExit
 time.sleep(5)
s=json.loads((FIRST/'summary.json').read_text())
if not s.get('completed') or s.get('error') or (FIRST/'STOP').exists() or (FIRST/'STOP_NOW').exists():status(state='stopped_after_interruption');raise SystemExit
# 32px is the next experiment, based on the preceding observation down to31.93px.
# It is not a demonstrated common safety margin. Subsequent starts decrease1px
# only after at least two independent games in one radius/speed/geometry group.
gap=32;repeated=0
for batch in range(1,5):
 if STOP.exists() or not unchanged() or time.monotonic()-started>=3600:status(state='stopped_before_next_batch');break
 log=HERE/f'continued_{batch:02}.log'
 env=dict(os.environ,T3_GAMES='6',T3_GAP_START=str(gap),T3_BIN_REQUEST='2',T3_SPEED_REQUEST='0',T3_SERVER=s.get('requested_server') or '181.41.140.178:444')
 with log.open('w') as f:proc=subprocess.Popen([str(ROOT/'.venv/bin/python'),'research/t3_20261002/batch.py'],stdout=f,stderr=subprocess.STDOUT,start_new_session=True,env=env)
 status(state='collecting',batch=batch,pid=proc.pid,start_gap=gap,speed_request='cruise',log=str(log.relative_to(ROOT)),max_additional_batches=4)
 run=None
 while proc.poll() is None:
  for line in log.read_text().splitlines():
   if line.startswith('OUT '):run=ROOT/line.split()[1];break
  if STOP.exists() or not unchanged() or time.monotonic()-started>=3600:
   if run:(run/'STOP_NOW').touch()
  time.sleep(5)
 if not run:status(state='stopped_no_execution');break
 s=json.loads((run/'summary.json').read_text())
 if STOP.exists() or not s.get('completed') or s.get('error') or (run/'STOP').exists() or (run/'STOP_NOW').exists():status(state='stopped_after_interruption',run=str(run.relative_to(ROOT)));break
 levels=[e for p in run.glob('analysis_*.json') for e in json.loads(p.read_text()).get('levels',[]) if e.get('speed_class')=='cruise_speed']
 if not levels:status(state='stopped_no_qualified_alive_levels',run=str(run.relative_to(ROOT)));break
 groups=collections.defaultdict(set)
 for e in levels:
  r=e['enemy_r'];b=0 if r<20 else 1 if r<30 else 2 if r<40 else 3 if r<50 else 4
  groups[(int(e['own_r']//2)*2,b,e.get('geometry_class'))].add(e['game'])
 independent=max(map(len,groups.values()),default=0)
 if independent>=2:gap-=1;repeated=0
 else:
  repeated+=1
  if repeated>=2:status(state='stopped_insufficient_independent_repeats',run=str(run.relative_to(ROOT)),levels=len(levels));break
 status(state='batch_completed',run=str(run.relative_to(ROOT)),levels=len(levels),independent_games_in_matching_group=independent,next_start_gap=gap)
else:status(state='bounded_continuation_completed')
