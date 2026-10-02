# Windows Chrome 실게임 테스트 가이드 (2026-09-30 기준)

## 구성
- 봇 = Chrome 확장(`ext/`): `mod.js`(관측·추종·기록·패널), `pilot.js`(판단, Worker), `params.js`(`params.json`에서 빌드).
- 브라우저 = Windows Chrome, 전용 프로필 `D:\slither\chrome_mod_profile`, 디버깅 포트 9224(127.0.0.1 전용). WSL의 수집기가 `win_chrome.py`(PowerShell 중계)로 붙는다.
- 실행·기록 = `research/mod_deaths_live.py`(수집기). 결과는 `runs/<이름>_<시각>/`.

## 1. 최초 설치 (한 번)
1. WSL에서 빌드: `python3 ext/deploy.py` → `ext/params.js`, `manifest.json`(version_name = 빌드 ID).
2. Windows Chrome(전용 프로필)에서 `chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램 로드" → `\\wsl.localhost\Ubuntu\home\datawave\Work_AI\슬리더\ext`.
3. slither.io 접속 → 패널(SLP MOD) 표시 확인. 게임 탭에서 서버 선택(500명대 서버 권장, 사용자가 고름).

## 2. 코드 수정 후 반영
1. `params.json`/`ext/*.js` 수정 → `python3 ext/deploy.py` (빌드 ID 출력).
2. 수집기가 시작할 때 확장을 자동 재로드한다. 수동이면 `chrome://extensions` 재로드 버튼 → 게임 탭 F5.
3. 사전 점검: `.venv/bin/python ext/test/mock_check.py` (UI·Worker·로그 키; rAF 35Hz 단언은 헤드리스 환경 문제로 실패할 수 있음), `node -e "require('vm').runInThisContext(require('fs').readFileSync('ext/pilot.js','utf8'))"`.

## 3. 배치 실행
```
cd /home/datawave/Work_AI/슬리더
SLP_MAX_S=600 setsid nohup .venv/bin/python research/mod_deaths_live.py <판수> <이름> "<목적 한 줄>" [arms.json] \
  > runs/<이름>_live.log 2>&1 < /dev/null &
```
- `SLP_MAX_S`: 판당 상한 초(상한 도달은 사망 아님). A/B는 600, 장기 관찰은 1200~5400.
- `arms.json`: `{"A": {}, "B": {"KEY": 값}}` → 판마다 A,B 교대. 한 팔만 쓰면 `{"V3": {...}}`. 예: `research/v3h_arms.json`(V3+방향 추종), `research/v2_arms.json`(V2).
- 팔 값은 사용자 현재 값 위에 덮어쓰고, 배치 끝에 사용자 값을 복원한다. 브라우저가 게임 중이면 끝날 때까지 기다린다.
- 반드시 `setsid nohup`으로 띄운다(세션 종료 시 백그라운드가 죽음). 진행 확인: `tail runs/<이름>_live.log` (판마다 `{"k": n, ...}` 한 줄).
- 중단: `kill -INT <pid>` (pid: `pgrep -f "^.venv/bin/python research/mod_deaths_live.py"`). INT는 현재 판이 끝난 뒤 정리한다; 즉시 죽이려면 INT 후 TERM. TERM으로 죽으면 값 복원이 안 될 수 있다 → 아래 5절.

## 4. 결과 분석
- 판 요약: `runs/<dir>/slp_<k>.json`(seconds, L_max, best_rank, modes, decide_ms, track), `_box.json.gz`(마지막 60초 관측), `_log.json.gz`(판 전체 판단 로그).
- 사망 요약: `.venv/bin/python research/v2_death.py runs/<dir> <k>` (킬러 크기·덮개·마지막 10초 모드).
- 추종 정밀도: `.venv/bin/python research/track_report.py runs/<dir> [k...]` (+0.25/+0.5초 계획 위치 오차, 방향 오차, 명령 요동, 송신→wang 지연).
- A/B 집계: `node research/ab_report.mjs runs/<dir>` (생존·10분당 사망·성장).
- 재생: `node research/v2_rollout.mjs '{"V2_ON":1,"V3_ON":1}' runs/<dir>` (사망 8초 전부터 다시 몰기, env LEAD), `node research/v3_frame.mjs runs/<dir> <k> <back_s...>`.

## 5. 사용자 값 복원(수동)
배치 summary.json의 `user_values`가 원래 값. 복원 스크립트 예: `/tmp/restore_user.py` 방식 — `win_chrome.relay(9336, MOD_PORT)`로 CDP 연결 후 `__slp.setValue(key, v)` 반복. 패널에서 직접 프리셋을 다시 고르는 것도 된다.

## 6. 주의
- 확장 재로드 뒤 탭을 새로고침하지 않으면 store.js가 끊긴다(패널 알림). 수집기는 자동으로 처리한다.
- 판 중 값 변경은 기록 `changes`에 남는다. A/B 중에는 패널을 만지지 않는다.
- 서버 인원은 접속 후 `slither_count`로만 정확하다(게임 탭 서버 카드의 마지막 인원).
- 오프라인 재생·절단 시뮬을 실게임과 동시에 돌리면 CPU 경합으로 판단 예산(25ms)을 넘길 수 있다. 동시 실행 시 `nice -n 19`.
- 헤드리스 mock_check의 rAF 단언 실패는 빌드 결함이 아니다(0930 확인).
