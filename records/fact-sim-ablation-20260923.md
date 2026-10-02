---
record_schema: 1
id: fact-sim-ablation-20260923
kind: fact
status: confirmed
as_of: 2026-09-23
checked_at: 2026-09-23
evidence_refs:
  - path: runs/ablation.json
    hash: a546f7ccb8b51ca73c5f16e5bf87f9747a792435ad89030f792d7cbd87b31519
    locator: results (seed0 20000, 8 seeds x 3 min, normal/hard)
  - path: runs/verify.json
    hash: 0ed1814222307637acb92dfb0680f656fb9cdc1456c89fc2a706d4b69b1c21ac
    locator: results (8 new seeds x 3 min)
  - path: runs/compare.json
    hash: b296949e0c6f81b153cb8ac265299a726ed606dd3dc7273508e8b55484da7c52
    locator: results (4 seeds x 3 min)
dependency_hashes: {}
revision: e3e4dfe4-98f3-4d65-84ee-6e94d9ffb517
---
# 시뮬레이터 비교·절제 실험 결과 (2026-09-23)

측정값(시뮬레이터, 사망/10분 보통/어려움, 컨트롤러당 24분).

| 컨트롤러 | 사망/10분 | 성장/분 | 부스트 | 출처 |
|---|---|---|---|---|
| 직진 + 안전장치(정책 없음) | **2.92 / 3.33** | 491 / 939 | 9~11% | ablation.json (18:22) |
| 섞은 배선 초파리 + 안전장치 | 7.92 / 12.08 | 1479 / 2069 | 67~73% | ablation.json |
| 초파리 + 안전장치(기본 플래너 파라미터) | 9.17 / 13.75 | 1338 / 2202 | 41% | ablation.json |
| 초파리 + 안전장치 | 8.75 / 11.25 | 1383 / 2189 | - | verify.json (다른 시드) |
| RL PPO + 안전장치 | 5.83 / 8.33 | 1984 / 2311 | - | verify.json |
| 플래너 기본값 | 6.67 / 12.50 | 1272 / 1754 | - | verify.json |
| 초파리 단독(안전장치 없음) | 46.7 / 82.5 | - | - | compare.json (4시드) |

- 사망 횟수(어려움): 직진+안전장치 8회 vs 초파리 계열 27~33회 → 차이가 표본 소음보다 큼.
- 진짜 배선 ≈ 섞은 배선(배선 1회 셔플, 시드 1234, 뉴런별 입·출력 연결 수·부호 보존).
- 한계: verify와 ablation은 서로 다른 시드 집합(짝지은 비교 아님). 시뮬레이터는 실사이트보다 약 10배 가혹(실사이트 v1: 약 25분에 2사망). 직진+안전장치는 실사이트 미검증.
- 소표본 안전장치 개입률: RL 약 2%, 초파리 약 37%, 직진 약 33%.
