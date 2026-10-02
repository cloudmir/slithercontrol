# T6 실게임 생존 측정 — 2026-10-02

사용자 요청: “실제 게임을 해서 얼마나 생존하는지 봐”.
테스트 설계: 5판·판당 실행기 기준600초 상한은 이번 검증의 운영 선택이다.
빌드 1002-cf660475, 로그 `runs/t6_survival_20261002_141215`. 기존 Windows MOD Chrome과 T6 설정을 유지했다. 제품 코드를 수정하지 않았다.
대상 서버는 자동 선택 설정 그대로이며, 실제 접속 서버는 전 판181.41.140.178:444였다.

| 판 | 실행기 기준 생존 | 브라우저 원본 시간 | 종료 직전 길이 | 최대 길이 | 종료 | 적 머리 근접 관측 비중 |
|---|---:|---:|---:|---:|---|---:|
| 1 | ≥600.0초 | 645.0초 | 78 | 101 | 상한 종료 | 60.4% |
| 2 | ≥600.0초 | 651.1초 | 80 | 104 | 상한 종료 | 67.2% |
| 3 | ≥600.0초 | 652.0초 | 84 | 107 | 상한 종료 | 53.3% |
| 4 | 44.3초 | 48.0초 | 101 | 101 | 사망 | 100.0% |
| 5 | ≥600.0초 | 649.7초 | 79 | 98 | 상한 종료 | 65.8% |

사망1판·상한 종료4판. 생존 중앙값은최소 600.0초다. 상한 종료한 판은 그 이후 사망 시각을 알 수 없다.
판단 오류0·페이지 오류0·판 중 파라미터 변경0건. 상한 종료를 위한 봇 끄기 기록은 파라미터 변경에 포함하지 않았다. 마지막에 봇을 끄고 종료했다.

4판은 실행기44.27초(브라우저48.0초)에 사망했다. 마지막 수집 판단까지 브라우저 기준22.9초 동안 출구 경로 수가0이었다. 끝에 안전한 첫 명령도0으로 긴급 회전 상태가 됐다. 이것은 플래너의 관측·판단 기록이며, 실제로 모든 탈출이 불가능했다는 증명은 아니다. 사망 직전 화면은 `game_04_second_0013_0039.621.jpg`, 원본 사망 관측은 `game_04_end_detected.json`이다.

시계 확인: Linux 실행기 약10.04초 동안 Windows 브라우저는 약11.14초 증가했다(`clock_check.json`). 원본 브라우저 시간은 그대로 보존했다. 사망 시간은 실행기의 종료 감지 경과시간, 상한 종료는600초 이상으로 표시했다. 종료 감지 간격은 목표0.35초이며 호출 지연이 포함될 수 있다. 고정 환산 비율을 적용하지 않았다.

`nh`는 주변 적 머리 관측 수로 몸통 혼잡도를 직접 측정한 값이 아니다. 촬영 목표 간격은0.5초였으나 실제 촬영은 브라우저 호출 지연에 따라 더 길어졌고 판별 촬영 시각을 별도 보존했다. 원본 판 기록·전체 판단 로그·블랙박스는5판 모두 저장했다.
5판 단독 관측 결과다. 비교군이 없으므로 기존 버전보다 생존이 개선됐다고 확정하지 않는다.

분석 원본: `analysis.json`; 재현 코드: `research/t6_escape_20261002/analyse_survival.py`.

## Original batch output

```json
{
  "out": "runs/t6_survival_20261002_141215",
  "build": "1002-cf660475",
  "hashes": {
    "ext/pilot.js": "212e4b1adc52d971788c1a23f19e07716220b2b758290a0222cb7d016272d25a",
    "ext/mod.js": "26e8ada1d6820a9a9143b6520cad7114c4deecc84f16043c95b37d8b7ae73b93",
    "ext/params.js": "e8f7b5056b186e6bac1181e47e649e6567e4423f80cd3dc69a3a0e9c4460db31",
    "ext/manifest.json": "a84954a4ee76d19e48c1dcf53410f7ec8872a3c5ef98849d9e72466cbd73fc96",
    "params.json": "940c37e9e7ec41f9353bef585aefc0be2711cb792f051ff1f0e876b2fdb0b6ef"
  },
  "purpose": "Fixed T6 live survival duration; deaths and 600s caps separated",
  "success_criteria": "Five recorded games with original record, box, log and durations",
  "planned_games": 5,
  "game_cap_s": 600,
  "camera_interval_s": 0.5,
  "games": [
    {
      "seconds": 645,
      "L_max": 101,
      "ticks": 19236,
      "server": "181.41.140.178:444",
      "players": 173,
      "errors": 0,
      "best_rank": 48,
      "changes": [
        {
          "t": 644.907,
          "bot": false
        }
      ],
      "end_reason": "cap",
      "capped": true,
      "interrupted": false,
      "game": 1
    },
    {
      "seconds": 651.1,
      "L_max": 104,
      "ticks": 19150,
      "server": "181.41.140.178:444",
      "players": 217,
      "errors": 0,
      "best_rank": 62,
      "changes": [
        {
          "t": 650.809,
          "bot": false
        }
      ],
      "end_reason": "cap",
      "capped": true,
      "interrupted": false,
      "game": 2
    },
    {
      "seconds": 652,
      "L_max": 107,
      "ticks": 19236,
      "server": "181.41.140.178:444",
      "players": 237,
      "errors": 0,
      "best_rank": 62,
      "changes": [
        {
          "t": 651.912,
          "bot": false
        }
      ],
      "end_reason": "cap",
      "capped": true,
      "interrupted": false,
      "game": 3
    },
    {
      "seconds": 48,
      "L_max": 101,
      "ticks": 1354,
      "server": "181.41.140.178:444",
      "players": 178,
      "errors": 0,
      "best_rank": 69,
      "changes": [],
      "end_reason": "death",
      "capped": false,
      "interrupted": false,
      "game": 4
    },
    {
      "seconds": 649.7,
      "L_max": 98,
      "ticks": 19191,
      "server": "181.41.140.178:444",
      "players": 238,
      "errors": 0,
      "best_rank": 50,
      "changes": [
        {
          "t": 649.442,
          "bot": false
        }
      ],
      "end_reason": "cap",
      "capped": true,
      "interrupted": false,
      "game": 5
    }
  ],
  "started": "2026-10-02 14:12:15",
  "page_errors": [],
  "server_selection": "automatic",
  "completed": true,
  "ended": "2026-10-02 14:57:29",
  "T6_values": {
    "T4_GAP": -5,
    "T6_ON": 1,
    "T6_EDGE": 650,
    "T6_BOOST": 1
  },
  "final_browser": {}
}
```

## Reproduced analysis output

```json
{
  "run": "runs/t6_survival_20261002_141215",
  "build": "1002-cf660475",
  "planned_games": 5,
  "completed": true,
  "median_s": 600,
  "mean_s": 488.8538195787929,
  "max_s": 600,
  "deaths": 1,
  "caps": 4,
  "decision_errors": 0,
  "page_errors": [],
  "median_is_lower_bound": true,
  "mean_is_lower_bound": true,
  "project_code_unchanged": true,
  "games": [
    {
      "seconds": 645,
      "L_max": 101,
      "ticks": 19236,
      "server": "181.41.140.178:444",
      "players": 173,
      "errors": 0,
      "best_rank": 48,
      "changes": [
        {
          "t": 644.907,
          "bot": false
        }
      ],
      "end_reason": "cap",
      "capped": true,
      "interrupted": false,
      "game": 1,
      "full_log_ticks": 19236,
      "live_trace_ticks": 19234,
      "box_frames": 1763,
      "screenshots": 923,
      "full_log_first_t": 0.002,
      "full_log_last_t": 644.879,
      "trace_phase_ticks": {
        "escape": 19234
      },
      "observed_seconds": 644.877,
      "time_fraction": {
        "near_head": 0.6037,
        "three_heads": 0.2548,
        "boost": 0.0979
      },
      "last_decision": {
        "t": 644.818,
        "ms": 11.8,
        "page_ms": 12.2,
        "mode": "escape",
        "boost": false,
        "cmd": 314.8,
        "L": 78,
        "sc": 1.04,
        "prof": "aggressive",
        "nh": 2,
        "t6_on": 1,
        "t6_phase": "escape",
        "t6_routes": 3,
        "t6_nodes": 405,
        "t6_rails": 2,
        "t6_graph_reason": "connected",
        "t6_graph_ms": 6.899999976158142,
        "t6_root_safe": true,
        "t6_clear": 70.21816644787023,
        "t6_checked_s": 2.65,
        "t6_depth": 8,
        "t6_safe_commands": 19,
        "t6_goal": {
          "x": 31878.981820314282,
          "y": 41106.361492596145
        },
        "t6_ms": 11.800000011920929,
        "t6_gap": -5,
        "v10_result_age_ms": null
      },
      "freezes": [],
      "decide_ms": {
        "p50": 3.9,
        "p95": 10.5
      },
      "code_hashes_match": true,
      "browser_seconds": 645,
      "final_logged_L": 78,
      "final_logged_t": 644.879,
      "runner_duration_s": 600,
      "duration_is_lower_bound": true,
      "parameter_changes": 0,
      "final_no_route_page_seconds": 0
    },
    {
      "seconds": 651.1,
      "L_max": 104,
      "ticks": 19150,
      "server": "181.41.140.178:444",
      "players": 217,
      "errors": 0,
      "best_rank": 62,
      "changes": [
        {
          "t": 650.809,
          "bot": false
        }
      ],
      "end_reason": "cap",
      "capped": true,
      "interrupted": false,
      "game": 2,
      "full_log_ticks": 19150,
      "live_trace_ticks": 19148,
      "box_frames": 1771,
      "screenshots": 189,
      "full_log_first_t": 0.001,
      "full_log_last_t": 650.798,
      "trace_phase_ticks": {
        "escape": 19148
      },
      "observed_seconds": 650.797,
      "time_fraction": {
        "near_head": 0.6722,
        "three_heads": 0.1035,
        "boost": 0.1051
      },
      "last_decision": {
        "t": 650.72,
        "ms": 2.5,
        "page_ms": 2.7,
        "mode": "escape",
        "boost": false,
        "cmd": 314.8,
        "L": 79,
        "sc": 1.04,
        "prof": "aggressive",
        "nh": 1,
        "t6_on": 1,
        "t6_phase": "escape",
        "t6_routes": 3,
        "t6_nodes": 362,
        "t6_rails": 4,
        "t6_graph_reason": "connected",
        "t6_graph_ms": 1.7000000476837158,
        "t6_root_safe": true,
        "t6_clear": 128,
        "t6_checked_s": 2.65,
        "t6_depth": 8,
        "t6_safe_commands": 19,
        "t6_goal": {
          "x": 31936.496880780454,
          "y": 41878.56957998795
        },
        "t6_ms": 2.399999976158142,
        "t6_gap": -5,
        "v10_result_age_ms": null
      },
      "freezes": [],
      "decide_ms": {
        "p50": 4.2,
        "p95": 12.3
      },
      "code_hashes_match": true,
      "browser_seconds": 651.1,
      "final_logged_L": 80,
      "final_logged_t": 650.798,
      "runner_duration_s": 600,
      "duration_is_lower_bound": true,
      "parameter_changes": 0,
      "final_no_route_page_seconds": 0
    },
    {
      "seconds": 652,
      "L_max": 107,
      "ticks": 19236,
      "server": "181.41.140.178:444",
      "players": 237,
      "errors": 0,
      "best_rank": 62,
      "changes": [
        {
          "t": 651.912,
          "bot": false
        }
      ],
      "end_reason": "cap",
      "capped": true,
      "interrupted": false,
      "game": 3,
      "full_log_ticks": 19236,
      "live_trace_ticks": 19233,
      "box_frames": 1762,
      "screenshots": 196,
      "full_log_first_t": 0.003,
      "full_log_last_t": 651.9,
      "trace_phase_ticks": {
        "escape": 19222,
        "recovery": 11
      },
      "observed_seconds": 651.897,
      "time_fraction": {
        "near_head": 0.5329,
        "three_heads": 0.1816,
        "boost": 0.1924
      },
      "last_decision": {
        "t": 651.781,
        "ms": 13.6,
        "page_ms": 14.5,
        "mode": "escape",
        "boost": true,
        "cmd": 71,
        "L": 84,
        "sc": 1.04,
        "prof": "aggressive",
        "nh": 2,
        "t6_on": 1,
        "t6_phase": "escape",
        "t6_routes": 3,
        "t6_nodes": 389,
        "t6_rails": 6,
        "t6_graph_reason": "connected",
        "t6_graph_ms": 4.399999976158142,
        "t6_root_safe": true,
        "t6_clear": 128,
        "t6_checked_s": 2.65,
        "t6_depth": 8,
        "t6_safe_commands": 38,
        "t6_goal": {
          "x": 30517.57727987618,
          "y": 41895.816102703146
        },
        "t6_ms": 13.600000023841858,
        "t6_gap": -5,
        "v10_result_age_ms": null
      },
      "freezes": [],
      "decide_ms": {
        "p50": 4.5,
        "p95": 15.3
      },
      "code_hashes_match": true,
      "browser_seconds": 652,
      "final_logged_L": 84,
      "final_logged_t": 651.9,
      "runner_duration_s": 600,
      "duration_is_lower_bound": true,
      "parameter_changes": 0,
      "final_no_route_page_seconds": 0
    },
    {
      "seconds": 48,
      "L_max": 101,
      "ticks": 1354,
      "server": "181.41.140.178:444",
      "players": 178,
      "errors": 0,
      "best_rank": 69,
      "changes": [],
      "end_reason": "death",
      "capped": false,
      "interrupted": false,
      "game": 4,
      "full_log_ticks": 1354,
      "live_trace_ticks": 1352,
      "box_frames": 1354,
      "screenshots": 14,
      "full_log_first_t": 0.001,
      "full_log_last_t": 47.982,
      "trace_phase_ticks": {
        "escape": 738,
        "search": 611,
        "recovery": 3
      },
      "observed_seconds": 47.981,
      "time_fraction": {
        "near_head": 1.0,
        "three_heads": 0.9709,
        "boost": 0.0
      },
      "last_decision": {
        "t": 47.912,
        "ms": 28.3,
        "page_ms": 29,
        "mode": "emergency",
        "boost": false,
        "cmd": 264.6,
        "L": 101,
        "sc": 1.05,
        "prof": "aggressive",
        "nh": 5,
        "t6_on": 1,
        "t6_phase": "recovery",
        "t6_routes": 0,
        "t6_nodes": 575,
        "t6_rails": 12,
        "t6_graph_reason": "no_exit",
        "t6_graph_ms": 14.399999976158142,
        "t6_root_safe": true,
        "t6_clear": -14.37437932064595,
        "t6_checked_s": 0.75,
        "t6_depth": 0,
        "t6_safe_commands": 0,
        "t6_goal": null,
        "t6_ms": 28.30000001192093,
        "t6_gap": -5,
        "v10_result_age_ms": null
      },
      "freezes": [],
      "decide_ms": {
        "p50": 10.3,
        "p95": 24.1
      },
      "code_hashes_match": true,
      "browser_seconds": 48,
      "final_logged_L": 101,
      "final_logged_t": 47.982,
      "runner_duration_s": 44.2690978939645,
      "duration_is_lower_bound": false,
      "parameter_changes": 0,
      "final_no_route_page_seconds": 22.9
    },
    {
      "seconds": 649.7,
      "L_max": 98,
      "ticks": 19191,
      "server": "181.41.140.178:444",
      "players": 238,
      "errors": 0,
      "best_rank": 50,
      "changes": [
        {
          "t": 649.442,
          "bot": false
        }
      ],
      "end_reason": "cap",
      "capped": true,
      "interrupted": false,
      "game": 5,
      "full_log_ticks": 19191,
      "live_trace_ticks": 19188,
      "box_frames": 1777,
      "screenshots": 187,
      "full_log_first_t": 0.001,
      "full_log_last_t": 649.431,
      "trace_phase_ticks": {
        "escape": 19188
      },
      "observed_seconds": 649.43,
      "time_fraction": {
        "near_head": 0.658,
        "three_heads": 0.1806,
        "boost": 0.1726
      },
      "last_decision": {
        "t": 649.335,
        "ms": 12.6,
        "page_ms": 13.5,
        "mode": "escape",
        "boost": false,
        "cmd": 313.4,
        "L": 79,
        "sc": 1.04,
        "prof": "aggressive",
        "nh": 0,
        "t6_on": 1,
        "t6_phase": "escape",
        "t6_routes": 3,
        "t6_nodes": 337,
        "t6_rails": 0,
        "t6_graph_reason": "connected",
        "t6_graph_ms": 4.300000011920929,
        "t6_root_safe": true,
        "t6_clear": 128,
        "t6_checked_s": 2.65,
        "t6_depth": 8,
        "t6_safe_commands": 19,
        "t6_goal": {
          "x": 32622.69902091088,
          "y": 41017.89109325145
        },
        "t6_ms": 12.600000023841858,
        "t6_gap": -5,
        "v10_result_age_ms": null
      },
      "freezes": [],
      "decide_ms": {
        "p50": 4.3,
        "p95": 12.6
      },
      "code_hashes_match": true,
      "browser_seconds": 649.7,
      "final_logged_L": 79,
      "final_logged_t": 649.431,
      "runner_duration_s": 600,
      "duration_is_lower_bound": true,
      "parameter_changes": 0,
      "final_no_route_page_seconds": 0
    }
  ],
  "limits": "Five-game fixed T6 observational cohort; caps are censored. No comparison arm or proved survival improvement. nh is heads within observation near range, not a body density measure."
}
```

## Paired clock read

```json
{
  "purpose": "Read-only paired Linux runner and Windows page clock check during game 2",
  "samples": [
    {
      "local_wall": 1790918670.6927333,
      "local_mono": 301576.87348032,
      "rtt": 0.06611625000368804,
      "perf": 3008793.300000012,
      "wall": 1790918670017,
      "trace_t": 72.64
    },
    {
      "local_wall": 1790918680.6973653,
      "local_mono": 301586.90915358404,
      "rtt": 0.004032449971418828,
      "perf": 3019932.5,
      "wall": 1790918681156,
      "trace_t": 83.791
    }
  ],
  "deltas_seconds": {
    "runner_monotonic": 10.035673264064826,
    "runner_wall": 10.004631996154785,
    "page_performance": 11.13919999998808,
    "page_wall": 11.139
  },
  "reporting_choice": "Keep original browser seconds. Use runner end_detected elapsed for natural deaths; report caps as at least 600 runner seconds. A fixed conversion ratio is not assumed."
}
```

## Original file inventory

```json
{
  "runs/t6_survival_20261002_141215/slp_03.json": {
    "sha256": "1cb50de1a544263aae984e311c8f2c0e2771154339cf43023b13aab43a32d971",
    "bytes": 643066
  },
  "runs/t6_survival_20261002_141215/slp_04_box.json.gz": {
    "sha256": "70c417d381eaf226c0702e7045434bfbea25bb9602cff66b091e954a163c6bf1",
    "bytes": 6275818
  },
  "runs/t6_survival_20261002_141215/slp_04_log.json.gz": {
    "sha256": "603a0ba3b5628dcc19f642cd5f214865465a0fd24e243e92290327d4ac2139de",
    "bytes": 62712
  },
  "runs/t6_survival_20261002_141215/slp_05_log.json.gz": {
    "sha256": "a807726c297f46bd671682db03992d7df77039c82cb270ede9d24e0507077781",
    "bytes": 731775
  },
  "runs/t6_survival_20261002_141215/slp_05_box.json.gz": {
    "sha256": "d9e4e87c6c8fdeb629cab5159bd2e9c83d9f6de1ff5e0431bcae5315fc3ad25b",
    "bytes": 300313
  },
  "runs/t6_survival_20261002_141215/slp_01_box.json.gz": {
    "sha256": "47f168402a55fe76ba1c9cdc44140883444ca4d383bfa19e3535b90972f56d6b",
    "bytes": 733419
  },
  "runs/t6_survival_20261002_141215/slp_02.json": {
    "sha256": "f25543bfe5b535c5b5a125d490d56f7e30c494079b0849a3bf5d98ef2f0929a1",
    "bytes": 642632
  },
  "runs/t6_survival_20261002_141215/slp_01_log.json.gz": {
    "sha256": "70a939466ca2e01491800586e46b8f5d8a7727f5be0ddea8af4b00d54fb02d90",
    "bytes": 704550
  },
  "runs/t6_survival_20261002_141215/slp_02_log.json.gz": {
    "sha256": "f53a30f8876c1fc7e5d580594d3d44c483c78d754ca7ac4d6b3ead40d50a61a2",
    "bytes": 696938
  },
  "runs/t6_survival_20261002_141215/slp_04.json": {
    "sha256": "5a101556f0850965a80a726c03e73d593067943b4e1ff244a0aa861c2aa22796",
    "bytes": 612181
  },
  "runs/t6_survival_20261002_141215/slp_02_box.json.gz": {
    "sha256": "d665b339943d1f0954babb80d69474b0f71454771b8415022eb4a6d57786c506",
    "bytes": 297235
  },
  "runs/t6_survival_20261002_141215/slp_05.json": {
    "sha256": "581ca820bcea8f62b3899b9dbd15495246fd5818507e0ec04decfe67e32b1b66",
    "bytes": 642223
  },
  "runs/t6_survival_20261002_141215/slp_03_box.json.gz": {
    "sha256": "24ff0abe90475cdb74de316cf0205a74c51f2d71388234cbba834200519ab386",
    "bytes": 841041
  },
  "runs/t6_survival_20261002_141215/slp_01.json": {
    "sha256": "9e51fba147af992f0edb4f7b7c1258c3a3613ae2d00a494a2d742cc376817061",
    "bytes": 647938
  },
  "runs/t6_survival_20261002_141215/slp_03_log.json.gz": {
    "sha256": "ce91bf56622c420cf4d742bce82cfd0fdfabae9d171b9c3c58ff3f2895871229",
    "bytes": 744181
  },
  "runs/t6_survival_20261002_141215/game_04_end_detected.json": {
    "sha256": "26fbdd6a0c59a2dddd6fd26d0f6fe1daf0755039bedafa0fe9a1a4d3993ffa44",
    "bytes": 3187
  },
  "runs/t6_survival_20261002_141215/game_02_camera.jsonl": {
    "sha256": "d5586725477e7c01e8df4f8f759105c4c2d2bef1083caee201d945782b34117c",
    "bytes": 15258
  },
  "runs/t6_survival_20261002_141215/game_05_camera.jsonl": {
    "sha256": "1041ec3c72ea85d180de7bc1f7653a818bc62bd009a87ab19bdc86c45b3b5490",
    "bytes": 15090
  },
  "runs/t6_survival_20261002_141215/game_01_camera.jsonl": {
    "sha256": "7c90e885ebac629eab1e0ac08a0454389939c8e27424901cd54c4f9a8b9e0f20",
    "bytes": 73293
  },
  "runs/t6_survival_20261002_141215/game_03_camera.jsonl": {
    "sha256": "ee5584b07a24baaa52ab3df3cd9c23e98a816526aeace408d8d35e2c9b61913c",
    "bytes": 15817
  },
  "runs/t6_survival_20261002_141215/game_04_camera.jsonl": {
    "sha256": "ee5eef97a22ec5f2f4940d8c0fe5c104d644082d2320cd1efedf9c01bb533aa6",
    "bytes": 1115
  },
  "runs/t6_survival_20261002_141215/before.json": {
    "sha256": "c27ed37f3055dd2a404311434193bbfcf34e68113e8928d54bfa07889495ad41",
    "bytes": 6937
  },
  "runs/t6_survival_20261002_141215/summary.json": {
    "sha256": "d3d532401bb83355ef2b36744ca60e9bda51cf175ff52940a934d4b8edfcb9a8",
    "bytes": 9417
  },
  "runs/t6_survival_20261002_141215/analysis.json": {
    "sha256": "4498be1963c5d48bfe1004984cdd783c1c600e8323a8acfaf3c1f6495ffc2ed8",
    "bytes": 10093
  },
  "runs/t6_survival_20261002_141215/clock_check.json": {
    "sha256": "c86c69f77fa810f7f4c772955fd46bc8be34c817b569e48701c9b452d82a6d9f",
    "bytes": 792
  }
}
```
