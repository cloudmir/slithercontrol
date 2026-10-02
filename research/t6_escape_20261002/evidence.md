# T6 외곽선 탈출 — 구현·검증·릴리즈 원본

User direct request: 지금 기능을 이용해서 밖으로 빠르게 빠져나가는 회피 알고리즘을 민들어보자

# T6 외곽선 탈출

사용자 요청(2026-10-02): “지금 기능을 이용해서 밖으로 빠르게 빠져나가는 회피 알고리즘을 민들어보자”. T5 표시와 T4 추종을 보존하고 독립 T6 모드를 추가했다.

## 동작

1. T5의 모든 적 양쪽 안내선을 탐색 정점으로 사용하고, 빈 공간의 정점과 연결한다. 몸통을 가로지르는 연결은 제외한다.
2. 현재 머리 위치에서 관측 반경 안의 출구까지 짧은 경로를 최대 3개 찾는다. 기본 탐색 거리 650px이며, 출구에서는 바깥쪽 120px도 추가 검사한다. 완전히 닫힌 포위에는 출구가 있다고 표시하지 않는다.
3. 경로를 그대로 명령하지 않고 회전율·가속·이전 입력 지연을 반영해 여러 실제 주행 원호를 검사한다. 움직이는 적 머리의 현재 방향·속도, 앞으로 생기는 몸통, 예측 불확실성도 검사한다. 유효한 첫 명령을 모두 비교한 뒤 후속 기동을 확장한다.
4. 통과 가능한 후보 안에서 빠르게 출구에 가까워지는 기동을 선택한다. 길이 조건을 만족하고 경로 검사에 통과하면 부스트를 사용한다. 탈출 후보가 없으면 출구 탐색·긴급 회전으로 구분한다.
5. 매 판단마다 현재 몸·머리로 기동을 재검사한다. 지도 탐색이 시간 제한에 걸리면 큐와 거리 계산을 다음 판단으로 이어간다. 재탐색 중에는 최근 출구 안내를 잠시 유지하지만 실제 조작 후보는 새로운 관측으로 검사한다.

몸통 오프셋은 사용자가 채택한 −5px를 사용한다. 탐색 안내 정점에는 추가 2px를 둔다. −5px는 사용자 선택이며 서버의 모든 두께·속도에서 안전하다고 검증된 값이 아니다. 머리 예측은 현재 방향·속도의 예측과 여유 범위를 사용하며 상대의 모든 회전·가속을 보장하는 도달 집합이 아니다. 관측 밖의 공간은 안전한 공간으로 처리하지 않는다.

## 화면과 사용

홈에서 **T6** 선택. 주변 적 안내선은 청록, 몸통 연결로 얻은 출구 안내는 주황 점선, 검사한 주행 예측은 초록(순항)·노랑(부스트) 실선, 위험 회복 기동은 빨강이다. 주황 안내선은 실제로 그 방향으로 곧바로 회전할 수 있다는 인증이 아니다. 홈의 탈출 부스트·탐색 거리를 조절할 수 있다. T5를 선택하면 기존 밀착 추종으로 돌아간다.

## 검증·자료

`check.json`: 열린 공간, 전방 벽, 막다른 U 통로, 한 곳만 열린 좁은 틈, 평행 통로, 출구가 있는 곡선 포위, 경기장 경계의 7개 로컬 상황에서 지연 입력을 적용하며 700px 이상 벗어남·모델 충돌 없음 확인. 움직이는 머리 차단, 닫힌 포위의 출구 오표시 방지, 위험한 시작의 회복 표시, 현재 장애물 재검사도 확인했다. 이 결과는 정적 몸통과 자체 운동 모델의 합성 검증이며 실게임 생존 성능이 아니다.

기존 판단 함수 13개와 T5 외곽선 함수 원문 동일, T5의 실제 기록 관측 20개에서 명령·부스트 일치. `mock.json`: 실제 로컬 Chromium/Worker에서 모드 선택·주변 선·점선 안내/실선 주행·T5/V1 전환·설정 저장 확인, 페이지 오류 없음.

초기 곡선 포위 검증에서 시간 제한으로 탐색을 다시 시작하고, 새 지도를 만드는 동안 기존 출구 방향을 잃어 탈출하지 못했다. 계산 이어가기와 최근 출구 안내 유지로 수정 후 같은 사례가 통과했다. 초기 소스는 `intermediate_pilot_c8b07363.js`, 당시 재현 관측은 `curve_debug.json`에 보존했다.

최종 버전·SHA-256·실제 브라우저 적용 상태는 `release.json`, 변경 전 T5 소스는 `before/`, 화면은 `preview.png`와 `live_release.png`에 있다. 새 실게임은 시작하지 않았다.


## Original closed-loop and replay verification output

```json
{
  "old_methods_preserved": 13,
  "T5_geometry_preserved": true,
  "T5_recorded_command_matches": 20,
  "closed_loop_cases": [
    {
      "name": "open",
      "steps": 19,
      "seconds": 1.9000000000000006,
      "displacement": 717.8801637581882,
      "minClear": 128,
      "boostTicks": 19,
      "maxRoutes": 3,
      "first": {
        "cmd": 0.9136902936735255,
        "boost": true,
        "trace": {
          "mode": "escape",
          "boost": true,
          "cmd": 52.4,
          "L": 1000,
          "sc": 1,
          "prof": "safe",
          "nh": 0,
          "t6_on": 1,
          "t6_phase": "escape",
          "t6_routes": 3,
          "t6_nodes": 385,
          "t6_rails": 0,
          "t6_graph_reason": "connected",
          "t6_graph_ms": 18.202574,
          "t6_root_safe": true,
          "t6_clear": 128,
          "t6_checked_s": 1.15,
          "t6_depth": 2,
          "t6_safe_commands": 38,
          "t6_goal": {
            "x": 30448,
            "y": 30448
          },
          "t6_ms": 44.913993000000005,
          "t6_gap": -5
        }
      },
      "decide_p50_ms": 23.519002,
      "decide_p95_ms": 45.411766
    },
    {
      "name": "front_wall",
      "steps": 22,
      "seconds": 2.2000000000000006,
      "displacement": 721.0578349208083,
      "minClear": 40.94168989123864,
      "boostTicks": 21,
      "maxRoutes": 3,
      "first": {
        "cmd": 2.365581719236936,
        "boost": false,
        "trace": {
          "mode": "escape",
          "boost": false,
          "cmd": 135.5,
          "L": 1000,
          "sc": 1,
          "prof": "safe",
          "nh": 0,
          "t6_on": 1,
          "t6_phase": "escape",
          "t6_routes": 3,
          "t6_nodes": 406,
          "t6_rails": 2,
          "t6_graph_reason": "connected",
          "t6_graph_ms": 15.710065999999983,
          "t6_root_safe": true,
          "t6_clear": 47.51676464813303,
          "t6_checked_s": 1.15,
          "t6_depth": 2,
          "t6_safe_commands": 30,
          "t6_goal": {
            "x": 29552,
            "y": 30448
          },
          "t6_ms": 38.868979999999965,
          "t6_gap": -5
        }
      },
      "decide_p50_ms": 24.50063,
      "decide_p95_ms": 37.12093600000003
    },
    {
      "name": "u_reverse",
      "steps": 27,
      "seconds": 2.700000000000001,
      "displacement": 714.7406665383933,
      "minClear": 8.236752409218752,
      "boostTicks": 24,
      "maxRoutes": 3,
      "first": {
        "cmd": 2.365581719236936,
        "boost": false,
        "trace": {
          "mode": "escape",
          "boost": false,
          "cmd": 135.5,
          "L": 1000,
          "sc": 1,
          "prof": "safe",
          "nh": 0,
          "t6_on": 1,
          "t6_phase": "escape",
          "t6_routes": 3,
          "t6_nodes": 411,
          "t6_rails": 6,
          "t6_graph_reason": "connected",
          "t6_graph_ms": 15.634406000000126,
          "t6_root_safe": true,
          "t6_clear": 26.848419933966944,
          "t6_checked_s": 1.4,
          "t6_depth": 3,
          "t6_safe_commands": 23,
          "t6_goal": {
            "x": 29552,
            "y": 30448
          },
          "t6_ms": 40.83111500000018,
          "t6_gap": -5
        }
      },
      "decide_p50_ms": 25.2310829999999,
      "decide_p95_ms": 38.795467000000144
    },
    {
      "name": "narrow_gate",
      "steps": 20,
      "seconds": 2.0000000000000004,
      "displacement": 716.6472983950591,
      "minClear": 5.872265122765867,
      "boostTicks": 20,
      "maxRoutes": 3,
      "first": {
        "cmd": 0.012516305392788021,
        "boost": true,
        "trace": {
          "mode": "escape",
          "boost": true,
          "cmd": 0.7,
          "L": 1000,
          "sc": 1,
          "prof": "safe",
          "nh": 0,
          "t6_on": 1,
          "t6_phase": "escape",
          "t6_routes": 3,
          "t6_nodes": 430,
          "t6_rails": 10,
          "t6_graph_reason": "connected",
          "t6_graph_ms": 15.722396000000117,
          "t6_root_safe": true,
          "t6_clear": 4.366980406282673,
          "t6_checked_s": 1.4,
          "t6_depth": 3,
          "t6_safe_commands": 30,
          "t6_goal": {
            "x": 30640,
            "y": 30000
          },
          "t6_ms": 41.386801000000105,
          "t6_gap": -5
        }
      },
      "decide_p50_ms": 32.685627999999724,
      "decide_p95_ms": 50.103106000000025
    },
    {
      "name": "parallel_lane",
      "steps": 31,
      "seconds": 3.1000000000000014,
      "displacement": 738.3218146417908,
      "minClear": 12.035094615232083,
      "boostTicks": 11,
      "maxRoutes": 3,
      "first": {
        "cmd": 0.012516305392788021,
        "boost": false,
        "trace": {
          "mode": "escape",
          "boost": false,
          "cmd": 0.7,
          "L": 1000,
          "sc": 1,
          "prof": "safe",
          "nh": 0,
          "t6_on": 1,
          "t6_phase": "search",
          "t6_routes": 0,
          "t6_nodes": 463,
          "t6_rails": 4,
          "t6_graph_reason": "no_exit",
          "t6_graph_ms": 13.407177000000047,
          "t6_root_safe": true,
          "t6_clear": 10.666371833403536,
          "t6_checked_s": 2.65,
          "t6_depth": 8,
          "t6_safe_commands": 1,
          "t6_goal": null,
          "t6_ms": 19.49366400000008,
          "t6_gap": -5
        }
      },
      "decide_p50_ms": 18.511013000000275,
      "decide_p95_ms": 37.94687500000009
    },
    {
      "name": "curved_enclosure_gap",
      "steps": 27,
      "seconds": 2.700000000000001,
      "displacement": 707.6014474366303,
      "minClear": 19.913626304516832,
      "boostTicks": 18,
      "maxRoutes": 3,
      "first": {
        "cmd": 0.012516305392788021,
        "boost": false,
        "trace": {
          "mode": "escape",
          "boost": false,
          "cmd": 0.7,
          "L": 1000,
          "sc": 1,
          "prof": "safe",
          "nh": 0,
          "t6_on": 1,
          "t6_phase": "search",
          "t6_routes": 0,
          "t6_nodes": 536,
          "t6_rails": 4,
          "t6_graph_reason": "budget",
          "t6_graph_ms": 73.43179799999962,
          "t6_root_safe": true,
          "t6_clear": 108.68215781629374,
          "t6_checked_s": 0.9,
          "t6_depth": 1,
          "t6_safe_commands": 16,
          "t6_goal": null,
          "t6_ms": 108.84204100000034,
          "t6_gap": -5
        }
      },
      "decide_p50_ms": 66.21142599999985,
      "decide_p95_ms": 109.80212100000017
    },
    {
      "name": "arena_edge",
      "steps": 22,
      "seconds": 2.2000000000000006,
      "displacement": 720.6484686268269,
      "minClear": 14.009652652455088,
      "boostTicks": 21,
      "maxRoutes": 3,
      "first": {
        "cmd": 2.365581719236936,
        "boost": false,
        "trace": {
          "mode": "escape",
          "boost": false,
          "cmd": 135.5,
          "L": 1000,
          "sc": 1,
          "prof": "safe",
          "nh": 0,
          "t6_on": 1,
          "t6_phase": "escape",
          "t6_routes": 3,
          "t6_nodes": 195,
          "t6_rails": 0,
          "t6_graph_reason": "connected",
          "t6_graph_ms": 5.649817999999868,
          "t6_root_safe": true,
          "t6_clear": 21.50761080692254,
          "t6_checked_s": 1.65,
          "t6_depth": 4,
          "t6_safe_commands": 22,
          "t6_goal": {
            "x": 29552,
            "y": 30448
          },
          "t6_ms": 26.812906000000112,
          "t6_gap": -5
        }
      },
      "decide_p50_ms": 21.974930000000313,
      "decide_p95_ms": 27.642831999999544
    }
  ],
  "head_crossing_rejected": true,
  "enclosed_no_false_exit": true,
  "unsafe_root_labelled_recovery": true,
  "stale_guide_checked_with_current_bodies": true,
  "scope": "local static body / delayed own-motion simulation and forecast head check; no real survival claim"
}
```


## Actual local Chromium / Worker output

```json
{
  "real_worker_T6": true,
  "routes_observed": 2,
  "contours_in_T6": true,
  "geometric_guides_dashed": true,
  "swept_path_solid": true,
  "T5_and_V1_switches": true,
  "persisted": true,
  "page_errors": [],
  "traces": [
    {
      "t": 0.926,
      "ms": 16.5,
      "page_ms": 17,
      "mode": "escape",
      "boost": true,
      "cmd": 359.3,
      "L": 587,
      "sc": 1,
      "prof": "aggressive",
      "nh": 2,
      "t6_on": 1,
      "t6_phase": "escape",
      "t6_routes": 2,
      "t6_nodes": 455,
      "t6_rails": 4,
      "t6_graph_reason": "connected",
      "t6_graph_ms": 12,
      "t6_root_safe": true,
      "t6_clear": 8.997849106931625,
      "t6_checked_s": 2.65,
      "t6_depth": 8,
      "t6_safe_commands": 4,
      "t6_goal": {
        "x": 30823.67037121703,
        "y": 30000.040739510336
      },
      "t6_ms": 16.5,
      "t6_gap": -5,
      "v10_result_age_ms": null
    },
    {
      "t": 0.964,
      "ms": 20.1,
      "page_ms": 20.5,
      "mode": "escape",
      "boost": true,
      "cmd": 359.3,
      "L": 587,
      "sc": 1,
      "prof": "aggressive",
      "nh": 2,
      "t6_on": 1,
      "t6_phase": "escape",
      "t6_routes": 2,
      "t6_nodes": 455,
      "t6_rails": 4,
      "t6_graph_reason": "connected",
      "t6_graph_ms": 4.5,
      "t6_root_safe": true,
      "t6_clear": 14.91556232516676,
      "t6_checked_s": 1.9,
      "t6_depth": 5,
      "t6_safe_commands": 6,
      "t6_goal": {
        "x": 30910.68055535574,
        "y": 30000.486701350324
      },
      "t6_ms": 20.100000023841858,
      "t6_gap": -5,
      "v10_result_age_ms": null
    },
    {
      "t": 0.996,
      "ms": 9.2,
      "page_ms": 10,
      "mode": "escape",
      "boost": true,
      "cmd": 359.3,
      "L": 587,
      "sc": 1,
      "prof": "aggressive",
      "nh": 2,
      "t6_on": 1,
      "t6_phase": "escape",
      "t6_routes": 2,
      "t6_nodes": 455,
      "t6_rails": 4,
      "t6_graph_reason": "connected",
      "t6_graph_ms": 4.5,
      "t6_root_safe": true,
      "t6_clear": 5.981148048878808,
      "t6_checked_s": 1.9,
      "t6_depth": 5,
      "t6_safe_commands": 6,
      "t6_goal": {
        "x": 30910.68055535574,
        "y": 30000.486701350324
      },
      "t6_ms": 9.099999964237213,
      "t6_gap": -5,
      "v10_result_age_ms": null
    },
    {
      "t": 1.028,
      "ms": 11.1,
      "page_ms": 11.7,
      "mode": "escape",
      "boost": true,
      "cmd": 359.3,
      "L": 587,
      "sc": 1,
      "prof": "aggressive",
      "nh": 2,
      "t6_on": 1,
      "t6_phase": "escape",
      "t6_routes": 2,
      "t6_nodes": 455,
      "t6_rails": 4,
      "t6_graph_reason": "connected",
      "t6_graph_ms": 4.5,
      "t6_root_safe": true,
      "t6_clear": 15.552052213287467,
      "t6_checked_s": 1.65,
      "t6_depth": 4,
      "t6_safe_commands": 6,
      "t6_goal": {
        "x": 30910.68055535574,
        "y": 30000.486701350324
      },
      "t6_ms": 11.100000023841858,
      "t6_gap": -5,
      "v10_result_age_ms": null
    },
    {
      "t": 1.06,
      "ms": 11.7,
      "page_ms": 12.6,
      "mode": "escape",
      "boost": true,
      "cmd": 359.3,
      "L": 587,
      "sc": 1,
      "prof": "aggressive",
      "nh": 2,
      "t6_on": 1,
      "t6_phase": "escape",
      "t6_routes": 2,
      "t6_nodes": 455,
      "t6_rails": 4,
      "t6_graph_reason": "connected",
      "t6_graph_ms": 4.5,
      "t6_root_safe": true,
      "t6_clear": 19.86085293615416,
      "t6_checked_s": 1.65,
      "t6_depth": 4,
      "t6_safe_commands": 6,
      "t6_goal": {
        "x": 30910.68055535574,
        "y": 30000.486701350324
      },
      "t6_ms": 11.700000047683716,
      "t6_gap": -5,
      "v10_result_age_ms": null
    }
  ]
}
```


## Windows extension release verification / production hashes

```json
{
  "before": {
    "version": "1002-c8b07363",
    "bot": false,
    "playing": false,
    "values": {
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
      "TRACK_ON": 0,
      "TRACK_LOOK": 0.13,
      "TRACK_MIND": 15,
      "V3_RISKW": 40,
      "TRACK_MODE": 1,
      "TRACK_LAT": 0.1,
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
      "T3_ON": 0,
      "T3_MIN_LEN": 600,
      "T3_GAP0": 40,
      "T3_BIN": 0,
      "T3_SPEED": 0,
      "T4_ON": 0,
      "T4_GAP": -5,
      "T4_MIN_LEN": 600,
      "T4_BOOST": 1,
      "T4_APPROACH": 30,
      "T5_ON": 0,
      "T6_ON": 1,
      "T6_EDGE": 650,
      "T6_BOOST": 1,
      "HEAP_BOOST": 0
    },
    "preset": "t6_escape"
  },
  "after": {
    "version": "1002-cf660475",
    "bot": false,
    "playing": false,
    "preset": "t6_escape",
    "T6_ON": 1,
    "T5_ON": 0,
    "T4_ON": 0,
    "T4_GAP": -5,
    "T4_MIN_LEN": 600,
    "T4_BOOST": 1,
    "T4_APPROACH": 30,
    "enemyContours": true
  },
  "applied": true,
  "new_game_started": false,
  "hashes": {
    "ext/pilot.js": "212e4b1adc52d971788c1a23f19e07716220b2b758290a0222cb7d016272d25a",
    "ext/mod.js": "26e8ada1d6820a9a9143b6520cad7114c4deecc84f16043c95b37d8b7ae73b93",
    "params.json": "940c37e9e7ec41f9353bef585aefc0be2711cb792f051ff1f0e876b2fdb0b6ef",
    "ext/params.js": "e8f7b5056b186e6bac1181e47e649e6567e4423f80cd3dc69a3a0e9c4460db31",
    "ext/manifest.json": "a84954a4ee76d19e48c1dcf53410f7ec8872a3c5ef98849d9e72466cbd73fc96"
  }
}
```


## Exact T6 production methods

```javascript
  t6World(s) {
    const V = this.values, ro = R * s.sc, margin = 0, obs = Math.max(900,(V.T6_EDGE??650)+200);
    const walls = [], bins = new Map(), cell = 96;
    const pointD = (x, y, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay, f = clip(((x - ax) * dx + (y - ay) * dy) / Math.max(1e-12, dx * dx + dy * dy), 0, 1);
      return hypot(x - ax - f * dx, y - ay - f * dy);
    };
    const segmentD = (ax, ay, bx, by, cx, cy, dx, dy) => {
      const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy, den = ux * vy - uy * vx;
      if (Math.abs(den) > 1e-10) {
        const wx = cx - ax, wy = cy - ay, t = (wx * vy - wy * vx) / den, u = (wx * uy - wy * ux) / den;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
      }
      return Math.min(pointD(ax, ay, cx, cy, dx, dy), pointD(bx, by, cx, cy, dx, dy), pointD(cx, cy, ax, ay, bx, by), pointD(dx, dy, ax, ay, bx, by));
    };
    for (let i = 0; i + 4 < s.segs.length; i += 5) {
      const a = Array.from(s.segs.slice(i, i + 5)); if (!a.every(Number.isFinite) || a[4] < 0) continue;
      // User-selected surface offset is explicit in T6 only.
      a[4] = Math.max(0, a[4] + (V.T4_GAP??-5));
      const pad = a[4] + ro + margin + 130, id = walls.length; walls.push(a);
      const x0 = Math.max(s.x - obs - 2, Math.min(a[0], a[2]) - pad), x1 = Math.min(s.x + obs + 2, Math.max(a[0], a[2]) + pad);
      const y0 = Math.max(s.y - obs - 2, Math.min(a[1], a[3]) - pad), y1 = Math.min(s.y + obs + 2, Math.max(a[1], a[3]) + pad);
      for (let x = Math.floor(x0 / cell); x <= Math.floor(x1 / cell); x++) for (let y = Math.floor(y0 / cell); y <= Math.floor(y1 / cell); y++) {
        const key = x + ',' + y; if (!bins.has(key)) bins.set(key, []); bins.get(key).push(id);
      }
    }
    const heads = [];
    for (let i = 0; i + 4 < s.heads.length; i += 5) {
      const [x, y, h, sp, sc] = s.heads.slice(i, i + 5); if (![x, y, h, sp, sc].every(Number.isFinite)) continue;
      heads.push({x, y, vx: Math.cos(h) * sp * PX_PER_SP, vy: Math.sin(h) * sp * PX_PER_SP, r: R * sc});
    }
    const check = (a, b, t0 = 0, t1 = t0, pad = 0, dynamic = true) => {
      let gap = Math.min(128, obs - Math.max(hypot(a.x - s.x, a.y - s.y), hypot(b.x - s.x, b.y - s.y)) - pad);
      gap = Math.min(gap, s.wall[2] - Math.max(hypot(a.x - s.wall[0], a.y - s.wall[1]), hypot(b.x - s.wall[0], b.y - s.wall[1])) - ro - margin - pad);
      if (gap < 0) return gap;
      const seen = new Set();
      for (let x = Math.floor((Math.min(a.x, b.x) - pad) / cell); x <= Math.floor((Math.max(a.x, b.x) + pad) / cell); x++)
        for (let y = Math.floor((Math.min(a.y, b.y) - pad) / cell); y <= Math.floor((Math.max(a.y, b.y) + pad) / cell); y++)
          for (const id of bins.get(x + ',' + y) || []) if (!seen.has(id)) {
            seen.add(id); const w = walls[id];
            gap = Math.min(gap, segmentD(a.x, a.y, b.x, b.y, w[0], w[1], w[2], w[3]) - w[4] - ro - margin - pad);
            if (gap < 0) return gap;
          }
      if (dynamic) for (const h of heads) {
        // Forecast only, not a guarantee of enemy intent. Rechecked every tick.
        const ax = a.x - h.x - h.vx * t0, ay = a.y - h.y - h.vy * t0, bx = b.x - h.x - h.vx * t1, by = b.y - h.y - h.vy * t1;
        const uncertainty = 12 * Math.min(t1, 3) + Math.min(60, hypot(h.vx,h.vy) * t1*t1*.15);
        gap = Math.min(gap, pointD(0, 0, ax, ay, bx, by) - ro - h.r - margin - pad - uncertainty);
        // The moving head leaves a new body wall behind it during this forecast.
        gap = Math.min(gap, segmentD(a.x, a.y, b.x, b.y, h.x, h.y, h.x + h.vx * t1, h.y + h.vy * t1) - ro - h.r - margin - pad - uncertainty);
        if (gap < 0) return gap;
      }
      return gap;
    };
    return {ro, obs, margin, walls, check};
  }
  // T6 uses the T5 surface rails as navigation vertices. Geometric guidance
  // is kept separate from swept, time-dependent, physically drivable motion.
  t6Graph(s, W, work=null) {
    const begin=performance.now(),edge=Math.min(this.values.T6_EDGE??650,W.obs-180),spacing=64;
    const origin=work?.origin??{x:s.x,y:s.y},nodes=work?.nodes??[],bins=work?.bins??new Map(),dedup=new Set(),key=(x,y)=>Math.floor(x/128)+','+Math.floor(y/128);
    const add=(x,y,rail=false)=>{
      if(hypot(x-s.x,y-s.y)>edge+60)return;
      const tag=Math.round(x/10)+','+Math.round(y/10);if(dedup.has(tag))return;
      const p={x,y,rail},clear=W.check(p,p,0,0,.4,false);if(clear<0)return;
      dedup.add(tag);p.clear=clear;p.i=nodes.length;nodes.push(p);const k=key(x,y);if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p.i);
    };
    const rails=work?.rails??t5Contours(s,(this.values.T4_GAP??-5)+2);
    if(!work){add(s.x,s.y);if(!nodes.length)return {routes:[],nodes:0,rails:0,reason:'root_inside',ms:performance.now()-begin};
    // Downsample arc length, retaining endpoints; every enemy contributes.
    for(const rail of rails){const p=rail.points;for(let i=0;i+3<p.length;i+=2){const d=hypot(p[i+2]-p[i],p[i+3]-p[i+1]),n=Math.max(1,Math.ceil(d/spacing));
      for(let j=0;j<n;j++)add(p[i]+(p[i+2]-p[i])*j/n,p[i+1]+(p[i+3]-p[i+1])*j/n,true);}add(p.at(-2),p.at(-1),true);}
    for(let x=-Math.ceil(edge/spacing);x<=Math.ceil(edge/spacing);x++)for(let y=-Math.ceil(edge/spacing);y<=Math.ceil(edge/spacing);y++)add(s.x+x*spacing,s.y+y*spacing);
    }
    const dist=work?.dist??new Float64Array(nodes.length).fill(Infinity),prev=work?.prev??new Int32Array(nodes.length).fill(-1),done=work?.done??new Uint8Array(nodes.length),heap=work?.heap??[];
    const push=(id,d)=>{heap.push([id,d]);let c=heap.length-1;while(c){const p=(c-1)>>1;if(heap[p][1]<=d)break;[heap[p],heap[c]]=[heap[c],heap[p]];c=p;}};
    const pop=()=>{const q=heap[0],end=heap.pop();if(heap.length){heap[0]=end;let c=0;for(;;){let k=c,l=c*2+1,r=l+1;if(l<heap.length&&heap[l][1]<heap[k][1])k=l;if(r<heap.length&&heap[r][1]<heap[k][1])k=r;if(k===c)break;[heap[c],heap[k]]=[heap[k],heap[c]];c=k;}}return q;};
    const exits=work?.exits??[];let checks=work?.checks??0,complete=true;if(!work){dist[0]=0;push(0,0);}
    while(heap.length){if(checks>300&&performance.now()-begin>18){complete=false;break;}
      const [i,d]=pop();if(done[i])continue;done[i]=1;const p=nodes[i],radius=hypot(p.x-origin.x,p.y-origin.y);
      if(radius>=edge-45&&p.clear>=20){const a=Math.atan2(p.y-origin.y,p.x-origin.x),end={x:p.x+120*Math.cos(a),y:p.y+120*Math.sin(a)};
        if(W.check(p,end,0,0,1,false)>=0)exits.push(i);}
      const bx=Math.floor(p.x/128),by=Math.floor(p.y/128);
      for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const j of bins.get(x+','+y)||[]){
        if(done[j])continue;const q=nodes[j],len=hypot(p.x-q.x,p.y-q.y);if(len>125||len<1)continue;
        const cost=d+len*(1+Math.max(0,8-Math.min(p.clear,q.clear))*.006);if(cost>=dist[j])continue;
        checks++;if(W.check(p,q,0,0,.5,false)<0)continue;dist[j]=cost;prev[j]=i;push(j,cost);
      }
    }
    exits.sort((a,b)=>dist[a]-dist[b]);const routes=[];
    for(const i of exits){const end=nodes[i],a=Math.atan2(end.y-s.y,end.x-s.x);
      if(routes.some(r=>Math.abs(wrap(a-r.angle))<.65))continue;
      const chain=[];for(let j=i;j>=0;j=prev[j])chain.push(nodes[j]);chain.reverse();const points=[];for(const q of chain)points.push(q.x,q.y);
      routes.push({points,goal:{x:end.x,y:end.y},angle:a,length:dist[i]});if(routes.length===3)break;
    }
    return {routes,nodes:nodes.length,rails:rails.length,checks,reason:routes.length?'connected':complete?'no_exit':'budget',ms:performance.now()-begin,work:complete?null:{origin,nodes,bins,dist,prev,done,heap,exits,rails,checks}};
  }

  t6GuideAt(route,st,look=100) {
    const P=route.points;let near=null;
    for(let i=0;i+3<P.length;i+=2){const dx=P[i+2]-P[i],dy=P[i+3]-P[i+1],len=hypot(dx,dy),u=clip(((st.x-P[i])*dx+(st.y-P[i+1])*dy)/(len*len||1),0,1),x=P[i]+u*dx,y=P[i+1]+u*dy,d=hypot(x-st.x,y-st.y);
      if(!near||d<near.d)near={i,u,x,y,d,len};}
    if(!near)return {angle:st.h,remaining:Infinity};
    let remaining=(1-near.u)*near.len;
    for(let i=near.i+2;i+3<P.length;i+=2)remaining+=hypot(P[i+2]-P[i],P[i+3]-P[i+1]);
    let x=near.x,y=near.y,walk=look;
    for(let i=near.i;i+3<P.length;i+=2){const dx=P[i+2]-x,dy=P[i+3]-y,len=hypot(dx,dy);if(len>=walk){x+=dx*walk/(len||1);y+=dy*walk/(len||1);break;}walk-=len;x=P[i+2];y=P[i+3];}
    return {angle:Math.atan2(y-st.y,x-st.x),remaining:remaining+near.d*2,d:near.d};
  }

  t6Step(s) {
    const started=performance.now(),V=this.values,W=this.t6World(s),ph=this.v4Physics(s.sc),root=this.v9Root(s,W,ph);
    const cache=this.t6Guide,pending=cache?.graph.reason==='budget',resume=pending&&s.t-cache.at<.6&&hypot(s.x-cache.x,s.y-cache.y)<160&&!cache.invalid;
    const needs=!cache||pending||s.t-cache.at>.30||hypot(s.x-cache.x,s.y-cache.y)>80||cache.invalid;
    let graph=cache?.graph;if(needs){graph=this.t6Graph(s,W,resume?cache.graph.work:null);this.t6Guide={graph,at:resume?cache.at:s.t,x:resume?cache.x:s.x,y:resume?cache.y:s.y,invalid:false};}
    if(graph.routes.length)this.t6LastRoutes={routes:graph.routes,at:s.t};
    // Rebuilding a map must not erase a still drivable exit direction. The
    // cached geometric guide is only a hint; every rollout uses today's W.
    const oldRoutes=this.t6LastRoutes&&s.t-this.t6LastRoutes.at<1?this.t6LastRoutes.routes:[];
    const routes=graph.routes.length?graph.routes:graph.reason==='budget'?oldRoutes:[];
    const canBoost=!!routes.length&&!!(V.T6_BOOST??1)&&s.L>=(V.V2_MINL??200),quant=a=>(Math.floor(((a%TAU+TAU)%TAU)/TAU*251)+.5)*TAU/251;
    const previous=this.t6Goal;
    const metric=(q)=>{
      if(!routes.length)return -hypot(q.st.x-s.x,q.st.y-s.y)/ph.vb-Math.min(100,q.clear)/700;
      let best=Infinity;
      routes.forEach((r,i)=>{const g=this.t6GuideAt(r,q.st);const hold=previous&&hypot(previous.x-r.goal.x,previous.y-r.goal.y)<100?.12:0;
        const score=g.remaining/ph.vb+Math.max(0,6-q.clear)*.004-hold;if(score<best){best=score;q.route=i;}});return best;
    };
    let pool=[],safeCount=0,mode='escape',chosen=null,depth=0;
    if(root.ok){
      const angles=[];for(let i=0;i<16;i++)angles.push(s.ang+i*TAU/16);
      for(const r of routes)angles.push(this.t6GuideAt(r,root.st).angle);
      const unique=[...new Set(angles.map(quant))];
      // Check every first command before spending time on deeper branches.
      for(const cmd of unique)for(const boost of canBoost?[false,true]:[false]){
        const r=this.v9Roll(s,W,ph,root.st,0,.55,root.t,cmd,boost);
        if(!r.ok)continue;safeCount++;const q={...r,cmd,boost,pts:[...root.pts,...r.pts],clear:Math.min(root.clear,r.clear),route:0};q.score=metric(q);pool.push(q);
      }
      pool.sort((a,b)=>a.score-b.score);pool=pool.slice(0,6);chosen=pool[0];
      const deadline=performance.now()+16;
      for(let layer=0;layer<8&&pool.length&&performance.now()<deadline;layer++){
        const next=[];for(const q of pool){const aim=routes.length?this.t6GuideAt(routes[q.route],q.st).angle:q.st.h;
          for(const cmd of [...new Set([aim,aim-.6,aim+.6,q.st.h,q.st.h-1.2,q.st.h+1.2].map(quant))])for(const boost of canBoost?[false,true]:[false]){
            const r=this.v9Roll(s,W,ph,q.st,0,.25,q.t,cmd,boost);if(!r.ok)continue;
            const z={...r,cmd:q.cmd,boost:q.boost,pts:[...q.pts,...r.pts],clear:Math.min(q.clear,r.clear),route:q.route};z.score=metric(z);next.push(z);
          }
          if(performance.now()>deadline)break;
        }
        // Keep alternatives with distinct position, heading and speed.
        next.sort((a,b)=>a.score-b.score);const bins=new Set();pool=[];
        for(const q of next){const k=Math.round(q.st.x/24)+','+Math.round(q.st.y/24)+','+Math.round(q.st.h/.3)+','+Math.round(q.st.v/80);if(bins.has(k))continue;bins.add(k);pool.push(q);if(pool.length===6)break;}
        if(pool.length){chosen=pool[0];depth=layer+1;}
      }
    }
    let unsafe=false;
    if(!chosen){
      // A failed latency root / all rejected candidates is not a certified
      // straight-ahead route. Evaluate full recovery arcs without early exit.
      unsafe=true;mode='recovery';this.t6Guide.invalid=true;
      const choices=[];
      for(let i=0;i<24;i++){const cmd=quant(s.ang+i*TAU/24);let st={x:s.x,y:s.y,h:s.ang,v:s.sp*PX_PER_SP},clear=Infinity,exposure=0,points=[0,s.x,s.y,s.ang,s.boostNow?1:0];
        for(let j=0;j<30;j++){const t=j*.025,next=this.v4Adv(st,j*.025<(V.TRACK_LAT??.10)?(Number.isFinite(s.cmdNow)?s.cmdNow:s.ang):cmd,j*.025<(V.TRACK_LAT??.10)?!!s.boostNow:false,.025,ph),g=W.check(st,next,t,t+.025,.2);clear=Math.min(clear,g);exposure+=Math.max(0,-g)*.025;st=next;points.push(t+.025,st.x,st.y,st.h,0);}
        const end=W.check(st,st,.75,.75,.2),score=-exposure+end*.05+clear*.02;choices.push({cmd,boost:false,pts:points,clear,t:.75,st,score});
      }
      chosen=choices.sort((a,b)=>b.score-a.score)[0];
    }else if(!routes.length){mode='search';}
    const guide=routes[chosen.route??0],pts=[];for(let i=0;i<chosen.pts.length;i+=5)pts.push(chosen.pts[i+1],chosen.pts[i+2]);
    if(guide&&!unsafe)this.t6Goal={...guide.goal};else this.t6Goal=null;
    const trace={mode:unsafe?'emergency':'escape',boost:chosen.boost,cmd:r1(deg(chosen.cmd)),L:s.L,sc:r2(s.sc),prof:this.profile,nh:s.hid.length,t6_on:1,t6_phase:mode,t6_routes:routes.length,t6_nodes:graph.nodes,t6_rails:graph.rails,t6_graph_reason:graph.reason,t6_graph_ms:graph.ms,t6_root_safe:root.ok,t6_clear:chosen.clear,t6_checked_s:chosen.t,t6_depth:depth,t6_safe_commands:safeCount,t6_goal:guide?.goal??null,t6_ms:performance.now()-started,t6_gap:V.T4_GAP??-5};
    this.last={mode:trace.mode,trace,draw:{chosen:pts,safe:[],pos:new Float64Array(0),N,C2:0,i:0,near:[],gaps:[],goal:null,crowdAt:null,wp:null,attacker:null,ro:W.ro,analysis:null,t6Guides:routes.map(r=>r.points),t6Unsafe:unsafe,t6Path:pts}};
    this.prev=chosen.cmd;this.prevBoost=chosen.boost;return [chosen.cmd,chosen.boost];
  }


```
