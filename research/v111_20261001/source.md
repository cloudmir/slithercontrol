# V11-1 scoped proximity avoidance revision

User request: V11 먹이 추종이 마음에 들며 근접에서 잘 죽는다는 사용자 관찰. 근접 알고리즘만 바꿔 V11-1 릴리즈 요청. Live collection was not restarted; the existing last completed user game was retrieved read-only.

Implementation: independent V111_ON, v111_near preset/button. Original V11 remains available. Same v11Choice near-head/body thresholds and clear-hold conditions. Original V1 food, original v10Step/v10World/v9World/v10Route and physics functions unchanged. V11-1 feed child has V111_ON=0 and uses exact original V1; avoidance child uses separate v111Step and dedicated exhaustive collision world only for failed-candidate diagnostic continuation. Current user's actual V11 parameters copied into the V11-1 preset, including W_FOOD6/W_GOAL300/BOOST_COST15; normal selection remains V11 until user chooses V11-1. Existing rolled-back global changes were not restored. A scoped new continuation mechanism addresses the same early-stop defect previously diagnosed.

Avoidance changes: 12 headings instead of8 including±.25/±1.5 rad, cruise/boost for collision-checked safe candidates, safe clearance ahead of boost preference or food bias. When root unsafe or all candidates fail, cruise-only candidates advance uniformly beyond first negative predicted clearance; lexicographic first-hit time, integrated negative gap, terminal gap, worst gap, unsafe duration. All remain unsafe; never claim a certified escape. 40ms simulated slices, max .6s, extra8ms soft budget checked after all candidates complete one slice, minimum .08s comparison horizon. Soft budget may be exceeded. Dedicated exhaustive world minimizes over all wall/head checks so wall iteration order doesn't select a shallower first hit. Original normal collision check and route behavior retained.

Evidence limits: observed37s V11 game last judgment v10emergency/near_head+body; no confirmed server collision cause. Same-observation replay changes late commands, not proven survival. In Node VM replay, late emergency calculations cost roughly13–23ms versus previous3–9ms; actual browser timing and live survival effects unverified. Mock checks confirm dispatch/transition, not actual multiplayer performance. No new live games started. Earlier user stop remains honored.

Validation success criteria: original functions unchanged, feed command parity, symmetric continued unsafe evaluation selects turning rather than straight in a constructed early-overlap case, unsafe paths never relabelled safe, wall-order independence, real Worker dispatch/near-head/body/return/preset and no page errors. Passed. Existing V11/V10-1/V10-2 checks and JS syntax passed.

## observations
```json
{
  "ext": "1001-2331f7d6",
  "preset": "v11_near",
  "seconds": 37,
  "profile": "aggressive",
  "modes": {
    "feed": 861,
    "evade": 4,
    "v10replan": 8,
    "v10route": 128,
    "v10emergency": 20
  },
  "errors": 0,
  "changes": [],
  "claim": "last completed observed V11 game, not proof of causal death reason"
}
```

## manifest
```json
{
  "build": "1001-61e47380",
  "hashes": {
    "ext/pilot.js": "abf8b50c4b41d95eecd88a3d4c0f91b309d5fc87c54cc0b0c3e4634fe90c3a16",
    "ext/mod.js": "854405dc8d301f80b8baca6911d27f75f632bb2b9b68c9913b37c6f6ccc1d9d5",
    "ext/params.js": "b6c9977d50a9a0180b3ad4c3787faf110d6fbe1a992368744c7ef00a85946eb3",
    "ext/manifest.json": "8a75fba524fafab5afb85b9b2fd78ea72ff4598aa75b52a97455c937132833e6",
    "params.json": "f35bba51f03edb79f19c0636c55970e9b96d5b8ffc1aa0733abf20082496778b"
  }
}
```

## checks
```json
{
  "originalFunctionsUnchanged": 7,
  "feedParityFrames": 12,
  "feedAlgorithmFlagOff": true,
  "allFailedTurnsEvaluated": true,
  "unsafeNotCertified": true,
  "wallOrderIndependent": true,
  "replay": [
    {
      "t": 35.897,
      "before": [
        1.2334760271614935,
        true
      ],
      "after": [
        1.2334760271614935,
        false
      ],
      "modeBefore": "v10replan",
      "modeAfter": "v10replan",
      "rootSafe": true,
      "recovery": false,
      "depth": null,
      "terminal": null,
      "evaluated": 0.9,
      "oldMs": 145.74674400000004,
      "newMs": 105.68982899999992
    },
    {
      "t": 36.023,
      "before": [
        0.15984494934298255,
        true
      ],
      "after": [
        1.6598449493429825,
        false
      ],
      "modeBefore": "v10replan",
      "modeAfter": "v10replan",
      "rootSafe": true,
      "recovery": false,
      "depth": null,
      "terminal": null,
      "evaluated": 0.9,
      "oldMs": 107.79040299999997,
      "newMs": 80.38700100000005
    },
    {
      "t": 36.231,
      "before": [
        3.8653206380689396,
        false
      ],
      "after": [
        3.8653206380689396,
        false
      ],
      "modeBefore": "v10replan",
      "modeAfter": "v10replan",
      "rootSafe": true,
      "recovery": false,
      "depth": null,
      "terminal": null,
      "evaluated": 0.9,
      "oldMs": 43.52142099999992,
      "newMs": 44.3127099999997
    },
    {
      "t": 36.422,
      "before": [
        1.1689710972195777,
        false
      ],
      "after": [
        0.6689710972195777,
        false
      ],
      "modeBefore": "v10emergency",
      "modeAfter": "v10emergency",
      "rootSafe": true,
      "recovery": true,
      "depth": 10.031441868202897,
      "terminal": -58.59415110020873,
      "evaluated": 0.24000000000000002,
      "oldMs": 3.107090999999855,
      "newMs": 22.940631999999823
    },
    {
      "t": 36.551,
      "before": [
        1.7614826563356056,
        false
      ],
      "after": [
        1.2614826563356056,
        false
      ],
      "modeBefore": "v10emergency",
      "modeAfter": "v10emergency",
      "rootSafe": false,
      "recovery": true,
      "depth": 7.078960165660063,
      "terminal": -68.94519866647519,
      "evaluated": 0.12,
      "oldMs": 3.980761000000257,
      "newMs": 17.38256999999976
    },
    {
      "t": 36.678,
      "before": [
        1.7614826563356056,
        false
      ],
      "after": [
        2.7614826563356054,
        false
      ],
      "modeBefore": "v10emergency",
      "modeAfter": "v10emergency",
      "rootSafe": false,
      "recovery": true,
      "depth": 16.201257432781603,
      "terminal": -74.27618336047492,
      "evaluated": 0.28,
      "oldMs": 6.935723000000053,
      "newMs": 17.30106999999998
    },
    {
      "t": 36.824,
      "before": [
        1.7614826563356052,
        false
      ],
      "after": [
        2.7614826563356054,
        false
      ],
      "modeBefore": "v10emergency",
      "modeAfter": "v10emergency",
      "rootSafe": false,
      "recovery": true,
      "depth": 19.01463607864545,
      "terminal": -93.25354010568628,
      "evaluated": 0.24000000000000002,
      "oldMs": 8.693478000000141,
      "newMs": 15.648845000000165
    },
    {
      "t": 36.951,
      "before": [
        1.7614826563356052,
        false
      ],
      "after": [
        2.7614826563356054,
        false
      ],
      "modeBefore": "v10emergency",
      "modeAfter": "v10emergency",
      "rootSafe": false,
      "recovery": true,
      "depth": 12.282475682624769,
      "terminal": -50.71943539736877,
      "evaluated": 0.24000000000000002,
      "oldMs": 4.3995050000003175,
      "newMs": 13.542790999999852
    }
  ],
  "limits": "fixed observations/model; no proven counterfactual survival"
}
```

## mock
```json
{
  "feedMode": "cruise",
  "avoidMode": "v10replan",
  "singleNearHead": true,
  "bodyOnlyTrigger": true,
  "returnHold": true,
  "presetPersistence": true,
  "standaloneV10Preserved": true,
  "avoidUsesV111": true,
  "feedV111Off": true,
  "errors": [],
  "scope": "local mock and real Workers; no live game"
}
```

## browser
```json
{
  "applied": true,
  "version": "1001-61e47380",
  "existingSettingsPreserved": true,
  "activePreset": "v11_near",
  "newPresetAvailable": true,
  "playing": false
}
```

