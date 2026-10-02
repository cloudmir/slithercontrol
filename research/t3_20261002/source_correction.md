# T3 parallel entry correction — original evidence 2026-10-02

User original instruction: T3를 만들고 실제 테스트로 안전 오프셋 데이터셋을 만들자.
User observation: 평행하게 따라가는것이 아니라, 그냥 90도로 박고 죽는데? 알고리즘이 맞는건가?

Scope: independent T3. Initial implementation failed its live measurement objective. The initial 7-game run was stopped, not completed 30 games. First six deaths had last observed crossing angles 46.0–89.2 degrees and no stable levels. Position logs prove movement; the failure was target acquisition and unsafe direct seeking, not no movement.
Initial run: runs/t3_20261002_085713 / build1002-9ca46e23. Six deaths and seventh interrupted; stable levels0.
Correction1: acquisition includes curved long bodies but metrology retains straightness gates; all bodies/heads/wall enter an executable turn prediction before entry; perpendicular no-target command is turned; measurement target region remains allowed to approach stepwise. Static turn predictions are not verified server collision geometry.
Correction1 run: runs/t3_20261002_090930 / build1002-1efeafe8, one death21.7s, stable0. Logs showed a distant curved locked target, and a different nearest body at death; excluded from offset data.
Correction2: prefer near straight portions; release a distant curved target for a closer long target while aligning, retain target during measurement. Latest build1002-b5ab19c0. One-game live verification in runs/t3_20261002_091328 ended in death at119.2s (last alive log118.61s), stable0. No following game started. Settings restored, bot off at exit. No general safe offset established.
Synthetic validation: 20 speed/angle/side cases, including perpendicular headings, 160ms input delay and251 heading buckets. Each generated >=3 stable levels. Eight earlier production functions unchanged. Worker/UI check errors0. These are synthetic, not live offsets.
Dataset fields include build, run/game, own/enemy radii, actual speed, stability levels, all excluded deaths and last2seconds frames. Different builds and actual cruise/boost groups are separate; same-game levels count one independent game. Reference gap requires >=3 independent games and is marked an unvalidated candidate; no automatic application.

## first_batch_audit.json
```json
[
  {
    "game": "slp_01_log.json.gz",
    "seconds": 14.5,
    "path_px": 2641,
    "phases": {
      "seek": 420
    },
    "reasons": {
      "no_target": 419,
      "seek_straight_run": 1
    },
    "target_ticks": 1,
    "boost_ticks": 0,
    "end": {
      "t": 14.507,
      "ang": 1.571,
      "cmd": 90.4,
      "t3_heading_error": null,
      "t3_gap": null,
      "t3_target": null,
      "t3_lateral": null,
      "t3_phase": "seek"
    }
  },
  {
    "game": "slp_02_log.json.gz",
    "seconds": 7.2,
    "path_px": 1302,
    "phases": {
      "seek": 215
    },
    "reasons": {
      "no_target": 215
    },
    "target_ticks": 0,
    "boost_ticks": 0,
    "end": {
      "t": 7.207,
      "ang": 3.043,
      "cmd": 175.1,
      "t3_heading_error": null,
      "t3_gap": null,
      "t3_target": null,
      "t3_lateral": null,
      "t3_phase": "seek"
    }
  },
  {
    "game": "slp_03_log.json.gz",
    "seconds": 18.2,
    "path_px": 3304,
    "phases": {
      "seek": 543
    },
    "reasons": {
      "no_target": 543
    },
    "target_ticks": 0,
    "boost_ticks": 0,
    "end": {
      "t": 18.209,
      "ang": 3.068,
      "cmd": 176.6,
      "t3_heading_error": null,
      "t3_gap": null,
      "t3_target": null,
      "t3_lateral": null,
      "t3_phase": "seek"
    }
  },
  {
    "game": "slp_04_log.json.gz",
    "seconds": 12.7,
    "path_px": 2394,
    "phases": {
      "seek": 316,
      "align": 61
    },
    "reasons": {
      "no_target": 286,
      "seek_straight_run": 30,
      "align": 61
    },
    "target_ticks": 91,
    "boost_ticks": 19,
    "end": {
      "t": 12.667,
      "ang": 4.737,
      "cmd": 271.3,
      "t3_heading_error": 0.4118310585535472,
      "t3_gap": 454.2903300294635,
      "t3_target": 76,
      "t3_lateral": -286.73752029002407,
      "t3_phase": "align"
    }
  },
  {
    "game": "slp_05_log.json.gz",
    "seconds": 7.5,
    "path_px": 1354,
    "phases": {
      "seek": 225
    },
    "reasons": {
      "no_target": 225
    },
    "target_ticks": 0,
    "boost_ticks": 0,
    "end": {
      "t": 7.452,
      "ang": 4.541,
      "cmd": -98.9,
      "t3_heading_error": null,
      "t3_gap": null,
      "t3_target": null,
      "t3_lateral": null,
      "t3_phase": "seek"
    }
  },
  {
    "game": "slp_06_log.json.gz",
    "seconds": 18.3,
    "path_px": 3320,
    "phases": {
      "seek": 533,
      "align": 10
    },
    "reasons": {
      "no_target": 533,
      "curve": 10
    },
    "target_ticks": 10,
    "boost_ticks": 0,
    "end": {
      "t": 18.302,
      "ang": 4.688,
      "cmd": -90.1,
      "t3_heading_error": null,
      "t3_gap": null,
      "t3_target": null,
      "t3_lateral": null,
      "t3_phase": "seek"
    }
  },
  {
    "game": "slp_07_log.json.gz",
    "seconds": 5.4,
    "path_px": 936,
    "phases": {
      "seek": 156
    },
    "reasons": {
      "no_target": 156
    },
    "target_ticks": 0,
    "boost_ticks": 0,
    "end": {
      "t": 5.152,
      "ang": 0.147,
      "cmd": 8.7,
      "t3_heading_error": null,
      "t3_gap": null,
      "t3_target": null,
      "t3_lateral": null,
      "t3_phase": "seek"
    }
  }
]
```

## approach_audit.json
```json
[
  {
    "game": 1,
    "last_alive_t": 14.507,
    "nearest_gap": -2.458056094735131,
    "nearest_body": 292,
    "crossing_angle_degrees": 52.2
  },
  {
    "game": 2,
    "last_alive_t": 7.207,
    "nearest_gap": -3.1656103077998985,
    "nearest_body": 205,
    "crossing_angle_degrees": 87.5
  },
  {
    "game": 3,
    "last_alive_t": 18.209,
    "nearest_gap": -1.9413580723464001,
    "nearest_body": 194,
    "crossing_angle_degrees": 77.6
  },
  {
    "game": 4,
    "last_alive_t": 12.667,
    "nearest_gap": 0.370663388557702,
    "nearest_body": 76,
    "crossing_angle_degrees": 53.4
  },
  {
    "game": 5,
    "last_alive_t": 7.452,
    "nearest_gap": -6.2363593521579475,
    "nearest_body": 76,
    "crossing_angle_degrees": 46.0
  },
  {
    "game": 6,
    "last_alive_t": 18.302,
    "nearest_gap": 5.3991980229553675,
    "nearest_body": 76,
    "crossing_angle_degrees": 89.2
  }
]
```

## check.json
```json
{
  "tests": [
    {
      "speedMode": 0,
      "angle": 0,
      "side": 1,
      "levels": 12,
      "minGap": 0.25383149338085786,
      "first": [
        {
          "serial": 1,
          "t": 17.166666666666668,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.834192286365578,
          "gap_min": 12.384893686616124,
          "gap_max": 13.807660854945425,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 2.2464929987471596,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.4,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.486296487117215,
          "gap_min": 11.186764087284246,
          "gap_max": 12.160244386741397,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.6,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.437933087701822,
          "gap_min": 10.213283787827095,
          "gap_max": 11.186764087284246,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": 0,
      "side": -1,
      "levels": 12,
      "minGap": 0.2330640613217838,
      "first": [
        {
          "serial": 1,
          "t": 17.166666666666668,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.813424854306504,
          "gap_min": 12.36412625455705,
          "gap_max": 13.861776522844593,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 2.2464929987471596,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.4,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.465529055058141,
          "gap_min": 11.165996655225172,
          "gap_max": 12.214360054640565,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.6,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.49204875560099,
          "gap_min": 10.267399455726263,
          "gap_max": 11.165996655225172,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": 3.141592653589793,
      "side": 1,
      "levels": 12,
      "minGap": 0.33891790772395325,
      "first": [
        {
          "serial": 1,
          "t": 17.2,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.769512500792189,
          "gap_min": 12.320213901042735,
          "gap_max": 13.817864169330278,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.01251630539278814,
          "lateral": 2.2464929987471596,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.433333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.496499801502068,
          "gap_min": 11.196967401669099,
          "gap_max": 12.17044770112625,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.666666666666664,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.448136402086675,
          "gap_min": 10.148604002253705,
          "gap_max": 11.047201201752614,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": 3.141592653589793,
      "side": -1,
      "levels": 12,
      "minGap": 0.35746563991415314,
      "first": [
        {
          "serial": 1,
          "t": 17.2,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.788060232982389,
          "gap_min": 12.338761633232934,
          "gap_max": 13.76154053243954,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.01251630539278814,
          "lateral": 2.2464929987471596,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.433333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.515047533692268,
          "gap_min": 11.215515133859299,
          "gap_max": 12.18899543331645,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.666666666666664,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.466684134276875,
          "gap_min": 10.167151734443905,
          "gap_max": 11.065748933942814,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": 0.47,
      "side": 1,
      "levels": 12,
      "minGap": 0.23627669846040789,
      "first": [
        {
          "serial": 1,
          "t": 17.166666666666668,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.805946313707018,
          "gap_min": 12.336775939100875,
          "gap_max": 13.799276225808917,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.0194130058596218,
          "lateral": 1.23787895362156,
          "bend": 3.241851231905457e-14,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.4,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.503895518960427,
          "gap_min": 11.184494246545825,
          "gap_max": 12.197706618785638,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.005619604925954036,
          "lateral": 1.2378789535725325,
          "bend": 3.2862601528904634e-14,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.6,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.467761009288516,
          "gap_min": 10.197263081135382,
          "gap_max": 11.161572109112079,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.005619604925954036,
          "lateral": 1.2378789535723194,
          "bend": 9.769962616701378e-14,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": 0.47,
      "side": -1,
      "levels": 12,
      "minGap": 0.3536852493413818,
      "first": [
        {
          "serial": 1,
          "t": 17.2,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.79515619672128,
          "gap_min": 12.365717225258855,
          "gap_max": 13.823639974512147,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.005619604925954036,
          "lateral": 1.0086575793001837,
          "bend": 3.241851231905457e-14,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.433333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.476281699490443,
          "gap_min": 11.188965850666534,
          "gap_max": 12.205248341191108,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.005619604925954036,
          "lateral": 1.008657579300078,
          "bend": 3.2862601528904634e-14,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.666666666666664,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.516548532783617,
          "gap_min": 10.17727027029607,
          "gap_max": 11.111027497249147,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0.005619604925954036,
          "lateral": 1.0086575793001837,
          "bend": 9.769962616701378e-14,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": -1.5707963267948966,
      "side": 1,
      "levels": 13,
      "minGap": 0.16192925306313555,
      "first": [
        {
          "serial": 1,
          "t": 16.8,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.817173146006098,
          "gap_min": 12.367874546256644,
          "gap_max": 13.865524814544187,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 2.2464929987471596,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.03333333333333,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.469277346757735,
          "gap_min": 11.169744946924766,
          "gap_max": 12.21810834634016,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.233333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.495797047300584,
          "gap_min": 10.271147747425857,
          "gap_max": 11.169744946924766,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": -1.5707963267948966,
      "side": -1,
      "levels": 11,
      "minGap": 1.330588836928655,
      "first": [
        {
          "serial": 1,
          "t": 18.433333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.78770313053974,
          "gap_min": 12.338404530790285,
          "gap_max": 13.761171699119586,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 2.2464929987471596,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 19.666666666666664,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.439807331291377,
          "gap_min": 11.21515803141665,
          "gap_max": 12.1886383308738,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 20.866666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.466327031834226,
          "gap_min": 10.241677731959498,
          "gap_max": 11.140274931458407,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": 1.5707963267948966,
      "side": 1,
      "levels": 11,
      "minGap": 1.330588836928655,
      "first": [
        {
          "serial": 1,
          "t": 18.433333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.78770313053974,
          "gap_min": 12.338404530790285,
          "gap_max": 13.761171699119586,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 2.2464929987471596,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 19.666666666666664,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.439807331291377,
          "gap_min": 11.21515803141665,
          "gap_max": 12.1886383308738,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 20.866666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.466327031834226,
          "gap_min": 10.241677731959498,
          "gap_max": 11.140274931458407,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 0,
      "angle": 1.5707963267948966,
      "side": -1,
      "levels": 13,
      "minGap": 0.16192925306313555,
      "first": [
        {
          "serial": 1,
          "t": 16.8,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.817173146006098,
          "gap_min": 12.367874546256644,
          "gap_max": 13.865524814544187,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 2.2464929987471596,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.03333333333333,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.469277346757735,
          "gap_min": 11.169744946924766,
          "gap_max": 12.21810834634016,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.233333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 0,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.495797047300584,
          "gap_min": 10.271147747425857,
          "gap_max": 11.169744946924766,
          "samples": 31,
          "duration": 1,
          "speed": 5.79,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": false,
          "speed_class": "cruise_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": 0,
      "side": 1,
      "levels": 12,
      "minGap": 0.2596515270706732,
      "first": [
        {
          "serial": 1,
          "t": 16.933333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.93416585506202,
          "gap_min": 12.209907893462514,
          "gap_max": 13.658423816661525,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.166666666666664,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.485649931863009,
          "gap_min": 11.123520951063256,
          "gap_max": 12.209907893462514,
          "samples": 31,
          "duration": 0.9999999999999964,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.366666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.39926298946375,
          "gap_min": 10.037134008663998,
          "gap_max": 11.123520951063256,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": 0,
      "side": -1,
      "levels": 12,
      "minGap": 0.3924386494618375,
      "first": [
        {
          "serial": 1,
          "t": 16.866666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.704823996653431,
          "gap_min": 12.342695015853678,
          "gap_max": 13.79121093905269,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.1,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.618437054254173,
          "gap_min": 11.25630807345442,
          "gap_max": 12.342695015853678,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.333333333333336,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.532050111854915,
          "gap_min": 10.169921131055162,
          "gap_max": 11.25630807345442,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": 3.141592653589793,
      "side": 1,
      "levels": 8,
      "minGap": 4.188745091938472,
      "first": [
        {
          "serial": 1,
          "t": 16.96666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.879840631132538,
          "gap_min": 12.336647159932909,
          "gap_max": 13.78516308313192,
          "samples": 30,
          "duration": 0.9666666666666686,
          "speed": 14,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.2,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.431324707933527,
          "gap_min": 11.25026021753365,
          "gap_max": 12.155582669533032,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.433333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.344937765534269,
          "gap_min": 10.163873275134392,
          "gap_max": 11.069195727133774,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": 3.141592653589793,
      "side": -1,
      "levels": 8,
      "minGap": 4.244584648033197,
      "first": [
        {
          "serial": 1,
          "t": 16.96666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.754615696827386,
          "gap_min": 12.392486716027634,
          "gap_max": 13.659938148826768,
          "samples": 30,
          "duration": 0.9666666666666686,
          "speed": 14,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.2,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.487164264028252,
          "gap_min": 11.125035283228499,
          "gap_max": 12.211422225627757,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.433333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.400777321628993,
          "gap_min": 10.219712831229117,
          "gap_max": 11.125035283228499,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0.01251630539278814,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": 0.47,
      "side": 1,
      "levels": 12,
      "minGap": 0.15111691372670322,
      "first": [
        {
          "serial": 1,
          "t": 16.933333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.735169868439925,
          "gap_min": 12.34348067874069,
          "gap_max": 13.788309483974174,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0.005619604925954036,
          "lateral": 2.993144274553352,
          "bend": 3.2862601528904634e-14,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.166666666666664,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.497280728414559,
          "gap_min": 11.124066491164754,
          "gap_max": 12.269580868947827,
          "samples": 31,
          "duration": 0.9999999999999964,
          "speed": 14,
          "heading": 0.005619604925954036,
          "lateral": 2.993144274504004,
          "bend": 3.2862601528904634e-14,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.366666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.466331253610278,
          "gap_min": 10.148541873703913,
          "gap_max": 11.212759728113127,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0.005619604925954036,
          "lateral": 2.993144274553671,
          "bend": 3.241851231905457e-14,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": 0.47,
      "side": -1,
      "levels": 12,
      "minGap": 0.24185283245856226,
      "first": [
        {
          "serial": 1,
          "t": 16.933333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.842990461526817,
          "gap_min": 12.347814607722114,
          "gap_max": 13.818548741982369,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0.005619604925954036,
          "lateral": 2.4388957011186783,
          "bend": 3.2862601528904634e-14,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 18.166666666666664,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.520055946853937,
          "gap_min": 11.150523234893214,
          "gap_max": 12.259121370770494,
          "samples": 31,
          "duration": 0.9999999999999964,
          "speed": 14,
          "heading": 0.005619604925954036,
          "lateral": 2.4388957011188914,
          "bend": 3.2862601528904634e-14,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 19.366666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.485357620766266,
          "gap_min": 10.115824908810438,
          "gap_max": 11.143126521315459,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0.005619604925954036,
          "lateral": 2.4388957011186783,
          "bend": 3.2862601528904634e-14,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": -1.5707963267948966,
      "side": 1,
      "levels": 12,
      "minGap": 0.02149517721045413,
      "first": [
        {
          "serial": 1,
          "t": 16.46666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.6960095052018,
          "gap_min": 12.333880524402048,
          "gap_max": 13.782396447601059,
          "samples": 30,
          "duration": 0.9666666666666686,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 17.7,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.609622562802542,
          "gap_min": 11.24749358200279,
          "gap_max": 12.333880524402048,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 18.933333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.523235620403284,
          "gap_min": 10.161106639603531,
          "gap_max": 11.24749358200279,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": -1.5707963267948966,
      "side": -1,
      "levels": 12,
      "minGap": 1.044064449124562,
      "first": [
        {
          "serial": 1,
          "t": 18.133333333333333,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.813256325116527,
          "gap_min": 12.270062853916897,
          "gap_max": 13.718578777115908,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 19.333333333333336,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.545804892317392,
          "gap_min": 11.18367591151764,
          "gap_max": 12.270062853916897,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 20.566666666666666,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.459417949918134,
          "gap_min": 10.097288969118381,
          "gap_max": 11.18367591151764,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": 1.5707963267948966,
      "side": 1,
      "levels": 12,
      "minGap": 1.044064449124562,
      "first": [
        {
          "serial": 1,
          "t": 18.133333333333333,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.813256325116527,
          "gap_min": 12.270062853916897,
          "gap_max": 13.718578777115908,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 19.333333333333336,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.545804892317392,
          "gap_min": 11.18367591151764,
          "gap_max": 12.270062853916897,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 20.566666666666666,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.459417949918134,
          "gap_min": 10.097288969118381,
          "gap_max": 11.18367591151764,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    },
    {
      "speedMode": 1,
      "angle": 1.5707963267948966,
      "side": -1,
      "levels": 12,
      "minGap": 0.02149517721045413,
      "first": [
        {
          "serial": 1,
          "t": 16.46666666666667,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 12,
          "gap": 12.6960095052018,
          "gap_min": 12.333880524402048,
          "gap_max": 13.782396447601059,
          "samples": 30,
          "duration": 0.9666666666666686,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 2,
          "t": 17.7,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 11,
          "gap": 11.609622562802542,
          "gap_min": 11.24749358200279,
          "gap_max": 12.333880524402048,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        },
        {
          "serial": 3,
          "t": 18.933333333333334,
          "target": 9,
          "episode": 1,
          "requested_speed": 1,
          "own_r": 14.5,
          "enemy_r": 20,
          "set": 10,
          "gap": 10.523235620403284,
          "gap_min": 10.161106639603531,
          "gap_max": 11.24749358200279,
          "samples": 31,
          "duration": 1,
          "speed": 14,
          "heading": 0,
          "lateral": 0,
          "bend": 0,
          "boost": true,
          "speed_class": "boost_speed",
          "enemy_speed": null
        }
      ]
    }
  ],
  "nearestLongTarget": true,
  "targetRetainedDuringInterference": true,
  "independent": true,
  "priorFunctionsPreserved": 8,
  "defaultParity": true,
  "scope": "synthetic 251-code steering + 160ms delay, not measured live boundary"
}
```

## entry_verify.json
```json
{
  "perpendicular_no_target": {
    "old_command": [
      -1.5707963267948966,
      false
    ],
    "new_command": [
      -3.141592653589793,
      false
    ],
    "reason": "entry_collision_turn",
    "model_clear": 11.80630858335644
  },
  "recorded_frames": [
    {
      "game": 1,
      "guarded_turns": 7,
      "model_clear": 50,
      "model_no_safe_turn": 3,
      "target_frames": 31
    },
    {
      "game": 2,
      "guarded_turns": 4,
      "model_clear": 24,
      "model_no_safe_turn": 3,
      "target_frames": 27
    },
    {
      "game": 3,
      "guarded_turns": 1,
      "model_clear": 67,
      "model_no_safe_turn": 1,
      "target_frames": 68
    },
    {
      "game": 4,
      "guarded_turns": 2,
      "model_clear": 46,
      "model_no_safe_turn": 2,
      "target_frames": 26
    },
    {
      "game": 5,
      "guarded_turns": 5,
      "model_clear": 25,
      "model_no_safe_turn": 4,
      "target_frames": 29
    },
    {
      "game": 6,
      "guarded_turns": 3,
      "model_clear": 67,
      "model_no_safe_turn": 1,
      "target_frames": 43
    }
  ],
  "scope": "Static observed-body turn prediction; no live survival claim.",
  "cost_ms": {
    "p50": 1.3268100000000231,
    "p95": 18.859667000000172,
    "max": 46.398938000000044,
    "frames": 293
  }
}
```

## mock.json
```json
{
  "realWorkerT3": true,
  "boostRequest": true,
  "modeSwitchOff": true,
  "persisted": true,
  "pageErrors": []
}
```

## Production hashes
```json
{
  "ext/pilot.js": "4911cc5e453deec4aab2d36480cbd88817099b80184512d637ade37effcb55d6",
  "ext/mod.js": "4e3b52f34a67bab981bf555172b4946d1ae019a50358dc0d9e7ee7ffe2f7a1fa",
  "params.json": "9ae9af336f0037b2a838f1c612e98eb2b8f621908ee7799523d6b1dc013b09e2",
  "ext/params.js": "9982977aeb9e37897d8670669c57d5fe4412b10268b43ce867e2875fcd0825b0",
  "ext/manifest.json": "034d7af7b4be2e6b8a6978381b4bf13d04b7b0197c9963d81c0feecb5c9325c6"
}
```

## Exact production T3
```js
  t3Step(s) {
    // Dedicated target-locked follower. Interference changes sample validity, never the driving objective.
    const {x:px,y:py,ang,sp,sc,t:T,segs:S,sid,heads:H,hid}=s,ro=R*sc,V=this.values;
    const minLen=V.T3_MIN_LEN??600,start=V.T3_GAP0??12,bin=r=>r<20?0:r<30?1:r<40?2:r<50?3:4;
    const pr=this.t3Probe||(this.t3Probe={id:null,set:start,since:T,levels:[],samples:[],dir:1,quantError:0,phase:"approach",episode:0});
    let event=null,heading=null,lateral=null,bend=null,valid=false,reason='no_target',visibleLength=0,boost=false,boostReason='no_target',enemySpeed=null,remaining=null;
    const enemyHeads=new Map();for(let j=0;j<hid.length;j++)enemyHeads.set(hid[j],{x:H[j*5],y:H[j*5+1],sp:H[j*5+3]});
    const done=(cmd,phase,tg=null,gap=null,path=[])=>{
      // Predict the turn actually executable after input delay, including every body during entry.
      const ph=this.v4Physics(sc),localKeys=new Set();if(tg){for(const direction of [-1,1]){let distance=0;for(let j=tg.i;j>=0&&j<tg.ks.length&&distance<500;j+=direction){const k=tg.ks[j];localKeys.add(k);distance+=hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]);}}}const allowed=(k)=>pr.phase==='measure'&&tg&&sid[k]===tg.id&&localKeys.has(k)&&hypot(S[k*5]-tg.x,S[k*5+1]-tg.y)<400?Math.min(12,pr.set-5):12;
      const collisionKeys=[];for(let k=0;k<sid.length;k++)if(segDist(px,py,S,k)-ro-S[k*5+4]<Math.max(sp,BOOST_SP)*PX_PER_SP+40)collisionKeys.push(k);
      const evaluate=(target,accel)=>{let st={x:px,y:py,h:ang,v:Math.max(5.5,sp)*PX_PER_SP},clear=Infinity;
        for(let n=0;n<(pr.phase==='measure'?16:36);n++){const dt=.025,time=(n+1)*dt;st=this.v4Adv(st,n<7?(s.cmdNow??ang):target,n<7?!!s.boostNow:accel,dt,ph);
          for(const k of collisionKeys)clear=Math.min(clear,segDist(st.x,st.y,S,k)-ro-S[k*5+4]-allowed(k));
          for(let j=0;j<hid.length;j++){const speed=H[j*5+3]*PX_PER_SP,h=H[j*5+2],x=H[j*5]+speed*time*Math.cos(h),y=H[j*5+1]+speed*time*Math.sin(h);clear=Math.min(clear,hypot(st.x-x,st.y-y)-ro-R*H[j*5+4]-20);}
          if(s.wall)clear=Math.min(clear,s.wall[2]-hypot(st.x-s.wall[0],st.y-s.wall[1])-ro-20);
        }return {cmd:target,boost:accel,clear,st};};
      let chosen=evaluate(cmd,boost);
      if(chosen.clear<0){const options=[evaluate(cmd,false),...[-PI/2,-PI/3,-PI/6,0,PI/6,PI/3,PI/2].map(d=>evaluate(ang+d,false))],safe=options.filter(q=>q.clear>=0);
        const list=safe.length?safe:options;list.sort((a,b)=>safe.length?(Math.abs(wrap(a.cmd-cmd))-.002*Math.min(a.clear,100))-(Math.abs(wrap(b.cmd-cmd))-.002*Math.min(b.clear,100)):b.clear-a.clear);chosen=list[0];cmd=chosen.cmd;boost=chosen.boost;reason=safe.length?'entry_collision_turn':'entry_no_safe_turn';valid=false;pr.samples=[];delete pr.alignedSince;if(event){pr.levels.pop();pr.set=event.set;}event=null;path=[px,py,chosen.st.x,chosen.st.y];boostReason='entry_turn_no_boost';}
      const tr={mode:'probe',boost,cmd:r1(deg(cmd)),L:s.L,sc:r2(sc),prof:this.profile,nh:hid.length,
        t3_guard_clear:chosen.clear,t3_guard_changed:reason.startsWith("entry_")?1:0,t3_on:1,t3_phase:phase,t3_episode:pr.episode,t3_speed:sp,t3_requested_speed:V.T3_SPEED??0,t3_own_r:ro,t3_enemy_r:tg?.r??null,t3_gap:gap,t3_set:pr.set,t3_target:tg?.id??null,t3_level:event,
        t3_heading_error:heading,t3_lateral:lateral,t3_bend:bend,t3_valid:valid?1:0,t3_reason:reason,t3_visible_length:visibleLength,t3_boost_reason:boostReason,t3_enemy_speed:enemySpeed,t3_remaining:remaining,t3_boost:boost?1:0,
        pph:valid?1:phase==='seek'?0:2,pset:pr.set,pgap:gap,ptr:tg?.r??null,ptid:tg?.id??null,pstab:pr.levels.length};
      this.last={mode:'probe',trace:tr,draw:{chosen:path,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:tg?[{id:tg.id,x:tg.x,y:tg.y,r:tg.r,gap}]:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro,analysis:null}};
      this.prev=cmd;this.prevBoost=boost;return [cmd,boost];
    };
    const snakes=new Map();for(let k=0;k<sid.length;k++){let a=snakes.get(sid[k]);if(!a){a=[];snakes.set(sid[k],a);}a.push(k);}
    // Acquire the nearest part of long bodies; straightness gates measurement, not target acquisition.
    const approachCandidates=[];
    for(const [id,all]of snakes){
      const total=all.reduce((n,k)=>n+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]),0);if(total<minLen)continue;
      let near=null;
      for(let i=0;i<all.length;i++){const k=all[i],ax=S[k*5],ay=S[k*5+1],dx=S[k*5+2]-ax,dy=S[k*5+3]-ay,L=hypot(dx,dy),u=clip(((px-ax)*dx+(py-ay)*dy)/(L*L||1),0,1),x=ax+u*dx,y=ay+u*dy,d=hypot(px-x,py-y);if(!near||d<near.d)near={id,ks:all,i,k,u,x,y,d,r:S[k*5+4],h:Math.atan2(dy,dx),len:total};}
      if(near){near.gap=near.d-ro-near.r;near.runway=all.slice(near.i).reduce((n,k,j)=>n+hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1])*(j?1:1-near.u),0);near.bend=0;for(const direction of [-1,1]){let walked=0,j=near.i,last=near.h;while(walked<100&&j+direction>=0&&j+direction<all.length){j+=direction;const k=all[j],h=Math.atan2(S[k*5+3]-S[k*5+1],S[k*5+2]-S[k*5]);near.bend+=Math.abs(wrap(h-last));last=h;walked+=hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]);}}approachCandidates.push(near);}

    }
    // Once acquired, retain this enemy through bends, head proximity, and changes in neighbouring snakes.
    const pool=approachCandidates;let tg=pool.find(q=>q.id===pr.id&&q.d<1400);
    const nearer=pool.filter(q=>q.id!==pr.id).sort((a,b)=>a.d-b.d)[0];
    // A distant bend must not lock out the long body already beside us.
    if(pr.phase!=='measure'&&tg&&nearer&&T-(pr.acquired??0)>1&&(nearer.d+200<tg.d||(tg.bend>rad(12)&&nearer.bend<rad(6)&&nearer.d<tg.d+100)))tg=null;
    if(!tg){
      tg=pool.filter(q=>q.len>=minLen&&q.d<1400).sort((a,b)=>(a.d+Math.min(a.bend,PI)*150+Math.abs(bin(a.r)-(V.T3_BIN??0))*60)-(b.d+Math.min(b.bend,PI)*150+Math.abs(bin(b.r)-(V.T3_BIN??0))*60))[0];
      if(tg){pr.id=tg.id;pr.acquired=T;pr.set=start;pr.since=T;pr.samples=[];delete pr.prevGap;pr.dir=Math.abs(wrap(ang-tg.h))>PI/2?-1:1;pr.quantError=0;pr.phase="approach";pr.episode++;const entryTangent=tg.h+(pr.dir<0?PI:0);pr.side=sign(Math.cos(entryTangent)*(py-tg.y)-Math.sin(entryTangent)*(px-tg.x))||1;}
      else{pr.id=null;pr.samples=[];delete pr.prevGap;
        // Approach a long nearby enemy, even when its straight portion is not yet suitable for metrology.
        const q=pool.filter(q=>q.len>=minLen).sort((a,b)=>a.d-b.d)[0];
        if(q){const tangent=q.h,side=sign(Math.cos(tangent)*(py-q.y)-Math.sin(tangent)*(px-q.x))||1,desired=tangent-side*rad(20),headingError=Math.abs(wrap(ang-desired));visibleLength=q.len;reason='seek_straight_run';boost=headingError<rad(12)&&q.gap>100;boostReason=boost?'catch_target':'align_before_boost';return done(desired,'seek',q,q.gap,[px,py,px+250*Math.cos(desired),py+250*Math.sin(desired)]);}

        const wall=s.wall||[30000,30000,20000],cmd=hypot(px-wall[0],py-wall[1])>150?Math.atan2(wall[1]-py,wall[0]-px):ang;return done(cmd,'seek',null,null,[px,py,px+200*Math.cos(cmd),py+200*Math.sin(cmd)]);
      }
    }
    visibleLength=tg.len;enemySpeed=enemyHeads.get(tg.id)?.sp??null;
    remaining=0;for(let j=tg.i;j<tg.ks.length;j++){const k=tg.ks[j];remaining+=hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1])*(j===tg.i?1-tg.u:1);}
    if(pr.dir<0){remaining=0;for(let j=tg.i;j>=0;j--){const k=tg.ks[j];remaining+=hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1])*(j===tg.i?tg.u:1);}}
    const dir=pr.dir,tangent=tg.h+(dir<0?PI:0),tx=Math.cos(tangent),ty=Math.sin(tangent),side=pr.side??(sign(tx*(py-tg.y)-ty*(px-tg.x))||1);
    if(pr.phase!=="measure")pr.set=30;
    const gap=tg.gap,err=gap-pr.set,dt=T-(pr.prevT??T);heading=Math.abs(wrap(ang-tangent));
    lateral=pr.prevGap!==undefined&&dt>0&&dt<.2?(gap-pr.prevGap)/dt:0;
    if(dt>.15||Math.abs((pr.rt??tg.r)-tg.r)>.3)pr.samples=[];
    pr.prevGap=gap;pr.prevT=T;pr.rt=tg.r;
    // Curvature only labels data. It never releases the locked enemy or activates an escape controller.
    bend=0;for(const d of [-1,1]){let walked=0,i=tg.i,last=tg.h;while(walked<100&&i+d>=0&&i+d<tg.ks.length){i+=d;const k=tg.ks[i],a=Math.atan2(S[k*5+3]-S[k*5+1],S[k*5+2]-S[k*5]);bend+=Math.abs(wrap(a-last));last=a;walked+=hypot(S[k*5+2]-S[k*5],S[k*5+3]-S[k*5+1]);}}
    // Advance a short distance along the actual body, then offset to the side we occupy.
    const v=Math.max(5.5,sp)*PX_PER_SP,look=clip(v*.32,55,145);let left=look,i=tg.i,u=tg.u,qx=tg.x,qy=tg.y,qh=tg.h,ended=false;
    for(let guard=0;guard<300&&left>0;guard++){const k=tg.ks[i],ax=S[k*5],ay=S[k*5+1],dx=S[k*5+2]-ax,dy=S[k*5+3]-ay,L=hypot(dx,dy)||1e-6,room=(dir>0?1-u:u)*L;
      if(left<=room){u+=dir*left/L;qx=ax+u*dx;qy=ay+u*dy;qh=Math.atan2(dy,dx);left=0;break;}
      qx=ax+(dir>0?dx:0);qy=ay+(dir>0?dy:0);qh=Math.atan2(dy,dx);left-=room;i+=dir;
      if(i<0||i>=tg.ks.length){ended=true;qx+=dir*left*Math.cos(qh);qy+=dir*left*Math.sin(qh);break;}u=dir>0?0:1;
    }
    const future=qh+(dir<0?PI:0),nx=-Math.sin(future)*side,ny=Math.cos(future)*side;
    const predicted=err+clip(lateral,-150,150)*.14,normal=clip(-predicted*1.6,-(gap>pr.set+80?v*.75:gap>pr.set+10?35:8),20);
    // Near-body steering combines tangent feedback with the actual bend ahead.
    const curve=clip(wrap(future-tangent),-rad(20),rad(20));let desired=tangent+curve*.7+side*Math.asin(clip(normal/v,-.8,.3));
    if(pr.phase!=="measure"){
      // Rotate to the body tangent first; only then close the lateral gap.
      const nearestTangent=Math.abs(wrap(tangent-ang))<=PI/2?tangent:tangent+PI;
      if(heading>rad(25))desired=nearestTangent;
      else desired=tangent+side*Math.asin(clip(-((gap-30)+clip(lateral,-150,150)*.2)*1.2/v,-.30,.20));
    }
    // 251 heading codes: unbiased pulse-density commands overcome the floor bias and sub-code dead band.
    const quantum=TAU/251,code=((desired%TAU+TAU)%TAU)/quantum,lo=Math.floor(code),fraction=code-lo;
    pr.quantError+=fraction;const up=pr.quantError>=1?1:0;if(up)pr.quantError-=1;const cmd=(lo+up+.15)*quantum;
    const D=ro+tg.r+pr.set,ox=qx+nx*D,oy=qy+ny*D;
    // Close the longitudinal deficit with boost; once beside the target, pace its observed speed.
    const catchUp=pr.phase!=="measure"&&gap>180&&heading<rad(10);
    const desiredSpeed=pr.phase==="measure"?((V.T3_SPEED??0)?BOOST_SP:cruiseSp(sc)):catchUp?BOOST_SP:cruiseSp(sc);
    const canAccelerate=heading<rad(pr.phase==='measure'?8:15)&&bend<rad(6);
    if(canAccelerate){boost=desiredSpeed>8;boostReason=boost?(catchUp?'catch_target':'boost_measure'):'cruise_measure';}
    else{boost=false;boostReason='turn_alignment';}
    pr.speedBoost=boost;
    reason='clean';
    if(ended)reason='body_endpoint';else if(bend>rad(6))reason='curve';else if(heading>rad(6)||Math.abs(err)>20)reason='align';
    for(let j=0;j<hid.length;j++)if(hypot(H[j*5]-px,H[j*5+1]-py)<250){reason='head_interference';break;}
    for(let k=0;k<sid.length;k++)if(sid[k]!==tg.id&&segDist(px,py,S,k)-S[k*5+4]-ro<35){reason='body_interference';break;}
    if(s.wall&&s.wall[2]-hypot(px-s.wall[0],py-s.wall[1])-ro<100)reason='wall_interference';
    if(pr.phase!=="measure"){
      if(reason==='clean'&&remaining>350&&Math.abs(gap-30)<3&&heading<rad(4)&&Math.abs(lateral)<10){pr.alignedSince??=T;
        if(T-pr.alignedSince>.75){pr.phase='measure';pr.set=start;pr.since=T;pr.samples=[];}
      }else delete pr.alignedSince;
      if(pr.phase!=='measure'&&reason==='clean')reason='parallel_entry';
    }
    if(bend>rad(6)||ended){pr.phase='approach';pr.samples=[];delete pr.alignedSince;}
    valid=reason==='clean'&&pr.phase==='measure';
    if(!valid)pr.samples=[];
    else{const a=pr.samples;a.push({t:T,gap,err:Math.abs(err),ro,rt:tg.r,heading,lateral:Math.abs(lateral),speed:sp,boost:boost?1:0});while(a.length&&T-a[0].t>1)a.shift();
      const med=k=>a.map(q=>q[k]).sort((x,y)=>x-y)[a.length>>1],range=k=>Math.max(...a.map(q=>q[k]))-Math.min(...a.map(q=>q[k]));
      if(a.length>=15&&T-a[0].t>=.75&&T-pr.since>=1.2&&med('err')<1&&range('gap')<1.5&&med('heading')<rad(6)&&med('lateral')<8&&range('ro')<.3&&range('rt')<.3&&range('speed')<1.0&&range('boost')===0){
        event={serial:(this.t3Serial=(this.t3Serial??0)+1),t:T,target:pr.id,episode:pr.episode,requested_speed:V.T3_SPEED??0,own_r:med('ro'),enemy_r:med('rt'),set:pr.set,gap:med('gap'),gap_min:Math.min(...a.map(q=>q.gap)),gap_max:Math.max(...a.map(q=>q.gap)),samples:a.length,duration:T-a[0].t,speed:med('speed'),heading:med('heading'),lateral:med('lateral'),bend,boost:!!med('boost'),speed_class:med('speed')>8?'boost_speed':'cruise_speed',enemy_speed:enemySpeed};
        pr.levels.push(event);pr.set=Math.max(-30,pr.set-1);pr.since=T;pr.samples=[];
      }
    }
    return done(cmd,pr.phase==='measure'?'follow':'align',tg,gap,[px,py,ox,oy]);
  }

```

## Live progress at capture (not final results)
```json
{
  "out": "runs/t3_20261002_091328",
  "state": "실게임 수집 중",
  "game": 1,
  "build": "1002-b5ab19c0",
  "updated": "2026-10-02 09:15:01",
  "elapsed_s": 77,
  "last": {
    "t3_on": 1,
    "t3_phase": "align",
    "t3_own_r": 15.867924528301886,
    "t3_enemy_r": 34.471698113207545,
    "t3_gap": 54.15055360364216,
    "t3_set": 30,
    "t3_target": 230,
    "t3_level": null,
    "t3_heading_error": 0.20055824221052987,
    "t3_lateral": -45.21981397529007,
    "t3_bend": 0.2789736895263091,
    "t3_valid": 0,
    "t3_reason": "curve",
    "t3_visible_length": 2837.886949216042,
    "t3_boost_reason": "turn_alignment",
    "t3_enemy_speed": 6.265,
    "t3_remaining": 1358.3230769986098,
    "t3_boost": 0,
    "t3_episode": 33,
    "t3_speed": 5.777777777777778,
    "t3_requested_speed": 0,
    "t3_guard_clear": 34.98671933537569,
    "t3_guard_changed": 0,
    "t2_on": null,
    "t2_phase": null,
    "t2_own_r": null,
    "t2_enemy_r": null,
    "t2_gap": null,
    "t2_set": null,
    "t2_target": null,
    "t2_heading_error": null,
    "t2_lateral": null,
    "t2_bend": null,
    "t2_valid": null,
    "t2_reason": null,
    "t2_visible_length": null,
    "t2_boost_reason": null,
    "t2_enemy_speed": null,
    "t2_remaining": null,
    "t2_boost": null,
    "t1_on": null,
    "t1_phase": null,
    "t1_gap": null,
    "t1_own_r": null,
    "t1_enemy_r": null,
    "t1_set": null,
    "t1_target": null,
    "va1_on": null,
    "va1_phase": null,
    "va1_food_mass": null,
    "va1_crowd": null,
    "ms": 0.19999998807907104,
    "mode": "probe",
    "v10_routes": null,
    "v10_strategy": null,
    "v10_map_ms": null,
    "v10_threat_ms": null,
    "v10_result_age_ms": null,
    "v9_routes": null,
    "v9_reason": null,
    "squeeze": null,
    "v7_phase": null,
    "v7_heads": null,
    "v8_phase": null,
    "v8_heads": null,
    "v81_density": null,
    "v81_reason": null
  }
}
```

## Final second correction live summary
```json
{
  "out": "runs/t3_20261002_091328",
  "protocol": "parallel_entry_t3",
  "purpose": "T3: enemy thickness versus observed stable alive gaps and qualified last-alive death candidates",
  "games": [
    {
      "protocol": "parallel_entry_t3",
      "build": "1002-b5ab19c0",
      "game": 1,
      "run": "t3_20261002_091328",
      "seconds": 119.2,
      "end": "death",
      "L_max": 253,
      "errors": 0,
      "follow_samples": 2981,
      "levels": 0,
      "candidate": {
        "target": 443,
        "enemy_r": 16,
        "own_r": 16.55188679245283,
        "distance": 32.45702391487257,
        "gap": -0.09486287758025824,
        "angle": -2.768604931789718,
        "kind": "excluded_death",
        "game": 1,
        "run": "t3_20261002_091328",
        "t": 119.204,
        "set": 30,
        "speed": 5.833333333333333,
        "speed_class": "cruise_speed",
        "boost_command": 0,
        "gap_min": -0.09486287758025824,
        "gap_max": -0.09486287758025824,
        "death_window_s": -0.003999999999990678,
        "sample_interval_s": 0.03299999999998704,
        "last_alive_gap": -0.09486287758025824,
        "last_alive_distance": 32.45702391487257,
        "head_distance": 58.19400915479171,
        "reasons": [
          "사망 전 추종 중 아님",
          "최근접 몸통이 추종 대상과 다름",
          "최근 2.5초 안정 유지 표본 없음",
          "사망 전 관측 시점 불확실",
          "다른 머리 간섭 가능"
        ],
        "protocol": "parallel_entry_t3",
        "build": "1002-b5ab19c0",
        "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_091328/slp_01_box.json.gz"
      },
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "사망 전 관측 시점 불확실",
        "다른 머리 간섭 가능"
      ],
      "parameters": {
        "LAT": 0.1,
        "HARD": 0,
        "SAFE": 10,
        "TIGHT": 5,
        "SAFE_HEADS": 18,
        "HARD_PHYS": 5,
        "CREDIT": 25,
        "THICK_OFF_THIN": 0,
        "THICK_OFF_MID": 0,
        "THICK_OFF_THICK": 0,
        "REACH": 700,
        "HEAD_R": 900,
        "HEAD_NEAR": 150,
        "REMAINS": 12,
        "FOOD_R": 3000,
        "EAT": 30,
        "W_FOOD": 2,
        "W_GOAL": 40,
        "BOOST_COST": 30,
        "W_RUN": 40,
        "BOOST_DWELL": 0.285,
        "W_OPEN": 0.05,
        "W_ESC": 0,
        "W_AWAY": 0,
        "W_CUT": 60,
        "W_TURN": 0.12,
        "SWITCH": 8,
        "W_WRAP": 100,
        "BIG_RATIO": 1.5,
        "W_BIG": 0,
        "W_PROG": 20,
        "W_WP": 40,
        "LOOP_STRAIGHT": 0.5,
        "W_CURL": 60,
        "CURL_ON": 0.25,
        "W_PAR": 0,
        "LONG_RATIO": 1.5,
        "W_CENTER": 40,
        "RIM": 0.5,
        "W_CROWD": 60,
        "CROWD_R": 700,
        "W_HUNT": 40,
        "W_THREAD": 40,
        "LONG_T": 3.8,
        "LONG_SAFE": 10,
        "SIDE_HOLD": 0.6,
        "CONFIRM": 2,
        "PEND_GAP": 0.1,
        "MAX_REL_DEG": 150,
        "CALM_RATE_DEG": 90,
        "COIL_ON": 0.9,
        "COIL_OFF": 0.5,
        "GAP_EXTRA": 120,
        "GAP_R": 450,
        "THREAD_TOL": 3,
        "W_CENTRE": 40,
        "SQUEEZE_ON": 1,
        "CORRIDOR_W": 160,
        "SQUEEZE_R": 500,
        "SQUEEZE_ANGLE": 60,
        "W_SQUEEZE": 40,
        "TURN_FIX": 1,
        "RAIDER_ON": 1,
        "SIZE_SAFE": 1,
        "SIZE_GATE": 1,
        "HEAD_RAYS": 1,
        "WRAP_RAID": 1,
        "WRAP_EXIT_TAIL": 1,
        "MODE_DWELL": 0.6,
        "BOOST_DANGER": 10,
        "HEAP_GATE": 1,
        "SIZE_PROFILE": 1,
        "SIZE_SC": 2.3,
        "RIVAL_R": 700,
        "GUARD_ON": 1,
        "GUARD_R": 900,
        "GUARD_T": 2.5,
        "GUARD_TTC": 1.2,
        "W_GUARD": 40,
        "GIANT_ON": 0,
        "GIANT_RATIO": 1.5,
        "GIANT_COV": 0.35,
        "GIANT_D": 250,
        "GIANT_HOLD": 0.7,
        "GIANT_OFF": 0.25,
        "GIANT_KEEP": 1.5,
        "PROBE_ON": 0,
        "PROBE_GAP0": 4,
        "PROBE_JUMP": -4,
        "PROBE_STEP": 1,
        "PROBE_FLOOR": -30,
        "PROBE_MIN_L": 0,
        "BOUND_CAL": 0,
        "BOUND_GAP": -5,
        "REMAINS_ONLY": 0,
        "WF_ON": 0,
        "WF_RATIO": 1,
        "WF_COV": 0.2,
        "WF_ANG": 50,
        "WF_BOOST_COV": 0.4,
        "NOWRAP_ON": 0,
        "NW_RATIO": 1,
        "NW_SPEED": 1,
        "NW_MARGIN": 0,
        "V2_ON": 0,
        "V2_H": 5,
        "V2_TOK": 2.5,
        "V2_MARGIN": 10,
        "V2_MINL": 80,
        "V2_HEAPW": 0.2,
        "V2_HEAPMIN": 60,
        "V2_BCOST": 60,
        "V2_HYST": 5,
        "V2_CONE": 120,
        "V2_TOKS": 5,
        "V2_WTTD": 8,
        "V2_WRAPCOV": 0.54,
        "V2_WRAPR": 1150,
        "V2_WRAPANG": 60,
        "V2_WRAPRATIO": 0,
        "V2_ARCMIN": 2,
        "V2_CHGR": 1000,
        "V2_WALLSHRINK": 1,
        "V2_STRAIGHT": 1,
        "V2_WRAP": 1,
        "V2_CHG": 0,
        "V2_BOOSTFREE": 0,
        "V2_REMAINS": 12,
        "V2_EXIT_ON": 0,
        "V2_EXIT_EDGE": 900,
        "V2_EXIT_SAMPLE": 4,
        "V2_EXIT_MIN_WIDTH": 32,
        "V2_EXIT_MIN_SLACK": 0.5,
        "V2_EXIT_WIDTH_W": 0.08,
        "V2_EXIT_SLACK_W": 8,
        "V2_EXIT_REFINE_TOP": 8,
        "V3_ON": 0,
        "V3_DT": 0.09,
        "V3_STEPS": 10,
        "V3_HC": 5,
        "V3_TOP": 12,
        "V3_BUDGET": 25,
        "V3_EDGE": 900,
        "V3_OBS": 1150,
        "V3_HEADPAD": 10,
        "V3_MIN_WIDTH": 32,
        "V3_MIN_SLACK": 0.5,
        "V3_CLOSE": 450,
        "V3_COMMIT_HOLD": 1,
        "V3_SHIELD": 8,
        "V3_BEAM1": 10,
        "V3_BEAM2": 40,
        "V3_BEAM3": 160,
        "V3_CMD_STEP": 2,
        "V3_SWITCH": 25,
        "TRACK_ON": 1,
        "TRACK_LOOK": 0.13,
        "TRACK_MIND": 15,
        "V3_RISKW": 40,
        "TRACK_MODE": 1,
        "TRACK_LAT": 0.17,
        "TRACK_KLAT": 0.6,
        "V4_ON": 0,
        "V4_CELL": 64,
        "V4_OBS": 1150,
        "V4_EDGE": 700,
        "V4_H": 6,
        "V4_MARGIN": 10,
        "V4_SAFETY": 0.3,
        "V4_HUG": 0.3,
        "V4_FOODW": 0.05,
        "V4_TIMEW": 1,
        "V4_HYST": 0.15,
        "V4_DIRS": 24,
        "V4_ARC": 1.5,
        "V4_MEM": 4,
        "V4_TURNW": 0.03,
        "V4_HEADR": 1300,
        "V4_PLAN_MS": 350,
        "V4_PLAN_BUDGET": 40,
        "V4_LOCAL_H": 0.9,
        "V4_ROUTE_AGE": 1,
        "V6_ON": 0,
        "V6_CELL": 48,
        "V6_OBS": 1400,
        "V6_EDGE": 1000,
        "V6_H": 8,
        "V6_MARGIN": 10,
        "V6_SAFETY": 0.3,
        "V6_CLEAR_W": 0.6,
        "V6_HEADR": 1300,
        "V6_PLAN_MS": 400,
        "V6_PLAN_BUDGET": 60,
        "V6_LOCAL_H": 1.1,
        "V6_ROUTE_AGE": 0.8,
        "V5_ON": 0,
        "V5_STAGE": 0.6,
        "V5_W_FOOD": 3,
        "V5_W_OPEN": 0.1,
        "V5_W_RISK": 4000,
        "V5_W_TURN": 0.5,
        "V5_W_BOOST": 8,
        "V5_W_STICK": 6,
        "V5_EATR": 30,
        "V5_REMAINSX": 4,
        "V5_HYST": 20,
        "V41_ON": 0,
        "V41_CELL": 48,
        "V41_OBS": 1150,
        "V41_EDGE": 700,
        "V41_H": 6,
        "V41_MARGIN": 10,
        "V41_SAFETY": 0.3,
        "V41_HUG": 0.3,
        "V41_FOODW": 0.05,
        "V41_TIMEW": 1,
        "V41_HYST": 0.15,
        "V41_CONE": 150,
        "V41_FIRST": 100,
        "V41_ASSUME_BOOST": 0,
        "V5_TG": 12,
        "V5_EXPLOREV": 10,
        "V6_FOOD_W": 1,
        "V6_REMAINS_MIN": 12,
        "V6_FOOD_R": 3000,
        "V6_HEAP_SIZE": 250,
        "V6_GOAL_W": 1.5,
        "V6_BOOST_W": 80,
        "V6_BOOST_MIN_MASS": 48,
        "V6_BOOST_MIN_DIST": 150,
        "V6_CENTER_W": 2,
        "V7_ON": 0,
        "V7_HEAD_R": 450,
        "V7_HEAD_N": 3,
        "V7_CLEAR_S": 1,
        "V8_ON": 0,
        "V8_HEAD_R": 450,
        "V8_HEAD_N": 3,
        "V8_CLEAR_S": 1,
        "V81_BODY_ON": 0,
        "V81_BODY_R": 450,
        "V81_BODY_PCT": 18,
        "V81_BODY_NEAR_W": 2,
        "V81_BODY_SELF_W": 0.1,
        "V9_ON": 0,
        "V9_OBS": 1200,
        "V9_EDGE": 900,
        "V9_H": 8,
        "V9_MARGIN": 5,
        "V9_ROUTES": 3,
        "V9_BUDGET": 100,
        "V9_PLAN_MS": 300,
        "V9_ROUTE_AGE": 0.65,
        "V9_HEAD_PAD": 20,
        "V9_FOOD_W": 2,
        "V9_FOOD_R": 3000,
        "V9_BOOST_ON": 1,
        "V9_CENTER_W": 2,
        "V9_REMAINS_MIN": 12,
        "V9_HEAP_SIZE": 160,
        "V9_BOOST_MIN_MASS": 48,
        "V9_BOOST_MIN_DIST": 180,
        "V9_TARGET_HOLD": 1.2,
        "V10_ON": 0,
        "V10_OBS": 3000,
        "V10_EDGE": 2100,
        "V10_MARGIN": 3,
        "V10_BUDGET": 90,
        "V10_ROUTE_AGE": 0.9,
        "V10_PLAN_MS": 300,
        "V10_ESCAPE_BOOST": 1,
        "V10_LOCAL_H": 0.9,
        "V10_HEAD_PAD": 12,
        "V10_HEAD_UNCERT": 1,
        "V10_FOOD_RISK": 0,
        "V10_FOOD_W": 2,
        "V10_SWITCH_RISK": 0.75,
        "V10_BOOST_COST": 0,
        "V101_ON": 0,
        "V11_ON": 0,
        "V11_HEAD_R": 250,
        "V11_BODY_GAP": 80,
        "V11_CLEAR_S": 1,
        "V102_ON": 0,
        "V102_FOOD_ON": 1,
        "V102_FOOD_MIN": 100,
        "V102_FOOD_R": 3000,
        "V102_HEAP_SIZE": 160,
        "V111_ON": 0,
        "V101_WRAP_ON": 1,
        "VA1_ON": 0,
        "VA1_FOOD_W": 6,
        "VA1_FOOD_R": 3000,
        "VA1_GAP": 1.5,
        "VA1_CENTER_W": 2,
        "VA1_CROWD_W": 2,
        "VA1_CROWD_TARGET": 4,
        "VA1_BOOST_COST": 0,
        "T1_ON": 0,
        "T1_BIN": 0,
        "T2_ON": 0,
        "T2_MIN_LEN": 600,
        "T2_GAP0": 6,
        "T3_ON": 1,
        "T3_MIN_LEN": 600,
        "T3_GAP0": 12,
        "T3_BIN": 0,
        "T3_SPEED": 0,
        "HEAP_BOOST": 0
      }
    }
  ],
  "planned_games": 1,
  "game_cap_s": 300,
  "batch_cap_s": 3600,
  "camera_interval_s": 0.5,
  "target_min_visible_length_px": 600,
  "gap_start_px": 12,
  "started": "2026-10-02 09:13:28",
  "hashes": {
    "ext/pilot.js": "4911cc5e453deec4aab2d36480cbd88817099b80184512d637ade37effcb55d6",
    "ext/mod.js": "4e3b52f34a67bab981bf555172b4946d1ae019a50358dc0d9e7ee7ffe2f7a1fa",
    "params.json": "9ae9af336f0037b2a838f1c612e98eb2b8f621908ee7799523d6b1dc013b09e2"
  },
  "success_criteria": "raw logs and stable alive levels across observed enemy radius bins; death candidates filtered for confounds; no universal safe-boundary assertion",
  "build": "1002-b5ab19c0",
  "completed": true,
  "page_errors": [],
  "settings_restored": true,
  "ended": "2026-10-02 09:15:57"
}
```
