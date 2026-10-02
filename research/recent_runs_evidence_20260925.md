# P18 최근 실행 로그 분석 원자료 — 2026-09-25

분석 대상: 저장된 P18 공격형 25판. 운영 코드 실행·실사이트 실행 없음.
판별 원본 로그와 블랙박스 SHA-256은 아래 manifest에 명시.

## 분석 범위와 코드 해시
```json
{
  "scope": "2026-09-25 P18 finished games at/after 17:06:51, fixed recorded controller hash",
  "recorded_code_hash": "ddffaf1dc2a8f6a561d04e15cb477fddcee3f26a4c2192a5c638850bddf93920",
  "analysis_start_current_files": {
    "pilot.py": "a507f2c83262720b4599ffc58aa446ffb47ed4c62dc15a1c486769f70ca418de",
    "run_live.py": "7f3f470b1771b3d7a109e0074e3ce80e9d9733295f858e11200e50e1fbe18d0a",
    "deaths.py": "336bf9f66daeadd18f993d0e902ca444426cee9feb8cd7e22713eaa989581882",
    "batch_stats.py": "a121b17f009aa61fccef50ec19bd411b44e2dcca10b36eaf99daa810e7872e69"
  },
  "analysis_end_current_files": {
    "pilot.py": "a507f2c83262720b4599ffc58aa446ffb47ed4c62dc15a1c486769f70ca418de",
    "run_live.py": "7f3f470b1771b3d7a109e0074e3ce80e9d9733295f858e11200e50e1fbe18d0a"
  },
  "excluded": [
    {
      "path": "runs/live_20260925_173812.jsonl",
      "error": "JSONDecodeError"
    }
  ]
}
```

## 전체 재계산 요약
```json
{
  "games": 25,
  "blackboxes": 24,
  "seconds": {
    "n": 25,
    "p10": 45.52,
    "p50": 125.2,
    "p90": 310.80000000000007
  },
  "L_max": {
    "n": 25,
    "p10": 347.0,
    "p50": 1578.0,
    "p90": 3910.8
  },
  "growth_peak_per_min": {
    "n": 25,
    "p10": 345.157049917557,
    "p50": 631.9646133842098,
    "p90": 1425.1857664232737
  },
  "growth_net_per_min": {
    "n": 25,
    "p10": 342.4915627904937,
    "p50": 629.5949739339661,
    "p90": 1424.5255279121116
  },
  "total_observed_seconds": 3859.7279999999996,
  "mode_share_time": {
    "coil": 0.003147112957182438,
    "emergency": 0.01976305066056466,
    "escape": 0.01953764617610357,
    "evade": 0.3162443052981971,
    "feed": 0.5903830528990647,
    "unwrap": 0.050924832008887665
  },
  "boost_share_time": 0.6231314745495022,
  "goal144_share_time": 0.6005301409840277,
  "goal_positive_share_time": 1.0,
  "safe_share_time": 0.9798786339348264,
  "jumps90_per_min": 51.4077675939859,
  "boost_toggles_per_min": 134.1545310964918,
  "aba_returns": 891,
  "last5_goal144_games": 23,
  "last_boost_games": 20,
  "last_safe_positive_games": 0,
  "turn_side_flips_last5": {
    "n": 24,
    "p10": 0.0,
    "p50": 1.0,
    "p90": 2.0
  },
  "box_seconds": {
    "n": 24,
    "p10": 35.392794711285845,
    "p50": 44.454505161000725,
    "p90": 52.69358835930252
  },
  "movement_windows": 195,
  "movement_low_straightness_share": 0.4256410256410256,
  "low_straightness_large_net_turn_share": 0.5903614457831325,
  "end5_straightness": {
    "n": 24,
    "p10": 0.2647601703919992,
    "p50": 0.46175037682791353,
    "p90": 0.6911777289864002
  },
  "base5_straightness": {
    "n": 23,
    "p10": 0.14606452526729383,
    "p50": 0.5219162419070213,
    "p90": 0.7276076162289377
  },
  "head_forecast_errors": {
    "0.32": {
      "min_distance_to_modeled_head_endpoints": {
        "n": 9912,
        "p10": 5.0359956937059716,
        "p50": 13.596473725275716,
        "p90": 35.94831283814396
      },
      "outside_combined_radius_share": 0.06739305891848264
    },
    "0.64": {
      "min_distance_to_modeled_head_endpoints": {
        "n": 9841,
        "p10": 12.610527576196297,
        "p50": 42.39169813827707,
        "p90": 116.89250097267971
      },
      "outside_combined_radius_share": 0.4760695051315923
    },
    "0.96": {
      "min_distance_to_modeled_head_endpoints": {
        "n": 9760,
        "p10": 24.852436999767022,
        "p50": 88.98889737095519,
        "p90": 228.55663712579022
      },
      "outside_combined_radius_share": 0.7447745901639344
    }
  }
}
```

## 부스트·먹이·속도 후속 재계산
```json
{
  "summary": {
    "boost_on_duration": {
      "n": 4305,
      "p10": 0.041999999999994486,
      "p50": 0.2149999999999892,
      "p90": 1.426799999999997
    },
    "boost_off_duration": {
      "n": 4325,
      "p10": 0.03800000000000381,
      "p50": 0.12399999999999523,
      "p90": 0.6602000000000002
    },
    "boost_on_under100ms": 0.31869918699186994,
    "boost_off_under100ms": 0.43213872832369943,
    "observed_chord_vs_sp31_ratio_200ms": {
      "n": 4090,
      "p10": 0.9401718642376085,
      "p50": 1.0901812169709926,
      "p90": 1.2554524298955692
    },
    "ratio_over1_25": 0.10757946210268948,
    "goal_high_without_remains_share": 0.02246603970741902,
    "coil_ticks": 258,
    "coil_games": [
      "live_20260925_170651",
      "live_20260925_192050"
    ],
    "coil_hard_under5": 12,
    "five_sec_windows": 760,
    "nonpositive_growth_windows": 184
  },
  "goal": {
    "checked": 5175,
    "score_matched": 5175,
    "high_score": 3828,
    "high_score_without_remains": 86,
    "examples": [
      {
        "game": "live_20260925_173206",
        "lead_s": 38.09148011999787,
        "score": 160.4,
        "grains": 23,
        "max_food_size": 9.0,
        "distance_to_cell": 1053.758306720996,
        "mode": "feed",
        "boost": true
      },
      {
        "game": "live_20260925_173206",
        "lead_s": 37.933799580001505,
        "score": 160.4,
        "grains": 23,
        "max_food_size": 9.0,
        "distance_to_cell": 1013.9224664971898,
        "mode": "feed",
        "boost": true
      },
      {
        "game": "live_20260925_173206",
        "lead_s": 37.79597574000945,
        "score": 160.4,
        "grains": 23,
        "max_food_size": 9.0,
        "distance_to_cell": 973.2401343002912,
        "mode": "evade",
        "boost": true
      },
      {
        "game": "live_20260925_173206",
        "lead_s": 37.611548190005124,
        "score": 160.4,
        "grains": 23,
        "max_food_size": 9.0,
        "distance_to_cell": 949.2321052464939,
        "mode": "feed",
        "boost": true
      },
      {
        "game": "live_20260925_173206",
        "lead_s": 37.448429309995845,
        "score": 190.4,
        "grains": 23,
        "max_food_size": 8.800000190734863,
        "distance_to_cell": 1184.2535788617497,
        "mode": "feed",
        "boost": false
      }
    ]
  }
}
```

## 원본 파일 목록
```json
[
  {
    "name": "live_20260925_170651",
    "source_sha256": "16c82caf17218b5338061782a6a0d9f08723868b7ed483379bbb2e8173681886",
    "blackbox_sha256": "ae07754f1e07be8c72b014657262bebdd33c736a60fa0da5c5c0013a572d4e53",
    "blackbox_error": null,
    "seconds": 403.4,
    "L_max": 7835,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_171431",
    "source_sha256": "a4437156f4b4ea0810efba017ad9129be36c650fe7f3343d239fd0c5905377d5",
    "blackbox_sha256": "e8bef9d3ae8cdab8c919da264fd6503446cc7752e48b9f8b73107398c1ccf3e4",
    "blackbox_error": null,
    "seconds": 104.3,
    "L_max": 899,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_171635",
    "source_sha256": "ac25d821dba6009e16854a00348c3012e2d0670d095a1f6b536818e858d9e598",
    "blackbox_sha256": "ffd3f667dd3b1eab12bb20d3cca00532e0a7498082a47ddb2375e2d66d451181",
    "blackbox_error": null,
    "seconds": 96.1,
    "L_max": 587,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_171833",
    "source_sha256": "161ff02afbef21fbafbb18b5e208a7ffbbdccd5ca00a8806e1591bb920b17182",
    "blackbox_sha256": "93918483c945ae45557ac1e6b9b81c2e1b4689cd823c77e59d7155825a77ce88",
    "blackbox_error": null,
    "seconds": 96.8,
    "L_max": 791,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_172034",
    "source_sha256": "490b7f90211326f01484ce8b4cc5e75f9d86594045d84c5e1eb0e23301f539f0",
    "blackbox_sha256": "58ba39a1f165afc58afda154e7063faaa32318a712af6d4c0c6578725f553957",
    "blackbox_error": null,
    "seconds": 125.2,
    "L_max": 2220,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_172303",
    "source_sha256": "58163728a99abf364cbce88a80dd8fbfbc0d906bdf5d9b9927f12531b8a0d074",
    "blackbox_sha256": "f459d5f7d63c35d1fd30fd482358061b29a6b4baf14f4c037b20be9f7e717ac7",
    "blackbox_error": null,
    "seconds": 138.6,
    "L_max": 1835,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_172548",
    "source_sha256": "b737289a2d5026e2b65be051d2a82e0bce6f4a528e6b15237e6f6d02edeca6e4",
    "blackbox_sha256": "bb830edcdcad7246caea6e8765a1ed977ed2084de6ef69033ce1569e9e1b1a92",
    "blackbox_error": null,
    "seconds": 329.6,
    "L_max": 3477,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_173206",
    "source_sha256": "6f8e6865dfc7bb9cdc0792739a95b1714981bae170c2c8094ed1f691591969aa",
    "blackbox_sha256": "2af98846706c639ddefec0815740993ceff9182044df88be758220467dcd2699",
    "blackbox_error": null,
    "seconds": 107.3,
    "L_max": 3039,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_173418",
    "source_sha256": "8cf5201250eed428d7bab8f8c66c3bea70bceb38c2744f3f89e0265569ab46f7",
    "blackbox_sha256": null,
    "blackbox_error": "EOFError",
    "seconds": 200.5,
    "L_max": 3918,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_183803",
    "source_sha256": "a8367e33af118509d91ea39e06f8263a1800e26f721b84b493afbc4b24a0f277",
    "blackbox_sha256": "1bddd5805d94a62f1138c79f5228814c695aed414130a68650bcb9f47f85068a",
    "blackbox_error": null,
    "seconds": 18.4,
    "L_max": 466,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_183834",
    "source_sha256": "2271142e3c9f73d6fd5a5011257b7929651634b2a601e14b7f63e64d44e6fba2",
    "blackbox_sha256": "542c3f499849e4afff4e0092167e5a5171111531168f18855e6454ef132cefc4",
    "blackbox_error": null,
    "seconds": 28.9,
    "L_max": 394,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_183915",
    "source_sha256": "d4483a26de8bc8235cfb0148db3a86277cd9088b47760014b61803eafa92178b",
    "blackbox_sha256": "48de2a8c09a810b3feb4f72311b9f4a0e33752a01775d4e034c15d993a2fa07b",
    "blackbox_error": null,
    "seconds": 47.5,
    "L_max": 684,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_184019",
    "source_sha256": "f2ef1f401064f380e8c18016852877767dac9114437cc9af3c4713dc981640bf",
    "blackbox_sha256": "fe4c3e3885ae041d30fbf0314fa196d6e50368f82c919f070e615871057d77d3",
    "blackbox_error": null,
    "seconds": 356.6,
    "L_max": 3900,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_184659",
    "source_sha256": "3ef203c8ce08e4d298dcf820ad695b279f383b1755a0bc0bd56a11f1ac2ed975",
    "blackbox_sha256": "3e0b16db1be6dc18644e9db8c353f731f0485ffc1ec27d8b0603908742d82382",
    "blackbox_error": null,
    "seconds": 44.2,
    "L_max": 319,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_184759",
    "source_sha256": "afce025891c4863642ea3fe589f33aec38df3806d15ba52f824a50dfda719f71",
    "blackbox_sha256": "78bce5a4836622ef1abca69ebe8a63dce1d9c5086b71a74c359e18396c190a03",
    "blackbox_error": null,
    "seconds": 217.7,
    "L_max": 3180,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_185208",
    "source_sha256": "339815fa44ea4c2c584255dd748516cf412bdbda238e5c953d31ea8721eca732",
    "blackbox_sha256": "fc60dfd5fac66d910c655a7d2da5a485dcc74325507b11da9dac33baf313b8e0",
    "blackbox_error": null,
    "seconds": 156.0,
    "L_max": 5416,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_185508",
    "source_sha256": "798003fdcd32b40e10539704546d5cae15667885748ddd9af29ba8316e228827",
    "blackbox_sha256": "03f9e24da5e50a1ec8364d2cf8fcd3fb680b6618b32988878c9668bd4e8a8cc7",
    "blackbox_error": null,
    "seconds": 192.7,
    "L_max": 1529,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_185849",
    "source_sha256": "375602ca15ab19e10b502cb6bcd47c254270c89b7981c475ce38070c0739ec11",
    "blackbox_sha256": "d1408d9edf933e625db29aef94abcf599350658fa9f9febc14aa288218d5c16d",
    "blackbox_error": null,
    "seconds": 71.3,
    "L_max": 125,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_190018",
    "source_sha256": "76b2c64a04864c9e89dbb660da1d8c5b91cb5bd871625182d819b39d0afba54a",
    "blackbox_sha256": "98d191c3876863e9f429dc851e5fc7cd8652e129bf7f5275dab21e26fac4d458",
    "blackbox_error": null,
    "seconds": 202.7,
    "L_max": 1649,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_190409",
    "source_sha256": "dba87a8388292d904cf5d3217393b4a50e85a4e1308fb68bb80635b2f250ab23",
    "blackbox_sha256": "23c3d4b09931e08a94282cb3e79a441f1d93797ea2bda4223bed8377f1a599d9",
    "blackbox_error": null,
    "seconds": 53.9,
    "L_max": 100,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_190520",
    "source_sha256": "d9ad0ff20b4c974eb926156e9f3c75a2b28e9aa624d67bddf7b64d8ca623a377",
    "blackbox_sha256": "df288f140ee825be17697c0c917ff6fe7444288890edf914cecafefc107eaf5c",
    "blackbox_error": null,
    "seconds": 266.1,
    "L_max": 1578,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_191022",
    "source_sha256": "508cc9491a70ac092846dbb6f8a85766501a40a65a7ee0bc3e0f14128bd711fd",
    "blackbox_sha256": "01c4f5719cd4c7423a75b9ed0eebca8b764c1b11f57dd1efab4dfdc193b53ee8",
    "blackbox_error": null,
    "seconds": 282.6,
    "L_max": 2792,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_191540",
    "source_sha256": "6e03ee4ee145d28b7192451d0eddc2aa4b3fb16513d35d8ad8e7cd744f31ce60",
    "blackbox_sha256": "211a4f13bc6f89ae1403b21107218ab1560580aa5fe236c3105ff5ae7c7da652",
    "blackbox_error": null,
    "seconds": 146.0,
    "L_max": 3190,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_191831",
    "source_sha256": "97f64f69790795d1a18ed1714930662831ffd1cc463614758b09ee6285aeab5a",
    "blackbox_sha256": "71304c228ade0c40c92714acf26388dc73cfaa081ca003095f93e36bda56a857",
    "blackbox_error": null,
    "seconds": 117.9,
    "L_max": 868,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  },
  {
    "name": "live_20260925_192050",
    "source_sha256": "1ed7d5a680c8a6d0a477a00fd5e1facaa18e6d2eb3634e1f43b15bcef4f2abfc",
    "blackbox_sha256": "1b2356d2fb4ee365db96aa2197b3520d3e924ce075353a7af9841de9be81c18d",
    "blackbox_error": null,
    "seconds": 67.3,
    "L_max": 389,
    "runner_sha256": "8110ad7bbfc88aef2c0cf28e2ea7d6d8ea30371ef5050146100317c5b551b423",
    "profile": "aggressive"
  }
]
```

## 대표 사례 관측
```json
[
  {
    "name": "live_20260925_170651",
    "coverage_samples": [
      {
        "threshold": 0.4,
        "lead_s": 20.91687101998832,
        "observed_cover": 0.5833333333333334,
        "x": 31365.359670492824,
        "y": 29982.16127840744,
        "ang_deg": 45.0,
        "mode": "unwrap",
        "boost": true,
        "cmd": -93.8,
        "clear": 81.9,
        "hard": 59.9,
        "n_safe": 20,
        "threat": 0.0,
        "enclosed": 0.42,
        "wrap": 0.58,
        "thr": 5.0,
        "eat": 282.0,
        "goal": 2156.0,
        "thread": [
          230.2,
          318.2,
          false
        ],
        "L": 7135,
        "sc": 3.01,
        "died_near": 18,
        "kills": 6,
        "big": 0.0,
        "curl": 0.62,
        "prof": "aggressive",
        "onward": 67.9,
        "nh": 4,
        "crowd": 986,
        "gap": [
          110.9,
          42.0,
          16.4,
          43.6,
          false
        ],
        "esc": -22.5
      },
      {
        "threshold": 0.5,
        "lead_s": 20.91687101998832,
        "observed_cover": 0.5833333333333334,
        "x": 31365.359670492824,
        "y": 29982.16127840744,
        "ang_deg": 45.0,
        "mode": "unwrap",
        "boost": true,
        "cmd": -93.8,
        "clear": 81.9,
        "hard": 59.9,
        "n_safe": 20,
        "threat": 0.0,
        "enclosed": 0.42,
        "wrap": 0.58,
        "thr": 5.0,
        "eat": 282.0,
        "goal": 2156.0,
        "thread": [
          230.2,
          318.2,
          false
        ],
        "L": 7135,
        "sc": 3.01,
        "died_near": 18,
        "kills": 6,
        "big": 0.0,
        "curl": 0.62,
        "prof": "aggressive",
        "onward": 67.9,
        "nh": 4,
        "crowd": 986,
        "gap": [
          110.9,
          42.0,
          16.4,
          43.6,
          false
        ],
        "esc": -22.5
      },
      {
        "threshold": 0.9,
        "lead_s": 10.115573040005984,
        "observed_cover": 0.9166666666666666,
        "x": 31444.43308978816,
        "y": 29997.655136581936,
        "ang_deg": 336.09375,
        "mode": "coil",
        "boost": false,
        "cmd": -113.9,
        "clear": 64.7,
        "hard": 64.7,
        "n_safe": 20,
        "threat": 0.0,
        "enclosed": 0.75,
        "wrap": 0.92,
        "thr": 10.0,
        "eat": 7.7,
        "goal": 791.6,
        "thread": [
          70.8,
          338.2,
          false
        ],
        "L": 7808,
        "sc": 3.09,
        "died_near": 18,
        "kills": 6,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -44.9,
        "nh": 5,
        "crowd": 1020,
        "gap": [
          104.5,
          43.0,
          22.3,
          44.9,
          false
        ],
        "esc": -37.5
      }
    ],
    "state_samples": [
      {
        "lead_target": 5,
        "lead_actual": 5.036163479991956,
        "pos": [
          31328.84948718094,
          29907.954434239262
        ],
        "angle_deg": 45.92774509731812,
        "sp": 6.611111111111111,
        "observed_sc": 3.1037735849056602,
        "nearest_gap": 72.99250660433287,
        "nearest_id": 332,
        "owner_head": [
          30805.572265625,
          30604.81640625,
          1.2882907390594482,
          14.0,
          2.971698045730591
        ],
        "owner_head_distance": 871.4560566282162,
        "remains_near150": 0,
        "mode": "coil",
        "boost": false,
        "cmd": -44.1,
        "clear": 33.7,
        "hard": 33.7,
        "n_safe": 16,
        "threat": 0.0,
        "enclosed": 0.88,
        "wrap": 0.92,
        "thr": 10.0,
        "eat": 0.0,
        "goal": 1000.2,
        "thread": [
          73.0,
          259.6,
          false
        ],
        "L": 7816,
        "sc": 3.1,
        "died_near": 18,
        "kills": 6,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -45.0,
        "nh": 4,
        "crowd": 773,
        "gap": null,
        "esc": -37.5
      },
      {
        "lead_target": 2,
        "lead_actual": 1.9899446399940643,
        "pos": [
          31409.425160395513,
          29942.79530927042
        ],
        "angle_deg": 355.78125,
        "sp": 7,
        "observed_sc": 3.0943396226415096,
        "nearest_gap": 5.5086382773520555,
        "nearest_id": 332,
        "owner_head": [
          31219.19140625,
          30062.435546875,
          4.049709320068359,
          14.0,
          2.971698045730591
        ],
        "owner_head_distance": 224.7279859527422,
        "remains_near150": 0,
        "mode": "emergency",
        "boost": true,
        "cmd": -87.7,
        "clear": 2.3,
        "hard": -1.3,
        "n_safe": 0,
        "threat": 0.63,
        "enclosed": 0.92,
        "wrap": 0.92,
        "thr": 18.0,
        "eat": 62.1,
        "goal": 1012.0,
        "thread": [
          5.5,
          421.5,
          true
        ],
        "L": 7812,
        "sc": 3.09,
        "died_near": 18,
        "kills": 6,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -44.9,
        "nh": 6,
        "crowd": 727,
        "gap": null,
        "esc": -37.5
      },
      {
        "lead_target": 1,
        "lead_actual": 1.0331543700012844,
        "pos": [
          31503.263284620785,
          29787.19553280561
        ],
        "angle_deg": 272.8125,
        "sp": 6.888888888888889,
        "observed_sc": 3.1037735849056602,
        "nearest_gap": 76.07935031516655,
        "nearest_id": 332,
        "owner_head": [
          31266.3515625,
          29676.474609375,
          5.5223307609558105,
          12.88888931274414,
          2.971698045730591
        ],
        "owner_head_distance": 261.50771874566766,
        "remains_near150": 0,
        "mode": "coil",
        "boost": false,
        "cmd": -177.2,
        "clear": 0.3,
        "hard": 0.3,
        "n_safe": 2,
        "threat": 0.56,
        "enclosed": 1.0,
        "wrap": 1.0,
        "thr": 18.0,
        "eat": 0.0,
        "goal": 1012.0,
        "thread": [
          76.1,
          372.0,
          false
        ],
        "L": 7817,
        "sc": 3.1,
        "died_near": 18,
        "kills": 6,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -45.0,
        "nh": 6,
        "crowd": 425,
        "gap": [
          114.2,
          43.1,
          42.7,
          45.0,
          false
        ],
        "esc": -67.5
      },
      {
        "lead_target": 0.5,
        "lead_actual": 0.4887920700130053,
        "pos": [
          31492.079678196562,
          29654.135455042917
        ],
        "angle_deg": 258.75,
        "sp": 6.611111111111111,
        "observed_sc": 3.1037735849056602,
        "nearest_gap": 45.500533455268226,
        "nearest_id": 332,
        "owner_head": [
          31392.21484375,
          29565.396484375,
          5.473243236541748,
          6.55555534362793,
          2.971698045730591
        ],
        "owner_head_distance": 133.5948729339589,
        "remains_near150": 0,
        "mode": "emergency",
        "boost": false,
        "cmd": -86.3,
        "clear": -58.7,
        "hard": -82.7,
        "n_safe": 0,
        "threat": 0.78,
        "enclosed": 0.96,
        "wrap": 1.0,
        "thr": 18.0,
        "eat": 4.6,
        "goal": 1012.0,
        "thread": [
          45.5,
          321.7,
          true
        ],
        "L": 7835,
        "sc": 3.1,
        "died_near": 18,
        "kills": 6,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -45.0,
        "nh": 4,
        "crowd": 196,
        "gap": [
          124.8,
          22.3,
          14.5,
          45.0,
          false
        ],
        "esc": -67.5
      },
      {
        "lead_target": 0,
        "lead_actual": 0.0,
        "pos": [
          31501.146678879486,
          29537.694743133925
        ],
        "angle_deg": 291.09375,
        "sp": 7.388888888888889,
        "observed_sc": 3.1037735849056602,
        "nearest_gap": -11.300898025107486,
        "nearest_id": 332,
        "owner_head": [
          31421.7890625,
          29473.314453125,
          4.565126895904541,
          6.55555534362793,
          2.971698045730591
        ],
        "owner_head_distance": 102.18832134381572,
        "remains_near150": 0,
        "mode": "emergency",
        "boost": true,
        "cmd": -68.0,
        "clear": -39.0,
        "hard": -52.7,
        "n_safe": 0,
        "threat": 0.83,
        "enclosed": 0.88,
        "wrap": 0.96,
        "thr": 18.0,
        "eat": 9.1,
        "goal": 3253.2,
        "thread": [
          -11.3,
          221.7,
          false
        ],
        "L": 7833,
        "sc": 3.1,
        "died_near": 18,
        "kills": 6,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 26.9,
        "nh": 6,
        "crowd": 173,
        "gap": [
          143.0,
          22.3,
          14.5,
          45.0,
          false
        ],
        "esc": 112.5
      }
    ],
    "motion_end5": {
      "straightness": 0.3563490927877299,
      "distance": 1150.7273242352173,
      "net_yaw_deg": -464.9902450973181,
      "abs_yaw_deg": 589.6972549026817,
      "cmd_jumps90": 2
    },
    "turn_side_flips_last5": 0,
    "last_body_gap": -11.300898025107486,
    "nearest_owner_cov_max": 1.0
  },
  {
    "name": "live_20260925_171635",
    "coverage_samples": [],
    "state_samples": [
      {
        "lead_target": 5,
        "lead_actual": 4.985304929985432,
        "pos": [
          37095.18897241833,
          30748.485520382474
        ],
        "angle_deg": 296.71875,
        "sp": 11.833333333333334,
        "observed_sc": 1.320754716981132,
        "nearest_gap": 147.35319170484203,
        "nearest_id": 239,
        "owner_head": [
          36777.9921875,
          31771.404296875,
          0.7608544826507568,
          5.793000221252441,
          1.0754716396331787
        ],
        "owner_head_distance": 1070.9699452662016,
        "remains_near150": 0,
        "mode": "feed",
        "boost": true,
        "cmd": 155.0,
        "clear": 52.4,
        "hard": 22.4,
        "n_safe": 32,
        "threat": 0.0,
        "enclosed": 0.46,
        "wrap": 0.0,
        "thr": 10.0,
        "eat": 5.9,
        "goal": 537.0,
        "thread": [
          147.4,
          302.1,
          true
        ],
        "L": 585,
        "sc": 1.32,
        "died_near": 4,
        "kills": 1,
        "big": 0.56,
        "curl": 0.04,
        "prof": "aggressive",
        "onward": 43.2,
        "nh": 4,
        "crowd": 593,
        "gap": null,
        "esc": null
      },
      {
        "lead_target": 2,
        "lead_actual": 2.003920199989807,
        "pos": [
          36846.679856575014,
          30821.472842005067
        ],
        "angle_deg": 34.0708540120712,
        "sp": 5.888888888888889,
        "observed_sc": 1.320754716981132,
        "nearest_gap": 118.97769169098095,
        "nearest_id": 443,
        "owner_head": [
          37308.87109375,
          31888.392578125,
          6.086835861206055,
          10.0,
          1.0849056243896484
        ],
        "owner_head_distance": 1162.7288863030676,
        "remains_near150": 0,
        "mode": "feed",
        "boost": false,
        "cmd": 154.1,
        "clear": 40.4,
        "hard": 10.4,
        "n_safe": 4,
        "threat": 0.0,
        "enclosed": 0.42,
        "wrap": 0.0,
        "thr": 10.0,
        "eat": 5.9,
        "goal": 119.6,
        "thread": [
          119.0,
          187.6,
          false
        ],
        "L": 585,
        "sc": 1.32,
        "died_near": 4,
        "kills": 1,
        "big": 0.66,
        "curl": 0.33,
        "prof": "aggressive",
        "onward": 22.8,
        "nh": 6,
        "crowd": 852,
        "gap": [
          67.4,
          21.5,
          35.6,
          19.2,
          false
        ],
        "esc": null
      },
      {
        "lead_target": 1,
        "lead_actual": 1.0062668699829374,
        "pos": [
          36889.03181789094,
          31142.207705428496
        ],
        "angle_deg": 85.78125,
        "sp": 14,
        "observed_sc": 1.320754716981132,
        "nearest_gap": 10.893847010597366,
        "nearest_id": 443,
        "owner_head": [
          37315.37890625,
          31676.58203125,
          2.8225245475769043,
          9.5,
          1.0754716396331787
        ],
        "owner_head_distance": 683.6137504830031,
        "remains_near150": 0,
        "mode": "evade",
        "boost": true,
        "cmd": 70.8,
        "clear": 17.6,
        "hard": 13.6,
        "n_safe": 12,
        "threat": 0.39,
        "enclosed": 0.71,
        "wrap": 0.0,
        "thr": 10.0,
        "eat": 16.2,
        "goal": 4361.6,
        "thread": [
          10.9,
          65.5,
          true
        ],
        "L": 577,
        "sc": 1.32,
        "died_near": 4,
        "kills": 1,
        "big": 0.96,
        "curl": 0.04,
        "prof": "aggressive",
        "onward": 202.6,
        "nh": 6,
        "crowd": 641,
        "gap": [
          102.0,
          21.5,
          25.3,
          19.2,
          true
        ],
        "esc": null
      },
      {
        "lead_target": 0.5,
        "lead_actual": 0.5263266599795315,
        "pos": [
          36941.170703802505,
          31368.400112031253
        ],
        "angle_deg": 68.90625,
        "sp": 12.333333333333334,
        "observed_sc": 1.320754716981132,
        "nearest_gap": 42.26714600318208,
        "nearest_id": 443,
        "owner_head": [
          37157.125,
          31590.560546875,
          4.699774742126465,
          12.0,
          1.1226415634155273
        ],
        "owner_head_distance": 309.8249777795812,
        "remains_near150": 0,
        "mode": "escape",
        "boost": true,
        "cmd": 61.7,
        "clear": 48.0,
        "hard": 39.6,
        "n_safe": 19,
        "threat": 0.0,
        "enclosed": 0.71,
        "wrap": 0.0,
        "thr": 10.0,
        "eat": 292.2,
        "goal": 3328.0,
        "thread": [
          42.3,
          92.4,
          true
        ],
        "L": 575,
        "sc": 1.32,
        "died_near": 4,
        "kills": 1,
        "big": 0.96,
        "curl": 0.04,
        "prof": "aggressive",
        "onward": 136.7,
        "nh": 7,
        "crowd": 514,
        "gap": [
          92.3,
          21.5,
          16.3,
          19.2,
          false
        ],
        "esc": null
      },
      {
        "lead_target": 0,
        "lead_actual": 0.0,
        "pos": [
          37123.427080621965,
          31494.067298989885
        ],
        "angle_deg": 337.31507115704966,
        "sp": 14,
        "observed_sc": 1.3113207547169812,
        "nearest_gap": 5.0587481965276915,
        "nearest_id": 389,
        "owner_head": [
          37063.19921875,
          31546.357421875,
          2.2825634479522705,
          8.38888931274414,
          1.150943398475647
        ],
        "owner_head_distance": 79.75996675656843,
        "remains_near150": 21,
        "mode": "emergency",
        "boost": true,
        "cmd": -52.7,
        "clear": -15.0,
        "hard": -19.0,
        "n_safe": 0,
        "threat": 0.2,
        "enclosed": 0.83,
        "wrap": 0.5,
        "thr": 18.0,
        "eat": 0.0,
        "goal": 3318.4,
        "thread": [
          5.1,
          23.1,
          true
        ],
        "L": 572,
        "sc": 1.31,
        "died_near": 4,
        "kills": 1,
        "big": 0.67,
        "curl": 0.04,
        "prof": "aggressive",
        "onward": 103.3,
        "nh": 8,
        "crowd": 275,
        "gap": [
          93.2,
          21.8,
          25.3,
          19.0,
          false
        ],
        "esc": -157.5
      }
    ],
    "motion_end5": {
      "straightness": 0.42574358532077833,
      "distance": 1752.5016387785963,
      "net_yaw_deg": -319.4036788429504,
      "abs_yaw_deg": 602.2579489033063,
      "cmd_jumps90": 3
    },
    "turn_side_flips_last5": 0,
    "last_body_gap": 5.0587481965276915,
    "nearest_owner_cov_max": 0.125
  },
  {
    "name": "live_20260925_190409",
    "coverage_samples": [],
    "state_samples": [
      {
        "lead_target": 5,
        "lead_actual": 4.9730435650001255,
        "pos": [
          28425.180294752394,
          34112.307063712775
        ],
        "angle_deg": 289.6875,
        "sp": 14,
        "observed_sc": 1.0377358490566038,
        "nearest_gap": 52.51431915061325,
        "nearest_id": 394,
        "owner_head": [
          28798.03515625,
          34124.53515625,
          6.037748336791992,
          5.789999961853027,
          1.150943398475647
        ],
        "owner_head_distance": 373.05532296094907,
        "remains_near150": 0,
        "mode": "feed",
        "boost": true,
        "cmd": -10.3,
        "clear": 15.3,
        "hard": 5.3,
        "n_safe": 17,
        "threat": 0.0,
        "enclosed": 0.25,
        "wrap": 0.0,
        "thr": 10.0,
        "eat": 17.8,
        "goal": 41.6,
        "thread": [
          52.5,
          260.8,
          false
        ],
        "L": 82,
        "sc": 1.04,
        "died_near": 0,
        "kills": 0,
        "big": 0.54,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 200.7,
        "nh": 3,
        "crowd": 485,
        "gap": [
          149.3,
          26.1,
          16.7,
          15.0,
          false
        ],
        "esc": null
      },
      {
        "lead_target": 2,
        "lead_actual": 1.9921743330000936,
        "pos": [
          28772.47344620195,
          33863.95278556699
        ],
        "angle_deg": 169.51402199555318,
        "sp": 14,
        "observed_sc": 1.0377358490566038,
        "nearest_gap": 161.33580920671858,
        "nearest_id": 212,
        "owner_head": [
          28937.69921875,
          34103.55078125,
          1.6880712509155273,
          5.789999961853027,
          1.1603773832321167
        ],
        "owner_head_distance": 291.0442499851463,
        "remains_near150": 0,
        "mode": "feed",
        "boost": false,
        "cmd": 31.9,
        "clear": 96.5,
        "hard": 66.5,
        "n_safe": 34,
        "threat": 0.0,
        "enclosed": 0.17,
        "wrap": 0.0,
        "thr": 18.0,
        "eat": 20.0,
        "goal": 71.2,
        "thread": [
          161.3,
          400.1,
          false
        ],
        "L": 79,
        "sc": 1.04,
        "died_near": 0,
        "kills": 0,
        "big": 0.54,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 73.7,
        "nh": 2,
        "crowd": 998,
        "gap": null,
        "esc": null
      },
      {
        "lead_target": 1,
        "lead_actual": 1.0354491000000507,
        "pos": [
          28563.222912199704,
          34113.08401512703
        ],
        "angle_deg": 111.09375,
        "sp": 14,
        "observed_sc": 1.0377358490566038,
        "nearest_gap": 258.3149077532746,
        "nearest_id": 212,
        "owner_head": [
          28834.875,
          34215.1328125,
          2.92069935798645,
          5.789999961853027,
          1.1603773832321167
        ],
        "owner_head_distance": 290.18754944264714,
        "remains_near150": 0,
        "mode": "evade",
        "boost": true,
        "cmd": 66.1,
        "clear": 49.1,
        "hard": 37.1,
        "n_safe": 14,
        "threat": 0.52,
        "enclosed": 0.17,
        "wrap": 0.0,
        "thr": 18.0,
        "eat": 39.1,
        "goal": 59.0,
        "thread": [
          258.3,
          455.9,
          false
        ],
        "L": 86,
        "sc": 1.04,
        "died_near": 0,
        "kills": 0,
        "big": 0.54,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 116.8,
        "nh": 2,
        "crowd": 528,
        "gap": null,
        "esc": null
      },
      {
        "lead_target": 0.5,
        "lead_actual": 0.5090790480001033,
        "pos": [
          28605.438325048086,
          34359.5226225849
        ],
        "angle_deg": 66.09375,
        "sp": 14,
        "observed_sc": 1.0471698113207548,
        "nearest_gap": 146.46630366857914,
        "nearest_id": 212,
        "owner_head": [
          28724.1875,
          34226.28515625,
          3.597926616668701,
          5.789999961853027,
          1.1603773832321167
        ],
        "owner_head_distance": 178.47573781078185,
        "remains_near150": 0,
        "mode": "feed",
        "boost": false,
        "cmd": -26.9,
        "clear": 92.1,
        "hard": 62.1,
        "n_safe": 6,
        "threat": 0.0,
        "enclosed": 0.33,
        "wrap": 0.0,
        "thr": 18.0,
        "eat": 11.1,
        "goal": 350.4,
        "thread": [
          146.5,
          321.9,
          false
        ],
        "L": 91,
        "sc": 1.05,
        "died_near": 0,
        "kills": 0,
        "big": 0.53,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 10.0,
        "nh": 3,
        "crowd": 519,
        "gap": [
          104.8,
          16.8,
          26.3,
          15.2,
          false
        ],
        "esc": null
      },
      {
        "lead_target": 0,
        "lead_actual": 0.0,
        "pos": [
          28789.82862032495,
          34360.197160265045
        ],
        "angle_deg": 294.05627682614033,
        "sp": 14,
        "observed_sc": 1.0471698113207548,
        "nearest_gap": 101.46435245630522,
        "nearest_id": 212,
        "owner_head": [
          28721.6875,
          34147.87109375,
          5.473243236541748,
          5.789999961853027,
          1.1603773832321167
        ],
        "owner_head_distance": 222.99231108020456,
        "remains_near150": 0,
        "mode": "emergency",
        "boost": false,
        "cmd": 144.1,
        "clear": -5.2,
        "hard": -15.2,
        "n_safe": 0,
        "threat": 0.63,
        "enclosed": 0.58,
        "wrap": 0.42,
        "thr": 18.0,
        "eat": 5.4,
        "goal": 350.4,
        "thread": [
          101.5,
          151.3,
          true
        ],
        "L": 89,
        "sc": 1.05,
        "died_near": 0,
        "kills": 0,
        "big": 0.83,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 120.4,
        "nh": 3,
        "crowd": 528,
        "gap": [
          99.1,
          16.8,
          26.3,
          15.2,
          false
        ],
        "esc": 142.5
      }
    ],
    "motion_end5": {
      "straightness": 0.2179208239760714,
      "distance": 2023.3424492816284,
      "net_yaw_deg": 4.368776826140456,
      "abs_yaw_deg": 770.1528660243592,
      "cmd_jumps90": 4
    },
    "turn_side_flips_last5": 2,
    "last_body_gap": 101.46435245630522,
    "nearest_owner_cov_max": 0.25
  },
  {
    "name": "live_20260925_191831",
    "coverage_samples": [
      {
        "threshold": 0.4,
        "lead_s": 13.897481323000193,
        "observed_cover": 0.5,
        "x": 30396.222488536576,
        "y": 35165.314872798255,
        "ang_deg": 28.125,
        "mode": "emergency",
        "boost": true,
        "cmd": 25.1,
        "clear": 11.0,
        "hard": 7.0,
        "n_safe": 0,
        "threat": 0.69,
        "enclosed": 0.58,
        "wrap": 0.5,
        "thr": 18.0,
        "eat": 9.1,
        "goal": 1353.4,
        "thread": [
          18.7,
          196.3,
          true
        ],
        "L": 827,
        "sc": 1.44,
        "died_near": 4,
        "kills": 1,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -20.9,
        "nh": 5,
        "crowd": 381,
        "gap": [
          72.6,
          18.9,
          14.6,
          20.9,
          false
        ],
        "esc": -172.5
      },
      {
        "threshold": 0.5,
        "lead_s": 13.897481323000193,
        "observed_cover": 0.5,
        "x": 30396.222488536576,
        "y": 35165.314872798255,
        "ang_deg": 28.125,
        "mode": "emergency",
        "boost": true,
        "cmd": 25.1,
        "clear": 11.0,
        "hard": 7.0,
        "n_safe": 0,
        "threat": 0.69,
        "enclosed": 0.58,
        "wrap": 0.5,
        "thr": 18.0,
        "eat": 9.1,
        "goal": 1353.4,
        "thread": [
          18.7,
          196.3,
          true
        ],
        "L": 827,
        "sc": 1.44,
        "died_near": 4,
        "kills": 1,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -20.9,
        "nh": 5,
        "crowd": 381,
        "gap": [
          72.6,
          18.9,
          14.6,
          20.9,
          false
        ],
        "esc": -172.5
      }
    ],
    "state_samples": [
      {
        "lead_target": 5,
        "lead_actual": 5.00385642800029,
        "pos": [
          30657.306501788375,
          35817.07074799366
        ],
        "angle_deg": 350.15625,
        "sp": 14,
        "observed_sc": 1.4622641509433962,
        "nearest_gap": 365.2768367609464,
        "nearest_id": 120,
        "owner_head": [
          30854.509765625,
          34872.8203125,
          4.835107326507568,
          6.0,
          1.5754716396331787
        ],
        "owner_head_distance": 964.6232488374858,
        "remains_near150": 0,
        "mode": "feed",
        "boost": true,
        "cmd": -12.8,
        "clear": 282.8,
        "hard": 266.8,
        "n_safe": 52,
        "threat": 0.0,
        "enclosed": 0.04,
        "wrap": 0.0,
        "thr": 10.0,
        "eat": 3.8,
        "goal": 58.6,
        "thread": [
          365.3,
          554.3,
          false
        ],
        "L": 861,
        "sc": 1.46,
        "died_near": 4,
        "kills": 1,
        "big": 0.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 380.6,
        "nh": 4,
        "crowd": 813,
        "gap": null,
        "esc": null
      },
      {
        "lead_target": 2,
        "lead_actual": 1.988504278000164,
        "pos": [
          30659.339887234175,
          34906.78900080981
        ],
        "angle_deg": 242.07722051377735,
        "sp": 9.833333333333334,
        "observed_sc": 1.4622641509433962,
        "nearest_gap": 88.42358636183822,
        "nearest_id": 181,
        "owner_head": [
          30612.294921875,
          34420.890625,
          5.66959285736084,
          6.0,
          1.5943396091461182
        ],
        "owner_head_distance": 488.1705238748632,
        "remains_near150": 0,
        "mode": "unwrap",
        "boost": false,
        "cmd": -123.3,
        "clear": 53.6,
        "hard": 23.6,
        "n_safe": 4,
        "threat": 0.19,
        "enclosed": 0.79,
        "wrap": 0.46,
        "thr": 10.0,
        "eat": 6.3,
        "goal": 98.2,
        "thread": [
          88.4,
          111.8,
          true
        ],
        "L": 861,
        "sc": 1.46,
        "died_near": 4,
        "kills": 1,
        "big": 0.0,
        "curl": 0.04,
        "prof": "aggressive",
        "onward": 28.0,
        "nh": 5,
        "crowd": 308,
        "gap": [
          49.2,
          19.0,
          22.4,
          21.2,
          false
        ],
        "esc": 82.5
      },
      {
        "lead_target": 1,
        "lead_actual": 0.9982735440003125,
        "pos": [
          30579.13634945393,
          34702.06687732017
        ],
        "angle_deg": 258.75,
        "sp": 6.611111111111111,
        "observed_sc": 1.4622641509433962,
        "nearest_gap": 87.18849039991883,
        "nearest_id": 181,
        "owner_head": [
          30758.654296875,
          34520.5390625,
          0.5890486240386963,
          6.0,
          1.603773593902588
        ],
        "owner_head_distance": 255.30186250722855,
        "remains_near150": 0,
        "mode": "unwrap",
        "boost": false,
        "cmd": 36.6,
        "clear": 40.3,
        "hard": 10.3,
        "n_safe": 3,
        "threat": 0.44,
        "enclosed": 0.88,
        "wrap": 0.46,
        "thr": 18.0,
        "eat": 9.6,
        "goal": 106.8,
        "thread": [
          87.2,
          150.9,
          true
        ],
        "L": 861,
        "sc": 1.46,
        "died_near": 4,
        "kills": 1,
        "big": 0.0,
        "curl": 0.04,
        "prof": "aggressive",
        "onward": 69.9,
        "nh": 5,
        "crowd": 300,
        "gap": [
          57.4,
          19.0,
          22.4,
          21.2,
          false
        ],
        "esc": 82.5
      },
      {
        "lead_target": 0.5,
        "lead_actual": 0.5107150730000285,
        "pos": [
          30644.584280279178,
          34626.1983511249
        ],
        "angle_deg": 334.6875,
        "sp": 6.555555555555555,
        "observed_sc": 1.4622641509433962,
        "nearest_gap": 52.545035488763205,
        "nearest_id": 424,
        "owner_head": [
          30812.44140625,
          34596.87890625,
          1.6838157176971436,
          6.0,
          1.603773593902588
        ],
        "owner_head_distance": 170.39848763107238,
        "remains_near150": 0,
        "mode": "emergency",
        "boost": false,
        "cmd": 4.7,
        "clear": -18.9,
        "hard": -40.9,
        "n_safe": 0,
        "threat": 0.72,
        "enclosed": 0.92,
        "wrap": 0.54,
        "thr": 18.0,
        "eat": 3.3,
        "goal": 106.8,
        "thread": [
          52.5,
          166.2,
          false
        ],
        "L": 867,
        "sc": 1.46,
        "died_near": 4,
        "kills": 1,
        "big": 0.0,
        "curl": 0.08,
        "prof": "aggressive",
        "onward": 30.3,
        "nh": 5,
        "crowd": 254,
        "gap": [
          96.6,
          23.3,
          22.4,
          21.2,
          false
        ],
        "esc": 97.5
      },
      {
        "lead_target": 0,
        "lead_actual": 0.0,
        "pos": [
          30749.77620353261,
          34649.36378853494
        ],
        "angle_deg": 56.25,
        "sp": 7.166666666666667,
        "observed_sc": 1.4622641509433962,
        "nearest_gap": -7.184976780331116,
        "nearest_id": 424,
        "owner_head": [
          30781.6484375,
          34683.37890625,
          1.61988365650177,
          6.0,
          1.603773593902588
        ],
        "owner_head_distance": 46.61402719398589,
        "remains_near150": 0,
        "mode": "emergency",
        "boost": true,
        "cmd": 167.8,
        "clear": -18.2,
        "hard": -22.2,
        "n_safe": 0,
        "threat": 0.92,
        "enclosed": 0.88,
        "wrap": 0.62,
        "thr": 18.0,
        "eat": 5.9,
        "goal": 106.8,
        "thread": [
          -7.2,
          134.2,
          false
        ],
        "L": 863,
        "sc": 1.46,
        "died_near": 4,
        "kills": 1,
        "big": 0.0,
        "curl": 0.12,
        "prof": "aggressive",
        "onward": -2.0,
        "nh": 5,
        "crowd": 178,
        "gap": null,
        "esc": 97.5
      }
    ],
    "motion_end5": {
      "straightness": 0.6922545913988281,
      "distance": 1689.7160579844951,
      "net_yaw_deg": 67.50000000000003,
      "abs_yaw_deg": 673.0733621929314,
      "cmd_jumps90": 9
    },
    "turn_side_flips_last5": 0,
    "last_body_gap": -7.184976780331116,
    "nearest_owner_cov_max": 0.625
  },
  {
    "name": "live_20260925_192050",
    "coverage_samples": [
      {
        "threshold": 0.4,
        "lead_s": 25.155428464000124,
        "observed_cover": 0.4583333333333333,
        "x": 35734.110805042066,
        "y": 30779.923372906636,
        "ang_deg": 231.6596795666703,
        "mode": "unwrap",
        "boost": false,
        "cmd": -149.3,
        "clear": 71.3,
        "hard": 41.3,
        "n_safe": 15,
        "threat": 0.0,
        "enclosed": 0.46,
        "wrap": 0.46,
        "thr": 10.0,
        "eat": 19.3,
        "goal": 544.0,
        "thread": [
          118.2,
          325.0,
          true
        ],
        "L": 278,
        "sc": 1.15,
        "died_near": 1,
        "kills": 0,
        "big": 1.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 67.3,
        "nh": 5,
        "crowd": 624,
        "gap": null,
        "esc": -52.5
      },
      {
        "threshold": 0.5,
        "lead_s": 24.99423926700001,
        "observed_cover": 0.5,
        "x": 35688.361032444634,
        "y": 30734.15467311157,
        "ang_deg": 208.125,
        "mode": "unwrap",
        "boost": true,
        "cmd": -166.9,
        "clear": 42.9,
        "hard": 12.9,
        "n_safe": 19,
        "threat": 0.0,
        "enclosed": 0.33,
        "wrap": 0.5,
        "thr": 10.0,
        "eat": 15.9,
        "goal": 544.0,
        "thread": [
          85.4,
          376.9,
          true
        ],
        "L": 277,
        "sc": 1.15,
        "died_near": 1,
        "kills": 0,
        "big": 1.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 37.3,
        "nh": 5,
        "crowd": 737,
        "gap": null,
        "esc": -52.5
      },
      {
        "threshold": 0.9,
        "lead_s": 6.2709196030000385,
        "observed_cover": 0.9583333333333334,
        "x": 35788.04130328849,
        "y": 30484.76192302533,
        "ang_deg": 18.28125,
        "mode": "coil",
        "boost": false,
        "cmd": 108.3,
        "clear": 66.0,
        "hard": 66.0,
        "n_safe": 14,
        "threat": 0.48,
        "enclosed": 0.46,
        "wrap": 0.96,
        "thr": 10.0,
        "eat": 7.0,
        "goal": 390.4,
        "thread": [
          233.8,
          512.0,
          false
        ],
        "L": 373,
        "sc": 1.21,
        "died_near": 2,
        "kills": 0,
        "big": 1.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -17.5,
        "nh": 2,
        "crowd": 433,
        "gap": null,
        "esc": 7.5
      }
    ],
    "state_samples": [
      {
        "lead_target": 5,
        "lead_actual": 4.98989689300015,
        "pos": [
          35800.4938745063,
          30527.88458906705
        ],
        "angle_deg": 314.05088306766214,
        "sp": 5.833333333333333,
        "observed_sc": 1.2075471698113207,
        "nearest_gap": 201.21642163527662,
        "nearest_id": 372,
        "owner_head": [
          36035.57421875,
          30797.1328125,
          2.586026906967163,
          13.666666984558105,
          3.0849056243896484
        ],
        "owner_head_distance": 357.4316355214491,
        "remains_near150": 0,
        "mode": "unwrap",
        "boost": false,
        "cmd": 104.1,
        "clear": 31.7,
        "hard": 6.2,
        "n_safe": 9,
        "threat": 0.0,
        "enclosed": 0.92,
        "wrap": 0.96,
        "thr": 10.0,
        "eat": 0.0,
        "goal": 390.4,
        "thread": [
          201.2,
          545.7,
          false
        ],
        "L": 379,
        "sc": 1.21,
        "died_near": 2,
        "kills": 0,
        "big": 1.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -17.5,
        "nh": 2,
        "crowd": 357,
        "gap": null,
        "esc": 172.5
      },
      {
        "lead_target": 2,
        "lead_actual": 1.9943572319998566,
        "pos": [
          35765.66708163401,
          30540.42685632504
        ],
        "angle_deg": 265.78125,
        "sp": 5.833333333333333,
        "observed_sc": 1.2169811320754718,
        "nearest_gap": 105.88752757664585,
        "nearest_id": 372,
        "owner_head": [
          35928.76953125,
          30484.279296875,
          1.1290098428726196,
          13.333333015441895,
          3.094339609146118
        ],
        "owner_head_distance": 172.49625359100344,
        "remains_near150": 0,
        "mode": "coil",
        "boost": false,
        "cmd": -4.2,
        "clear": 17.5,
        "hard": 17.5,
        "n_safe": 0,
        "threat": 0.71,
        "enclosed": 1.0,
        "wrap": 1.0,
        "thr": 18.0,
        "eat": 0.0,
        "goal": 97.6,
        "thread": [
          105.9,
          472.8,
          false
        ],
        "L": 387,
        "sc": 1.22,
        "died_near": 2,
        "kills": 0,
        "big": 1.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -17.6,
        "nh": 2,
        "crowd": 355,
        "gap": null,
        "esc": -97.5
      },
      {
        "lead_target": 1,
        "lead_actual": 0.9971925499999088,
        "pos": [
          35835.52240940548,
          30578.935190078555
        ],
        "angle_deg": 155.11968389430587,
        "sp": 5.833333333333333,
        "observed_sc": 1.2169811320754718,
        "nearest_gap": 40.282213396145885,
        "nearest_id": 372,
        "owner_head": [
          35762.44140625,
          30694.515625,
          3.4202182292938232,
          11.55555534362793,
          3.094339609146118
        ],
        "owner_head_distance": 136.7467365564588,
        "remains_near150": 0,
        "mode": "coil",
        "boost": false,
        "cmd": -114.9,
        "clear": 3.9,
        "hard": 3.9,
        "n_safe": 0,
        "threat": 0.77,
        "enclosed": 1.0,
        "wrap": 1.0,
        "thr": 18.0,
        "eat": 0.0,
        "goal": 108.2,
        "thread": [
          40.3,
          378.2,
          false
        ],
        "L": 389,
        "sc": 1.22,
        "died_near": 2,
        "kills": 0,
        "big": 1.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -17.6,
        "nh": 3,
        "crowd": 448,
        "gap": null,
        "esc": 172.5
      },
      {
        "lead_target": 0.5,
        "lead_actual": 0.5030030550001356,
        "pos": [
          35767.55582043179,
          30538.542754555445
        ],
        "angle_deg": 273.24468389430587,
        "sp": 5.833333333333333,
        "observed_sc": 1.2169811320754718,
        "nearest_gap": 75.56253639072136,
        "nearest_id": 372,
        "owner_head": [
          35619.4765625,
          30533.318359375,
          4.5160393714904785,
          14.0,
          3.094339609146118
        ],
        "owner_head_distance": 148.17139040527346,
        "remains_near150": 0,
        "mode": "emergency",
        "boost": false,
        "cmd": 53.6,
        "clear": 6.4,
        "hard": -17.6,
        "n_safe": 0,
        "threat": 0.75,
        "enclosed": 1.0,
        "wrap": 1.0,
        "thr": 18.0,
        "eat": 0.0,
        "goal": 108.2,
        "thread": [
          75.6,
          416.4,
          true
        ],
        "L": 389,
        "sc": 1.22,
        "died_near": 2,
        "kills": 0,
        "big": 1.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": -17.6,
        "nh": 2,
        "crowd": 442,
        "gap": null,
        "esc": 172.5
      },
      {
        "lead_target": 0,
        "lead_actual": 0.0,
        "pos": [
          35843.50587656348,
          30501.45844601855
        ],
        "angle_deg": 21.09375,
        "sp": 7.166666666666667,
        "observed_sc": 1.2169811320754718,
        "nearest_gap": -3.8469210678890775,
        "nearest_id": 372,
        "owner_head": [
          35703.1328125,
          30344.9609375,
          5.7764129638671875,
          10.166666984558105,
          3.094339609146118
        ],
        "owner_head_distance": 210.2286072043581,
        "remains_near150": 0,
        "mode": "emergency",
        "boost": true,
        "cmd": 22.6,
        "clear": -13.6,
        "hard": -17.6,
        "n_safe": 0,
        "threat": 0.65,
        "enclosed": 1.0,
        "wrap": 1.0,
        "thr": 18.0,
        "eat": 1.6,
        "goal": 108.2,
        "thread": [
          -3.8,
          430.6,
          true
        ],
        "L": 388,
        "sc": 1.22,
        "died_near": 2,
        "kills": 0,
        "big": 1.0,
        "curl": 0.0,
        "prof": "aggressive",
        "onward": 185.0,
        "nh": 3,
        "crowd": 397,
        "gap": [
          108.4,
          44.9,
          16.6,
          17.6,
          false
        ],
        "esc": 172.5
      }
    ],
    "motion_end5": {
      "straightness": 0.05098453186373972,
      "distance": 990.1319893554044,
      "net_yaw_deg": 1147.0428669323378,
      "abs_yaw_deg": 1169.2952726610529,
      "cmd_jumps90": 2
    },
    "turn_side_flips_last5": 0,
    "last_body_gap": -3.8469210678890775,
    "nearest_owner_cov_max": 1.0
  }
]
```

## 기존 집계 출력: 결과는 휴리스틱 분류이며 서버 사망 판정 아님
```text
skip runs/live_20260925_173418.jsonl: black box unreadable
25 finished games
survival s: median 125 mean 155 min 18 max 403; 600 s reached 0/25
L_max: median 1578 mean 2047 max 7835
modes: feed 62%, evade 29%, unwrap 5%, escape 2%, emergency 2%, coil 0%; boost 62% of ticks
command jumps > 90 deg: 51.4/min; by mode evade 1520, feed 1389, unwrap 239, emergency 99, escape 58, coil 2
attacks (threat > 0 for >= 0.2 s): 1088, survived 1062, died within 1.5 s 26; boost share survived 0.74 vs died 0.55; duration survived 1.54 s vs died 2.51 s
L gain/min: median 632; narrow-gap ticks 14872, through-gap picks 1771
last emergency run before death: median 0.59 s (n=25)
obs_to_cmd ms p50 median 36.8, p95 max 144.2

--- deaths.py ---
_20260925_170651  403.4s L 7835 wrapped  killer r43 head 102px boostK 1 remains 1 boostUs 1 stuck 0.9s rev3s 2 mode2s emergency
_20260925_171431  104.3s L  899 cut_off  killer r16 head 103px boostK 1 remains 1 boostUs 1 stuck 0.43s rev3s 4 mode2s evade
_20260925_171635   96.1s L  587 wrapped  killer r17 head 80px boostK 1 remains 1 boostUs 1 stuck 0.47s rev3s 2 mode2s evade
_20260925_171833   96.8s L  791 cut_off  killer r15 head 52px boostK 1 remains 1 boostUs 1 stuck 0.6s rev3s 1 mode2s evade
_20260925_172034  125.2s L 2220 cut_off  killer r29 head 84px boostK 1 remains 1 boostUs 1 stuck 0.14s rev3s 4 mode2s evade
_20260925_172303  138.6s L 1835 cut_off  killer r14 head 50px boostK 1 remains 1 boostUs 1 stuck 0.31s rev3s 0 mode2s evade
_20260925_172548  329.6s L 3477 wrapped  killer r22 head 812px boostK 1 remains 1 boostUs 1 stuck 0.51s rev3s 3 mode2s feed
_20260925_173206  107.3s L 3039 cut_off  killer r17 head 82px boostK 1 remains 1 boostUs 1 stuck 0.53s rev3s 8 mode2s emergency
_20260925_183803   18.4s L  466 cut_off  killer r16 head 140px boostK 0 remains 1 boostUs 0 stuck 0.18s rev3s 1 mode2s emergency
_20260925_183834   28.9s L  394 cut_off  killer r18 head 66px boostK 1 remains 1 boostUs 1 stuck 0.26s rev3s 4 mode2s feed
_20260925_183915   47.5s L  684 cut_off  killer r21 head 267px boostK 0 remains 1 boostUs 1 stuck 0.12s rev3s 4 mode2s escape
_20260925_184019  356.6s L 3900 trapped  killer r34 head 355px boostK 0 remains 1 boostUs 1 stuck 1.38s rev3s 2 mode2s emergency
_20260925_184659   44.2s L  319 wrapped  killer r36 head 661px boostK 1 remains 1 boostUs 0 stuck 1.53s rev3s 4 mode2s emergency
_20260925_184759  217.7s L 3180 cut_off  killer r17 head 82px boostK 1 remains 1 boostUs 1 stuck 0.35s rev3s 5 mode2s evade
_20260925_185208  156.0s L 5416 cut_off  killer r19 head 110px boostK 1 remains 1 boostUs 1 stuck 0.35s rev3s 4 mode2s evade
_20260925_185508  192.7s L 1529 wrapped  killer r24 head 298px boostK 0 remains 1 boostUs 1 stuck 1.51s rev3s 1 mode2s emergency
_20260925_185849   71.3s L  125 wrapped  killer r24 head 158px boostK 1 remains 1 boostUs 1 stuck 0.45s rev3s 8 mode2s emergency
_20260925_190018  202.7s L 1649 cut_off  killer r28 head 141px boostK 0 remains 1 boostUs 0 stuck 0.12s rev3s 5 mode2s evade
_20260925_190409   53.9s L  100 cut_off  killer r17 head 223px boostK 0 remains 1 boostUs 0 stuck 0.0s rev3s 3 mode2s feed
_20260925_190520  266.1s L 1578 wrapped  killer r26 head 72px boostK 1 remains 1 boostUs 1 stuck 1.16s rev3s 4 mode2s emergency
_20260925_191022  282.6s L 2792 cut_off  killer r30 head 183px boostK 0 remains 0 boostUs 0 stuck 0.65s rev3s 5 mode2s evade
_20260925_191540  146.0s L 3190 wrapped  killer r28 head 163px boostK 1 remains 1 boostUs 1 stuck 0.4s rev3s 1 mode2s feed
_20260925_191831  117.9s L  868 wrapped  killer r23 head 47px boostK 0 remains 0 boostUs 1 stuck 0.56s rev3s 9 mode2s unwrap
_20260925_192050   67.3s L  389 wrapped  killer r45 head 210px boostK 1 remains 1 boostUs 1 stuck 0.88s rev3s 2 mode2s coil

24 deaths; survival median 122 s
  cut_off  13 (54%)  remains 12  killer boosting 8  median s 107
  wrapped  10 (42%)  remains 9  killer boosting 8  median s 132
  trapped   1 (4%)  remains 1  killer boosting 0  median s 357
  remains: 22/24
  killer_boost: 16/24
  boosting: 19/24
  spawn_fight: 2/24

bunching (straightness 5 s, own-body cover): last 5 s before death vs 15-20 s before (same black box)
  _20260925_170651 wrapped  end (0.36, 0.75)  base (0.12, 0.61)
  _20260925_171431 cut_off  end (0.4, 0.23)  base (0.07, 0.31)
  _20260925_171635 wrapped  end (0.43, 0.2)  base (0.45, 0.07)
  _20260925_171833 cut_off  end (0.68, 0.1)  base (0.74, 0.06)
  _20260925_172034 cut_off  end (0.5, 0.1)  base (0.65, 0.19)
  _20260925_172303 cut_off  end (0.73, 0.15)  base (0.91, 0.1)
  _20260925_172548 wrapped  end (0.29, 0.29)  base (0.29, 0.3)
  _20260925_173206 cut_off  end (0.46, 0.47)  base (0.32, 0.18)
  _20260925_183803 cut_off  end (0.68, 0.02)  base (0.99, 0.0)
  _20260925_183834 cut_off  end (0.53, 0.19)  base (0.68, 0.0)
  _20260925_183915 cut_off  end (0.36, 0.07)  base (0.68, 0.0)
  _20260925_184019 trapped  end (0.57, 0.29)  base (0.59, 0.12)
  _20260925_184659 wrapped  end (0.37, 0.14)  base (0.52, 0.0)
  _20260925_184759 cut_off  end (0.39, 0.15)  base (0.4, 0.15)
  _20260925_185208 cut_off  end (0.69, 0.06)  base (0.54, 0.37)
  _20260925_185508 wrapped  end (0.68, 0.2)  base (0.3, 0.26)
  _20260925_185849 wrapped  end (0.58, 0.04)  base (0.37, 0.04)
  _20260925_190018 cut_off  end (0.32, 0.3)  base (0.87, 0.05)
  _20260925_190409 cut_off  end (0.22, 0.0)  base (0.62, 0.0)
  _20260925_190520 wrapped  end (0.47, 0.09)  base (0.54, 0.2)
  _20260925_191022 cut_off  end (0.76, 0.09)  base (0.62, 0.16)
  _20260925_191540 wrapped  end (0.25, 0.33)  base (0.09, 0.64)
  _20260925_191831 wrapped  end (0.69, 0.06)  base (0.52, 0.17)
  _20260925_192050 wrapped  end (0.05, 0.28)  base (0.26, 0.18)
  median straightness end 0.46 vs base 0.53; own cover end 0.15 vs base 0.15

command straightness per 5 s: last 15 s before death median 0.29 (n=48) vs rest of game 0.39 (n=672); share of rest windows < 0.3: 36%

wrap onsets (wrapping snake = killer):
  _20260925_170651 {'before_s': 26.0, 'cover': np.float64(0.42), 'radius': 362, 'gap_deg': 210, 'closed_after': 16.2, 'our_L': 6442, 'heading_off_gap': 60, 'mode': 'evade', 'box_s': 51.8, 'head_px': 265, 'head_sp': 6.5, 'head_r': 42, 'head_to_gap_deg': 118, 'pre_mode': 'evade', 'pre_remains': True, 'pre_boost': 0.71}
  _20260925_171635 {'onset': None, 'box_s': 35.3}
  _20260925_172548 {'before_s': 6.4, 'cover': np.float64(0.42), 'radius': 273, 'gap_deg': 210, 'closed_after': None, 'our_L': 3455, 'heading_off_gap': 100, 'mode': 'unwrap', 'box_s': 42.1, 'head_px': 276, 'head_sp': 8.2, 'head_r': 19, 'head_to_gap_deg': 131, 'pre_mode': 'evade', 'pre_remains': True, 'pre_boost': 0.4}
  _20260925_184659 {'before_s': 1.2, 'cover': np.float64(0.42), 'radius': 160, 'gap_deg': 210, 'closed_after': None, 'our_L': 313, 'heading_off_gap': 148, 'mode': 'emergency', 'box_s': 42.7, 'head_px': 698, 'head_sp': 14.0, 'head_r': 36, 'head_to_gap_deg': 112, 'pre_mode': 'evade', 'pre_remains': True, 'pre_boost': 0.52}
  _20260925_185508 {'before_s': 0.0, 'cover': np.float64(0.46), 'radius': 93, 'gap_deg': 195, 'closed_after': None, 'our_L': 1520, 'heading_off_gap': 121, 'mode': 'emergency', 'box_s': 46.7, 'head_px': 298, 'head_sp': 6.0, 'head_r': 24, 'head_to_gap_deg': 171, 'pre_mode': 'emergency', 'pre_remains': True, 'pre_boost': 0.38}
  _20260925_185849 {'before_s': 1.6, 'cover': np.float64(0.42), 'radius': 276, 'gap_deg': 210, 'closed_after': 1.2, 'our_L': 104, 'heading_off_gap': 117, 'mode': 'unwrap', 'box_s': 42.7, 'head_px': 150, 'head_sp': 14.0, 'head_r': 24, 'head_to_gap_deg': 106, 'pre_mode': 'evade', 'pre_remains': True, 'pre_boost': 0.56}
  _20260925_190520 {'before_s': 23.9, 'cover': np.float64(0.42), 'radius': 251, 'gap_deg': 210, 'closed_after': None, 'our_L': 839, 'heading_off_gap': 81, 'mode': 'unwrap', 'box_s': 40.8, 'head_px': 743, 'head_sp': 14.0, 'head_r': 20, 'head_to_gap_deg': 118, 'pre_mode': 'feed', 'pre_remains': True, 'pre_boost': 0.81}
  _20260925_191540 {'before_s': 0.2, 'cover': np.float64(0.42), 'radius': 262, 'gap_deg': 210, 'closed_after': None, 'our_L': 3188, 'heading_off_gap': 156, 'mode': 'emergency', 'box_s': 49.6, 'head_px': 131, 'head_sp': 14.0, 'head_r': 28, 'head_to_gap_deg': 115, 'pre_mode': 'feed', 'pre_remains': True, 'pre_boost': 0.46}
  _20260925_191831 {'before_s': 13.9, 'cover': np.float64(0.46), 'radius': 335, 'gap_deg': 180, 'closed_after': None, 'our_L': 827, 'heading_off_gap': 132, 'mode': 'unwrap', 'box_s': 39.9, 'head_px': 487, 'head_sp': 7.3, 'head_r': 23, 'head_to_gap_deg': 98, 'pre_mode': 'feed', 'pre_remains': True, 'pre_boost': 0.82}
  _20260925_192050 {'before_s': 25.3, 'cover': np.float64(0.42), 'radius': 399, 'gap_deg': 105, 'closed_after': 19.0, 'our_L': 278, 'heading_off_gap': 64, 'mode': 'unwrap', 'box_s': 36.0, 'head_px': 475, 'head_sp': 14.0, 'head_r': 44, 'head_to_gap_deg': 171, 'pre_mode': 'evade', 'pre_remains': True, 'pre_boost': 0.78}

```

## 재현 스크립트
research/analyze_recent_runs_20260925.py
research/recent_runs_followup_20260925.py

가정: 기록 시각은 루프 시작 시각이며 서버 시각이 아님. 클라이언트 md는 서버의 실제 부스트 적용 확인이 아님.
