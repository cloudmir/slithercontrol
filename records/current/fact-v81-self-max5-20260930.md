---
record_schema: 1
id: fact-v81-self-max5-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---

# 내 몸통 밀도 가중치 상한5

사용자 선택: “내 몸통 밀도의 최대값을 5까지 올려줘.”
빌드0930-3fc0e92e. params.json V81_BODY_SELF_W UI 상한과 ext/pilot.js bodyDensity selfWeight 계산 상한을1→5로 변경. 최소0.01·단계0.01·기본0.1 유지. ext/mod.js 툴팁에5배 의미 추가. 기존 점유율100% 상한·적과 겹치면 적 우선·중복 제외 방식 유지.
검증 원문 research/v81_self5_20260930/calculation.json: 같은 몸 가중치1→5에서3.00257→15.01286%(5배), 6 입력 시5로 제한. ui.json: 실제 브라우저 슬라이더 끝값5·숫자5.00·저장/재로드5 확인. 문법 검사 통과. before/에 변경 전 파일 보존.
windows_applied.json: 현재 게임 진행 중으로 재로드 보류. 게임 종료 후 확장 재로드 및 페이지 새로고침 필요. 신규 실게임 시험 없음.
