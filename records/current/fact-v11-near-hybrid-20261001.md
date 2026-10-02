---
record_schema: 1
id: fact-v11-near-hybrid-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
checked_at: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v11-near-hybrid-20261001.md
    hash: f79f0858a0b16879ca5d0464053be7a8706c043219ed360042823e08bac1290c
    locator: manifest, checks, mock, browser, design
dependency_hashes: {}
revision: 75086550-614c-4b41-ae11-4ed32ec443ef
---
# V11 — 原 V8 먹이 추종 + 근접 V10 회피

사용자 요청: V8 먹이 추종에 가까울 때 V10 회피를 사용하는 V11 추가. V11_ON, v11_near 프리셋·버튼·근접 조절 항목 추가. 원본 V8의 V1 판단과 롤백된 V10 판단은 변경하지 않고 지속 인스턴스의 분기 결합을 재사용했다. V10-1은 기존 혼잡 조건 유지, V11은 적 머리 1개라도 근접하거나 적 몸통 표시 간격이 기준 이하이면 전환. 자기 몸·죽은 적·dying 구간 제외. 안전 상태가 지속되면 먹이 모드 복귀.

초기 설계 가정(사용자 지정 수치·성능 최적값 아님): 머리 중심 거리250px, 몸통 표시 두께 간격80px, 복귀 대기1초. 모두 조절 가능, 거리0은 해당 조건 해제. 표시 간격은 서버 실측 사망 경계가 아니다.

파일 최종 빌드1001-d24493c6. 검증: 원본 함수5개 불변·먹이/회피8프레임 명령 동등성·머리1개/몸통만 근접 전환·복귀 대기·조건 끄기 확인. 실제 Worker 모의 브라우저 feed cruise/avoid v10replan·프리셋 저장/복원·독립 V10 유지, 페이지 오류0. 초기 모의 브라우저에서 근접 관측 hid 누락 발견·최종본 수정 후 검사 통과. 문법 검사 통과. 실게임 성능 미검증, 새 게임 시작하지 않음.

브라우저: 검증 도중 중간1001-0fda2149는 적용됐으나, hid 보완된 최종1001-d24493c6 적용 재시도는 game_in_progress로 보류. 현재 게임을 중단·재로드하지 않았다. 최종본 브라우저 적용 미완료이며 중간본 V11에 전환 관측 결함이 있을 수 있음.

원본·근거 research/v11_20261001/{before,check.json,mock.json,manifest.json,windows_before.json,windows_applied.json,source.md}.
