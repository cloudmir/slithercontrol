---
record_schema: 1
id: claim-minimal-workspace-proposal-20260925
kind: claim
status: draft
as_of: 2026-09-25
checked_at: 2026-09-25
depends_on:
  - decision-live-test-single-purpose-20260925
  - decision-active-survival-start-20260923
  - fact-user-far-food-crowd-20260925
  - fact-user-aggressive-spec-20260925
dependency_hashes:
  decision-live-test-single-purpose-20260925: 83463cb1f111267a02b0d778d877a473216002158a9d4465f088ce54a8dfe82f
  decision-active-survival-start-20260923: c67887358de0778f4bb009a2fd9f5e30e89ca05e0964087fa766de70ec6a5a25
  fact-user-far-food-crowd-20260925: 6a9d5f5f8e6277660a2ccc2af2e7b0f5e32af5ea780bfdbe76f1f9d5bd2e64ee
  fact-user-aggressive-spec-20260925: 606f8855106cb7cc8b1f0152045c3cc64b443d455edb78b3e0bcbfb55a9d0399
revision: e7c60cf3-3174-446a-890b-ddf2f34e5c09
---

# 최소 워크스페이스 구성 제안

사용자 요청: 삭제 목록 대신 최소한으로 살릴 내용 목록 제시. 아래는 구성 제안이며 기존 WORKSPACE·기록을 실제 삭제·교체하지 않았다.

WORKSPACE 상시 내용은 다음 6항목으로 제한하는 것을 제안한다(본문 약 20~30줄 목표).
1. 목표: 다른 지렁이가 있는 구역에서 정밀하게 움직이며 오래 생존하고 성장한다. 현재 개발 초점은 혼잡 구역·근접 상황의 조작과 사망 경계 데이터를 확보하는 것이다.
2. 현재 행동 요구 요약: 먹이·잔해 적극 수집, 부스트 활용, 공격 대응, 좁은 통로·포위 상황 정밀 조작. 세부 수치와 과거 설계는 관련 자료에서 필요할 때 조회한다.
3. 작업 방식: 최신 사용자 지시를 우선하고 이미 승인된 구현·검증은 반복 확인 없이 진행한다. 테스트는 목적 하나와 성공 기준을 정하고 결과에 따라 개선한다. 실제 실행 환경·범위는 해당 작업에 유효한 사용자 지시를 따른다.
4. 현재 상태: 사용 중인 버전, 진행 중인 작업, 확인된 핵심 문제, 다음 작업만 기준 시각과 함께 짧게 갱신한다. 이번 요청에서는 프로세스나 버전 상태를 새로 조사하지 않았다.
5. 자료 위치: pilot.py, run_live.py, runs/, research/, records/ 등 실제 작업에 필요한 진입점만 둔다. 기존 경로 존재 확인 완료.
6. 근거 관리: 측정 사실·가설·사용자 선택을 구분하고 결과에 코드 버전과 로그 경로를 연결한다. 원본 자료는 보존하며 현재 질문에 필요한 것만 읽는다.

별도 보존하여 필요할 때 조회할 자료: 원본 코드·모델, 실행 로그·블랙박스·측정값, 사용자 지시 이력, 재현 가능한 결함·검증 결과. 과거 버전 보고서와 원문 참고자료는 상시 주입 대상에서 분리하는 구성을 제안한다. 이 제안 자체가 기존 사용자 조건의 일괄 폐기나 실사이트 실행 지시는 아니다.
