# Selection visibility: V8-1 / V10-1 only

User: 아닌것 같다. V8-1. V10-1 만 남기고 다 숨겨줘

Implemented UI-only hiding: Control Profile buttons now only V8-1/V10-1. Factory preset dropdown shows v81_density/v101_hybrid; saved custom presets for these two modes remain visible. Other preset data/controller code retained; hidden active preset is represented by a disabled current-settings placeholder without forcing a mode switch. Adjustment tab mode-activation switches are hidden. Existing algorithm parameters/data are not removed. Saved shortcuts/history still exist. No new games.

## result.json
```json
{
  "buttons": [
    "V8-1",
    "V10-1"
  ],
  "presetOptions": [
    "v81_density",
    "v101_hybrid"
  ],
  "bothSelectionsWork": true,
  "pilotUnchanged": true,
  "paramsUnchanged": true,
  "errors": []
}
```
## windows_applied.json
```json
{
  "applied": true,
  "version": "1001-0726b441",
  "existingSettingsPreserved": true,
  "activePreset": "v101_hybrid",
  "newPresetAvailable": true,
  "playing": false
}
```
## manifest.json
```json
{
  "build": "1001-0726b441",
  "hashes": {
    "ext/mod.js": "19009c887e6637aeecbc713de611a331296a19a7f2a02bad93bc50b1d82210f9",
    "ext/pilot.js": "abf8b50c4b41d95eecd88a3d4c0f91b309d5fc87c54cc0b0c3e4634fe90c3a16",
    "params.json": "f35bba51f03edb79f19c0636c55970e9b96d5b8ffc1aa0733abf20082496778b",
    "ext/params.js": "e7c50815ffcc5228a53b97176de6ac541f6f0c68b6ca69195224006373430e51",
    "ext/manifest.json": "1600aa0ed481b1e688f654d54b742338506cd2fe70a61df35d9bfc55e52d1c90"
  }
}
```
