"""Local slither.io-like world with the live constants (brain.py), crowds of bots that boost a lot,
cut-off and encircling attackers, and a gym env.

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
PROBE = np.array([-0.7, -0.35, 0, 0.35, 0.7])


class World:
    def __init__(self, seed=None, R=4500, n_bots=50, n_food=3500, hunters=0.3, delay=2, L0=None, crowd=0.3):
        self.rng = np.random.default_rng(seed)
        self.R, self.n_food, self.hunters, self.delay, self.L0, self.crowd = R, n_food, hunters, delay, L0, crowd
        self.t, self.kills, self.tree = 0.0, 0, None
        self.food = np.zeros((0, 3))
        self.add_food(n_food)
        self.snakes = []
        for _ in range(n_bots):
            self.snakes.append(self.spawn(bot=True))
        self.snakes.insert(0, self.spawn(bot=False))
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
        L = self.L0 if (not bot and self.L0) else float(10 * np.exp(rng.uniform(0, np.log(400 if bot else 200))))
        ang = rng.random() * 2 * np.pi
        x = y = None
        if not bot and self.snakes and rng.random() < self.crowd:      # start next to someone's body
            big = [s for s in self.snakes[1:] if s['alive'] and len(s['pts']) > 20]
            if big:
                s = big[rng.integers(len(big))]
                i = rng.integers(len(s['pts']) - 1)
                (ax, ay), (bx, by) = s['pts'][i], s['pts'][i + 1]
                side = rng.choice([-1, 1]) * rng.uniform(120, 250)
                d = np.hypot(bx - ax, by - ay) + 1e-9
                x, y = ax - (by - ay) / d * side, ay + (bx - ax) / d * side
                ang = np.arctan2(by - ay, bx - ax) + rng.choice([0, np.pi])
                if np.hypot(x, y) > self.R * 0.9 or self.clearance_at(x, y) < 80:
                    x = None
        if x is None:
            for _ in range(30):
                r = self.R * 0.8 * np.sqrt(rng.random())
                a = rng.random() * 2 * np.pi
                x, y = r * np.cos(a), r * np.sin(a)
                if not self.snakes or self.clearance_at(x, y) > 400:
                    break
        pts, px, py, back = [], x, y, ang + np.pi
        for _ in range(B.sct_of_score(L)):
            back += rng.normal(0, 0.15)
            if np.hypot(px, py) > self.R * 0.9:
                back = np.arctan2(-py, -px)
            px, py = px + np.cos(back) * B.SEG, py + np.sin(back) * B.SEG
            pts.append([px, py])
        role = None
        if bot and rng.random() < self.hunters:
            role = 'cutter' if rng.random() < 0.5 else 'encircler'
        s = dict(x=x, y=y, ang=ang, tgt=ang, L=L, boost=False, pts=pts[::-1], bot=bot, alive=True, role=role,
                 skill=rng.uniform(0.6, 1.0), boosty=rng.uniform(0.05, 0.35), t_next=0.0, t_boost=0.0, born=self.t)
        self.size(s)
        return s

    def size(self, s):
        s['sct'] = B.sct_of_score(s['L'])
        s['sc'] = B.sc_of_sct(s['sct'])

    def clearance_at(self, x, y):
        if self.tree is not None:
            return self.tree.query([x, y])[0]
        best = 1e9
        for s in self.snakes:
            if s['alive']:
                p = np.array(s['pts'] + [[s['x'], s['y']]])
                best = min(best, np.hypot(p[:, 0] - x, p[:, 1] - y).min())
        return best

    # ---- geometry cache ----
    def rebuild(self):
        segs, own, heads = [], [], []
        for i, s in enumerate(self.snakes):
            if not s['alive']:
                continue
            p = np.array(s['pts'] + [[s['x'], s['y']]])
            r = B.BODY_R * s['sc']
            segs.append(np.column_stack([p[:-1], p[1:], np.full(len(p) - 1, r)]))
            own.append(np.full(len(p) - 1, i))
            heads.append((s['x'], s['y'], r, i))
        self.segs = np.vstack(segs)
        self.seg_own = np.concatenate(own)
        n = np.maximum(1, np.ceil(np.hypot(*(self.segs[:, 2:4] - self.segs[:, :2]).T) / self.segs[:, 4])).astype(int)
        heads = np.array(heads)
        self.dense = np.vstack([B.dense(self.segs), heads[:, :3]])        # dense() leaves out each head endpoint
        self.dense_own = np.concatenate([np.repeat(self.seg_own, n), heads[:, 3].astype(int)])
        self.tree = cKDTree(self.dense[:, :2])

    # ---- bots ----
    def plan_bot(self, s):
        """Slow decisions (every 0.3-0.8 s): hunt the agent, chase food piles, wander; boost like real players."""
        rng = self.rng
        head = np.array([s['x'], s['y']])
        s['t_next'] = self.t + rng.uniform(0.3, 0.8)
        ag = self.snakes[0]
        dag = np.hypot(ag['x'] - s['x'], ag['y'] - s['y']) if ag['alive'] else 1e9
        boost = False
        if s['role'] == 'cutter' and dag < 900:
            lead = np.array([ag['x'], ag['y']]) + np.array([np.cos(ag['ang']), np.sin(ag['ang'])]) * min(dag, 600) * 0.8
            s['tgt'] = np.arctan2(*(lead - head)[::-1])
            boost = dag < 500 and rng.random() < 0.7
        elif s['role'] == 'encircler' and dag < 800 and s['L'] > ag['L'] * 1.2:
            phi = np.arctan2(s['y'] - ag['y'], s['x'] - ag['x']) + 0.9            # orbit ahead, tightening
            rad = max(100, 0.6 * dag)
            s['tgt'] = np.arctan2(ag['y'] + rad * np.sin(phi) - s['y'], ag['x'] + rad * np.cos(phi) - s['x'])
            boost = dag > 300 and rng.random() < 0.5
        else:
            d = np.hypot(*(self.food[:, :2] - head).T)
            m = d < 500
            if m.any():
                j = np.argmax(np.where(m, self.food[:, 2] / (d + 50), -1))
                s['tgt'] = np.arctan2(*(self.food[j, :2] - head)[::-1])
                boost = self.food[j, 2] >= 3 and rng.random() < 2 * s['boosty']      # race for a kill's leftovers
            else:
                s['tgt'] = s['ang'] + rng.normal(0, 0.6)
            boost = boost or rng.random() < s['boosty']
        if boost and s['L'] > 40:
            s['t_boost'] = self.t + rng.uniform(0.3, 1.0)
        if np.hypot(*head) > self.R - 600:
            s['tgt'] = np.arctan2(-s['y'], -s['x']) + rng.normal(0, 0.3)

    def think_all(self):
        bots = [(i, s) for i, s in enumerate(self.snakes) if s['alive'] and s['bot']]
        for _, s in bots:
            if self.t >= s['t_next']:
                self.plan_bot(s)
            s['boost'] = self.t < s['t_boost']
        # reflex avoidance for all bots in one batch (sloppy bots skip it sometimes and die, like real players)
        idx = np.array([i for i, _ in bots])
        st = np.array([[s['x'], s['y'], s['ang'], s['sc'], s['skill']] for _, s in bots])
        r = B.BODY_R * st[:, 3]
        look = (B.NSP1 + B.NSP2 * st[:, 3]) * B.SPF * 0.5 + 3 * r
        pa = st[:, 2:3] + PROBE
        dirs = np.stack([np.cos(pa), np.sin(pa)], -1)                                  # (nb,5,2)
        probes = np.concatenate([st[:, None, :2] + dirs * (look * f)[:, None, None] for f in (0.5, 1.0)], 1)
        d, j = self.tree.query(probes.reshape(-1, 2), k=12)
        j = np.minimum(j, len(self.dense) - 1)
        mine = self.dense_own[j] == np.repeat(idx, 10)[:, None]
        c = np.where(mine, 1e9, d - self.dense[j, 2]).min(1).reshape(len(idx), 10)
        c = np.minimum(c - r[:, None], self.R - np.hypot(*probes.reshape(-1, 2).T).reshape(len(idx), 10) - r[:, None])
        c = np.minimum(c[:, :5], c[:, 5:])
        react = (c[:, 1:4].min(1) < 20) & (self.rng.random(len(idx)) < st[:, 4])
        best = PROBE[np.argmax(c, 1)] * 2.2
        for k in np.flatnonzero(react):
            s = bots[k][1]
            s['tgt'] = s['ang'] + best[k]

    # ---- physics ----
    def step(self, cmd):
        self.queue.append(cmd)
        cmd = self.queue.pop(0)
        ag = self.snakes[0]
        if cmd is not None and ag['alive']:
            ag['tgt'], ag['boost'] = cmd
        self.think_all()
        for s in self.snakes:
            if not s['alive']:
                continue
            om = B.TURN * B.scang(s['sc'])
            s['ang'] += np.clip(B.wrap(s['tgt'] - s['ang']), -om * DT, om * DT)
            boosting = s['boost'] and s['L'] > 20
            sp = B.NSP3 if boosting else B.NSP1 + B.NSP2 * s['sc']
            s['sp'] = sp
            s['x'] += np.cos(s['ang']) * sp * B.SPF * DT
            s['y'] += np.sin(s['ang']) * sp * B.SPF * DT
            if boosting:                                # ponytail: boost mass loss rate is a guess, not measured live
                loss = (4 + s['L'] / 150) * DT
                s['L'] -= loss
                self.size(s)
                if self.rng.random() < 0.3:
                    self.add_food(1, at=np.array([s['pts'][0]]), v=np.array([loss / 0.3 * 0.6]))
            if np.hypot(s['x'] - s['pts'][-1][0], s['y'] - s['pts'][-1][1]) >= B.SEG:
                s['pts'].append([s['x'], s['y']])
            if len(s['pts']) > s['sct']:
                del s['pts'][:len(s['pts']) - s['sct']]
        self.rebuild()
        # collisions: the 24 nearest body circles cover the own neck plus anything we could touch
        ids = np.array([i for i, s in enumerate(self.snakes) if s['alive']])
        hs = np.array([[self.snakes[i]['x'], self.snakes[i]['y'], B.BODY_R * self.snakes[i]['sc']] for i in ids])
        d, j = self.tree.query(hs[:, :2], k=24)
        j = np.minimum(j, len(self.dense) - 1)
        d = np.where(self.dense_own[j] == ids[:, None], np.inf, d - self.dense[j, 2] - hs[:, 2:3])
        hit = d.min(1) < 0
        out = np.hypot(hs[:, 0], hs[:, 1]) + hs[:, 2] > self.R
        dead = [(int(i), 'wall', None) for i in ids[out]]
        dead += [(int(i), 'body', int(self.dense_own[j[k, np.argmin(d[k])]])) for k, i in enumerate(ids) if hit[k] and not out[k]]
        # eating: food near each living head
        gone = {i for i, _, _ in dead}
        live = np.array([i not in gone for i in ids])
        if live.any():
            ft = cKDTree(self.food[:, :2])
            near = ft.query_ball_point(hs[live, :2], hs[live, 2] + EAT)
            eaten = np.zeros(len(self.food), bool)
            for i, fl in zip(ids[live], near):
                fl = [f for f in fl if not eaten[f]]
                if fl:
                    eaten[fl] = True
                    self.snakes[i]['L'] += self.food[fl, 2].sum()
                    self.size(self.snakes[i])
            self.food = self.food[~eaten]
        for i, cause, killer in dead:
            s = self.snakes[i]
            s['alive'] = False
            s['cause'] = cause if killer is None else f"body:{self.snakes[killer]['role'] or 'other'}"
            if killer == 0:
                self.kills += 1
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
        heads = np.array([[o['x'], o['y'], o['ang'], o.get('sp', B.NSP1), o['sc']] for o in self.snakes[1:]
                          if o['alive'] and np.hypot(o['x'] - s['x'], o['y'] - s['y']) < VIEW]).reshape(-1, 5)
        f = self.food[np.hypot(*(self.food[:, :2] - h).T) < VIEW]
        return dict(x=s['x'], y=s['y'], ang=s['ang'], tgt=s['tgt'], sp=s.get('sp', B.NSP1), sc=s['sc'], L=s['L'],
                    boost=s['boost'], wall=(0.0, 0.0, float(self.R)), heads=heads, segs=self.segs[m], food=f)


# ---------------- evaluation ----------------
def make_ctrl(params=None, model=None, shield=False, brain=B):
    pl = brain.Planner(**(params or {}))
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
        a = int(net.predict(brain.features(S, E, pl.p), deterministic=True)[0])
        if shield:
            a = pl.shield(E, a, int(np.argmax(pl.score(E))))
        return pl.action_to_cmd(E, a), E
    ctrl.pl = pl
    return ctrl


def run(ctrl, minutes=5.0, seed=0, decide_every=2, **kw):
    """Play `minutes` of sim time; the agent respawns on death. Returns deaths (by cause), kills, growth, boost use."""
    w = World(seed=seed, **kw)
    lives, deaths, t_life, L_start, cmd, boost_steps = [], {}, 0.0, w.snakes[0]['L'], None, 0
    steps = int(minutes * 60 / DT)
    for k in range(steps):
        if k % decide_every == 0:
            cmd, _ = ctrl(w.state())
        w.step(cmd)
        t_life += DT
        ag = w.snakes[0]
        boost_steps += bool(ag['boost'])
        if not ag['alive']:
            deaths[ag['cause']] = deaths.get(ag['cause'], 0) + 1
            lives.append(dict(t=t_life, gain=ag['L'] - L_start))
            w.respawn_agent()
            t_life, L_start = 0.0, w.snakes[0]['L']
    lives.append(dict(t=t_life, gain=w.snakes[0]['L'] - L_start, censored=True))
    nd = sum(deaths.values())
    return dict(minutes=minutes, deaths=nd, causes=deaths, kills=w.kills, boost_frac=boost_steps / steps,
                growth_per_min=sum(l['gain'] for l in lives) / minutes)


# ---------------- gym env ----------------
class SlitherEnv(gym.Env):
    def __init__(self, params=None, shield=False, seed=None, max_steps=2700, world_kw=None):
        self.pl = B.Planner(**(params or {}))
        K = int(self.pl.p['K'])
        self.action_space = gym.spaces.Discrete(2 * K)
        self.observation_space = gym.spaces.Box(-1.5, 1.5, (B.n_features(K),), np.float32)
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
        kw = dict(n_bots=int(self.rng.integers(35, 70)), hunters=self.rng.uniform(0.2, 0.5),
                  delay=int(self.rng.integers(1, 4)), crowd=0.5)
        self.w = World(seed=int(self.rng.integers(1 << 30)), **{**kw, **self.world_kw})
        self.n = 0
        return self._obs(), {}

    def step(self, a):
        a = int(a)
        if self.shield:
            a = self.pl.shield(self.E, a, self.expert())
        cmd = self.pl.action_to_cmd(self.E, a)
        L0, k0 = self.w.snakes[0]['L'], self.w.kills
        for _ in range(2):
            self.w.step(cmd)
            if not self.w.snakes[0]['alive']:
                break
        self.n += 1
        ag = self.w.snakes[0]
        if not ag['alive']:
            return np.zeros(self.observation_space.shape, np.float32), -5.0, True, False, {'cause': ag['cause']}
        r = 0.01 + 0.005 * (ag['L'] - L0) + 0.5 * (self.w.kills - k0)
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
