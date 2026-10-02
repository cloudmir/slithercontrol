---
record_schema: 1
id: fact-v10-objective-effectiveness-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
checked_at: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-objective-effectiveness-20261001.md
    hash: 83eca81654f5497e46cdb86312bb46b46597d6f1757b0d97b0d4df2f6b4099bf
    locator: comparison.results; conclusions; limits
    quote: Offline representation comparison, not old bot vs new bot live A/B
dependency_hashes: {}
revision: c5541478-4f2a-4119-9bd7-6053692b01b3
---
# V10 수정 효과 — 일부 방향 예측 개선, 생존 개선 미입증

사용자 “너가 수정한 부분들이 효과가 있는지 분석을해줘 객관적으로”. 게임 재개·제품 수정 없이 기존4개 판의 V10 기록 구간을 재생했다. 같은 관측·같은50ms 예측시간·기존TRACK_LAT 유지, 입력 기록 방식(기존 apply history vs 실제 packet history)만 비교. 미래 명령은 사용하지 않는다. 마지막 약60초의 겹치는 틱 표본이며 독립 판/A·B 실험이 아니다.

- 이전104.5초 혼합판61샘플: 평균 방향오차2.345→2.335도, 거의 차이 없음.
- 439.4초 고정V10 판357샘플: 평균 방향오차2.243→1.420도(약37% 감소), p95 6.012→3.849도. 평균 위치오차2.192→2.135px(약0.057px 감소).
- 최신 상한종료 고정V10 판359샘플: 평균 방향오차1.885→1.874도, p95 5.464→6.796도(악화); 평균 위치오차2.341→2.396px(악화).
- 최신473.6초 설정·모드 혼합판 V10 구간171샘플: 평균 방향오차1.693→1.432도, 위치오차3.669→3.662px. 전체 성장·생존은 V10 단독으로 귀속할 수 없다.

확인 범위: 전송 입력 불일치 구현 결함 수정·로컬31개 검사·전송 이벤트 대응은 확인했다. 실제 움직임 예측은 일부 판에서 개선되지만 일관된 개선은 입증되지 않았다. 비상 회복 평가는 작동하나439.4초 판85프레임 및 최신 혼합판80프레임 비상에도 사망했다.

실제 생존·성장 효과: 사망이 남고 대조실험·표본이 부족하며 상한 종료와 혼합 설정이 있어 개선으로 결론내리지 않는다. 20판 요청은 사용자 중지로2판에서 종료. 다음 우선 검토 후보는 더 이른 출구 선택/통로 진입 회피와 잔여 지연·몸통 모델 오차. 최신 사망2초 전 대안 후보는 기록된 적의 미래를 고정한 모델상 안전할 뿐 실제 생존 입증 아님.

재현·상세: research/v10_objective_20261001/{compare.mjs,compare.json,summary.json,source.md}. 원문 근거 및 각 판 경로는 source.md에 보존.
