---
record_schema: 1
id: claim-pocket10-local-20260924
kind: claim
status: draft
as_of: 2026-09-24
dependency_hashes: {}
revision: 9d5ab6ab-15a3-4991-9910-a0638c94b835
---

# pocket10(굵은 포위 조기 탈출) 로컬 검증 — 채택 안 함, 실사이트 미실행

근거: decision-pocket10-thick-20260924 구현의 로컬 결과(이 세션 실행 출력, runs/p10_normal6 저장; 추가 6시드·변형 비교는 /tmp 스크립트 출력으로 보존 안 됨).

- 표적 시나리오 closing(1.6배 굵은 고리가 뒤쪽 틈을 6초에 닫음, 20시드): pocket10 탈출 20/20, pocket8 12/20(나머지는 갇혀 원 돌기, 사망 없음).
- 일반 플레이(normal, 150초, 같은 시드):
  - 생존: 12시드 기준 pocket10 10/12, pocket8 12/12. pocket10 사망 2건은 모두 body:encircler.
  - 성장: 첫 6시드 평균 2858 vs 4958(−42%).
  - 출구 모드 비율 9.7%→22.4%, 원 돌기 7.1%→12.3%.
- 기준값 변형(EARLY/THICK_RATIO = .75/1.2, .6/1.4, .75/1.4)은 모두 6시드 중 3판 사망.
- 해석(가설): 붐비는 곳에서는 어린 우리보다 굵은 몸이 대부분이라 조기 탈출이 자주 켜진다. 탈출 중 사망 기전은 미확인.

조치:
- live_staged.py 기본 스테이지는 pocket8로 유지하고, pocket10은 선택지로만 남긴다.
- 방어 구간 전체 기록(defend_trace)은 live_staged.py에 유지한다(모든 스테이지 공통, 제어 동작 변화 없음).
- 실사이트 판은 돌리지 않았다(오늘 14/20 사용).
