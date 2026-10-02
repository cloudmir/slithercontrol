# slither.io 자동 조종 AI

모든 명령은 이 폴더에서 `. .venv/bin/activate` 후 실행.

## 직접 해보기 (로컬 시뮬레이터, slither.io 서버 접속 없음)

```bash
python play.py                      # 내가 플레이: 마우스로 방향, 왼쪽 버튼/스페이스 = 부스트
python play.py --ai                 # AI(규칙 기반 MPC) 관전, TAB으로 언제든 조종 교대
python play.py --ai --params runs/best_params.json           # 튜닝된 AI
python play.py --ai --model runs/ppo.zip --shield --params runs/best_params.json   # 강화학습 AI + 안전장치
python play.py --bots 50 --hunters 0.5                       # 더 어렵게 (봇 수, 나를 노리는 사냥꾼 비율)
```
키: `TAB` 사람/AI 전환 · `D` AI 판단 경로 표시(초록=안전, 빨강=충돌, 노랑=선택) · `F` 4배속 · `R` 재시작 · `+/-` 확대 · `ESC` 종료

## 학습·평가 (헤드리스)

```bash
python tune.py --gens 6 --pop 10 --minutes 4 --seeds 3 --workers 3   # 규칙 AI 가중치 튜닝 → runs/best_params.json
python train_rl.py --params runs/best_params.json                     # 모방학습+PPO → runs/bc.zip, runs/ppo.zip
python compare.py --minutes 5 --seeds 4                               # 모든 AI 비교 → runs/compare.json
python sim.py --minutes 5 --params runs/best_params.json              # 단일 AI 빠른 점검
```

## 실사이트 (사용자가 지시할 때만)

```bash
python live.py --games 3 --params runs/best_params.json
```
- slither.io 약관은 봇·자동화를 금지하고 IP 차단을 명시함(research/slither_tos.html). 실행은 본인 책임.
- 안전장치: 닉네임 자동(그리스 신화+행성, bot/AI 류 거부) · 하루 5판 · 판당 10분 · 판 사이 30~90초 대기 · 오류 시 재접속 없이 종료.

## 구조
- `brain.py` 공용 뇌: 상태 형식, MPC 플래너(후보 48개 경로를 실제 회전/속도 한계로 1.6초 전개 → 충돌시간·여유거리·빈 공간·먹이로 점수), RL 특징, 안전장치(shield)
- `sim.py` 시뮬레이터(실측 상수: 속도 5.39+0.4·크기, 부스트 14, 회전 0.033/8ms, 몸 반지름 14.5·크기, 마디 42) + gym 환경
- `live.py` 실사이트 연결(Playwright, 공식 클라이언트 화면에서 상태 읽기·마우스 방향 설정)
