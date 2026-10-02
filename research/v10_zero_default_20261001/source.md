# V10 비용 0 기본 부스트

사용자 원문: 0 으로 하면 일반적으로 매번 부스터를 쓰도록 해줘
사용자 선택이며 성능 측정이 아님.

빌드 1001-797845a4. 비용 0이면 일반 경로 추종·먹이 근접 추종·근접 후보 선택에서 부스트 기본. 부스트 허용 및 최소 길이 조건 유지. 경로 검사에서 부스트 충돌 시 순항 재검사. 진입 회전 기동은 계획된 부스트를 유지.

로컬 검사 원문:
[
  {
    "name": "zero_empty",
    "boost": true
  },
  {
    "name": "unsafe_boost_falls_back",
    "boost": false
  },
  {
    "name": "positive_empty",
    "boost": false
  },
  {
    "name": "switch_off",
    "boost": false
  },
  {
    "name": "too_short",
    "boost": false
  }
]

브라우저 적용 결과 원문:
{
  "applied": false,
  "reason": "game_in_progress"
}
진행 중 게임 때문에 재로드하지 않음. 새 실게임 검증 없음.

SHA256:
{
  "ext/pilot.js": "2acb75cd20ecc2ed490010782dbdb2fb38aad1a4cfb2e9635a7cce3a46fbfdf0",
  "ext/mod.js": "30eca3628e7e428a73253210ed63039d5af4f61f24406ef314a2968b129765cf",
  "params.json": "77ad8bf9d028df5ca682f8cefb7fef8058065600e6c7cbb4c7dffeabcb4cac78",
  "ext/params.js": "9f53f2ac93cd09eb13c713093ba71d6d0995361fc294a3195a22acdc8fd5b6e9"
}
