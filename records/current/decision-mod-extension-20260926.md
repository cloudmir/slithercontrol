---
record_schema: 1
id: decision-mod-extension-20260926
kind: decision
status: adopted
as_of: 2026-09-26
dependency_hashes: {}
revision: 2c7cbe27-2bb0-45f3-b6bc-7211ab023b59
---

# 우리 봇을 Chrome 확장(MOD)으로 — NTL 기능은 직접 구현

사용자(2026-09-26): “우리 확장에 NTL 기능을 직접 넣는것으로 진행하자. 방향에 동의 지금 너가 리스팅한 기능들을 넣어보자.”
NTL 코드는 쓰지 않는다(게임 클라이언트 전체 교체·압축 코드·비공개 라이선스). 원래 게임 위에서 동작한다.

계획(사용자 확인):
1. pilot.py 조정값 → params.json(파이썬 동작 불변, 블랙박스 재생으로 확인).
2. pilot.py → ext/pilot.js 이식, 블랙박스 재생 일치율·차이 보고.
3. 확장: 봇 켜기/끄기, 슬라이더 패널·프리셋·JSON 내보내기/불러오기, 예측 경로·간격·판단 사유 표시, 줌, 적 점수, 사망 지점, 먹이 작게/prey 끄기, FPS·핑, 서버 선택, 경계 표시, 판별 기록(설정값 포함).
4. Windows Chrome 설치.

사용자 답(ask_user):
- Q1 실사이트 1판 동작 확인: 허용.
- Q2 슬라이더: 전체(약 40개), 그룹별, 핵심만 펼침.
- Q3 적 두께별 인접 거리: 3구간(얇음/중간/굵음), 기본값은 현재와 동일(기본 동작 불변).
- Q4 run_live.py는 데이터 수집용으로 유지, 같은 params.json 사용.

위치(사용자 2026-09-26: “C:\ 여기에 만들지 말고, 지금 슬리더 위치 아래로 옮겨줘.. C 는 시스템임”, 프로필 위치 질문에 “1” = D:\slither\):
- 확장: 저장소의 ext/ 폴더를 그대로 로드(\\wsl.localhost\Ubuntu\home\datawave\Work_AI\슬리더\ext). C:\slither_mod_ext 삭제.
- Chrome 프로필: D:\slither\chrome_data_profile(run_live 데이터 수집용, 구 C:\slither_chrome_profile), D:\slither\chrome_mod_profile(MOD용). 파일 수·용량 일치 확인 후 C: 원본 삭제. win_chrome.py 경로 반영.
- Chrome 153은 --load-extension을 무시함(확인). 설치는 사용자가 chrome://extensions에서 직접 로드.
