---
record_schema: 1
id: decision-probe-thickness-ext-20260928
kind: decision
status: adopted
as_of: 2026-09-28
depends_on:
  - decision-focus-escape-remains-20260928
dependency_hashes:
  decision-focus-escape-remains-20260928: 0c41410afca42194ff3582af32e5f89b59f0e64abb0ecf59aecfccc4b893c503
revision: 1c946260-0c9e-4ec2-9510-ed7a377477eb
---
# 두께별 사망 경계 실측 — 확장 탐침 모드 (사용자 지시 2026-09-28, 최우선)

사용자 원문:
> 두 지렁이 사이로 빠져 나가는것을 못함 - 원인은 지렁이의 정확한 두께(닿아서 죽는 지점)을 아직 정확하게 파악을 못하고 있음 … 지금 설정들(슬라이더)를 우선은 무시하고, 정확한 수치를 뽑아낸후 슬라이더 수치에 다시 적용(오프셋) … 방법은 a. x 두께 일때, b. 어느지점까지는 죽지 않는경계이다. a,b 컨디션에 대한 x.y 수치를 가능한 많이 얻어서 정확한 기본 데이터로 쓰는것이 주 목적 … 실제 테스트로 우선 a b x y 를 먼저 구해.

실게임 실행은 이 지시로 승인됨(탐침 목적 한정).

수동 관측(research/gap_table.py → research/gap_table.md, 블랙박스 96건): 사망 시 gap −24~+56px로 흩어짐(마지막 프레임이 사망 0.03~0.06초 전, 부스트 시 60ms에 26px 이동). 정밀 점으로 못 씀 → 능동 탐침 필요. 2026-09-25 파이썬 탐침(23판, 유효 1점)은 화면 읽기·15Hz 지연으로 추적이 안정되지 않았음.

구현(ext/pilot.js probeStep, 빌드 0928-c0c1c131, PROBE_ON 기본 0, 켜면 다른 설정 무시):
- 대상: 보이는 궤적 800px 이상, 가장 가까운 궤적점 600px 이내·머리에서 250px 이상 떨어진 뱀 중 가장 굵은 것. 몸 궤적은 놓인 뒤 정지하므로 정밀 측정에 적합.
- 추적: 궤적에서 D = 우리 r + 상대 r + 설정 gap 만큼 떨어진 평행선을 순수 추종(앞 max(80, 2.5×오차)px). 부스트 없음.
- 간격 일정: PROBE_GAP0 +4 → 안정(1초 오차 중앙값 3px 미만, 0.5초 유지)되면 PROBE_JUMP −4 → 이후 PROBE_STEP 1px씩, 바닥 −30. 안정 유지된 각 단계 = 생존점, 사망 시 설정·실측 gap = 사망점.
- 다른 뱀 머리 300px 접근, 다른 몸 45px 이내(0.5초 앞 25px)면 0.3초간 일반 파일럿이 조종(회피). 대상 머리 320px 이내면 놓음.
- 로그 열 pph(0 탐색/1 추종/2 회피)·pset·pgap·ptr·ptid·pstab. r = 14.5×sc(기존과 동일 정의).
- 오프라인 확인(research/probe_sim.mjs, 정지 궤적·회전율 모델·0.1초 지연): 단계마다 오차 중앙값 1px 미만으로 수렴, 곡률 1/500px 궤적에서는 약 2.5px 안쪽 치우침(실측 gap을 함께 기록하므로 표에는 실측 사용).
- 수집기 research/probe_live.py(PROBE_ON 켜고 N판, 끝에 0으로 복원, 상한 300초), 표 research/probe_report.py.

실행: runs/probe_20260928_113252, 20판, 그래픽 L1(끝나면 L4 복원), 서버 접속자 약 480~490명. 첫 3판에서 유효 사망점 3개(굵기비 1.7·2.9·3.9).
