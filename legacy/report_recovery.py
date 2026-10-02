"""Report measured recovery and full-game results without conflating the goals."""
import json,hashlib
from pathlib import Path
import numpy as np
import torch
from stable_baselines3 import PPO
ROOT=Path('runs/recovery_v1')

def main():
    torch.set_num_threads(1)
    select=json.loads((ROOT/'selection.json').read_text())
    assert hashlib.sha256(Path(select['model']).read_bytes()).hexdigest()==select['sha256']
    short={k:json.loads((ROOT/f'test_{k}.json').read_text()) for k in ['original','untrained','selected']}
    assert all(r['windows']==9 and r['death_events']==3 for r in short.values())
    whole={k:[json.loads((ROOT/f'world_{k}/{s}.json').read_text()) for s in [57000,57001,57002]] for k in ['untrained','selected']}
    training=[json.loads(s) for s in (ROOT/'training.jsonl').read_text().splitlines() if s]
    assert max(r['steps'] for r in training)==65536
    zero=PPO.load(ROOT/'models/ppo_000000.zip',device='cpu')
    last=PPO.load(ROOT/'models/ppo_065536.zip',device='cpu')
    diffs=[(p-q).detach().cpu().numpy().ravel() for p,q in zip(last.policy.parameters(),zero.policy.parameters())]
    diff=np.concatenate(diffs)
    weights=dict(changed_parameters=int(np.count_nonzero(diff)),total_parameters=len(diff),l2_change=float(np.linalg.norm(diff)))
    initial=dict(zero.policy.named_parameters())
    actor=np.concatenate([(p-initial[n]).detach().cpu().numpy().ravel() for n,p in last.policy.named_parameters() if n.startswith(('mlp_extractor.policy_net.','action_net.'))])
    weights['actor_l2_change']=float(np.linalg.norm(actor))
    assert weights['actor_l2_change']>0
    assert weights['changed_parameters']>0
    cases=[json.loads(p.read_text()) for p in sorted(ROOT.glob('*.case.json'))]
    preserved={n:hashlib.sha256(Path(n).read_bytes()).hexdigest()==cases[0]['hashes'][n] for n in cases[0]['hashes']}
    assert all(preserved.values())
    group={k:[dict(seed=s,recoveries=sum(q['is_success'] for q in r['rows'] if q['seed']==s),windows=3) for s in [56002,56007,56008]] for k,r in short.items()}
    result=dict(steps=65536,selection=select,weights=weights,cases=cases,preserved=preserved,
        short=short,by_event=group,whole=whole,training=training,goal_reached=False,
        limitations=['Only five training death events; one validation event; three held-out death events.',
        'Three offsets of one death are correlated. No population-wide success-rate claim.',
        'Recovery horizon ends six seconds after original death; ten-minute activity-compliant success is measured separately.',
        'Fresh-world sample is only three seeds per model. Real-site performance is untested.'])
    Path('RECOVERY_REPORT.json').write_text(json.dumps(result,indent=2))
    lines=['# 사망 직전 회피 학습 결과','',
        'PPO를 무작위 초기 가중치부터 65,536스텝 학습했다. 신경망이 조향·부스트를 직접 결정하며 안전장치의 행동 교체는 0회다.',
        f"검증 사건만으로 선택한 체크포인트: **{select['selected_steps']:,}스텝** (`{select['model']}`).",
        '학습 사건 5개, 검증 사건 1개, 최종 시험 사건 3개를 분리했다. 각 사건의 2·4·6초 전 상황을 사용했다.',
        '', '## 학습에 쓰지 않은 사망 상황', '',
        '성공은 원래 사망 시각보다 6초 뒤까지 생존한 경우다. 9개 시작 시점은 3개 사건에서 나왔으므로 독립된 9개 사건이 아니다.', '',
        '| 정책 | 회피 완료 | 환경 유효 | 평균 생존 |', '|---|---:|---:|---:|']
    labels={'original':'원래 v5 제어기','untrained':'학습 전 신경망','selected':'검증으로 선택한 신경망'}
    for k,r in short.items():lines.append(f"| {labels[k]} | {r['recoveries']}/9 | {r['valid']}/9 | {r['mean_survival']:.2f}초 |")
    lines+=['','사건별 회피 완료(각 3개 시작 시점):']
    for k,rows in group.items():lines.append('- '+labels[k]+': '+', '.join(f"{r['seed']}={r['recoveries']}/3" for r in rows))
    lines+=['','## 새로운 월드에서의 10분 시험','',
        '기존 활동 조건과 보통 난이도·초기 길이 100을 유지했다. 첫 사망 또는 600초에서 종료한다. 일시 회피 허용과 외곽·빈 공간 장기 체류 배제 기준도 유지했다.', '',
        '| 정책 | 판 수 | 환경 유효 | 활동 준수 10분 완주 | 평균 생존 |', '|---|---:|---:|---:|---:|']
    for k,rows in whole.items():lines.append(f"| {labels[k]} | 3 | {sum(r['valid'] for r in rows)}/3 | {sum(r['success'] for r in rows)}/3 | {np.mean([r['seconds'] for r in rows]):.2f}초 |")
    lines+=['','이 소표본으로 10분 완주율 90% 또는 99%를 입증할 수 없다. 단기 회피 개선 여부는 위 비교로 판단하고, 장기 활동·섭식·생존 성능과 구분해야 한다.',
        '', '## 확인한 것과 남은 것','',
        f"- 9개 원본 사망 사건의 마지막 120개 관측과 사망 시각·길이·원인을 재현했다. 기존 물리/플래너 소스 해시 보존: {all(preserved.values())}.",
        f"- 학습 전 대비 변경된 신경망 파라미터 {weights['changed_parameters']:,}개, 변화 L2 {weights['l2_change']:.4f}. 실제 학습된 가중치를 저장했다.",
        '- 사망 상황 로드·회전·직접 행동·안전장치 미호출 등 7개 검사, SB3 환경 검사, 뷰어 AI/수동 전환·재시작 검사 결과는 runs/recovery_v1에 보관한다.',
        '- 학습 사건 수가 작고, 큰 길이의 사망 상황과 초기 길이 100 사이 분포 차이가 있다. 학습 반복 간 편차와 실사이트 성능은 검증하지 않았다.',
        '- 새 월드 사망 직전 전체 상태는 *.failure.pkl에 보관했다. 이번 시험 모델의 학습에 섞지 않았으며 다음 학습에 편입하면 해당 시드는 시험용에서 제외해야 한다.',
        '', '## 관찰 실행','', '```sh',f".venv/bin/python play.py --ai --recovery-model {select['model']}",'```','']
    Path('RECOVERY_REPORT.md').write_text('\n'.join(lines))
    print(json.dumps(dict(steps=65536,selected=select['selected_steps'],recovery={k:r['recoveries'] for k,r in short.items()},whole={k:sum(r['success'] for r in v) for k,v in whole.items()},weights=weights)))

if __name__=='__main__':main()
