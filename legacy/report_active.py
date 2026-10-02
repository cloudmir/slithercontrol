"""Build a reproducible Markdown review from finished first-life trials only."""
import argparse,json,statistics,hashlib
from pathlib import Path
from evaluate_active import summarize
from run_active_validation import jobs


def failure_audit(row):
    path=Path(row.get('trace',''))
    if not path.is_file() or row['controller']!='active':return None
    tail=json.loads(path.read_text())['tail']
    if not tail:return None
    recent=[q for q in tail if q['t']>=tail[-1]['t']-3 and q.get('status')]
    final=tail[-1];z=final.get('status',{})
    safe=[q for q in tail if q.get('status',{}).get('safe_count',0)>0]
    # These are observations, not an assertion that the latest proposal caused contact.
    return dict(seed=row['seed'],setting=row['setting'],cause=row.get('cause'),
        seconds=row.get('seconds'),last_observation_t=final['t'],
        last_safe_observation_t=safe[-1]['t'] if safe else None,
        seconds_after_last_safe_in_trace=row.get('seconds',final['t'])-safe[-1]['t'] if safe else None,
        last_three_seconds_no_safe_fraction=sum(q['status']['safe_count']==0 for q in recent)/max(1,len(recent)),
        last_status=z,executing_target=final['state'].get('tgt'),
        executing_boost=final['state'].get('boost'),pending=final['pending'],
        proposed=final['cmd'],note='Last observation/proposal is distinct from the delayed command executing at collision. No counterfactual cause established.')


def build(plan_path,root,out):
    plan=json.loads(plan_path.read_text());expected=jobs(plan);rows=[];missing=[]
    for name,setting,seed in expected:
        p=root/f'{name}_{setting}_{seed}.json'
        if p.exists():rows.append(json.loads(p.read_text()))
        else:missing.append([name,setting,seed])
    summary=summarize(rows)
    for q in summary.values():q['target_90_certified'] &= not missing
    audit=[a for r in rows if (a:=failure_audit(r))]
    digest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'sources').glob('*.py')}
    data=dict(plan=plan,planned=len(expected),completed=len(rows),missing=missing,summary=summary,
              failure_observations=audit,source_hashes=digest)
    out.with_suffix('.json').write_text(json.dumps(data,indent=2,ensure_ascii=False))
    lines=['# 활동 구역 생존 제어기 구현·검증','',
        '기준일: 2026-09-23. 로컬 시뮬레이터 시험이며 실사이트 성능은 검증하지 않았다.', '',
        f'계획 {len(expected)}판 중 {len(rows)}판 종료, 미완료 {len(missing)}판. 각 판은 첫 사망 또는 600초까지이며 재생성한 생명을 합산하지 않는다.', '',
        '**90% 목표 달성 여부는 아래 결과로 판정한다. 구현과 회귀 검사 통과는 목표 성능 달성을 뜻하지 않는다.**','',
        '| 제어기/난이도 | 유효/종료 | 600초 생존 | 활동 조건까지 성공 | 성공률 95% 구간 | 평균 생존(600초 상한) |',
        '|---|---:|---:|---:|---:|---:|']
    normal=summary.get('active/normal')
    if normal and not missing:
        verdict=('목표 인증 조건을 충족했다.' if normal['target_90_certified'] else '90% 목표 달성을 입증하지 못했다.')
        lines[4:4]=[f"**결과: 새 제어기의 보통 난이도 활동 준수 10분 완주율은 {normal['activity_success_rate']:.0%} ({round(normal['activity_success_rate']*normal['valid'])}/{normal['valid']}). {verdict}**",'']
    for key,q in summary.items():
        n=q['valid'];ci=q['success_ci95']
        lines.append(f"| {key} | {n}/{q['attempted']} | {q['survival_rate']*100:.1f}% | {q['activity_success_rate']*100:.1f}% | {ci[0]*100:.1f}–{ci[1]*100:.1f}% | {q['mean_life_s']:.1f}초 |")
    lines+=['','인증은 계획 미완료·환경 부적합이 없고, 600초 활동 준수 성공률의 양측 95% 이항 신뢰구간 하한이 90% 이상일 때만 인정한다. 작은 표본의 관측 성공률과 구분한다.', '',
        '## 판별 결과','',
        '| 제어기 | 난이도 | 시드 | 생존 초 | 생존 | 활동 준수 | 종료 직전 길이 | 평균 상대 수 비율 | 판단 p95(ms) |',
        '|---|---|---:|---:|---|---|---:|---:|---:|']
    for r in rows:
        if 'seconds' not in r:
            lines.append(f"| {r['controller']} | {r['setting']} | {r['seed']} | 환경 오류 | — | — | — | — | — |")
            continue
        lines.append(f"| {r['controller']} | {r['setting']} | {r['seed']} | {r['seconds']:.1f} | {r['alive']} | {r['activity_ok']} | {r['L_end']:.0f} | {r.get('population_fraction',1):.4f} | {r['decision_ms_p95']:.1f} |")
    lines+=['','사망 판의 종료 직전 길이는 죽기 전 먹이 수집량을 보여주는 보조값이다. 생존 시간 차이가 있어 성장 우열의 단독 근거로 삼지 않는다. 초기 길이는 모두 100이다.', '',
        '## 구현과 검사','',
        '- 지연된 명령을 반영한 83개 복합 경로: 회전, 짧은 부스트 후 일반 속도, 원형 회피, 이전 계획 유지.',
        '- 몸·벽·상대 경로 충돌 배제 → 기동 위험과 여유 거리 → 활동 구역 → 먹이 순이득 순서. 먹이 점수가 안전 배제를 뒤집지 않는다.',
        '- 별도 평가 환경에서 이동 구간 충돌과 스폰 침범을 검사한다. 스폰 대기 때 같은 길이·역할을 유지하며 상대 수가 감소해 시험이 쉬워지면 부적합 처리한다.',
        '- 회귀 테스트 결과: `runs/active_tests.txt`. 직접 조종/AI 전환과 경로 HUD: `play.py --active --ai`.',
        '- 원래 brain.py/sim.py/compare.py/tune.py와 기존 실험은 보존. 새 코드·규칙·시드·체크포인트·실패 직전 관측을 별도로 저장.', '',
        '## 검증 범위와 한계','',
        '- 중간 혼잡·일시 이탈 기준은 `runs/active_rules_v1.json`으로 동결했다. 성능에 맞춰 낮추지 않았다. 초기 환경 표본은 8개뿐이어서 전체 대표성은 미검증이다.',
        '- 보통: 봇 50, 사냥꾼 비율 0.3, 지연 2/30초. 어려움: 55, 0.45, 3/30초. 관측 반경/혼잡 규칙은 동일하다. 대조군은 기본 플래너 파라미터이며 이전 튜닝 대조군과 다르다.',
        '- 상대 정책과 난수 소비는 행동에 따라 달라진다. 같은 시드는 동일한 초기 월드를 제공하지만 모든 이후 외생 사건까지 완전히 짝지었다는 뜻은 아니다.',
        '- 판단 시간은 병렬 시험 중 측정값이다. 물리 지연은 고정되어 있어 계산 지연 초과가 생존에 미치는 영향과 실시간 안정성은 미검증이다.',
        '- 충돌 모형은 원게임 물리의 완전한 복제가 아니다. 상대 기동의 장기 예측·포위 탈출·몸체 변형과 관측 밖 위험의 완전한 안전 보장은 없다.',
        '- 실패 관측은 JSON의 failure_observations에 저장했다. 마지막 제안과 충돌 순간 실행 명령은 다를 수 있어 사망 원인별 인과 기여율로 해석하지 않는다.',
        '- 이전 개발/v2/v3/v4 결과와 미완료 시험은 보존했다. 환경과 코드가 달라 현재 시험에 합산하지 않는다.', '',
        '## 재현','',
        '```sh',
        'OPENBLAS_NUM_THREADS=1 .venv/bin/python -m unittest test_active -v',
        f'OPENBLAS_NUM_THREADS=1 .venv/bin/python run_active_validation.py --plan {plan_path} --dir {root}',
        f'.venv/bin/python report_active.py --plan {plan_path} --dir {root} --out {out}',
        '.venv/bin/python play.py --active --ai --seed 56000',
        '```','',
        '실험 폴더의 sources는 실제 실행한 동결본이다. 기존 결과를 덮어쓰지 않고 재시험하려면 새 출력 폴더를 사용한다.']
    paired=[]
    for seed in plan['baseline_seeds']:
        group={r['controller']:r for r in rows if r['seed']==seed and r['setting']=='normal' and r.get('valid')}
        if all(k in group for k in ('active','straight','planner')):paired.append(group)
    lines+=['','## 동일 초기 시드 비교','',f'세 제어기 모두 유효하게 종료한 공통 시드: {len(paired)}/{len(plan["baseline_seeds"])}개.']
    if paired:
        lines+=['','| 제어기 | 공통 시드 평균 생존 | 활동 준수 완주 |','|---|---:|---:|']
        for name in ('active','straight','planner'):
            life=statistics.mean(g[name]['seconds'] for g in paired)
            passed=sum(g[name]['success'] for g in paired)
            lines.append(f'| {name} | {life:.1f}초 | {passed}/{len(paired)} |')
        lines+=['','이 소표본으로 생존 우위를 확정하지 않는다. 각 정책 행동에 따라 이후 월드와 상대 난수 소비가 달라진다는 한계도 있다.']
    if audit:
        lines+=['','## 실패 직전 관측','',
                '| 난이도/시드 | 접촉 분류 | 기록 내 마지막 안전 후보 이후 경과 | 마지막 3초 안전 후보 없음 비율 |',
                '|---|---|---:|---:|']
        for a in audit:
            delay=a['seconds_after_last_safe_in_trace']
            elapsed=f'{delay:.2f}초' if delay is not None else '기록 내 안전 후보 없음'
            lines.append(f"| {a['setting']}/{a['seed']} | {a['cause']} | {elapsed} | {a['last_three_seconds_no_safe_fraction']:.0%} |")
        lines+=['','이는 유한 예측기 내부의 안전 판정 기록이다. 실제로 회피 불가능했는지, 다른 정책이면 살았을지는 반사실 재실행으로 검증하지 않았다.']
    if missing:lines+=['','미완료: '+', '.join('/'.join(map(str,j)) for j in missing)]
    out.write_text('\n'.join(lines)+'\n')
    print(json.dumps(dict(completed=len(rows),missing=len(missing),summary=summary),ensure_ascii=False))


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--plan',default='runs/active_final_v5_plan.json',type=Path)
    ap.add_argument('--dir',default='runs/active_final_v5',type=Path)
    ap.add_argument('--out',default='ACTIVE_VALIDATION.md',type=Path)
    a=ap.parse_args();build(a.plan,a.dir,a.out)
