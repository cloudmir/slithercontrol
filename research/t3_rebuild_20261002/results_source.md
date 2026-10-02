# T3 results snapshot verified against run records

User direct request: 지금까지의 결과를 알려줘

Measurement snapshot time and raw record population are below. Counts include ended games from the current build only; provisional live levels are excluded. The minimum alive gap is not a guaranteed safety offset. Requested boost and actual qualified boost speed are different.

```json
{
  "checked_at": "2026-10-02 11:47:40",
  "data_updated": "2026-10-02 11:47:29 KST",
  "build": "1002-11dad5e1",
  "ended_games": 94,
  "game_end_counts": {
    "death": 93,
    "cap": 1
  },
  "stable_levels": 98,
  "independent_games": 30,
  "speed_counts": {
    "cruise_speed": 98
  },
  "geometry_counts": {
    "gentle_curve": 80,
    "straight": 18
  },
  "qualified_death_candidates": 0,
  "lowest_level": {
    "t": 61.99,
    "target": 96,
    "episode": 5,
    "set": 8,
    "gap": 6.494380159465663,
    "duration": 1.4644999999999868,
    "samples": 43,
    "heading": 0.022878261894401675,
    "bend": 0.19203601975630846,
    "speed": 5.79,
    "own_r": 15.320754716981131,
    "enemy_r": 60.325471698113205,
    "geometry_class": "gentle_curve",
    "bend_max": 0.2915445765069453,
    "contact_bend_max": 0.03930211118421223,
    "gap_range": 2.900993915715219,
    "heading_max": 0.14972901179480758,
    "serial": 9,
    "requested_speed": 0,
    "gap_min": 5.551354356903715,
    "gap_max": 8.452348272618934,
    "lateral": 5.011070516456627,
    "boost": false,
    "speed_class": "cruise_speed",
    "enemy_speed": null,
    "game": 6,
    "run": "t3_20261002_101048",
    "kind": "alive",
    "protocol": "parallel_offset_t3_rebuild",
    "build": "1002-11dad5e1",
    "source": "/home/datawave/Work_AI/슬리더/runs/t3_20261002_101048/slp_06_log.json.gz"
  },
  "lowest_target": 8,
  "recent_games": [
    {
      "run": "t3_20261002_112638",
      "game": 6,
      "seconds": 14.1,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "사망 전 관측 시점 불확실",
        "다른 머리 간섭 가능"
      ]
    },
    {
      "run": "t3_20261002_113306",
      "game": 1,
      "seconds": 41.9,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음"
      ]
    },
    {
      "run": "t3_20261002_113306",
      "game": 2,
      "seconds": 55.5,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님"
      ]
    },
    {
      "run": "t3_20261002_113306",
      "game": 3,
      "seconds": 52.2,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님"
      ]
    },
    {
      "run": "t3_20261002_113306",
      "game": 4,
      "seconds": 10.6,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "다른 머리 간섭 가능"
      ]
    },
    {
      "run": "t3_20261002_113306",
      "game": 5,
      "seconds": 105.9,
      "levels": 3,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름"
      ]
    },
    {
      "run": "t3_20261002_113306",
      "game": 6,
      "seconds": 28.7,
      "levels": 2,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "빠른 수직 접근",
        "평행 주행 아님"
      ]
    },
    {
      "run": "t3_20261002_114036",
      "game": 1,
      "seconds": 72.9,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음"
      ]
    },
    {
      "run": "t3_20261002_114036",
      "game": 2,
      "seconds": 66.8,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "다른 머리 간섭 가능"
      ]
    },
    {
      "run": "t3_20261002_114036",
      "game": 3,
      "seconds": 80.4,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님",
        "접촉 구간 곡률 큼",
        "다른 머리 간섭 가능"
      ]
    },
    {
      "run": "t3_20261002_114036",
      "game": 4,
      "seconds": 39.5,
      "levels": 4,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님",
        "접촉 구간 곡률 큼",
        "사망 전 관측 시점 불확실"
      ]
    },
    {
      "run": "t3_20261002_114036",
      "game": 5,
      "seconds": 8.4,
      "levels": 0,
      "end": "death",
      "excluded": [
        "사망 전 추종 중 아님",
        "최근접 몸통이 추종 대상과 다름",
        "최근 2.5초 안정 유지 표본 없음",
        "빠른 수직 접근",
        "평행 주행 아님",
        "다른 머리 간섭 가능"
      ]
    }
  ],
  "exclusion_counts": {
    "사망 전 추종 중 아님": 93,
    "최근접 몸통이 추종 대상과 다름": 78,
    "최근 2.5초 안정 유지 표본 없음": 88,
    "평행 주행 아님": 57,
    "다른 머리 간섭 가능": 57,
    "빠른 수직 접근": 56,
    "사망 전 관측 시점 불확실": 15,
    "접촉 구간 곡률 큼": 13
  },
  "runs": [
    "t3_20261002_094249",
    "t3_20261002_094739",
    "t3_20261002_095256",
    "t3_20261002_100238",
    "t3_20261002_101048",
    "t3_20261002_101736",
    "t3_20261002_102528",
    "t3_20261002_103336",
    "t3_20261002_104400",
    "t3_20261002_105337",
    "t3_20261002_110217",
    "t3_20261002_110740",
    "t3_20261002_111437",
    "t3_20261002_112043",
    "t3_20261002_112638",
    "t3_20261002_113306",
    "t3_20261002_114036"
  ],
  "raw_record_end_counts": {
    "death": 93,
    "user_stop": 1
  },
  "raw_record_count": 94,
  "runtime": {
    "updated": "2026-10-02 11:48:08",
    "supervisor_pid": 1288059,
    "mode": "until_dataset_coverage",
    "global_batch_or_time_cap": null,
    "criteria": {
      "enemy_radius_bins": [
        "<20",
        "20–30",
        "30–40",
        "40–50",
        "≥50"
      ],
      "actual_speeds": [
        "cruise_speed",
        "boost_speed"
      ],
      "geometries": [
        "straight",
        "gentle_curve"
      ],
      "own_radius_bin_width_px": 2,
      "minimum_independent_alive_games": 3,
      "minimum_independent_qualified_death_games": 3,
      "closest_alive_gap_per_game_max_px": 0,
      "note": "Operational dataset coverage; not all continuous radii or a guaranteed safe offset."
    },
    "state": "collecting",
    "batch": 10,
    "pid": 1452511,
    "build": "1002-11dad5e1",
    "log": "research/t3_rebuild_20261002/continuous_20261002_103125_0010.log",
    "run": "runs/t3_20261002_114036",
    "start_gap": 16,
    "enemy_bin_request": 4,
    "speed_request": "cruise_speed",
    "completed_conditions": 0,
    "total_conditions": 20
  },
  "coverage": {
    "updated": "2026-10-02 11:40:36",
    "build": "1002-11dad5e1",
    "criteria": {
      "enemy_radius_bins": [
        "<20",
        "20–30",
        "30–40",
        "40–50",
        "≥50"
      ],
      "actual_speeds": [
        "cruise_speed",
        "boost_speed"
      ],
      "geometries": [
        "straight",
        "gentle_curve"
      ],
      "own_radius_bin_width_px": 2,
      "minimum_independent_alive_games": 3,
      "minimum_independent_qualified_death_games": 3,
      "closest_alive_gap_per_game_max_px": 0,
      "note": "Operational dataset coverage; not all continuous radii or a guaranteed safe offset."
    },
    "cells": [
      {
        "enemy_bin": 0,
        "enemy_radius_bin": "<20",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "straight",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 0,
        "enemy_radius_bin": "<20",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "gentle_curve",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 0,
        "enemy_radius_bin": "<20",
        "actual_speed_class": "boost_speed",
        "geometry_class": "straight",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 0,
        "enemy_radius_bin": "<20",
        "actual_speed_class": "boost_speed",
        "geometry_class": "gentle_curve",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 1,
        "enemy_radius_bin": "20–30",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "straight",
        "groups": [
          {
            "own_radius_bin": [
              14,
              16
            ],
            "alive_games": 1,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          }
        ],
        "complete": false
      },
      {
        "enemy_bin": 1,
        "enemy_radius_bin": "20–30",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "gentle_curve",
        "groups": [
          {
            "own_radius_bin": [
              14,
              16
            ],
            "alive_games": 2,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          }
        ],
        "complete": false
      },
      {
        "enemy_bin": 1,
        "enemy_radius_bin": "20–30",
        "actual_speed_class": "boost_speed",
        "geometry_class": "straight",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 1,
        "enemy_radius_bin": "20–30",
        "actual_speed_class": "boost_speed",
        "geometry_class": "gentle_curve",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 2,
        "enemy_radius_bin": "30–40",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "straight",
        "groups": [
          {
            "own_radius_bin": [
              16,
              18
            ],
            "alive_games": 1,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          }
        ],
        "complete": false
      },
      {
        "enemy_bin": 2,
        "enemy_radius_bin": "30–40",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "gentle_curve",
        "groups": [
          {
            "own_radius_bin": [
              14,
              16
            ],
            "alive_games": 8,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          },
          {
            "own_radius_bin": [
              16,
              18
            ],
            "alive_games": 3,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          }
        ],
        "complete": false
      },
      {
        "enemy_bin": 2,
        "enemy_radius_bin": "30–40",
        "actual_speed_class": "boost_speed",
        "geometry_class": "straight",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 2,
        "enemy_radius_bin": "30–40",
        "actual_speed_class": "boost_speed",
        "geometry_class": "gentle_curve",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 3,
        "enemy_radius_bin": "40–50",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "straight",
        "groups": [
          {
            "own_radius_bin": [
              14,
              16
            ],
            "alive_games": 3,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          }
        ],
        "complete": false
      },
      {
        "enemy_bin": 3,
        "enemy_radius_bin": "40–50",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "gentle_curve",
        "groups": [
          {
            "own_radius_bin": [
              16,
              18
            ],
            "alive_games": 6,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          },
          {
            "own_radius_bin": [
              14,
              16
            ],
            "alive_games": 11,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          },
          {
            "own_radius_bin": [
              20,
              22
            ],
            "alive_games": 1,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          }
        ],
        "complete": false
      },
      {
        "enemy_bin": 3,
        "enemy_radius_bin": "40–50",
        "actual_speed_class": "boost_speed",
        "geometry_class": "straight",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 3,
        "enemy_radius_bin": "40–50",
        "actual_speed_class": "boost_speed",
        "geometry_class": "gentle_curve",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 4,
        "enemy_radius_bin": "≥50",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "straight",
        "groups": [
          {
            "own_radius_bin": [
              20,
              22
            ],
            "alive_games": 1,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          },
          {
            "own_radius_bin": [
              14,
              16
            ],
            "alive_games": 3,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          }
        ],
        "complete": false
      },
      {
        "enemy_bin": 4,
        "enemy_radius_bin": "≥50",
        "actual_speed_class": "cruise_speed",
        "geometry_class": "gentle_curve",
        "groups": [
          {
            "own_radius_bin": [
              14,
              16
            ],
            "alive_games": 5,
            "near_boundary_alive_games": 0,
            "qualified_death_games": 0,
            "complete": false
          }
        ],
        "complete": false
      },
      {
        "enemy_bin": 4,
        "enemy_radius_bin": "≥50",
        "actual_speed_class": "boost_speed",
        "geometry_class": "straight",
        "groups": [],
        "complete": false
      },
      {
        "enemy_bin": 4,
        "enemy_radius_bin": "≥50",
        "actual_speed_class": "boost_speed",
        "geometry_class": "gentle_curve",
        "groups": [],
        "complete": false
      }
    ],
    "completed_conditions": 0,
    "total_conditions": 20
  },
  "raw_record_inventory": [
    {
      "run": "t3_20261002_094249",
      "game": 1,
      "record": "runs/t3_20261002_094249/slp_01.json",
      "record_sha256": "43418b624ea266fa2e53c1bad39815defc1570b60a8ea08164a2e1e420e3fb13",
      "end_reason": "death",
      "seconds": 10,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_094249",
      "game": 2,
      "record": "runs/t3_20261002_094249/slp_02.json",
      "record_sha256": "f22e3490a2225711bc5c086469a9f9d4ce154c4d8af884429b02be6bd960cd77",
      "end_reason": "death",
      "seconds": 44.4,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_094249",
      "game": 3,
      "record": "runs/t3_20261002_094249/slp_03.json",
      "record_sha256": "d8d8eb23990abb7a63b32b8a03d5e8b770c70237437fadeb3761579abc146093",
      "end_reason": "death",
      "seconds": 32.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_094739",
      "game": 1,
      "record": "runs/t3_20261002_094739/slp_01.json",
      "record_sha256": "b0f237b3d21bf8412fc5bf476922bce8dc2e2aeee0e51c0a13fa179fd685efa0",
      "end_reason": "death",
      "seconds": 13,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_094739",
      "game": 2,
      "record": "runs/t3_20261002_094739/slp_02.json",
      "record_sha256": "416ef63006ff159a33ba5c5ad9f168991fe37354bc21fca584924fe3278cb23d",
      "end_reason": "death",
      "seconds": 5.4,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_094739",
      "game": 3,
      "record": "runs/t3_20261002_094739/slp_03.json",
      "record_sha256": "fcaaa3ce3b8b2a8e55a3d9667341af4723f7c5bd3fe91a0e5f98df3ffd4449a9",
      "end_reason": "death",
      "seconds": 144.1,
      "analysis_levels": 14
    },
    {
      "run": "t3_20261002_095256",
      "game": 1,
      "record": "runs/t3_20261002_095256/slp_01.json",
      "record_sha256": "e94fcfc0cf036beb3a58f993c4a6763a4f0ab196af412b6ca198a4bc79c2f31f",
      "end_reason": "death",
      "seconds": 19.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_095256",
      "game": 2,
      "record": "runs/t3_20261002_095256/slp_02.json",
      "record_sha256": "c855377d71aeb844188c7aa2b4656c7eeaaf3596fe05acf331e4a13bc9cc9212",
      "end_reason": "death",
      "seconds": 26.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_095256",
      "game": 3,
      "record": "runs/t3_20261002_095256/slp_03.json",
      "record_sha256": "46787e5d47c07da9620ccf58bb23b713af0c3a8e0f941dfb5518bbb9612bbba9",
      "end_reason": "death",
      "seconds": 131.5,
      "analysis_levels": 5
    },
    {
      "run": "t3_20261002_095256",
      "game": 4,
      "record": "runs/t3_20261002_095256/slp_04.json",
      "record_sha256": "14838ce882fe123a548a1ceb50192ed88da8784a79fcdde78907a4023b933995",
      "end_reason": "death",
      "seconds": 103.8,
      "analysis_levels": 5
    },
    {
      "run": "t3_20261002_095256",
      "game": 5,
      "record": "runs/t3_20261002_095256/slp_05.json",
      "record_sha256": "43a89525adc4d8219b90c04136b74fb96cb74a38ba4b8dc6715705b8cb0024e8",
      "end_reason": "death",
      "seconds": 13.2,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_095256",
      "game": 6,
      "record": "runs/t3_20261002_095256/slp_06.json",
      "record_sha256": "4fb08ae917f769cde5b6d9c507b1ffe73b6ed6b0be9949663a69756859fa0c22",
      "end_reason": "death",
      "seconds": 139.9,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_100238",
      "game": 1,
      "record": "runs/t3_20261002_100238/slp_01.json",
      "record_sha256": "d5d8a1bbb7a8d5065f33059b5c8eea4f7dff3830234f97ccc2e95c7ca9ff6e27",
      "end_reason": "death",
      "seconds": 65.2,
      "analysis_levels": 2
    },
    {
      "run": "t3_20261002_100238",
      "game": 2,
      "record": "runs/t3_20261002_100238/slp_02.json",
      "record_sha256": "6760710c8038fa93427cfabcd65d51758b7092bff752576934df5a89aad777ff",
      "end_reason": "death",
      "seconds": 50.7,
      "analysis_levels": 4
    },
    {
      "run": "t3_20261002_100238",
      "game": 3,
      "record": "runs/t3_20261002_100238/slp_03.json",
      "record_sha256": "40a9b542ea159dc0302e9b452819db19725a8569587d80f85534e45acfe339aa",
      "end_reason": "death",
      "seconds": 137.1,
      "analysis_levels": 11
    },
    {
      "run": "t3_20261002_100238",
      "game": 4,
      "record": "runs/t3_20261002_100238/slp_04.json",
      "record_sha256": "78b9e253cb8ff4c0b44baee2f46b7f4c48fc7237a7cad99a9db475f1bef6ef41",
      "end_reason": "death",
      "seconds": 44,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_100238",
      "game": 5,
      "record": "runs/t3_20261002_100238/slp_05.json",
      "record_sha256": "5d5bd9943b202153c00b4be4cba4874c0d760f50e5986de504dfddb6c3701039",
      "end_reason": "user_stop",
      "seconds": 58.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101048",
      "game": 1,
      "record": "runs/t3_20261002_101048/slp_01.json",
      "record_sha256": "b4c3fe7e1678f86b573eb5ca1f9626b36597764a3e1f700ba3e839293d883b8f",
      "end_reason": "death",
      "seconds": 12.8,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101048",
      "game": 2,
      "record": "runs/t3_20261002_101048/slp_02.json",
      "record_sha256": "e71aad33b6265d64c549b6b165bfd7cc7b35f1a0ba8461b5c6129fc4c4170dd6",
      "end_reason": "death",
      "seconds": 19.6,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101048",
      "game": 3,
      "record": "runs/t3_20261002_101048/slp_03.json",
      "record_sha256": "b6b4f9682708f502dee97afe9bc2faeaf960bb975ac51c1e661c9499cd49f62c",
      "end_reason": "death",
      "seconds": 32.3,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101048",
      "game": 4,
      "record": "runs/t3_20261002_101048/slp_04.json",
      "record_sha256": "970b497dd40a0c93df81d806b56c8d309e1edcd0c0eb7db02d88e46c2d8f3b91",
      "end_reason": "death",
      "seconds": 66.8,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101048",
      "game": 5,
      "record": "runs/t3_20261002_101048/slp_05.json",
      "record_sha256": "72fefa1ab255907ae55b634005a3c371dfac17e71663d8b7791a802a2ffa55b2",
      "end_reason": "death",
      "seconds": 54.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101048",
      "game": 6,
      "record": "runs/t3_20261002_101048/slp_06.json",
      "record_sha256": "c779a0181dccacea865fce3b49bb219d82545d9dcf3d5bd1ffb80cfb23fe2f37",
      "end_reason": "death",
      "seconds": 94.8,
      "analysis_levels": 9
    },
    {
      "run": "t3_20261002_101736",
      "game": 1,
      "record": "runs/t3_20261002_101736/slp_01.json",
      "record_sha256": "cde43588b700457a1f7f37116f38d3f28480d743a9c296d1326c9a6693536a53",
      "end_reason": "death",
      "seconds": 59.1,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_101736",
      "game": 2,
      "record": "runs/t3_20261002_101736/slp_02.json",
      "record_sha256": "b9f0ff08a325cece9e70237c9f73dc0af40a8e44661a3dd1e372669c998f3157",
      "end_reason": "death",
      "seconds": 23,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101736",
      "game": 3,
      "record": "runs/t3_20261002_101736/slp_03.json",
      "record_sha256": "8d36be899c790df3688087b03f103d294d3a8c35591e60f5992a978c96f01064",
      "end_reason": "death",
      "seconds": 80,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101736",
      "game": 4,
      "record": "runs/t3_20261002_101736/slp_04.json",
      "record_sha256": "e6e57d2a750cc377b9f351b7520fb859037776ab34f37431e4115c1408d666df",
      "end_reason": "death",
      "seconds": 16.6,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_101736",
      "game": 5,
      "record": "runs/t3_20261002_101736/slp_05.json",
      "record_sha256": "2e27c0e663b46c32d6afafe0bab5fe7f326c9202937d25b70bd0ce830e1c2d96",
      "end_reason": "death",
      "seconds": 66.5,
      "analysis_levels": 5
    },
    {
      "run": "t3_20261002_101736",
      "game": 6,
      "record": "runs/t3_20261002_101736/slp_06.json",
      "record_sha256": "4368ca0afc1cfd2aa32ac61f631a6bbf1389d9fbaf113156cd965f98d73e366c",
      "end_reason": "death",
      "seconds": 64.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_102528",
      "game": 1,
      "record": "runs/t3_20261002_102528/slp_01.json",
      "record_sha256": "adf4bb93dbc872f7dd00d7be99c0a94196e33dd6f4433ed38e7e4f77ba71459a",
      "end_reason": "death",
      "seconds": 32.1,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_102528",
      "game": 2,
      "record": "runs/t3_20261002_102528/slp_02.json",
      "record_sha256": "5dd1af6408f8f49e81d3d6b2bd4a1d0284eb5c9ef5dcf59be3f6dbc3462908b3",
      "end_reason": "death",
      "seconds": 32.8,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_102528",
      "game": 3,
      "record": "runs/t3_20261002_102528/slp_03.json",
      "record_sha256": "daf5b4f223e6d5518dd9b3d8fc5f41444ad7ef3d5facd2bc9bb4c9bad30eab71",
      "end_reason": "death",
      "seconds": 46,
      "analysis_levels": 5
    },
    {
      "run": "t3_20261002_102528",
      "game": 4,
      "record": "runs/t3_20261002_102528/slp_04.json",
      "record_sha256": "c1aab8fd816db327018f61ee155d09c1153d43dd5462270700ad134b4146bd03",
      "end_reason": "death",
      "seconds": 90.6,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_102528",
      "game": 5,
      "record": "runs/t3_20261002_102528/slp_05.json",
      "record_sha256": "138c595f544c0ed6cef754ca8d2f245967565cb748162a529e30d9ef2e597c23",
      "end_reason": "death",
      "seconds": 62.2,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_102528",
      "game": 6,
      "record": "runs/t3_20261002_102528/slp_06.json",
      "record_sha256": "b3d4328ea069e6c74f4075c2fa3ab8242c6113b3a70ed2a21221d73625aad120",
      "end_reason": "death",
      "seconds": 77.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_103336",
      "game": 1,
      "record": "runs/t3_20261002_103336/slp_01.json",
      "record_sha256": "2b6be98e7680dc78f2f9bfa72db05567b3a8e0fde897771bbd2f8bc1151fc0e4",
      "end_reason": "death",
      "seconds": 87.9,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_103336",
      "game": 2,
      "record": "runs/t3_20261002_103336/slp_02.json",
      "record_sha256": "591a08aadcae12f8661e51e8137b179f99ae3492b8e2c2ab281c570cd5b27796",
      "end_reason": "death",
      "seconds": 79.5,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_103336",
      "game": 3,
      "record": "runs/t3_20261002_103336/slp_03.json",
      "record_sha256": "b2de1e4c477e50cd0330538a9262ea46c6929975e3d43de55b20124b2ea1a969",
      "end_reason": "death",
      "seconds": 48.4,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_103336",
      "game": 4,
      "record": "runs/t3_20261002_103336/slp_04.json",
      "record_sha256": "3de2874d3e7333b12b20c25fbcdeba8dd8e0cb928b2e4f4273ef0c2269a40c24",
      "end_reason": "death",
      "seconds": 103.5,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_103336",
      "game": 5,
      "record": "runs/t3_20261002_103336/slp_05.json",
      "record_sha256": "c7efc10086dbcd759bdb4ee0934ec32093bcb6c05e6b936bfdbef5e0fa4c5772",
      "end_reason": "death",
      "seconds": 29.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_103336",
      "game": 6,
      "record": "runs/t3_20261002_103336/slp_06.json",
      "record_sha256": "96ce44868ebb41ebee6508c9248548f1962a2a8a7c27c1b32242b40752a03598",
      "end_reason": "death",
      "seconds": 115,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_104400",
      "game": 1,
      "record": "runs/t3_20261002_104400/slp_01.json",
      "record_sha256": "3cd424cbcbfd24afd20ced29a4471968f975657a1899315bb747063b7188331d",
      "end_reason": "death",
      "seconds": 91.8,
      "analysis_levels": 2
    },
    {
      "run": "t3_20261002_104400",
      "game": 2,
      "record": "runs/t3_20261002_104400/slp_02.json",
      "record_sha256": "8eb992d5d1ec8058838e9a903a96a81c6ac8f22bd1a26192b42d1de36d1b4381",
      "end_reason": "death",
      "seconds": 51.9,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_104400",
      "game": 3,
      "record": "runs/t3_20261002_104400/slp_03.json",
      "record_sha256": "b8a91933e20d344c8801714ee529222badc871f2c956031a9d195a8c1e3a1702",
      "end_reason": "death",
      "seconds": 34.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_104400",
      "game": 4,
      "record": "runs/t3_20261002_104400/slp_04.json",
      "record_sha256": "6851f376d93ffd1e8f2638ab28353e73f8a13c9149aa1a2e1aa97bcaf671f7f6",
      "end_reason": "death",
      "seconds": 95.1,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_104400",
      "game": 5,
      "record": "runs/t3_20261002_104400/slp_05.json",
      "record_sha256": "fa5c88b56bb8ed9eedfa505d8056a3919bacea6ab463c487b94f1f880d2cca36",
      "end_reason": "death",
      "seconds": 16.4,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_104400",
      "game": 6,
      "record": "runs/t3_20261002_104400/slp_06.json",
      "record_sha256": "634a044307736a55ca55ef66f842f434a84b32c99a4cb72bdd2343ae51b51aab",
      "end_reason": "death",
      "seconds": 112.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_105337",
      "game": 1,
      "record": "runs/t3_20261002_105337/slp_01.json",
      "record_sha256": "d7d76c519fc08db71c4e1b8265caeb9677cf0d366e2172445847f9a451cb16d7",
      "end_reason": "death",
      "seconds": 21,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_105337",
      "game": 2,
      "record": "runs/t3_20261002_105337/slp_02.json",
      "record_sha256": "d235f2fbb4dd2f96d7798072511463baed15489c08be9bcf236f3f6d2d7973da",
      "end_reason": "death",
      "seconds": 52.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_105337",
      "game": 3,
      "record": "runs/t3_20261002_105337/slp_03.json",
      "record_sha256": "8f58f90b61b2c90221f5744cfadf57605e9ac803ed454bccc451dfd6dcb1a03f",
      "end_reason": "death",
      "seconds": 57.3,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_105337",
      "game": 4,
      "record": "runs/t3_20261002_105337/slp_04.json",
      "record_sha256": "157f1782c307816b3158816b070166c5d0c4f85ff9136d90083eea56e266130f",
      "end_reason": "death",
      "seconds": 53.8,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_105337",
      "game": 5,
      "record": "runs/t3_20261002_105337/slp_05.json",
      "record_sha256": "5692828f710f44d3ddd56722e4e1bf8213d62bce260abbba5fa6c92b080b472d",
      "end_reason": "death",
      "seconds": 168.7,
      "analysis_levels": 4
    },
    {
      "run": "t3_20261002_105337",
      "game": 6,
      "record": "runs/t3_20261002_105337/slp_06.json",
      "record_sha256": "03706cf0c9715e6515c125d1d5aedc41cc500ab718ebd3895fa74ec4106ce926",
      "end_reason": "death",
      "seconds": 16.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110217",
      "game": 1,
      "record": "runs/t3_20261002_110217/slp_01.json",
      "record_sha256": "50d10e87b06188fe08220fac6aa2b8322dc12afe9b240b16599b1d2f3363f35c",
      "end_reason": "death",
      "seconds": 53.5,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_110217",
      "game": 2,
      "record": "runs/t3_20261002_110217/slp_02.json",
      "record_sha256": "2a3d8b1739703e76fdf42e3d3dc8fb73c11180f6feb92fbd56b184048ed1f912",
      "end_reason": "death",
      "seconds": 27.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110217",
      "game": 3,
      "record": "runs/t3_20261002_110217/slp_03.json",
      "record_sha256": "f691c5b43f97274c1c9a3cb2126947e16c44d7c9a7db07fcebd567a40c019a42",
      "end_reason": "death",
      "seconds": 13.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110217",
      "game": 4,
      "record": "runs/t3_20261002_110217/slp_04.json",
      "record_sha256": "c0939976df972640a8eb401d8590192ac98aa17e2378bbfcd9d8c511e66e1c18",
      "end_reason": "death",
      "seconds": 57.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110217",
      "game": 5,
      "record": "runs/t3_20261002_110217/slp_05.json",
      "record_sha256": "fafecfb8edd5ea6ad2fa9a1f1e62e0017d1a4437b29ad4e6d3825b8f411457ca",
      "end_reason": "death",
      "seconds": 43.1,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110217",
      "game": 6,
      "record": "runs/t3_20261002_110217/slp_06.json",
      "record_sha256": "921d3b297191db4f3d68b7c1ea33625e284016b3e9e4ecac7176971fa8d70e24",
      "end_reason": "death",
      "seconds": 9.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110740",
      "game": 1,
      "record": "runs/t3_20261002_110740/slp_01.json",
      "record_sha256": "3772ba0082d8125f44ac6c4521cdf1dd36950f729d60e00d024d6750bda05f74",
      "end_reason": "death",
      "seconds": 34.6,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110740",
      "game": 2,
      "record": "runs/t3_20261002_110740/slp_02.json",
      "record_sha256": "d4961e38081abc7a2ef6b4f2f715c3b89e444a4239a49481ef4278dfcc1a9020",
      "end_reason": "death",
      "seconds": 44.1,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_110740",
      "game": 3,
      "record": "runs/t3_20261002_110740/slp_03.json",
      "record_sha256": "fbbf22cb36329035e8cc65e0ec8677b4b4a7de84bbf9bd214d0418b4354aac7c",
      "end_reason": "death",
      "seconds": 59.7,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110740",
      "game": 4,
      "record": "runs/t3_20261002_110740/slp_04.json",
      "record_sha256": "51910232bfec451ecae5641949edbe0f04085270a7e93f7d4a37447fb275f3d2",
      "end_reason": "death",
      "seconds": 14.2,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_110740",
      "game": 5,
      "record": "runs/t3_20261002_110740/slp_05.json",
      "record_sha256": "7d55dc42f3f7a332e69517bfff7bb32311424677d099424bcd4bca25bf13e4d2",
      "end_reason": "death",
      "seconds": 73.9,
      "analysis_levels": 3
    },
    {
      "run": "t3_20261002_110740",
      "game": 6,
      "record": "runs/t3_20261002_110740/slp_06.json",
      "record_sha256": "7569c19e1cc0f9f111b3f8da0ebcd4e71dc3038fe10b9e66a05612821527fbb7",
      "end_reason": "death",
      "seconds": 54,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_111437",
      "game": 1,
      "record": "runs/t3_20261002_111437/slp_01.json",
      "record_sha256": "5d8ccb1944c3df79c52b9aade67c53fe71353d1059eb12138c381ad3cef19d9a",
      "end_reason": "death",
      "seconds": 35.2,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_111437",
      "game": 2,
      "record": "runs/t3_20261002_111437/slp_02.json",
      "record_sha256": "995f52aca686d570d052ed2bef5024e4eb8015ca18503e3c351a8514d4deb669",
      "end_reason": "death",
      "seconds": 26.2,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_111437",
      "game": 3,
      "record": "runs/t3_20261002_111437/slp_03.json",
      "record_sha256": "59c84cf9dae313534d734cf02fe1a906764cee9c15d6b16b452fca861b082dbf",
      "end_reason": "death",
      "seconds": 51,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_111437",
      "game": 4,
      "record": "runs/t3_20261002_111437/slp_04.json",
      "record_sha256": "670ce3f79e9d27c623aa90c5df48fe27f2caf15f33bb93f02a703bd4c4447a14",
      "end_reason": "death",
      "seconds": 18.4,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_111437",
      "game": 5,
      "record": "runs/t3_20261002_111437/slp_05.json",
      "record_sha256": "f3a7850f1b41f71adafc3bb05520465261be868f37f7131aadbf4a3a9554e6e5",
      "end_reason": "death",
      "seconds": 30.5,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_111437",
      "game": 6,
      "record": "runs/t3_20261002_111437/slp_06.json",
      "record_sha256": "ad73cfc5aab64f003afd3ce0e8e5023caaafb7c8f5dfe39fa4b4ed5ac5454c1d",
      "end_reason": "death",
      "seconds": 68.3,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_112043",
      "game": 1,
      "record": "runs/t3_20261002_112043/slp_01.json",
      "record_sha256": "014c3ded076a7c00b3468119b8e3ebf7dd96868aacf26550a201b1c951638818",
      "end_reason": "death",
      "seconds": 4.8,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_112043",
      "game": 2,
      "record": "runs/t3_20261002_112043/slp_02.json",
      "record_sha256": "d7f07462f490b479c7376d9c424b382a555bc1c09e31c134fac73aa8e838a986",
      "end_reason": "death",
      "seconds": 14.4,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_112043",
      "game": 3,
      "record": "runs/t3_20261002_112043/slp_03.json",
      "record_sha256": "1f142682f3dd3347d1d3277ed6a3e1509ff01ee18e5ea20c7411df2567b0a766",
      "end_reason": "death",
      "seconds": 56.7,
      "analysis_levels": 5
    },
    {
      "run": "t3_20261002_112043",
      "game": 4,
      "record": "runs/t3_20261002_112043/slp_04.json",
      "record_sha256": "b7d83284b9f829fa7111d9fb4f3101c342ed3530ea1a44215a256382fea5fd7d",
      "end_reason": "death",
      "seconds": 61.9,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_112043",
      "game": 5,
      "record": "runs/t3_20261002_112043/slp_05.json",
      "record_sha256": "22926ea8226a3ad7be748eaa2e42f8773f679b95451f4af0bda7aec92d9d70c6",
      "end_reason": "death",
      "seconds": 24.6,
      "analysis_levels": 1
    },
    {
      "run": "t3_20261002_112043",
      "game": 6,
      "record": "runs/t3_20261002_112043/slp_06.json",
      "record_sha256": "f693a4a7c2abb15bd603c096649a762a19719192668e37817e448633becacf69",
      "end_reason": "death",
      "seconds": 46.7,
      "analysis_levels": 2
    },
    {
      "run": "t3_20261002_112638",
      "game": 1,
      "record": "runs/t3_20261002_112638/slp_01.json",
      "record_sha256": "b910ca0a67cbb83b72f8b0c059c30494726883d7224da3d6ae4dfe500249a648",
      "end_reason": "death",
      "seconds": 36.8,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_112638",
      "game": 2,
      "record": "runs/t3_20261002_112638/slp_02.json",
      "record_sha256": "78145d2ec8218b9a273217127b466ef40f4dc574baaeb473c9f70c18ac390a78",
      "end_reason": "death",
      "seconds": 35.3,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_112638",
      "game": 3,
      "record": "runs/t3_20261002_112638/slp_03.json",
      "record_sha256": "e7bda0e8429b611e7dd0289a8e4d1cf37a420c644b68e701257913a0fa1cae68",
      "end_reason": "death",
      "seconds": 12.1,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_112638",
      "game": 4,
      "record": "runs/t3_20261002_112638/slp_04.json",
      "record_sha256": "b32f4ebd7af9ec8e6ea60d3b9805983ccc69727c4fb23c19c7002c2f70e201f5",
      "end_reason": "death",
      "seconds": 125.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_112638",
      "game": 5,
      "record": "runs/t3_20261002_112638/slp_05.json",
      "record_sha256": "bca39d06b976610b1e04721c53e6c3e6517f33948fe62540c135270f5e69dd5d",
      "end_reason": "death",
      "seconds": 19.6,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_112638",
      "game": 6,
      "record": "runs/t3_20261002_112638/slp_06.json",
      "record_sha256": "a248a1906b70aad8e17442666fcec056730c16ec61bd4682a922fcc1c0cb5608",
      "end_reason": "death",
      "seconds": 14.1,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_113306",
      "game": 1,
      "record": "runs/t3_20261002_113306/slp_01.json",
      "record_sha256": "f0421d6cce1f0ad982e0b054de7a156bea29477d265a8a4070f351e2eb00cedb",
      "end_reason": "death",
      "seconds": 41.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_113306",
      "game": 2,
      "record": "runs/t3_20261002_113306/slp_02.json",
      "record_sha256": "d503fd98d6a13f0ca609582fdff31adebe2559dff64e9218ec8934db59b4b96f",
      "end_reason": "death",
      "seconds": 55.5,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_113306",
      "game": 3,
      "record": "runs/t3_20261002_113306/slp_03.json",
      "record_sha256": "f75c57c2716a5691111b9846c98580037865e192ed5e2add679ee00bc046cadb",
      "end_reason": "death",
      "seconds": 52.2,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_113306",
      "game": 4,
      "record": "runs/t3_20261002_113306/slp_04.json",
      "record_sha256": "2e3913f4010696341e70ac3b1958050e51ee22bbd297ae8e779e785b9e65111b",
      "end_reason": "death",
      "seconds": 10.6,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_113306",
      "game": 5,
      "record": "runs/t3_20261002_113306/slp_05.json",
      "record_sha256": "fc97abb8289cbc446beaadd5b990a382edfd322a03e76d867f54b129f46566df",
      "end_reason": "death",
      "seconds": 105.9,
      "analysis_levels": 3
    },
    {
      "run": "t3_20261002_113306",
      "game": 6,
      "record": "runs/t3_20261002_113306/slp_06.json",
      "record_sha256": "f34262a472ead3e2c66df761a82a2c8de50bd31eae60acac16a9e7df20b73c0e",
      "end_reason": "death",
      "seconds": 28.7,
      "analysis_levels": 2
    },
    {
      "run": "t3_20261002_114036",
      "game": 1,
      "record": "runs/t3_20261002_114036/slp_01.json",
      "record_sha256": "f329d52d8e2c7652ee111c178398a99532e9f1cb490e74c6b7ae4e6ae4841560",
      "end_reason": "death",
      "seconds": 72.9,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_114036",
      "game": 2,
      "record": "runs/t3_20261002_114036/slp_02.json",
      "record_sha256": "ccdc213310b8da971b40ce239c183a409ae09178d5e9c0f7b6defb9b8697b0a4",
      "end_reason": "death",
      "seconds": 66.8,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_114036",
      "game": 3,
      "record": "runs/t3_20261002_114036/slp_03.json",
      "record_sha256": "ad336a6f08364d336ce050ccaf1023378a255b0d6e549ae2a524aef81caa8249",
      "end_reason": "death",
      "seconds": 80.4,
      "analysis_levels": 0
    },
    {
      "run": "t3_20261002_114036",
      "game": 4,
      "record": "runs/t3_20261002_114036/slp_04.json",
      "record_sha256": "0b17ba2de793d7fbdd9a7eef5f540a51f634a2ee47c100eb97c77f44384fd1eb",
      "end_reason": "death",
      "seconds": 39.5,
      "analysis_levels": 4
    },
    {
      "run": "t3_20261002_114036",
      "game": 5,
      "record": "runs/t3_20261002_114036/slp_05.json",
      "record_sha256": "348ecb5b0a207b60cd369437ffc7f8ac978189d91c5c3d4cb680f50ef9078937",
      "end_reason": "death",
      "seconds": 8.4,
      "analysis_levels": 0
    }
  ]
}
```
