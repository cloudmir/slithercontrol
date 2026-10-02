# T3 gap35 live dataset and bounded continuation

User direct request: 지금 방식이 좋아 보이니 계속 간격을 줄이면서 데이터를 확보해줘

## Verified execution outputs
```json
{
  "build": "1002-11dad5e1",
  "run": "runs/t3_20261002_095256",
  "completed": true,
  "settings_restored": true,
  "games": [
    {
      "game": 1,
      "seconds": 19.9,
      "levels": 0,
      "end": "death",
      "hold_stages": 0,
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님"
      ]
    },
    {
      "game": 2,
      "seconds": 26.9,
      "levels": 0,
      "end": "death",
      "hold_stages": 0,
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님",
        "다른 머리 간섭 가능"
      ]
    },
    {
      "game": 3,
      "seconds": 131.5,
      "levels": 5,
      "end": "death",
      "hold_stages": 5,
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님"
      ]
    },
    {
      "game": 4,
      "seconds": 103.8,
      "levels": 5,
      "end": "death",
      "hold_stages": 5,
      "excluded": [
        "사망 전 추종 중 아님",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "다른 머리 간섭 가능"
      ]
    },
    {
      "game": 5,
      "seconds": 13.2,
      "levels": 0,
      "end": "death",
      "hold_stages": 0,
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님",
        "접촉 구간 곡률 큼"
      ]
    },
    {
      "game": 6,
      "seconds": 139.9,
      "levels": 1,
      "end": "death",
      "hold_stages": 1,
      "excluded": [
        "사망 전 추종 중 아님",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님",
        "사망 전 관측 시점 불확실"
      ]
    }
  ],
  "qualified_alive_levels": 11,
  "independent_games": 3,
  "geometry_classes": {
    "gentle_curve": 10,
    "straight": 1
  },
  "actual_speed_classes": {
    "cruise_speed": 11
  },
  "closest_alive_gap": 31.92648784474479,
  "boost_observations": [
    {
      "game": 1,
      "observed_boost_speed_ticks": 0,
      "boost_command_ticks": 0
    },
    {
      "game": 2,
      "observed_boost_speed_ticks": 0,
      "boost_command_ticks": 0
    },
    {
      "game": 3,
      "observed_boost_speed_ticks": 0,
      "boost_command_ticks": 4
    },
    {
      "game": 4,
      "observed_boost_speed_ticks": 242,
      "boost_command_ticks": 221
    },
    {
      "game": 5,
      "observed_boost_speed_ticks": 0,
      "boost_command_ticks": 3
    },
    {
      "game": 6,
      "observed_boost_speed_ticks": 507,
      "boost_command_ticks": 447
    }
  ],
  "qualified_deaths": 0,
  "continuation": {
    "updated": "2026-10-02 10:02:38",
    "scope": "Continue observed alive-gap measurements; no production safe offset asserted",
    "state": "collecting",
    "batch": 1,
    "pid": 1219355,
    "start_gap": 32,
    "speed_request": "cruise",
    "log": "research/t3_rebuild_20261002/continued_01.log",
    "max_additional_batches": 4
  },
  "continuation_program_sha256": "cc43f622cc0762fa45f85514fabddf715bbf6db320604f213d47cc89c99c866a",
  "scope": "Observed alive intervals with gap ranges, not a common safety offset or server collision point"
}
```

## Raw qualified11 levels
```json
[
  {
    "t": 50.593,
    "target": 238,
    "episode": 11,
    "set": 35,
    "gap": 35.43382076080045,
    "duration": 1.4896999999880904,
    "samples": 44,
    "heading": 0.014915701722630459,
    "bend": 0.054799767521512166,
    "speed": 5.79,
    "own_r": 16.278301886792455,
    "enemy_r": 31.599056603773583,
    "geometry_class": "gentle_curve",
    "bend_max": 0.120273267010238,
    "contact_bend_max": 0.010031912597140646,
    "gap_range": 2.9108872190771535,
    "heading_max": 0.094686065152775,
    "serial": 1,
    "requested_speed": 0,
    "gap_min": 34.45926096599678,
    "gap_max": 37.37014818507394,
    "lateral": 3.920166801982858,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 9.11111111111111,
    "game": 3,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_03_log.json.gz"
  },
  {
    "t": 107.056,
    "target": 347,
    "episode": 34,
    "set": 35,
    "gap": 36.92629193052223,
    "duration": 1.1398999999761656,
    "samples": 33,
    "heading": 0.02246754517928551,
    "bend": 0.29679386359334003,
    "speed": 5.833333333333333,
    "own_r": 17.37264150943396,
    "enemy_r": 37.4811320754717,
    "geometry_class": "gentle_curve",
    "bend_max": 0.39356383317173727,
    "contact_bend_max": 0.06540283772220246,
    "gap_range": 2.812042859461471,
    "heading_max": 0.10484602559161971,
    "serial": 2,
    "requested_speed": 0,
    "gap_min": 35.77127008407955,
    "gap_max": 38.583312943541024,
    "lateral": 4.860640627369308,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 6.388888888888889,
    "game": 3,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_03_log.json.gz"
  },
  {
    "t": 115.071,
    "target": 347,
    "episode": 34,
    "set": 34,
    "gap": 35.75880384475654,
    "duration": 1.4783000000119273,
    "samples": 46,
    "heading": 0.019592162887759557,
    "bend": 0.1315280826187193,
    "speed": 5.833333333333333,
    "own_r": 17.37264150943396,
    "enemy_r": 39.66981132075472,
    "geometry_class": "gentle_curve",
    "bend_max": 0.32548194167810607,
    "contact_bend_max": 0.046682047397329285,
    "gap_range": 2.979516967906463,
    "heading_max": 0.16504728366141963,
    "serial": 3,
    "requested_speed": 0,
    "gap_min": 33.89352325258325,
    "gap_max": 36.87304022048971,
    "lateral": 6.753572179584106,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 6.444444444444445,
    "game": 3,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_03_log.json.gz"
  },
  {
    "t": 121.089,
    "target": 347,
    "episode": 34,
    "set": 33,
    "gap": 34.98618949369363,
    "duration": 1.4866000000238557,
    "samples": 45,
    "heading": 0.023743797653381193,
    "bend": 0.25284318081242496,
    "speed": 5.833333333333333,
    "own_r": 17.50943396226415,
    "enemy_r": 40.35377358490565,
    "geometry_class": "gentle_curve",
    "bend_max": 0.3260351927760681,
    "contact_bend_max": 0.0536501479651168,
    "gap_range": 2.248876878957091,
    "heading_max": 0.07154486401694626,
    "serial": 4,
    "requested_speed": 0,
    "gap_min": 34.096918593419375,
    "gap_max": 36.345795472376466,
    "lateral": 4.857392945073752,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 6.444444444444445,
    "game": 3,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_03_log.json.gz"
  },
  {
    "t": 122.612,
    "target": 347,
    "episode": 34,
    "set": 32,
    "gap": 33.86485577835617,
    "duration": 1.481399999976162,
    "samples": 45,
    "heading": 0.01465766192729312,
    "bend": 0.22193324857435126,
    "speed": 5.833333333333333,
    "own_r": 17.50943396226415,
    "enemy_r": 40.35377358490565,
    "geometry_class": "gentle_curve",
    "bend_max": 0.2757700384046444,
    "contact_bend_max": 0.04627983443626249,
    "gap_range": 2.5945069387533977,
    "heading_max": 0.07150165440517853,
    "serial": 5,
    "requested_speed": 0,
    "gap_min": 33.090597121416565,
    "gap_max": 35.68510406016996,
    "lateral": 3.9381658448014316,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 7.166666666666667,
    "game": 3,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_03_log.json.gz"
  },
  {
    "t": 36.831,
    "target": 96,
    "episode": 6,
    "set": 35,
    "gap": 35.698753756823706,
    "duration": 1.4872000000476646,
    "samples": 44,
    "heading": 0.016790637513445006,
    "bend": 0.06410122126752249,
    "speed": 5.79,
    "own_r": 15.047169811320755,
    "enemy_r": 56.08490566037736,
    "geometry_class": "gentle_curve",
    "bend_max": 0.10909803633540083,
    "contact_bend_max": 0.013526729460718201,
    "gap_range": 2.5667741386998415,
    "heading_max": 0.19757232075195663,
    "serial": 1,
    "requested_speed": 1,
    "gap_min": 34.01392593500398,
    "gap_max": 36.580700073703824,
    "lateral": 6.6560778442122635,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 6.933,
    "game": 4,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_04_log.json.gz"
  },
  {
    "t": 59.604,
    "target": 260,
    "episode": 11,
    "set": 35,
    "gap": 35.49330100634106,
    "duration": 1.492600000023856,
    "samples": 44,
    "heading": 0.020256809333910386,
    "bend": 0.23912093147205926,
    "speed": 5.777777777777778,
    "own_r": 15.183962264150946,
    "enemy_r": 50.06603773584906,
    "geometry_class": "gentle_curve",
    "bend_max": 0.30551617728001546,
    "contact_bend_max": 0.04749974932825474,
    "gap_range": 2.931380622278553,
    "heading_max": 0.09842073297460718,
    "serial": 2,
    "requested_speed": 1,
    "gap_min": 34.025429000187366,
    "gap_max": 36.95680962246592,
    "lateral": 6.9172726594324105,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 14,
    "game": 4,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_04_log.json.gz"
  },
  {
    "t": 67.615,
    "target": 1,
    "episode": 12,
    "set": 35,
    "gap": 33.36880117601008,
    "duration": 1.4849000000357933,
    "samples": 45,
    "heading": 0.02022962781215476,
    "bend": 0.26142193453448925,
    "speed": 5.777777777777778,
    "own_r": 15.183962264150946,
    "enemy_r": 43.36320754716981,
    "geometry_class": "gentle_curve",
    "bend_max": 0.33817065697247184,
    "contact_bend_max": 0.04964522831459739,
    "gap_range": 2.767342163095627,
    "heading_max": 0.1234288345091894,
    "serial": 3,
    "requested_speed": 1,
    "gap_min": 32.4831844546232,
    "gap_max": 35.250526617718826,
    "lateral": 7.074435660204259,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 6.555555555555555,
    "game": 4,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_04_log.json.gz"
  },
  {
    "t": 84.111,
    "target": 96,
    "episode": 13,
    "set": 35,
    "gap": 33.162610984366246,
    "duration": 1.48599999999999,
    "samples": 45,
    "heading": 0.01573347352566401,
    "bend": 0.05363161382943815,
    "speed": 5.777777777777778,
    "own_r": 15.320754716981131,
    "enemy_r": 56.35849056603774,
    "geometry_class": "straight",
    "bend_max": 0.10350025408975227,
    "contact_bend_max": 0.013264915292368507,
    "gap_range": 2.714826661025384,
    "heading_max": 0.12482238240550103,
    "serial": 4,
    "requested_speed": 1,
    "gap_min": 31.92648784474479,
    "gap_max": 34.641314505770175,
    "lateral": 3.194142873465013,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 6.944444444444445,
    "game": 4,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_04_log.json.gz"
  },
  {
    "t": 99.661,
    "target": 96,
    "episode": 16,
    "set": 35,
    "gap": 33.1010267499883,
    "duration": 1.4851999999880832,
    "samples": 46,
    "heading": 0.013454238194637647,
    "bend": 0.1081735901579961,
    "speed": 5.777777777777778,
    "own_r": 15.047169811320755,
    "enemy_r": 56.35849056603774,
    "geometry_class": "gentle_curve",
    "bend_max": 0.17907540773865005,
    "contact_bend_max": 0.02303009087165897,
    "gap_range": 2.8261715197148902,
    "heading_max": 0.1240092442844265,
    "serial": 5,
    "requested_speed": 1,
    "gap_min": 31.976876383384017,
    "gap_max": 34.80304790309891,
    "lateral": 2.981523862470124,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 6.944444444444445,
    "game": 4,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_04_log.json.gz"
  },
  {
    "t": 64.817,
    "target": 436,
    "episode": 10,
    "set": 35,
    "gap": 33.21374782383855,
    "duration": 1.483000000000004,
    "samples": 46,
    "heading": 0.011850802340134692,
    "bend": 0.09706953209226743,
    "speed": 5.777777777777778,
    "own_r": 16.278301886792455,
    "enemy_r": 48.56132075471698,
    "geometry_class": "gentle_curve",
    "bend_max": 0.1289855916644873,
    "contact_bend_max": 0.017883539389508485,
    "gap_range": 2.488987817150587,
    "heading_max": 0.15395163311293736,
    "serial": 1,
    "requested_speed": 1,
    "gap_min": 31.939304495953614,
    "gap_max": 34.4282923131042,
    "lateral": 4.580571721504111,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": 12.833333333333334,
    "game": 6,
    "run": "t3_20261002_095256",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_095256/slp_06_log.json.gz"
  }
]
```

## Automatic continuation program
```python
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

```
