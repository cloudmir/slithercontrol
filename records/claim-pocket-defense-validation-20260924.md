---
record_schema: 1
id: claim-pocket-defense-validation-20260924
kind: claim
status: supported
as_of: 2026-09-24
checked_at: 2026-09-24
depends_on:
  - decision-pocket-defense-start-20260924
evidence_refs:
  - path: .workspace/sources/pocket-verification-20260924.md
    hash: 6fbe2161300ecc035bd11931280a84b4ec76dc788b59105b2c32a8d37e4f4d41
    locator: 합성·반응형 비교표, 결과 JSON 원문, 시험 출력, 채택 판단
dependency_hashes:
  decision-pocket-defense-start-20260924: 7f538bf313888544a8feea859f844b66b34597283ea3e52f75a575040b658155
revision: 1ea5a7a8-9a29-4f18-bec6-45777992475f
---

# 포위 내부 회전 구현 완료 — 합성에서 동작, 일반 플레이 열화로 기본 채택 안 함

2026-09-24. supported는 구현과 아래 로컬 시험 결과에 한정한다. 일반적 안전 보장, 실사이트 생존 개선, 600초 목표 달성은 아니다. 원문을 save_source→read_source로 확인했다.

새 pocket.py는 관측된 장애물의 연결 공간을 계산하고, 출구가 있으면 안전 후보 중 탈출 경로를 선택한다. 포위 안에서는 현재 회전 반경·명령 큐를 반영한 진입+한 바퀴 이상의 경로를 매 판단 재검사하며 반복한다. 현재 몸체는 고정해 보고 상대 머리와 새 몸체는 2초 근사 예측한다. 평상시에는 기존 predict를 사용한다. 기존 staged.py 등 핵심 소스 8개는 시작 사본과 해시 동일하다.

합성 시험: 시드 72100–72101, 8조건×3제어기×2시드=48판, 첫 사망/60초, 모두 완료. pocket은 닫힌 원형·비중심·타원형에서 각각 2/2 생존했고 출구 개방에서는 2/2 탈출 후 먹이 수집·60초 생존했다. 이 조건들은 대조군 coil/predict도 각각 2/2 통과했다. 축소 포위는 pocket 평균 50.50초, 대조군 41.72초로 모두 사망. 최소 회전 공간 부족은 모두 0.20초 사망. 지정 궤적 침입 머리·열린 먹이 공간은 각각 모든 방식 2/2 생존. 반응형 상대나 실제 사망 장면의 재현이 아닌 합성 기하 시험이다.

일반 시험: 보통 상대 50마리, 시드 73100–73101, 90초 상한, 환경 유효 6/6. coil/predict는 각각 생존 2/2·활동 준수 생존 1/2·평균 순성장 638.1. pocket은 생존 1/2·활동 준수 생존 0/2·순성장 530.2. 73101은 39.2초 다른 몸체 충돌, 73100은 90초 생존하나 활동 조건 실패. 두 판 표본이며 10분 목표 성적이 아니다. 병렬 실행 중 계산 시간은 실시간 성능 인증에 쓰지 않는다.

판단: 기능은 구현됐으나 일반 비교에서 열화했으므로 기존 기본값 coil 유지, pocket은 실험 옵션. 다음 보완 후보는 방어 진입 판정과 탈출 종료·활동 구역 복귀다. 방향 차단 비율 75% 이상에서도 방어가 켜지는 구조가 과도한 이탈을 일으켰을 가능성은 가설이며 인과 검증 전이다.

47개 기능·회귀 검사 통과. play_pocket.py 합성 뷰어와 play_staged.py --stage pocket 일반 뷰어의 더미 렌더링 확인. 실사이트 연결·추가 실행 없음.

초기 시험 72001의 탈출 맴돌기 결함은 수정했으며 그 묶음은 개발 자료로 전환했다. 최종 시험 도중 대화 중단 때 완료한 합성 24판·일반 2판을 보존하고 미완료 판만 동결 코드와 원래 시드로 재시작해 모두 마쳤다. 중단된 구버전 normal_test01은 결과에 합산하지 않았다.

보고: POCKET_RESULTS.md, 안내: POCKET_README.md. 원본: runs/pocket_geometry_test02/summary.json, runs/pocket_normal_test02/summary.json, 각 sources/manifest.json/resume.json.
