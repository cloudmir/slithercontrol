# V10-1 implementation and local verification

User: V8 feeding + same V8-1 conditions -> V10 avoidance.

{
  "manifest": {
    "build": "1001-989fe63d",
    "hashes": {
      "ext/pilot.js": "a1a0a987e44f572dca8ddce163085eb8d1bb3c74316c7b383d26f95b1055d157",
      "ext/mod.js": "4cd345906bd1b43768d67aa90b3b5d348d20e77b16d836499b3a0e89b16f5c70",
      "ext/params.js": "061df1b33047d846ef625c75a0e7000e88ea0dbfe84fc31147c34246b60649d0",
      "ext/manifest.json": "df8388cd24cb9fed7c730778cc47cd7971dc10e73179cc9765b5dc1a269ad446",
      "params.json": "6eb8ef30e3b85daa0646367cda0e275531c0802cfe0d10e2d13c91205015a95b"
    }
  },
  "checks": {
    "originalFunctionsUnchanged": 6,
    "switchParity": true,
    "controllerParityFrames": 8,
    "persistentChildren": true,
    "paramUpdate": true,
    "liveSurvivalTest": false
  },
  "mock": {
    "feedMode": "cruise",
    "avoidMode": "v10replan",
    "sameHeadTrigger": true,
    "bodyOnlyTrigger": true,
    "returnHold": true,
    "presetPersistence": true,
    "standaloneV10Preserved": true,
    "errors": [],
    "scope": "local mock and real Workers; no live game"
  },
  "browser": {
    "applied": true,
    "version": "1001-989fe63d",
    "existingSettingsPreserved": true,
    "activePreset": "v10_layered",
    "newPresetAvailable": true,
    "playing": false
  },
  "limits": [
    "No new live game or survival effectiveness measurement",
    "Uses rolled-back V10; removed emergency recovery and wire-input correction were not restored"
  ]
}
