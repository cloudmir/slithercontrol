---
record_schema: 1
id: fact-v7-hybrid-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---

# V7 — V1 잔해 추종과 머리 밀집 시 V6 회피

사용자 지시: “V7을 만들되, V1 먹이 추종 프로파일을 사용하고 있다가, 주변에 머리가 많이 모이면 (설정가능 - 범위, 머리 개수) V6로 피하는 프로파일을 만들어줘”.

구현·적용 빌드0930-f2e18a44. 내장 프리셋 `v7_remains`, 표시 `V7 · 잔해 추종 + 혼잡 회피`와 V7 선택 버튼을 추가했다. 평소 실제 V1 pilotStep을 호출하고, 관측된 서로 다른 적 머리를 내 머리 기준 거리로 세어 문턱 이상이면 즉시 실제 V6 v6Step으로 전환한다. 두 제어기는 독립 인스턴스·이력을 갖는다. 설정값의 알고리즘 스위치를 매 틱 변경하지 않는다.

V7_HEAD_R 기본450px(100–3000), V7_HEAD_N 기본3개(1–20), V7_CLEAR_S 기본1초(0–5)를 홈·조정 화면에서 변경·저장할 수 있다. 기준보다 적은 머리 수가 복귀 대기시간 동안 계속 유지되면 V1로 돌아간다. 중간에 다시 밀집하면 복귀 타이머를 취소한다. 몸통 수는 세지 않으며 반경 경계는 포함한다. 관측 반경을 판정 반경 이상으로 확장했다.

새 프리셋의 V1 수집 값: 공격형 기반, REMAINS_ONLY1, REMAINS12, W_GOAL250, W_FOOD3, FOOD_R3000, BOOST_COST−35, RIVAL_R0, HEAP_GATE0, SIZE_PROFILE0, W_CROWD0, W_HUNT0. 이는 이번 프리셋의 구현 선택이며 실게임 최적값 인증이 아니다. V7 버튼으로 현재 설정에서 모드만 변경하면 현재 V1 조정값을 사용한다. 기본 프리셋은 혼잡 전환 외에도 V1 자체 회피 판단을 수행한다.

V7의 거시 Worker는 밀집 또는 회피 유지 중에 V6 탈출 경로를 요청한다. 강제로 탈출 의도를 적용하여 잔해 수집 경로를 회피에 재사용하지 않는다. 경로가 도착하기 전에는 V6 근접 판단으로 회피하며, 낡거나 변경된 경로는 기존 V6 검사로 폐기한다. 화면과 전체 로그에 V7 단계·머리 수·반경·문턱·전환 여부를 남긴다. 프리셋·수치 변경 시 이전 거시 경로를 무효화한다.

검증:
- research/v7_verify.mjs → research/v7_verify_20260930.json: 평상시 V1 명령 동일, 혼잡 시 V6 명령 동일, 문턱 진입·복귀 지연·밀집 재발·실시간 파라미터 반영·중복 머리 ID·반경 경계·몸통 제외·거시 경로 없는 회피·먹이 경로 거부 통과.
- research/v6_verify.mjs → research/v7_v6_regression_20260930.json: 기존 V6 합성 회피·잔해 검사 통과.
- research/v7_mock.py → research/v7_mock_20260930/result.json: 실제 브라우저 Worker에서 V1→V6→V1 전환, 거시 escape 경로 사용, 판정 반경2500px·개수1 설정으로2000px 머리 인지, UI 수치 입력·모드 버튼·값 저장 후 새로고침 유지, 페이지 오류0. controls.png/avoid.png에 화면 보존. 저장은 기존200ms 지연 방식이며 저장 완료 뒤 새로고침해야 한다. 모의 첫 V1 판단56ms, 복귀 판단17ms로 V1 비용은 V6보다 크다. 실게임 성장·생존 우위는 미검증.
- research/v7_apply_idle.py --wait-idle: Windows 새 빌드 및 프리셋 적용 확인(windows_applied.json): 버전f2e18a44, V7_ON1, 반경450·머리3·복귀1초, W_GOAL250, playing=false, bot=false. 신규 실게임은 시작하지 않았다. 적용 전 사용자 설정은 windows_before.json에 보존.

원본 코드: research/v7_before_20260930/. 변경 내역: research/v7_20260930.patch.
SHA-256: ext/pilot.js 2bca18fc8277c86fa844a386aec925c0e8f56a660ffe1fcd5dfba3e3ace0d954; ext/mod.js 79ca6eb5cb8e6a3ffda61802b067839e039709b8f78185a9c23ca982dc383525; params.json 2fcf52c578c7284b711247211163c60f320f8d66ae319e633e667d76d6291493.
