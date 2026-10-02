"""Versioned active-survival evaluation world (original sim.py remains untouched).
Local slither.io-like world with the live constants (brain.py), crowds of bots that boost a lot,
cut-off and encircling attackers, and a gym env.

  Use evaluate_active.py for evaluation or play.py --active for observation.
"""
import argparse, json, time
import numpy as np
from scipy.spatial import cKDTree
from scipy.spatial.distance import cdist
import brain as B
from geometry import point_segment, segment_distance, moving_distance

DT = 1 / 30
VIEW = 1600          # what the live client roughly knows about around the head
EAT = 25             # food suction radius beyond head radius
PROBE = np.array([-0.7, -0.35, 0, 0.35, 0.7])


class SpawnUnavailable(RuntimeError):
    def __init__(self,request):
        super().__init__('safe spawn unavailable; placement must wait without changing the requested snake')
        self.request=request


class World:
    def __init__(self, seed=None, R=4500, n_bots=50, n_food=3500, hunters=0.3, delay=2, L0=None, crowd=0.3):
        self.rng = np.random.default_rng(seed)
        self.R, self.n_food, self.hunters, self.delay, self.L0, self.crowd = R, n_food, hunters, delay, L0, crowd
        self.t, self.kills, self.tree = 0.0, 0, None
        self.target_bots=n_bots
        self.pending_spawns={}
        self.spawn_wait_s=0.
        self.min_live_bots=n_bots
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

    def _spawn_candidate(self, bot, length=None):
        rng = self.rng
        L = length if length is not None else (self.L0 if (not bot and self.L0) else float(10 * np.exp(rng.uniform(0, np.log(400 if bot else 200)))))
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

    def spawn(self, bot, request=None, attempts=200):
        # Reject materialization near living heads. No retry may silently accept overlap.
        existing = [s for s in self.snakes if s['alive']]
        if existing:
            heads = np.array([[s['x'], s['y']] for s in existing])
            radii = np.array([B.BODY_R*s['sc'] for s in existing])
            bodies = []
            for s in existing:
                p = np.array(s['pts'] + [[s['x'], s['y']]])
                bodies.append(np.column_stack([p[:-1],p[1:],np.full(len(p)-1,B.BODY_R*s['sc'])]))
            bodies = np.vstack(bodies)
        length=request['length'] if request else None
        traits=request['traits'] if request else None
        for _ in range(attempts):
            s = self._spawn_candidate(bot,length=length)
            if traits is None:
                length=s['L']; traits={k:s[k] for k in ('role','skill','boosty')}
            else:
                s.update(traits)
            if not existing:
                return s
            p = np.array(s['pts'] + [[s['x'], s['y']]])
            r = B.BODY_R*s['sc']
            # Bodies may cross bodies (not lethal), but never appear across a head or its reaction space.
            gap = point_segment(heads[:,None,:],p[None,:-1],p[None,1:])-r-radii[:,None]
            own = point_segment(p[-1], bodies[:,:2], bodies[:,2:4])-r-bodies[:,4]
            if gap.min() > 180 and own.min() > 100 and np.linalg.norm(p,axis=1).max()+r < self.R:
                return s
        raise SpawnUnavailable(dict(length=length,traits=traits))

    def _retry_spawns(self):
        changed=False
        for i,(at,request) in list(self.pending_spawns.items()):
            if self.t<at:continue
            try:
                self.snakes[i]=self.spawn(True,request=request,attempts=8)
                del self.pending_spawns[i];changed=True
            except SpawnUnavailable as ex:
                self.pending_spawns[i]=(self.t+.5,ex.request)
        if changed:self.rebuild()

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
        if not segs:
            self.segs=np.zeros((0,5));self.seg_own=np.zeros(0,int)
            self.dense=np.zeros((0,3));self.dense_own=np.zeros(0,int)
            self.tree=cKDTree(np.zeros((0,2)))
            return
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
        if not bots:
            return
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
        self._retry_spawns()
        self.queue.append(cmd)
        cmd = self.queue.pop(0)
        ag = self.snakes[0]
        if cmd is not None and ag['alive']:
            ag['tgt'], ag['boost'] = cmd
        self.think_all()
        old_heads = np.array([[s['x'],s['y']] for s in self.snakes])
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
        # Broad phase by capsule extent, not a fixed number of nearest centers.
        ids = np.array([i for i,s in enumerate(self.snakes) if s['alive']])
        hs = np.array([[self.snakes[i]['x'],self.snakes[i]['y'],B.BODY_R*self.snakes[i]['sc']] for i in ids])
        starts, ends = old_heads[ids], hs[:,:2]
        mid = (self.segs[:,:2]+self.segs[:,2:4])/2
        extent = np.linalg.norm(self.segs[:,2:4]-self.segs[:,:2],axis=1)/2+self.segs[:,4]
        tree = cKDTree(mid)
        q = tree.query_ball_point((starts+ends)/2, np.linalg.norm(ends-starts,axis=1)/2+hs[:,2]+extent.max())
        ii = np.repeat(np.arange(len(ids)),[len(x) for x in q])
        jj = np.concatenate(q).astype(int)
        keep = self.seg_own[jj] != ids[ii]
        ii,jj = ii[keep],jj[keep]
        dist = segment_distance(starts[ii],ends[ii],self.segs[jj,:2],self.segs[jj,2:4])-hs[ii,2]-self.segs[jj,4]
        killer = np.full(len(ids),-1,int)
        for k,j in zip(ii[dist<0],jj[dist<0]):
            killer[k] = self.seg_own[j]
        # Synchronized head/head motion; do not miss a crossing between tick endpoints.
        dh = moving_distance(starts[:,None],ends[:,None],starts[None,:],ends[None,:])-hs[:,None,2]-hs[None,:,2]
        np.fill_diagonal(dh,np.inf)
        for k in np.flatnonzero((dh<0).any(1)):
            killer[k] = ids[np.argmin(dh[k])]
        out = np.linalg.norm(ends,axis=1)+hs[:,2] > self.R
        dead = [(int(i),'wall',None) for i in ids[out]]
        dead += [(int(i),'body',int(killer[k])) for k,i in enumerate(ids) if killer[k]>=0 and not out[k]]
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
        roles = [s['role'] for s in self.snakes]
        for i, _, _ in dead:
            self.snakes[i]['alive'] = False
        for i, cause, killer in dead:
            s = self.snakes[i]
            s['alive'] = False
            s['cause'] = cause if killer is None else f"body:{roles[killer] or 'other'}"
            if killer == 0:
                self.kills += 1
            p = np.array(s['pts'])[::2]
            self.add_food(len(p), at=p + self.rng.normal(0, 8, p.shape), v=np.full(len(p), max(1.0, 0.7 * s['L'] / max(len(p), 1))))
            if s['bot']:
                try:
                    self.snakes[i] = self.spawn(bot=True)
                except SpawnUnavailable as ex:
                    self.pending_spawns[i]=(self.t+.5,ex.request)
        if len(self.food) < self.n_food:
            self.add_food(min(20, self.n_food - len(self.food)))
        if dead:
            self.rebuild()
        self.spawn_wait_s+=len(self.pending_spawns)*DT
        self.min_live_bots=min(self.min_live_bots,sum(s['alive'] and s['bot'] for s in self.snakes))
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
        return dict(t=self.t, pending=list(self.queue), delay=self.delay*DT, head_ids=np.array([i for i,o in enumerate(self.snakes[1:],1) if o['alive'] and np.hypot(o['x']-s['x'],o['y']-s['y'])<VIEW]), x=s['x'], y=s['y'], ang=s['ang'], tgt=s['tgt'], sp=s.get('sp', B.NSP1), sc=s['sc'], L=s['L'],
                    boost=s['boost'], wall=(0.0, 0.0, float(self.R)), heads=heads, segs=self.segs[m], food=f)

