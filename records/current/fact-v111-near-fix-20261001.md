---
record_schema: 1
id: fact-v111-near-fix-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
checked_at: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v111-near-fix-20261001.md
    hash: dd8008cabd4da4883e26a8b594500b25159eb50b3e491fcda8402b25742bd6ef
    locator: implementation, observations, manifest, checks, mock, browser
dependency_hashes: {}
revision: 0f5f03c7-02d4-4288-946c-930b24505fd2
---
# V11-1 — 먹이 유지·근접 회피만 수정

사용자: V11 먹이 추종 만족/근접 사망 관찰, 근접만 수정·V11-1 릴리즈 요청. 관찰을 측정된 상대 성능으로 확정하지 않음.

빌드1001-61e47380, V111_ON/v111_near/선택 버튼. V11 먹이 원본·근접 전환 조건·원본 V10 경로·물리 불변. V11-1 먹이 자식 V111_OFF 원본 V1, 회피만 별도 v111Step. 먹이 설정은 현재 사용자 V11 값 W_FOOD6/W_GOAL300/BOOST_COST15 포함해 프리셋에 보존. 기존 V11/V10-1/V10-2 유지.

회피 후보8→12 방향, 안전 후보는 부스트/먹이 선호보다 여유 우선. 전 후보 실패나 지연 prefix 위험 시 순항 후보를 동일 시간 간격으로 계속 전개하여 첫 충돌 시간·침범 적분·종단 여유 등을 비교. 안전으로 인증하지 않음. 별도 exhaustive world는 최악 간격을 끝까지 비교하며 기존 함수에 영향 없음. 최대0.6초 진단, 추가8ms 소프트 예산/최소0.08초; 회차 단위라 예산 초과 가능. 이전 전역 롤백 수정은 복원하지 않으나 조기 종료 결함에 대한 연속 비교를 신규 모드로 한정 재구현.

읽기 전용 확보 마지막 V11 판37초·오류0·설정변경0, 마지막 v10emergency/near_head+body. 사망 원인 서버 확인 아님. 같은 관측 마지막8프레임 재생에서 회전 선택 변화, 실제 생존 개선 미입증. Node VM 비상 판단 약13–23ms(기존3–9ms)로 추가 비용 있음, 실브라우저 성능 및 생존 검증 미실시.

검증: 원본 함수7개 불변·먹이 명령12프레임 동등·합성 초기 침범 회전 선택·위험을 안전으로 바꾸지 않음·벽 순서 불변·실 Worker 모의 브라우저 근접/몸통/복귀/프리셋/독립 V10 통과, 오류0. 기존 V11/V10-1/V10-2 및 문법 검사 통과.

Windows 최종 적용 성공, 기존 사용자 값·bot·activePreset v11_near 유지, playing false. V11-1 버튼 선택 가능. 새 실게임/배치 시작 없음.

원본·판 자료·검증 research/v111_20261001/{before,page_0.json,page_0_box.json.gz,check.json,mock.json,manifest.json,windows_applied.json,source.md}. 코드 해시는 manifest.json.
