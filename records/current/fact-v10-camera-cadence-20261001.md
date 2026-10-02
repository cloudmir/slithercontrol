---
record_schema: 1
id: fact-v10-camera-cadence-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-camera-cadence-20261001.md
    hash: eddac011b2ce1f4dbc5dc78fed30075112359a45329cd63c410cae6d89ca76de
    locator: 코드 촬영 주기 및 실제 Chromium 캡처 확인
dependency_hashes: {}
revision: 50c19001-3c3b-4b55-a2d0-1556547c678b
---
# V10 수집기 1초 캡처

사용자 관찰: 예전에는 1초마다 찍었던 것 같다고 질문했다. 확인한 run_live.py는 0.5초마다 촬영하고 최근 8장을 보관한다. 이번 research/v10_continuation_20261001/live5.py의 이전 코드는 2초 상태 확인·30초 촬영이라, runs/v10_continuation5_20261001_113057 첫 판(18.4초)에는 시작 직후/종료 화면만 있고 사망 직전 스크린샷이 없다.

수집기만 수정: camera.py 비동기 작업으로 1초 JPEG 촬영 및 모든 이미지·촬영 시각 저장. 알고리즘 변경 없음. 실제 로컬 Chromium 확인 3장, 간격 1.001초/1.001초, 파일 전부 저장. 원문·해시·결과 research/v10_continuation_20261001/camera_source.txt 및 camera_check/result.json. 아직 이 검사는 실게임 촬영 성능 측정이 아니다.
