---
record_schema: 1
id: claim-web-sim-windows-20260924
kind: claim
status: supported
as_of: 2026-09-24
checked_at: 2026-09-24
evidence_refs:
  - path: .workspace/sources/web-sim-windows-check-20260924.md
    hash: 449cab80aec0f31f205d16c1bb5f45a179f710a3ab33048864253a058acd334d
    locator: HTTP API 확인 및 Windows 호출 오류
dependency_hashes: {}
revision: 80a44bd3-a049-4525-881a-4397efb8b94c
---
# 브라우저용 로컬 시뮬레이터 준비, Windows 자동 실행 차단

사용자 요청에 따라 web_sim.py와 web_sim.html을 추가하고 localhost:8765 서버를 실행했다. 기존 World와 pocket 제어기를 재사용했다. 자동 진행·정지·수동 입력·새 시드 HTTP API 검사와 JavaScript 구문 검사는 통과했다.

Windows cmd.exe 호출이 WSL UtilBindVsockAnyPort socket failed 오류로 실패하여 Windows Chrome을 직접 띄우지 못했다. Linux 브라우저의 DOM 검사도 지연되어 화면 검증은 미완료다. supported는 코드 준비와 API 확인 및 오류 관찰에 한정하며 Windows 실행 성공을 의미하지 않는다. 서버는 시작 버튼 대기 상태이며 실사이트 실행은 하지 않았다.
