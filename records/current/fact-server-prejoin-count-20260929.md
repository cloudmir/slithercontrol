---
record_schema: 1
id: fact-server-prejoin-count-20260929
kind: fact
status: confirmed
as_of: 2026-09-29
checked_at: 2026-09-29
depends_on:
  - fact-cycle3-ab-20260927
evidence_refs:
  - sourceId: workspace-captures
    docId: .workspace/sources/slither-official-game-client-20260929.md
    versionId: 8f947576adb41c9d18f59e70052a501b8f3d6ce90676619fdcf4bed4cba80014
    locator: "official game client: server-list selection and leaderboard packet"
    quote: o.ac=ac ... o.wg=ac+5 ... slither_count=a[m]<<8|a[m+1]
  - sourceId: workspace-captures
    docId: .workspace/sources/clither-server-list-protocol-20260929.md
    versionId: 364eb0e4872c051a8b57f7e9bc688f19c1d7a9f7d875ba0bf46b4329ddebed94
    locator: Server List > Parsing > 6. Read Server information
    quote: The next 3 bytes get combined into a 24 bit ac value (I don't know what
      this value is used for)
dependency_hashes:
  fact-cycle3-ab-20260927: bda627e6dd4f6c62ea52ea66145795f01f1d5047ab8f5d3f2e612245d6c5f584
revision: c2bf9a55-7e2a-4d76-8bd7-d6fe23426894
---

# 접속 전 서버 인원 확인 조사

- 공식 서버 목록의 `ac`는 선택 가중치에 쓰이지만 실제 접속자 수로 정의되지 않는다. 사이클 2 기록의 `ac=접속자 수` 해석은 이 결론으로 정정한다.
- 정확한 인원은 접속 후 리더보드 패킷의 `slither_count`에서 얻는다.
- 따라서 본 게임 접속 전에 정확한 값을 보이려면 별도 탐침이 후보 서버에 잠깐 접속해 `slither_count`를 읽고 종료해야 한다. 기존 `research/server_counts.py`가 이 방식으로 동작한다.
- NTL 서버 상태 페이지도 인원 정보를 제공하지만 제3자 서비스이며 자동 접근에 Turnstile이 있어 기본 의존처로는 부적합하다.
