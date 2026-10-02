---
record_schema: 1
id: fact-v10-actuator-input-mismatch-20261001
kind: fact
status: confirmed
as_of: 2026-10-01
evidence_refs:
  - path: .workspace/sources/v10-actuator-input-mismatch-20261001.md
    hash: 32703041d839ef03d4a0a7f193b2ba637a7eb0c9ec9ed8ad76eae2043476da8d
    locator: confirmed_implementation_mismatch, boundary_example, root_replay, code
      excerpts
    quote: v10Root replays commandHistory using fixed TRACK_LAT=.06; it does not
      consume logged outgoing packet time/bucket
dependency_hashes: {}
revision: 9a014f29-857c-457e-a1f4-292c8fea40db
---
# V10 조향 예측 입력과 실제 전송 불일치

사용자 “원인을 파악해봐”. 실게임 추가/제품 수정/배포 없이 runs/v10_recovery_live_20261001_155641 빌드1001-10f3faa7 사망 원인을 코드·실제 전송패킷·연속명령 재생으로 분석했다.

확인한 코드 결함: applyCmd는 양자화 전 각도와 xm/ym 입력 갱신시각을 commandHistory에 넣는다. 게임은 floor(251*angle/(2π))로 양자화하여33ms초과 송신게이트에서 전송한다. v10Root는 입력갱신 시각+고정TRACK_LAT로 예측하며 실제 패킷 송신시각·버킷을 재생하지 않는다. 입력시각104.2648s, 해당 패킷63 송신104.285s(차20.2ms).

180도 경계 반전 사례:104.335s 관측머리4.727510rad, history각1.590884rad의 최단회전-3.136626rad; packet63의251단계 환산각1.577054rad의 최단회전+3.132730rad. 모델은 음수 방향인데 실제회전은 양수였다.63ms prefix진단(이전계산3ms/추가inputAge0 가정) 예측-0.249786rad vs 관측보간+0.296394rad, 위치14.70px차. 관측보간과 가정이 포함된 진단 수치이며 당시 실제계산의 정확재현은 아니다.

연속실제패킷 재생:101.8~103.5s에서 lag/회전율 적합,103.5~104.3s 평가. 패킷기반 best lag0.05s/율배율1, 평가평균각오차4.60도; 입력기반lag0.06s/배율1 평균13.91도. 입력에양자화만적용해도14.81도라 양자화만으로 전체오차 해결된다고 해석하지 않는다. 작은1판·겹치는윈도·부스트고정재생이며 RTT실측값 아님.

결론구분: 예측/실제입력 불일치와180도회전방향 민감성은 코드·로그로 확인. 충돌임박경로를 안전으로판정한 문제와 연결되는 유력원인이다. 단독사망원인·실제살해개체·수정후생존은 아직 미입증. 서버소스 없으므로251분모는 클라이언트인코딩/관측적합 근거의 재생해석.

수정후보: 후보각도를실제전송단위로양자화, 진행중명령은패킷송신시각으로재생, 다음송신슬롯·지연변동 고려,180도근처 회전방향안정성 및 추종오차보다작은여유경로 거절. 구현안아직미적용.

분석 research/v10_death_cause_20261001/{input.json,fit.mjs,fit.json,root_compare.mjs,root_compare.json,summary.json,source.md}.
