---
record_schema: 1
id: decision-batch-fix-then-test-20260928
kind: decision
status: adopted
as_of: 2026-09-28
depends_on:
  - decision-cycle6-giant-escape-20260928
dependency_hashes:
  decision-cycle6-giant-escape-20260928: 92181534b0e97292d637221fd244c8b56bf431bb64644dc6a6dc1b5dce0fbfa5
revision: d75a9c08-c515-480d-acff-6adc64c16a23
---
# 수정 먼저 몰아서, 실게임 테스트는 한 번에 (사용자 제안 2026-09-28)

사용자: "테스트가 많이 걸리니, 우선 다 수정하고 테스트를 하는것은 어떤가?"
앞선 요청: "겹치거나 의미가 상쇄되는 옵션들은 옵션 상관 관계에 따라서 Disable 처리를 하거나, 옵션 값들을 제한하거나".

결정(어시스턴트 제안, 사용자 제안에 따름):
- 동작을 바꾸지 않는 정리는 오프라인 재생 동일성(연구용 900프레임 상태 파일, 채택 설정 A: cmd·boost 0 diff)으로만 확인하고 실게임 테스트 없이 반영한다.
- 동작을 바꾸는 항목만 한 묶음으로 모아 실게임 A/B 한 번(A=채택 설정, B=묶음)으로 판정한다. 묶음이라 항목별 기여는 분리되지 않는다(사이클 2와 같은 방식).

이번 반영(빌드 0928-dbd6dc56, A 재생 0 diff, mock OK):
1. 옵션 관계 규칙 엔진: params.json `rules`(31개, 조건→대상→off/warn/사유), mod.js ruleState/effectiveValues(파일럿에는 유효값 전달; off+force만 값을 바꿈), 슬라이더에 ⊘(잠금·회색·사유)/⚠(주의) 표시, 판단 순서 안내문. 채택 설정에서 유효값 = 원값(변화 없음). Codex 검토 반영: SIZE_GATE/W_*/HEAD_RAYS 문구 정정, GAP_EXTRA=0→W_THREAD/W_CENTRE 잠금, GUARD_TTC>GUARD_T·GIANT_OFF≥GIANT_COV·COIL_OFF≥COIL_ON 경고 추가. clamp(값 제한)는 넣지 않음(TIGHT≤SAFE를 강제하면 채택값 TIGHT 5·SAFE 2가 바뀜).
2. 죽은 옵션 제거: RAID_EVADE/RAID_R/W_RAID(사이클 3 악화), GUARD_V2(사이클 5 오프라인 탈락), W_EXITS(사이클 5 실게임 무효), ADAPT_SAFE/ADAPT_MAX(검증 불가). 로그 키 adapt/revade 제거. BOOST_DANGER는 채택값(10 < BOOST_COST 54)에서 실제 작동하므로 유지. SIZE_GATE는 SIZE_PROFILE과 완전히 겹치지 않아(Codex) 유지.
3. 결함 수정: 사이클 6 escId 패치(0928-81825d68)의 감김 뱀 id 조회 `[...covs].find(m === wrapCov)`가 WRAP_RAID/GIANT 유지 중(wrapCov를 max(m,.25/.3)으로 바꾼 뒤) undefined → 예외. 재생에서 B(GIANT_ON)가 이 예외로 멈춤. 실게임에서는 그 틱의 판단이 오류 응답으로 빠짐(worker 오류 → 명령 없음). 10:32 재기동된 사이클 6 배치(B가 이 결함 포함)는 1판도 끝나기 전에 중단·폐기하고, wrapId 추적 방식으로 고쳐 10:45 재기동(runs/cycle6_20260928_104508). 이 결함은 GIANT_ON 아래에서만 실행되는 블록이므로 채택 설정 A에는 영향 없음.

남은 오프라인 수정 후보(동작 변경, 묶음 B 후보): 감김 트리거 통일(WRAP 기본/WRAP_RAID/GIANT), 잔해 경쟁자 판정 단일화, 사이클 2 묶음 항목별 절제(ablation)는 실게임이 필요하므로 보류.
