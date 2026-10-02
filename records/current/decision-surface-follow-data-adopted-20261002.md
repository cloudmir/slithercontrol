---
record_schema: 1
id: decision-surface-follow-data-adopted-20261002
kind: decision
status: adopted
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/surface-follow-adoption-20261002.md
    hash: 7ead2015a65e273a90588c917abb100cb0d82549f7c83e72e72d4357a92d03df
    locator: 사용자 직접 지시, Current production hashes, Recomputed original logs
  - path: .workspace/sources/t3-rough-death-table-20261002.md
    hash: cdba296b8dd9d07e66d324c4e32e411cdc4a0331e3610d2a7dee50b840d0094c
    locator: Raw aggregation output, Verification output
dependency_hashes: {}
revision: 5e71fb73-4190-4885-bce5-354cafa38e8f
---
# 표면 추종과 실측 데이터 사용 채택

사용자 선택: “지금 상태를 보면 잘 주행하는것 같은데 … 이 데이터를 사용하기로하자.” 좋은 주행이라는 평가는 사용자 관찰이다. T4 고정 −5px 설정·기존 T3 두께별 실측 자료를 현재 개발 기준과 경험 자료로 사용하고 표면 추종 알고리즘과 함께 MD에 정리했다. −5px를 모든 두께·속도의 검증된 안전 경계로 확정하지 않는다.

문서 research/SURFACE_FOLLOWING_20261002.md: gap·반경·몸길이 정의, 현재 대상 선정 점수와 유지·이탈 조건, 평행 진입·초당30px 접근·몸통 옆 이동 보상, 부스트·실제 회전 검사, T3 106사망 관측 표, 동일 빌드 T4 판별 주행 표, 원본 경로·SHA-256을 포함한다. 기준 빌드1002-317482f8/T4_GAP−5/최소 관측 몸길이600px. 롤백된1000px·더 긴 대상 자동 전환 변경을 현재 알고리즘에 포함하지 않는다.

측정 사실: runs/t4_20261002_121802의 3사망+1중단 원본 로그 재계산. 같은 대상·목표±2px·방향차15° 미만인 연속 두 관측 사이만 합산하면 밀착 누적10.558초, 최장2.272초, 판단 오류0. 이전 summary의11.485초/2.318초는 구간 첫 관측 전 시간까지 포함했으며 원본 summary를 보존하고 문서에 정정 이유를 적었다. 독립2판3초 연속 기준 미달과 사용자 채택을 구분한다. 다른 빌드 표본을 합치지 않았다.

문서 링크 존재·파일 버전·재계산 수치 확인 완료. 제품 판단 코드 변경·새 실게임 실행 없음.
