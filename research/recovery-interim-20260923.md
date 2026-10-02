# 회피 PPO 중간 성능 원자료
기준시각 2026-09-23T22:44:07.458321+09:00

## plan.json
{
  "splits": {
    "train": [
      56000,
      56001,
      56003,
      56004,
      56005
    ],
    "validation": [
      56006
    ],
    "test": [
      56002,
      56007,
      56008
    ]
  },
  "lead_seconds": [
    2,
    4,
    6
  ],
  "recovery_after_original_death_s": 6,
  "whole_world_test_seeds": [
    57000,
    57001,
    57002
  ],
  "shield": false,
  "note": "Splits are by original death, not adjacent frames. All counterpart snakes remain reactive."
}

## validation_000000.json
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

## validation_016384.json
{
  "model": "runs/recovery_v1/models/ppo_016384.zip",
  "split": "validation",
  "death_events": 1,
  "windows": 3,
  "valid": 3,
  "recoveries": 3,
  "mean_survival": 9.999999999999432,
  "mean_survival_fraction": 0.9999999999999649,
  "model_sha256": "81638bc73e625ac5b74025deefbf7096ce919fddeccbd542ed1f4746069ec707",
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
      "gain": 38.82308387908324,
      "seed": 56006,
      "lead": 2,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 6.215891489991918,
      "decisions": 120,
      "boost_fraction": 0.008333333333333333,
      "snapshot_sha256": "bb886771e299ae20382568693bcbe839dda9e952c42a25b3a8ca97d80e3271d3"
    },
    {
      "is_success": true,
      "alive": true,
      "valid": true,
      "elapsed": 9.999999999999432,
      "original_death_after": 3.9999999999997726,
      "gain": 30.12359013999412,
      "seed": 56006,
      "lead": 4,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 7.846282259997679,
      "decisions": 150,
      "boost_fraction": 0.006666666666666667,
      "snapshot_sha256": "c53b2480c3eada3279b55294033bffc69a99a10d3ff90b622136322db25ff091"
    },
    {
      "is_success": true,
      "alive": true,
      "valid": true,
      "elapsed": 11.999999999999318,
      "original_death_after": 5.999999999999659,
      "gain": 0.5418409727399194,
      "seed": 56006,
      "lead": 6,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 7.814406420002342,
      "decisions": 180,
      "boost_fraction": 0.0,
      "snapshot_sha256": "b81a86de1aa3fa593fab2b3ee20027b059bc3e5eb1c23ff855001d7e6d6a3989"
    }
  ],
  "note": "Offsets from a single death are correlated, not independent trials. Survival here does not establish ten-minute success."
}

## validation_032768.json
{
  "model": "runs/recovery_v1/models/ppo_032768.zip",
  "split": "validation",
  "death_events": 1,
  "windows": 3,
  "valid": 3,
  "recoveries": 2,
  "mean_survival": 7.64444444444401,
  "mean_survival_fraction": 0.7055555555555331,
  "model_sha256": "b7361127589259d4a06ad5aa747ee989b2583c38a9f98eb417c81428e61e964d",
  "sources": {
    "evaluate_recovery.py": "55c5b2be35fa3837352fd704656e323f1f6d20af48c35b1206c08ddec7efc173",
    "recovery_env.py": "8142532b50676e3869d4c31f7eae3da9db9cd33bd3ed8039c8fefdf89a2335d5",
    "sim_active.py": "62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1"
  },
  "rows": [
    {
      "is_success": false,
      "alive": false,
      "valid": true,
      "elapsed": 0.9333333333332803,
      "original_death_after": 1.9999999999998863,
      "gain": 17.757253821103404,
      "seed": 56006,
      "lead": 2,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 0.5039335799956461,
      "decisions": 14,
      "boost_fraction": 0.07142857142857142,
      "snapshot_sha256": "bb886771e299ae20382568693bcbe839dda9e952c42a25b3a8ca97d80e3271d3"
    },
    {
      "is_success": true,
      "alive": true,
      "valid": true,
      "elapsed": 9.999999999999432,
      "original_death_after": 3.9999999999997726,
      "gain": -1.9286763791533303,
      "seed": 56006,
      "lead": 4,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 5.274394830004894,
      "decisions": 150,
      "boost_fraction": 0.006666666666666667,
      "snapshot_sha256": "c53b2480c3eada3279b55294033bffc69a99a10d3ff90b622136322db25ff091"
    },
    {
      "is_success": true,
      "alive": true,
      "valid": true,
      "elapsed": 11.999999999999318,
      "original_death_after": 5.999999999999659,
      "gain": 158.95604489524248,
      "seed": 56006,
      "lead": 6,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 6.201818910005386,
      "decisions": 180,
      "boost_fraction": 0.0,
      "snapshot_sha256": "b81a86de1aa3fa593fab2b3ee20027b059bc3e5eb1c23ff855001d7e6d6a3989"
    }
  ],
  "note": "Offsets from a single death are correlated, not independent trials. Survival here does not establish ten-minute success."
}

## validation_diagnostic_053248.json
{
  "model": "runs/recovery_v1/models/ppo_053248.zip",
  "split": "validation",
  "death_events": 1,
  "windows": 3,
  "valid": 3,
  "recoveries": 3,
  "mean_survival": 9.999999999999432,
  "mean_survival_fraction": 0.9999999999999649,
  "model_sha256": "f22999f60729c48cf4294ec2a56a15367c729eff895d74bc43d80a3b1148e3ee",
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
      "gain": 60.60429106918673,
      "seed": 56006,
      "lead": 2,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 7.9573328100086655,
      "decisions": 120,
      "boost_fraction": 0.008333333333333333,
      "snapshot_sha256": "bb886771e299ae20382568693bcbe839dda9e952c42a25b3a8ca97d80e3271d3"
    },
    {
      "is_success": true,
      "alive": true,
      "valid": true,
      "elapsed": 9.999999999999432,
      "original_death_after": 3.9999999999997726,
      "gain": 219.48163833270155,
      "seed": 56006,
      "lead": 4,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 8.538711479995982,
      "decisions": 150,
      "boost_fraction": 0.006666666666666667,
      "snapshot_sha256": "c53b2480c3eada3279b55294033bffc69a99a10d3ff90b622136322db25ff091"
    },
    {
      "is_success": true,
      "alive": true,
      "valid": true,
      "elapsed": 11.999999999999318,
      "original_death_after": 5.999999999999659,
      "gain": 173.81003331381635,
      "seed": 56006,
      "lead": 6,
      "population_fraction": 1.0,
      "shield_interventions": 0,
      "wall_s": 7.321670010001981,
      "decisions": 180,
      "boost_fraction": 0.0,
      "snapshot_sha256": "b81a86de1aa3fa593fab2b3ee20027b059bc3e5eb1c23ff855001d7e6d6a3989"
    }
  ],
  "note": "Offsets from a single death are correlated, not independent trials. Survival here does not establish ten-minute success."
}

## training.jsonl 최근 4행
{"complete": false, "steps": 49152, "leads": [2, 4, 6], "wall_s": 40.52410001998942, "episodes": 29, "successes": 6, "success_rate": 0.20689655172413793, "mean_life_s": 4.014942528735603, "invalid": 0, "model": "runs/recovery_v1/models/ppo_049152.zip", "shield_interventions": 0}
{"complete": false, "steps": 51200, "leads": [2, 4, 6], "wall_s": 48.6849606300093, "episodes": 27, "successes": 6, "success_rate": 0.2222222222222222, "mean_life_s": 4.204938271604901, "invalid": 0, "model": "runs/recovery_v1/models/ppo_051200.zip", "shield_interventions": 0}
{"complete": false, "steps": 53248, "leads": [2, 4, 6], "wall_s": 55.77173208000022, "episodes": 31, "successes": 4, "success_rate": 0.12903225806451613, "mean_life_s": 3.827956989247251, "invalid": 0, "model": "runs/recovery_v1/models/ppo_053248.zip", "shield_interventions": 0}
{"complete": false, "steps": 55296, "leads": [2, 4, 6], "wall_s": 42.50159172000713, "episodes": 36, "successes": 3, "success_rate": 0.08333333333333333, "mean_life_s": 3.666666666666648, "invalid": 0, "model": "runs/recovery_v1/models/ppo_055296.zip", "shield_interventions": 0}

## 최종 시험 파일 존재 확인
[]
[]
