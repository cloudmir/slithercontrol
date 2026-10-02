# 2026-09-23 22:06 KST 프로젝트 현황 원자료

로컬 출력의 시점별 원문 보관. 이후 진행 상황과 구분한다.

## runs/recovery_v1/status_snapshot.json

SHA256: 774910ca2156fa53d8e91f241ff0c387c8c35dc9afcb9eecd8964df6b7bc31c6

```text
{
  "at": "2026-09-23T22:06:36.446449+09:00",
  "saved_models": [
    "ppo_000000.zip",
    "ppo_002048.zip",
    "ppo_004096.zip",
    "ppo_006144.zip",
    "ppo_008192.zip",
    "ppo_010240.zip",
    "ppo_012288.zip",
    "ppo_014336.zip",
    "ppo_016384.zip"
  ],
  "last_training": {
    "complete": false,
    "steps": 16384,
    "leads": [
      4,
      6
    ],
    "wall_s": 73.03731092999806,
    "episodes": 47,
    "successes": 0,
    "success_rate": 0.0,
    "mean_life_s": 2.8581560283689087,
    "invalid": 0,
    "model": "runs/recovery_v1/models/ppo_016384.zip",
    "shield_interventions": 0
  },
  "training_episodes": 427,
  "training_recoveries": 2,
  "validation": [
    {
      "model": "runs/recovery_v1/models/ppo_000000.zip",
      "windows": 3,
      "recoveries": 0,
      "mean_survival": 0.8888888888888383,
      "death_events": 1
    },
    {
      "model": "runs/recovery_v1/models/ppo_008192.zip",
      "windows": 3,
      "recoveries": 2,
      "mean_survival": 7.066666666666265,
      "death_events": 1
    }
  ],
  "reproduced_cases": [
    {
      "seed": 56000,
      "split": "train",
      "matched": 120
    },
    {
      "seed": 56001,
      "split": "train",
      "matched": 120
    },
    {
      "seed": 56002,
      "split": "test",
      "matched": 120
    },
    {
      "seed": 56003,
      "split": "train",
      "matched": 120
    },
    {
      "seed": 56004,
      "split": "train",
      "matched": 120
    },
    {
      "seed": 56005,
      "split": "train",
      "matched": 120
    },
    {
      "seed": 56006,
      "split": "validation",
      "matched": 120
    }
  ],
  "selected": false,
  "final_test_files": [],
  "regression": "_rotation_equivariance) ... ok\n\n----------------------------------------------------------------------\nRan 29 tests in 4.547s\n\nOK\n"
}
```

## runs/recovery_v1/validation_000000.json

SHA256: 7ec438182d5054c94813f5af62264f2b705fdbbd628a431bca92c264fd3f8d29

```text
{
  "model": "runs/recovery_v1/models/ppo_000000.zip",
  "split": "validation",
  "death_events": 1,
  "windows": 3,
  "valid": 3,
  "recoveries": 0,
  "mean_survival": 0.8888888888888383,
  "mean_survival_fraction": 0.09287037037036695,
  "rows": [
    {
      "is_success": false,
      "alive": false,
      "valid": true,
      "elapsed": 1.0999999999999375,
      "original_death_after": 1.9999999999998863,
      "gain": 60.612124365753516,
      "seed": 56006,
      "lead": 2,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 0.8897722200053977
    },
    {
      "is_success": false,
      "alive": false,
      "valid": true,
      "elapsed": 0.6333333333332973,
      "original_death_after": 3.9999999999997726,
      "gain": 7.323970057516817,
      "seed": 56006,
      "lead": 4,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 0.4562196299957577
    },
    {
      "is_success": false,
      "alive": false,
      "valid": true,
      "elapsed": 0.9333333333332803,
      "original_death_after": 5.999999999999659,
      "gain": -29.626483352354626,
      "seed": 56006,
      "lead": 6,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 0.659983409990673
    }
  ],
  "note": "Offsets from a single death are correlated, not independent trials. Survival here does not establish ten-minute success."
}
```

## runs/recovery_v1/validation_008192.json

SHA256: 883f8208b23d5f5a9d2206e702777e7b16c2fc0ae0936e4a86344c4417c89d66

```text
{
  "model": "runs/recovery_v1/models/ppo_008192.zip",
  "split": "validation",
  "death_events": 1,
  "windows": 3,
  "valid": 3,
  "recoveries": 2,
  "mean_survival": 7.066666666666265,
  "mean_survival_fraction": 0.7066666666666416,
  "model_sha256": "8ec2241fda0c8da0e72d878d1e0b4c0b4cd886ffdd9906498740c2067951e1b5",
  "sources": {
    "evaluate_recovery.py": "55c5b2be35fa3837352fd704656e323f1f6d20af48c35b1206c08ddec7efc173",
    "recovery_env.py": "8142532b50676e3869d4c31f7eae3da9db9cd33bd3ed8039c8fefdf89a2335d5",
    "sim_active.py": "62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1"
  },
  "rows": [
    {
      "is_success": true,
      "alive": true,
      "valid": true,
      "elapsed": 7.999999999999545,
      "original_death_after": 1.9999999999998863,
      "gain": 4.171290947499074,
      "seed": 56006,
      "lead": 2,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 6.4091044799861265,
      "decisions": 120,
      "boost_fraction": 0.125,
      "snapshot_sha256": "bb886771e299ae20382568693bcbe839dda9e952c42a25b3a8ca97d80e3271d3"
    },
    {
      "is_success": false,
      "alive": false,
      "valid": true,
      "elapsed": 1.1999999999999318,
      "original_death_after": 3.9999999999997726,
      "gain": 47.43913849228829,
      "seed": 56006,
      "lead": 4,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 0.8271897300001001,
      "decisions": 18,
      "boost_fraction": 0.3333333333333333,
      "snapshot_sha256": "c53b2480c3eada3279b55294033bffc69a99a10d3ff90b622136322db25ff091"
    },
    {
      "is_success": true,
      "alive": true,
      "valid": true,
      "elapsed": 11.999999999999318,
      "original_death_after": 5.999999999999659,
      "gain": -59.45091954588952,
      "seed": 56006,
      "lead": 6,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 8.91255590999208,
      "decisions": 180,
      "boost_fraction": 0.1388888888888889,
      "snapshot_sha256": "b81a86de1aa3fa593fab2b3ee20027b059bc3e5eb1c23ff855001d7e6d6a3989"
    }
  ],
  "note": "Offsets from a single death are correlated, not independent trials. Survival here does not establish ten-minute success."
}
```

## runs/recovery_v1/regression_tests.txt

SHA256: 291a932dd4b35b2f927c1b4480e58ed0a5a3b9cbfdc87cd311f12ccfd409f9bb

```text
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
test_no_planner_or_shield_called_by_rl_step (test_recovery.EnvironmentTests.test_no_planner_or_shield_called_by_rl_step) ... ok
test_original_controller_reproduces_death (test_recovery.EnvironmentTests.test_original_controller_reproduces_death) ... ok
test_reset_does_not_mutate_saved_world (test_recovery.EnvironmentTests.test_reset_does_not_mutate_saved_world) ... ok
test_splits_are_disjoint_original_events (test_recovery.EnvironmentTests.test_splits_are_disjoint_original_events) ... ok
test_direct_action_no_safety_filter (test_recovery.ObservationTests.test_direct_action_no_safety_filter) ... ok
test_finite_fixed_shape (test_recovery.ObservationTests.test_finite_fixed_shape) ... ok
test_rotation_equivariance (test_recovery.ObservationTests.test_rotation_equivariance) ... ok

----------------------------------------------------------------------
Ran 29 tests in 4.547s

OK

```

## runs/active_final_v5_planned_summary.json

SHA256: 01d81a862f3f5ebacc2c92c912d9a245f3cdc84515a66fc627efda8c77e29b2b

```text
{
  "plan": {
    "purpose": "independent first-life validation of candidate v5; frozen activity rules and population guard",
    "normal_seeds": [
      56000,
      56001,
      56002,
      56003,
      56004,
      56005,
      56006,
      56007,
      56008,
      56009
    ],
    "baseline_seeds": [
      56000,
      56001,
      56002
    ],
    "hard_seeds": [
      56500,
      56501,
      56502
    ],
    "seconds": 600,
    "rules": "runs/active_rules_v1.json",
    "target": 0.9,
    "missing_invalid_or_discontinued_prevent_certification": true
  },
  "planned": 19,
  "completed": 19,
  "missing": [],
  "summary": {
    "active/hard": {
      "attempted": 3,
      "valid": 3,
      "invalid": 0,
      "survival_rate": 0.0,
      "activity_success_rate": 0.0,
      "success_ci95": [
        0.0,
        0.7075982261787133
      ],
      "mean_life_s": 186.12222222221422,
      "mean_gain": 7567.059923494169,
      "mean_off_fraction": 0.11632437344446456,
      "target_90_certified": false
    },
    "active/normal": {
      "attempted": 10,
      "valid": 10,
      "invalid": 0,
      "survival_rate": 0.0,
      "activity_success_rate": 0.0,
      "success_ci95": [
        0.0,
        0.3084971078187607
      ],
      "mean_life_s": 280.3866666667044,
      "mean_gain": 11667.39351612395,
      "mean_off_fraction": 0.06782794555312177,
      "target_90_certified": false
    },
    "planner/normal": {
      "attempted": 3,
      "valid": 3,
      "invalid": 0,
      "survival_rate": 0.0,
      "activity_success_rate": 0.0,
      "success_ci95": [
        0.0,
        0.7075982261787133
      ],
      "mean_life_s": 208.39999999999682,
      "mean_gain": 4971.45423211208,
      "mean_off_fraction": 0.17654434097635385,
      "target_90_certified": false
    },
    "straight/normal": {
      "attempted": 3,
      "valid": 3,
      "invalid": 0,
      "survival_rate": 0.0,
      "activity_success_rate": 0.0,
      "success_ci95": [
        0.0,
        0.7075982261787133
      ],
      "mean_life_s": 154.4888888888884,
      "mean_gain": 706.2055193850347,
      "mean_off_fraction": 0.5327984395766548,
      "target_90_certified": false
    }
  }
}
```
