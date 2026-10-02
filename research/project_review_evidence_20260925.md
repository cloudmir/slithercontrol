# 프로젝트 리뷰 근거 스냅샷 — 2026-09-25

현재 소스와 기존 실행 결과를 로컬에서 읽어 발췌했다. 새로운 실사이트 실행은 없다. 결과 요약에서 trace만 제외했다. 버전명은 배치 로그 파일명 기준이며 실행 당시 소스 해시는 저장되어 있지 않다.

## 현재 코드 해시
```json
{
  "pilot.py": "1d5615a4fcc4f51796c7c8975258d9ca942c07a7a74c9eebcdf2db4d3d07583b",
  "run_live.py": "b8a079660ba9fb0b84ca735edcb3b2e47b790a83a6f2c4351c5bf6571718ccc4",
  "measure.py": "7ab05c95d9c2cf8791f0c160be60ea9f0d63b7df4ac6d7157b20a68d12efd873",
  "probe.py": "877ec71d9264b65bcedc0ccd4fd1a62a3fe6d3b2e9a878894eaa014442874173",
  "deaths.py": "c898c91d6d3b1a26f42754520d321bc1c42bc10629aae5f1963021c9ef96e777",
  "batch_stats.py": "a121b17f009aa61fccef50ec19bd411b44e2dcca10b36eaf99daa810e7872e69"
}
```

## 로컬 반례 재현 출력
```json
{
  "code_sha256": "1d5615a4fcc4f51796c7c8975258d9ca942c07a7a74c9eebcdf2db4d3d07583b",
  "post_selection_clamp": {
    "obstacle": [
      280.0,
      0.0
    ],
    "mode": "feed",
    "boost": true,
    "checked_heading_deg": 29.999999999999996,
    "emitted_heading_deg": 2.9999999999999916,
    "checked_gap": 63.85658264160156,
    "emitted_gap": -14.5,
    "emitted_exact_segment_gap": -30.824318202985864,
    "straight_cruise_safe": true
  },
  "coil_emergency_reversal": {
    "iteration": 8,
    "segments": [
      [
        148.08075876960163,
        11.590294034085417,
        50.14608583723792,
        139.812789503614,
        17.171969253996174
      ],
      [
        -50.37382747112184,
        127.23354454442386,
        -133.0894142913284,
        -31.82931282669154,
        21.12294573252841
      ],
      [
        -66.6151018610548,
        129.31520273985018,
        -136.43700488079637,
        50.44737014716242,
        18.265853420252597
      ],
      [
        129.71289262731338,
        -74.18762452415224,
        103.57793770339961,
        107.70723730275601,
        17.93485121406421
      ]
    ],
    "command_deg": -75.0,
    "coil_dir": 1,
    "selected_hit": 15,
    "best_allowed_hit": 6,
    "boost": false
  },
  "coil_rollout_mismatch": {
    "held_command_endpoint": [
      62.820219159520434,
      171.95693549590192
    ],
    "continued_turn_endpoint": [
      -24.77170938400254,
      57.81458083095973
    ],
    "endpoint_difference": 143.8778060523272,
    "note": "Same speed and turn model; continuous full-rate coil after initial LAT, no disturbance."
  },
  "outside_field_surface_distance": 1000.0
}

```

## 최초 내장 검사 결과 (리뷰 중 외부 코드 변경 전)
명령: `.venv/bin/python pilot.py`
exit_code=0
`ok pilot; crowded tick p50 31.6 ms p95 42.4 ms`
단일 로컬 합성 장면 성능 측정이며 실사이트 p95와 직접 비교하지 않는다.

## P14 배치 기존 분석기 재실행 출력
```text
2 finished games
survival s: median 315 mean 315 min 282 max 349; 600 s reached 0/2
L_max: median 808 mean 808 max 1125
modes: loop 45%, feed 43%, evade 8%, unwrap 3%, escape 1%, emergency 1%; boost 66% of ticks
command jumps > 90 deg: 52.4/min; by mode loop 279, evade 105, feed 105, unwrap 37, escape 13, emergency 12
attacks (threat > 0 for >= 0.2 s): 135, survived 133, died within 1.5 s 2; boost share survived 0.80 vs died 0.70; duration survived 1.05 s vs died 0.85 s
L gain/min: median 160; narrow-gap ticks 1357, through-gap picks 98
last emergency run before death: median 0.44 s (n=2)
obs_to_cmd ms p50 median 27.6, p95 max 52.1

--- deaths.py ---
_20260925_160525  282.3s L 1125 wrapped  killer r25 head 54px boostK 0 remains 1 boostUs 1 stuck 0.57s rev3s 9 mode2s feed
_20260925_161050  348.6s L  491 cut_off  killer r14 head 54px boostK 1 remains 0 boostUs 1 stuck 0.18s rev3s 3 mode2s feed

2 deaths; survival median 315 s
  wrapped   1 (50%)  remains 1  killer boosting 0  median s 282
  cut_off   1 (50%)  remains 0  killer boosting 1  median s 349
  remains: 1/2
  killer_boost: 1/2
  boosting: 2/2
  spawn_fight: 0/2

bunching (straightness 5 s, own-body cover): last 5 s before death vs 15-20 s before (same black box)
  _20260925_160525 wrapped  end (0.6, 0.05)  base (0.53, 0.07)
  _20260925_161050 cut_off  end (0.77, 0.05)  base (0.27, 0.05)
  median straightness end 0.69 vs base 0.40; own cover end 0.05 vs base 0.06

command straightness per 5 s: last 15 s before death median 0.70 (n=4) vs rest of game 0.55 (n=121); share of rest windows < 0.3: 21%

wrap onsets (wrapping snake = killer):
  _20260925_160525 {'before_s': 0.9, 'cover': np.float64(0.42), 'radius': 244, 'gap_deg': 210, 'closed_after': None, 'our_L': 1121, 'heading_off_gap': 163, 'mode': 'unwrap', 'box_s': 33.0, 'head_px': 351, 'head_sp': 6.1, 'head_r': 25, 'head_to_gap_deg': 118, 'pre_mode': 'loop', 'pre_remains': True, 'pre_boost': 0.73}

```

## 배치 p5 — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_114328.jsonl",
    "sha256": "bf32e98e659d7d8f08e69aa758d4f769aa18204cd49371e861f7e8db2c2bf869",
    "summary": {
      "at": "2026-09-25 11:43:28",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "mimi77",
      "reason": "death",
      "seconds": 336.7,
      "L_max": 2311,
      "modes": {
        "feed": 7550,
        "evade": 1367,
        "emergency": 75,
        "escape": 64,
        "unwrap": 549
      },
      "loop_ms": {
        "p50": 34.0,
        "p95": 40.1
      },
      "work_ms_p95": 29.8,
      "stage_ms": {
        "observe": [
          4.8,
          12.4
        ],
        "decide": [
          9.8,
          18.9
        ],
        "obs_to_cmd": [
          19.3,
          38.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_114951.jsonl",
    "sha256": "7c636272ddc1c7be7ee3c75f464c4806aa2cdaea82a1122046f0bd9f2321c13f",
    "summary": {
      "at": "2026-09-25 11:49:51",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "nana70",
      "reason": "death",
      "seconds": 211.4,
      "L_max": 4718,
      "modes": {
        "feed": 3935,
        "evade": 1523,
        "unwrap": 78,
        "emergency": 53,
        "escape": 49
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 54.9
      },
      "work_ms_p95": 39.4,
      "stage_ms": {
        "observe": [
          5.5,
          14.9
        ],
        "decide": [
          13.4,
          28.4
        ],
        "obs_to_cmd": [
          25.4,
          53.6
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_115359.jsonl",
    "sha256": "caf8cce046f4895edc358fd9be07687db2656060ff84012ee3517c1930ccff36",
    "summary": {
      "at": "2026-09-25 11:53:59",
      "controller": "pilot:Pilot",
      "game": 3,
      "status": "finished",
      "nick": "lulu94",
      "reason": "death",
      "seconds": 146.5,
      "L_max": 4648,
      "modes": {
        "feed": 2355,
        "evade": 903,
        "emergency": 112,
        "unwrap": 482,
        "escape": 120
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 50.1
      },
      "work_ms_p95": 38.0,
      "stage_ms": {
        "observe": [
          5.4,
          19.6
        ],
        "decide": [
          14.2,
          22.5
        ],
        "obs_to_cmd": [
          26.5,
          48.7
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_115652.jsonl",
    "sha256": "cb269ce880b912f874ff91ea042f66e68e87afb843c3c00d92545f98ed60440e",
    "summary": {
      "at": "2026-09-25 11:56:52",
      "controller": "pilot:Pilot",
      "game": 4,
      "status": "finished",
      "nick": "popo95",
      "reason": "death",
      "seconds": 320.4,
      "L_max": 1300,
      "modes": {
        "feed": 8001,
        "evade": 635,
        "cruise": 2,
        "emergency": 96,
        "unwrap": 473
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 37.5
      },
      "work_ms_p95": 26.9,
      "stage_ms": {
        "observe": [
          4.5,
          11.4
        ],
        "decide": [
          6.6,
          17.7
        ],
        "obs_to_cmd": [
          16.3,
          36.0
        ]
      }
    }
  }
]
```

## 배치 p6 — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_120436.jsonl",
    "sha256": "1d0319fbdc4d02f5f1706b9af41aea5a7d6e1316e2dcbb0a4e5423eeb86b9d3f",
    "summary": {
      "at": "2026-09-25 12:04:36",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "bibi99",
      "reason": "death",
      "seconds": 89.6,
      "L_max": 373,
      "modes": {
        "feed": 1894,
        "evade": 199,
        "emergency": 70,
        "unwrap": 395
      },
      "loop_ms": {
        "p50": 34.0,
        "p95": 39.7
      },
      "work_ms_p95": 30.0,
      "stage_ms": {
        "observe": [
          4.9,
          11.5
        ],
        "decide": [
          11.9,
          20.5
        ],
        "obs_to_cmd": [
          21.9,
          38.5
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_120624.jsonl",
    "sha256": "0e8813107cd36684588cdcbf11d8e821db29768c7c1c6fbb5f09f6db6b30346a",
    "summary": {
      "at": "2026-09-25 12:06:24",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "bibi66",
      "reason": "death",
      "seconds": 399.7,
      "L_max": 691,
      "modes": {
        "feed": 9883,
        "evade": 903,
        "emergency": 244,
        "unwrap": 533
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 35.5
      },
      "work_ms_p95": 24.2,
      "stage_ms": {
        "observe": [
          4.3,
          10.0
        ],
        "decide": [
          9.4,
          15.3
        ],
        "obs_to_cmd": [
          18.2,
          33.2
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_121359.jsonl",
    "sha256": "cf2b46ab9bb3cc33f9fd7be813e0de984cefc1c69252cae1d26f7b6d9e973f75",
    "summary": {
      "at": "2026-09-25 12:13:59",
      "controller": "pilot:Pilot",
      "game": 3,
      "status": "finished",
      "nick": "nana56",
      "reason": "death",
      "seconds": 166.5,
      "L_max": 5691,
      "modes": {
        "feed": 2998,
        "evade": 1141,
        "emergency": 130,
        "unwrap": 119,
        "escape": 32
      },
      "loop_ms": {
        "p50": 34.3,
        "p95": 53.8
      },
      "work_ms_p95": 39.3,
      "stage_ms": {
        "observe": [
          5.5,
          15.7
        ],
        "decide": [
          15.7,
          27.6
        ],
        "obs_to_cmd": [
          29.8,
          52.5
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_121716.jsonl",
    "sha256": "c582c862538dae05156fd1535fa61fb04f018ae66be18ef0e50b23589dccc4fe",
    "summary": {
      "at": "2026-09-25 12:17:16",
      "controller": "pilot:Pilot",
      "game": 4,
      "status": "finished",
      "nick": "coco50",
      "reason": "death",
      "seconds": 407.4,
      "L_max": 7478,
      "modes": {
        "feed": 7610,
        "evade": 3081,
        "unwrap": 98,
        "emergency": 175,
        "escape": 80
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 51.5
      },
      "work_ms_p95": 37.8,
      "stage_ms": {
        "observe": [
          5.4,
          16.4
        ],
        "decide": [
          13.7,
          25.2
        ],
        "obs_to_cmd": [
          25.8,
          50.1
        ]
      }
    }
  }
]
```

## 배치 p7 — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_122619.jsonl",
    "sha256": "f271d4b2fab96f64e84c681ed0706a0fae8c9c2d148027863c53d131e1d091a7",
    "summary": {
      "at": "2026-09-25 12:26:19",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "momo32",
      "reason": "death",
      "seconds": 331.1,
      "L_max": 5544,
      "modes": {
        "feed": 6844,
        "evade": 1444,
        "emergency": 181,
        "unwrap": 281,
        "escape": 33
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 56.2
      },
      "work_ms_p95": 42.2,
      "stage_ms": {
        "observe": [
          5.6,
          16.1
        ],
        "decide": [
          14.2,
          29.3
        ],
        "obs_to_cmd": [
          27.5,
          54.7
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_123236.jsonl",
    "sha256": "88c3fc7035b422ee91f438e08c5a20f86526e1fc092a708da7d34dc0e1deb82c",
    "summary": {
      "at": "2026-09-25 12:32:36",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "popo58",
      "reason": "death",
      "seconds": 132.8,
      "L_max": 1512,
      "modes": {
        "feed": 2822,
        "evade": 730,
        "unwrap": 16,
        "escape": 7,
        "emergency": 10
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 52.0
      },
      "work_ms_p95": 39.1,
      "stage_ms": {
        "observe": [
          5.3,
          14.4
        ],
        "decide": [
          13.3,
          28.9
        ],
        "obs_to_cmd": [
          24.6,
          50.5
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_123515.jsonl",
    "sha256": "7cf55f3bc8e4645333ecc861984891ef8e59152c140747c0149911e9be9bcac8",
    "summary": {
      "at": "2026-09-25 12:35:15",
      "controller": "pilot:Pilot",
      "game": 3,
      "status": "finished",
      "nick": "kiki35",
      "reason": "death",
      "seconds": 59.2,
      "L_max": 325,
      "modes": {
        "evade": 255,
        "feed": 1339,
        "emergency": 40,
        "unwrap": 15
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 46.8
      },
      "work_ms_p95": 34.9,
      "stage_ms": {
        "observe": [
          5.1,
          11.6
        ],
        "decide": [
          14.0,
          26.2
        ],
        "obs_to_cmd": [
          24.5,
          45.5
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_123629.jsonl",
    "sha256": "21116bad8c95248724118516a1d49801688609ea456e2dc0ef04af0c3ecbc73a",
    "summary": {
      "at": "2026-09-25 12:36:29",
      "controller": "pilot:Pilot",
      "game": 4,
      "status": "finished",
      "nick": "lulu78",
      "reason": "death",
      "seconds": 248.9,
      "L_max": 5932,
      "modes": {
        "feed": 3872,
        "evade": 1791,
        "escape": 46,
        "unwrap": 306,
        "emergency": 207
      },
      "loop_ms": {
        "p50": 35.3,
        "p95": 62.0
      },
      "work_ms_p95": 44.6,
      "stage_ms": {
        "observe": [
          5.9,
          19.4
        ],
        "decide": [
          18.8,
          30.2
        ],
        "obs_to_cmd": [
          33.8,
          60.6
        ]
      }
    }
  }
]
```

## 배치 p8 — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_124235.jsonl",
    "sha256": "bab9c51ab09d4431f0c24338cd63e605d59c4bb0605854e65fd2ff8c56185e31",
    "summary": {
      "at": "2026-09-25 12:42:35",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "kiki99",
      "reason": "death",
      "seconds": 193.1,
      "L_max": 1272,
      "modes": {
        "feed": 3857,
        "evade": 1071,
        "emergency": 102,
        "unwrap": 134,
        "escape": 49
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 53.1
      },
      "work_ms_p95": 39.7,
      "stage_ms": {
        "observe": [
          5.5,
          15.7
        ],
        "decide": [
          12.1,
          28.7
        ],
        "obs_to_cmd": [
          23.3,
          51.5
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_124621.jsonl",
    "sha256": "f430a94fee662adfdf9eb64b4cc00d23ecf78e304f6905e582379457f64d79ba",
    "summary": {
      "at": "2026-09-25 12:46:21",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "toto94",
      "reason": "death",
      "seconds": 239.8,
      "L_max": 779,
      "modes": {
        "feed": 5309,
        "evade": 682,
        "emergency": 125,
        "cruise": 782
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 36.9
      },
      "work_ms_p95": 26.5,
      "stage_ms": {
        "observe": [
          4.8,
          11.6
        ],
        "decide": [
          6.0,
          17.1
        ],
        "obs_to_cmd": [
          16.1,
          35.6
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_125056.jsonl",
    "sha256": "1e665b08659870a0e2859341d00ab2a384bd37c2c509653a7f39f3a69cf54615",
    "summary": {
      "at": "2026-09-25 12:50:56",
      "controller": "pilot:Pilot",
      "game": 3,
      "status": "finished",
      "nick": "dodo88",
      "reason": "death",
      "seconds": 19.1,
      "L_max": 1775,
      "modes": {
        "feed": 257,
        "evade": 128,
        "emergency": 18,
        "unwrap": 64,
        "escape": 5
      },
      "loop_ms": {
        "p50": 36.5,
        "p95": 59.1
      },
      "work_ms_p95": 42.1,
      "stage_ms": {
        "observe": [
          6.1,
          20.7
        ],
        "decide": [
          18.2,
          29.1
        ],
        "obs_to_cmd": [
          35.1,
          57.6
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_125128.jsonl",
    "sha256": "da00b7dd963fb50d73547ef502317faded75e7f9644d08e0ef824746046ce511",
    "summary": {
      "at": "2026-09-25 12:51:28",
      "controller": "pilot:Pilot",
      "game": 4,
      "status": "finished",
      "nick": "toto69",
      "reason": "death",
      "seconds": 92.0,
      "L_max": 1222,
      "modes": {
        "feed": 1571,
        "evade": 644,
        "unwrap": 135,
        "escape": 28,
        "emergency": 45
      },
      "loop_ms": {
        "p50": 34.5,
        "p95": 54.4
      },
      "work_ms_p95": 38.0,
      "stage_ms": {
        "observe": [
          6.0,
          16.7
        ],
        "decide": [
          16.7,
          25.5
        ],
        "obs_to_cmd": [
          32.4,
          52.9
        ]
      }
    }
  }
]
```

## 배치 stats20 — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_131610.jsonl",
    "sha256": "351ec5d12cf6061680c395fbca8cbe6c9fb91334cb094510fc549a7f164f831e",
    "summary": {
      "at": "2026-09-25 13:16:10",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "toto17",
      "reason": "death",
      "seconds": 80.9,
      "L_max": 405,
      "modes": {
        "feed": 904,
        "evade": 316,
        "unwrap": 811,
        "emergency": 185
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 47.4
      },
      "work_ms_p95": 33.1,
      "stage_ms": {
        "observe": [
          5.7,
          14.4
        ],
        "decide": [
          14.6,
          22.6
        ],
        "obs_to_cmd": [
          29.1,
          46.2
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_131750.jsonl",
    "sha256": "99b2e1b59a754dfee0b6391ac15f91fb5f17a0b1bc9c4cb556db9410592b1bb4",
    "summary": {
      "at": "2026-09-25 13:17:50",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "popo32",
      "reason": "death",
      "seconds": 136.0,
      "L_max": 1432,
      "modes": {
        "feed": 2669,
        "evade": 347,
        "emergency": 35,
        "unwrap": 720
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 47.5
      },
      "work_ms_p95": 35.1,
      "stage_ms": {
        "observe": [
          5.7,
          18.5
        ],
        "decide": [
          10.7,
          20.2
        ],
        "obs_to_cmd": [
          23.8,
          46.3
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_132031.jsonl",
    "sha256": "dfc0ea6b2651ee38b08ff3f6117dda1c414323350dc910f1804e92fdc14686b2",
    "summary": {
      "at": "2026-09-25 13:20:31",
      "controller": "pilot:Pilot",
      "game": 3,
      "status": "finished",
      "nick": "mimi15",
      "reason": "death",
      "seconds": 247.7,
      "L_max": 1971,
      "modes": {
        "feed": 5401,
        "evade": 946,
        "emergency": 244,
        "unwrap": 341
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 44.6
      },
      "work_ms_p95": 31.6,
      "stage_ms": {
        "observe": [
          5.3,
          13.7
        ],
        "decide": [
          11.0,
          21.9
        ],
        "obs_to_cmd": [
          22.3,
          43.1
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_132516.jsonl",
    "sha256": "a52e0f46dfbd1f911440fc0732f3270c147f2c9f6469832a8adbce2e44793b6b",
    "summary": {
      "at": "2026-09-25 13:25:16",
      "controller": "pilot:Pilot",
      "game": 4,
      "status": "finished",
      "nick": "kiki75",
      "reason": "death",
      "seconds": 129.7,
      "L_max": 980,
      "modes": {
        "feed": 3282,
        "evade": 411,
        "emergency": 19
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 39.4
      },
      "work_ms_p95": 27.9,
      "stage_ms": {
        "observe": [
          5.2,
          13.4
        ],
        "decide": [
          9.5,
          16.9
        ],
        "obs_to_cmd": [
          20.2,
          38.0
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_132753.jsonl",
    "sha256": "1d0f1abcef54af12831aec5fcf32e2bed2505e1a4aa2dc586a6cfd780d9beea6",
    "summary": {
      "at": "2026-09-25 13:27:53",
      "controller": "pilot:Pilot",
      "game": 5,
      "status": "finished",
      "nick": "lulu48",
      "reason": "death",
      "seconds": 840.7,
      "L_max": 1627,
      "modes": {
        "feed": 14631,
        "evade": 1158,
        "unwrap": 151,
        "cruise": 1907,
        "emergency": 6535
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 35.4
      },
      "work_ms_p95": 22.4,
      "stage_ms": {
        "observe": [
          4.6,
          10.2
        ],
        "decide": [
          5.0,
          13.7
        ],
        "obs_to_cmd": [
          14.4,
          31.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_134335.jsonl",
    "sha256": "b5ead46c078b506c6bd3c5ff2953eb2216e70c1ea24f7057dcb7bb027f5f15fb",
    "summary": {
      "at": "2026-09-25 13:43:35",
      "controller": "pilot:Pilot",
      "game": 6,
      "status": "finished",
      "nick": "coco47",
      "reason": "death",
      "seconds": 486.8,
      "L_max": 938,
      "modes": {
        "feed": 11299,
        "evade": 741,
        "unwrap": 37,
        "emergency": 2083,
        "escape": 2
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 35.3
      },
      "work_ms_p95": 20.2,
      "stage_ms": {
        "observe": [
          4.5,
          10.7
        ],
        "decide": [
          5.2,
          11.0
        ],
        "obs_to_cmd": [
          14.3,
          29.1
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_135248.jsonl",
    "sha256": "aec8e6906e7235d7e87237a361418295ebb025298e0f5e04f0429511207bd37a",
    "summary": {
      "at": "2026-09-25 13:52:48",
      "controller": "pilot:Pilot",
      "game": 7,
      "status": "finished",
      "nick": "dodo76",
      "reason": "death",
      "seconds": 109.6,
      "L_max": 3177,
      "modes": {
        "feed": 1993,
        "evade": 809,
        "unwrap": 94,
        "emergency": 39,
        "escape": 39
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 50.5
      },
      "work_ms_p95": 35.9,
      "stage_ms": {
        "observe": [
          5.6,
          16.3
        ],
        "decide": [
          14.1,
          23.3
        ],
        "obs_to_cmd": [
          27.0,
          48.9
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_135501.jsonl",
    "sha256": "8667c60ade42bf13f9eb6d36bcc94c317b4f8c69b6f46ecb0b0c0e6ccc8113fc",
    "summary": {
      "at": "2026-09-25 13:55:01",
      "controller": "pilot:Pilot",
      "game": 8,
      "status": "finished",
      "nick": "coco17",
      "reason": "death",
      "seconds": 210.7,
      "L_max": 1649,
      "modes": {
        "feed": 4729,
        "evade": 809,
        "escape": 114,
        "unwrap": 197,
        "emergency": 161
      },
      "loop_ms": {
        "p50": 34.0,
        "p95": 39.1
      },
      "work_ms_p95": 27.7,
      "stage_ms": {
        "observe": [
          5.0,
          11.8
        ],
        "decide": [
          8.4,
          17.4
        ],
        "obs_to_cmd": [
          18.3,
          37.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_135904.jsonl",
    "sha256": "961f01cfe24de2c7d6ca6b89e5e093a0c1042a84de7ef3ddc7e13b8f8eb7a841",
    "summary": {
      "at": "2026-09-25 13:59:04",
      "controller": "pilot:Pilot",
      "game": 9,
      "status": "finished",
      "nick": "nana30",
      "reason": "death",
      "seconds": 200.2,
      "L_max": 1625,
      "modes": {
        "feed": 4824,
        "evade": 785,
        "emergency": 16,
        "unwrap": 77
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 39.9
      },
      "work_ms_p95": 28.9,
      "stage_ms": {
        "observe": [
          5.0,
          13.3
        ],
        "decide": [
          9.1,
          18.5
        ],
        "obs_to_cmd": [
          19.2,
          38.4
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_140257.jsonl",
    "sha256": "f7e7359744f838398c72473f5b7f0ccf19ec61d1608c413122e6f533c7e26eab",
    "summary": {
      "at": "2026-09-25 14:02:57",
      "controller": "pilot:Pilot",
      "game": 10,
      "status": "finished",
      "nick": "popo20",
      "reason": "death",
      "seconds": 38.6,
      "L_max": 1725,
      "modes": {
        "feed": 414,
        "evade": 426,
        "emergency": 37,
        "escape": 29,
        "unwrap": 46
      },
      "loop_ms": {
        "p50": 36.5,
        "p95": 59.5
      },
      "work_ms_p95": 43.5,
      "stage_ms": {
        "observe": [
          5.6,
          17.0
        ],
        "decide": [
          20.6,
          31.3
        ],
        "obs_to_cmd": [
          35.1,
          57.9
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_140347.jsonl",
    "sha256": "3573f0670d9c1255faf2d8d03979b4053b2eb7e9edda45d6cc2f629ac9eb7967",
    "summary": {
      "at": "2026-09-25 14:03:47",
      "controller": "pilot:Pilot",
      "game": 11,
      "status": "finished",
      "nick": "momo39",
      "reason": "death",
      "seconds": 245.4,
      "L_max": 5153,
      "modes": {
        "feed": 5286,
        "evade": 1055,
        "unwrap": 219,
        "emergency": 67,
        "escape": 3
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 51.5
      },
      "work_ms_p95": 38.1,
      "stage_ms": {
        "observe": [
          5.5,
          20.5
        ],
        "decide": [
          10.9,
          24.3
        ],
        "obs_to_cmd": [
          23.0,
          50.1
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_140830.jsonl",
    "sha256": "6d82956e721fd18eba7400ce102258e487f743c672b9b288a3d7c4a088cd6533",
    "summary": {
      "at": "2026-09-25 14:08:30",
      "controller": "pilot:Pilot",
      "game": 12,
      "status": "finished",
      "nick": "dodo41",
      "reason": "death",
      "seconds": 293.7,
      "L_max": 7629,
      "modes": {
        "feed": 5292,
        "evade": 1850,
        "unwrap": 237,
        "emergency": 146,
        "escape": 79
      },
      "loop_ms": {
        "p50": 34.4,
        "p95": 57.1
      },
      "work_ms_p95": 40.7,
      "stage_ms": {
        "observe": [
          6.1,
          20.4
        ],
        "decide": [
          14.7,
          25.6
        ],
        "obs_to_cmd": [
          30.4,
          55.6
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_141407.jsonl",
    "sha256": "977a47b1b747d02dc4107b27dd2bfcfe73b4471627f61583a07b71f2dc8e7a9d",
    "summary": {
      "at": "2026-09-25 14:14:07",
      "controller": "pilot:Pilot",
      "game": 13,
      "status": "finished",
      "nick": "dodo35",
      "reason": "death",
      "seconds": 241.4,
      "L_max": 322,
      "modes": {
        "feed": 5876,
        "evade": 361,
        "unwrap": 385,
        "emergency": 279
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 36.6
      },
      "work_ms_p95": 24.5,
      "stage_ms": {
        "observe": [
          4.8,
          14.0
        ],
        "decide": [
          5.8,
          13.0
        ],
        "obs_to_cmd": [
          15.7,
          35.1
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_141845.jsonl",
    "sha256": "d897fbe09f28a7bfe567848039665455b42711237a47a8e8fe39c053d9c60cd0",
    "summary": {
      "at": "2026-09-25 14:18:45",
      "controller": "pilot:Pilot",
      "game": 14,
      "status": "finished",
      "nick": "popo40",
      "reason": "death",
      "seconds": 166.9,
      "L_max": 5238,
      "modes": {
        "feed": 3182,
        "evade": 971,
        "unwrap": 379,
        "emergency": 188
      },
      "loop_ms": {
        "p50": 34.0,
        "p95": 43.4
      },
      "work_ms_p95": 29.6,
      "stage_ms": {
        "observe": [
          5.3,
          14.1
        ],
        "decide": [
          11.5,
          19.3
        ],
        "obs_to_cmd": [
          22.6,
          42.0
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_142201.jsonl",
    "sha256": "f1aad4fc3fe812539f72f33a1df3b992378ca833b43f06410ecef4e4874a2214",
    "summary": {
      "at": "2026-09-25 14:22:01",
      "controller": "pilot:Pilot",
      "game": 15,
      "status": "finished",
      "nick": "popo63",
      "reason": "death",
      "seconds": 163.9,
      "L_max": 1663,
      "modes": {
        "feed": 3401,
        "evade": 1061,
        "escape": 21,
        "unwrap": 27,
        "emergency": 92
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 44.7
      },
      "work_ms_p95": 32.3,
      "stage_ms": {
        "observe": [
          5.4,
          13.7
        ],
        "decide": [
          11.2,
          20.9
        ],
        "obs_to_cmd": [
          22.0,
          43.1
        ]
      }
    }
  }
]
```

## 배치 p9 — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_145652.jsonl",
    "sha256": "7145337c90b34919721365f085ee3e8a4797ef9d7585bbc5ca2ca0d56394182f",
    "summary": {
      "at": "2026-09-25 14:56:52",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "lulu41",
      "reason": "death",
      "seconds": 656.6,
      "L_max": 4655,
      "modes": {
        "feed": 12533,
        "evade": 1560,
        "loop": 2820,
        "emergency": 480,
        "unwrap": 541,
        "escape": 83,
        "ring": 139,
        "cruise": 670
      },
      "loop_ms": {
        "p50": 34.0,
        "p95": 38.3
      },
      "work_ms_p95": 28.1,
      "stage_ms": {
        "observe": [
          5.1,
          11.8
        ],
        "decide": [
          8.4,
          18.7
        ],
        "obs_to_cmd": [
          18.3,
          36.9
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_150911.jsonl",
    "sha256": "63b2cdc0b795f71b9da48fe6727d30306321674d24826a1f53280eb0d31950af",
    "summary": {
      "at": "2026-09-25 15:09:11",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "error",
      "error": "TargetClosedError('Page.wait_for_function: Target page, context or browser has been closed')"
    }
  }
]
```

## 배치 p10_aggr — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_151739.jsonl",
    "sha256": "3d5bad64ea262e4a2f1bf929dc50cf3eb2425f60ec2081314a9467e729aef324",
    "summary": {
      "at": "2026-09-25 15:17:39",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "lulu45",
      "reason": "death",
      "seconds": 369.8,
      "L_max": 2380,
      "modes": {
        "feed": 2091,
        "evade": 697,
        "loop": 6472,
        "emergency": 53,
        "unwrap": 379,
        "ring": 214
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 57.2
      },
      "work_ms_p95": 42.4,
      "stage_ms": {
        "observe": [
          5.5,
          15.0
        ],
        "decide": [
          13.3,
          27.9
        ],
        "obs_to_cmd": [
          25.1,
          55.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_152441.jsonl",
    "sha256": "e6f72a692601573489333004a6a66cab0209aebfe64c756d0bce6ec569cf3639",
    "summary": {
      "at": "2026-09-25 15:24:41",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "error",
      "error": "TargetClosedError('Page.wait_for_function: Target page, context or browser has been closed')"
    }
  }
]
```

## 배치 p11_aggr — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_153041.jsonl",
    "sha256": "21de4f20e2a03b01f3bc34ab7ba90aad35fe49004a93bc510911279716f368df",
    "summary": {
      "at": "2026-09-25 15:30:41",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "nana63",
      "reason": "death",
      "seconds": 80.8,
      "L_max": 484,
      "modes": {
        "feed": 1143,
        "evade": 247,
        "unwrap": 1,
        "loop": 630,
        "emergency": 45
      },
      "loop_ms": {
        "p50": 34.3,
        "p95": 60.8
      },
      "work_ms_p95": 46.7,
      "stage_ms": {
        "observe": [
          5.6,
          16.1
        ],
        "decide": [
          16.5,
          34.9
        ],
        "obs_to_cmd": [
          29.3,
          59.4
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_153223.jsonl",
    "sha256": "3fa777a7d8399aa313d6d6c5fade50a78c43c5ba29309f782947269b37807d3b",
    "summary": {
      "at": "2026-09-25 15:32:23",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "coco85",
      "reason": "death",
      "seconds": 128.0,
      "L_max": 222,
      "modes": {
        "feed": 1745,
        "evade": 342,
        "emergency": 65,
        "loop": 1232,
        "unwrap": 97,
        "coil": 88
      },
      "loop_ms": {
        "p50": 34.0,
        "p95": 43.1
      },
      "work_ms_p95": 31.9,
      "stage_ms": {
        "observe": [
          4.9,
          11.3
        ],
        "decide": [
          11.2,
          22.1
        ],
        "obs_to_cmd": [
          21.0,
          41.7
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_153454.jsonl",
    "sha256": "fbdd6fdb7d16a25a45971a430ae91f3d3707fa056b41ef7fc7ae8b0d6c2fa8d0",
    "summary": {
      "at": "2026-09-25 15:34:54",
      "controller": "pilot:Pilot",
      "game": 3,
      "status": "error",
      "error": "CancelledError()"
    }
  }
]
```

## 배치 p12_aggr — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_154332.jsonl",
    "sha256": "1b60e0cabd7ffc68a20d4993d1c18d0f653bac84a6ad2c0cb803fdd16f6045d1",
    "summary": {
      "at": "2026-09-25 15:43:32",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "mimi89",
      "reason": "death",
      "seconds": 79.6,
      "L_max": 656,
      "modes": {
        "feed": 1011,
        "evade": 360,
        "emergency": 38,
        "loop": 525,
        "unwrap": 12
      },
      "loop_ms": {
        "p50": 34.8,
        "p95": 67.1
      },
      "work_ms_p95": 53.9,
      "stage_ms": {
        "observe": [
          6.0,
          18.1
        ],
        "decide": [
          18.0,
          41.6
        ],
        "obs_to_cmd": [
          32.6,
          65.7
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_154512.jsonl",
    "sha256": "b70a3d63ed1096ae5a04da3e1d710cc4e07d3633d7778d1c1396bdc102949f53",
    "summary": {
      "at": "2026-09-25 15:45:12",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "momo88",
      "reason": "death",
      "seconds": 28.8,
      "L_max": 110,
      "modes": {
        "feed": 284,
        "evade": 204,
        "loop": 256,
        "unwrap": 17,
        "emergency": 39
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 45.9
      },
      "work_ms_p95": 33.3,
      "stage_ms": {
        "observe": [
          5.7,
          14.5
        ],
        "decide": [
          13.2,
          23.3
        ],
        "obs_to_cmd": [
          25.9,
          44.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_154554.jsonl",
    "sha256": "caa1986e1691d36b1b1ca5f797e34af33e5ec0925065c6bda4450f083032c256",
    "summary": {
      "at": "2026-09-25 15:45:54",
      "controller": "pilot:Pilot",
      "game": 3,
      "status": "finished",
      "nick": "mimi13",
      "reason": "death",
      "seconds": 54.0,
      "L_max": 567,
      "modes": {
        "feed": 527,
        "evade": 190,
        "emergency": 68,
        "unwrap": 215,
        "loop": 345,
        "escape": 33
      },
      "loop_ms": {
        "p50": 34.7,
        "p95": 57.2
      },
      "work_ms_p95": 42.9,
      "stage_ms": {
        "observe": [
          6.1,
          18.5
        ],
        "decide": [
          18.6,
          28.7
        ],
        "obs_to_cmd": [
          33.1,
          55.7
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_154704.jsonl",
    "sha256": "becb0d7fb8a5d6dfaee6613ea1038c02f85c54ad02a9d883ec6919c72e365841",
    "summary": {
      "at": "2026-09-25 15:47:04",
      "controller": "pilot:Pilot",
      "game": 4,
      "status": "finished",
      "nick": "momo33",
      "reason": "death",
      "seconds": 24.1,
      "L_max": 46,
      "modes": {
        "feed": 175,
        "evade": 177,
        "emergency": 46,
        "unwrap": 58,
        "loop": 214
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 47.2
      },
      "work_ms_p95": 32.9,
      "stage_ms": {
        "observe": [
          5.3,
          13.4
        ],
        "decide": [
          14.0,
          23.7
        ],
        "obs_to_cmd": [
          25.7,
          45.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_154741.jsonl",
    "sha256": "1681ce686a4d410383016214f2f58631ef4307ee06561af15596434fe8b06025",
    "summary": {
      "at": "2026-09-25 15:47:41",
      "controller": "pilot:Pilot",
      "game": 5,
      "status": "finished",
      "nick": "nana16",
      "reason": "death",
      "seconds": 65.9,
      "L_max": 213,
      "modes": {
        "feed": 689,
        "evade": 103,
        "unwrap": 163,
        "loop": 764,
        "emergency": 57
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 53.2
      },
      "work_ms_p95": 36.8,
      "stage_ms": {
        "observe": [
          6.0,
          17.5
        ],
        "decide": [
          13.9,
          24.5
        ],
        "obs_to_cmd": [
          27.4,
          51.7
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_154907.jsonl",
    "sha256": "cccf28dfce9b19dd335a032dba488b2de810ef1b4987c7a8f71528970ac55a0c",
    "summary": {
      "at": "2026-09-25 15:49:07",
      "controller": "pilot:Pilot",
      "game": 6,
      "status": "finished",
      "nick": "lulu88",
      "reason": "death",
      "seconds": 24.1,
      "L_max": 38,
      "modes": {
        "feed": 293,
        "evade": 201,
        "loop": 154,
        "emergency": 19
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 45.2
      },
      "work_ms_p95": 33.1,
      "stage_ms": {
        "observe": [
          5.3,
          13.5
        ],
        "decide": [
          12.2,
          22.7
        ],
        "obs_to_cmd": [
          23.7,
          43.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_154944.jsonl",
    "sha256": "4121dd5b25ae37c1b9ace49a0561410de9a8203832758e382b1be47e5dc2caf2",
    "summary": {
      "at": "2026-09-25 15:49:44",
      "controller": "pilot:Pilot",
      "game": 7,
      "status": "finished",
      "nick": "dodo60",
      "reason": "death",
      "seconds": 118.8,
      "L_max": 2271,
      "modes": {
        "feed": 959,
        "evade": 903,
        "emergency": 202,
        "unwrap": 69,
        "escape": 12,
        "loop": 750
      },
      "loop_ms": {
        "p50": 35.6,
        "p95": 65.3
      },
      "work_ms_p95": 49.8,
      "stage_ms": {
        "observe": [
          6.0,
          17.5
        ],
        "decide": [
          19.7,
          36.1
        ],
        "obs_to_cmd": [
          34.1,
          63.9
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_155206.jsonl",
    "sha256": "b4935449932795fb579e428137d52756d291b5bd388bc21d4062268abae47c91",
    "summary": {
      "at": "2026-09-25 15:52:06",
      "controller": "pilot:Pilot",
      "game": 8,
      "status": "error",
      "error": "TargetClosedError('Page.wait_for_function: Target page, context or browser has been closed')"
    }
  }
]
```

## 배치 p13_aggr — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_155323.jsonl",
    "sha256": "e6bb2e2f94301d70e2c445c327cdcbfa2fe9e87edb7ad034f555d1edd50be00b",
    "summary": {
      "at": "2026-09-25 15:53:23",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "toto14",
      "reason": "death",
      "seconds": 67.0,
      "L_max": 109,
      "modes": {
        "feed": 470,
        "evade": 255,
        "loop": 1034,
        "unwrap": 75,
        "emergency": 29
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 45.7
      },
      "work_ms_p95": 33.6,
      "stage_ms": {
        "observe": [
          5.3,
          10.7
        ],
        "decide": [
          17.2,
          25.8
        ],
        "obs_to_cmd": [
          27.6,
          44.1
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_155446.jsonl",
    "sha256": "a87098d9318696a7609980b3d3abef6de0b8115ff78efa2cd64bd4201e8c36ac",
    "summary": {
      "at": "2026-09-25 15:54:46",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "momo97",
      "reason": "death",
      "seconds": 75.8,
      "L_max": 894,
      "modes": {
        "feed": 1264,
        "evade": 394,
        "unwrap": 24,
        "loop": 224,
        "emergency": 104
      },
      "loop_ms": {
        "p50": 34.3,
        "p95": 54.3
      },
      "work_ms_p95": 41.7,
      "stage_ms": {
        "observe": [
          5.5,
          12.8
        ],
        "decide": [
          17.6,
          30.8
        ],
        "obs_to_cmd": [
          30.3,
          52.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_155622.jsonl",
    "sha256": "d3d5479d749cad33cb97ab80ee73d999aebdc9020eee62ba4ac47154ab995624",
    "summary": {
      "at": "2026-09-25 15:56:22",
      "controller": "pilot:Pilot",
      "game": 3,
      "status": "finished",
      "nick": "kiki39",
      "reason": "death",
      "seconds": 95.7,
      "L_max": 700,
      "modes": {
        "feed": 1427,
        "loop": 746,
        "evade": 153,
        "emergency": 18,
        "unwrap": 85,
        "escape": 4
      },
      "loop_ms": {
        "p50": 34.3,
        "p95": 62.0
      },
      "work_ms_p95": 46.4,
      "stage_ms": {
        "observe": [
          5.6,
          15.4
        ],
        "decide": [
          15.0,
          34.4
        ],
        "obs_to_cmd": [
          27.2,
          60.7
        ]
      }
    }
  }
]
```

## 배치 p14_aggr — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_160525.jsonl",
    "sha256": "4f1fbcabd4ec1fd5766cb48f13ed8663dfaf3f499fb6338353d3e9019c1fa6f9",
    "summary": {
      "at": "2026-09-25 16:05:25",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "finished",
      "nick": "mimi40",
      "reason": "death",
      "seconds": 282.3,
      "L_max": 1125,
      "modes": {
        "feed": 3274,
        "evade": 523,
        "loop": 3657,
        "emergency": 43,
        "unwrap": 265,
        "escape": 43
      },
      "loop_ms": {
        "p50": 34.1,
        "p95": 47.2
      },
      "work_ms_p95": 36.2,
      "stage_ms": {
        "observe": [
          5.2,
          10.8
        ],
        "decide": [
          15.9,
          27.4
        ],
        "obs_to_cmd": [
          26.4,
          45.8
        ]
      }
    }
  },
  {
    "file": "runs/live_20260925_161050.jsonl",
    "sha256": "2664186628fbcbab7522ff57a9690404962481eb03ee98c596cd3d244bebd80e",
    "summary": {
      "at": "2026-09-25 16:10:50",
      "controller": "pilot:Pilot",
      "game": 2,
      "status": "finished",
      "nick": "momo21",
      "reason": "death",
      "seconds": 348.6,
      "L_max": 491,
      "modes": {
        "feed": 4133,
        "evade": 781,
        "loop": 3971,
        "unwrap": 283,
        "emergency": 56,
        "escape": 85
      },
      "loop_ms": {
        "p50": 34.2,
        "p95": 53.5
      },
      "work_ms_p95": 41.6,
      "stage_ms": {
        "observe": [
          5.5,
          12.7
        ],
        "decide": [
          16.9,
          31.2
        ],
        "obs_to_cmd": [
          28.8,
          52.1
        ]
      }
    }
  }
]
```

## 배치 p15_aggr — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_163248.jsonl",
    "sha256": "fa86d29021cf5948ef7f0f793bf4a8b8300aa4ef3f11525032fd8f0e32e70ff2",
    "summary": {
      "at": "2026-09-25 16:32:48",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "started"
    }
  }
]
```

## 배치 p15_aggr_fail1 — 원본 요약 레코드
```json
[
  {
    "file": "runs/live_20260925_162025.jsonl",
    "sha256": "8b050c4231e2dc4b4c472643f8208e623a3768e3a3e3e616ea3ab8e340294df9",
    "summary": {
      "at": "2026-09-25 16:20:25",
      "controller": "pilot:Pilot",
      "game": 1,
      "status": "error",
      "error": "TargetClosedError('Page.evaluate: Target page, context or browser has been closed')"
    }
  }
]
```

## 블랙박스 확인

{"path": "runs/live_20260925_101910", "frames": 240, "span_seconds": 8.347982130013406, "measure_present": false}

{"last_tracking": [34.92797733002226, 262, 15.047169811320755, 51.433963775634766, -6.879609683647635], "min_observed_gap_last8s": -10.733564430285034}

{"path": "runs/live_20260925_160525", "frames": 900, "span_seconds": 33.00279389999923, "measure_present": false}

{"path": "runs/live_20260925_161050", "frames": 900, "span_seconds": 34.79322239998146, "measure_present": false}

{"path": "runs/live_20260925_162613", "frames": 596, "span_seconds": 22.288889970019227, "measure_present": false}

## pilot.py:29–43
```python
29: R = 14.5
30: PX_PER_SP = 31.
31: BOOST_SP, RAMP = 14., .57            # sp while boosting; s from cruise to full boost
32: DT, N = .08, 15                      # path step (s) and steps: 1.2 s
33: LAT = .1                             # s before a new command takes effect
34: HARD = 0.                            # px drawn gap: contact assumed at or below (deaths seen from -1.5 px down)
35: SAFE, TIGHT = 18., 5.                # px drawn gap kept normally / while contesting food
36: SAFE_HEADS = 30.                     # px drawn gap kept while a head is within 300 px (boosting heads lay body fast)
37: CREDIT = 25.                         # px per s of path time added to the gap
38: REACH = 700.                         # px: bodies beyond this cannot matter within 1.2 s
39: HEAD_R = 900.                        # px: heads considered
40: REMAINS = 12.                        # food size of dead-snake remains (14-16, normal food 3-9)
41: FOOD_R = 3000.                       # px: food considered for the goal (user: see far remains too; was 900)
42: EAT = 30.                            # px beyond our radius where food is sucked in (assumed)
43: CELL, HALF = 2., 560.                # px: body clearance grid around us (a 1.2 s boost path reaches ~520 px)
```

## pilot.py:69–73
```python
69: LONG_T, LONG_HALF, LONG_CELL = 3.8, 1300., 6.
70: LONG_FAN = np.radians(np.arange(-90, 91, 30))
71: LONG_SAFE = 10.                      # px drawn gap the best onward ray must keep
72: CALM_RATE = np.radians(90)           # rad/s turning allowed while nothing forces a sharp turn
73: COIL_ON, COIL_OFF = .9, .5           # one snake closing the ring (open gap: escape instead) / stop below this for 1 s
```

## pilot.py:132–157
```python
132: def field_gap(field, pts):
133:     d, o, cell = field
134:     ij = np.floor((pts-o)/cell).astype(int)
135:     inside = (ij >= 0).all(1) & (ij < d.shape[0]).all(1)
136:     out = np.full(len(pts), 1e3)
137:     out[inside] = d[ij[inside, 1], ij[inside, 0]]
138:     return out
139: 
140: 
141: def paths(p, ang, sp, sc, prev, headings, boost, prev_boost=False):
142:     """Positions (C,N,2) and times (N,) of our head for each (heading, boost). Until LAT the previous
143:     command (heading and boost) is still in force; heading and speed are taken at each step's midpoint."""
144:     t = np.arange(1, N+1)*DT
145:     tm = t-DT/2
146:     w = turn_rate(sc)
147:     hL = ang+np.clip(wrap(prev-ang), -w*LAT, w*LAT)
148:     after = np.maximum(tm-LAT, 0)
149:     d = wrap(headings-hL)[:, None]
150:     h = np.where(tm < LAT, ang+np.clip(wrap(prev-ang), -w*tm, w*tm), hL+np.sign(d)*np.minimum(abs(d), w*after))
151:     rate = (BOOST_SP-cruise_sp(sc))/RAMP
152:     ramp = lambda v0, up, dt: np.minimum(BOOST_SP, v0+rate*dt) if up else np.maximum(cruise_sp(sc), v0-rate*dt)
153:     spL = ramp(sp, prev_boost, LAT)
154:     v = np.where(tm < LAT, ramp(sp, prev_boost, np.minimum(tm, LAT)),
155:                  np.where(boost[:, None], np.minimum(BOOST_SP, spL+rate*after), np.maximum(cruise_sp(sc), spL-rate*after)))*PX_PER_SP
156:     step = (v*DT)[..., None]*np.stack((np.cos(h), np.sin(h)), -1)
157:     return p+np.cumsum(step, axis=1), t
```

## pilot.py:274–311
```python
274:         # Bodies and the wall: worst drawn gap along each path.
275:         gap = field_gap(field, P)-ro
276:         w = s['wall']
277:         gap = np.minimum(gap, w[2]-np.hypot(P[:, 0]-w[0], P[:, 1]-w[1])-ro)
278:         # Heads lay new body where they go: our point at time t meets forecast points laid before t.
279:         threat, attacker = 0., None
280:         straight = len(ANGLES)//2*N            # index of our straight cruise path (ANGLES[len//2] == 0)
281:         for h, om in zip(heads, omegas):
282:             hp, ht = head_paths(h, om)
283:             d2 = ((P[:, None, :]-hp[None])**2).sum(-1)
284:             d2 = np.where(ht[None] <= np.tile(t, 2*C)[:, None]+.15, d2, 1e8)
285:             hg = np.sqrt(d2.min(1))-ro-R*h[4]
286:             gap = np.minimum(gap, hg)
287:             # 3.a attack: coming our way, aimed at where we will be in ~0.6 s, or boosting alongside to cut us off.
288:             rel = p-h[:2]; dist = np.hypot(*rel)
289:             ahead = p+.6*sp*PX_PER_SP*np.array([np.cos(ang), np.sin(ang)])-h[:2]
290:             aim_off = abs(wrap(h[2]-np.arctan2(ahead[1], ahead[0])))
291:             closing = np.cos(h[2]-np.arctan2(rel[1], rel[0]))
292:             side = rel@np.array([-np.sin(ang), np.cos(ang)])
293:             fwd = -rel@np.array([np.cos(ang), np.sin(ang)])
294:             cutting = 0 < fwd < 350 and abs(side) < 250 and abs(wrap(h[2]-ang)) < np.radians(35) and h[3] > sp+1
295:             crossing = hg[straight:straight+N].min() < 40          # its forecast (arc included) runs over our way
296:             close = dist < 250 and h[3] >= sp-.5
297:             if dist < 600 and ((closing > .5 and aim_off < np.radians(25)) or cutting or crossing or close):
298:                 level = (600-dist)/600
299:                 if level > threat: threat, attacker = level, h
300:         gap = gap.reshape(2*C, N)
301:         clear = (gap+credit.reshape(2*C, N)).min(1)
302:         hard = gap.min(1)
303:         # 3 s look-ahead: from each candidate's 1.2 s end, is there any way on for LONG_T more seconds?
304:         end_h = np.arctan2(*(pos[:, -1]-pos[:, -2]).T[::-1])
305:         tl = np.arange(1, 25)*(LONG_T/24)      # ~30 px steps: a body cannot slip between samples
306:         rays = pos[:, -1][:, None, None, :]+(tl[None, None, :, None]*cruise_sp(sc)*PX_PER_SP)*np.stack(
307:             (np.cos(end_h[:, None]+LONG_FAN[None]), np.sin(end_h[:, None]+LONG_FAN[None])), -1)[:, :, None, :]
308:         rg = field_gap(far_field, rays.reshape(-1, 2)).reshape(rays.shape[:3])-ro
309:         w = s['wall']
310:         rg = np.minimum(rg, w[2]-np.hypot(rays[..., 0]-w[0], rays[..., 1]-w[1])-ro)
311:         onward = rg.min(2).max(1)                 # best fan ray's worst gap: > 0 means a way on exists
```

## pilot.py:425–437
```python
425:         thread_i, thread_w, thread_bonus = np.zeros(2*C, bool), None, np.zeros(2*C)
426:         for g in gaps:
427:             dm = np.hypot(*(pos-g['m']).transpose(2, 0, 1)).min(1)          # closest approach to the gap centre
428:             through = dm < g['w']/2                                          # the path goes through the gap
429:             if not through.any(): continue
430:             half = g['w']/2-ro                                               # drawn clearance on the centre line
431:             thr = np.where(through, np.minimum(thr, max(HARD+1., half-THREAD_TOL)), thr)
432:             thread_bonus += np.where(through, W_THREAD-W_CENTRE*np.minimum(1., dm/max(g['w']/2, 1.)), 0.)
433:             thread_i |= through
434:             thread_w = g if thread_w is None or g['w'] < thread_w['w'] else thread_w
435:         safe = (clear >= thr) & (hard >= np.minimum(thr, HARD_PHYS))
436:         if (safe & (onward >= LONG_SAFE)).any():      # dead ends (no way on within 3 s) are not safe while others exist
437:             safe &= onward >= LONG_SAFE
```

## pilot.py:535–594
```python
535:         score -= np.where(bst, min(0., BOOST_COST) if danger else BOOST_COST+(1e3 if s['L'] < 80 and attacker is None else 0.), 0.)
536:         w_t = turn_rate(sc)
537:         turn = wrap(hd-(ang+np.clip(wrap(prev-ang), -w_t*LAT, w_t*LAT)))
538:         flip = (np.sign(turn) == -self.turn_sign) & (abs(turn) > np.pi/2)
539:         score -= 50.*flip
540:         kc = k90 if self.coil_dir > 0 else km90
541:         if ring:
542:             # While coiling never turn the other way, not even in a fallback (user: died switching direction).
543:             wrong = (np.sign(turn) == -self.coil_dir) & (abs(turn) > np.radians(10))
544:             safe = safe & ~wrong
545:             score = np.where(wrong, -1e6, score)
546:             flip = flip | wrong
547:         if ring and hard[kc] > HARD:
548:             # Coiling: full-rate turn every tick (no boost) -> the same circle lap after lap; leave it only if
549:             # that very circle is predicted to touch something.
550:             mode, i = 'coil', kc
551:         elif safe.any():
552:             mode = 'unwrap' if wrap_esc is not None else 'loop' if looping else 'evade' if attacker is not None else 'escape' if enclosed > .6 else 'feed' if eat.max() > 0 or goal_val > 0 else 'cruise'
553:             i = int(np.argmax(np.where(safe, score, -np.inf)))
554:             # Hold the previous plan (same boost, heading nearest the previous command) while it stays safe
555:             # and nearly as good: the path we evaluate is only the path we drive if we keep commanding it.
556:             held = 2*C-1 if self.prev_boost else C-1
557:             if safe[held] and score[held] >= score[i]-SWITCH: i = held
558:         else:
559:             # No margin anywhere: first avoid contact at all, else put it off as long as possible.
560:             mode = 'emergency'
561:             # Among the candidates that touch last, stay close to the previous command (P2 thrashed here).
562:             hit = np.where((gap <= HARD).any(1), (gap <= HARD).argmax(1), N)
563:             e = (np.minimum(clear, 50.)+.2*np.minimum(onward, 100.)-30.*flip-.3*np.degrees(abs(wrap(hd-prev)))
564:                  -1e6*(ring & flip))                         # boost free in an emergency; prefer ways on beyond 1.2 s
565:             if attacker is not None:       # P13: 3/3 deaths cut off by a head 60-90 px away while we cruised - run fast
566:                 e = e+W_RUN*threat*(np.cos(wrap(hd-away)) > .5)*(1.+bst)
567:             i = int(np.argmax(np.where(hit == hit.max(), e, -np.inf)))
568:         cmd = float(wrap(hd[i]))
569:         # Calm modes: turn at most CALM_RATE -> large arcs, no spinning in place (user); only if going straighter is
570:         # also safe (the straight cruise candidate), else the sharp turn stands.
571:         k0 = int(np.argmin(abs(ANGLES)))
572:         if mode in ('feed', 'cruise', 'escape', 'loop') and safe[k0] and big_risk < .5 and threat == 0 and not heap_chase:
573:             lim = CALM_RATE*self.period
574:             cmd = float(wrap(ang+np.clip(wrap(cmd-ang), -lim, lim)))
575:         self.prev, self.prev_boost = cmd, bool(bst[i])
576: 
577:         # 1.c trace: nearest two different snakes and whether they are on opposite sides of us.
578:         thread = None
579:         if len(segs):
580:             order = np.argsort(near_all)
581:             first = order[0]; other = order[sid[order] != sid[first]]
582:             if len(other):
583:                 j = other[0]
584:                 u = np.array([np.cos(ang), np.sin(ang)])
585:                 side = lambda k: np.sign(u[0]*((segs[k, 1]+segs[k, 3])/2-p[1])-u[1]*((segs[k, 0]+segs[k, 2])/2-p[0]))
586:                 thread = [round(float(near_all[first]-ro), 1), round(float(near_all[j]-ro), 1), bool(side(first) != side(j))]
587:         self.last = dict(mode=mode, trace=dict(mode=mode, boost=bool(bst[i]), cmd=round(float(np.degrees(cmd)), 1), clear=round(float(clear[i]), 1),
588:                          hard=round(float(hard[i]), 1), n_safe=int(safe.sum()), threat=round(threat, 2),
589:                          enclosed=round(enclosed, 2), wrap=round(wrap_cov, 2), thr=float(thr[i]), eat=round(float(eat[i]), 1), goal=round(goal_val, 1),
590:                          thread=thread, L=int(s['L']), sc=round(sc, 2), died_near=self.died_near, kills=self.kills,
591:                          big=round(big_risk, 2), curl=round(curl, 2), prof=PROFILE, onward=round(float(onward[i]), 1), nh=len(heads),
592:                          crowd=None if crowd_at is None else round(float(np.hypot(*(crowd_at-p)))),
593:                          gap=None if thread_w is None else [round(thread_w['w'], 1), round(thread_w['ra'], 1), round(thread_w['rb'], 1),
594:                                                            round(ro, 1), bool(thread_i[i])],
```

## pilot.py:652–669
```python
652: 
653: 
654: def _drive(ctrl, s, secs, move=None):
655:     """Closed loop with 5 ticks (0.15 s) of command delay; returns the worst drawn gap to bodies."""
656:     p, ang, sp, sc = np.array([s['x'], s['y']]), s['ang'], s['sp'], s['sc']
657:     q, worst, dt = [(ang, False)]*5, np.inf, 1/30
658:     w = turn_rate(sc)
659:     for k in range(int(secs*30)):
660:         s.update(x=p[0], y=p[1], ang=ang, sp=sp, t=k*dt)
661:         if move: move(s, k*dt)
662:         cmd, _ = ctrl(s)
663:         q.append(cmd); a, b = q.pop(0)
664:         ang += np.clip(wrap(a-ang), -w*dt, w*dt)
665:         target = BOOST_SP if b else cruise_sp(sc)
666:         sp += np.clip(target-sp, -(BOOST_SP-5.8)/RAMP*dt, (BOOST_SP-5.8)/RAMP*dt)
667:         p = p+sp*PX_PER_SP*dt*np.array([np.cos(ang), np.sin(ang)])
668:         if len(s['segs']):
669:             worst = min(worst, (seg_dist(p[None], s['segs'])[0]-s['segs'][:, 4]).min()-R*sc)
```

## pilot.py:797–807
```python
797:         c(_state(t=k/30, x=60*np.cos(a0), y=60*np.sin(a0), ang=a0+np.pi/2))
798:     assert c.wp_until > 5 and c.last['mode'] == 'loop', (c.wp_until, c.last['mode'])
799:     # 16b. (user) Same circling with remains in reach: food first, no loop pull.
800:     c = Pilot()
801:     for k in range(160):
802:         a0 = k/30*2.5
803:         c(_state(t=k/30, x=60*np.cos(a0), y=60*np.sin(a0), ang=a0+np.pi/2, food=np.array([[300., 0., 15.]]*6)))
804:     assert c.last['mode'] != 'loop', c.last['mode']
805:     # 17. (user) Wrapped in a closed ring: coil on our own circle, the same circle every lap, no contact.
806:     ring = 320*np.column_stack((np.cos(np.linspace(0, 2*np.pi, 91)), np.sin(np.linspace(0, 2*np.pi, 91))))
807:     s = _state(segs=np.column_stack((ring[:-1], ring[1:], np.full(90, 30.))), sid=np.full(90, 3.))
```

## run_live.py:34–40
```python
34: VIEW_W, VIEW_H = 960, 600
35: RADIUS = 1150            # px of bodies sent each tick
36: FOOD_RADIUS = 3000       # px of food sent (user: far remains were never seen; the client holds what its sectors hold)
37: NICKS = ('momo', 'toto', 'nana', 'coco', 'lulu', 'kiki', 'dodo', 'bibi', 'mimi', 'popo')
38: 
39: OBSERVE_JS = """([R, RF]) => {
40:   const s = window.slither;
```

## run_live.py:129–174
```python
129:         if got: meas['ev'].extend(got['ev']); meas['smp'].extend(got['smp'])
130: 
131:     cam = asyncio.create_task(camera())
132:     try:
133:         while True:
134:             tick = time.monotonic(); ticks.append(tick)
135:             raw = await asyncio.wait_for(page.evaluate(OBSERVE_JS, [RADIUS, FOOD_RADIUS]), timeout=5)
136:             if raw is None:
137:                 break
138:             t_obs = time.monotonic()
139:             s = unpack(raw); s['t'] = tick-start
140:             L_max = max(L_max, s['L'])
141:             cmd, _ = await asyncio.wait_for(asyncio.to_thread(ctrl, s), timeout=1.)
142:             work.append(time.monotonic()-tick)
143:             last = dict(getattr(ctrl, 'last', {}))
144:             modes[last.get('mode')] = modes.get(last.get('mode'), 0)+1
145:             if 'trace' in last: trace.append(dict(t=round(s['t'], 3), **last['trace']))
146:             box.append(dict(state={k: (v.astype(np.float32) if isinstance(v, np.ndarray) else v) for k, v in s.items()},
147:                             cmd=(float(cmd[0]), bool(cmd[1])), last=last))
148:             t_dec = time.monotonic()
149:             sent = await asyncio.wait_for(page.evaluate(COMMAND_JS, [float(cmd[0]), bool(cmd[1])]), timeout=5)
150:             stage.append(((t_obs-tick)*1e3, (t_dec-t_obs)*1e3, (time.monotonic()-tick)*1e3))
151:             if not sent:
152:                 reason = 'user_escape' if await page.evaluate('window.__stop') else 'death'
153:                 break
154:             if measure and len(ticks) % 30 == 0:
155:                 await drain()
156:             if len(ticks) % 900 == 0:
157:                 print(json.dumps(dict(event='progress', t=round(s['t']), L=s['L'], mode=last.get('mode'))), flush=True)
158:             await asyncio.sleep(max(.001, period-(time.monotonic()-tick)))
159:     finally:
160:         cam.cancel()
161:         out_dir.mkdir(exist_ok=True)
162:         with gzip.open(out_dir/'blackbox.pkl.gz', 'wb') as f:
163:             pickle.dump(list(box), f)
164:         if measure:
165:             try: await drain()
166:             except Exception: pass
167:             with gzip.open(out_dir/'measure.json.gz', 'wt') as f:
168:                 json.dump(meas, f)
169:         for t, img in shots:
170:             (out_dir/f'last_{t:07.2f}.jpg').write_bytes(img)
171:     d = np.diff(ticks)*1000 if len(ticks) > 2 else np.zeros(1)
172:     return dict(nick=nick, reason=reason, seconds=round(time.monotonic()-start, 1), L_max=int(L_max), modes=modes,
173:                 loop_ms=dict(p50=round(float(np.percentile(d, 50)), 1), p95=round(float(np.percentile(d, 95)), 1)),
174:                 work_ms_p95=round(float(np.percentile(work, 95))*1000, 1) if work else None,
```

## run_live.py:198–225
```python
198:                 # Fresh page per game: after a death the dead-man switch may already have left for about:blank.
199:                 # Whole setup bounded: 2026-09-25 14:22 the runner hung here for 30 min between games.
200:                 await asyncio.wait_for(page.goto('http://slither.io/', wait_until='domcontentloaded'), timeout=60)
201:                 await page.wait_for_function('typeof connect==="function" && document.getElementById("nick")', timeout=60000)
202:                 ctrl = getattr(importlib.import_module(module), cls or 'Controller')()
203:                 out = Path('runs')/f'live_{time.strftime("%Y%m%d_%H%M%S")}'
204:                 record = dict(at=time.strftime('%F %T'), controller=controller, game=g+1, status='started')
205:                 save = lambda: out.with_suffix('.jsonl').write_text(json.dumps(record)+'\n')
206:                 save()
207:                 print(json.dumps(dict(event='start', game=g+1, log=str(out.with_suffix('.jsonl')))), flush=True)
208:                 try:
209:                     # Back on the menu after a death; one browser, no reconnect on errors.
210:                     await page.wait_for_function('!window.playing && !document.getElementById("nick").disabled', timeout=60000)
211:                     record.update(await play(page, ctrl, out, measure), status='finished')
212:                 except BaseException as exc:
213:                     record.update(status='error', error=repr(exc)[:300])
214:                     raise
215:                 finally:
216:                     save()
217:                     print(json.dumps({k: v for k, v in record.items() if k != 'trace'}), flush=True)
218:                 if record['reason'] == 'user_escape':
219:                     break
220:                 await asyncio.sleep(3)
221:         finally:
222:             await browser.close()
223:             await asyncio.to_thread(win_chrome.close)
224:             relay.close()
225: 
```

## batch_stats.py:17–26
```python
17:     out = []
18:     for x in tr:
19:         if on(x.get(key)):
20:             if out and x['t']-out[-1][1] <= gap: out[-1][1] = x['t']
21:             else: out.append([x['t'], x['t']])
22:     return out
23: 
24: 
25: def main(paths):
26:     games = []
```

## batch_stats.py:48–66
```python
48:         # attacks: threat > 0 spans; died = death within 1.5 s of the span end
49:         for t0, t1 in episodes(tr, 'threat', lambda v: v is not None and v > 0):
50:             if t1-t0 < .2: continue
51:             w = [x for x in tr if t0 <= x['t'] <= t1]
52:             b = float(np.mean([x['boost'] for x in w]))
53:             att['n'] += 1
54:             if died and T-t1 < 1.5: att['died'] += 1; att['boost_died'].append(b); att['dur_died'].append(t1-t0)
55:             else: att['escaped'] += 1; att['boost_esc'].append(b); att['dur_esc'].append(t1-t0)
56:         gain.append((max(x['L'] for x in tr)-tr[0]['L'])/max((T-tr[0]['t'])/60, 1e-3))
57:         gap_ticks += sum(x.get('gap') is not None for x in tr)
58:         through += sum(bool(x.get('gap') and x['gap'][4]) for x in tr)
59:         if died:
60:             eps = episodes(tr, 'mode', lambda v: v == 'emergency', gap=.3)
61:             if eps and T-eps[-1][1] < .5: emerg_to_death.append(T-eps[-1][0])
62:         if r.get('stage_ms'): lat.append(r['stage_ms']['obs_to_cmd'])
63:     print(f'modes: ' + ', '.join(f'{k} {v/ticks:.0%}' for k, v in modes.most_common()) + f'; boost {boost/ticks:.0%} of ticks')
64:     tot = sum(jumps_by_mode.values())
65:     print(f'command jumps > 90 deg: {tot/minutes:.1f}/min; by mode ' + ', '.join(f'{k} {v}' for k, v in jumps_by_mode.most_common()))
66:     m = lambda a: f'{np.mean(a):.2f}' if a else '-'
```

## deaths.py:26–68
```python
26: def classify(path):
27:     r = json.loads(open(path).read())
28:     if r.get('status') != 'finished' or r.get('reason') != 'death':
29:         return None
30:     tr = r.get('trace', [])
31:     box = pickle.load(gzip.open(path[:-6]+'/blackbox.pkl.gz'))
32:     end = box[-1]['state']
33:     p = np.array([end['x'], end['y']]); ro = pilot.R*end['sc']
34:     segs, sid = np.asarray(end['segs'], float), np.asarray(end['sid'])
35:     if not len(segs):
36:         return dict(path=path, category='unknown')
37:     d = pilot.seg_dist(p[None], segs)[0]-segs[:, 4]-ro
38:     k = int(d.argmin()); killer = int(sid[k])
39:     a, b = segs[k, :2], segs[k, 2:4]
40:     hit = a+np.clip(((p-a)@(b-a))/max((b-a)@(b-a), 1e-9), 0, 1)*(b-a)
41:     T = end['t']
42:     track, kill_sp, kill_r, head_dist = [], [], None, None
43:     for rec in box:
44:         s = rec['state']
45:         hid = [int(v) for v in s['hid']]
46:         if killer in hid:
47:             h = np.asarray(s['heads'], float)[hid.index(killer)]
48:             if T-s['t'] <= 1.5: track.append(h[:2])
49:             if T-s['t'] <= 1.: kill_sp.append(h[3])
50:             kill_r = pilot.R*h[4]; head_dist = float(np.hypot(*(h[:2]-np.array([s['x'], s['y']]))))
51:     fresh = bool(track) and float(np.min(np.hypot(*(np.array(track)-hit).T))) < 40
52:     last = [x for x in tr if T-x['t'] <= 3]
53:     wrapped = any(x.get('wrap', 0) >= .5 for x in last)
54:     emerg = [x for x in tr if T-x['t'] <= 2]
55:     # time with no safe candidate right before death
56:     stuck = 0.
57:     for x in reversed(tr):
58:         if x['n_safe'] > 0: break
59:         stuck = T-x['t']
60:     if wrapped: cat = 'wrapped'
61:     elif fresh and head_dist is not None and head_dist < 400: cat = 'cut_off'
62:     elif stuck >= 1.: cat = 'trapped'
63:     else: cat = 'sudden'
64:     cmds = np.radians([x['cmd'] for x in last if 'cmd' in x])
65:     return dict(path=path, category=cat, killer=killer, seconds=r['seconds'], L=r['L_max'], killer_r=None if kill_r is None else round(kill_r),
66:                 our_r=round(ro), killer_boost=bool(kill_sp) and max(kill_sp) > 9, killer_head=None if head_dist is None else round(head_dist),
67:                 remains=any(x['goal'] >= 144 for x in tr if T-x['t'] <= 5), boosting=bool(tr and tr[-1]['boost']),
68:                 stuck=round(stuck, 2), mode_2s=Counter(x['mode'] for x in emerg).most_common(1)[0][0] if emerg else None,
```

## 후속 확인 — 외부 코드 변경 후 내장 검사 및 P15 첫 판 완료
현재 pilot.py SHA256: 1d5615a4fcc4f51796c7c8975258d9ca942c07a7a74c9eebcdf2db4d3d07583b
내장 검사 exit_code=0; 출력:
```text
ok pilot; crowded tick p50 57.3 ms p95 70.1 ms

```
P15 별도 실행 완료 원본 요약 (trace 제외), runs/live_20260925_163248.jsonl, sha256 166b79f9b69b4fac497c3547bd45f9a5f35cc73e30db929ac90e236f2efa7355:
```json
{
  "at": "2026-09-25 16:32:48",
  "controller": "pilot:Pilot",
  "game": 1,
  "status": "finished",
  "nick": "lulu37",
  "reason": "death",
  "seconds": 96.2,
  "L_max": 568,
  "modes": {
    "feed": 1591,
    "evade": 580,
    "unwrap": 95,
    "escape": 42,
    "emergency": 14
  },
  "loop_ms": {
    "p50": 37.3,
    "p95": 63.1
  },
  "work_ms_p95": 50.4,
  "stage_ms": {
    "observe": [
      6.2,
      14.7
    ],
    "decide": [
      23.9,
      38.4
    ],
    "obs_to_cmd": [
      36.0,
      61.9
    ]
  }
}
```
리뷰 중 외부 변경: pilot.py 498–501행은 먹이가 없을 때만 loop 복구 가점을 적용하도록 바뀌었다. 반례 재검사는 이 변경 후 코드에서 수행했다. P15 새 실행은 리뷰가 시작한 작업이 아니다.
