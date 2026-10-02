---
record_schema: 1
id: decision-t4-fixed-rollback-20261002
kind: decision
status: adopted
as_of: 2026-10-02
supersedes:
  - decision-t3-continuous-collection-20261002
evidence_refs:
  - path: .workspace/sources/t4-fixed-rollback-20261002.md
    hash: b453c18e999329fe5dfb3af4bc7e058920231a645faf836065ebc94dcbe813e3
    locator: User direct instructions, rollback_files.json, rollback_browser.json
dependency_hashes: {}
revision: 6a2d3a53-edba-493b-8dd8-97c42b1bce73
---
# T4 −5px 선택·최신 대상 선정 변경 롤백

사용자 −5px 선택으로 독립 T4를 개발·실게임 시험했다. −5는 사용자 실험 설정이며 보편적으로 검증된 안전 오프셋이 아니다. 이 새 모델 요청으로 기존 T3 연속 수집을 중지했다.

이어 1000 이상 가까운 대상 선택·더 긴 적으로 전환 요청을 구현했으나 최신 사용자 지시 “그냥 롤백하자.”에 따라 바로 직전 대상 선정 변경을 되돌렸다. 롤백 범위는 작업 중 사용자에게 명시했다. 빌드1002-317482f8 및 revision1 원본과 파일 일치 확인. T4 −5px·관측 몸길이 최소600px 설정 유지. Windows 확장 재로드 후 build1002-317482f8/T4_GAP−5/T4_MIN_LEN600/bot=false/playing=false 확인. 자동 테스트 재개 없음.

runs/t4_20261002_121802는 3사망+1사용자 중단 기록, runs/t4_20261002_122618는 2사망 후 롤백으로 다음 판 시작 전 종료. 두 배치 모두 예정5판 완료가 아니다. 원본 코드·로그·이미지 보존. 최신 폐기 선정 변경은 research/t4_fixed_20261002/revision2_rolled_back에 보존했다.
