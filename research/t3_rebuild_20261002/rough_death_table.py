"""Read-only raw T3 terminal-frame summary; nearest body is not a verified killer."""
import csv, gzip, hashlib, json, math, statistics, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / 'rough_deaths'
BUILD = '1002-11dad5e1'
OUT.mkdir(exist_ok=True)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def nearest(fr, target=None):
    best = None
    for k, sid in enumerate(fr['sid']):
        if target is not None and sid != target:
            continue
        ax, ay, bx, by, radius = fr['segs'][5*k:5*k+5]
        dx, dy = bx-ax, by-ay
        u = max(0, min(1, ((fr['x']-ax)*dx+(fr['y']-ay)*dy)/max(1e-9, dx*dx+dy*dy)))
        distance = math.hypot(fr['x']-ax-u*dx, fr['y']-ay-u*dy)
        own = 14.5*fr['sc']
        gap = distance-own-radius
        if best is None or gap < best['gap']:
            best = dict(enemy_id=sid, enemy_r=radius, own_r=own, distance=distance,
                        gap=gap, angle_deg=math.degrees(math.acos(min(1, abs(math.cos(fr['ang']-math.atan2(dy, dx)))))))
    return best

def bin_of(r):
    return min(4, max(0, int(r//10)-1))

def quantile(values, q):
    a = sorted(values)
    if not a:
        return None
    at = (len(a)-1)*q
    lo = int(at)
    return a[lo]+(a[min(lo+1, len(a)-1)]-a[lo])*(at-lo)

# Freeze completed-record paths before reading; later games belong to a later snapshot.
started = time.strftime('%F %T %Z')
records = []
for run in sorted((ROOT/'runs').glob('t3_*')):
    for path in sorted(run.glob('slp_[0-9][0-9].json')):
        rec = json.loads(path.read_text())
        if rec.get('ext') == BUILD:
            records.append((path, rec))

rows, alive, inventory, errors = [], [], [], []
for path, rec in records:
    if rec.get('capped') or rec.get('end_reason') != 'death':
        continue
    boxpath = path.with_name(path.stem+'_box.json.gz')
    logpath = path.with_name(path.stem+'_log.json.gz')
    if not boxpath.exists() or not logpath.exists():
        errors.append(str(path.relative_to(ROOT)))
        continue
    box = json.load(gzip.open(boxpath))
    log = json.load(gzip.open(logpath))
    frames = box['frames']
    if not frames or not log['log']:
        errors.append(str(path.relative_to(ROOT)))
        continue
    trace = dict(zip(log['keys'], log['log'][-1]))
    levels = {}
    for values in log['log']:
        tr = dict(zip(log['keys'], values))
        level = tr.get('t3_level')
        if level:
            levels[(level['serial'], level['target'])] = level
    alive.extend({**level, 'run':path.parent.name, 'game':int(path.stem[-2:])} for level in levels.values())
    fr = frames[-1]
    near = nearest(fr)
    if not near:
        errors.append(str(path.relative_to(ROOT)))
        continue
    target = trace.get('t3_target')
    target_near = nearest(fr, target) if target is not None else None
    previous = [q for q in frames[:-1] if fr['t']-q['t'] <= .5]
    earlier = [nearest(q, near['enemy_id']) for q in previous]
    earlier = [q for q in earlier if q]
    head = min((math.hypot(fr['heads'][k]-fr['x'], fr['heads'][k+1]-fr['y']) for k in range(0,len(fr['heads']),5)), default=1e9)
    window = rec['seconds']-fr['t']
    row = dict(run=path.parent.name, game=int(path.stem[-2:]), build=BUILD,
               **near, enemy_diameter=2*near['enemy_r'], own_diameter=2*near['own_r'],
               speed=fr['sp'], speed_class='boost' if fr['sp']>8 else 'cruise',
               frame_t=fr['t'], end_seconds=rec['seconds'], end_window_s=window,
               frame_interval_s=fr['t']-frames[-2]['t'] if len(frames)>1 else None,
               trace_t=trace.get('t'), target_id=target, same_target=target==near['enemy_id'],
               target_gap=target_near['gap'] if target_near else None,
               actual_phase=trace.get('t3_phase'), head_distance=head,
               earlier_half_second_min_gap=min((q['gap'] for q in earlier), default=None),
               time_close=-.05<=window<=.25,
               raw_record=str(path.relative_to(ROOT)), raw_box=str(boxpath.relative_to(ROOT)), raw_log=str(logpath.relative_to(ROOT)))
    # A descriptive subset only, without stable-level or t3_valid gates.
    row['parallel_target_time_close'] = row['same_target'] and near['angle_deg']<15 and row['time_close']
    rows.append(row)
    inventory.append({str(p.relative_to(ROOT)):sha(p) for p in (path, boxpath, logpath)})

groups = []
for speed in ['cruise', 'boost']:
    for b, label in enumerate(['<40','40–60','60–80','80–100','≥100']):
        ds = [r for r in rows if bin_of(r['enemy_r'])==b and r['speed_class']==speed]
        ls = [r for r in alive if bin_of(r['enemy_r'])==b and ('boost' if r['speed']>8 else 'cruise')==speed]
        ss = [r for r in ds if r['parallel_target_time_close']]
        vals = [r['gap'] for r in ds]
        groups.append(dict(speed=speed, enemy_diameter_bin=label, deaths=len(ds),
                           median_gap=statistics.median(vals) if vals else None,
                           p10_gap=quantile(vals,.1), p90_gap=quantile(vals,.9),
                           min_gap=min(vals) if vals else None, max_gap=max(vals) if vals else None,
                           own_diameter_min=min((r['own_diameter'] for r in ds),default=None),
                           own_diameter_max=max((r['own_diameter'] for r in ds),default=None),
                           parallel_same_target_n=len(ss), parallel_same_target_median=statistics.median(r['gap'] for r in ss) if ss else None,
                           timing_uncertain_n=sum(not r['time_close'] for r in ds),
                           stable_alive_levels=len(ls), stable_alive_games=len({(r['run'],r['game']) for r in ls}),
                           stable_alive_min=min((r['gap_min'] for r in ls),default=None)))

data=dict(checked_at=started, build=BUILD, completed_records=len(records), death_rows=len(rows),
          skipped_missing=errors, groups=groups, rows=rows, stable_levels=alive, inventory=inventory,
          scope='T3 current build only. All terminal nearest-body gaps retained; killer unverified. Not server collision points or safe offsets.')
(OUT/'data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
with (OUT/'deaths.csv').open('w') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]) if rows else [])
    w.writeheader();w.writerows(rows)
with (OUT/'bins.csv').open('w') as f:
    w=csv.DictWriter(f,fieldnames=list(groups[0]));w.writeheader();w.writerows(groups)
fmt=lambda x:'—' if x is None else f'{x:+.2f}'
lines=['# T3 사망 직전 대략 간격 표',f'집계: {started} · 빌드 {BUILD} · 종료 기록 {len(records)}판 / 사망 원본 {len(rows)}판.',
       '단위: 게임 세계 좌표 px. 적 굵기=표시 반경×2. gap=우리 머리 중심–적 몸통 중심선 거리−우리 반경−적 반경. 음수는 표시 반경이 겹침을 뜻함.',
       '최근접 몸통은 사망 원인으로 확정되지 않음. 값은 종료 직전 마지막 기록 프레임이며 실제 서버 충돌 위치가 아님. 속도·우리 굵기·각도와 관측 지연 혼재를 원본 CSV에 보존. 기존 엄격한 안정 판정으로 거르지 않은 기술 통계.',
       '', '| 실제 속도 | 적 표시 굵기 | 사망 수 | 마지막 gap 중앙값 | 중앙 80% 범위 | 같은 대상·평행 사례 수 | 해당 사례 gap 중앙값 | 안정 생존 최소 gap |',
       '|---|---|---:|---:|---|---:|---:|---:|']
for g in groups:
    lines.append(f"| {'순항' if g['speed']=='cruise' else '부스트'} | {g['enemy_diameter_bin']} | {g['deaths']} | {fmt(g['median_gap'])} | {fmt(g['p10_gap'])} ~ {fmt(g['p90_gap'])} | {g['parallel_same_target_n']} | {fmt(g['parallel_same_target_median'])} | {fmt(g['stable_alive_min'])} |")
lines += ['', '중앙80%=10–90백분위이며 신뢰구간/접촉 경계가 아님. 같은 대상·평행 사례=추종 대상과 최근접 몸통 동일+해당 선분과 각도<15°+종료와 프레임 차이−0.05~0.25초. 머리 간섭·곡률은 여전히 혼재하므로 확정 경계로 해석하지 않음.',
          '안정 생존 최소 gap은 해당 표시 굵기·속도의 개별 생존 관측이며 사망 통계와 같은 조건의 쌍을 보장하지 않음. 표의 굵기는 실제 몸길이가 아닌 표시 지름.',
          '원본 경로·SHA256: data.json inventory. 관측 전부 deaths.csv / 구간 통계 bins.csv. 원본과 제품 코드는 수정하지 않음.']
(OUT/'TABLE.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({k:data[k] for k in ['checked_at','completed_records','death_rows','skipped_missing','groups']},ensure_ascii=False,indent=2))
