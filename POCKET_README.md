# 포위 내부 임시 회전 방어

완료된 비교 결과와 한계는 [POCKET_RESULTS.md](POCKET_RESULTS.md)에 있습니다.
합성 포위에서 동작했지만 일반 플레이 성적은 기존 대조군보다 나빠 기본값으로 채택하지 않았습니다.

`pocket.py`는 기존 `staged.py`를 보존한 별도 제어기입니다. 평상시에는 `predict`의
회피·채집을 사용하고, 포위 또는 주변 방향의 높은 차단 비율에서 방어로 전환합니다.
길이 1,800 조건 없이 현재 회전 반경과 빈 공간을 기준으로 후보를 만듭니다.

- 보수적으로 팽창시킨 장애물 격자에서 현재 위치와 출구의 연결을 확인합니다.
- 출구가 있으면 경유점을 향하는 안전 후보를 선택합니다.
- 출구가 없으면 진입 경로와 한 바퀴 이상을 실제 회전 제한·명령 큐로 예측합니다.
- 관측된 몸체와 벽에 부딪히지 않는 후보를 반복 추종하고 매 판단마다 재검사합니다.
- 가능한 회전이 없으면 `no_loop`로 표시하고 기존 비상 회피를 사용합니다.

`pocket_loop`는 예측한 회전 경로이며 자기 몸이 닫힌 고리를 만들었다는 뜻이 아닙니다.
경로 전체 검사는 현재 관측 몸체를 고정해 계산하며 상대 머리·새 몸체는 2초까지만
근사 예측합니다. 상대가 공간을 줄이거나 급회전하면 안전하던 경로도 사라질 수 있습니다.
현재 빈 공간이 없거나 최소 회전 반경보다 작으면 생존을 보장하지 않습니다.

## 관찰

```sh
# 닫힌 포위 → 8초에 출구 개방 → 탈출·먹이 수집을 보는 합성 사례
OPENBLAS_NUM_THREADS=1 .venv/bin/python play_pocket.py
# 점점 줄어드는 포위; 영구 생존 사례가 아닙니다
OPENBLAS_NUM_THREADS=1 .venv/bin/python play_pocket.py --case shrinking
# 실제로 반응하는 기존 시뮬레이터 봇들과 일반 플레이
OPENBLAS_NUM_THREADS=1 .venv/bin/python play_staged.py --stage pocket
```

합성 뷰어: `F` 4배속, `D` 예측 경로, `R` 같은 사례 재시작, `Esc` 종료.
일반 뷰어는 기존 `Tab` 직접 조종도 지원합니다. 기존 기본값 `coil`은 유지합니다.
명시적인 사용자 요청이 있을 때만 `live_staged.py --stage pocket`으로 실사이트 1판을 실행합니다. 일반 기본값은 coil입니다.

## 검증 범위

합성 사례는 고정 원·비중심·타원·출구 개방·축소·과소 공간·침입 머리·열린 먹이 구역입니다.
실제 사망 장면의 재현이나 반응형 상대의 포위 전략이 아닙니다. 별도 일반 시뮬레이터
비교는 동일 초기 시드의 `coil`, `predict`, `pocket`을 사용합니다. `predict` 대조군으로
포위 기능의 추가 효과를 분리합니다. 정책에 따라 이후 상대 반응은 달라집니다.

```sh
OPENBLAS_NUM_THREADS=1 .venv/bin/python -m unittest test_pocket test_staged
OPENBLAS_NUM_THREADS=1 .venv/bin/python evaluate_pocket.py \
  --out runs/my_pocket_comparison --controllers coil,predict,pocket --seeds 2 --seconds 60
```

새 출력 경로에 코드와 설정을 동결합니다. 기존 출력 경로로 새 실험을 덮어쓰지 않습니다.
실행이 중단되면 기존 실행 종료를 확인한 뒤 다음 명령으로 완료된 판을 보존하고
미완료 판만 원래 시드의 처음부터 다시 실행할 수 있습니다. 판 중간 상태의 복원은 아닙니다.

```sh
OPENBLAS_NUM_THREADS=1 .venv/bin/python resume_pocket.py runs/my_pocket_comparison
```

재시작 시 동결 코드의 해시와 완료된 판의 식별값을 확인합니다.
시뮬레이터는 계산을 기다리므로 생존 성적과 실제 시간 내 판단 가능성은 별도 지표입니다.
짧은 시험은 600초 완주율 90% 달성으로 해석하지 않습니다.
