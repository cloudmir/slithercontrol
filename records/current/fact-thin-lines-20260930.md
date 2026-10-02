---
record_schema: 1
id: fact-thin-lines-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---

# 봇 표시선0.5px

사용자 지시: “선들을 모두 아주 앏은 선으로 바꾸어줘..”.
빌드0930-fb9a7ef9, ext/mod.js OVERLAY_LINE_WIDTH=0.5. 반경·경로·머리 예측·광선·목표·사망 표시·분석 선·타임라인·경계선을0.5px로 통일. 안전 여유 띠는 기존 반경을 보존한 선분 캡슐의 얇은 윤곽선으로 변경. 게임 뱀 실제 몸 두께·텍스트 외곽선은 유지. ext/pilot.js·params.json 변경 전과 바이트 동일.
검증 원문 research/thin_lines_20260930/result.json·both.png: 반경350/500px, 중심·확대율·표시 스위치 동기화·저장 확인. check.py에서 두 반경 선0.5px 확인. overlay.json: 모의 Worker13틱과 분석 표시 중 관측된 오버레이 stroke 선폭 모두0.5, 오류0. 문법 검사 통과. before/ 원본 보존.
windows_applied.json: 현재 게임 진행 중이므로 재로드하지 않음. 종료 후 확장 재로드 및 페이지 새로고침 필요. 신규 실게임 시험 없음.
