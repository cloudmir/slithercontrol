---
record_schema: 1
id: fact-v10-appetite-live-stop-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-appetite-live-stop-20261001.md
    hash: 9982d6bab9952f2f96176d66fa0771835f35bba3d767e410f20b27b20b5ebbca
    locator: validation, visual_observation, summary
  - path: .workspace/sources/v10-appetite-risk-controls-20261001.md
    hash: 6cbc34f59f13dd2e5544e52a563094117f88e5817de35005e7b9fa1a5d93c1be
    locator: foodValue, comparator, beam score, boost conditions
dependency_hashes: {}
revision: 62f7bfa2-c657-4135-8f21-901ad2012a40
---
# V10 먹이 위험 감수 실게임 — 사용자 중단

사용자 요청: 실제 검증·데이터 수집. 이후 “먹이가 있어도 적극적으로 못가네”, “회피나 출구전략은 안정적인듯”, 빈 곳에서도 외곽 부스트 관찰 및 “그만 관찰하자”. 이는 사용자 관찰이며 회피 성능 검증 결론으로 확정하지 않는다. 봇 끄기·게임 연결 종료 후 수집기 정상 종료. 새 게임 없음.

실행: runs/v10_appetite_live_20261001_125506/, 빌드 1001-e3606de6, 서버 181.41.140.178:444. 576.8초 사용자 중단(사망·상한 종료 아님). 길이 10→75, 최대137, 순증가6.76 L/분(부스트 소모 포함). 판단14,531회, 오류0, 페이지 오류0. 판단 프레임 중 부스트25.7%. 화면1,077장, 촬영 간격 중앙값0.5초. 판단 p95 10.2ms, 관측→명령 p95 27.3ms.

판 중 사용자가 위험 감수·중앙 가중치·경로 수를 변경했으므로 인과적 A/B 비교 불가. 코드 해시 전후 동일. 코드·원본 해시는 summary.json/validation.json에 보존. 원본 slp_01.json, slp_01_log.json.gz, slp_01_box.json.gz, trace/food/camera JSONL 및 이미지 보존. risk100 마지막 구간 길이82→75(398초); 다른 구간과 성능 우열 근거로 쓰지 않는다.

화면 game_01_second_0406_0204.077.jpg에서 선택 경로 RISK .64가 오른쪽 잔해 방향, 대안 RISK .50이 왼쪽 위 방향임을 확인. 위험을 감수한 먹이 방향 선택 사례이며 실제 섭취 성공 증명은 아니다.

코드 확인:
- 위험-먹이 가치가 우선 비교 기준. 먹이 가치는 경로와 잔해 거리·도달 시간으로 감소하므로 위험 감수100도 먼 먹이 추구를 보장하지 않는다. 먹이 방향 기동 후보는 존재한다.
- 중앙 점수는 잔해 목표가 있으면0. 목표가 없어도 위험 평가 뒤 보조 점수이므로 중앙 가중치를 높여도 외곽 경로가 이길 수 있다.
- 부스트는 길이·허용 스위치 및 추종 각도·목표 거리 조건으로 선택되며, 별도의 섭취/탈출 이득 조건·질량 소모 비용이 없다.

후속 제안(미구현): 위험 허용과 먹이 추구 강도를 분리하고, 중앙 복귀를 실제 목표 선택에 반영하며, 부스트의 시간 이득과 소모를 비교한다. 이번 판 이후 정책 수정·추가 실게임 실행 없음.
