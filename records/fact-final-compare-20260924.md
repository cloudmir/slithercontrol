---
record_schema: 1
id: fact-final-compare-20260924
kind: fact
status: confirmed
as_of: 2026-09-24
checked_at: 2026-09-24
depends_on:
  - fact-sim-ablation-20260923
evidence_refs:
  - path: runs/final.json
    hash: a9fcc34c53adca247888b120bed8f524350cf71d9c1ddd17401690c0e3e4ea5b
    locator: results (seed0 40000, 8 paired seeds x 3 min, normal/hard; 2026-09-24
      00:38)
  - path: runs/fly_tune_validation.json
    hash: 64bab0f9d4195e4bf8ab53aac3009de0086cc399a9f7ebd1b9c4f24b6575d702
    locator: validation table (fly alone, hard, 8 seeds)
  - path: runs/deaths.json
    hash: c75833ce7c79424d42bea044fdbfb9d2c21ed73f78ac0d02e02e51a8589a2738
    locator: death kinds per controller (seeds 30000+)
dependency_hashes:
  fact-sim-ablation-20260923: ef8a054fc984542db91ecf2dc829c1543e0908cf9b149bdff372bf6e75683044
revision: 6ca61da5-b21d-4250-b575-1eb3a8900d30
---
# pipeline2 최종 결과 — 커넥톰 재튜닝 및 최종 비교 (2026-09-24 00:54 완료)

커넥톰 재튜닝(fly.py tune, 3세대, 안전장치 없음, 어려움): 사망/10분 기본값 117.9 → 선택값(top2) 75.8(검증 8시드). 성장 3186 → 2484.

최종 비교(같은 시드 8개 × 3분, 사망/10분 보통/어려움, 성장/분, 안전장치 개입률):

| 컨트롤러 | 사망 | 성장 | 개입률 |
|---|---|---|---|
| RL PPO + 안전장치 (v2cem 파라미터) | 5.42 / 14.17 | 1972 / 2747 | 4% / 7% |
| 플래너 튜닝 v3 (top3) | 6.25 / 15.42 | 994 / 1665 | - |
| 직진 + 안전장치 (v3 파라미터) | 8.33 / 12.92 | 577 / 1119 | 31% / 37% |
| 플래너 기본값 | 10.42 / 12.50 | 1086 / 1887 | - |
| 커넥톰 + 안전장치 (재튜닝) | 11.67 / 17.92 | 633 / 1444 | 47% / 68% |
| 섞은 배선 + 안전장치 (같은 재튜닝 파라미터) | 12.50 / 8.33 | 822 / 1018 | 47% / 57% |

- 커넥톰+안전장치는 보통·어려움 모두 최하위. 어려움에서 진짜 배선 43사망 vs 섞은 배선 20사망(8시드 중 6시드에서 진짜 배선이 더 많이 사망, 1시드 동률).
- deaths.py(24분): 커넥톰+안전장치 49사망, 중앙 생존 10초(플래너 16~17초), 위험 선택 7회(플래너 1~2회).
- 전날 ablation의 "직진+안전장치 2.92/3.33"은 재현되지 않음(이번 8.33/12.92). 차이: 안전장치가 쓰는 플래너 파라미터가 v2cem(buffer 10.52)에서 v3 top3(buffer 3.64)로 바뀜, 시드 집합도 다름. 원인이 buffer인지는 미검증(가설).
- v3 top3는 w_food=0.0(먹이 가중치 0)으로 선택됨.
