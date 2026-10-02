---
record_schema: 1
id: fact-v6-collection-controls-20260930
kind: fact
status: confirmed
as_of: 2026-09-30
---

# V6 잔해 수집 조정과 중심 이동 가중치

사용자 지시: “관련 기능을 파라메터를 조정할수 있도록 추가해주고, 자꾸 외곽으로 도망가는데, 중심으로 이동하는것에 대한 가중치도 추가”.

빌드 0930-298ee1cb. V6 홈·조정 화면에 추가한 항목(기본값, 범위):
- V6_FOOD_R 잔해 탐색 반경 3000px, 500–5000.
- V6_HEAP_SIZE 무더기 칸 크기 250px, 48–500.
- V6_GOAL_W 잔해 경로 추종 가중치 1.5, 0–5. 0이면 잔해 목표 선택도 끔.
- V6_BOOST_W 잔해 부스트 가점 80, 0–300. 0은 이 가점 제거이며 부스트 자체 금지가 아님.
- V6_BOOST_MIN_MASS 최소 무더기 크기 합 48, 0–500.
- V6_BOOST_MIN_DIST 최소 목표 거리 150px, 0–1000.
- V6_CENTER_W 중심 가중치 2, 0–5. 잔해 목표가 없을 때 탐색·탈출 후보의 맵 중심 접근을 선호. 중심 2000px 이내에서는 점진적으로 약해지고 중심에서 0. 가중치 0으로 해제.

기존 V6_FOOD_W(근접 먹이 수집), V6_REMAINS_MIN(큰 먹이 판정)도 유지. 숫자를 바꾸면 두 Worker로 설정을 전달하고 저장한다. 입력 변경 중 패널 제거가 blur/change를 재진입시키던 오류는 동일 값 재처리를 막아 수정했다.

행동: 큰 먹이를 칸별 무더기로 묶고 질량·거리·기존 목표 유지를 반영해 상위 8개를 고려한다. 먹이 관측 반경은 새 탐색 반경과 연결했다. 미로 범위 밖 잔해는 접근 방향 목표로 삼고 현재 지도 안에서 검사한 경로까지만 표시한다. 먼 먹이까지 전 구간 안전을 인증하지 않는다. 무더기 조건을 충족하고 목표 거리를 줄이는 부스트 후보에 가점. 충돌·머리 위험 우선순위는 유지한다. 중심은 지도 좌표 중심이며 실제 적 밀집 지점 추정이 아니다.

검증(실게임 성능 검증 아님):
- research/v6_collection_check.mjs → research/v6_collection_controls_20260930.json: 탐색 범위 1000/3000으로 2000px 잔해 목표 여부 전환, 무더기 48/250으로 단일 먹이/큰 무더기 선택 전환, 부스트 가점 0/300과 최소 질량·거리 문턱의 실제 명령 전환, 중심 가중치 0/2에서 바깥/안쪽 경로 전환, 큰 가중치에서도 벽 회피, 일반 먹이 제외 통과. 이 결정론적 검사는 탐색 예산을1000ms로 설정했다.
- research/v6_verify.mjs → research/v6_collection_verify_20260930.json: 기존 합성 회피·잔해 검사 통과. runs/v6remains_20260930_131640/slp_01_box.json.gz의1819프레임을 기본 탐색 예산60ms로 재생, 근접 p95 0.63ms, 미로 p95 13.02ms·최대41.37ms. 고정 관측 재생이라 실제 성장·생존 개선 증명이 아니다.
- research/v6_collection_mock.py → research/v6_collection_mock_20260930/result.json: 실제 Worker와 모의 브라우저에서 잔해 접근9.55px, 소멸 후 탐색, 추가 7항목 UI 입력 및 새로고침 후 값 보존, 페이지 오류0. controls.png에 조정 화면 보존.
- Windows 진행 중 판에는 새로고침하지 않았다. 판 종료 후 research/v6_collection_apply_idle.py --wait-idle로 적용. windows_applied.json: 버전298ee1cb, playing=false, bot=false, 탐색3000·무더기250·목표1.5·부스트80·중심2 확인. 새 실게임은 시작하지 않음.

보존: research/v6_collection_before_20260930/ 원본, research/v6_collection_20260930.patch 변경 내역.
SHA-256: ext/pilot.js 7bd20004280194d9d26bed508fcd3de3bb7994ad01687d5f790026d43db7e805; ext/mod.js 8717998df37b707bcf3c55f4bc1ebf5a8d51f5fd5e0b7ec662b39cbd2a171552; params.json 3331974212e23161508ff54a655d8eab038475055d1917feb5a32a1c88780c35.
