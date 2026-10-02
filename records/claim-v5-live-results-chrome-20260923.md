---
record_schema: 1
id: claim-v5-live-results-chrome-20260923
kind: claim
status: supported
as_of: 2026-09-23
checked_at: 2026-09-23
evidence_refs:
  - path: .workspace/sources/live-v5-result-20260923.md
    hash: 0056a437a7507852da442532aa3a96d7850a3a0030f6150bf9aeace98fa864a7
    locator: live JSON logs, regression tests and offline reproduction
  - path: .workspace/sources/playwright-browsers-20260923.md
    hash: 1f1a5312d2ce82e40de036f8d1782f976c98e6ad32bac8a3bdab820e84ef04bd
    locator: Google Chrome & Microsoft Edge
dependency_hashes: {}
revision: 40dfa27d-c02d-4d49-b53d-324245bb98e4
---
# v5 실사이트 결과와 일반 Chrome 지원 — 2026-09-23

22:13:41 시작 PoseidonUranus 판은 17.1초 뒤 death로 종료, 최대 길이 67. 세부 충돌 원인은 미확인이다.

22:15:17 시작 EosUranus 판은 UFuncTypeError(float64를 int64 배열에 더하기)로 프로그램 오류 종료했다. 사망으로 집계할 근거가 없으며 finally의 browser.close()로 창이 닫힌다. 로컬에서 정수 방향값 0을 전달해 같은 예외를 재현했다. live_active.py 관측 경계에서 수치 스칼라를 float로 정규화했고, 정수/실수 입력 행동 동등성 및 비유한 입력 거부 검사 2개가 통과했다. active.py 해시 5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757 유지. 수정 뒤 실사이트 재시험은 하지 않았다. 이 수정은 첫 판 사망 원인을 해결했다는 뜻이 아니다.

일반 Google Chrome은 Playwright 공식 지원 대상이고 chrome 채널로 실행할 수 있다. 현재 live.py는 CHROME 환경변수 또는 기본 테스트 브라우저 경로의 실행 파일을 새로 띄운다. 평소 열어둔 Chrome 탭에 자동 연결되는 구현은 아니다. 사용자 일반 Chrome에서의 실제 동작 검증은 아직 하지 않았다. 브라우저 교체만으로 위 Python 수치 타입 결함이 해결되는 것은 아니다.

이 기록은 위 두 판과 로컬 회귀 검사에 한정하며 새 PPO 성능이나 생존 목표 달성을 확인한 기록이 아니다.
