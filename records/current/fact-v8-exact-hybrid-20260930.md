---
record_schema: 1
id: fact-v8-exact-hybrid-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---

# V8 — 원본 V1 잔해 적극 + 원본 V6 전환

사용자 진술: “전혀 달라보이는데? 다시 제대로 만들어서 V8로 만들어. V1 정확하게 V1을 사용해, 그리고 V6를 정확하게 사용해서 V8을 다시 만들어.” 이는 사용자 관찰·구현 요청이며 V7 성능 열화의 실험적 입증은 아니다.

구현: V8은 원래 `pilotStep`과 `v6Step`을 별도 Pilot 인스턴스로 호출한다. 원본 판단 함수·궤적 실행은 수정하지 않았다. 전환마다 인스턴스를 재생성하거나 이전 명령을 임의 주입하지 않는다. V6 거시 계획은 원래 `v6Route`를 호출하며 강제 탈출 플래그나 먹이 안내선 제거를 사용하지 않는다. 빈 곳에서는 원래 V6처럼 explore, 잔해가 있으면 food, 진행 경로가 위험하면 escape를 판단한다.

설정: 실제 Windows Chrome에서 읽은 저장 프리셋 `잔해 적극 2026-09-28`의 V1 값을 복원했다. 원문 스냅샷 `research/v8_settings_before_20260930.json`의 presets 항목. W_GOAL=300, BOOST_COST=15, SAFE=5, TIGHT=0, SAFE_HEADS=10, REMAINS_ONLY=1, REMAINS=12, HEAP_GATE=0, SIZE_PROFILE=0. V6가 사용하는 설정은 V7 적용 직전 실제 값(`research/v7_mock_20260930/windows_before.json`)으로 복원: V6_MARGIN=1, V6_FOOD_R=5000, V6_HEAP_SIZE=100, V6_CENTER_W=2 등. 사용하지 않는 다른 모드 스위치를 끄고 분기에서 V6_ON만 활성화한다.

전환: 내 머리 반경 V8_HEAD_R=450px 안에 서로 다른 적 머리가 V8_HEAD_N=3개 이상이면 V6, 기준 미만이 V8_CLEAR_S=1초 지속되면 V1. 세 값 모두 조정 가능. 전환 판정은 전체 관측된 머리를 별도로 세며, V1에 주는 몸 관측 범위 1150px·먹이/머리 3000px 및 V6의 원래 범위를 바꾸지 않는다. 전환 때 낡은 거시 안내선만 폐기한다.

검증 원문:
- `research/v8_verify.mjs` → `research/v8_verify_20260930.json`: 실제 사망 블랙박스 `runs/v6dual_20260930_124604/slp_01_box.json.gz`의 마지막 300프레임 재생. V1 150·V6 150프레임, 전환 9회. V7 이전 원본 `research/v7_before_20260930/pilot.js`와 방향·부스트·계획 차이 0. 기존 판단 함수 본문 일치. 거시 경로 빈 곳/먹이/벽/머리 네 장면의 경로·의도·인증 결과 동일. 별도 전환 판정으로 관측 배열도 원본 V1/V6와 동일함 확인.
- `research/v8_mock.py` → `research/v8_mock_20260930/result.json`: 실제 브라우저 Worker에서 V1→V6→V1 복귀, 반경·머리 개수 변경, 화면 모드 버튼·프리셋, 저장 후 재로드 확인. 페이지 오류 0. 캡처 `controls.png`, `avoid.png`.
- `research/v8_v6_regression_20260930.json`: 기존 V6 빈 곳·통로·머리 공격·잔해·벽·작은 먹이 제외 검사 통과.

범위: 원본 알고리즘·설정 효과·전환의 오프라인 동일성 및 모의 동작 확인. 신규 실게임 및 생존·성장 성능 비교는 실행하지 않았다. 전환 자체가 환경과 이력에 미치는 실전 효과까지 같다는 의미는 아니다.

빌드 0930-6a3c0330. 코드 SHA-256:
- `ext/pilot.js`: `2f1fbda9ac6d5405c30a71ed0ceb450a489edcd5406d8a72bbcf36eea2f47947`
- `ext/mod.js`: `466c6a7ae3a78fe9ac52627df8943ac41adde088aeac38b91b00b5ff005bc025`
- `params.json`: `a186ff04ef35191bdedb297bcb1770eac46cfeeef72afcce65d56e472266051c`

변경 전 사본 `research/v8_before_20260930/`, 변경 패치 `research/v8_20260930.patch`.

Windows 적용 원문: `research/v8_mock_20260930/windows_applied.json`. 게임이 진행 중이 아닌 상태에서 확장 재로드 후 `v8_exact` 선택. 빌드 0930-6a3c0330, 반경 450px·머리 3개·복귀 대기 1초. 봇은 꺼진 대기 상태이며 새 게임을 시작하지 않았다. 기존 사용자 프리셋은 보존됨.
