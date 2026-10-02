# V10-2 food quantity switch implementation and verification

User request: 군집 먹이량 슬라이더·켜기/끄기 추가. 기준 이상의 먹이이면 먹이 추종, 미만이면 회피. 먹이 추종 머리 빨강, 회피 머리 파랑.

Design: independent V102_ON and v102_food preset using persistent original V8 food (V1 pilotStep) and rolled-back V10 avoidance controllers. V102_FOOD_ON enabled: largest observed cluster mass >= V102_FOOD_MIN selects feed, lower selects avoid immediately. Off: original V10-1 head-count/body-density/clear-hold conditions. Original V1 short-path safety remains active in food mode. This switch is not a survival guarantee.

Quantity definition: all positive finite observed uneaten pellet sizes (sz) are summed in fixed world-coordinate grid cells; maximum cell sum is compared, not global sum. Default threshold100, radius3000px, cell160px; editable. Threshold slider0–5000 step10, linear raw sum; zero accepts empty food. Initial defaults are implementation choices, not measured optimum. Grid boundaries can split one visual food pile. No actual caloric/game-score quantity claim.

Color: canvas filled head disc red #ff3030 for feed and blue #3080ff for avoidance. Only active bot in V10-2; independent of path overlay switches. Mode and measured quantity/threshold shown. Existing controller functions unchanged. Prior rolled-back emergency and wire-input changes remain absent. New diagnostics logged. Other mode presets retained; version buttons wrap to avoid clipping.

Validation purpose: switching threshold direction, toggle fallback, actual controller dispatch and head color match; pass criteria boundary equality feeds, below avoids, increasing threshold can change feed to avoid, original functions unchanged, red/blue draw observed, no page errors. No new live game.

## manifest
```json
{
  "build": "1001-2331f7d6",
  "hashes": {
    "ext/pilot.js": "2222536bf9a53238d39eb24baa125bb0f4b63638a03e6eb64a0a4c429fdb3b2c",
    "ext/mod.js": "e233e158f53857843ba66d792a9867c0ff01def44a3a8b4833596e2afa2f9e97",
    "ext/params.js": "aa1f26d80fa878ca8379590e5f1e53dd7afcb4c0397724e5a4ec360ce1e7258e",
    "ext/manifest.json": "77af36555b9bd73756595208bec2f6eb5e60da9c8f03ee6aec7a012c46af5750",
    "params.json": "e3e1455e3a0066b17017ea60797e0ea4fcf0b7d5b8104777fab922af712766fb"
  }
}
```

## checks
```json
{
  "originalFunctionsUnchanged": 5,
  "thresholdEqualityFeeds": true,
  "sliderMonotonic": true,
  "separateClustersNotSummed": true,
  "outOfRadiusExcluded": true,
  "allFoodSizes": true,
  "invalidFoodExcluded": true,
  "switchOffUsesV101": true,
  "zeroThresholdFeeds": true,
  "controllerParityFrames": 6
}
```

## mock
```json
{
  "feedMode": "feed",
  "avoidMode": "v10replan",
  "thresholdSliderChangesPhase": true,
  "toggleOffUsesOriginalCondition": true,
  "toggleOnLowFoodAvoids": true,
  "headColors": [
    "#ff3030",
    "#3080ff"
  ],
  "presetPersistence": true,
  "otherModesPreserved": true,
  "errors": [],
  "scope": "local mock, real Workers; no live games"
}
```

## browser
```json
{
  "applied": true,
  "version": "1001-2331f7d6",
  "existingSettingsPreserved": true,
  "activePreset": "v101_hybrid",
  "newPresetAvailable": true,
  "playing": false
}
```

