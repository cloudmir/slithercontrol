"""Local slither.io-like world with the live constants (brain.py), bot opponents incl. hunters, and a gym env.

  python sim.py --minutes 10 [--params runs/best_params.json] [--model runs/ppo.zip [--shield]]
"""
import argparse, json, time
import numpy as np
import gymnasium as gym
from scipy.spatial import cKDTree
from scipy.spatial.distance import cdist
import brain as B

DT = 1 / 30
VIEW = 1600          # what the live client roughly knows about around the head
EAT = 25             # food suction radius beyond head radius


class World:
    def __init__(self, seed=None, R=4000, n_bots=30, n_food=2500, hunters=0.25, delay=2, L0=None):
        self.rng = np.random.default_rng(seed)
        self.R, self.n_food, self.hunters, self.delay, self.L0 = R, n_food, hunters, delay, L0
        self.t = 0.0
        self.food = np.zeros((0, 3))
        self.add_food(n_food)
        self.snakes = []
        self.snakes.append(self.spawn(bot=False))
        for _ in range(n_bots):
            self.snakes.append(self.spawn(bot=True))
        self.queue = [None] * delay
        self.rebuild()

    # ---- setup ----
    def add_food(self, n, at=None, v=None):
        rng = self.rng
        if at is None:
            r = self.R * 0.97 * np.sqrt(rng.random(n))
            a = rng.random(n) * 2 * np.pi
            at = np.column_stack([r * np.cos(a), r * np.sin(a)])
            v = rng.choice([1, 1, 1, 2, 2, 3, 5], n).astype(float)
        self.food = np.vstack([self.food, np.column_stack([at, v])])

    def spawn(self, bot):
        rng = self.rng
        L = self.L0 if (not bot and self.L0) else float(10 * np.exp(rng.uniform(0, np.log(300 if bot else 200))))
        n = B.sct_of_score(L)
        for _ in range(30):
            r = self.R * 0.8 * np.sqrt(rng.random())
            a = rng.random() * 2 * np.pi
            x, y = r * np.cos(a), r * np.sin(a)
            if not self.snakes or self.clearance_at(x, y) > 400:
                break
        ang = rng.random() * 2 * np.pi
        pts, px, py, back = [], x, y, ang + np.pi
        for _ in range(n):
            back += rng.normal(0, 0.15)
            if np.hypot(px, py) > self.R * 0.9:
                back = np.arctan2(-py, -px)
            px, py = px + np.cos(back) * B.SEG, py + np.sin(back) * B.SEG
            pts.append([px, py])
        return dict(x=x, y=y, ang=ang, tgt=ang, L=L, boost=False, pts=pts[::-1], bot=bot, alive=True,
                    hunter=bot and rng.random() < self.hunters, skill=rng.uniform(0.6, 1.0),
                    t_next=0.0, born=self.t)

    def clearance_at(self, x, y):
        best = 1e9
        for s in self.snakes:
            if s['alive']:
                p = np.array(s['pts'] + [[s['x'], s['y']]])
                best = min(best, np.hypot(p[:, 0] - x, p[:, 1] - y).min())
        return best

    # ---- geometry cache ----
    def rebuild(self):
        segs, own = [], []
        for i, s in enumerate(self.snakes):
            if not s['alive']:
                continue
            p = np.array(s['pts'] + [[s['x'], s['y']]])
            r = B.BODY_R * B.sc_of_sct(len(s['pts']))
            segs.append(np.column_stack([p[:-1], p[1:], np.full(len(p) - 1, r)]))
            own.append(np.full(len(p) - 1, i))
        self.segs = np.vstack(segs)
        self.seg_own = np.concatenate(own)
        n = np.maximum(1, np.ceil(np.hypot(*(self.segs[:, 2:4] - self.segs[:, :2]).T) / self.segs[:, 4])).astype(int)
        alive = [(i, s) for i, s in enumerate(self.snakes) if s['alive']]
        heads = np.array([[s['x'], s['y'], B.BODY_R * B.sc_of_sct(len(s['pts']))] for _, s in alive])
        self.dense = np.vstack([B.dense(self.segs), heads])            # dense() leaves out each head endpoint
        self.dense_own = np.concatenate([np.repeat(self.seg_own, n), [i for i, _ in alive]])
        self.tree = cKDTree(self.dense[:, :2])

    def sc(self, s):
        return B.sc_of_sct(B.sct_of_score(s['L']))

    # ---- bots ----
    def think(self, i, s):
        rng, sc = self.rng, self.sc(s)
        r = B.BODY_R * sc
        v = (B.NSP1 + B.NSP2 * sc) * B.SPF
        head = np.array([s['x'], s['y']])
        if self.t >= s['t_next']:
            s['t_next'] = self.t + rng.uniform(0.3, 0.8)
            s['boost'] = False
            ag = self.snakes[0]
            dag = np.hypot(ag['x'] - s['x'], ag['y'] - s['y']) if ag['alive'] else 1e9
            if s['hunter'] and dag < 900:
                lead = np.array([ag['x'], ag['y']]) + np.array([np.cos(ag['ang']), np.sin(ag['ang'])]) * min(dag, 600) * 0.8
                s['tgt'] = np.arctan2(*(lead - head)[::-1])
                s['boost'] = dag < 450 and s['L'] > 30 and rng.random() < 0.7
            else:
                d = np.hypot(*(self.food[:, :2] - head).T)
                m = d < 500
                if m.any():
                    j = np.argmax(np.where(m, self.food[:, 2] / (d + 50), -1))
                    s['tgt'] = np.arctan2(*(self.food[j, :2] - head)[::-1])
                else:
                    s['tgt'] = s['ang'] + rng.normal(0, 0.6)
                s['boost'] = rng.random() < 0.03 and s['L'] > 50
            if np.hypot(*head) > self.R - 600:
                s['tgt'] = np.arctan2(-s['y'], -s['x']) + rng.normal(0, 0.3)
        # reflex avoidance (skipped sometimes: sloppy bots die and leave food like real players)
        if rng.random() > s['skill']:
            return
        rel = np.array([-0.7, -0.35, 0, 0.35, 0.7])
        look = v * 0.5 + 3 * r
        pa = s['ang'] + rel
        probes = np.concatenate([head + np.stack([np.cos(pa), np.sin(pa)], -1) * look * f for f in (0.5, 1.0)])
        d, j = self.tree.query(probes, k=16)
        c = np.where(self.dense_own[np.minimum(j, len(self.dense_own) - 1)] == i, 1e9, d - self.dense[np.minimum(j, len(self.dense) - 1), 2]).min(1)
        c = np.minimum(c - r, self.R - np.hypot(*probes.T) - r).reshape(2, 5).min(0)
        if c[1:4].min() < 20:
            s['tgt'] = s['ang'] + rel[np.argmax(c)] * 2.2

    # ---- physics ----
    def step(self, cmd):
        self.queue.append(cmd)
        cmd = self.queue.pop(0)
        ag = self.snakes[0]
        if cmd is not None and ag['alive']:
            ag['tgt'], ag['boost'] = cmd
        for i, s in enumerate(self.snakes):
            if s['alive'] and s['bot']:
                self.think(i, s)
        for s in self.snakes:
            if not s['alive']:
                continue
            sc = self.sc(s)
            om = B.TURN * B.scang(sc)
            s['ang'] += np.clip(B.wrap(s['tgt'] - s['ang']), -om * DT, om * DT)
            boosting = s['boost'] and s['L'] > 20
            sp = B.NSP3 if boosting else B.NSP1 + B.NSP2 * sc
            s['sp'] = sp
            s['x'] += np.cos(s['ang']) * sp * B.SPF * DT
            s['y'] += np.sin(s['ang']) * sp * B.SPF * DT
            if boosting:
                loss = (4 + s['L'] / 150) * DT
                s['L'] -= loss
                if self.rng.random() < 0.3:
                    self.add_food(1, at=np.array([s['pts'][0]]), v=np.array([loss / 0.3 * 0.6]))
            if np.hypot(s['x'] - s['pts'][-1][0], s['y'] - s['pts'][-1][1]) >= B.SEG:
                s['pts'].append([s['x'], s['y']])
            n = B.sct_of_score(s['L'])
            if len(s['pts']) > n:
                del s['pts'][:len(s['pts']) - n]
        self.rebuild()
        dead = []
        for i, s in enumerate(self.snakes):
            if not s['alive']:
                continue
            r = B.BODY_R * self.sc(s)
            if np.hypot(s['x'], s['y']) + r > self.R:
                dead.append((i, 'wall'))
                continue
            idx = self.tree.query_ball_point([s['x'], s['y']], r + B.BODY_R * 6)
            if idx:
                idx = np.array(idx)
                idx = idx[self.dense_own[idx] != i]
                if len(idx) and (np.hypot(self.dense[idx, 0] - s['x'], self.dense[idx, 1] - s['y']) - self.dense[idx, 2] - r).min() < 0:
                    dead.append((i, 'body'))
        heads = np.array([[s['x'], s['y'], B.BODY_R * self.sc(s) + EAT] for s in self.snakes])
        gone = {i for i, _ in dead}
        alive = np.array([s['alive'] and i not in gone for i, s in enumerate(self.snakes)])
        d = cdist(heads[:, :2], self.food[:, :2]) - heads[:, 2:3]
        d[~alive] = 1e9
        eaten = (d < 0).any(0)
        if eaten.any():
            who = np.argmin(d[:, eaten], 0)
            for k, v in zip(who, self.food[eaten, 2]):
                self.snakes[k]['L'] += v
            self.food = self.food[~eaten]
        for i, cause in dead:
            s = self.snakes[i]
            s['alive'] = False
            s['cause'] = cause
            p = np.array(s['pts'])[::2]
            self.add_food(len(p), at=p + self.rng.normal(0, 8, p.shape), v=np.full(len(p), max(1.0, 0.7 * s['L'] / max(len(p), 1))))
            if s['bot']:
                self.snakes[i] = self.spawn(bot=True)
        if len(self.food) < self.n_food:
            self.add_food(min(20, self.n_food - len(self.food)))
        if dead:
            self.rebuild()
        self.t += DT

    def respawn_agent(self):
        self.snakes[0] = self.spawn(bot=False)
        self.queue = [None] * self.delay
        self.rebuild()

    # ---- agent view, same format as live.py ----
    def state(self):
        s = self.snakes[0]
        h = np.array([s['x'], s['y']])
        m = (self.seg_own != 0) & ((np.hypot(*(self.segs[:, :2] - h).T) < VIEW) | (np.hypot(*(self.segs[:, 2:4] - h).T) < VIEW))
        heads = np.array([[o['x'], o['y'], o['ang'], o.get('sp', B.NSP1), self.sc(o)] for o in self.snakes[1:]
                          if o['alive'] and np.hypot(o['x'] - s['x'], o['y'] - s['y']) < VIEW]).reshape(-1, 5)
        f = self.food[np.hypot(*(self.food[:, :2] - h).T) < VIEW]
        return dict(x=s['x'], y=s['y'], ang=s['ang'], tgt=s['tgt'], sp=s.get('sp', B.NSP1), sc=self.sc(s), L=s['L'],
                    boost=s['boost'], wall=(0.0, 0.0, float(self.R)), heads=heads, segs=self.segs[m], food=f)


# ---------------- evaluation ----------------
def make_ctrl(params=None, model=None, shield=False):
    pl = B.Planner(**(params or {}))
    if model is None:
        def ctrl(S):
            a, E = pl.act(S)
            return pl.action_to_cmd(E, a), E
        ctrl.pl = pl
        return ctrl
    from stable_baselines3 import PPO
    net = PPO.load(model, device='cpu') if isinstance(model, str) else model

    def ctrl(S):
        E = pl.evaluate(S)
        a = int(net.predict(B.features(S, E, pl.p), deterministic=True)[0])
        if shield:
            a = pl.shield(E, a, int(np.argmax(pl.score(E))))
        return pl.action_to_cmd(E, a), E
    ctrl.pl = pl
    return ctrl


def run(ctrl, minutes=5.0, seed=0, decide_every=2, **kw):
    """Play `minutes` of sim time; the agent respawns on death. Returns deaths, lives, growth."""
    w = World(seed=seed, **kw)
    lives, deaths, t_life, L_start, cmd = [], {}, 0.0, w.snakes[0]['L'], None
    steps = int(minutes * 60 / DT)
    for k in range(steps):
        if k % decide_every == 0:
            cmd, _ = ctrl(w.state())
        w.step(cmd)
        t_life += DT
        ag = w.snakes[0]
        if not ag['alive']:
            deaths[ag['cause']] = deaths.get(ag['cause'], 0) + 1
            lives.append(dict(t=t_life, gain=ag['L'] - L_start))
            w.respawn_agent()
            t_life, L_start = 0.0, w.snakes[0]['L']
    lives.append(dict(t=t_life, gain=w.snakes[0]['L'] - L_start, censored=True))
    nd = sum(deaths.values())
    return dict(minutes=minutes, deaths=nd, causes=deaths, mtbd_s=minutes * 60 / max(nd, 1),
                growth_per_min=sum(l['gain'] for l in lives) / minutes)


# ---------------- gym env ----------------
class SlitherEnv(gym.Env):
    def __init__(self, params=None, shield=False, seed=None, max_steps=2700, world_kw=None):
        self.pl = B.Planner(**(params or {}))
        K = int(self.pl.p['K'])
        self.action_space = gym.spaces.Discrete(2 * K)
        self.observation_space = gym.spaces.Box(-1.5, 1.5, (8 * K + 7,), np.float32)
        self.shield, self.max_steps, self.world_kw = shield, max_steps, world_kw or {}
        self.rng = np.random.default_rng(seed)

    def _obs(self):
        self.S = self.w.state()
        self.E = self.pl.evaluate(self.S)
        return B.features(self.S, self.E, self.pl.p)

    def expert(self):
        return int(np.argmax(self.pl.score(self.E)))

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        kw = dict(n_bots=int(self.rng.integers(15, 40)), hunters=self.rng.uniform(0.1, 0.4),
                  delay=int(self.rng.integers(1, 4)))
        self.w = World(seed=int(self.rng.integers(1 << 30)), **{**kw, **self.world_kw})
        self.n = 0
        return self._obs(), {}

    def step(self, a):
        a = int(a)
        if self.shield:
            a = self.pl.shield(self.E, a, self.expert())
        cmd = self.pl.action_to_cmd(self.E, a)
        L0 = self.w.snakes[0]['L']
        for _ in range(2):
            self.w.step(cmd)
            if not self.w.snakes[0]['alive']:
                break
        self.n += 1
        ag = self.w.snakes[0]
        if not ag['alive']:
            return np.zeros(self.observation_space.shape, np.float32), -5.0, True, False, {'cause': ag['cause']}
        r = 0.01 + 0.005 * (ag['L'] - L0)
        return self._obs(), r, False, self.n >= self.max_steps, {}


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--minutes', type=float, default=5)
    ap.add_argument('--seeds', type=int, default=1)
    ap.add_argument('--params')
    ap.add_argument('--model')
    ap.add_argument('--shield', action='store_true')
    a = ap.parse_args()
    params = json.load(open(a.params)) if a.params else None
    t0 = time.time()
    for sd in range(a.seeds):
        r = run(make_ctrl(params, a.model, a.shield), a.minutes, seed=sd)
        print(json.dumps(r), f'wall {time.time() - t0:.0f}s', flush=True)
