# V11 original V8 feed + proximity V10 avoidance

User requested V11 for V8 food following with V10 when close.

{
  "manifest": {
    "build": "1001-d24493c6",
    "hashes": {
      "ext/pilot.js": "8f9e90e8d87001822b90197609bfc04723fa80b9e2a841897eab48f43946863a",
      "ext/mod.js": "49e0f30c7db4bec453ff3914f2bcd77f59cceda906c3a5ecaf1d423079c63d15",
      "ext/params.js": "7e2b620efae385c74fe43eb0f5dea12722014f09ca5fa2f8ea3bc216d85a326d",
      "ext/manifest.json": "d005a42b07926b1a0c1574580f38fbb65a8f586f301118a082d2e08d52538e98",
      "params.json": "e40b944f8d90d159ca77f6d0f149e09ca1bc6af213cd4cea71cc7fa1efab1287"
    }
  },
  "checks": {
    "originalFunctionsUnchanged": 5,
    "singleNearHead": true,
    "farHeadFeeds": true,
    "bodyGapMeasured": 55.5,
    "bodyOnlyAvoid": true,
    "disabledConditions": true,
    "clearHoldReturn": true,
    "controllerParityFrames": 8,
    "realSurvivalTest": false
  },
  "mock": {
    "feedMode": "cruise",
    "avoidMode": "v10replan",
    "singleNearHead": true,
    "bodyOnlyTrigger": true,
    "returnHold": true,
    "presetPersistence": true,
    "standaloneV10Preserved": true,
    "errors": [],
    "scope": "local mock and real Workers; no live game"
  },
  "browser": {
    "applied": false,
    "reason": "game_in_progress"
  },
  "design": {
    "feeding": "original V8 V1 controller",
    "avoidance": "rolled-back V10 controller",
    "head_distance_px": 250,
    "body_display_gap_px": 80,
    "clear_hold_s": 1,
    "defaults_are_design_assumptions": true,
    "distances_adjustable": true,
    "no_live_survival_test": true
  }
}
