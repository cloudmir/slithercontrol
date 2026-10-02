# 새 알고리즘 제안에 앞선 로컬 원문 확인 (2026-09-24)

## active.py 발췌
33:     def __init__(self,rules=None,horizon=2.4,dt=.10):
47:         rel=np.radians([-160,-110,-75,-50,-30,-15,0,15,30,50,75,110,160])
48:         first=np.repeat(rel,6)
49:         second=first+np.tile(np.radians([-50,0,50,-50,0,50]),len(rel))
81:             target=base+np.where(k*dt<.8,first,second)
194:             qualified &= activity <= best_activity+.05

## runs/active_final_v5_planned_summary.json / summary / active/normal
{
  "attempted": 10,
  "valid": 10,
  "invalid": 0,
  "survival_rate": 0.0,
  "activity_success_rate": 0.0,
  "success_ci95": [
    0.0,
    0.3084971078187607
  ],
  "mean_life_s": 280.3866666667044,
  "mean_gain": 11667.39351612395,
  "mean_off_fraction": 0.06782794555312177,
  "target_90_certified": false
}

파일을 읽어 확인했으며 이번 턴에 시험을 재실행한 결과가 아니다. 사망의 원인별 기여율은 미확인이다.