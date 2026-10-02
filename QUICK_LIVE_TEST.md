# 실게임 1판 빠른 테스트 (지금처럼 띄우기)

전제: Windows Chrome 전용 프로필에 확장이 설치돼 있고(설치·빌드는 GUIDE_WINDOWS_CHROME_TEST.md), 패널에서 원하는 모드(V1/V2/V3)와 서버를 골라 둔 상태.

## 띄우기 (WSL, 프로젝트 루트)
```
SLP_MAX_S=1200 setsid nohup .venv/bin/python research/mod_deaths_live.py 1 one "테스트 목적 한 줄" \
  > runs/one_live.log 2>&1 < /dev/null &
```
- 판당 상한 1200초(20분). 사망하거나 상한이 되면 끝난다.
- 특정 설정으로 띄우려면 arms 파일을 마지막 인수로: `research/v3h_arms.json`(V3+방향 추종). 없으면 현재 패널 값 그대로.
- 브라우저가 이미 게임 중이면 끝날 때까지 기다렸다가 시작한다. 확장은 자동 재로드된다.

## 진행 확인
```
tail -f runs/one_live.log        # 판이 끝나면 {"k": 1, "seconds": ..., "L_max": ..., "modes": ...} 한 줄
pgrep -f "^.venv/bin/python research/mod_deaths_live.py"   # 수집기 살아 있는지
```
결과 폴더: `runs/one_<시각>/` — `slp_01.json`(요약), `slp_01_box.json.gz`(마지막 60초 관측), `slp_01_log.json.gz`(판 전체 판단).

## 끝난 뒤 보기
```
.venv/bin/python research/v2_death.py runs/one_<시각> 1      # 사망 원인·마지막 10초
.venv/bin/python research/track_report.py runs/one_<시각> 1  # 추종 정밀도(V2/V3+TRACK_ON일 때)
```

## 중단
```
kill -INT $(pgrep -f "^.venv/bin/python research/mod_deaths_live.py")   # 현재 판 끝난 뒤 정리·값 복원
```
바로 죽이려면 INT 뒤 TERM. TERM으로 죽으면 패널 값이 arms 값으로 남을 수 있으니 패널에서 프리셋을 다시 고른다.

## 주의
- 세션 종료 시 백그라운드가 죽으므로 반드시 `setsid nohup`.
- 실게임 중 무거운 오프라인 분석은 `nice -n 19`로.
