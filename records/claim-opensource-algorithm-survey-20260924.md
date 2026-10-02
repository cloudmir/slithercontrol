---
record_schema: 1
id: claim-opensource-algorithm-survey-20260924
kind: claim
status: supported
as_of: 2026-09-24
checked_at: 2026-09-24
evidence_refs:
  - path: .workspace/sources/fdg2019_slither-text-20260924.md
    hash: 5ce93d7ec271cd147de96134b9e8b4f608f85001abbb50905fa225d56e73b14c
    locator: fdg2019_slither
  - path: .workspace/sources/stanford2019_slither-text-20260924.md
    hash: bd25fd093ec22aaa542f817654da1a90ba25895d43f0df4db9b6e6a4d9430c5d
    locator: stanford2019_slither
  - path: .workspace/sources/ece239_slither-text-20260924.md
    hash: 69f9590dbdda2aea5aa6d575b28ae6acba725fdb05a29e89ed50ee1a8acc6bc6
    locator: ece239_slither
  - path: .workspace/sources/championship_code-text-20260924.md
    hash: 55c8639872af19edd82f6518eeedeb380c80f48192601672560de17e7cb2e286
    locator: championship_code
  - path: .workspace/sources/eskandary_readme-text-20260924.md
    hash: ae1dcd3957cb7637ee47cbbebad5169c8cb5d52e584dbfceb40e643e11ca86e5
    locator: eskandary_readme
  - path: .workspace/sources/recurrent_slither_readme-text-20260924.md
    hash: 1305fc3102e7450d8169cca6183adc6e17db5f66ab811778e7b784b8d59c1e80
    locator: recurrent_slither_readme
  - path: .workspace/sources/slbot_readme-text-20260924.md
    hash: 933ce43a011a684289cb882f5d3179c3b53464a7d085bcd3ad807892907af2ed
    locator: slbot_readme
  - path: .workspace/sources/circle-issue318-20260924.md
    hash: fb28edb5503bf93910f974aa36d3ea3db77200c82c8f27fce50b31f1bf3eecdb
    locator: 본문
dependency_hashes: {}
revision: 5d9da73f-cf75-4836-b64c-9c0be26fe7b6
---
# Slither.io 새 알고리즘을 위한 공개 구현·연구 조사

기준일 2026-09-24. supported는 아래 공개 코드 및 저자 보고의 존재·내용 확인에 한정한다. 각 봇의 성능을 재현하거나 우리 평가 조건에서 우열을 검증했다는 뜻이 아니다.

결론: 이번 조사에서 우리 조건(중간 혼잡 활동 구역 유지, 성장, 첫 생명 600초)의 최고 성공률을 입증한 공개 비교는 찾지 못했다. 참고 우선순위는 Eskandary/Cailliau 규칙 기반 봇 계열과 j-c-m Championship Edition의 Circle Method를 결합한 상태 전환 구조다. 이는 근거의 질·직접 적용 가능성에 따른 권고이며 세계 최고 성능 판정이 아니다. 직전 자체 다단계 탐색 제안은 미확정 그대로 두며, 이를 우선 채택할 외부 성과 근거는 확보하지 못했다.

| 후보 | 확인한 성과 또는 구현 | 한계 |
|---|---|---|
| Eskandary/Cailliau 규칙 기반 봇 | FDG 2019 저자 포스터는 NEAT가 이 전문가 규칙 봇의 점수를 따라잡지 못했다고 명시 | 점수 비교이며 600초 생존율 아님. 논문 당시 버전과 현재 저장소 버전 일치 미확인 |
| Circle Method / Championship Edition | 최초 개발자 이슈 #318은 최고 180만 점 초과 보고. 공개 코드에 grow → tocircle → circle 전환과 몸체 추종 구현 존재 | 최초 보고는 초기 수천 점 성장·원 형성을 사람이 수행. 성공률·전체 시행수 없음. 스크린샷·영상 링크 존재만 확인했으며 영상 진위나 전체 플레이 재검증 안 함 |
| UCLA ECE239AS PPO/DQN/A2C | 각 20만 스텝 학습, 각 5에피소드 평균 점수 PPO 137.4 / DQN 125.6 / A2C 70.6 | 표본 5, 점수 지표, 환경 지연 약 250–400ms. 보고서 연도는 본문에서 확정 못함. 검색의 업로드·크롤링 날짜를 연구 연도로 사용하지 않음 |
| Stanford 2019 DQN+시연 | 포스터의 중앙값 점수: 최선 모델 54, 사람 145. 사람도 제한된 저해상도·저프레임 환경에서 측정 | 장기 생존 검증 아님. 다른 연구의 평균 점수와 직접 순위화 금지 |
| dberweger2017/Slither-RL | README에 Recurrent PPO, 5채널 관측, 로컬 시뮬레이터, 단계 학습·자기대전·시연 사전학습 구조 및 데모 링크 | 읽은 README에서 독립 시드 장기 생존 비교표 확인 못함. 실행 코드·데모를 재현한 것은 아님 |
| dzaczek/slbot | README에 Dueling DQN·단계 학습. Performance 표는 처리속도·메모리 수치 | 처리속도를 플레이 성공률로 간주할 수 없음. 공개 저장소 전체의 로그 유무를 전수 검증하지 않음 |

Championship 코드에서 확인한 구조:
- 방향 구간별 장애물 거리를 기록하고 비어 있는 각도 구간으로 방향 선택(headingBestAngle).
- 상대가 차지한 각도 비중으로 포위 판단(checkEncircle), 위험 시 먹이 처리보다 충돌 회피 우선.
- 충분한 크기 이후 toCircle → followCircleSelf로 자기 몸의 접선·법선을 따라 경로를 유지. body polygon과 상대 머리를 사용한다.
- 이는 단순한 일정 각속도 회전과 다르며, 원형으로 돌기만 하면 안전하다는 주장이 아니다.
- 원 저장소 README는 원본과 개선판 모두 개발 중단이라고 명시. 2026년 실사이트 호환성은 미검증이다.

사용자 목표에 대한 해석·제안(미검증): 작은 상태에는 열린 방향 회피와 먹이 수집, 충분히 자란 뒤에는 자기 몸을 방어벽으로 삼는 곡선 추종을 참고할 가치가 있다. 활동 구역 안에서 고리를 유지하는 것 자체는 사용자 조건과 자동 충돌하지 않는다. 다만 빈 곳에서 영구 회전하거나 먹이를 전혀 모으지 못하면 성공으로 치지 않는다. 자동 초기 성장, 안전한 고리 진입, 적이 안으로 들어온 경우, 긴급 이탈 후 복귀를 분리해서 검증해야 한다. 이러한 복귀·활동 제약을 추가한 변형에 원본 고득점 보고를 그대로 귀속시키면 안 된다.

Reddit: 유사한 자동 플레이·방어·예측 문제 논의를 검색했고 2026-09-22 글에서 시도 실패와 보조 조종 경험담을 확인했다. 읽은 범위에 재현 가능한 성공률 비교는 없었다. 기술 성능 결론의 근거로 사용하지 않았다. curl은 동적 HTML 셸만 반환해 Reddit 본문은 원문 미보관이며 웹 추출 발췌만 별도로 보관했다.

수집·검증 범위: 프로젝트 자동 검색 coverageStatus=missing이라 외부 자료로 조사 보완. 논문 포스터/보고서 PDF 3개 원본, README 5개, Championship 코드, GitHub 이슈 본문을 research/에 수령. PDF 색인 도구의 pdftotext 부재로 pypdf 추출문을 save_source 후 read_source로 확인했으며 원 PDF는 research/에 보존했다. Championship 핵심 함수와 수치 출처를 보관본에서 확인했다. 게임 코드·모델 변경, 학습, 실사이트 실행 없음. 동일 환경 재현·우리 조건에서의 성공률·최신 실사이트 동작·전 세계 모든 프로젝트 비교는 미검증.

원문 링크:
- https://github.com/j-c-m/Slither.io-bot
- https://github.com/j-c-m/Slither.io-bot/blob/master/bot.user.js
- https://github.com/ErmiyaEskandary/Slither.io-bot/issues/318
- https://foaad.net/sites/default/files/attachments/Slither.io%20FDG%202019%20Poster.pdf
- https://www.sangminlim.org/_files/ugd/ada60d_6d8c24daa08a4987b8e7a554e81bbe0e.pdf
- https://cs229.stanford.edu/proj2019aut/data/assignment_308875_raw/26500849.pdf
- https://github.com/dberweger2017/Slither-RL
- https://github.com/dzaczek/slbot
- https://www.reddit.com/r/Slitherio/comments/1wn1maz/has_anyone_managed_to_create_a_truly_op_slitherio/
