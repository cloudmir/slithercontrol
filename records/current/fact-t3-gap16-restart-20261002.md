---
record_schema: 1
id: fact-t3-gap16-restart-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t3-gap16-restart-20261002.md
    hash: ef2e20f092497854d1efd89fed1f16f04245ccc16b40cc6e3510ce50ab893272
    locator: user_direct_request, initial_values, execution_lines, first_trace
dependency_hashes: {}
revision: 4f2d5a03-91d7-40a3-a229-febcd0647aaa
---
# T3 시작 간격16px 정정·실제 적용

사용자 선택: “아니다 16px”. 이전32px 시작 계획을16px로 정정한다. 16px는 실험 목표이며 검증된 안전 오프셋이 아니다.

기존 runs/t3_20261002_100238 수집을 중단 파일로 정상 마감하고 원본을 보존했다. 같은 빌드1002-11dad5e1·서버181.41.140.178:444에서 runs/t3_20261002_101048 재시작. 첫 판 설정 T3_ON=1/T3_GAP0=16, 실제 판단 trace t3_set=16 확인. 평행 안정 확인 후1px 감소하는 기존 판단 로직 유지. 완료 결과를 의미하지 않는다.

감독 프로세스 research/t3_rebuild_20261002/continue_measure16.py, 상태 continuation.json. 추가 최대4배치×6판·전체3600초 상한 및 독립 반복/품질 필터 유지. 중지는 STOP_CONTINUATION_16 및 현재 실행 STOP_NOW. 후속 결과는 별도 확인한다.
