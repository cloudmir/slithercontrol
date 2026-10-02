---
record_schema: 1
id: claim-flydino-not-topology-evidence
kind: claim
status: supported
as_of: 2026-09-23
checked_at: 2026-09-23
depends_on:
  - claim-lit-analysis-practice
evidence_refs:
  - path: .workspace/sources/flydino-experiment.md
    hash: 21ae7908079421cc2274c644b3164ddb3448631827cf5a44c913fc658a2d218c
    locator: Question and scope
    quote: test whether biological topology is better than an equally sized
      artificial or rewired network
  - path: .workspace/sources/flydino-experiment.md
    hash: 21ae7908079421cc2274c644b3164ddb3448631827cf5a44c913fc658a2d218c
    locator: Held-out evaluation
    quote: A topology-benefit claim would require matched artificial/rewired
      controls trained with equal budgets; that study is not included.
  - path: .workspace/sources/flydino-experiment.md
    hash: 21ae7908079421cc2274c644b3164ddb3448631827cf5a44c913fc658a2d218c
    locator: Held-out evaluation
    quote: The handwritten rule baseline is a simple, untuned distance threshold; it
      is not a strong optimized controller.
dependency_hashes:
  claim-lit-analysis-practice: 7ca1109cf216159e283593b11bea2ac8e820a3c289cc159a612f1fe42448cdac
revision: fc5092ee-1980-4b68-9591-043221c9797b
---
# Fly Dino 결과는 "잘 튜닝된 출력층"의 증거이지 "배선 이점"의 증거가 아님

주장(어시스턴트 의견, 원문 근거 있음):
- 결과 자체는 강함: 동결된 100 테스트 코스 중 99 완주(180초), 학습 3회 반복 85~100/100.
- 그러나 원문이 배선 우위는 검증 범위 밖이라고 명시. 비교 규칙 기준선은 튜닝 안 된 단순 임계값(46초).
- 회로 침묵 0/100은 출력층이 회로 활동만 입력으로 받는 구조라 당연(인과 경로 증명, 우수성 증명 아님).
- 성능 원천(해석): 16→12→3 MLP 243 파라미터, CEM 15,680판, 과제 핵심 특징 8개 직접 입력, 행동 3개인 쉬운 과제.
- 우리와의 차이: 우리 초파리 출력층은 고정 공식+9 파라미터, 학습량 약 100판(100배 이상 적음), 입력은 플래너 위험 정보를 시야각에 뿌린 간접 정보 → "우리 초파리가 잘 튜닝되지 않았다"는 사용자 지적은 타당.

사용자 판단(fact-user-views-20260923 #4)과의 차이: 사용자는 "커넥툼을 잘 튜닝해 놀라운 효과"로 봄. 어시스턴트는 "튜닝 방식의 효과"에는 동의, "커넥툼이라서"에는 비동의.
