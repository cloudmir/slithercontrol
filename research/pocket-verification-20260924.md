# 포위 내부 회전 방어: 구현·로컬 검증 결과

기준일 2026-09-24. 합성 48/48판, 일반 시뮬레이터 6/6판 완료. 실사이트 추가 실행 없음.

포위 안에서 반복 회전하고 출구가 열리면 탈출하는 기능을 별도 `pocket.py`에 구현했다. 평상시에는 기존 `predict`를 사용한다. 기존 `coil` 기본값을 유지하며 새 기능은 실험 옵션이다.

## 합성 포위 시험

시드 72100–72101, 조건별·제어기별 2판, 첫 사망 또는 60초. 표의 값은 `60초 생존 판 수 / 2 · 평균 생존 초`다. 출구 개방 행의 판 수는 탈출과 60초 생존을 함께 요구한다. 나머지 조건과 성공 의미가 다르며 전체를 합쳐 성공률로 계산하지 않는다.

| 조건 | 기존 coil | 회피 predict | 새 pocket |
|---|---:|---:|---:|
| 닫힌 원형 | 2/2 · 60.00초 | 2/2 · 60.00초 | 2/2 · 60.00초 |
| 중심에서 벗어난 시작 | 2/2 · 60.00초 | 2/2 · 60.00초 | 2/2 · 60.00초 |
| 타원형 | 2/2 · 60.00초 | 2/2 · 60.00초 | 2/2 · 60.00초 |
| 8초 후 출구 개방 | 2/2 · 60.00초 | 2/2 · 60.00초 | 2/2 · 60.00초 |
| 계속 축소되는 포위 | 0/2 · 41.72초 | 0/2 · 41.72초 | 0/2 · 50.50초 |
| 회전 공간 부족 | 0/2 · 0.20초 | 0/2 · 0.20초 | 0/2 · 0.20초 |
| 내부 침입 머리 | 2/2 · 60.00초 | 2/2 · 60.00초 | 2/2 · 60.00초 |
| 열린 공간 먹이 | 2/2 · 60.00초 | 2/2 · 60.00초 | 2/2 · 60.00초 |

합성 장애물은 정해진 형상을 따르며 반응형 적 뱀이 아니다. 내부 침입자는 지정된 궤적의 머리 하나이며 완전한 몸체·전략을 갖춘 상대가 아니다. 실제 포위 사망 장면의 재현도 아니다.

## 반응형 일반 플레이

보통 난이도 상대 50마리, 초기 길이 100, 시드 73100–73101, 첫 사망 또는 90초. 활동 조건은 기존 규칙을 그대로 적용했다. 600초 목표 인증이 아니다.

| 제어기 | 90초 생존 | 생존+활동 조건 준수 | 평균 순성장 | 판별 판단 시간 p95 범위 |
|---|---:|---:|---:|---:|
| coil | 2/2 | 1/2 | 638.1 | 60.8–61.2ms |
| predict | 2/2 | 1/2 | 638.1 | 18.4–23.4ms |
| pocket | 1/2 | 0/2 | 530.2 | 22.5–30.8ms |

일반 환경 유효성: 6/6. 같은 초기 시드라도 정책에 따라 상대 반응과 이후 난수 소비가 달라진다. 판단 시간은 병렬 실행 중의 벽시계 측정이며 독립적인 실시간 지연 시험이 아니다. 시뮬레이터는 판단을 기다리므로 실제 시간 제약 아래의 생존을 입증하지 않는다.

## 검증·범위·제한

- 47개 기능·기존 회귀 검사 통과. 작은 몸의 반복 회전, 출구 탈출 후 채집 복귀, 불가능한 포위 거부, 명령 큐의 회전·부스트, 격자 최적화와 원래 거리 판정의 일치를 검사했다.
- 합성 뷰어와 일반 뷰어의 더미 화면 렌더링을 확인했다. `play_pocket.py`로 출구 개방 사례를 관찰할 수 있고 `play_staged.py --stage pocket`으로 일반 플레이를 볼 수 있다.
- 기존 제어기·물리·평가 핵심 8개 소스는 작업 시작 사본과 SHA-256 동일. 기존 모델이나 실사이트 실행기는 교체하지 않았다.
- 전체 회전 검사는 현재 관측된 몸체를 고정한 예측이다. 움직이는 머리와 새 몸체는 2초 근사 예측이다. 상대 기동·포위 축소·미관측 구간에 대한 무조건 안전 보장은 없다.
- 기능 동작 확인과 생존 성능 우위는 구분한다. 조건당 2판으로 일반적 우위 또는 목표 90% 달성을 주장하지 않는다.

## 개발·중단 이력

`pocket_dev01`, `pocket_dev_normal01`은 초기 개발 시험이다. `pocket_geometry_test01`의 시드 72001에서 출구 경유점 주변을 맴도는 결함을 발견해 해당 시험 48판을 개발 자료로 전환했다. 경유점을 예측 구간보다 멀리 두고 안전 후보 중 출구 방향 전진량을 우선하도록 수정했다. 수정 후 시험은 새 시드 72100대·73100대다.

이전 버전의 `pocket_normal_test01` 180초 계획은 버전 수정으로 중단했으며 완료 결과 없이 남긴 실행 이력이다. 최종 일반 비교는 90초 6판으로 별도 실행했다. 최종 두 묶음도 대화 중단으로 멈췄지만 완료된 합성 24판·일반 2판은 보존하고 미완료 판만 동일 동결 코드·원래 시드의 처음부터 재실행했다. `resume.json`에 재시작 범위를 남겼다.

## 재현

```sh
OPENBLAS_NUM_THREADS=1 .venv/bin/python play_pocket.py
OPENBLAS_NUM_THREADS=1 .venv/bin/python play_staged.py --stage pocket
```

원본 결과: `runs/pocket_geometry_test02/summary.json`, `runs/pocket_normal_test02/summary.json`. 각 폴더의 `sources/`, `manifest.json`으로 동결 소스와 조건을 추적한다. 실행 안내는 `POCKET_README.md`.

## 시험 출력 원문

```text
test_closed_component_and_opening_route (test_pocket.PocketTests.test_closed_component_and_opening_route) ... ok
test_impossible_pocket_and_invalidated_orbit (test_pocket.PocketTests.test_impossible_pocket_and_invalidated_orbit) ... ok
test_opening_exits_and_returns_to_food (test_pocket.PocketTests.test_opening_exits_and_returns_to_food) ... ok
test_pending_boost_and_turn_are_rolled_before_orbit (test_pocket.PocketTests.test_pending_boost_and_turn_are_rolled_before_orbit) ... ok
test_small_snake_completes_multiple_laps (test_pocket.PocketTests.test_small_snake_completes_multiple_laps) ... ok
test_sparse_grid_matches_dense_collision_threshold (test_pocket.PocketTests.test_sparse_grid_matches_dense_collision_threshold) ... ok
test_unenclosed_food_action_matches_predict_baseline (test_pocket.PocketTests.test_unenclosed_food_action_matches_predict_baseline) ... ok
test_body_and_wall_override_arbitrarily_rich_food (test_staged.StagedTests.test_body_and_wall_override_arbitrarily_rich_food) ... ok
test_circle_keeps_geometric_route_without_body_following (test_staged.StagedTests.test_circle_keeps_geometric_route_without_body_following) ... ok
test_coil_does_not_start_small_or_without_neighbours (test_staged.StagedTests.test_coil_does_not_start_small_or_without_neighbours) ... ok
test_coil_follows_observed_body_after_closure (test_staged.StagedTests.test_coil_follows_observed_body_after_closure) ... ok
test_coil_resets_and_rejoins_activity (test_staged.StagedTests.test_coil_resets_and_rejoins_activity) ... ok
test_collision_unavoidable_is_not_labelled_safe (test_staged.StagedTests.test_collision_unavoidable_is_not_labelled_safe) ... ok
test_cover_degenerate_and_endpoints (test_staged.StagedTests.test_cover_degenerate_and_endpoints) ... ok
test_cruising_enemy_can_suddenly_boost (test_staged.StagedTests.test_cruising_enemy_can_suddenly_boost) ... ok
test_emergency_separates_buffer_breach_from_contact (test_staged.StagedTests.test_emergency_separates_buffer_breach_from_contact) ... ok
test_open_space_and_food (test_staged.StagedTests.test_open_space_and_food) ... ok
test_pending_commands_change_prediction (test_staged.StagedTests.test_pending_commands_change_prediction) ... ok
test_predict_avoids_approaching_head (test_staged.StagedTests.test_predict_avoids_approaching_head) ... ok
test_reference_factory_uses_preserved_circle_policy (test_staged.StagedTests.test_reference_factory_uses_preserved_circle_policy) ... ok
test_emergency_cannot_excuse_camping (test_active.ActivityTests.test_emergency_cannot_excuse_camping) ... ok
test_invalid_environment_prevents_certification (test_active.ActivityTests.test_invalid_environment_prevents_certification) ... ok
test_no_heads_and_outer_ring_are_not_active (test_active.ActivityTests.test_no_heads_and_outer_ring_are_not_active) ... ok
test_short_run_cannot_certify_ten_minutes (test_active.ActivityTests.test_short_run_cannot_certify_ten_minutes) ... ok
test_temporary_escape_then_return (test_active.ActivityTests.test_temporary_escape_then_return) ... ok
test_missing_opponents_invalidate_episode (test_active.CheckpointTests.test_missing_opponents_invalidate_episode) ... ok
test_resumed_world_and_policy_match_uninterrupted (test_active.CheckpointTests.test_resumed_world_and_policy_match_uninterrupted) ... ok
test_crossing_and_degenerate_segments (test_active.GeometryTests.test_crossing_and_degenerate_segments) ... ok
test_head_crossing_is_synchronized (test_active.GeometryTests.test_head_crossing_is_synchronized) ... ok
test_oncoming_boost_head_is_avoided (test_active.PolicyTests.test_oncoming_boost_head_is_avoided) ... ok
test_open_space_holds_heading (test_active.PolicyTests.test_open_space_holds_heading) ... ok
test_queue_is_part_of_forecast (test_active.PolicyTests.test_queue_is_part_of_forecast) ... ok
test_reachable_envelope_covers_switching_maneuvers (test_active.PolicyTests.test_reachable_envelope_covers_switching_maneuvers) ... ok
test_reset_clears_previous_life (test_active.PolicyTests.test_reset_clears_previous_life) ... ok
test_safe_food_side_is_selected (test_active.PolicyTests.test_safe_food_side_is_selected) ... ok
test_wall_food_cannot_override_safety (test_active.PolicyTests.test_wall_food_cannot_override_safety) ... ok
test_deferred_spawn_preserves_request_and_recovers (test_active.WorldTests.test_deferred_spawn_preserves_request_and_recovers) ... ok
test_empty_world_can_rebuild_and_respawn (test_active.WorldTests.test_empty_world_can_rebuild_and_respawn) ... ok
test_own_body_does_not_mask_foreign_collision (test_active.WorldTests.test_own_body_does_not_mask_foreign_collision) ... ok
test_pending_command_and_respawn_queue (test_active.WorldTests.test_pending_command_and_respawn_queue) ... ok
test_retry_preserves_requested_population_traits (test_active.WorldTests.test_retry_preserves_requested_population_traits) ... ok
test_spawn_never_silently_accepts_bad_candidate (test_active.WorldTests.test_spawn_never_silently_accepts_bad_candidate) ... ok
test_integer_wire_state_and_assumed_queue (test_live_staged.AdapterTests.test_integer_wire_state_and_assumed_queue) ... ok
test_nickname_format (test_live_staged.AdapterTests.test_nickname_format) ... ok
test_observation_and_command_on_local_mock (test_live_staged.BrowserBoundaryTests.test_observation_and_command_on_local_mock) ... ok
test_integer_zero_matches_float_angle (test_live_active.LiveObservationTests.test_integer_zero_matches_float_angle) ... ok
test_nonfinite_scalar_rejected (test_live_active.LiveObservationTests.test_nonfinite_scalar_rejected) ... ok

----------------------------------------------------------------------
Ran 47 tests in 12.990s

OK

```

## 보존 확인 원문

```json
{
  "staged.py": true,
  "staged_reference.py": true,
  "sim_active.py": true,
  "brain.py": true,
  "geometry.py": true,
  "activity.py": true,
  "evaluate_active.py": true,
  "active.py": true
}
```

## runs/pocket_geometry_test02/summary.json 결과 원문 발췌 (trace 제외)

```json
[
  {
    "controller": "coil",
    "kind": "closed",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 605,
      "escape": 295
    },
    "decision_ms_p95": 64.85522736329585,
    "decision_ms_max": 216.68722000322305,
    "wall_seconds": 22.47605391399702,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "closed",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 706,
      "escape": 194
    },
    "decision_ms_p95": 53.5429326177108,
    "decision_ms_max": 120.3263649949804,
    "wall_seconds": 18.38322983501712,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "offset",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 671,
      "escape": 229
    },
    "decision_ms_p95": 65.39793433476005,
    "decision_ms_max": 117.22721098340116,
    "wall_seconds": 17.71180403800099,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "offset",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 831,
      "escape": 69
    },
    "decision_ms_p95": 35.46101436368188,
    "decision_ms_max": 121.4881080086343,
    "wall_seconds": 11.36057593699661,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "ellipse",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 49.61423355416627,
    "decision_ms_max": 101.57141799572855,
    "wall_seconds": 27.80033802599064,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "ellipse",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 24.573652740218673,
    "decision_ms_max": 41.38645401690155,
    "wall_seconds": 14.033109361014795,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "opening",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 1100.0,
    "gain": 1000.0,
    "cause": null,
    "modes": {
      "forage": 861,
      "escape": 39
    },
    "decision_ms_p95": 24.752228944271266,
    "decision_ms_max": 127.68708198564127,
    "wall_seconds": 10.06821761498577,
    "escaped": true,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "opening",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 1100.0,
    "gain": 1000.0,
    "cause": null,
    "modes": {
      "forage": 875,
      "escape": 25
    },
    "decision_ms_p95": 16.19766009534942,
    "decision_ms_max": 189.73544600885361,
    "wall_seconds": 8.194088063988602,
    "escaped": true,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "closed",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 605,
      "escape": 295
    },
    "decision_ms_p95": 65.87048838846385,
    "decision_ms_max": 135.9369629935827,
    "wall_seconds": 23.104476228996646,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "closed",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 706,
      "escape": 194
    },
    "decision_ms_p95": 69.81497864908302,
    "decision_ms_max": 140.24581800913438,
    "wall_seconds": 22.237260879017413,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "offset",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 671,
      "escape": 229
    },
    "decision_ms_p95": 76.01455694966715,
    "decision_ms_max": 227.9029310157057,
    "wall_seconds": 25.83124270098051,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "offset",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 831,
      "escape": 69
    },
    "decision_ms_p95": 33.07479285140289,
    "decision_ms_max": 105.4237489879597,
    "wall_seconds": 9.216393921989948,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "ellipse",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 22.348047693958506,
    "decision_ms_max": 46.38061099103652,
    "wall_seconds": 13.29930620000232,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "ellipse",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 27.063263776653894,
    "decision_ms_max": 86.14336099708453,
    "wall_seconds": 14.772825387015473,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "opening",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 1100.0,
    "gain": 1000.0,
    "cause": null,
    "modes": {
      "forage": 861,
      "escape": 39
    },
    "decision_ms_p95": 13.045715331099924,
    "decision_ms_max": 99.2402030096855,
    "wall_seconds": 6.1255629579827655,
    "escaped": true,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "opening",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 1100.0,
    "gain": 1000.0,
    "cause": null,
    "modes": {
      "forage": 875,
      "escape": 25
    },
    "decision_ms_p95": 7.023882279463573,
    "decision_ms_max": 83.03634001640603,
    "wall_seconds": 4.836264887999278,
    "escaped": true,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "closed",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "pocket_loop": 900
    },
    "decision_ms_p95": 21.9293061454664,
    "decision_ms_max": 42.79260101611726,
    "wall_seconds": 11.61429449901334,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "closed",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "pocket_loop": 900
    },
    "decision_ms_p95": 22.50366674707038,
    "decision_ms_max": 38.81937201367691,
    "wall_seconds": 10.997065518982708,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "offset",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "pocket_loop": 900
    },
    "decision_ms_p95": 56.15668708342126,
    "decision_ms_max": 126.6249920008704,
    "wall_seconds": 21.422076529008336,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "offset",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "pocket_loop": 900
    },
    "decision_ms_p95": 48.27913375484055,
    "decision_ms_max": 155.52827800274827,
    "wall_seconds": 19.52905489501427,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "ellipse",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "pocket_loop": 900
    },
    "decision_ms_p95": 37.884775345446535,
    "decision_ms_max": 164.8159040196333,
    "wall_seconds": 17.973609191016294,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "ellipse",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "pocket_loop": 900
    },
    "decision_ms_p95": 44.46536466130053,
    "decision_ms_max": 127.45768000604585,
    "wall_seconds": 17.883790315012448,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "opening",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 1100.0,
    "gain": 1000.0,
    "cause": null,
    "modes": {
      "pocket_loop": 124,
      "exit": 28,
      "forage": 748
    },
    "decision_ms_p95": 14.640655701805365,
    "decision_ms_max": 57.181273004971445,
    "wall_seconds": 6.093467804021202,
    "escaped": true,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "opening",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 1100.0,
    "gain": 1000.0,
    "cause": null,
    "modes": {
      "pocket_loop": 124,
      "exit": 32,
      "forage": 744
    },
    "decision_ms_p95": 17.83144005021312,
    "decision_ms_max": 69.706847978523,
    "wall_seconds": 7.411385180981597,
    "escaped": true,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "shrinking",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 39.43333333333366,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "forage": 124,
      "escape": 468
    },
    "decision_ms_p95": 24.00767084764084,
    "decision_ms_max": 46.589467994635925,
    "wall_seconds": 9.442579481983557,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "too_small",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 0.19999999999999998,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "escape": 3
    },
    "decision_ms_p95": 27.92207357706502,
    "decision_ms_max": 28.367882972816005,
    "wall_seconds": 0.07588245600345545,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "too_small",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 0.19999999999999998,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "escape": 3
    },
    "decision_ms_p95": 21.10110358626116,
    "decision_ms_max": 21.439957985421643,
    "wall_seconds": 0.05979755902080797,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "shrinking",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 44.000000000000064,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "forage": 162,
      "escape": 498
    },
    "decision_ms_p95": 28.73665464867371,
    "decision_ms_max": 46.6575640020892,
    "wall_seconds": 11.007306304993108,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "open_food",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 150.0,
    "gain": 50.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 1.8609387465403413,
    "decision_ms_max": 9.295478026615456,
    "wall_seconds": 1.1478218010161072,
    "escaped": false,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "open_food",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 150.0,
    "gain": 50.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 1.515596290118992,
    "decision_ms_max": 2.241809997940436,
    "wall_seconds": 1.0432575170125347,
    "escaped": false,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "intruder",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "escape": 900
    },
    "decision_ms_p95": 28.163680843135808,
    "decision_ms_max": 69.28933301242068,
    "wall_seconds": 18.732665840012487,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "coil",
    "kind": "intruder",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "escape": 900
    },
    "decision_ms_p95": 25.964883637789157,
    "decision_ms_max": 51.377887022681534,
    "wall_seconds": 18.53343452399713,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "too_small",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 0.19999999999999998,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "escape": 3
    },
    "decision_ms_p95": 29.687528900103644,
    "decision_ms_max": 30.129555001622066,
    "wall_seconds": 0.07782325200969353,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "too_small",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 0.19999999999999998,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "escape": 3
    },
    "decision_ms_p95": 30.75089089688845,
    "decision_ms_max": 30.78655499848537,
    "wall_seconds": 0.08332475001225248,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "shrinking",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 39.43333333333366,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "forage": 124,
      "escape": 468
    },
    "decision_ms_p95": 24.62886134599102,
    "decision_ms_max": 44.562141003552824,
    "wall_seconds": 9.721173486992484,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "shrinking",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 44.000000000000064,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "forage": 162,
      "escape": 498
    },
    "decision_ms_p95": 23.789648187812414,
    "decision_ms_max": 36.472925974521786,
    "wall_seconds": 10.107149911986198,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "open_food",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 150.0,
    "gain": 50.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 1.4020436021382918,
    "decision_ms_max": 1.967165997484699,
    "wall_seconds": 0.944065135990968,
    "escaped": false,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "open_food",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 150.0,
    "gain": 50.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 1.453821737959515,
    "decision_ms_max": 2.768189995549619,
    "wall_seconds": 0.9753275990078691,
    "escaped": false,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "shrinking",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 48.866666666666454,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "pocket_loop": 642,
      "no_loop": 91
    },
    "decision_ms_p95": 33.33976381691173,
    "decision_ms_max": 46.56138300197199,
    "wall_seconds": 7.331147430988494,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "intruder",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "escape": 900
    },
    "decision_ms_p95": 27.208406504360024,
    "decision_ms_max": 35.85484798531979,
    "wall_seconds": 18.42302208399633,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "too_small",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 0.19999999999999998,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "no_loop": 3
    },
    "decision_ms_p95": 38.69614359282423,
    "decision_ms_max": 38.72733499156311,
    "wall_seconds": 0.10935343499295413,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "too_small",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 0.19999999999999998,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "no_loop": 3
    },
    "decision_ms_p95": 51.44449270446785,
    "decision_ms_max": 52.48050100635737,
    "wall_seconds": 0.12944515401613899,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "predict",
    "kind": "intruder",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "escape": 900
    },
    "decision_ms_p95": 26.875516559812237,
    "decision_ms_max": 50.23198400158435,
    "wall_seconds": 18.026493559009396,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "shrinking",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 52.133333333332935,
    "alive": false,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": "barrier",
    "modes": {
      "pocket_loop": 691,
      "no_loop": 91
    },
    "decision_ms_p95": 27.704296345473264,
    "decision_ms_max": 47.18225300894119,
    "wall_seconds": 7.436568898992846,
    "escaped": false,
    "food_eaten": 0,
    "success": false,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "open_food",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 150.0,
    "gain": 50.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 5.608618032420052,
    "decision_ms_max": 9.869981004158035,
    "wall_seconds": 1.7318864389962982,
    "escaped": false,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "intruder",
    "seed": 72100,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "pocket_loop": 881,
      "no_loop": 19
    },
    "decision_ms_p95": 21.602093614637838,
    "decision_ms_max": 59.72992000170052,
    "wall_seconds": 7.9132414170017,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "intruder",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 100.0,
    "gain": 0.0,
    "cause": null,
    "modes": {
      "pocket_loop": 900
    },
    "decision_ms_p95": 18.63241727696731,
    "decision_ms_max": 37.07993699936196,
    "wall_seconds": 7.218852288002381,
    "escaped": false,
    "food_eaten": 0,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  },
  {
    "controller": "pocket",
    "kind": "open_food",
    "seed": 72101,
    "cap_s": 60.0,
    "seconds": 59.999999999999154,
    "alive": true,
    "L_end": 150.0,
    "gain": 50.0,
    "cause": null,
    "modes": {
      "forage": 900
    },
    "decision_ms_p95": 4.083123445161617,
    "decision_ms_max": 8.28227199963294,
    "wall_seconds": 1.5530883510073181,
    "escaped": false,
    "food_eaten": 1,
    "success": true,
    "scope": "prescribed geometry only; not reactive opponents or activity-qualified play"
  }
]
```

## runs/pocket_normal_test02/summary.json 결과 원문 발췌 (trace 제외)

```json
[
  {
    "controller": "coil",
    "kind": "normal",
    "seed": 73100,
    "cap_s": 90.0,
    "seconds": 89.99999999999746,
    "alive": true,
    "L_end": 740.7674121001755,
    "gain": 640.7674121001755,
    "cause": null,
    "modes": {
      "forage": 1314,
      "escape": 36
    },
    "decision_ms_p95": 60.813948512077296,
    "decision_ms_max": 350.10836299625225,
    "wall_seconds": 107.65526938199764,
    "activity_ok": true,
    "off_s": 11.59999999999997,
    "off_fraction": 0.1657142857142913,
    "max_off_streak_s": 8.533333333333314,
    "unexcused_off_s": 1.6666666666666685,
    "valid": true,
    "population_fraction": 0.9998888888888889,
    "success": true
  },
  {
    "controller": "coil",
    "kind": "normal",
    "seed": 73101,
    "cap_s": 90.0,
    "seconds": 89.99999999999746,
    "alive": true,
    "L_end": 735.3882110842377,
    "gain": 635.3882110842377,
    "cause": null,
    "modes": {
      "forage": 1290,
      "escape": 60
    },
    "decision_ms_p95": 61.19224080175627,
    "decision_ms_max": 214.75176702369936,
    "wall_seconds": 107.99843149501248,
    "activity_ok": false,
    "off_s": 15.33333333333329,
    "off_fraction": 0.21904761904762637,
    "max_off_streak_s": 9.399999999999977,
    "unexcused_off_s": 1.8000000000000023,
    "valid": true,
    "population_fraction": 1.0,
    "success": false
  },
  {
    "controller": "predict",
    "kind": "normal",
    "seed": 73100,
    "cap_s": 90.0,
    "seconds": 89.99999999999746,
    "alive": true,
    "L_end": 740.7674121001755,
    "gain": 640.7674121001755,
    "cause": null,
    "modes": {
      "forage": 1314,
      "escape": 36
    },
    "decision_ms_p95": 18.43740364856785,
    "decision_ms_max": 55.85210499702953,
    "wall_seconds": 47.530383528006496,
    "activity_ok": true,
    "off_s": 11.59999999999997,
    "off_fraction": 0.1657142857142913,
    "max_off_streak_s": 8.533333333333314,
    "unexcused_off_s": 1.6666666666666685,
    "valid": true,
    "population_fraction": 0.9998888888888889,
    "success": true
  },
  {
    "controller": "pocket",
    "kind": "normal",
    "seed": 73100,
    "cap_s": 90.0,
    "seconds": 89.99999999999746,
    "alive": true,
    "L_end": 1118.1966064539436,
    "gain": 1018.1966064539436,
    "cause": null,
    "modes": {
      "forage": 633,
      "escape": 23,
      "exit": 683,
      "pocket_loop": 7,
      "no_loop": 4
    },
    "decision_ms_p95": 22.511578742705748,
    "decision_ms_max": 126.32753798970953,
    "wall_seconds": 48.627144166996004,
    "activity_ok": false,
    "off_s": 54.13333333333282,
    "off_fraction": 0.7733333333333541,
    "max_off_streak_s": 44.13333333333339,
    "unexcused_off_s": 18.533333333333413,
    "valid": true,
    "population_fraction": 0.9998888888888889,
    "success": false
  },
  {
    "controller": "predict",
    "kind": "normal",
    "seed": 73101,
    "cap_s": 90.0,
    "seconds": 89.99999999999746,
    "alive": true,
    "L_end": 735.3882110842377,
    "gain": 635.3882110842377,
    "cause": null,
    "modes": {
      "forage": 1290,
      "escape": 60
    },
    "decision_ms_p95": 23.42637431720503,
    "decision_ms_max": 89.6771170082502,
    "wall_seconds": 50.022260700003244,
    "activity_ok": false,
    "off_s": 15.33333333333329,
    "off_fraction": 0.21904761904762637,
    "max_off_streak_s": 9.399999999999977,
    "unexcused_off_s": 1.8000000000000023,
    "valid": true,
    "population_fraction": 1.0,
    "success": false
  },
  {
    "controller": "pocket",
    "kind": "normal",
    "seed": 73101,
    "cap_s": 90.0,
    "seconds": 39.20000000000034,
    "alive": false,
    "L_end": 142.25440512971903,
    "gain": 42.25440512971903,
    "cause": "body:other",
    "modes": {
      "forage": 371,
      "escape": 17,
      "exit": 153,
      "pocket_loop": 32,
      "no_loop": 15
    },
    "decision_ms_p95": 30.841118554235436,
    "decision_ms_max": 143.34339700872079,
    "wall_seconds": 21.431159330997616,
    "activity_ok": false,
    "off_s": 17.733333333333373,
    "off_fraction": 0.923611111111097,
    "max_off_streak_s": 17.733333333333373,
    "unexcused_off_s": 0.0,
    "valid": true,
    "population_fraction": 1.0,
    "success": false
  }
]
```

## runs/pocket_geometry_test02/manifest.json

```json
{
  "args": {
    "frozen": false,
    "out": "runs/pocket_geometry_test02",
    "cases": "closed,offset,ellipse,opening,shrinking,too_small,intruder,open_food",
    "controllers": "coil,predict,pocket",
    "seed0": 72100,
    "seeds": 2,
    "seconds": 60.0,
    "workers": 3
  },
  "hashes": {
    "pocket.py": "d7db008a8f6069c47ba2f852afea8a1e3c02090c2adf13a91be7b6d92466093a",
    "pocket_scenarios.py": "2ebfee418a45208f98af38137d22c92be26e45da4e52bc5d4e02568f611fdfbe",
    "evaluate_pocket.py": "43c0748104a2bfa1e2d0c599bd5bb04d815a08b00d74127c493069419a735ce4",
    "staged.py": "f4283060b792f66e746da412023b92f2906f4a2909962a59cefb7eb07b81c361",
    "staged_reference.py": "671771c86d2f9f1a1867715c3c1f28b50b603ca9f779a442907c46f6bef57fe7",
    "sim_active.py": "62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1",
    "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9",
    "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68",
    "activity.py": "b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87",
    "evaluate_active.py": "63f8f4b8d3e64d453a99bc2e4841cc4d8b61aacf0055a38ba2ad06949db7d12a",
    "active.py": "5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757"
  },
  "created": "2026-09-24T13:19:28+0900",
  "note": "Synthetic fixtures and reactive normal play are reported separately. No live trial."
}
```

## runs/pocket_normal_test02/manifest.json

```json
{
  "args": {
    "frozen": false,
    "out": "runs/pocket_normal_test02",
    "cases": "normal",
    "controllers": "coil,predict,pocket",
    "seed0": 73100,
    "seeds": 2,
    "seconds": 90.0,
    "workers": 2
  },
  "hashes": {
    "pocket.py": "d7db008a8f6069c47ba2f852afea8a1e3c02090c2adf13a91be7b6d92466093a",
    "pocket_scenarios.py": "2ebfee418a45208f98af38137d22c92be26e45da4e52bc5d4e02568f611fdfbe",
    "evaluate_pocket.py": "43c0748104a2bfa1e2d0c599bd5bb04d815a08b00d74127c493069419a735ce4",
    "staged.py": "f4283060b792f66e746da412023b92f2906f4a2909962a59cefb7eb07b81c361",
    "staged_reference.py": "671771c86d2f9f1a1867715c3c1f28b50b603ca9f779a442907c46f6bef57fe7",
    "sim_active.py": "62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1",
    "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9",
    "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68",
    "activity.py": "b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87",
    "evaluate_active.py": "63f8f4b8d3e64d453a99bc2e4841cc4d8b61aacf0055a38ba2ad06949db7d12a",
    "active.py": "5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757"
  },
  "created": "2026-09-24T13:19:30+0900",
  "note": "Synthetic fixtures and reactive normal play are reported separately. No live trial."
}
```

## 채택 판단과 남은 문제

새 pocket은 합성 출구 개방 2/2에서 탈출 후 먹이를 수집했다. 계속 줄어드는 포위에서는 평균 50.50초로 대조군 41.72초보다 오래 버텼지만 모두 사망했다. 이 수치는 각 2판의 관측이며 일반적 개선의 증거가 아니다.

일반 환경에서 pocket은 73101에서 39.2초에 다른 몸체와 충돌했고, 73100은 90초 생존했으나 활동 조건을 충족하지 못했다. 새 기능을 기본값으로 채택하지 않는다. 73100에서 활동 구역 밖 비율 77.3%, 탈출 모드 판단 683/1350회였으며, 73101에서는 구역 밖 비율 92.4%였다. 이 비율은 기존 평가의 초기 유예 이후 기준이다.

코드상 완전히 닫힌 포위뿐 아니라 방향 차단 비율 75% 이상도 방어를 시작하게 한다. 일반 혼잡을 포위로 과하게 판단해 탈출을 오래 유지했을 가능성은 후속 검토 가설이다. 이번 저장 결과만으로 사망의 인과 원인이나 이 변경만의 개선 효과를 확정하지 않는다. 다음 보완 대상은 방어 진입 조건과 탈출 종료·활동 구역 복귀다.
