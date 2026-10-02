---
record_schema: 1
id: fact-v6-live-preflight-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
depends_on:
  - fact-v6-two-layer-20260930
dependency_hashes:
  fact-v6-two-layer-20260930: fa62318ed55fd65c9836521290624d54b07d5b0450be1c8f28e07c375f3640bc
revision: e45a4b63-aa8b-4792-91a0-3c442304e82b
---
# V6 실게임 사전 연결 실패 — 게임 0판

빌드 `0930-ae56343a`로 Windows Chrome 수집기를 문서 방식(`GUIDE_WINDOWS_CHROME_TEST.md`, `setsid nohup`, 포트 9224)으로 두 번 시작했으나 게임 접속 전에 종료됐다. 결과 `runs/v6live_20260930_115201/summary.json`은 `games: []`이며 실게임 노출은 0판이다.

확인된 직접 원인은 현재 Codex 실행 샌드박스가 Windows interop의 vsock 생성을 차단해 `powershell.exe`가 `UtilBindVsockAnyPort:307 socket failed 1`로 끝나는 것이다. 일반 WSL 터미널에서 `research/mod_deaths_live.py`를 시작한 뒤에는 이 샌드박스에서도 생성되는 로그를 읽고 판별할 수 있다. 샌드박스 밖에서도 같은 오류일 때만 Windows의 `wsl --shutdown`이 필요하다.
