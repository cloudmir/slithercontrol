---
record_schema: 1
id: claim-pocket-live-connection-errors-20260924
kind: claim
status: supported
as_of: 2026-09-24
checked_at: 2026-09-24
depends_on:
  - decision-pocket-live-20260924
  - decision-pocket-live-repeat-20260924
evidence_refs:
  - path: .workspace/sources/pocket-live-error-20260924.md
    hash: 762e8aeada994d738ac928a5e80a2b70500ef945b505e5b07780dd2b654fd51f
    locator: 두 실행 결과 JSON의 status와 Page.goto 오류
dependency_hashes:
  decision-pocket-live-20260924: 11fbb55799472ced73ea4a49457a4c5a98eab5ea9824aff4961d85895f36ea45
  decision-pocket-live-repeat-20260924: f293f057312884b74d0335f34fddf01f392513bfc6d9af3e645f16674d829920
revision: 01e017c1-21f9-4ebf-a8af-340c131e13c9
---

# Pocket 실사이트 접속 2회 모두 게임 시작 전 시간 초과

2026-09-24 13:29:39와 13:31:35 시작 실행은 각각 http://slither.io/ 페이지의 domcontentloaded를 30초 기다리다 시간 초과로 종료됐다. 두 번째는 사용자의 “다시 실행해봐”에 따른 명시적 추가 실행이다. 브라우저를 닫았고 각 실행에서 자동 재시도는 하지 않았다. 원문 로그를 save_source→read_source로 확인했다.

두 실행 모두 플레이 시작 전 오류이므로 포위 방어 성능·사망 성적으로 집계하지 않는다. 사이트 장애·네트워크 문제·차단 여부 등 근본 원인은 미확인이다. 현재 당일 예약 로그는 coil 실제 게임 1회와 pocket 접속 오류 2회로 총 3회, 기존 정책상 오류도 한도에 포함하여 남은 예약 2회다. 직전 종료 후 임의 선택된 최소 간격 83초를 충족했다.

정책 pocket.py 해시는 d7db008a8f6069c47ba2f852afea8a1e3c02090c2adf13a91be7b6d92466093a로 로컬 시험 버전과 동일하다. 실사이트 어댑터에 선택 연결을 추가했으며 기본 coil은 유지한다. 로컬 관측·명령 연결 검사 5개를 통과했다.
