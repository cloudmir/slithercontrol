---
record_schema: 1
id: fact-v10-wire-input-fix-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
checked_at: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-wire-input-fix-20261001.md
    hash: 8247c7ba26d1f2fe30226d9b9e36a7e4110af0826cd7e67e931c4057df025a77
    locator: Implemented; local_assertions_passed; first_live; final_smoke;
      final_idle; limits
    quote: '"local_assertions_passed": 31'
dependency_hashes: {}
revision: 9b2a2220-83a0-4609-87d1-9b5aef587cfd
---
# V10 실제 전송 입력 수정·검증

사용자 승인: “수정후 검증까지해”. 최종 빌드1001-5f471fca, 원본 research/v10_wire_fix_20261001/before/ 및 중간본 before_timing/ 보존.

구현: V10 후보·비상 회전은 전송될 251단계 각도로 예측. applyCmd는 해당 바이트가 안정적으로 전송되도록 구간 중앙 입력을 사용한다. 성공한 ws.send의 실제 바이트·시각·부스트를 별도 기록하여 v10Root에 연결. 송신 게이트 대기·관측 지연 중복 계산 보정. 실패한 송신 제외, 게임마다 기록 초기화. 설정 유지. 과거 로그는 기존 근사 입력으로 복귀한다.

검증: 최종 로컬31개 검사 통과. 과거180도 경계 사례는 예측 회전 부호가 실제 기록 방향과 일치하도록 변경됨(고정 기록·모델 재생이며 생존 입증 아님).

실게임1판 runs/v10_wire_live_20261001_192903/, 중간 빌드1001-a67ce2c6:439.4초 사망, 최대길이307, 서버178:444 인원505, V10 고정·설정 변경0·오류0. 마지막60초 기록의 전송 이벤트1070개가 실제 패킷과 일치(불일치0). 마지막 관측에서 몸통209와 표시 두께 기준 간격−4.40px. 비상85프레임으로 회피했으나 사망; 서버 충돌 상대·단독 원인 확정 아님.

최종1001-5f471fca는 송신 대기·관측 지연 겹침을 추가 보정하고 연결 검증 runs/v10_wire_smoke_20261001_194052/ 실시. 60초 상한으로 종료 요청, 연결 종료 처리까지66.1초 기록(capped:true, 사망 성능시험 아님). 오류0, 전송 이벤트1139개 불일치0. 최종 playing:false·bot:false·V10:1 확인.

미확인: 서버 각도 해석·변동 지연·실제 생존률 개선. 전송 입력 일치가 추종 오차0을 뜻하지 않는다. 최신 빌드는 연결 검사만 완료했으므로439초 판을 최신 빌드 생존 성적으로 보고하지 않는다. 상세·코드 해시·원자료 경로: research/v10_wire_fix_20261001/summary.json 및 source.md.
