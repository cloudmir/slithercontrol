"""Collect missing T3 conditions until coverage or an explicit user stop.

Batch limits are recording boundaries, not an overall collection limit.
The production controller and its qualification filters are not changed.
"""
import collections
import fcntl
import json
import os
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DATA = ROOT / 'research/t3_20261002/data.json'
STOP = HERE / 'STOP_CONTINUOUS'
BINS = ['<20', '20–30', '30–40', '40–50', '≥50']
CONDITIONS = [(b, speed, geometry) for b in range(5)
              for speed in ['cruise_speed', 'boost_speed']
              for geometry in ['straight', 'gentle_curve']]
CRITERIA = {'enemy_radius_bins': BINS,
            'actual_speeds': ['cruise_speed', 'boost_speed'],
            'geometries': ['straight', 'gentle_curve'],
            'own_radius_bin_width_px': 2,
            'minimum_independent_alive_games': 3,
            'minimum_independent_qualified_death_games': 3,
            'closest_alive_gap_per_game_max_px': 0,
            'note': 'Operational dataset coverage; not all continuous radii or a guaranteed safe offset.'}


def bin_of(r):
    return 0 if r < 20 else 1 if r < 30 else 2 if r < 40 else 3 if r < 50 else 4


def coverage(data, build):
    alive = collections.defaultdict(dict)
    deaths = collections.defaultdict(set)
    for e in data.get('levels', []):
        if e.get('build') != build or e.get('provisional'):
            continue
        key = (bin_of(e['enemy_r']), e['speed_class'], e.get('geometry_class', 'straight'),
               int(e['own_r'] // 2) * 2)
        game = (e['run'], e['game'])
        alive[key][game] = min(alive[key].get(game, float('inf')), e['gap_min'])
    for e in data.get('deaths', []):
        if e.get('build') != build or e.get('kind') != 'death_candidate':
            continue
        key = (bin_of(e['enemy_r']), e['speed_class'], e.get('geometry_class', 'straight'),
               int(e['own_r'] // 2) * 2)
        deaths[key].add((e['run'], e['game']))
    cells = []
    for condition in CONDITIONS:
        groups = []
        for key in set(alive) | set(deaths):
            if key[:3] != condition:
                continue
            near = sum(gap <= 0 for gap in alive.get(key, {}).values())
            ds = len(deaths.get(key, set()))
            groups.append({'own_radius_bin': [key[3], key[3] + 2],
                           'alive_games': len(alive.get(key, {})),
                           'near_boundary_alive_games': near,
                           'qualified_death_games': ds,
                           'complete': near >= 3 and ds >= 3})
        cells.append({'enemy_bin': condition[0], 'enemy_radius_bin': BINS[condition[0]],
                      'actual_speed_class': condition[1], 'geometry_class': condition[2],
                      'groups': groups, 'complete': any(g['complete'] for g in groups)})
    return cells


def next_request(cells, attempts):
    # Fairness across missing bin/speed pairs: sparse conditions cannot starve.
    missing = {(c['enemy_bin'], c['actual_speed_class']) for c in cells if not c['complete']}
    if not missing:
        return None
    return min(missing, key=lambda c: (attempts.get(c, 0), c[1] != 'boost_speed', c[0]))


def read_json(path, default=None):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return default


def write_json(path, data):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    temp.replace(path)


def active(pid):
    try:
        return Path(f'/proc/{pid}/stat').read_text().split(') ')[1][0] != 'Z'
    except (OSError, IndexError):
        return False


def find_run(log):
    try:
        for line in log.read_text().splitlines():
            if line.startswith('OUT '):
                return ROOT / line.split()[1]
    except OSError:
        pass
    return None


def manual_stop(run):
    if STOP.exists():
        return True
    if not run:
        return False
    records = [read_json(p, {}) for p in run.glob('slp_[0-9][0-9].json')]
    if (run / 'STOP').exists() or (run / 'STOP_NOW').exists() or any(
            g.get('end_reason') in ['user_stop', 'interrupted_settings'] for g in records):
        return True
    # Compatibility for the adopted runner: distinguish a page failure from a user edit.
    summary = read_json(run / 'summary.json', {})
    build = read_json(ROOT / 'ext/manifest.json', {}).get('version_name')
    return any(g.get('end_reason') == 'interrupted_settings_or_error' for g in records) and not summary.get('page_errors') and build == summary.get('build')


def main():
    os.chdir(ROOT)
    lock = (HERE / 'continuous.lock').open('w')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    stamp = time.strftime('%Y%m%d_%H%M%S')
    state_path = HERE / 'continuation.json'
    attempts = collections.Counter()
    batch = 0

    def status(**kwargs):
        state = {'updated': time.strftime('%F %T'), 'supervisor_pid': os.getpid(),
                 'mode': 'until_dataset_coverage', 'global_batch_or_time_cap': None,
                 'criteria': CRITERIA, **kwargs}
        write_json(state_path, state)
        with (HERE / 'continuous_events.jsonl').open('a') as f:
            f.write(json.dumps(state, ensure_ascii=False) + '\n')

    adopted = read_json(HERE / 'continuous_adopt.json', {}).get('adopted', {})
    adopted_pid = adopted.get('pid')
    adopted_log = ROOT / adopted.get('log', 'missing')
    run = find_run(adopted_log)
    while adopted_pid and active(adopted_pid):
        build = read_json(ROOT / 'ext/manifest.json', {}).get('version_name')
        cells = coverage(read_json(DATA, {}), build)
        write_json(HERE / 'coverage_progress.json', {'updated': time.strftime('%F %T'),
                   'build': build, 'criteria': CRITERIA, 'cells': cells,
                   'completed_conditions': sum(c['complete'] for c in cells),
                   'total_conditions': len(cells)})
        status(state='collecting_existing_batch', pid=adopted_pid,
               run=str(run.relative_to(ROOT)) if run else None,
               start_gap=adopted.get('start_gap'), speed_request='cruise')
        if STOP.exists() and run:
            (run / 'STOP_NOW').touch()
        time.sleep(10)
        run = run or find_run(adopted_log)
    if manual_stop(run):
        status(state='user_stopped')
        return

    failures = 0
    while not STOP.exists():
        build = read_json(ROOT / 'ext/manifest.json', {}).get('version_name')
        data = read_json(DATA, {})
        cells = coverage(data, build)
        write_json(HERE / 'coverage_progress.json', {'updated': time.strftime('%F %T'),
                   'build': build, 'criteria': CRITERIA, 'cells': cells,
                   'completed_conditions': sum(c['complete'] for c in cells),
                   'total_conditions': len(cells)})
        request = next_request(cells, attempts)
        if request is None:
            status(state='dataset_coverage_complete', build=build, completed_conditions=len(cells))
            return
        enemy_bin, speed = request
        attempts[request] += 1
        batch += 1
        log = HERE / f'continuous_{stamp}_{batch:04}.log'
        env = dict(os.environ, T3_GAMES='6', T3_GAP_START='16',
                   T3_BIN_REQUEST=str(enemy_bin), T3_SPEED_REQUEST=str(int(speed == 'boost_speed')))
        previous = read_json(run / 'summary.json', {}) if run else {}
        if previous.get('requested_server'):
            env['T3_SERVER'] = previous['requested_server']
        with log.open('w') as output:
            proc = subprocess.Popen([str(ROOT / '.venv/bin/python'),
                                     'research/t3_20261002/batch.py'], stdout=output,
                                    stderr=subprocess.STDOUT, start_new_session=True, env=env)
        run = None
        while proc.poll() is None:
            run = run or find_run(log)
            status(state='collecting', batch=batch, pid=proc.pid, build=build,
                   log=str(log.relative_to(ROOT)), run=str(run.relative_to(ROOT)) if run else None,
                   start_gap=16, enemy_bin_request=enemy_bin, speed_request=speed,
                   completed_conditions=sum(c['complete'] for c in cells), total_conditions=len(cells))
            if STOP.exists() and run:
                (run / 'STOP_NOW').touch()
            time.sleep(10)
        if manual_stop(run):
            status(state='user_stopped', run=str(run.relative_to(ROOT)) if run else None)
            return
        summary = read_json(run / 'summary.json', {}) if run else {}
        if proc.returncode or summary.get('error') or summary.get('page_errors') or not summary.get('completed'):
            failures += 1
            delay = min(300, 15 * 2 ** min(failures, 5))
            status(state='retry_wait', error=summary.get('error'), retry_in_s=delay,
                   log=str(log.relative_to(ROOT)), batch=batch)
            for _ in range(delay):
                if STOP.exists():
                    break
                time.sleep(1)
        else:
            failures = 0
        # No early exit for zero levels, sparse independent repeats, or batch caps.
    status(state='user_stopped')


if __name__ == '__main__':
    main()
