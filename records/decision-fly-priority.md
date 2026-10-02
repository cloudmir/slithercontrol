---
record_schema: 1
id: decision-fly-priority
kind: decision
status: draft
as_of: 2026-09-23
checked_at: 2026-09-23
depends_on:
  - fact-sim-ablation-20260923
  - fact-user-views-20260923
  - claim-flydino-not-topology-evidence
dependency_hashes:
  fact-sim-ablation-20260923: ef8a054fc984542db91ecf2dc829c1543e0908cf9b149bdff372bf6e75683044
  fact-user-views-20260923: 00d61d67279e941e7eb3d00dd36e322f6ea0d4178658f81a71737d53abe4ee11
  claim-flydino-not-topology-evidence: d0ef206540e8295e8adf2026e286265229ea78b1f97be9434e034edebe5ddb50
revision: b23de39e-4173-4dc9-b9e7-d09eced6b57c
---
# 초파리 작업 우선순위 — 최종 결정 대기 (draft)

현재 합의된 판단: 현재 초파리 모델은 성능상 도움이 안 됨(직진+안전장치 대비 약 3배 사망, 섞은 배선과 동일). 사용자 의견 "지금 당장 영양가 없어 보인다"에 어시스턴트 동의.

선택지(사용자 결정 전, 아무것도 실행하지 않음):
- A. 초파리 중단: 코드·시각화는 데모로 보존, 연산 투입 중단.
- B. 공정한 1회 한정 실험 후 종료: (1) 조향 뉴런 활동 → 작은 MLP 출력층, 학습량 대폭 증가, 안전장치 포함 vs (2) 같은 MLP·같은 예산인데 회로 없이 직접 입력. 둘 다 직진+안전장치와 비교, (1)이 (2)보다 낫지 않으면 초파리 완전 종료.
- 어시스턴트 우선순위: 안전 우선 구조로 정책 재설계가 먼저(참고: claim-policy-design-flaws, 검토 대기).

진행 중 작업 상태(2026-09-23 19:2x 기준): pipeline2.sh가 플래너 재튜닝 v3(생존 1순위, 3세대 중 2세대 진행) 중. 이후 자동으로 초파리 재튜닝(약 2시간) → 최종 비교(8시드, 초파리 포함) → deaths.py. 사용자 "뭘 하지 말고"에 따라 손대지 않음. 어시스턴트 의견: 플래너 재튜닝은 유지, 초파리 재튜닝·초파리 포함 최종 비교는 제외, 최종 비교에 직진+안전장치 추가.
