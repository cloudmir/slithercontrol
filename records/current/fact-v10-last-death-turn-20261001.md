---
record_schema: 1
id: fact-v10-last-death-turn-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-last-death-turn-analysis-20261001.md
    hash: 51da536b159b254bbb6a2fa47cf74e1aa9c9976f49a2bc151ea7fbdb452a7216
    locator: 본문 및 재생 결과
dependency_hashes: {}
revision: e2ff832c-3895-4385-807b-08b8ad4c2f7c
---
# 마지막 사망 시 회전 중단
사용자 가설: 왼쪽으로 더 꺾으면 생존 가능. 실제 생존으로 확정하지 않는다.
빌드1001-e57022de 144.4초 판, research/latest_death_frames_20261001/ 원본 보존. 143.874~144.338초 같은 방향 명령 반복. 전 후보 첫 단계 충돌 탈락 이후 방향 변경 감점이 직진을 선호하는 구조 확인. 이후 root 실패 및 prefix_collision. 반사실 추가 좌회전은 정적 모델 침범 감소이나 여전히 음수, 생존 입증 아님. 분석만 수행, 코드 수정 없음.
