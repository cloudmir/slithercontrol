---
record_schema: 1
id: claim-slither-mods-survey-20260926
kind: claim
status: supported
as_of: 2026-09-26
checked_at: 2026-09-26
evidence_refs:
  - path: .workspace/sources/ntl-mod-help-v968.md
    hash: eae6802d456efdd4a4833866938c13edb068e31997cf0f4763c7fee92ab39f61
    locator: v9.43 / v9.20대 / v5대 changelog, Using the BOT
    quote: assist min turn path that predicts the space needed to turn and an option
      to disable it
  - path: .workspace/sources/ntl-mod-help-v968.md
    hash: eae6802d456efdd4a4833866938c13edb068e31997cf0f4763c7fee92ab39f61
    locator: v9.43
    quote: angles @50ms and boost @150ms like in vanilla game (to prevent potential
      server side throttling)
  - path: .workspace/sources/jcm-slither-bot-user-js.md
    hash: 66076d85b7d0200884a8d902e9ad4efd89b94913486d75e41723bae57b13712f
    locator: bot.opt, checkCollision, checkEncircle, followCircleSelf
    quote: percent of angles covered by same snake to be considered an encircle
      attempt
dependency_hashes: {}
revision: 29acaa64-1186-44f0-aca9-b8ce59c1709e
---

# slither.io MOD 조사 (2026-09-26)

사용자 요청: “인터넷을 찾아보면, MOD 라는것을 배포하고 있는데 조사해봐”

- 현재 활발히 배포 중인 대표 MOD는 NTL MOD(v9.68, 2026-09-17 빌드, Chrome 웹스토어·Edge·zip 배포)다. 기능은 주로 화면·편의(줌, WebGL, 스킨, 팀·채팅, 서버 목록)이며 자동 조작은 원형(circle) 봇(TT), 근접 보조(R: 전방 레이저, 최소 회전 경로 반원 표시), 경계 보조(border assist/safewall)가 있다.
- NTL의 봇 코드는 주석상 j-c-m의 Slither.io Bot Championship Edition(2016, 공개 userscript)을 바탕으로 한다(zip의 main-mt.js 4행). main-mt.js는 7.4MB 압축(minified) 코드라 보조·원형 봇의 세부 로직은 읽지 않았다.
- j-c-m 봇의 방식: 머리 앞 원 하나와 π/8 각도 칸으로 충돌·포위 판단, 같은 뱀이 각도 56% 이상을 덮으면 포위로 보고 가장 빈 방향으로 탈출, 길이 5000 이상이면 자기 몸을 따라 원을 그림. 적 머리 궤적 예측·좁은 틈 탐색은 없다. 우리 pilot.py(경로 예측, find_gaps, 한 방향 코일)보다 단순하다(어시스턴트 판단).
- 참고 후보(미검증 가설): 입력 전송 주기(바닐라 각도 50ms·부스트 150ms, 더 잦으면 서버 제한 가능성 — 개발자 주장), 큰 원을 유지하며 머리·꼬리를 겹치는 원형 방어(NTL: "squeeze resistance", 8K 이상).
- 원문: research/mods/(ntl-modhelp.html, ntlmod-pub-9.68.zip sha256 834ca2d6…, jcm-bot/ commit 6acb2f3).
