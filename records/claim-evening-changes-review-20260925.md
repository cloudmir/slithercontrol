---
record_schema: 1
id: claim-evening-changes-review-20260925
kind: claim
status: draft
as_of: 2026-09-25
checked_at: 2026-09-25
evidence_refs:
  - path: .workspace/sources/evening-changes-review-evidence-20260925.md
    hash: 93620c58c1b590f824bf34224e562822c05d24243898d8d114147a70844f14e6
    locator: 재생 JSON / medians와 counters
    quote: '"dwell_blocks_boost_on_in_attack": 252'
  - path: .workspace/sources/evening-changes-review-evidence-20260925.md
    hash: 93620c58c1b590f824bf34224e562822c05d24243898d8d114147a70844f14e6
    locator: 경계 검사 JSON / pending_across_emergency
    quote: '"same_pending": true'
  - path: .workspace/sources/evening-changes-document-20260925.md
    hash: 5e5aebfd2e63daeb2b6ab23b11f2796a473c464108939e114fd80ec181b1bc39
    locator: 기동 유지와 부스트 상태 / 검증
dependency_hashes: {}
revision: d726b51b-2eb5-4537-97e4-eb093282818d
---
# 저녁 변경 검토 — 출력 안정화 효과와 공격 부스트 제한

요청: CHANGES_20260925_evening.md 검토 및 실제 분석.
보고서: research/evening_changes_review_20260925.md.
코드: pilot 6eb10d1e…, runner 7f3f470b…. 원본 문서·운영 코드 수정과 실사이트 실행 없음. draft는 종합 권고 미채택이며 아래 직접 검사를 미실행했다는 뜻이 아니다.

## 직접 확인

기동 변경 전 b814ac9e…와 변경 후의 같은 입력 재생: 11판의 말미 저장 구간 8,995틱. 중앙값 부스트 전환/분 146.3→109.8(약25% 감소), 90도 초과 변경 후 0.25초 내 방향 복귀/분 16.4→12.6(약23% 감소), emergency 틱 비율 3.11%→3.11%. 문서의 수치는 재현됐으나 문서는12판, 확인한 목록은11판이다. 기존 replay_flap txt는 이전 수치를 담고 있다.

dwell에 의한 부스트 선택 교체390틱 중 공격을 인식하며 켜려던 부스트를 끈 채 유지252틱. 독립 공격 수·회피 실패 수가 아니다. 순항 유지로 예측 여유가 커진 사례도 있어 공격 때 무조건 해제하라는 결론은 아니다. 합성 동일 상태에서 t=.95 부스트를 끄고 t=1.0 새 공격이 오면 현재는 evade/부스트off, dwell만 해제하면 같은 방향 부스트on 재현.

pending 확인1회가 emergency 진입 뒤에도 남는 반례 확인. coil hard와 일반 후보 why 최소 여유 차이>0.2px 106틱. W_CUT은 wrap 중에도 남음: wrap805틱 중 가점 후보134틱, 선택 후보에 가점24틱. 가점 존재 첫60틱에서 같은 내부 상태로 W_CUT만0 비교 시 명령 차이0건. 실제 탈출 방해의 인과 근거로 쓰지 않는다.

oracle 관측 전부 누락 시inf안전, 벽 밖 경로 안전 집계 반례 재확인. false_alarm의 위험 누락 미집계도 코드에 남음. page_ms는 관측 배열 수집 뒤부터 페이지 입력 작성까지이며 서버 적용 지연 아님. 자체 검사 exit0.

## 판단·미검증

출력 안정화는 진전. 신규 공격/출구 폐쇄 시 부스트 경로의 시간·회전 반경·여유 차이를 반영해 dwell 우선순위 보완, 모드 전환 시 pending 무효화, 실제 경로와 why 일치, 평가기 수정 후 반응형 로컬 시험 권고. 역킬 허용 등 사용자 선택을 임의 취소하지 않는다.

개루프 입력 재생은 움직임·생존 개선을 입증하지 않는다. 새 실사이트 생존, 반응형 전체 비교, 서버 지연, 최적 dwell 시간, 900상태 속도 벤치마크는 이번 검증 범위 밖이다.
