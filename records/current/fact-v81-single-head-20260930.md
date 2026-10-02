---
record_schema: 1
id: fact-v81-single-head-20260930
kind: fact
status: superseded
as_of: 2026-09-30
---

# V8-1 — V8 유지 + 단일 머리 근접 시 원본 V4.1

사용자 지시 원문: “V8-1을 만들고, V8 기능에 추가로 머리 1개와 근접일때는 V4-1을 사용하게 만들어봐. (범위 px 설정가능하게)”. 사용자 선택으로 기록한다. 신규 실게임 실행 지시로 확대하지 않았다.

구현 원문: ext/pilot.js의 v81Choice, v81Values, v8Step과 ext/mod.js의 observe, V8-1 버튼. 기존 V8를 유지하며 새 V81_ON 모드·v81_exact 프리셋·화면 선택 버튼을 추가했다.

전환 우선순위: 기존 V8가 밀집 V6를 사용 중이면 V6를 유지(기존 복귀 대기 포함). 그 외, V81_HEAD_R 반경 안 서로 다른 적 머리가 정확히 1개면 원본 v41Step을 사용. 나머지는 원래 V8의 V1 먹이 추종. 별도 V4.1 인스턴스·이력을 보존하며 원본 V1/V4.1/V6 판단 함수는 수정하지 않았다. 거시 V6 안내선은 avoid 상태에서만 생성하고, 모드 전환 시 낡은 안내선을 폐기한다.

V81_HEAD_R 기본250px, UI 범위0–6000px, 25px 단계. 0이면 추가 근접 전환 끔. 내 머리와 적 머리 중심 간 거리이며 경계값 포함. 머리 ID 중복 제거, 죽은 적·자신 제외. 혼잡 판정 V8_HEAD_R=450px, V8_HEAD_N=3, V8_CLEAR_S=1초는 그대로 유지하며 각각 조정 가능. 전환 판정은 관측된 전체 머리를 따로 세고 원본 분기에 전달하는 관측 범위는 늘리지 않는다. V4.1 관측은 기존 단독 V4.1과 동일한 몸1150px, 먹이·머리3000px.

V8-1 버튼은 현재 조정값·프로필을 유지하고 모드 스위치만 바꾼다. 내장 v81_exact 프리셋은 V8 내장 기준값을 기반으로 한다. 현재 변경값이 있는 경우 내장 기준과 다른 값은 수정 상태로 표시된다. 판 중 전환은 game.changes에 기록하며 일반 게임 설정 기록과 trace의 v8_phase, v81_heads, v81_radius로 어떤 분기와 반경을 사용했는지 확인할 수 있다.

검증 원문:
- research/v81_verify.mjs → research/v81_verify_20260930.json. 실제 기록 runs/v6dual_20260930_124604/slp_01_box.json.gz 마지막300프레임을 V1·V4.1·V6 각각100프레임으로 교대 재생. 독립 원본과 명령(방향·부스트), 계획 차이0. V4.1 판단 본문 동일. 0/1/2/3개 분기, 밀집 우선·복귀 대기, 반경 경계, ID 중복, 실시간 반경 변경 통과.
- research/v81_v8_regression.mjs → research/v81_v8_regression_20260930.json. 기존 V8 원본 동일성300프레임 및 V6 거시 빈 곳·먹이·벽·머리 경로, 원본 관측 배열 동일성 통과.
- research/v81_mock.py → research/v81_mock_20260930/result.json. 브라우저 Worker에서 feed→near(V4.1)→avoid(V6)→near→feed, 반경 변경100/400px, 현재 V8 W_GOAL=222 유지, 설정 저장 후 재로드, 단독 V6 선택 시 V81 해제 확인. 페이지 오류0. 캡처 controls.png, near.png. 최초 테스트는 W_GOAL 최대300을 넘는333을 넣어 기대값이 틀려 실패했으며, 허용 값222로 바꿔 검증했다.

범위: 오프라인 재생·모의 페이지 동작 검증. 실전 생존·성장 성능은 미검증. 기존 코드·기록은 보존됨. 변경 전 사본 research/v81_before_20260930/, 변경 패치 research/v81_20260930.patch.

빌드 0930-d1a1650d. SHA-256:
- `ext/pilot.js`: `88c980821793035e4b6de5ef26f4ca7996446c6a65b0314334ef28f73ff34285`
- `ext/mod.js`: `6d692a4f1d16add76304c625515a4623ff21f3a82bf8c3bb350082c06f16584b`
- `params.json`: `2289d2ab01b6c2864b72d0c668785860de854b8db23e33e3aa6a76d278881257`

Windows 적용 원문: research/v81_mock_20260930/windows_before.json, windows_applied.json. 대기 확인 후 확장 재로드·페이지 갱신·V8-1 버튼으로 적용. V81_ON=1, V81_HEAD_R=250px, V8_HEAD_R=450px, V8_HEAD_N=3, V8_CLEAR_S=1초, W_GOAL=300. 적용 직후 playing=true, bot=false로 반환됐다. 새 테스트 게임을 명시적으로 시작하는 명령은 실행하지 않았으며 이 상태를 실게임 검증 결과 또는 대기 상태로 단정하지 않는다.

후속 사용자 지시: “그리고 V8-1은 삭제. 생각보다 V4.1이 잘 죽네.” V4.1의 잦은 사망은 사용자 관찰이며 비교 실험으로 확정한 사실이 아니다. 이에 따라 V8-1은 삭제됨. 이전 구현·시험 결과는 이력으로 보존한다. 현재 구현은 fact-verified-controls-sliders-20260930 참조.
