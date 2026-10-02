---
record_schema: 1
id: claim-pocket3-live-result-20260924
kind: claim
status: draft
as_of: 2026-09-24
depends_on:
  - decision-pocket3-20260924
dependency_hashes:
  decision-pocket3-20260924: 5ab0e3fe0dba6f715c886bd94e4aeabc12a9248a5eb12b6f67bdba62060aaaaa
revision: b5a45ca3-9c02-4936-928e-fa0aa7e1cbba
---

# pocket3 실사이트 1판(14:41:26, Windows Chrome) — 600초 생존, 길이 2974

근거: runs/live_staged_20260924_144126.jsonl, 스크린샷 runs/live_staged_20260924_144126/ (로컬 파일, source 미보관이라 draft).

- 결과: 600초 제한까지 생존(time_cap). 최대·최종 길이 2974, 최고 39위(종료 화면 43/435위).
- 판단 간격: p50 67.4ms, p95 68.9ms, 최대 190.8ms. 직전 pocket2 판 사망 직전 0.3~0.4초에서 설계값(66.7ms) 수준으로 회복. 관측 전송 축소가 효과를 낸 것으로 판단.
- 판단 시간 p95 33.2ms. 모드: 먹이 수집 6289, 무더기 추적 2261, 긴급 회피 217회.
- 가장 가까운 순간의 모델 간격 +36.7px(67.6초). 15px 미만 근접 장면 0회.
- 스크린샷: 42.9초 부스트로 큰 먹이 줄기 쪽 이동(길이 78) → 48.1초 길이 279(약 5초 만에 +200). 죽은 지렁이/부스트 흔적 먹이를 추적해 먹는 동작을 확인. 종료 장면 주변 위협 없음.
- 한계: 1판. 로컬 4판에서는 pocket3 평균 성장이 pocket2보다 낮았다(2698 vs 4114). 실사이트 먹이 크기 단위와 무더기 임계값의 적합성은 미검증. 무더기 스크린샷은 최대 20장이라 112초 이후는 없음.
