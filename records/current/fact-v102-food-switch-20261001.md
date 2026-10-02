---
record_schema: 1
id: fact-v102-food-switch-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
checked_at: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v102-food-switch-20261001.md
    hash: 3df67d364c44990b41cfba693c8bd9fe7475bf8317e019e1405bc25cd913a3f2
    locator: design, manifest, checks, mock, browser
dependency_hashes: {}
revision: 7d135adf-7dfb-4465-b597-3f4bc2aa2e52
---
# V10-2 — 군집 먹이량 전환·머리 색상

사용자 요청: 군집 먹이량 기준 슬라이더와 켜기/끄기, 기준 이상 먹이 추종·미만 회피, 추종 머리 빨강·회피 파랑. 사용자 선택으로 구현.

빌드1001-2331f7d6, 독립 V102_ON/v102_food 프리셋·버튼. 원본 V8의 V1 먹이 추종과 롤백된 V10 회피 지속 인스턴스 결합. 먹이량 전환 켬: 최대 군집량 >= 설정이면 즉시 추종, 미만이면 즉시 회피. 끔: 기존 V10-1 머리 수/몸통 밀도/복귀 대기 조건 사용. 먹이 모드에서도 원본 V1 안전 검사 유지. 기존 원본 판단 함수·롤백 상태 유지.

군집량 정의: 탐색 반경 내 관측된 미섭취 먹이의 sz 합계, 세계좌표 격자별 최대값. 모든 먹이 크기 포함. 초기 설정 기준100, 반경3000px, 격자160px는 구현 선택이며 최적값 측정 아님. 기준 슬라이더0–5000/10단계, 0이면 빈 먹이도 추종. 격자 경계에서 한 시각적 군집이 분리될 수 있음. 점수/실제 질량으로 해석하지 않음.

로컬 검증: 원본 함수5개 불변, 경계값·슬라이더 방향·군집 분리·범위 제외·토글·명령6프레임 동등성 통과. 실제 Worker 모의 브라우저 추종 feed/회피 v10replan, 토글·프리셋 유지·다른 모드 보존, 빨강/파랑 캔버스 채움 확인, 오류0. 기존 V11/V10-1 검사 통과. 문법 검사 통과.

Windows 최종 빌드 적용 확인, 기존 사용자 설정·activePreset v101_hybrid·봇 상태 보존, playing false. V10-2 선택 버튼 제공, 자동 선택/새 실게임 없음. 실전 생존·성장 개선 미검증.

원본·검증 research/v102_20261001/{before,check.json,mock.json,ui.png,manifest.json,windows_applied.json,source.md}. 코드 해시는 manifest.json.
