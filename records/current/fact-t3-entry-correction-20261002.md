---
record_schema: 1
id: fact-t3-entry-correction-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t3-entry-correction-20261002.md
    hash: 0794cf2fee2cefa7a67817c9aad0103743b36dfbe2253af7515aaa72c810c2e0
    locator: Scope, correction runs, synthetic validation, exact T3 and live progress
dependency_hashes: {}
revision: 605d2686-a44f-48fc-91a9-7ae0786aaee8
---
# T3 수직 진입 결함 확인·평행 진입 수정

사용자 요청: T3로 평행 진입·간격 유지 후 두께/속도 조합을 다른 판에서 반복 실측. 사용자 관찰: 90도로 몸통에 박고 죽음.

실측 확인: 초기 빌드1002-9ca46e23, runs/t3_20261002_085713 6사망+7판 중단, 안정 단계0. 첫6판 마지막 관측 교차각46.0~89.2°. 엄격한 직선 후보 선별로 대상이 사라지면 중앙으로 직진하고 탐색 경로 충돌 검사가 없던 결함을 확인했다. 위치 로그상 이동은 있었으며 정밀 추종 실패다. 이 사망은 안전 오프셋에서 제외한다.

수정1 빌드1002-1efeafe8: 가까운 긴 몸 전체에서 대상 선택, 회전·입력 지연을 반영해 모든 몸/머리/벽 검사. 실제1판 runs/t3_20261002_090930 21.7초 사망, 안정0. 먼 곡선 대상을 유지하며 다른 몸에 접근하는 문제 확인.

최신 빌드1002-b5ab19c0: 진입 중 가까운 긴 대상·직선 부분 우선으로 변경, 측정 중 대상 유지. 251방향 양자화+160ms 지연 모의20조건 및 실제 Worker/UI검증 통과, 기존8개 판단 함수 보존. 합성 성공은 실게임 안전 입증이 아니다.

runs/t3_20261002_091328 실게임1판119.2초 사망 종료(마지막 생존 로그118.61초), 안정 단계0·페이지 오류0·이전 설정 복원 성공. 추가 판 없음. T3 평행 추종의 실게임 검증은 실패 상태이며, 반복 사망을 안전 오프셋으로 쓰지 않는다. 데이터셋 research/t3_20261002/{dataset.html,offset_dataset.json,alive_levels.csv,death_cases.csv,death_frames.csv}; 빌드·실제 순항/부스트·두 반경별 분리, 한 판 연속 단계는 독립 반복1판으로 집계. 독립3판 미만 참고 오프셋 미표시. 공통 안전 오프셋 미확정. 대량 수집 중단, 마지막 검증 수집기도 종료.
