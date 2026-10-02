---
record_schema: 1
id: fact-t6-live-survival-20261002
kind: fact
status: confirmed
as_of: 2026-10-02
evidence_refs:
  - path: .workspace/sources/t6-live-survival-20261002.md
    hash: 852d516d4b28918d097a4a30aec314eb4500d7399408d7a46bd933cd71cc2e54
    locator: Five-game table, original batch output, reproduced analysis, paired
      clock read, original file inventory
dependency_hashes: {}
revision: 76107bcd-c8fa-4953-bea3-3fea9aee330b
---
# T6 실게임 5판 생존·종료 직전 길이

사용자 요청: 실제 게임 생존 시간 확인. 추가 질문: 최종 길이. 5판·판당600초는 검증 설계상 운영 선택이다.

빌드1002-cf660475, runs/t6_survival_20261002_141215, 제품 수정 없이 기존 Windows MOD T6·GAP−5 유지. 자동 서버 선택 설정 유지, 실제 전 판181.41.140.178:444. 5판 완료: 1·2·3·5판 실행기 기준600초 이상 생존 후 상한 종료, 4판44.27초 사망. 사망1·상한4. 중앙값은 최소600초이며 이후 사망 시각은 미측정. 비교군 없어 개선 효과 확정 아님.

종료 직전 전체 로그 L: 1판78 / 2판80 / 3판84 / 4판101 / 5판79. 최대 길이는 각각101/104/107/101/98로 최종 길이와 구분한다. 원본 기록·전체 판단 로그·블랙박스5판 저장, 판단 오류0·페이지 오류0·판 중 파라미터 변경0, 최종bot false·playing false. 상한 종료 때 봇 끄기는 파라미터 변경이 아니다.

4판은 마지막 수집 판단까지 브라우저 기준22.9초 출구 경로0, 말미 안전한 첫 명령0·긴급 회전. 실제로 모든 탈출이 불가능했다는 증명은 아니다.

직접 시계 비교: 실행기10.04초 동안 Windows 페이지11.14초 증가. 원본 브라우저 기록645/651.1/652/48/649.7초 보존, 최종 보고는 실행기 종료 감지·600초 상한의 하한 기준. 촬영 목표0.5초이나 실제 호출 지연으로 간격 증가. 상세표·해석 RESULT.md, 분석 analysis.json, 시계 확인 clock_check.json, 실행기 research/t6_escape_20261002/live_survival.py.
