# T3 사망 직전 대략 간격 표
집계: 2026-10-02 12:02:11 KST · 빌드 1002-11dad5e1 · 종료 기록 107판 / 사망 원본 106판.
단위: 게임 세계 좌표 px. 적 굵기=표시 반경×2. gap=우리 머리 중심–적 몸통 중심선 거리−우리 반경−적 반경. 음수는 표시 반경이 겹침을 뜻함.
최근접 몸통은 사망 원인으로 확정되지 않음. 값은 종료 직전 마지막 기록 프레임이며 실제 서버 충돌 위치가 아님. 속도·우리 굵기·각도와 관측 지연 혼재를 원본 CSV에 보존. 기존 엄격한 안정 판정으로 거르지 않은 기술 통계.

| 실제 속도 | 적 표시 굵기 | 사망 수 | 마지막 gap 중앙값 | 중앙 80% 범위 | 같은 대상·평행 사례 수 | 해당 사례 gap 중앙값 | 안정 생존 최소 gap |
|---|---|---:|---:|---|---:|---:|---:|
| 순항 | <40 | 38 | -7.32 | -15.51 ~ -0.18 | 0 | — | — |
| 순항 | 40–60 | 26 | -5.85 | -10.26 ~ -0.12 | 0 | — | +15.93 |
| 순항 | 60–80 | 19 | -6.10 | -10.90 ~ -1.83 | 3 | -10.52 | +12.21 |
| 순항 | 80–100 | 18 | -10.53 | -14.73 ~ +0.14 | 2 | -12.66 | +12.40 |
| 순항 | ≥100 | 5 | -7.36 | -12.33 ~ -3.03 | 2 | -10.57 | +5.55 |
| 부스트 | <40 | 0 | — | — ~ — | 0 | — | — |
| 부스트 | 40–60 | 0 | — | — ~ — | 0 | — | — |
| 부스트 | 60–80 | 0 | — | — ~ — | 0 | — | — |
| 부스트 | 80–100 | 0 | — | — ~ — | 0 | — | — |
| 부스트 | ≥100 | 0 | — | — ~ — | 0 | — | — |

중앙80%=10–90백분위이며 신뢰구간/접촉 경계가 아님. 같은 대상·평행 사례=추종 대상과 최근접 몸통 동일+해당 선분과 각도<15°+종료와 프레임 차이−0.05~0.25초. 머리 간섭·곡률은 여전히 혼재하므로 확정 경계로 해석하지 않음.
안정 생존 최소 gap은 해당 표시 굵기·속도의 개별 생존 관측이며 사망 통계와 같은 조건의 쌍을 보장하지 않음. 표의 굵기는 실제 몸길이가 아닌 표시 지름.
원본 경로·SHA256: data.json inventory. 관측 전부 deaths.csv / 구간 통계 bins.csv. 원본과 제품 코드는 수정하지 않음.

## Raw aggregation output
```json
{
  "checked_at": "2026-10-02 12:02:11 KST",
  "build": "1002-11dad5e1",
  "completed_records": 107,
  "death_rows": 106,
  "skipped_missing": [],
  "groups": [
    {
      "speed": "cruise",
      "enemy_diameter_bin": "<40",
      "deaths": 38,
      "median_gap": -7.324871884869868,
      "p10_gap": -15.507158871968638,
      "p90_gap": -0.17594940378593127,
      "min_gap": -19.530987022836122,
      "max_gap": 4.853110034063818,
      "own_diameter_min": 29.0,
      "own_diameter_max": 42.13207547169811,
      "parallel_same_target_n": 0,
      "parallel_same_target_median": null,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 0,
      "stable_alive_games": 0,
      "stable_alive_min": null
    },
    {
      "speed": "cruise",
      "enemy_diameter_bin": "40–60",
      "deaths": 26,
      "median_gap": -5.8516749389787845,
      "p10_gap": -10.262725704650014,
      "p90_gap": -0.12411793820814232,
      "min_gap": -12.492870295992617,
      "max_gap": 3.1323469264596646,
      "own_diameter_min": 29.0,
      "own_diameter_max": 36.38679245283019,
      "parallel_same_target_n": 0,
      "parallel_same_target_median": null,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 3,
      "stable_alive_games": 3,
      "stable_alive_min": 15.926265249625011
    },
    {
      "speed": "cruise",
      "enemy_diameter_bin": "60–80",
      "deaths": 19,
      "median_gap": -6.101679535163278,
      "p10_gap": -10.896579305568304,
      "p90_gap": -1.8293259440883207,
      "min_gap": -16.36506825113303,
      "max_gap": 2.2718913362578235,
      "own_diameter_min": 29.547169811320753,
      "own_diameter_max": 47.60377358490565,
      "parallel_same_target_n": 3,
      "parallel_same_target_median": -10.518914739995484,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 21,
      "stable_alive_games": 10,
      "stable_alive_min": 12.209227569215106
    },
    {
      "speed": "cruise",
      "enemy_diameter_bin": "80–100",
      "deaths": 18,
      "median_gap": -10.530576068871653,
      "p10_gap": -14.729179687159135,
      "p90_gap": 0.13947732672721194,
      "min_gap": -16.551332553741,
      "max_gap": 3.9010615138963516,
      "own_diameter_min": 29.273584905660382,
      "own_diameter_max": 43.22641509433962,
      "parallel_same_target_n": 2,
      "parallel_same_target_median": -12.662531412360302,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 52,
      "stable_alive_games": 18,
      "stable_alive_min": 12.401014760298473
    },
    {
      "speed": "cruise",
      "enemy_diameter_bin": "≥100",
      "deaths": 5,
      "median_gap": -7.357012319352741,
      "p10_gap": -12.333844045182941,
      "p90_gap": -3.032524814704443,
      "min_gap": -13.78426659309968,
      "max_gap": -2.2813820950596053,
      "own_diameter_min": 29.820754716981135,
      "own_diameter_max": 31.735849056603772,
      "parallel_same_target_n": 2,
      "parallel_same_target_median": -10.57063945622621,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 27,
      "stable_alive_games": 7,
      "stable_alive_min": 5.551354356903715
    },
    {
      "speed": "boost",
      "enemy_diameter_bin": "<40",
      "deaths": 0,
      "median_gap": null,
      "p10_gap": null,
      "p90_gap": null,
      "min_gap": null,
      "max_gap": null,
      "own_diameter_min": null,
      "own_diameter_max": null,
      "parallel_same_target_n": 0,
      "parallel_same_target_median": null,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 0,
      "stable_alive_games": 0,
      "stable_alive_min": null
    },
    {
      "speed": "boost",
      "enemy_diameter_bin": "40–60",
      "deaths": 0,
      "median_gap": null,
      "p10_gap": null,
      "p90_gap": null,
      "min_gap": null,
      "max_gap": null,
      "own_diameter_min": null,
      "own_diameter_max": null,
      "parallel_same_target_n": 0,
      "parallel_same_target_median": null,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 0,
      "stable_alive_games": 0,
      "stable_alive_min": null
    },
    {
      "speed": "boost",
      "enemy_diameter_bin": "60–80",
      "deaths": 0,
      "median_gap": null,
      "p10_gap": null,
      "p90_gap": null,
      "min_gap": null,
      "max_gap": null,
      "own_diameter_min": null,
      "own_diameter_max": null,
      "parallel_same_target_n": 0,
      "parallel_same_target_median": null,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 0,
      "stable_alive_games": 0,
      "stable_alive_min": null
    },
    {
      "speed": "boost",
      "enemy_diameter_bin": "80–100",
      "deaths": 0,
      "median_gap": null,
      "p10_gap": null,
      "p90_gap": null,
      "min_gap": null,
      "max_gap": null,
      "own_diameter_min": null,
      "own_diameter_max": null,
      "parallel_same_target_n": 0,
      "parallel_same_target_median": null,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 0,
      "stable_alive_games": 0,
      "stable_alive_min": null
    },
    {
      "speed": "boost",
      "enemy_diameter_bin": "≥100",
      "deaths": 0,
      "median_gap": null,
      "p10_gap": null,
      "p90_gap": null,
      "min_gap": null,
      "max_gap": null,
      "own_diameter_min": null,
      "own_diameter_max": null,
      "parallel_same_target_n": 0,
      "parallel_same_target_median": null,
      "timing_uncertain_n": 0,
      "stable_alive_levels": 0,
      "stable_alive_games": 0,
      "stable_alive_min": null
    }
  ]
}
```

## Verification output
```json
{
  "original_candidate_gaps_matched": 106,
  "mismatches": [],
  "unique_deaths": 106,
  "parallel_subset": 7,
  "all_actual_speeds": [
    5.777777777777778,
    5.79,
    5.833333333333333,
    5.888888888888889,
    5.944444444444445
  ],
  "own_diameter_range": [
    29.0,
    47.60377358490565
  ]
}
```

## Descriptive parallel cases
```json
[
  {
    "run": "t3_20261002_094249",
    "game": 2,
    "build": "1002-11dad5e1",
    "enemy_id": 401,
    "enemy_r": 54.6,
    "own_r": 15.320754716981131,
    "distance": 56.136488123881456,
    "gap": -13.78426659309968,
    "angle_deg": 1.8243337184506212,
    "enemy_diameter": 109.2,
    "own_diameter": 30.641509433962263,
    "speed": 5.777777777777778,
    "speed_class": "cruise",
    "frame_t": 44.363,
    "end_seconds": 44.4,
    "end_window_s": 0.036999999999999034,
    "frame_interval_s": 0.03399999999999892,
    "trace_t": 44.363,
    "target_id": 401,
    "same_target": true,
    "target_gap": -13.78426659309968,
    "actual_phase": "align",
    "head_distance": 604.394422453647,
    "earlier_half_second_min_gap": -13.38926078526466,
    "time_close": true,
    "raw_record": "runs/t3_20261002_094249/slp_02.json",
    "raw_box": "runs/t3_20261002_094249/slp_02_box.json.gz",
    "raw_log": "runs/t3_20261002_094249/slp_02_log.json.gz",
    "parallel_target_time_close": true
  },
  {
    "run": "t3_20261002_095256",
    "game": 4,
    "build": "1002-11dad5e1",
    "enemy_id": 96,
    "enemy_r": 56.4,
    "own_r": 15.047169811320755,
    "distance": 64.09015749196801,
    "gap": -7.357012319352741,
    "angle_deg": 2.0933438834566602,
    "enemy_diameter": 112.8,
    "own_diameter": 30.09433962264151,
    "speed": 5.777777777777778,
    "speed_class": "cruise",
    "frame_t": 103.711,
    "end_seconds": 103.8,
    "end_window_s": 0.08899999999999864,
    "frame_interval_s": 0.027999999999991587,
    "trace_t": 103.711,
    "target_id": 96,
    "same_target": true,
    "target_gap": -7.357012319352741,
    "actual_phase": "follow",
    "head_distance": 53.93986961335499,
    "earlier_half_second_min_gap": -7.026518117628349,
    "time_close": true,
    "raw_record": "runs/t3_20261002_095256/slp_04.json",
    "raw_box": "runs/t3_20261002_095256/slp_04_box.json.gz",
    "raw_log": "runs/t3_20261002_095256/slp_04_log.json.gz",
    "parallel_target_time_close": true
  },
  {
    "run": "t3_20261002_100238",
    "game": 2,
    "build": "1002-11dad5e1",
    "enemy_id": 436,
    "enemy_r": 40.5,
    "own_r": 15.047169811320755,
    "distance": 41.53225906669411,
    "gap": -14.014910744626647,
    "angle_deg": 7.13253216087058,
    "enemy_diameter": 81.0,
    "own_diameter": 30.09433962264151,
    "speed": 5.777777777777778,
    "speed_class": "cruise",
    "frame_t": 50.626,
    "end_seconds": 50.7,
    "end_window_s": 0.07400000000000517,
    "frame_interval_s": 0.01999999999999602,
    "trace_t": 50.626,
    "target_id": 436,
    "same_target": true,
    "target_gap": -14.014910744626647,
    "actual_phase": "align",
    "head_distance": 399.6281748915548,
    "earlier_half_second_min_gap": -13.301997298493397,
    "time_close": true,
    "raw_record": "runs/t3_20261002_100238/slp_02.json",
    "raw_box": "runs/t3_20261002_100238/slp_02_box.json.gz",
    "raw_log": "runs/t3_20261002_100238/slp_02_log.json.gz",
    "parallel_target_time_close": true
  },
  {
    "run": "t3_20261002_110740",
    "game": 2,
    "build": "1002-11dad5e1",
    "enemy_id": 143,
    "enemy_r": 42.7,
    "own_r": 15.047169811320755,
    "distance": 46.4370177312268,
    "gap": -11.310152080093957,
    "angle_deg": 13.512905723934647,
    "enemy_diameter": 85.4,
    "own_diameter": 30.09433962264151,
    "speed": 5.777777777777778,
    "speed_class": "cruise",
    "frame_t": 44.079,
    "end_seconds": 44.1,
    "end_window_s": 0.021000000000000796,
    "frame_interval_s": 0.03300000000000125,
    "trace_t": 44.079,
    "target_id": 143,
    "same_target": true,
    "target_gap": -11.310152080093957,
    "actual_phase": "follow",
    "head_distance": 895.7442462445157,
    "earlier_half_second_min_gap": -9.97257366666313,
    "time_close": true,
    "raw_record": "runs/t3_20261002_110740/slp_02.json",
    "raw_box": "runs/t3_20261002_110740/slp_02_box.json.gz",
    "raw_log": "runs/t3_20261002_110740/slp_02_log.json.gz",
    "parallel_target_time_close": true
  },
  {
    "run": "t3_20261002_113306",
    "game": 6,
    "build": "1002-11dad5e1",
    "enemy_id": 465,
    "enemy_r": 36.9,
    "own_r": 14.773584905660377,
    "distance": 43.444591564950876,
    "gap": -8.2289933407095,
    "angle_deg": 10.557661782922791,
    "enemy_diameter": 73.8,
    "own_diameter": 29.547169811320753,
    "speed": 5.79,
    "speed_class": "cruise",
    "frame_t": 28.64,
    "end_seconds": 28.7,
    "end_window_s": 0.05999999999999872,
    "frame_interval_s": 0.03300000000000125,
    "trace_t": 28.64,
    "target_id": 465,
    "same_target": true,
    "target_gap": -8.2289933407095,
    "actual_phase": "follow",
    "head_distance": 253.17277868103284,
    "earlier_half_second_min_gap": -7.621892973889082,
    "time_close": true,
    "raw_record": "runs/t3_20261002_113306/slp_06.json",
    "raw_box": "runs/t3_20261002_113306/slp_06_box.json.gz",
    "raw_log": "runs/t3_20261002_113306/slp_06_log.json.gz",
    "parallel_target_time_close": true
  },
  {
    "run": "t3_20261002_114036",
    "game": 3,
    "build": "1002-11dad5e1",
    "enemy_id": 254,
    "enemy_r": 30,
    "own_r": 15.59433962264151,
    "distance": 35.075424882646026,
    "gap": -10.518914739995484,
    "angle_deg": 11.305168462488353,
    "enemy_diameter": 60,
    "own_diameter": 31.18867924528302,
    "speed": 5.777777777777778,
    "speed_class": "cruise",
    "frame_t": 80.35,
    "end_seconds": 80.4,
    "end_window_s": 0.05000000000001137,
    "frame_interval_s": 0.03300000000000125,
    "trace_t": 80.35,
    "target_id": 254,
    "same_target": true,
    "target_gap": -10.518914739995484,
    "actual_phase": "align",
    "head_distance": 143.3517042234043,
    "earlier_half_second_min_gap": -9.326780587469226,
    "time_close": true,
    "raw_record": "runs/t3_20261002_114036/slp_03.json",
    "raw_box": "runs/t3_20261002_114036/slp_03_box.json.gz",
    "raw_log": "runs/t3_20261002_114036/slp_03_log.json.gz",
    "parallel_target_time_close": true
  },
  {
    "run": "t3_20261002_115616",
    "game": 2,
    "build": "1002-11dad5e1",
    "enemy_id": 91,
    "enemy_r": 31.3,
    "own_r": 14.910377358490567,
    "distance": 34.1409502551114,
    "gap": -12.06942710337917,
    "angle_deg": 7.764350722989653,
    "enemy_diameter": 62.6,
    "own_diameter": 29.820754716981135,
    "speed": 5.777777777777778,
    "speed_class": "cruise",
    "frame_t": 36.282,
    "end_seconds": 36.3,
    "end_window_s": 0.018000000000000682,
    "frame_interval_s": 0.04399999999999693,
    "trace_t": 36.282,
    "target_id": 91,
    "same_target": true,
    "target_gap": -12.06942710337917,
    "actual_phase": "align",
    "head_distance": 274.59349753397373,
    "earlier_half_second_min_gap": -8.869826847399551,
    "time_close": true,
    "raw_record": "runs/t3_20261002_115616/slp_02.json",
    "raw_box": "runs/t3_20261002_115616/slp_02_box.json.gz",
    "raw_log": "runs/t3_20261002_115616/slp_02_log.json.gz",
    "parallel_target_time_close": true
  }
]
```

## Original inventory
```json
[
  {
    "runs/t3_20261002_094249/slp_01.json": "43418b624ea266fa2e53c1bad39815defc1570b60a8ea08164a2e1e420e3fb13",
    "runs/t3_20261002_094249/slp_01_box.json.gz": "19c88329b64776c51b7882480c98aec362daf39328e6a4e10c9b1275010a5546",
    "runs/t3_20261002_094249/slp_01_log.json.gz": "e4fd0270de4fe89b93e2ef952ed7e4de8d53c0b30514915df1a9e5f3d0d678f6"
  },
  {
    "runs/t3_20261002_094249/slp_02.json": "f22e3490a2225711bc5c086469a9f9d4ce154c4d8af884429b02be6bd960cd77",
    "runs/t3_20261002_094249/slp_02_box.json.gz": "e3b9987150d741ce7b38d459b1d43b749d8f7b9834d50885973115f744b0f413",
    "runs/t3_20261002_094249/slp_02_log.json.gz": "6e1a13baa4582ab6a9a5df99210de1cc3522e35a3aad0aa00c8b42e35159086d"
  },
  {
    "runs/t3_20261002_094249/slp_03.json": "d8d8eb23990abb7a63b32b8a03d5e8b770c70237437fadeb3761579abc146093",
    "runs/t3_20261002_094249/slp_03_box.json.gz": "444505c7885b4119fc370e98f88ad09ca5986445e2e7cae927ec894efeb7e5ea",
    "runs/t3_20261002_094249/slp_03_log.json.gz": "e3b8540248f4fdd4ec4bbf2775ed262c0b7567fef95e2df4866dfa09568e309e"
  },
  {
    "runs/t3_20261002_094739/slp_01.json": "b0f237b3d21bf8412fc5bf476922bce8dc2e2aeee0e51c0a13fa179fd685efa0",
    "runs/t3_20261002_094739/slp_01_box.json.gz": "ff9e668054f6bf2f3561e63aed832de4521ae9d6c9cb8da6f13d91c514d53cdb",
    "runs/t3_20261002_094739/slp_01_log.json.gz": "4de2f24fae566243c508388e89dc4e3f7d3052a0801144347b25662399bd4070"
  },
  {
    "runs/t3_20261002_094739/slp_02.json": "416ef63006ff159a33ba5c5ad9f168991fe37354bc21fca584924fe3278cb23d",
    "runs/t3_20261002_094739/slp_02_box.json.gz": "94889f70e18a267d0ae2f860b863e06897ec59f7335da37035a1b942d2a72681",
    "runs/t3_20261002_094739/slp_02_log.json.gz": "ed4b92839d91d0714d079e834e2cc1b62b879daaa817be8137b2760735bb5598"
  },
  {
    "runs/t3_20261002_094739/slp_03.json": "fcaaa3ce3b8b2a8e55a3d9667341af4723f7c5bd3fe91a0e5f98df3ffd4449a9",
    "runs/t3_20261002_094739/slp_03_box.json.gz": "a1e8ca10852c258ccc7a15be09377445a5114ec2b88527e98e9349a5d11eb923",
    "runs/t3_20261002_094739/slp_03_log.json.gz": "707fc8c9982e8faef0a299fa67c72e77ae622e0e40fdefb72966e50741ed0557"
  },
  {
    "runs/t3_20261002_095256/slp_01.json": "e94fcfc0cf036beb3a58f993c4a6763a4f0ab196af412b6ca198a4bc79c2f31f",
    "runs/t3_20261002_095256/slp_01_box.json.gz": "d82881d8deab49c854aa584c4370ed65478fbc9e45436f4c06a3eb62ea46e4f6",
    "runs/t3_20261002_095256/slp_01_log.json.gz": "660a3bab29dad5f00c1d4d26197436fa7f13c4683a62ed1a041870a4f2cfd21a"
  },
  {
    "runs/t3_20261002_095256/slp_02.json": "c855377d71aeb844188c7aa2b4656c7eeaaf3596fe05acf331e4a13bc9cc9212",
    "runs/t3_20261002_095256/slp_02_box.json.gz": "4195e26445e5f0c67ed4f0402578964c8fbb4b93f26251ec1dfdc69e6432c5cb",
    "runs/t3_20261002_095256/slp_02_log.json.gz": "0c54f7ba4055bd666d0721da8ed8f5abf205463fd5561d371be9727031b46ca9"
  },
  {
    "runs/t3_20261002_095256/slp_03.json": "46787e5d47c07da9620ccf58bb23b713af0c3a8e0f941dfb5518bbb9612bbba9",
    "runs/t3_20261002_095256/slp_03_box.json.gz": "fca9a6bcaab5125272b388d60bbde804c8f9c1259b098d20aca0f692e960c200",
    "runs/t3_20261002_095256/slp_03_log.json.gz": "384e8e36db4a6f674261a6922066684f5ec15b45eda703dbfa31175e72e03fdc"
  },
  {
    "runs/t3_20261002_095256/slp_04.json": "14838ce882fe123a548a1ceb50192ed88da8784a79fcdde78907a4023b933995",
    "runs/t3_20261002_095256/slp_04_box.json.gz": "9032f8e6310c6d0f356a67f02d89a6904ddd2a67ba6baa4a25f19eddb90b74c0",
    "runs/t3_20261002_095256/slp_04_log.json.gz": "a8f30a41f9141df51dc19d5d57c4d76846939ba0a7b872f7d40fbc77d9a79924"
  },
  {
    "runs/t3_20261002_095256/slp_05.json": "43a89525adc4d8219b90c04136b74fb96cb74a38ba4b8dc6715705b8cb0024e8",
    "runs/t3_20261002_095256/slp_05_box.json.gz": "0b9e9cb07f009062bb4bc2178d904b5636ea639e133290758595e1e82d362194",
    "runs/t3_20261002_095256/slp_05_log.json.gz": "c87e741394dbc2066bee3ec6e2a2ec838fe7ff75411a12b18d38617e617622df"
  },
  {
    "runs/t3_20261002_095256/slp_06.json": "4fb08ae917f769cde5b6d9c507b1ffe73b6ed6b0be9949663a69756859fa0c22",
    "runs/t3_20261002_095256/slp_06_box.json.gz": "5fb58b3c689de13b41d1123d16f2106141c6a45925f30ad59b801f0a5369a582",
    "runs/t3_20261002_095256/slp_06_log.json.gz": "e3954b9d91ec407b71fbbf7b6611fe46593ffba3c6bb19c613530bdd8e1b509b"
  },
  {
    "runs/t3_20261002_100238/slp_01.json": "d5d8a1bbb7a8d5065f33059b5c8eea4f7dff3830234f97ccc2e95c7ca9ff6e27",
    "runs/t3_20261002_100238/slp_01_box.json.gz": "9dd2fb649b5b99d85f12f00a9d5f6ac4a6f0d1fb15c2e0c8ab443c7fc1456028",
    "runs/t3_20261002_100238/slp_01_log.json.gz": "8da0b36a8c7406a8d876cd34a9463baf8d2e034be719c238166bbab6a6d35574"
  },
  {
    "runs/t3_20261002_100238/slp_02.json": "6760710c8038fa93427cfabcd65d51758b7092bff752576934df5a89aad777ff",
    "runs/t3_20261002_100238/slp_02_box.json.gz": "d037342ecb34caaaab69489ba2198e093a658a89bfca36d93f99d56691d3a84b",
    "runs/t3_20261002_100238/slp_02_log.json.gz": "c940ebca05cc1dbfe68843d2f8232012f0cfb94b86271faea053f91957edb7b6"
  },
  {
    "runs/t3_20261002_100238/slp_03.json": "40a9b542ea159dc0302e9b452819db19725a8569587d80f85534e45acfe339aa",
    "runs/t3_20261002_100238/slp_03_box.json.gz": "58648d45b4f35e52f3c11f5915ea659b6bf4a9c1663ad92a1b40abf40e8661df",
    "runs/t3_20261002_100238/slp_03_log.json.gz": "3b420dd20fa9b2466d81c56ce23f4484b274c76a53ac96b8b0c2db50ff39f05c"
  },
  {
    "runs/t3_20261002_100238/slp_04.json": "78b9e253cb8ff4c0b44baee2f46b7f4c48fc7237a7cad99a9db475f1bef6ef41",
    "runs/t3_20261002_100238/slp_04_box.json.gz": "d6271ff5b32315e01270241e769eb5378c0f7d62976c35ec53c82c59ab26447a",
    "runs/t3_20261002_100238/slp_04_log.json.gz": "c9dee15337c90cdc0257133f7073102720553ed40c464400c60ce83f9da35910"
  },
  {
    "runs/t3_20261002_101048/slp_01.json": "b4c3fe7e1678f86b573eb5ca1f9626b36597764a3e1f700ba3e839293d883b8f",
    "runs/t3_20261002_101048/slp_01_box.json.gz": "f060877d1073b8f8c1c0732261384422dcb44eb42c0afe0b01c08324533d2316",
    "runs/t3_20261002_101048/slp_01_log.json.gz": "849d477bd9c51548c14f9fa38b63d8e46fc2f25edfba75fd4005d606eb6cc13b"
  },
  {
    "runs/t3_20261002_101048/slp_02.json": "e71aad33b6265d64c549b6b165bfd7cc7b35f1a0ba8461b5c6129fc4c4170dd6",
    "runs/t3_20261002_101048/slp_02_box.json.gz": "c54715b55376ab307e7846dbf6637f4e96f3623c84cb867761de5383cb751171",
    "runs/t3_20261002_101048/slp_02_log.json.gz": "5bda9e20fa2709b0a17f3fbac6ff95de459f6439d7fcb773f98143b9cabeee30"
  },
  {
    "runs/t3_20261002_101048/slp_03.json": "b6b4f9682708f502dee97afe9bc2faeaf960bb975ac51c1e661c9499cd49f62c",
    "runs/t3_20261002_101048/slp_03_box.json.gz": "490c235aa1427012c0f3a1663ae3aa45185f36a515d67859878cdfc2400e20f8",
    "runs/t3_20261002_101048/slp_03_log.json.gz": "0c5191c235155dc3c550050043abcd891177cb313e47b823c3c6867d2e058942"
  },
  {
    "runs/t3_20261002_101048/slp_04.json": "970b497dd40a0c93df81d806b56c8d309e1edcd0c0eb7db02d88e46c2d8f3b91",
    "runs/t3_20261002_101048/slp_04_box.json.gz": "f99d390c5a70b7bf92989dbee935188000f54d524ab85ca36f90cbcbb92d7100",
    "runs/t3_20261002_101048/slp_04_log.json.gz": "b68198f888c22b959b6943e459994597cc133e00efbc94814c7bfc9804e3357b"
  },
  {
    "runs/t3_20261002_101048/slp_05.json": "72fefa1ab255907ae55b634005a3c371dfac17e71663d8b7791a802a2ffa55b2",
    "runs/t3_20261002_101048/slp_05_box.json.gz": "76f8a5bba2c964cb876f3c73d297e3b6553abc924a0d4b01786d96a32d1c3597",
    "runs/t3_20261002_101048/slp_05_log.json.gz": "1bae7104fe58ffcfbb76e9a4f3d456c4d11357198c85eab3c9c41af763062498"
  },
  {
    "runs/t3_20261002_101048/slp_06.json": "c779a0181dccacea865fce3b49bb219d82545d9dcf3d5bd1ffb80cfb23fe2f37",
    "runs/t3_20261002_101048/slp_06_box.json.gz": "259214bb9d5199049f153582d91ac2a50e1494a9bfa1e06b0ce36d15c495913e",
    "runs/t3_20261002_101048/slp_06_log.json.gz": "eb592723b0537c90a09c84979b0c0fb8c73c9b77f4bcdecf5d75354f46196033"
  },
  {
    "runs/t3_20261002_101736/slp_01.json": "cde43588b700457a1f7f37116f38d3f28480d743a9c296d1326c9a6693536a53",
    "runs/t3_20261002_101736/slp_01_box.json.gz": "b1c91191240ab44d68e981624dd14c19ec7cc01191649e567004c8eaad9f1245",
    "runs/t3_20261002_101736/slp_01_log.json.gz": "eb8a67efef0e20aea16eaab29ec425a4cd0c9be6815cd59eadd05573a9eb622f"
  },
  {
    "runs/t3_20261002_101736/slp_02.json": "b9f0ff08a325cece9e70237c9f73dc0af40a8e44661a3dd1e372669c998f3157",
    "runs/t3_20261002_101736/slp_02_box.json.gz": "64ad8f38e77a5e4b0e3e5f1d160992c76f4324604f464bc82b95599d73ee7ef3",
    "runs/t3_20261002_101736/slp_02_log.json.gz": "ed5c4a5bf9204c8c1c3db3683a895ac9a23fa4875a4cdc2d9f89b6d4f5bf2f03"
  },
  {
    "runs/t3_20261002_101736/slp_03.json": "8d36be899c790df3688087b03f103d294d3a8c35591e60f5992a978c96f01064",
    "runs/t3_20261002_101736/slp_03_box.json.gz": "0b78620fd9603a2b8ab80720795cd0b1dc081785f426f42ac0e0ea68b19b8cb3",
    "runs/t3_20261002_101736/slp_03_log.json.gz": "70a452d05264e25a098b0cc55fa82a4822c171ca9eec1835e8bd0b24130cb3e0"
  },
  {
    "runs/t3_20261002_101736/slp_04.json": "e6e57d2a750cc377b9f351b7520fb859037776ab34f37431e4115c1408d666df",
    "runs/t3_20261002_101736/slp_04_box.json.gz": "6dc3a0609ded069a3bbdeb3e7d83f2c8e7cd19c85b280eed81fda85da4d29d7e",
    "runs/t3_20261002_101736/slp_04_log.json.gz": "5ef752e716faf9bde9dd8602fb92014c6e243ed86e0de0e798ef86f60bec8fc8"
  },
  {
    "runs/t3_20261002_101736/slp_05.json": "2e27c0e663b46c32d6afafe0bab5fe7f326c9202937d25b70bd0ce830e1c2d96",
    "runs/t3_20261002_101736/slp_05_box.json.gz": "c791b6a1c2b24d7f90f9b5df3e3f1c0c3cf81697fe593fb6448a4a92afcd74cf",
    "runs/t3_20261002_101736/slp_05_log.json.gz": "7d91d48eeb2cc2cff6bd8ea378058cc8c349f54305255595180c50ec2f20dd08"
  },
  {
    "runs/t3_20261002_101736/slp_06.json": "4368ca0afc1cfd2aa32ac61f631a6bbf1389d9fbaf113156cd965f98d73e366c",
    "runs/t3_20261002_101736/slp_06_box.json.gz": "76bc6a465198fd0bc4ffb306b0649a015dc50e00ff9b68fe888481c8e4ba97a0",
    "runs/t3_20261002_101736/slp_06_log.json.gz": "77f31785971df3065afc7ee04196e1ec897463a8ac229008d986f72b986255fe"
  },
  {
    "runs/t3_20261002_102528/slp_01.json": "adf4bb93dbc872f7dd00d7be99c0a94196e33dd6f4433ed38e7e4f77ba71459a",
    "runs/t3_20261002_102528/slp_01_box.json.gz": "4a45247cd6fb58f1bb43c5833bccaae83323393c86c565826a9c06fe7f69a26c",
    "runs/t3_20261002_102528/slp_01_log.json.gz": "4ca517aff8b3a1e9505b8ecb9169b71aa50367ebdf228719bcee3e81a419f8b6"
  },
  {
    "runs/t3_20261002_102528/slp_02.json": "5dd1af6408f8f49e81d3d6b2bd4a1d0284eb5c9ef5dcf59be3f6dbc3462908b3",
    "runs/t3_20261002_102528/slp_02_box.json.gz": "5d3ec4bcbfc2e56cb4cc5dda7ae05db7aebbc97f8586564eddce6ab6aa19d122",
    "runs/t3_20261002_102528/slp_02_log.json.gz": "a6ef35c8af7cd18dba40f38d1d41e1a557b4559c5f6fafa241d72af040822a69"
  },
  {
    "runs/t3_20261002_102528/slp_03.json": "daf5b4f223e6d5518dd9b3d8fc5f41444ad7ef3d5facd2bc9bb4c9bad30eab71",
    "runs/t3_20261002_102528/slp_03_box.json.gz": "8331098fe17170248c5667c56c9ee969d2622f0f7f8f5516e80586cce1352710",
    "runs/t3_20261002_102528/slp_03_log.json.gz": "15b17b11b3260fb1185408f61893e7887d17e497bd16e8aa5f04a03d4d825370"
  },
  {
    "runs/t3_20261002_102528/slp_04.json": "c1aab8fd816db327018f61ee155d09c1153d43dd5462270700ad134b4146bd03",
    "runs/t3_20261002_102528/slp_04_box.json.gz": "5af51176f530c1c2a8dbc27782e706ece0bd85ebbbab4e669b4b56b2119b024f",
    "runs/t3_20261002_102528/slp_04_log.json.gz": "8644714102cc92de135b9bc3e68437a718550b50339f5d65c7d7750505ba931a"
  },
  {
    "runs/t3_20261002_102528/slp_05.json": "138c595f544c0ed6cef754ca8d2f245967565cb748162a529e30d9ef2e597c23",
    "runs/t3_20261002_102528/slp_05_box.json.gz": "a4b9f06897cb2a25c6d038eeb7335c2f0825c2b65731a0c6e7adb5b106fb46e4",
    "runs/t3_20261002_102528/slp_05_log.json.gz": "bce97c2d1c5a8d10789e5254cf838ca689b172c54f1cd85700c851cf2046bc04"
  },
  {
    "runs/t3_20261002_102528/slp_06.json": "b3d4328ea069e6c74f4075c2fa3ab8242c6113b3a70ed2a21221d73625aad120",
    "runs/t3_20261002_102528/slp_06_box.json.gz": "6338e83337714f514ef7ec1f4fdc0e8803e2c1708ead132d1744e5486a2e02c4",
    "runs/t3_20261002_102528/slp_06_log.json.gz": "aa867f8df8cf5750db5380aa7710676908f36ec37e03e4db8aaf7d5e5025e4ae"
  },
  {
    "runs/t3_20261002_103336/slp_01.json": "2b6be98e7680dc78f2f9bfa72db05567b3a8e0fde897771bbd2f8bc1151fc0e4",
    "runs/t3_20261002_103336/slp_01_box.json.gz": "c55b84afdd809243406b045cf1ed6b37129bed592052deaee9c43d442aec7e8b",
    "runs/t3_20261002_103336/slp_01_log.json.gz": "83f96ac641f48f8fb732fffa37fe5765c39c2917d853008fe01bc17aa9634d94"
  },
  {
    "runs/t3_20261002_103336/slp_02.json": "591a08aadcae12f8661e51e8137b179f99ae3492b8e2c2ab281c570cd5b27796",
    "runs/t3_20261002_103336/slp_02_box.json.gz": "03d1181ab4b73a7cf5d487a31833e305392da83ccfe5f19fa3edb1ec4277e4a0",
    "runs/t3_20261002_103336/slp_02_log.json.gz": "a4a2babdacd2fe6cb25083ad4504678cbcb41b98a39ae8b967a51f5f3deb897d"
  },
  {
    "runs/t3_20261002_103336/slp_03.json": "b2de1e4c477e50cd0330538a9262ea46c6929975e3d43de55b20124b2ea1a969",
    "runs/t3_20261002_103336/slp_03_box.json.gz": "8c19bfe1f14a3f1ac659002ccdad653c134db8dccf8044656be99204e6e0fb26",
    "runs/t3_20261002_103336/slp_03_log.json.gz": "e30e62ac86d7bb5d035c20b62c229ea3dcbcd4179f2641bca63e5196a33396bd"
  },
  {
    "runs/t3_20261002_103336/slp_04.json": "3de2874d3e7333b12b20c25fbcdeba8dd8e0cb928b2e4f4273ef0c2269a40c24",
    "runs/t3_20261002_103336/slp_04_box.json.gz": "92ba6b604adf8110aef50c8c613fe66adc5be70f7e52a4f4d9ea6e2189213521",
    "runs/t3_20261002_103336/slp_04_log.json.gz": "1f710c876583059e1ca291cfdd70bf071842c5eb47d6c502b29a5a73945199d7"
  },
  {
    "runs/t3_20261002_103336/slp_05.json": "c7efc10086dbcd759bdb4ee0934ec32093bcb6c05e6b936bfdbef5e0fa4c5772",
    "runs/t3_20261002_103336/slp_05_box.json.gz": "469d9d1ebfac9c95973045d710322d1e455a4823dde3195257212b4f771933e4",
    "runs/t3_20261002_103336/slp_05_log.json.gz": "b71bcaa25285f35b124d71496acdfae5f8587d18a9d4d168553e38b813b5d1cc"
  },
  {
    "runs/t3_20261002_103336/slp_06.json": "96ce44868ebb41ebee6508c9248548f1962a2a8a7c27c1b32242b40752a03598",
    "runs/t3_20261002_103336/slp_06_box.json.gz": "c82be70520503bf2ec144bc918827aa5a442087673a6915b4b134bf464a71d06",
    "runs/t3_20261002_103336/slp_06_log.json.gz": "7d720918c446175c4785ac3bc5b6e32d1645fa8dbfdc60ca3e8dbda2ef09c87d"
  },
  {
    "runs/t3_20261002_104400/slp_01.json": "3cd424cbcbfd24afd20ced29a4471968f975657a1899315bb747063b7188331d",
    "runs/t3_20261002_104400/slp_01_box.json.gz": "8c7ac6a8542574753c94ad5fe855593007c50b1966d4b54edb05d990a80faec3",
    "runs/t3_20261002_104400/slp_01_log.json.gz": "c52f643e93bcefa5304f52b9b17d4ececd0ef2dc23b51497294753d44cc84f72"
  },
  {
    "runs/t3_20261002_104400/slp_02.json": "8eb992d5d1ec8058838e9a903a96a81c6ac8f22bd1a26192b42d1de36d1b4381",
    "runs/t3_20261002_104400/slp_02_box.json.gz": "f4f661f5038862753f00f91a4dd2af987c3e63fcad454464cdfeace9fe0276f2",
    "runs/t3_20261002_104400/slp_02_log.json.gz": "48f72ef50861f773c5388a8126619a07ddeec895884a3ebd079d307cdee3a614"
  },
  {
    "runs/t3_20261002_104400/slp_03.json": "b8a91933e20d344c8801714ee529222badc871f2c956031a9d195a8c1e3a1702",
    "runs/t3_20261002_104400/slp_03_box.json.gz": "00abcbd82ca303b1c9ea0d4899276af2dca692b8fd2d742e759ba6dd703f7be9",
    "runs/t3_20261002_104400/slp_03_log.json.gz": "32f06eff2d26671a2ff9536b7a9490904398147c0467c7a15d86f916a52281b1"
  },
  {
    "runs/t3_20261002_104400/slp_04.json": "6851f376d93ffd1e8f2638ab28353e73f8a13c9149aa1a2e1aa97bcaf671f7f6",
    "runs/t3_20261002_104400/slp_04_box.json.gz": "cc8214ee3656995a1cce33a589cf71c74f5e949d3d4228686bbbcb4ea4f57cfc",
    "runs/t3_20261002_104400/slp_04_log.json.gz": "191f98eb4566e2471550585bfb548f066d6108318c3c681cbd0d5af34d0f5f72"
  },
  {
    "runs/t3_20261002_104400/slp_05.json": "fa5c88b56bb8ed9eedfa505d8056a3919bacea6ab463c487b94f1f880d2cca36",
    "runs/t3_20261002_104400/slp_05_box.json.gz": "35401a6e8f2b4938768b4e0ad7dd2f56742e11e52117ba09def24b0fada7b74f",
    "runs/t3_20261002_104400/slp_05_log.json.gz": "3041cfc19d671f5b5b7570d38ed49305ae370fc6eb37cd0d19e13f4d3ffae364"
  },
  {
    "runs/t3_20261002_104400/slp_06.json": "634a044307736a55ca55ef66f842f434a84b32c99a4cb72bdd2343ae51b51aab",
    "runs/t3_20261002_104400/slp_06_box.json.gz": "77ddf3effef864bb39347d65c66bd7a8f1904fee991eb26e6423d9a4bc3a0591",
    "runs/t3_20261002_104400/slp_06_log.json.gz": "7b75774b2bb974425c1b372d3ccd81f2065ae2589f729e6b9b9f049f74c0f9d0"
  },
  {
    "runs/t3_20261002_105337/slp_01.json": "d7d76c519fc08db71c4e1b8265caeb9677cf0d366e2172445847f9a451cb16d7",
    "runs/t3_20261002_105337/slp_01_box.json.gz": "7815f8c021757b1574fd817bb7f12c5cce9e3ef406356107c7ede9421860a4e5",
    "runs/t3_20261002_105337/slp_01_log.json.gz": "ada7d0956ef19e176c7919e668817a1720420086d383240f440cb499c5f24c7f"
  },
  {
    "runs/t3_20261002_105337/slp_02.json": "d235f2fbb4dd2f96d7798072511463baed15489c08be9bcf236f3f6d2d7973da",
    "runs/t3_20261002_105337/slp_02_box.json.gz": "6f752f28ce994c0f8470b0a8d9da4a5955b8026db469016811e61c7f9683d32d",
    "runs/t3_20261002_105337/slp_02_log.json.gz": "f67c2ced560148add4236d692fd455815599c1033d5564f3a21eaa9612dfb821"
  },
  {
    "runs/t3_20261002_105337/slp_03.json": "8f58f90b61b2c90221f5744cfadf57605e9ac803ed454bccc451dfd6dcb1a03f",
    "runs/t3_20261002_105337/slp_03_box.json.gz": "cc3a3a2f53bfd74bf106176f5e27419771f288d9b07a3ea91b87d78ddf75947a",
    "runs/t3_20261002_105337/slp_03_log.json.gz": "791ce5f3f33ab97a1bc342d8d42509af6456dad1cfe8bedebd9562757c0fe996"
  },
  {
    "runs/t3_20261002_105337/slp_04.json": "157f1782c307816b3158816b070166c5d0c4f85ff9136d90083eea56e266130f",
    "runs/t3_20261002_105337/slp_04_box.json.gz": "16f540a3cc4ff4e5695776596fb6fefb6592484b71abb4159429526180dd551e",
    "runs/t3_20261002_105337/slp_04_log.json.gz": "a45c5f4ea7449ea4de2c4bcae44e11d01b1b65058e8155997d1d615d263bcff7"
  },
  {
    "runs/t3_20261002_105337/slp_05.json": "5692828f710f44d3ddd56722e4e1bf8213d62bce260abbba5fa6c92b080b472d",
    "runs/t3_20261002_105337/slp_05_box.json.gz": "9011ddb8ad585d386479b3bbb2e98c9e210cf81d5ead363b25e6d3bd8543742e",
    "runs/t3_20261002_105337/slp_05_log.json.gz": "0ce17e68bc67df3176f8fa19e11f25be59123aeafb10c1cc22e7a4c7430f4426"
  },
  {
    "runs/t3_20261002_105337/slp_06.json": "03706cf0c9715e6515c125d1d5aedc41cc500ab718ebd3895fa74ec4106ce926",
    "runs/t3_20261002_105337/slp_06_box.json.gz": "7c96aa55ffd747388ccec3810c85705aad95731b2d2e99f334539e413781befe",
    "runs/t3_20261002_105337/slp_06_log.json.gz": "d21042108ed79bf6d5b27aac289a20ca33d715623b87bfacdb9a895f79785b78"
  },
  {
    "runs/t3_20261002_110217/slp_01.json": "50d10e87b06188fe08220fac6aa2b8322dc12afe9b240b16599b1d2f3363f35c",
    "runs/t3_20261002_110217/slp_01_box.json.gz": "0156049997c993634c4ecb3104112f14e52b5a4d3c37f0ccbc5bf59401dbbcf0",
    "runs/t3_20261002_110217/slp_01_log.json.gz": "2c4becb3cd3fdeba12426566d4a13e2ab9846aea0a84675556272c794e44192a"
  },
  {
    "runs/t3_20261002_110217/slp_02.json": "2a3d8b1739703e76fdf42e3d3dc8fb73c11180f6feb92fbd56b184048ed1f912",
    "runs/t3_20261002_110217/slp_02_box.json.gz": "c430ad91f90826788ba29f118a9d309fad118164fe080ca78dad4d5174cda3d2",
    "runs/t3_20261002_110217/slp_02_log.json.gz": "8cc66a307280d9dc61741801deb9e19001723b99f5af3b689b21c47f73c2be53"
  },
  {
    "runs/t3_20261002_110217/slp_03.json": "f691c5b43f97274c1c9a3cb2126947e16c44d7c9a7db07fcebd567a40c019a42",
    "runs/t3_20261002_110217/slp_03_box.json.gz": "7102ec000d5496f474fdb9330767d18e8b6fdcdecb59e6046ebb9412afee7e78",
    "runs/t3_20261002_110217/slp_03_log.json.gz": "08ab249a84612b9ecf8cf958cc40f61bfe112094b4e042e7b073e67ed19d1c40"
  },
  {
    "runs/t3_20261002_110217/slp_04.json": "c0939976df972640a8eb401d8590192ac98aa17e2378bbfcd9d8c511e66e1c18",
    "runs/t3_20261002_110217/slp_04_box.json.gz": "fd8aa1252dc25eac6a157bbcc75105e6b22c130863566858f1e410c80ce38f5f",
    "runs/t3_20261002_110217/slp_04_log.json.gz": "cc47c0517f25e78c8ed2af07a8c74e29b98acc7e258b96c6561553dcd70e3fb5"
  },
  {
    "runs/t3_20261002_110217/slp_05.json": "fafecfb8edd5ea6ad2fa9a1f1e62e0017d1a4437b29ad4e6d3825b8f411457ca",
    "runs/t3_20261002_110217/slp_05_box.json.gz": "2cedcb67343f52599849e6d28d9bd4e43d3670dfa3ab10282a65cffc7c19c85e",
    "runs/t3_20261002_110217/slp_05_log.json.gz": "c0eaeba742638b90cb344e9cc7ea3fc902c467440d810a76e8d51e0f2ec55db0"
  },
  {
    "runs/t3_20261002_110217/slp_06.json": "921d3b297191db4f3d68b7c1ea33625e284016b3e9e4ecac7176971fa8d70e24",
    "runs/t3_20261002_110217/slp_06_box.json.gz": "ea621e83928302813796fea8610d69a5a0c112f211d8a47ad174a0d6e6c839c2",
    "runs/t3_20261002_110217/slp_06_log.json.gz": "989b43cc4ca22c2c31b448692106a74e300d4c39988c9ccbf0b2a0f2348d44d1"
  },
  {
    "runs/t3_20261002_110740/slp_01.json": "3772ba0082d8125f44ac6c4521cdf1dd36950f729d60e00d024d6750bda05f74",
    "runs/t3_20261002_110740/slp_01_box.json.gz": "fd06c02ebdaf752d9677942583f666d6ad20d9b300b22aafd3a23a9b30d5dd55",
    "runs/t3_20261002_110740/slp_01_log.json.gz": "ad14b03db059822e3c72524f83c7d7825062061cbae56d2bd13f2a54d16ff969"
  },
  {
    "runs/t3_20261002_110740/slp_02.json": "d4961e38081abc7a2ef6b4f2f715c3b89e444a4239a49481ef4278dfcc1a9020",
    "runs/t3_20261002_110740/slp_02_box.json.gz": "1630ed0f297dfb316c3b7f68f50b147360bd7fc90cbe98f43b4e24e2874bd1d6",
    "runs/t3_20261002_110740/slp_02_log.json.gz": "de7aa549eba8b00c577ec899a08b8531d86093f5bb2645563fc09b1d3d457d6f"
  },
  {
    "runs/t3_20261002_110740/slp_03.json": "fbbf22cb36329035e8cc65e0ec8677b4b4a7de84bbf9bd214d0418b4354aac7c",
    "runs/t3_20261002_110740/slp_03_box.json.gz": "ef6e9eea375f5e045bf4766bc27ece80fe74ed13119835b7fb98d0151fdbaadf",
    "runs/t3_20261002_110740/slp_03_log.json.gz": "34c712c1144e380fd3acf3f15f033279cb11df42f2bc543b82d7aa679f489c83"
  },
  {
    "runs/t3_20261002_110740/slp_04.json": "51910232bfec451ecae5641949edbe0f04085270a7e93f7d4a37447fb275f3d2",
    "runs/t3_20261002_110740/slp_04_box.json.gz": "17a89330425ea04001a5684004d132f0621e57b11cee98dc950c152e246495d3",
    "runs/t3_20261002_110740/slp_04_log.json.gz": "23e0ddf2406c71a40d3dc6021e04ff68f87234bca150860c1cf3c8f165e767f0"
  },
  {
    "runs/t3_20261002_110740/slp_05.json": "7d55dc42f3f7a332e69517bfff7bb32311424677d099424bcd4bca25bf13e4d2",
    "runs/t3_20261002_110740/slp_05_box.json.gz": "317596b5f6c961f87ee8acd545d6448dbe94179424b56b6ce7ab65e2b75dcbe2",
    "runs/t3_20261002_110740/slp_05_log.json.gz": "d81336654f34552c29efab51c94cbe94c6ff09306d0faa0b2584af58734c2bc4"
  },
  {
    "runs/t3_20261002_110740/slp_06.json": "7569c19e1cc0f9f111b3f8da0ebcd4e71dc3038fe10b9e66a05612821527fbb7",
    "runs/t3_20261002_110740/slp_06_box.json.gz": "369975abcaa34f1f300a1e36c307404bda8539ff98e93de4a381abdebe155cb1",
    "runs/t3_20261002_110740/slp_06_log.json.gz": "fc6f7a98e49bc4c74f24fa0b2a0ce7b3ea18d75d6284e1a9bf19d2698ae2b0cc"
  },
  {
    "runs/t3_20261002_111437/slp_01.json": "5d8ccb1944c3df79c52b9aade67c53fe71353d1059eb12138c381ad3cef19d9a",
    "runs/t3_20261002_111437/slp_01_box.json.gz": "75ca86e4843baa0a26ded3091bd5ee595b070ca317dc7cbdf6115a4bb57599f7",
    "runs/t3_20261002_111437/slp_01_log.json.gz": "c08e0baaf4d3a9c6c26e13ef9e5399a08bb6836c184d83e0aa332826b9e8a5f4"
  },
  {
    "runs/t3_20261002_111437/slp_02.json": "995f52aca686d570d052ed2bef5024e4eb8015ca18503e3c351a8514d4deb669",
    "runs/t3_20261002_111437/slp_02_box.json.gz": "917646d9f9477d1de5edae0ac26c4b2a82962b2a6680c02cd4fe048659c04183",
    "runs/t3_20261002_111437/slp_02_log.json.gz": "16bb6eedab7530e28593e1954f87fdfec3f9880d4bf02f664579f729c1730526"
  },
  {
    "runs/t3_20261002_111437/slp_03.json": "59c84cf9dae313534d734cf02fe1a906764cee9c15d6b16b452fca861b082dbf",
    "runs/t3_20261002_111437/slp_03_box.json.gz": "cd6fe5fb4bcdb358f7a2235ec19548fe085a170f41f25c2e3206d73e8e495f28",
    "runs/t3_20261002_111437/slp_03_log.json.gz": "944aad96ed72c8d6fb645b611825d110ddd934a83d129189d722aab5cec74bde"
  },
  {
    "runs/t3_20261002_111437/slp_04.json": "670ce3f79e9d27c623aa90c5df48fe27f2caf15f33bb93f02a703bd4c4447a14",
    "runs/t3_20261002_111437/slp_04_box.json.gz": "8648ac4782dfb480e39a0bc1712cae1f0fdc2fceede6b4dc621a4b5183221c97",
    "runs/t3_20261002_111437/slp_04_log.json.gz": "d754880e3256ac0ea889c88b1baa2a2032b84ffbfa4f3271d96a1bd08962d718"
  },
  {
    "runs/t3_20261002_111437/slp_05.json": "f3a7850f1b41f71adafc3bb05520465261be868f37f7131aadbf4a3a9554e6e5",
    "runs/t3_20261002_111437/slp_05_box.json.gz": "2cfc066d2f1d4e0b5f6b42f1cd5400e0a68b2fc34331db375aa7f78b968c2d3c",
    "runs/t3_20261002_111437/slp_05_log.json.gz": "fbbb08c0f65006af0acacd3ec8452c45d7df04abf3c548bbfce3490eb12dbe11"
  },
  {
    "runs/t3_20261002_111437/slp_06.json": "ad73cfc5aab64f003afd3ce0e8e5023caaafb7c8f5dfe39fa4b4ed5ac5454c1d",
    "runs/t3_20261002_111437/slp_06_box.json.gz": "0a5f991bea5c279f4159d33003de0080f46dfebd890cc579aa0a366f40c85423",
    "runs/t3_20261002_111437/slp_06_log.json.gz": "f86a1bfc104f348f298b368ef094ed0df669842ea17396b40de9e448d378efce"
  },
  {
    "runs/t3_20261002_112043/slp_01.json": "014c3ded076a7c00b3468119b8e3ebf7dd96868aacf26550a201b1c951638818",
    "runs/t3_20261002_112043/slp_01_box.json.gz": "0b25052a2f9a793ac067c0e303a150c8543c813f52c8cfaebfb9d4a0d0517cd2",
    "runs/t3_20261002_112043/slp_01_log.json.gz": "0df373efe73c048a65198eaa923699448692eaf0f4718e031d93c76df454e2d8"
  },
  {
    "runs/t3_20261002_112043/slp_02.json": "d7f07462f490b479c7376d9c424b382a555bc1c09e31c134fac73aa8e838a986",
    "runs/t3_20261002_112043/slp_02_box.json.gz": "61283d54c64f209246fa6ef49761c0f0fcdb576514780c8153ff702c409ba120",
    "runs/t3_20261002_112043/slp_02_log.json.gz": "84cd03b5b0f89ebc9d464eebb7725268b97ce7872b8a583706257d9e33df2f09"
  },
  {
    "runs/t3_20261002_112043/slp_03.json": "1f142682f3dd3347d1d3277ed6a3e1509ff01ee18e5ea20c7411df2567b0a766",
    "runs/t3_20261002_112043/slp_03_box.json.gz": "cf0e959fc61fbef553114c8bc97fb3bc299cf44f88229053133887d0ad5e1e75",
    "runs/t3_20261002_112043/slp_03_log.json.gz": "b005b3fd316484d827ac62703c34ed3b857814a5f52fbd240044b68fca42c95c"
  },
  {
    "runs/t3_20261002_112043/slp_04.json": "b7d83284b9f829fa7111d9fb4f3101c342ed3530ea1a44215a256382fea5fd7d",
    "runs/t3_20261002_112043/slp_04_box.json.gz": "e2662f2cb15a4842ec3e850aff1ba8c57cb2546c0e723781b914b33f3cc6a3c7",
    "runs/t3_20261002_112043/slp_04_log.json.gz": "45d4b5551879976d26431341862d23e3fc24d79d63d3df2627a6528222cd8ac6"
  },
  {
    "runs/t3_20261002_112043/slp_05.json": "22926ea8226a3ad7be748eaa2e42f8773f679b95451f4af0bda7aec92d9d70c6",
    "runs/t3_20261002_112043/slp_05_box.json.gz": "ab421034fb3ef2245ce5ec5b3d4723e728be392c0c0487e25596c6da7d37acc8",
    "runs/t3_20261002_112043/slp_05_log.json.gz": "485a1beed04ecdcc3195156503c7a52960ba61c1bf913cefaddbbcd45b55e1b0"
  },
  {
    "runs/t3_20261002_112043/slp_06.json": "f693a4a7c2abb15bd603c096649a762a19719192668e37817e448633becacf69",
    "runs/t3_20261002_112043/slp_06_box.json.gz": "4b8f81b4591c546aad97ece3728dcf86bc2ca93ab985b7617d6d243c53fe5788",
    "runs/t3_20261002_112043/slp_06_log.json.gz": "04b7397110a7009f4613c9388bdd4ea457ab70254e2e40181a5bf2fab12b9436"
  },
  {
    "runs/t3_20261002_112638/slp_01.json": "b910ca0a67cbb83b72f8b0c059c30494726883d7224da3d6ae4dfe500249a648",
    "runs/t3_20261002_112638/slp_01_box.json.gz": "ac192eb00f5fede520eaacc2e8b438650eac26c6b96430b373b45388ef00d120",
    "runs/t3_20261002_112638/slp_01_log.json.gz": "fd18dc490117d740c1c0b5421d99bc3f492ff1e6364ac81837e61c2c6505597a"
  },
  {
    "runs/t3_20261002_112638/slp_02.json": "78145d2ec8218b9a273217127b466ef40f4dc574baaeb473c9f70c18ac390a78",
    "runs/t3_20261002_112638/slp_02_box.json.gz": "83fc258b81fae79bf9c4f2c382a45dfa23e48f1c37d20d22905faecd132e860a",
    "runs/t3_20261002_112638/slp_02_log.json.gz": "0f1f52748b364e27f9e1cb0b1a3bb553f089ef0dc38c2f84e8cb990b5edd9a1d"
  },
  {
    "runs/t3_20261002_112638/slp_03.json": "e7bda0e8429b611e7dd0289a8e4d1cf37a420c644b68e701257913a0fa1cae68",
    "runs/t3_20261002_112638/slp_03_box.json.gz": "19c1fccafe94cd172fed5e600ac0e925d96e90ce58a8a4748e8f2a67189e4324",
    "runs/t3_20261002_112638/slp_03_log.json.gz": "a239335d47ee821aa3d38f355919432ae0be389cf098725620f74a937dc7988e"
  },
  {
    "runs/t3_20261002_112638/slp_04.json": "b32f4ebd7af9ec8e6ea60d3b9805983ccc69727c4fb23c19c7002c2f70e201f5",
    "runs/t3_20261002_112638/slp_04_box.json.gz": "681edf505dcd4f390535ac1510f7cfa52012ac3daf0f4279b12562e76d22d4d3",
    "runs/t3_20261002_112638/slp_04_log.json.gz": "5af9701e83be92c41302d4059059edeb0cf2688a83041ca3e72e718e0a4462e0"
  },
  {
    "runs/t3_20261002_112638/slp_05.json": "bca39d06b976610b1e04721c53e6c3e6517f33948fe62540c135270f5e69dd5d",
    "runs/t3_20261002_112638/slp_05_box.json.gz": "9156555ff2ddeffdf5f7e169b9ac296a461c19ae6e66f23afe654ee65415fcaa",
    "runs/t3_20261002_112638/slp_05_log.json.gz": "325e6635f0a0440ecbef622b6b3c4006f1649ecc5999b325ed4b9d6ee9f3639f"
  },
  {
    "runs/t3_20261002_112638/slp_06.json": "a248a1906b70aad8e17442666fcec056730c16ec61bd4682a922fcc1c0cb5608",
    "runs/t3_20261002_112638/slp_06_box.json.gz": "70008f7c5aea27e0513519d83b2acae243c2e06fad3195e30cf5338087de93c4",
    "runs/t3_20261002_112638/slp_06_log.json.gz": "67e35ceef78ef05bfd08aa49906f26196747949506137bc7633a247846b615f1"
  },
  {
    "runs/t3_20261002_113306/slp_01.json": "f0421d6cce1f0ad982e0b054de7a156bea29477d265a8a4070f351e2eb00cedb",
    "runs/t3_20261002_113306/slp_01_box.json.gz": "6171dbedc26f42a4eac391c68ecda2830b3d38ba09a60a5875f2da5ef16a4072",
    "runs/t3_20261002_113306/slp_01_log.json.gz": "c59044f6af652b192b6e6711a8f2a3672f001f4b5eb4bf9fefa2b69eb9b483e5"
  },
  {
    "runs/t3_20261002_113306/slp_02.json": "d503fd98d6a13f0ca609582fdff31adebe2559dff64e9218ec8934db59b4b96f",
    "runs/t3_20261002_113306/slp_02_box.json.gz": "af422537143444fd191fbad0e34c2d650b62d9205f2c054c1507586d5e60334a",
    "runs/t3_20261002_113306/slp_02_log.json.gz": "a31450944663538ebd38bfeb41468bd5c60526a9204fa196e760986975d664ad"
  },
  {
    "runs/t3_20261002_113306/slp_03.json": "f75c57c2716a5691111b9846c98580037865e192ed5e2add679ee00bc046cadb",
    "runs/t3_20261002_113306/slp_03_box.json.gz": "062aa2d44e960da5500aec23d990dfbe6ee5e26528b51616c2651bc958d3fbf3",
    "runs/t3_20261002_113306/slp_03_log.json.gz": "176e1b4703ced198b15113748cdd9faa92449c4ba5440340ab9f89a258073732"
  },
  {
    "runs/t3_20261002_113306/slp_04.json": "2e3913f4010696341e70ac3b1958050e51ee22bbd297ae8e779e785b9e65111b",
    "runs/t3_20261002_113306/slp_04_box.json.gz": "44581b454979ab89b8192833e7444dd222c7cdebacfadaa8f70bf682aabef054",
    "runs/t3_20261002_113306/slp_04_log.json.gz": "6c66eb32d2139ef50c6aa4e6958b927d751f07508791b620e5c859ecb251a714"
  },
  {
    "runs/t3_20261002_113306/slp_05.json": "fc97abb8289cbc446beaadd5b990a382edfd322a03e76d867f54b129f46566df",
    "runs/t3_20261002_113306/slp_05_box.json.gz": "591aea8b1e579a1caa23ee9ceea7134f4c17face0ec25e725dfc3f065cf9efa8",
    "runs/t3_20261002_113306/slp_05_log.json.gz": "8de0a0b001de1a72d579e2d44db0695a768dab3a30b6d485ba8859d00df68eae"
  },
  {
    "runs/t3_20261002_113306/slp_06.json": "f34262a472ead3e2c66df761a82a2c8de50bd31eae60acac16a9e7df20b73c0e",
    "runs/t3_20261002_113306/slp_06_box.json.gz": "53a264b2a00904de8c0af0849275f841f7fa87ddb6c828305a0abe9b68a71236",
    "runs/t3_20261002_113306/slp_06_log.json.gz": "977bfa3ea99fe5b25d93ffd54055187b698ef56170e9b4487d6bd4bfd2e86026"
  },
  {
    "runs/t3_20261002_114036/slp_01.json": "f329d52d8e2c7652ee111c178398a99532e9f1cb490e74c6b7ae4e6ae4841560",
    "runs/t3_20261002_114036/slp_01_box.json.gz": "9d41d02b919ef43523bc57dbd8f28d985252d6c99ee125d64db3ec4733094284",
    "runs/t3_20261002_114036/slp_01_log.json.gz": "53ee97b1b15c7ba4f83f4d40a291d3cebf1c46d128df11604b5771063671998e"
  },
  {
    "runs/t3_20261002_114036/slp_02.json": "ccdc213310b8da971b40ce239c183a409ae09178d5e9c0f7b6defb9b8697b0a4",
    "runs/t3_20261002_114036/slp_02_box.json.gz": "49cb5ed0fb6549619ec9cedd02aec6ef482b9795960c582af83b1b909e73d13b",
    "runs/t3_20261002_114036/slp_02_log.json.gz": "d65b86092f58141c3e2bfee80bf0d435fbd9d339127bac613cf2f32e3ab5427a"
  },
  {
    "runs/t3_20261002_114036/slp_03.json": "ad336a6f08364d336ce050ccaf1023378a255b0d6e549ae2a524aef81caa8249",
    "runs/t3_20261002_114036/slp_03_box.json.gz": "0e692fecdef9f0f6b9929795f83acab446214fca8f5f855a93668d705eb9e7d4",
    "runs/t3_20261002_114036/slp_03_log.json.gz": "ac04fcec5ea4a723ea2b3e1a2a32b3f02a863bfe2afcda91c693a244c6a45899"
  },
  {
    "runs/t3_20261002_114036/slp_04.json": "0b17ba2de793d7fbdd9a7eef5f540a51f634a2ee47c100eb97c77f44384fd1eb",
    "runs/t3_20261002_114036/slp_04_box.json.gz": "bc7de5c3f59a1a1319887e87a96c4bad52645ef963b27c39248aa999834e03de",
    "runs/t3_20261002_114036/slp_04_log.json.gz": "51e452b8eee4f729edba26e515453fd089b1d06e105978499d424a19e5c78478"
  },
  {
    "runs/t3_20261002_114036/slp_05.json": "348ecb5b0a207b60cd369437ffc7f8ac978189d91c5c3d4cb680f50ef9078937",
    "runs/t3_20261002_114036/slp_05_box.json.gz": "cfe55d3514b16c1e2437493dc125f5a8dd6eb6f97755983e19bd87972e260f81",
    "runs/t3_20261002_114036/slp_05_log.json.gz": "759d009860e9d412556a18a4232d19eb8bb1684595e2ecd3850019e66eb86d1d"
  },
  {
    "runs/t3_20261002_114036/slp_06.json": "5ee7bee21b0cd99a49aa5bfb9d1707900c2f7fea4b85eed24a3bbf2dbc3195d2",
    "runs/t3_20261002_114036/slp_06_box.json.gz": "14acebcb31424ea5d05d8cf657a138af7a1a643cc970dbde7c8a0513ddc90e9e",
    "runs/t3_20261002_114036/slp_06_log.json.gz": "365c27f518d9805807e4eede48d03ec3c64085a57009d17bd6dadf05405f16e5"
  },
  {
    "runs/t3_20261002_114853/slp_01.json": "95b62ea07883a24a0911581a475db7a6ccfdce388ec7aabbeeb793b6874c5868",
    "runs/t3_20261002_114853/slp_01_box.json.gz": "5494ee64bcfbe6f8c23c3e90b1b87969202f6effdf64169c5ed08a14910a5bdf",
    "runs/t3_20261002_114853/slp_01_log.json.gz": "0a534cf086c83902db586f60c2d5c0289764ea4cea8b48ecda6c8a614fc3fd63"
  },
  {
    "runs/t3_20261002_114853/slp_02.json": "95830a47bfa23636dbc68b0233f5328efb61ed0942fae82e5b6bb12a0c49f432",
    "runs/t3_20261002_114853/slp_02_box.json.gz": "cc260b60a5232f8fa36dcdd0e6fc14b56d820675e50d3b5f97e25e891b27f128",
    "runs/t3_20261002_114853/slp_02_log.json.gz": "988d83ac3fd5d51894d9d3b5b6294e45f00afc01f482af993ab9a3756b65b544"
  },
  {
    "runs/t3_20261002_114853/slp_03.json": "ff8a74966382e33089ec0f8883aef57552989e7f1a633c04336e87ee08ebe175",
    "runs/t3_20261002_114853/slp_03_box.json.gz": "d8c9f963251c224de5075e6af221a04c05358dd08cb0a63d17c0e3f5928c2550",
    "runs/t3_20261002_114853/slp_03_log.json.gz": "5412469b569d00e5ca28823efe8331b1146c90dfd3d737508429ddfc167858a6"
  },
  {
    "runs/t3_20261002_114853/slp_04.json": "41c92618f8d52bb52e82af55c8dbae46ca060d7b44365add22156af99efdc046",
    "runs/t3_20261002_114853/slp_04_box.json.gz": "ebada47614cb89e6021e13da170ad780a995c5d18213b10e019334a63efb0adb",
    "runs/t3_20261002_114853/slp_04_log.json.gz": "82148240654a1e905c563f7877ae779a8b59dd05b93cbc1f9abad848448c0299"
  },
  {
    "runs/t3_20261002_114853/slp_05.json": "b2a1e186b657ac221ced9dd5582df82965efe7b70809bcc692e82d9ad8bb3e85",
    "runs/t3_20261002_114853/slp_05_box.json.gz": "e9500cd62bff1fe4ba244857a9d2e6e6f52e095f14a36dadc059e5f6b5515839",
    "runs/t3_20261002_114853/slp_05_log.json.gz": "97785ce0669e69a7baeee5de6b3c801784e42337595eed9aae4f0f3d86de434a"
  },
  {
    "runs/t3_20261002_114853/slp_06.json": "891f9ab23e2190c1db2fbea788e3216c4ee83022b6be5300768739d53d1bdfa7",
    "runs/t3_20261002_114853/slp_06_box.json.gz": "f895d08553a5fd3b5468fe7b3789720ef46d13e4938612c22eb47589d59ef0b2",
    "runs/t3_20261002_114853/slp_06_log.json.gz": "1ebf4543c120c67ceb9c081f59818f01b4170f5fd7f6ddb30c6a52cf47916c24"
  },
  {
    "runs/t3_20261002_115616/slp_01.json": "f076e8679255a69e3e65a94c8e14e257bfa2063ea0a784a3ee6bf611ca3a5ecc",
    "runs/t3_20261002_115616/slp_01_box.json.gz": "48e33678fdf2109081a5c3b59ee7911bc9024ddba10eb9a8e3b043d4801344c3",
    "runs/t3_20261002_115616/slp_01_log.json.gz": "f8f7a313681f43806861279e2dc36ad21b24fb10795a3d5d115b15134d4d86c1"
  },
  {
    "runs/t3_20261002_115616/slp_02.json": "4555f7e7462feaa074324947e0f043bcf1f3b9132263745eccd1d03d1f80cb23",
    "runs/t3_20261002_115616/slp_02_box.json.gz": "bcf5d0b3c877785326b2e3f76b3171fed30099afb8e765e730c572cf779e6421",
    "runs/t3_20261002_115616/slp_02_log.json.gz": "da14b7ed9b9e289c0ad48f059da89e2e432c0098430e8b216d2e602a4349a28d"
  },
  {
    "runs/t3_20261002_115616/slp_03.json": "3f9d3278b65c0baf071c3cf1381bb794064200a81c1bc567076b7b5f14fd67fb",
    "runs/t3_20261002_115616/slp_03_box.json.gz": "4b484712f3391219cecefd02744e6715e5e58800b4e48dc799ef80e447405f20",
    "runs/t3_20261002_115616/slp_03_log.json.gz": "850d14ddf9d1c178076b9bf36313f5c0fb858cba420babb76eb4e1c6058f6937"
  },
  {
    "runs/t3_20261002_115616/slp_04.json": "3b4f3840a3ee95746069a6b8dde42aace0b496c2843e7c242916d866b40cfa9d",
    "runs/t3_20261002_115616/slp_04_box.json.gz": "c112b9a5c7e0ebc724bd29b0d442534153dcd0b56424d4f11ad752d7a38c0210",
    "runs/t3_20261002_115616/slp_04_log.json.gz": "9e9e1638af8e35cf2cddc7247a1992f4d4b4620264db27d571e5718625b23455"
  },
  {
    "runs/t3_20261002_115616/slp_05.json": "24998dc82f3275baaec97be0ab687f3a5ece2e67dfef8f468bb6fdbbca4f7763",
    "runs/t3_20261002_115616/slp_05_box.json.gz": "717d3d028975d55a76e6035cc9147cb91ddd1ea37c039a7e710948168b66cf16",
    "runs/t3_20261002_115616/slp_05_log.json.gz": "7d1bc5ca50a9f360f71e8f5a6d639a964c7b3459fd01f016b4140f5bc8940a67"
  },
  {
    "runs/t3_20261002_115616/slp_06.json": "fd1ade4107c035fd59b315e591682890c1fb94519bd0d7ea073e1eb8ee704d62",
    "runs/t3_20261002_115616/slp_06_box.json.gz": "a2e0bc1d9d950b208ea6caa8a896e606ecc75e4175d1cf704c9576facf762d24",
    "runs/t3_20261002_115616/slp_06_log.json.gz": "415d7869db6f9f424911635e960557b26c46371555112cdfd74cdbd6d309007a"
  }
]
```
