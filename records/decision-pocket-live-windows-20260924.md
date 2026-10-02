---
record_schema: 1
id: decision-pocket-live-windows-20260924
kind: decision
status: adopted
as_of: 2026-09-24
dependency_hashes: {}
revision: a154bdfc-d87e-41dc-93c5-fbf85c49e73a
---

# pocket 모델을 Windows Chrome에서 실사이트 1판 실행

사용자: “지금 만든 프로그램을 실제 윈도우즈 크롬에서 실제 사이트에서 동작 시켜줘. 알고리즘이 잘 동작하는지 볼께.”

가장 최근 모델 pocket(포위 방어, 한 번도 실제 플레이가 시작되지 않음)을 Windows에 설치된 Chrome(C:\Program Files (x86)\Google\Chrome)에서 1판 실행하라는 명시적 지시로 해석한다. 오늘 기록상 5번째(마지막) 예약이다(실제 게임 1회, 접속 오류 3회). 사이트 응답은 실행 직전 WSL·Windows 모두 HTTP 200 확인.

연결 방식: 별도 프로필(C:\slither_chrome_profile)로 Windows Chrome을 띄우고 디버깅 포트는 Windows 127.0.0.1에만 연다. WSL 제어기는 powershell.exe 표준입출력 중계(win_chrome.py)로 연결. 0.0.0.0 공개 방식은 권한 정책에 따라 사용하지 않음. 빈 페이지에서 측정한 왕복 지연 중앙값 3.2ms, p95 11ms. live_staged.py에 --windows 선택 옵션만 추가했으며 정책 코드는 바뀌지 않았다.

조건은 기존과 같다: 브라우저 1개, 최대 600초, 사망·오류·Esc 시 종료, 자동 재시도 없음, 닉네임 소문자 i/l 무작위 20자.
