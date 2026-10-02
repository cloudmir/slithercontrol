---
record_schema: 1
id: claim-lit-analysis-practice
kind: claim
status: supported
as_of: 2026-09-23
checked_at: 2026-09-23
evidence_refs:
  - path: .workspace/sources/flydoom-readme.md
    hash: af28159a50dd71aea92a7a7908cfc3ceb7983d33115a0e8d59b577f34bcffc06
    locator: FlyDoom > Scientific interpretation
    quote: A null or negative result is a valid answer; this project does not assume
      that biological topology helps.
  - path: .workspace/sources/flydoom-readme.md
    hash: af28159a50dd71aea92a7a7908cfc3ceb7983d33115a0e8d59b577f34bcffc06
    locator: FlyDoom (intro)
    quote: Synapse count is an anatomical proxy rather than measured synaptic efficacy
  - path: .workspace/sources/eudald-connectome-readme.md
    hash: 9b1d9968b11b0e4167cf984bd7ac140bc22e54ecd88205d894e589c85547fcc3
    locator: Is the real wiring special?
    quote: At matched wiring cost, the biological network is consistently the most
      accurate.
  - path: .workspace/sources/lappalainen-2024-nature.md
    hash: 91a64c8fa774d3ec0362f255f85ad1f55ba3e930e138f969839c0a738cd71bc0
    locator: Sparsity leads to accurate predictions
    quote: we assumed that the unitary synaptic strength was unknown but the same
      for connections of the same cell-type pair
  - path: .workspace/sources/doomfly-readme.md
    hash: 2e407d18088bb3d2f08599cd699ba1b308afc17e696f800d0bfc0d27ed4ba395
    locator: DOOMFLY status
    quote: Changing weights and longer individual rounds do not establish learning.
  - path: .workspace/sources/flypong-guide.md
    hash: bd99df0e4af8740fcffd58503f21dff7327f96e064b67aac67cebf606a5118cd
    locator: GUIA (auditoria de readout)
    quote: anatomicamente desconectada do resto do circuito.
dependency_hashes: {}
revision: 9fd20fdf-497b-4b78-a5c1-f49b0582c70c
---
# 기존 커넥툼 게임 프로젝트의 결과 분석 방식 (요약)

공통: "초파리가 게임을 한다"는 데모 자체를 증거로 보지 않는다. 커넥툼 효과를 주장하려면 동결된 테스트 시드, 같은 예산의 대조군(섞은·무작위 배선, 인공망), 학습 반복, 효과 크기·불확실성 보고가 필요하고, null·부정적 결과도 공개한다.

- FlyDoom: 진짜 커넥툼 vs ER 무작위·연결 수 보존 섞기·MLP/GRU/LSTM, 가중치 고정/내부 학습/출력층만 학습. 튜닝 3시드, 최종 5~10시드. 시냅스 수는 실제 효능이 아닌 해부학적 대용치.
- Fly Dino v2: 학습·검증(4시드)·테스트(100시드) 분리, 회로 침묵·미학습 출력·손 규칙·무작위·정지 대조, 학습 3회 반복. 배선 이점은 검증 범위 밖이라고 명시(→ claim-flydino-not-topology-evidence).
- Doomfly: 검증 기준 미통과, 부정 결과 공개. 가중치 변화·긴 생존은 학습 증거가 아님.
- FlyPong: 가소성 탓 전에 출력 뉴런별 시냅스 수 점검 — 모터 뉴런 4개 중 2개가 회로와 끊겨 있었음.
- eudald connectome: 배선 비용을 맞춘 무작위 앙상블 4종과 비교 → 같은 비용에서 생물 배선이 가장 정확.
- Lappalainen 2024 (Nature): 배선 고정, 모르는 파라미터(세포형 쌍별 단위 시냅스 세기 등)를 학습해 실제 신경 반응과 대조.
- 우리 프로젝트에 대한 시사: 동결 테스트 시드·학습 반복·침묵/미학습/다중 셔플/동일 예산 인공 출력층 대조·짝지은 신뢰구간·DN 연결 점검이 빠져 있었음.
