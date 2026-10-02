---
record_schema: 1
id: claim-development-restrictions-audit-20260925
kind: claim
status: draft
as_of: 2026-09-25
checked_at: 2026-09-25
depends_on:
  - decision-pocket11-live-data-20260924
  - decision-no-time-cap-20260924
  - decision-live-20-p14-20260925
  - fact-user-far-food-crowd-20260925
evidence_refs:
  - path: .workspace/sources/development-restrictions-audit-20260925.md
    hash: 3f85f52207d73ad0c8adac259424d76e36f52a053fea454022cecd0f65ed5f67
    locator: WORKSPACE.md 및 README 발췌
dependency_hashes:
  decision-pocket11-live-data-20260924: d69889ff3453cff6e5bae5d1e3c0b791fc53db56acbb446d600719e19c192cdb
  decision-no-time-cap-20260924: c716508f78f873ca842119fbc2b55e4a1556254880b160525575337c632c6077
  decision-live-20-p14-20260925: bc694a801bd7031f069f2e251cc4a024e2bc77b16b832fcc64b9d92c05a04539
  fact-user-far-food-crowd-20260925: 6a9d5f5f8e6277660a2ccc2af2e7b0f5e32af5ea780bfdbe76f1f9d5bd2e64ee
revision: 46fe371f-ff82-4b9c-ac17-68bb09e949e5
---

# 개발 제한 문구 정리 후보 — 목록 검토 단계

사용자 요청: WORKSPACE.md와 자료의 과도하게 방어적인 문구를 없애기 전에 우선 목록 제시. 이번에는 기존 지침·기록·코드를 수정하거나 삭제하지 않았다. 이 기록은 삭제·대체 권고이며 운영 제한 일괄 해제 결정이 아니다.

핵심 관찰: 9월 23일 WORKSPACE 요약이 후속 사용자 결정을 반영하지 않아 최신 기록과 충돌한다. 문서에 과거 규칙이 있다는 사실과 현재 규칙의 유효성은 구분한다. 아래 판단은 문서 정합성 검토이며 약관 내용·법적 효력에 대한 새 검증이 아니다.

우선 삭제·대체 후보:
1. WORKSPACE: 목표를 전부 '방어적'으로 고정. 공격형 정밀 조작 데이터 수집 목표와 분리 필요; 생존 목표 자체의 폐기는 아님.
2. WORKSPACE 및 active 목표 기록: 실사이트는 매번 새 명시 지시, 그 외 전부 로컬. pocket11의 실서버 중심 연속 검증 승인 범위를 반영해야 하며 기존 승인을 반복해서 묻는 근거로 쓰지 않는다.
3. WORKSPACE/README: 하루 5판. 후속 10→20판→한도 해제 기록이 존재.
4. WORKSPACE/README: 판당 10분. decision-no-time-cap 사용자 원문이 해제를 명시.
5. WORKSPACE: 초파리 비교 전 실사이트 노출 최소화. 이후 실서버 데이터 중심 개발 지시와 현재 적용 범위 충돌.
6. WORKSPACE: 실전 상태 기록 불필요. 이후 trace·블랙박스·스크린샷 수집 지시와 충돌.
7. WORKSPACE/README/구 닉네임 기록: 그리스 신화+행성, i/l20, 단어+두 자리 숫자를 현재 규칙으로 계속 재사용. 최신 다양화 결정으로 정리.
8. WORKSPACE 및 decision-live-20-p14: 사람 같은 움직임·행동 분석·닉네임 다양화를 일괄 anti-cheat 우회로 단정한 어시스턴트 판단. 일반적인 이름 생성과 행동 모델링을 금지하는 프로젝트 규칙으로 사용하지 않도록 삭제·정정 후보.
9. decision-active-survival-targets/ACTIVE_README: 중간 혼잡만 목표, 가장 붐비는 곳 강제 안 함. 과거 생존 평가 조건으로 보관하고 현재 공격형 수집 목표에 우선 적용하지 않는다.
10. fact-user-far-food-crowd: 과거 안전형 테스트가 있다는 이유로 새 지시 반영을 공격형에만 한정한 어시스턴트 판단. 사용자 진술과 분리하고 현재 개발의 의무 제약으로 삼지 않는다. 안전형 선택지를 없애야 한다는 확정 결론은 아님.
11. POCKET/STAGED/ACTIVE/RECOVERY README 및 CODEX_REVIEW_FOR_CLAUDE: 당시 '로컬만', '승인 문서 아님' 같은 작업 범위를 영구 운영 금지로 읽게 하는 표현. 날짜와 해당 버전의 수행 범위로 축소·과거 문서로 분류. 리뷰 결과 자체는 실행 지시가 아니며 승인된 개발을 재차 막는 용도로 쓰지 않는다.
12. WORKSPACE: 학습 1회 1~3시간(가정, 미응답)을 확정 결정 항목에 포함. 미합의 추정치를 개발 제한에서 제외.

별도 정리 후보:
13. 30~90초 대기·브라우저 하나·오류 시 재접속 없음·bot/ai 문자열 금지. 일부는 후속 기록에도 유지되어 위의 명백한 구식 제한과 구별한다. 삭제 검토 목록에 포함하되 어시스턴트가 임의로 만든 것으로 단정하지 않는다.
14. WORKSPACE/README의 약관 경고와 '실행은 본인 책임'. 현재 작업 지침에서 원문 참고자료로 이동할 후보. 원문 및 약관 관련 관측을 허위로 바꾸거나 없어진 사실로 처리하지 않는다.

유지 권고: 사용자의 코드 직접 복사 금지, Esc 종료, 원본·결과 보존, 사실/가정/미확인 구분, 실제 반례·측정 한계. 이는 반복 승인 요구와 구별된다. 특히 decision-active-survival-start의 '일상적인 구현·수정·로컬 검증에 추가 착수 승인을 요청하지 않는다'는 개발을 돕는 문구다.

조회 범위: WORKSPACE, 운영·개발 README 및 해당 결정/사용자 기록의 관련 문구. 프로젝트 전체 실험 산출물을 전부 읽은 감사는 아니다. 일부 방어적 표현은 Codex 작성 보고서에도 있어 특정 작성자만의 문제로 귀속하지 않는다.
