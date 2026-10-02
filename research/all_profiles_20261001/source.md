# 전체 프로필 선택 표시 복원

사용자 요청: 잠김 회피가 안되네.. 프로필을 다시 모두 보여줘. 회피가 안 된다는 표현은 사용자 관찰이며, 이번 작업에서 측정하지 않았다.

홈 버전 선택 버튼을 모두 복원하고, 프리셋 목록의 내장·사용자 프로필 필터를 해제했다. 조정 탭의 버전 스위치 숨김 필터를 해제했다. 최신 다른 세션 VA1 변경은 보존하고 VA1 선택 버튼도 추가했다. VA1에서 기존 버전 버튼 전환 시 VA1_ON을 해제해 선택한 버전이 실행되도록 연결했다. 이번 작업은 표시·선택 복원이며 회피 알고리즘을 수정하지 않았다. 기존 활성 프로필·설정·봇 상태를 유지하며 대기 브라우저에만 새 빌드를 적용한다. 게임 실행 없음.

## manifest.json

```json

{
  "build": "1001-641f8e58",
  "hashes": {
    "ext/mod.js": "68f02a5e8eac46c4e2f77e2b7764fbd98d4d50ea372be5007504e3f4eee4154f",
    "ext/pilot.js": "fc521c49f42e7e9dadafbdcccb3c05e0f2245311b556bc8fdb6dd6371a36c0f4",
    "ext/params.js": "1e5bbc324228dd04220f8864b8c83221496960fd3f5532e63a4fc073bbf62b4a",
    "ext/manifest.json": "f45a7156ff4e93d04a7b2b0d4db57d071b605c3b52268bda2090b63705a3bbc2",
    "params.json": "98b757bc70c65662793e2709f8ddc2205166acc75c20004d60dcc036f16a7af1"
  },
  "concurrentVA1ChangesPreserved": true
}

```

## result.json

```json

{
  "version": "1001-641f8e58",
  "buttons": [
    "VA1",
    "V1",
    "V2",
    "V3",
    "V4",
    "V4.1",
    "V5",
    "V6",
    "V7",
    "V8",
    "V8-1",
    "V10-2",
    "V11-1",
    "V11",
    "V10-1",
    "V10",
    "V9"
  ],
  "presetCount": 13,
  "allBuiltinsVisible": true,
  "selectionWorks": true,
  "wrapTogglePreserved": true,
  "errors": []
}

```

## windows_applied.json

```json

{
  "applied": true,
  "version": "1001-641f8e58",
  "existingSettingsPreserved": true,
  "activePreset": "공격형 조정",
  "newPresetAvailable": true,
  "playing": false
}

```
