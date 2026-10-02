---
record_schema: 1
id: claim-pocket-live-windows-result-20260924
kind: claim
status: draft
as_of: 2026-09-24
depends_on:
  - decision-pocket-live-windows-20260924
dependency_hashes:
  decision-pocket-live-windows-20260924: c25c8370f891f53995b67559f4f2ad31beb0b86093844e61a3dd45f9205293af
revision: 026551c6-6942-44f3-ad06-505ecbe2b053
---

# pocket 실사이트 첫 실제 플레이 (Windows Chrome, 13:56:43 시작)

근거: runs/live_staged_20260924_135643.jsonl, runs/live_windows_pocket.log (로컬 로그, source 미보관이라 draft).

- 결과: 315.8초에 사망. 최대 길이 1041, 마지막 길이 1037, 최고 순위 12위.
- 모드별 결정 횟수: 먹이 수집 3032, 포위 내부 회전 971, 포위 탈출 69, 긴급 회피 23, 회전 경로 없음 191 (총 4287).
- 180~240초에 포위 내부 회전이 이어졌고, 270초 무렵 먹이 수집으로 돌아와 길이가 572에서 901로 늘었다.
- 결정 시간 p95 58.8ms로 결정 주기 66.7ms에 가깝다(여유 부족).
- Windows 중계 방식 첫 실사용 성공. 종료 후 디버깅용 Chrome 프로세스 0개 확인.
- 사망 원인은 확인하지 못했다(상태 기록 없음, 30초 간격 진행 로그만 있음). 표본 1판.
- 오늘 기록상 5/5 사용(실제 게임 2, 접속 오류 3).
