# T3 user correction to16px and actual restart

User direct request: 아니다 16px

Verified raw runtime output; target16px is an experimental choice, not a measured safe offset. Production code unchanged.

```json
{
  "user_direct_request": "아니다 16px",
  "launch": {
    "pid": 1238875,
    "started": "2026-10-02 10:10:48",
    "user_request": "아니다 16px",
    "start_gap_px": 16,
    "previous_run": "runs/t3_20261002_100238"
  },
  "continuation": {
    "updated": "2026-10-02 10:10:48",
    "scope": "Continue observed alive-gap measurements; no production safe offset asserted",
    "state": "collecting",
    "batch": 1,
    "pid": 1238876,
    "start_gap": 16,
    "speed_request": "cruise",
    "log": "research/t3_rebuild_20261002/gap16_continued_01.log",
    "max_additional_batches": 4
  },
  "build": "1002-11dad5e1",
  "initial_values": {
    "T3_ON": 1,
    "T3_GAP0": 16,
    "T3_SPEED": 0
  },
  "execution_lines": [
    "OUT runs/t3_20261002_101048 BUILD 1002-11dad5e1",
    "SERVER 181.41.140.178:444",
    "START 1 TARGET nearest_long"
  ],
  "first_trace": {
    "t3_on": 1,
    "t3_set": 16,
    "t3_phase": "align"
  }
}
```
