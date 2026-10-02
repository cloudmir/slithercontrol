---
record_schema: 1
id: claim-chrome-runtime-distinction-20260924
kind: claim
status: supported
as_of: 2026-09-24
checked_at: 2026-09-24
evidence_refs:
  - path: .workspace/sources/pocket-live-repeat2-20260924.md
    hash: 20e5f62763ba9cb728770a2c6e004f2b8e068ac07df65e0545362631f14711bc
    locator: browser_executable 및 Page.goto 오류
  - path: .workspace/sources/regular-chrome-live-20260923.md
    hash: 46adc1ad56427a105e4f7bd481903315d402adb91e312e1643735ccc06c0fe0b
    locator: 정식 Linux Chrome 경로와 Windows 연동 오류
dependency_hashes: {}
revision: b410a849-9dd0-4f51-b919-de56cdf96ec6
---
# Chrome 실행 환경 구분 및 최근 재시도 결과

2026-09-24 원문 read_source 확인. 최근 13:33:55 pocket 재시도는 Playwright가 설치한 Linux 브라우저 경로 chromium-1234/chrome-linux64/chrome을 사용했다. Windows 설치 Chrome을 실행한 것이 아니다. 30초 Page.goto 시간 초과로 게임 시작 전 종료했다. 이 시점 오늘 예약은 4회(실제 게임 1회, pocket 접속 오류 3회), 잔여 1회다. 이전 두 실패 기록의 3회/잔여 2회는 이전 시점 수치다. 실패 원인은 미확인이며 WSL이나 브라우저 종류가 원인이라고 확정하지 않는다.

과거 9월 23일 정식 Chrome 테스트는 Linux Google Chrome 실행 파일을 사용했고 Windows 연동 사전 확인은 socket failed 오류였다. 그 오류가 현재도 지속된다고 검증한 것은 아니다.

기술 설명: 파일 저장 파티션과 실행 운영체제는 별개다. Windows 드라이브로 코드를 옮겨도 WSL Linux Python으로 실행하면 Linux 프로세스다. WSL은 Linux GUI 앱 표시 및 Windows 실행 파일 호출을 지원한다. Windows Chrome을 사용할 때 실행기까지 Windows Python/Playwright로 옮기는 구성이 단순하다는 것은 설계 의견이며 사용자 선택이나 적용 완료가 아니다. WSL 제어기와 Windows 브라우저를 디버깅 연결로 분리할 수도 있으나 네트워크 접근과 연결 설정이 필요하며 현재 프로젝트에서 검증하지 않았다.

확인한 공식 문서:
- https://learn.microsoft.com/en-us/windows/wsl/filesystems (Windows/Linux 실행 및 파일 저장 구분)
- https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps (Linux GUI 앱 지원)
- https://playwright.dev/python/docs/browsers (Google Chrome channel)
- https://playwright.dev/python/docs/api/class-browsertype#browser-type-connect-over-cdp (기존 브라우저 연결)

이번 사용자 질문은 환경 설명 요청이다. 새 실사이트 실행이나 Windows 이전을 수행하지 않았다.
