---
record_schema: 1
id: fact-fps-environment-20260926
kind: fact
status: confirmed
as_of: 2026-09-26
depends_on:
  - fact-gfx-bench-20260926
dependency_hashes:
  fact-gfx-bench-20260926: 5612b95d7c7b78b76a257fe823d6775dde3af70bcf87e03847fe4fc29ce2be5e
revision: e227844a-f9fe-4384-ba89-74aa47e285fb
---

# 브라우저 화면 갱신(rAF) 속도와 실행 환경 (2026-09-26 22시대)

사용자: "인터넷에서 관련 자료를 찾아봐 / mod를 쓰면 빨라지는것도 분석하고"

측정 사실(MOD Chrome, 읽기 전용 확인):
- Windows: 콘솔 세션(MS 원격 데스크톱 아님), 배터리 없음(에너지 절약 모드 자동 작동 조건 아님), 전원 계획 균형 조정.
- GPU Intel HD Graphics 530, chrome://gpu: Canvas·Compositing·Rasterization·WebGL 모두 Hardware accelerated, ANGLE D3D11, 화면 60Hz.
- 모니터 "PnP 불가 일반 모니터", 확인 시점 화면 1024x768(페이지 innerWidth 1006).
- 이 시점 rAF: 빈 탭 56.9/s, slither 메뉴 51.2/s.
- 앞선 측정(fact-gfx-bench-20260926, 페이지 캡처 2449x1315)에서는 메뉴·게임 모두 rAF 약 27/s.

가설(미확인): 27/s는 당시 화면 환경(큰 해상도 등)에 묶인 값이며 Chrome 설정이나 MOD 코드 때문은 아니다.
사용자 확인(같은 날): "원격은 아님". 원격 화면 도구 가설은 제외.

외부 자료 요지: Chrome 에너지 절약 모드는 화면 갱신율을 낮춰 rAF도 따라 낮아짐(Chrome for Developers). --disable-frame-rate-limit·--disable-gpu-vsync는 최근 Chrome에서 효과·부작용 보고가 엇갈림(gist 댓글). NTL은 타이머로 게임 루프를 돌려 최대 240~300FPS, WebGL, 먹이 별도 스레드, 단순 스킨, 글로우 끄기로 빨라짐(NTL 변경 이력·X 게시물).
