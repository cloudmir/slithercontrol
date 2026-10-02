---
record_schema: 1
id: claim-staged-live-result-20260924
kind: claim
status: supported
as_of: 2026-09-24
checked_at: 2026-09-24
depends_on:
  - decision-staged-live-20260924
evidence_refs:
  - path: .workspace/sources/staged-live-result-20260924-130149.md
    hash: 45e16c3200a67568d0d777c4cacc32fcedab3be82949ab10be7210d1b97de133
    locator: reason, seconds, L_max, best_rank, mode_counts
    quote: '"reason": "death", "seconds": 102.9'
dependency_hashes:
  decision-staged-live-20260924: 1d0c1b56df809cb17f7959775d49c81d332da3387232e204a144a7b9b1b6ed00
revision: e839fe9f-94ca-4558-8fa4-c293f9e96e95
---

# staged coil 실사이트 첫 판 — 102.9초, 고리 진입 전 종료

2026-09-24 13:01:49 KST 예약. 닉네임 liilllilillililillli(소문자 i/l 20자). 화면 표시 Google Chrome for Testing 한 개로 실행했으며 기존 staged.py 정책 해시는 유지했다. live_staged.py에 자기 몸 관측 전달·닉네임 생성·판당 600초 제한을 구현했다.

원문 최소 결과: status=finished, reason=death, 생존 102.9초, 최대 길이 598, 최고 순위 68, 판단 885회, 계산시간 p95 25.5ms. 명령 전송 완료 모드 집계는 forage 810회, escape 74회이며 고리 또는 몸체 추종 모드 진입은 없다. 판단 횟수와 모드 합계 차이 1은 마지막 판단 후 게임 종료로 전송이 실패한 경우다.

해석: 이번 한 판은 초기 채집·회피 구간에서 종료됐고 10분 목표에 미달했다. 성장 후 몸체 추종의 실사이트 효과는 시험되지 않았다. 사망은 실행기의 게임 종료 감지에 따른 분류이며 접촉 상대·사망 원인·네트워크 기여도는 원문 상태를 저장하지 않아 확인하지 못했다. 서버 지연과 큐는 미측정이며 100ms 지연 가정을 사용했다. 로컬 3/4 완주율과 이번 1판을 같은 시험으로 합산하지 않는다.

정해진 1판 뒤 브라우저를 닫았다. 자동 재시도 없음. 오늘 로그 기준 1/5판 사용. 원문 JSONL을 JSON으로 형식 변환하여 save_source 후 read_source로 위 필드를 확인했다. 자동 검색 coverageStatus=missing을 결과 근거로 사용하지 않았다.
