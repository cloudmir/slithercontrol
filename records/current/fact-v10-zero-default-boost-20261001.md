---
record_schema: 1
id: fact-v10-zero-default-boost-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-zero-default-boost-20261001.md
    hash: b00a72b70a62361f44041f7a7aeca2257cb2e9de56716b505faf805e189854eb
    locator: 본문
dependency_hashes: {}
revision: db68eb16-ab0b-4fa8-a346-f0de8723e099
---
# V10 비용 0 기본 부스트

사용자 선택: “0 으로 하면 일반적으로 매번 부스터를 쓰도록 해줘”. 빌드 1001-797845a4에서 비용 0은 일반 경로·먹이 추종·근접 후보의 부스트 기본 선택으로 변경. 종전 비용 감점만 제거하던 의미를 대체한다. 허용 스위치·최소 길이·충돌 검사는 유지하고 계획된 진입 회전은 예외다.

research/v10_zero_default_20261001/check.json: 빈 공간 0→부스트, 양수→순항, 스위치 OFF·짧은 길이→순항, 위험 부스트→순항 5개 검사 통과. 코드 사본 before/ 보존. 현재 게임 진행 중이어서 재로드하지 않았으며 브라우저 적용 대기. 새 실게임 성능 검증 없음.
