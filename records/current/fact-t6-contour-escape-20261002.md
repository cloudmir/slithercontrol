---
record_schema: 1
id: fact-t6-contour-escape-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t6-contour-escape-20261002.md
    hash: 7ddad81e22fa58c6eb1283cda9ab5f78e85d37f53d99a72a7447856649a14d1f
    locator: User direct request, exact T6 methods, original closed-loop output,
      Chromium output, Windows release
dependency_hashes: {}
revision: 612fbc0b-0d1c-4c79-8392-9868a451531c
---
# T6 외곽선 탈출 구현·브라우저 적용

사용자 요청: “지금 기능을 이용해서 밖으로 빠르게 빠져나가는 회피 알고리즘을 민들어보자”.

빌드1002-cf660475. T4/T5를 유지하고 T6 독립 모드·홈 버튼·프리셋을 추가했다. T5 양쪽 안내선과 빈 공간을 연결해 관측 범위 내 출구 안내를 최대3개 찾고, 실제 회전·속도·가속·이전 명령 지연을 전개해 모든 몸통·경기장 벽·예측 머리·새 몸통의 통과 여부를 검사한다. 검사된 후보에서 출구 진행·부스트를 선택한다. 기본 탐색650px, 외향120px 추가 검사, 사용자 채택 몸통 오프셋−5 유지. −5는 보편적으로 검증된 안전값이 아니다. 머리는 현재 방향·속도와 불확실성 여유의 예측이며 모든 상대 기동을 보장하는 도달 집합은 아니다.

주황 점선은 기하 안내, 초록/노랑 실선은 검사한 순항/부스트 주행 예측, 빨강은 충돌 위험 회복 기동. 관측 밖을 안전 공간으로 처리하지 않는다. 닫힌 포위는 출구 미확보로 표시한다. 지도 계산 중에는 탐색 큐를 이어 처리하고 최근 안내 방향을 잠시 유지하며 조작은 매 판단 현재 관측으로 검사한다.

측정 사실: 로컬 지연 입력·정적 몸통 모델7상황(열린 공간·전방 벽·U 통로·단일 좁은 틈·평행 통로·곡선 포위 출구·경기장 경계) 전부700px 이상 벗어남·모델 충돌 없음. 움직이는 머리 차단·닫힌 포위·위험 시작·기존 안내에 새 장애물 추가 검사 통과. 기존13판단 함수·T5 외곽선 원문 보존 및 T5 기록 관측20개 명령/부스트 일치. 실제 로컬 Chromium/Worker에서 선 표시·모드 전환·저장 통과, 페이지 오류0. 실게임 생존·탈출 효과 검증 결과가 아니다.

초기 곡선 포위 실패 후 탐색 이어가기·안내 유지 결함을 수정하고 같은 사례를 통과했다. 당시 재현 로그와 초기 코드 해시 일치 사본을 보존했다. 최종 기존 Windows MOD에1002-cf660475 로드·T6_ON1·GAP−5·bot false·playing false 확인. 새 판을 시작하지 않았다.

문서 research/t6_escape_20261002/README.md. 원본 검증·이전 소스·최종 해시·브라우저 적용·스크린샷은 같은 폴더 check.json/mock.json/release.json/before/preview.png/live_release.png.
