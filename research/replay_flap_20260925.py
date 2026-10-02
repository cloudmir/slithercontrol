"""Open-loop replay of recorded P18 states through two pilot versions: command flapping metrics.
Open loop: the recorded heading does not follow the replayed commands, so this compares decisions on the same
inputs, not closed-loop behaviour.  usage: python research/replay_flap_20260925.py OLD.py NEW.py runs/live_*/"""
import gzip, importlib.util, os, pickle, sys
import numpy as np
os.environ['PILOT_MODE'] = 'aggressive'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def metrics(m, box):
    c = m.Pilot(); cmds, boosts, ts, modes = [], [], [], []
    for r in box:
        s = {k: (np.asarray(v, float) if k in ('segs', 'sid', 'heads', 'hid', 'food', 'own') else v) for k, v in r['state'].items()}
        for k, w in (('segs', 5), ('food', 3), ('heads', 5), ('own', 2)): s[k] = s[k].reshape(-1, w)
        (a, b), _ = c(s); cmds.append(a); boosts.append(b); ts.append(s['t']); modes.append(c.last['mode'])
    cmds, boosts, ts = np.array(cmds), np.array(boosts), np.array(ts)
    mins = (ts[-1]-ts[0])/60
    toggles = int((np.diff(boosts.astype(int)) != 0).sum())
    # return to within 20 deg of the heading before a > 90 deg change, within 0.25 s
    back = 0
    for k in range(1, len(cmds)):
        if abs(m.wrap(cmds[k]-cmds[k-1])) > np.pi/2:
            later = (ts > ts[k]) & (ts <= ts[k]+.25)
            if (abs(m.wrap(cmds[later]-cmds[k-1])) < np.radians(20)).any(): back += 1
    return toggles/mins, back/mins, modes.count('emergency')/len(modes)


old, new = load(sys.argv[1], 'pold'), load(sys.argv[2], 'pnew')
print('game             boost toggles/min old->new   heading returns/min old->new   emergency share old->new')
tot = []
for d in sys.argv[3:]:
    try: box = pickle.load(gzip.open(d.rstrip('/')+'/blackbox.pkl.gz'))
    except Exception: continue
    a, b = metrics(old, box), metrics(new, box); tot.append((a, b))
    print(f'{d[-16:]}  {a[0]:6.1f} -> {b[0]:6.1f}          {a[1]:6.1f} -> {b[1]:6.1f}            {a[2]:.3f} -> {b[2]:.3f}')
A = np.array([t[0] for t in tot]); B = np.array([t[1] for t in tot])
print('median          ', ' -> '.join('%.1f' % v for v in (np.median(A[:, 0]), np.median(B[:, 0]))), '        ',
      ' -> '.join('%.1f' % v for v in (np.median(A[:, 1]), np.median(B[:, 1]))), '          ',
      ' -> '.join('%.3f' % v for v in (np.median(A[:, 2]), np.median(B[:, 2]))))
