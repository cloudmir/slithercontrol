# 생존 설계 검토용 로컬 소스 발췌

기준일: 2026-09-23. 실행 결과를 새로 만든 것이 아니라 현재 파일의 원문을 발췌한 증거 묶음.

## brain.py

SHA256: 2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9

원본 80–89행
```text
80: DEF = dict(K=24, H=1.6, dt=0.08, lat=0.10, buffer=4.0, margin=12.0, head_k=0.08,
81:            w_risk=1.0, w_clear=0.8, clear_scale=150.0, w_open=1.0, w_future=1.0, w_escape=2.0,
82:            open_range=1000.0, w_food=0.5, w_far=0.4, w_kill=0.5, w_turn=0.1, boost_cost=0.6,
83:            w_prev=0.1, eat_r=25.0)
84: 
85: 
86: class Planner:
87:     """Sampling MPC: K target headings x {cruise, boost}, rolled out with the real turn/speed limits.
88:     Hard collision time (actual contact with bodies, wall, enemies going straight) decides life or death;
89:     enemy turn/boost maneuvers, safety margin, open space, food and counter-kills rank the survivors."""
```

원본 99–118행
```text
99:     def evaluate(self, S):
100:         p, K = self.p, int(self.p['K'])
101:         sc, ang = S['sc'], S['ang']
102:         r_me = BODY_R * sc
103:         T = int(round(p['H'] / p['dt']))
104:         tau = p['lat'] + p['dt'] * np.arange(1, T + 1)           # time since the observation
105:         horizon = p['H'] + p['lat']
106:         tm = p['dt'] * (np.arange(T) + 0.5)
107:         v = np.where(self.bst, NSP3, NSP1 + NSP2 * sc) * SPF
108:         om = TURN * scang(sc)
109:         # latency: until our command lands the snake keeps turning toward the last commanded heading
110:         turn = np.clip(wrap(S.get('tgt', ang) - ang), -om * p['lat'], om * p['lat'])
111:         h0 = np.array([S['x'], S['y']]) + S['sp'] * SPF * p['lat'] * np.array([np.cos(ang + turn / 2), np.sin(ang + turn / 2)])
112:         ang = ang + turn
113:         th = ang + np.clip(self.rel[:, None], -om * tm, om * tm)                  # (C,T)
114:         step = v[:, None] * p['dt']
115:         P = np.stack([h0[0] + np.cumsum(step * np.cos(th), 1), h0[1] + np.cumsum(step * np.sin(th), 1)], -1)
116:         C = len(self.rel)
117:         flat = P.reshape(-1, 2)
118:         reach = v.max() * p['H'] + r_me + 100
```

원본 134–161행
```text
134:         # enemy heads: every maneuver within their turn/boost limits; the body they lay down counts too
135:         d_head = d_risk = np.full((C, T), 1e4)
136:         kill = np.zeros(C)
137:         hd = S['heads']
138:         if len(hd):
139:             dist = np.hypot(hd[:, 0] - h0[0], hd[:, 1] - h0[1])
140:             keep = np.argsort(dist)[:6]
141:             hd, dist = hd[keep], dist[keep]
142:             ok = dist < reach + NSP3 * SPF * horizon
143:             hd, dist = hd[ok], dist[ok]
144:         if len(hd):
145:             n, O = len(hd), len(EN_F)
146:             rj = BODY_R * hd[:, 4]
147:             omj = TURN * scang(hd[:, 4])
148:             vj = np.where(EN_B[None, :], NSP3, hd[:, 3:4]) * SPF                   # (n,O)
149:             t_all = np.concatenate([[0.0], tau])
150:             dts = np.diff(t_all)
151:             tmid = t_all[:-1] + dts / 2
152:             thj = hd[:, 2][:, None, None] + EN_F[None, :, None] * omj[:, None, None] * tmid
153:             stp = (vj[:, :, None] * dts)[..., None] * np.stack([np.cos(thj), np.sin(thj)], -1)
154:             Q = np.concatenate([np.broadcast_to(hd[:, None, None, :2], (n, O, 1, 2)),
155:                                 hd[:, None, None, :2] + np.cumsum(stp, 2)], 2)   # (n,O,T+1,2)
156:             rad = rj[:, None, None] + r_me + p['head_k'] * vj[:, :, None] * t_all
157:             D = cdist(flat, Q.reshape(-1, 2)).reshape(C, T, n, O, T + 1) - rad
158:             future = np.arange(T + 1)[None, :] > np.arange(T)[:, None] + 1          # not laid down yet at our step
159:             D = np.where(future[None, :, None, None, :], np.inf, D).min(-1)         # (C,T,n,O)
160:             d_head = D[..., LIKELY].min(-1)
161:             d_risk = D.min((-1, -2))
```

원본 173–188행
```text
173:         hard = np.minimum(np.minimum(d_body, d_wall), d_head) - p['buffer']      # small buffer for model error
174:         bad = hard < 0
175:         tc = np.where(bad.any(1), tau[np.argmax(bad, 1)], horizon + 1)
176:         badr = d_risk < 0
177:         tr = np.where(badr.any(1), tau[np.argmax(badr, 1)], horizon + 1)
178:         cmin_hard = hard.min(1)
179:         cmin_soft = np.minimum(hard, d_risk).min(1) - p['margin']
180: 
181:         # open space: straight rays from the head per heading, and from each rollout's end
182:         ua = ang + self.rel[:K]
183:         openk = rays(np.tile(h0, (K, 1)), np.stack([np.cos(ua), np.sin(ua)], -1), far, r_me, p['open_range'], S['wall']) / p['open_range']
184:         enc = float((openk < 0.5).mean())                                           # how enclosed we are
185:         opens = (2 * openk + np.roll(openk, 1) + np.roll(openk, -1)) / 4
186:         ue = th[:, -1][:, None] + np.array([-0.5, 0, 0.5])
187:         fut = rays(np.repeat(P[:, -1], 3, 0), np.stack([np.cos(ue), np.sin(ue)], -1).reshape(-1, 2),
188:                    far, r_me, p['open_range'], S['wall']).reshape(C, 3).mean(1) / p['open_range']
```

원본 208–240행
```text
208:     def score(self, E):
209:         p = self.p
210:         hz = E['horizon']
211:         sc = p['w_risk'] * np.minimum(E['tr'], hz) / hz
212:         sc += p['w_clear'] * np.clip(E['cmin_soft'], 0, p['clear_scale']) / p['clear_scale']
213:         sc += p['w_open'] * np.tile(E['open'], 2) + (p['w_future'] + p['w_escape'] * E['enc']) * E['fut']
214:         sc += p['w_far'] * np.tile(E['far'], 2) + p['w_food'] * E['food'] / (E['food'] + 10)
215:         sc += p['w_kill'] * np.minimum(E['kill'], 2)
216:         sc -= p['w_turn'] * np.abs(self.rel) / np.pi + p['boost_cost'] * (1 - E['enc']) * self.bst
217:         # a doomed candidate is ranked only by how late and how shallow the contact is
218:         return np.where(E['tc'] > hz, sc, -20 + 5 * E['tc'] / hz + 2 * np.tanh(E['cmin_hard'] / 50))
219: 
220:     def act(self, S, E=None):
221:         E = E or self.evaluate(S)
222:         sc = self.score(E)
223:         if self.prev is not None:
224:             sc += self.p['w_prev'] * np.cos(wrap(E['base'] + self.rel - self.prev))
225:         a = int(np.argmax(sc))
226:         self.prev = E['base'] + self.rel[a]
227:         return a, E
228: 
229:     def action_to_cmd(self, E, a):
230:         return E['base'] + self.rel[a], bool(self.bst[a])
231: 
232:     def shield(self, E, a, best, eps=0.3):
233:         """Keep the policy's action unless it collides sooner than the planner's choice, or - when both are
234:         collision-free - a likely enemy maneuver (turn/boost) reaches it clearly sooner (tr, eps seconds)."""
235:         hz = E['horizon']
236:         safe_both = E['tc'][a] > hz and E['tc'][best] > hz
237:         out = best if E['tc'][a] < E['tc'][best] or (safe_both and E['tr'][a] < E['tr'][best] - eps) else a
238:         self.n_dec += 1
239:         self.n_int += out != a
240:         return out
```

원본 243–255행
```text
243: def features(S, E, p=DEF):
244:     """Fixed-size observation for RL, built from the planner's evaluation (same in sim and live)."""
245:     hz = E['horizon']
246:     cx, cy, R = S['wall']
247:     dc = np.hypot(S['x'] - cx, S['y'] - cy)
248:     to_c = np.arctan2(cy - S['y'], cx - S['x']) - S['ang']
249:     return np.concatenate([
250:         np.minimum(E['tc'], hz) / hz, np.minimum(E['tr'], hz) / hz,
251:         np.clip(E['cmin_soft'] / p['clear_scale'], -1, 1), E['fut'], np.minimum(E['kill'], 2) / 2,
252:         E['food'] / (E['food'] + 10), E['open'], E['far'],
253:         [E['enc'], S['sc'] / 6, S['sp'] / NSP3, float(S['boost']), np.log1p(max(S['L'], 0)) / 10,
254:          min(R - dc, 3000) / 3000, np.cos(to_c), np.sin(to_c)],
255:     ]).astype(np.float32)
```

## sim.py

SHA256: 2aacde3546f0e6471cab2c78b7ecd21cbe23ee0ddddc3461ccf1b2842eabd2a3

원본 43–79행
```text
43:     def spawn(self, bot):
44:         rng = self.rng
45:         L = self.L0 if (not bot and self.L0) else float(10 * np.exp(rng.uniform(0, np.log(400 if bot else 200))))
46:         ang = rng.random() * 2 * np.pi
47:         x = y = None
48:         if not bot and self.snakes and rng.random() < self.crowd:      # start next to someone's body
49:             big = [s for s in self.snakes[1:] if s['alive'] and len(s['pts']) > 20]
50:             if big:
51:                 s = big[rng.integers(len(big))]
52:                 i = rng.integers(len(s['pts']) - 1)
53:                 (ax, ay), (bx, by) = s['pts'][i], s['pts'][i + 1]
54:                 side = rng.choice([-1, 1]) * rng.uniform(120, 250)
55:                 d = np.hypot(bx - ax, by - ay) + 1e-9
56:                 x, y = ax - (by - ay) / d * side, ay + (bx - ax) / d * side
57:                 ang = np.arctan2(by - ay, bx - ax) + rng.choice([0, np.pi])
58:                 if np.hypot(x, y) > self.R * 0.9 or self.clearance_at(x, y) < 80:
59:                     x = None
60:         if x is None:
61:             for _ in range(30):
62:                 r = self.R * 0.8 * np.sqrt(rng.random())
63:                 a = rng.random() * 2 * np.pi
64:                 x, y = r * np.cos(a), r * np.sin(a)
65:                 if not self.snakes or self.clearance_at(x, y) > 400:
66:                     break
67:         pts, px, py, back = [], x, y, ang + np.pi
68:         for _ in range(B.sct_of_score(L)):
69:             back += rng.normal(0, 0.15)
70:             if np.hypot(px, py) > self.R * 0.9:
71:                 back = np.arctan2(-py, -px)
72:             px, py = px + np.cos(back) * B.SEG, py + np.sin(back) * B.SEG
73:             pts.append([px, py])
74:         role = None
75:         if bot and rng.random() < self.hunters:
76:             role = 'cutter' if rng.random() < 0.5 else 'encircler'
77:         s = dict(x=x, y=y, ang=ang, tgt=ang, L=L, boost=False, pts=pts[::-1], bot=bot, alive=True, role=role,
78:                  skill=rng.uniform(0.6, 1.0), boosty=rng.uniform(0.05, 0.35), t_next=0.0, t_boost=0.0, born=self.t)
79:         self.size(s)
```

원본 185–212행
```text
185:             om = B.TURN * B.scang(s['sc'])
186:             s['ang'] += np.clip(B.wrap(s['tgt'] - s['ang']), -om * DT, om * DT)
187:             boosting = s['boost'] and s['L'] > 20
188:             sp = B.NSP3 if boosting else B.NSP1 + B.NSP2 * s['sc']
189:             s['sp'] = sp
190:             s['x'] += np.cos(s['ang']) * sp * B.SPF * DT
191:             s['y'] += np.sin(s['ang']) * sp * B.SPF * DT
192:             if boosting:                                # ponytail: boost mass loss rate is a guess, not measured live
193:                 loss = (4 + s['L'] / 150) * DT
194:                 s['L'] -= loss
195:                 self.size(s)
196:                 if self.rng.random() < 0.3:
197:                     self.add_food(1, at=np.array([s['pts'][0]]), v=np.array([loss / 0.3 * 0.6]))
198:             if np.hypot(s['x'] - s['pts'][-1][0], s['y'] - s['pts'][-1][1]) >= B.SEG:
199:                 s['pts'].append([s['x'], s['y']])
200:             if len(s['pts']) > s['sct']:
201:                 del s['pts'][:len(s['pts']) - s['sct']]
202:         self.rebuild()
203:         # collisions: the 24 nearest body circles cover the own neck plus anything we could touch
204:         ids = np.array([i for i, s in enumerate(self.snakes) if s['alive']])
205:         hs = np.array([[self.snakes[i]['x'], self.snakes[i]['y'], B.BODY_R * self.snakes[i]['sc']] for i in ids])
206:         d, j = self.tree.query(hs[:, :2], k=24)
207:         j = np.minimum(j, len(self.dense) - 1)
208:         d = np.where(self.dense_own[j] == ids[:, None], np.inf, d - self.dense[j, 2] - hs[:, 2:3])
209:         hit = d.min(1) < 0
210:         out = np.hypot(hs[:, 0], hs[:, 1]) + hs[:, 2] > self.R
211:         dead = [(int(i), 'wall', None) for i in ids[out]]
212:         dead += [(int(i), 'body', int(self.dense_own[j[k, np.argmin(d[k])]])) for k, i in enumerate(ids) if hit[k] and not out[k]]
```

원본 227–257행
```text
227:         for i, cause, killer in dead:
228:             s = self.snakes[i]
229:             s['alive'] = False
230:             s['cause'] = cause if killer is None else f"body:{self.snakes[killer]['role'] or 'other'}"
231:             if killer == 0:
232:                 self.kills += 1
233:             p = np.array(s['pts'])[::2]
234:             self.add_food(len(p), at=p + self.rng.normal(0, 8, p.shape), v=np.full(len(p), max(1.0, 0.7 * s['L'] / max(len(p), 1))))
235:             if s['bot']:
236:                 self.snakes[i] = self.spawn(bot=True)
237:         if len(self.food) < self.n_food:
238:             self.add_food(min(20, self.n_food - len(self.food)))
239:         if dead:
240:             self.rebuild()
241:         self.t += DT
242: 
243:     def respawn_agent(self):
244:         self.snakes[0] = self.spawn(bot=False)
245:         self.queue = [None] * self.delay
246:         self.rebuild()
247: 
248:     # ---- agent view, same format as live.py ----
249:     def state(self):
250:         s = self.snakes[0]
251:         h = np.array([s['x'], s['y']])
252:         m = (self.seg_own != 0) & ((np.hypot(*(self.segs[:, :2] - h).T) < VIEW) | (np.hypot(*(self.segs[:, 2:4] - h).T) < VIEW))
253:         heads = np.array([[o['x'], o['y'], o['ang'], o.get('sp', B.NSP1), o['sc']] for o in self.snakes[1:]
254:                           if o['alive'] and np.hypot(o['x'] - s['x'], o['y'] - s['y']) < VIEW]).reshape(-1, 5)
255:         f = self.food[np.hypot(*(self.food[:, :2] - h).T) < VIEW]
256:         return dict(x=s['x'], y=s['y'], ang=s['ang'], tgt=s['tgt'], sp=s.get('sp', B.NSP1), sc=s['sc'], L=s['L'],
257:                     boost=s['boost'], wall=(0.0, 0.0, float(self.R)), heads=heads, segs=self.segs[m], food=f)
```

원본 282–302행
```text
282: def run(ctrl, minutes=5.0, seed=0, decide_every=2, **kw):
283:     """Play `minutes` of sim time; the agent respawns on death. Returns deaths (by cause), kills, growth, boost use."""
284:     w = World(seed=seed, **kw)
285:     lives, deaths, t_life, L_start, cmd, boost_steps = [], {}, 0.0, w.snakes[0]['L'], None, 0
286:     steps = int(minutes * 60 / DT)
287:     for k in range(steps):
288:         if k % decide_every == 0:
289:             cmd, _ = ctrl(w.state())
290:         w.step(cmd)
291:         t_life += DT
292:         ag = w.snakes[0]
293:         boost_steps += bool(ag['boost'])
294:         if not ag['alive']:
295:             deaths[ag['cause']] = deaths.get(ag['cause'], 0) + 1
296:             lives.append(dict(t=t_life, gain=ag['L'] - L_start))
297:             w.respawn_agent()
298:             t_life, L_start = 0.0, w.snakes[0]['L']
299:     lives.append(dict(t=t_life, gain=w.snakes[0]['L'] - L_start, censored=True))
300:     nd = sum(deaths.values())
301:     return dict(minutes=minutes, deaths=nd, causes=deaths, kills=w.kills, boost_frac=boost_steps / steps,
302:                 growth_per_min=sum(l['gain'] for l in lives) / minutes)
```

원본 323–346행
```text
323:     def reset(self, seed=None, options=None):
324:         super().reset(seed=seed)
325:         kw = dict(n_bots=int(self.rng.integers(35, 70)), hunters=self.rng.uniform(0.2, 0.5),
326:                   delay=int(self.rng.integers(1, 4)), crowd=0.5)
327:         self.w = World(seed=int(self.rng.integers(1 << 30)), **{**kw, **self.world_kw})
328:         self.n = 0
329:         return self._obs(), {}
330: 
331:     def step(self, a):
332:         a = int(a)
333:         if self.shield:
334:             a = self.pl.shield(self.E, a, self.expert())
335:         cmd = self.pl.action_to_cmd(self.E, a)
336:         L0, k0 = self.w.snakes[0]['L'], self.w.kills
337:         for _ in range(2):
338:             self.w.step(cmd)
339:             if not self.w.snakes[0]['alive']:
340:                 break
341:         self.n += 1
342:         ag = self.w.snakes[0]
343:         if not ag['alive']:
344:             return np.zeros(self.observation_space.shape, np.float32), -5.0, True, False, {'cause': ag['cause']}
345:         r = 0.01 + 0.005 * (ag['L'] - L0) + 0.5 * (self.w.kills - k0)
346:         return self._obs(), r, False, self.n >= self.max_steps, {}
```

## compare.py

SHA256: 15a11303717b3463cfeb233abb0cbe563c87cd32c9805d1ae3e174023b01cd9b

원본 11–25행
```text
11: CTRLS = {
12:     'planner_v1': dict(params='runs/preview_params.json', brain='research/brain_v1.py'),   # before the v2 rewrite
13:     'planner_default': dict(),
14:     'planner_tuned': dict(params='runs/best_params.json'),
15:     # RL policies were trained on features from the first tuning's params: keep them pinned to that file
16:     'rl_bc': dict(params='runs/best_params_v2cem.json', model='runs/bc.zip'),
17:     'rl_ppo': dict(params='runs/best_params_v2cem.json', model='runs/ppo.zip'),
18:     'rl_ppo_shield': dict(params='runs/best_params_v2cem.json', model='runs/ppo.zip', shield=True),
19:     'fly': dict(params='runs/best_params.json', fly='runs/fly_params.json'),                 # connectome, wiring fixed
20:     'fly_shield': dict(params='runs/best_params.json', fly='runs/fly_params.json', shield=True),
21:     # ablations: is it the connectome or the shield?
22:     'straight_shield': dict(params='runs/best_params.json', straight=True),                 # no policy, shield only
23:     'fly_rewired_shield': dict(params='runs/best_params.json', fly='runs/fly_params.json', shield=True, rewire=True),
24:     'fly_shield_default': dict(fly='runs/fly_params.json', shield=True),                   # same planner params as planner_default
25: }
```

원본 29–55행
```text
29: def job(args):
30:     name, setting, seed, minutes = args
31:     import torch
32:     torch.set_num_threads(1)
33:     c = CTRLS[name]
34:     params = json.load(open(c['params'])) if c.get('params') else None
35:     brain = None
36:     if c.get('brain'):
37:         spec = importlib.util.spec_from_file_location('brain_alt', c['brain'])
38:         brain = importlib.util.module_from_spec(spec)
39:         spec.loader.exec_module(brain)
40:     if c.get('straight'):
41:         import brain as B
42:         pl = B.Planner(**(params or {}))
43: 
44:         def ctrl(S):
45:             E = pl.evaluate(S)
46:             return pl.action_to_cmd(E, pl.shield(E, 0, int(np.argmax(pl.score(E))))), E
47:         ctrl.pl = pl
48:     elif c.get('fly'):
49:         import fly
50:         ctrl = fly.make_fly(json.load(open(c['fly'])), c.get('shield', False), params, seed=seed, rewire=c.get('rewire', False))
51:     else:
52:         ctrl = make_ctrl(params, c.get('model'), c.get('shield', False), **({'brain': brain} if brain else {}))
53:     r = run(ctrl, minutes, seed=seed, **SETTINGS[setting])
54:     pl = getattr(ctrl, 'pl', None)
55:     r['intervention'] = pl.n_int / pl.n_dec if getattr(pl, 'n_dec', 0) else None     # share of shield overrides
```

원본 59–91행
```text
59: def main(a):
60:     names = [n for n, c in CTRLS.items() if all(os.path.exists(c[k]) for k in ('params', 'model', 'brain', 'fly') if k in c)]
61:     if a.only:
62:         names = [n for n in names if n in a.only.split(',')]
63:     jobs = [(n, s, a.seed0 + i, a.minutes) for n in names for s in SETTINGS for i in range(a.seeds)]
64:     t0 = time.time()
65:     with Pool(a.workers) as pool:
66:         res = pool.map(job, jobs)
67:     out = {}
68:     for n, s, r in res:
69:         o = out.setdefault(n, {}).setdefault(s, dict(minutes=0, deaths=0, kills=0, growth=[], boost=[], causes={}, per_seed_deaths=[], intervention=[]))
70:         o['minutes'] += r['minutes']
71:         o['deaths'] += r['deaths']
72:         o['kills'] += r['kills']
73:         o['per_seed_deaths'].append(r['deaths'])
74:         o['boost'].append(r['boost_frac'])
75:         if r.get('intervention') is not None:
76:             o['intervention'].append(r['intervention'])
77:         o['growth'].append(r['growth_per_min'])
78:         for k, v in r['causes'].items():
79:             o['causes'][k] = o['causes'].get(k, 0) + v
80:     for n in out:
81:         for s, o in out[n].items():
82:             o['deaths_per_10min'] = o['deaths'] / o['minutes'] * 10
83:             o['kills_per_10min'] = o['kills'] / o['minutes'] * 10
84:             o['growth_per_min'] = float(np.mean(o.pop('growth')))
85:             o['boost_frac'] = float(np.mean(o.pop('boost')))
86:             iv = o.pop('intervention')
87:             o['shield_intervention'] = float(np.mean(iv)) if iv else None
88:             print(f"{n:16s} {s:6s} deaths/10min {o['deaths_per_10min']:5.2f} ({o['deaths']} in {o['minutes']:.0f} min)  "
89:                   f"kills/10min {o['kills_per_10min']:5.2f}  growth/min {o['growth_per_min']:6.0f}  boost {o['boost_frac']:.0%}  causes {o['causes']}")
90:     json.dump(dict(at=time.strftime('%F %T'), minutes_per_seed=a.minutes, seeds=a.seeds, seed0=a.seed0, results=out),
91:               open(a.out, 'w'), indent=1)
```

## fly.py

SHA256: c3f2d1098145a0f474edafe1e90f4a23a8b6ad175d2269ba1ae3efdeac29e20e

원본 84–101행
```text
84:     def __init__(self, path=DATA + 'fly_circuit.npz', seed=0, rewire=False):
85:         from scipy import sparse
86:         d = np.load(path, allow_pickle=True)
87:         self.type, self.side, n = d['type'], d['side'], len(d['body'])
88:         self.soma = d['soma'] if 'soma' in d else np.full((n, 3), np.nan)        # for the viewer's brain map
89:         pre = d['pre']
90:         if rewire:                                     # control: same synapse counts, presynaptic partners shuffled
91:             pre = np.random.default_rng(1234).permutation(pre)
92:         w = d['count'] * W_SYN * d['sign'][pre]
93:         self.W = sparse.csr_matrix((w, (d['post'], pre)), shape=(n, n))
94:         self.n, self.rng = n, np.random.default_rng(seed)
95:         az = azimuth(d['rf_h1'], d['rf_h2'], self.side)
96:         self.food = np.flatnonzero(np.isin(self.type, FOOD) & np.isfinite(az))
97:         self.loom = np.flatnonzero(np.isin(self.type, LOOM) & np.isfinite(az))
98:         self.az_food, self.az_loom = np.radians(az[self.food]), np.radians(az[self.loom])
99:         grp = lambda types, s: np.flatnonzero(np.isin(self.type, types) & (self.side == s))
100:         self.out = {k: (grp(t, 'L'), grp(t, 'R')) for k, t in (('steer', STEER), ('escape', ESCAPE), ('gf', GF))}
101:         self.reset()
```

원본 128–169행
```text
128: FLY_SPACE = dict(rate_food=(0, 300), rate_loom=(0, 300), w_in=(2, 20), sigma=(0.15, 1.2), open_w=(0, 2),
129:                  k_steer=(0, 3), k_esc=(0, 3), thr_gf=(1, 20), thr_esc=(1, 40))
130: FLY_DEF = dict(rate_food=200, rate_loom=200, w_in=10.0, sigma=0.45, open_w=0.7, k_steer=1.2, k_esc=1.5, thr_gf=4, thr_esc=12)
131: 
132: 
133: def senses(E, pl, p):
134:     """Per-heading food attraction and threat (same evaluation the planner uses), sampled at each LC's azimuth."""
135:     K = int(pl.p['K'])
136:     rel = pl.rel[:K]
137:     threat = np.maximum(1 - np.minimum(E['tc'][:K], E['horizon']) / E['horizon'], p['open_w'] * (1 - E['open']))
138:     return rel, E['far'], np.clip(threat, 0, 1)
139: 
140: 
141: def make_fly(params=None, shield=False, planner_params=None, window_ms=66, seed=0, rewire=False):
142:     p = {**FLY_DEF, **(params or {})}
143:     pl = B.Planner(**(planner_params or {}))
144:     c = Circuit(seed=seed, rewire=rewire)
145:     K = int(pl.p['K'])
146: 
147:     def field(rel, prof, az):
148:         lim = np.radians(85)                          # RFs span ~5..85 deg; more lateral stimuli hit the outermost RFs
149:         d = B.wrap(np.clip(rel[None, :], -lim, lim) - az[:, None])
150:         return (prof[None, :] * np.exp(-d ** 2 / (2 * p['sigma'] ** 2))).max(1)
151: 
152:     def ctrl(S):
153:         E = pl.evaluate(S)
154:         rel, food, threat = senses(E, pl, p)
155:         rate = np.zeros(c.n)
156:         rate[c.food] = p['rate_food'] * field(rel, food, c.az_food)
157:         rate[c.loom] = p['rate_loom'] * field(rel, threat, c.az_loom)
158:         n = c.run(rate, p['w_in'], window_ms)
159:         (sl, sr), (el, er), (gl, gr) = [(n[a].sum(), n[b].sum()) for a, b in c.out.values()]
160:         turn = p['k_steer'] * (sr - sl) / (sr + sl + 3) - p['k_esc'] * (er - el) / (er + el + 3)
161:         scale = window_ms / 66                          # thresholds were tuned on 66 ms windows
162:         boost = gl + gr >= p['thr_gf'] * scale or el + er >= p['thr_esc'] * scale
163:         a = int(np.argmin(np.abs(B.wrap(pl.rel[:K] - np.clip(turn, -np.pi, np.pi))))) + K * boost
164:         if shield:
165:             a = pl.shield(E, a, int(np.argmax(pl.score(E))))
166:         ctrl.act = 0.6 * ctrl.act + n                  # smoothed spikes per neuron, for the viewer
167:         ctrl.last = dict(steer=(sl, sr), escape=(el, er), gf=(gl, gr), turn=float(turn), boost=bool(boost), rate=rate)
168:         return pl.action_to_cmd(E, a), E
169:     ctrl.pl, ctrl.circuit, ctrl.act, ctrl.last = pl, c, np.zeros(c.n), None
```

## train_rl.py

SHA256: b21785e5615c7604afa7667f4c107ba8187c9781bfffb8f12e339e444e467f9d

원본 13–17행
```text
13: GAMMA = 0.995
14: 
15: 
16: def make_env(params, shield, seed):
17:     return lambda: SlitherEnv(params=params, shield=shield, seed=seed)
```

원본 72–85행
```text
72:     vec = VecMonitor(SubprocVecEnv([make_env(params, a.shield, 1000 + i) for i in range(a.envs)]))
73:     model = PPO('MlpPolicy', vec, n_steps=512, batch_size=256, n_epochs=5, learning_rate=1e-4, gamma=GAMMA,
74:                 gae_lambda=0.95, clip_range=0.1, ent_coef=0.003, target_kl=0.02, device='cpu', verbose=0,
75:                 policy_kwargs=dict(net_arch=dict(pi=[256, 256], vf=[256, 256])))
76:     rng = np.random.default_rng(0)
77:     if a.bc_steps:
78:         t0 = time.time()
79:         data = [collect(vec, a.bc_steps // 3)]
80:         acc = clone(model, *data[0])
81:         say(f'BC round 0 (expert rollouts): {len(data[0][0])} samples, acc {acc:.3f}, {time.time() - t0:.0f}s')
82:         for rnd, beta in enumerate([0.5, 0.2], 1):                  # DAgger: visit the policy's own states
83:             data.append(collect(vec, a.bc_steps // 3, model, beta, rng))
84:             acc = clone(model, *[np.concatenate(x) for x in zip(*data)])
85:             say(f'BC round {rnd} (beta {beta}): {sum(len(d[0]) for d in data)} samples, acc {acc:.3f}, {time.time() - t0:.0f}s')
```

## deaths.py

SHA256: 5c4b4e30bbf13d901ab8a23afe2f40e26b66778e27021966f6e4cdc20b4f064a

원본 23–43행
```text
23: def job(args):
24:     name, seed, minutes = args
25:     ctrl, w = make(name, seed), sim.World(seed=seed, **HARD)
26:     hist, out, t_life, cmd = collections.deque(maxlen=10), [], 0.0, None
27:     for k in range(int(minutes * 60 / sim.DT)):
28:         if k % 2 == 0:
29:             S = w.state()
30:             cmd, E = ctrl(S)
31:             pl = ctrl.pl
32:             a = int(np.argmin(np.abs(B.wrap(pl.rel - (cmd[0] - E['base']))) + 10 * (pl.bst != cmd[1])))
33:             hist.append((k, bool((E['tc'] > E['horizon']).any()), bool(E['tc'][a] > E['horizon'])))
34:         w.step(cmd)
35:         t_life += sim.DT
36:         if not w.snakes[0]['alive']:
37:             active = [h for h in hist if h[0] <= k - w.delay] or list(hist)[:1]     # command executing at impact
38:             kind = ('spawn' if t_life < 3 else 'trapped' if not any(h[1] for h in list(hist)[-4:])
39:                     else 'mispredicted' if active[-1][2] else 'unsafe_choice')
40:             out.append(dict(t=round(t_life, 1), kind=kind, cause=w.snakes[0]['cause']))
41:             w.respawn_agent()
42:             t_life, cmd = 0.0, None
43:             hist.clear()
```

## tune.py

SHA256: ac3971492e9c237d04eca3fa5c6997f5f1c7ab9a1c9948bcf437baa7cbdfec1d

원본 14–17행
```text
14: SPACE = dict(buffer=(0, 20), margin=(0, 40), head_k=(0.0, 0.3), H=(1.0, 2.4), lat=(0.08, 0.25), w_risk=(0, 3), w_clear=(0, 3),
15:              clear_scale=(50, 300), w_open=(0, 3), w_future=(0, 3), w_escape=(0, 5), w_food=(0, 2), w_far=(0, 1.5),
16:              w_kill=(0, 4), w_turn=(0, 0.6), boost_cost=(0, 2))
17: HARD = dict(n_bots=55, hunters=0.45, delay=3, crowd=0.5)   # crowds, cutters and encirclers
```

원본 35–43행
```text
35: GROWTH_W = 0.03     # survival first, length second: 1000 growth/min is worth 0.3 deaths per 10 min; kills not rewarded
36: 
37: 
38: def fitness(rs):
39:     """deaths per 10 min dominate; growth (length gained per minute) is the secondary goal"""
40:     d = np.mean([r['deaths'] / r['minutes'] * 10 for r in rs])
41:     k = np.mean([r['kills'] / r['minutes'] * 10 for r in rs])
42:     g = np.mean([r['growth_per_min'] for r in rs])
43:     return -d + GROWTH_W * g / 100, d, g, k
```

원본 46–49행
```text
46: def main(a):
47:     rng = np.random.default_rng(a.seed)
48:     dev = [int(s) for s in rng.integers(1 << 30, size=a.seeds)]            # same seeds every generation
49:     val = [int(s) for s in rng.integers(1 << 30, size=a.val_seeds)]        # only for the final pick
```

원본 78–88행
```text
78:         cands = [('defaults', {k: B.DEF[k] for k in names}), ('cem_mean', decode(mu))] + [(f'top{j}', p) for j, p in enumerate(top)]
79:         res = pool.map(job, [(p, s, a.minutes) for _, p in cands for s in val])
80:         table = []
81:         for j, (name, p) in enumerate(cands):
82:             fv, d, g, k = fitness(res[j * a.val_seeds:(j + 1) * a.val_seeds])
83:             table.append(dict(name=name, fit=fv, deaths_per_10min=d, kills_per_10min=k, growth_per_min=g, params=p))
84:             print(f'validation {name:9s} deaths/10min {d:.2f} kills/10min {k:.2f} growth {g:.0f}', flush=True)
85:     json.dump(table, open('runs/tune_validation.json', 'w'), indent=1)
86:     best = max(table, key=lambda r: r['fit'])
87:     json.dump(best['params'], open('runs/best_params.json', 'w'), indent=1)
88:     print(f"wrote runs/best_params.json ({best['name']}, validation deaths/10min {best['deaths_per_10min']:.2f})")
```

## pipeline2.sh

SHA256: 89225f22d5deae8403185270ad253bc460e9ea39229d56dc67bc8c9104e56eef

원본 5–15행
```text
5: while pgrep -f '^/bin/sh \./ablation\.sh' >/dev/null || pgrep -f '^\.venv/bin/python compare\.py' >/dev/null; do sleep 30; done
6: mv runs/tune.jsonl runs/tune_v2.jsonl 2>/dev/null
7: python tune.py --gens 3 --pop 8 --minutes 3 --seeds 5 --val-seeds 8 --workers 4 > runs/tune_v3.log 2>&1 || { ./notify.sh "재튜닝 실패 (runs/tune_v3.log)"; exit 1; }
8: ./notify.sh "1/4 규칙 AI 재튜닝 완료 → 커넥톰 재튜닝 시작 ($(date +%H:%M))"
9: mv runs/fly_tune.jsonl runs/fly_tune_v1.jsonl 2>/dev/null
10: python fly.py tune --gens 3 --pop 8 --minutes 3 --seeds 3 --val-seeds 8 --workers 4 > runs/fly_tune_v2.log 2>&1 || { ./notify.sh "커넥톰 재튜닝 실패 (runs/fly_tune_v2.log)"; exit 1; }
11: ./notify.sh "2/4 커넥톰 재튜닝 완료 → 최종 비교 시작 ($(date +%H:%M))"
12: python compare.py --only planner_default,planner_tuned,rl_ppo_shield,fly_shield,fly_rewired_shield,straight_shield --minutes 3 --seeds 8 --seed0 40000 --workers 4 --out runs/final.json > runs/final.out 2>&1 || { ./notify.sh "최종 비교 실패 (runs/final.out)"; exit 1; }
13: ./notify.sh "3/4 최종 비교 완료 → 사망 원인 분류 시작 ($(date +%H:%M))"
14: python deaths.py --ctrl planner_default,planner_tuned,fly_shield --seeds 8 --minutes 3 > runs/deaths.out 2>&1
15: ./notify.sh "4/4 모두 완료 ($(date +%H:%M)) — Claude에게 결과 확인을 요청하세요"
```

## runs/tune_v3.log

SHA256: b9e20743c16dcc34fa1dc08fb9e153b43bd29f37a9ab6cc95da2047e3c220b30

원본 1–2행
```text
1: gen 0: mean-candidate deaths/10min 20.67 | best deaths/10min 7.33 kills/10min 18.67 | 1543s
2: gen 1: mean-candidate deaths/10min 14.00 | best deaths/10min 9.33 kills/10min 27.33 | 1465s
```

## runs/ablation.json

SHA256: a546f7ccb8b51ca73c5f16e5bf87f9747a792435ad89030f792d7cbd87b31519

원본 1–165행
```text
1: {
2:  "at": "2026-09-23 18:22:03",
3:  "minutes_per_seed": 3.0,
4:  "seeds": 8,
5:  "seed0": 20000,
6:  "results": {
7:   "straight_shield": {
8:    "normal": {
9:     "minutes": 24.0,
10:     "deaths": 7,
11:     "kills": 16,
12:     "causes": {
13:      "body:other": 5,
14:      "body:encircler": 1,
15:      "body:cutter": 1
16:     },
17:     "per_seed_deaths": [
18:      2,
19:      1,
20:      1,
21:      1,
22:      1,
23:      0,
24:      1,
25:      0
26:     ],
27:     "deaths_per_10min": 2.916666666666667,
28:     "kills_per_10min": 6.666666666666666,
29:     "growth_per_min": 490.9439696824561,
30:     "boost_frac": 0.10585648148148148,
31:     "shield_intervention": 0.14828703703703705
32:    },
33:    "hard": {
34:     "minutes": 24.0,
35:     "deaths": 8,
36:     "kills": 28,
37:     "causes": {
38:      "body:other": 3,
39:      "body:cutter": 4,
40:      "body:encircler": 1
41:     },
42:     "per_seed_deaths": [
43:      0,
44:      3,
45:      0,
46:      0,
47:      0,
48:      1,
49:      2,
50:      2
51:     ],
52:     "deaths_per_10min": 3.333333333333333,
53:     "kills_per_10min": 11.666666666666668,
54:     "growth_per_min": 938.6284281786438,
55:     "boost_frac": 0.09407407407407407,
56:     "shield_intervention": 0.15791666666666668
57:    }
58:   },
59:   "fly_rewired_shield": {
60:    "normal": {
61:     "minutes": 24.0,
62:     "deaths": 19,
63:     "kills": 37,
64:     "causes": {
65:      "body:other": 11,
66:      "body:cutter": 5,
67:      "body:encircler": 3
68:     },
69:     "per_seed_deaths": [
70:      5,
71:      3,
72:      1,
73:      1,
74:      2,
75:      1,
76:      2,
77:      4
78:     ],
79:     "deaths_per_10min": 7.916666666666666,
80:     "kills_per_10min": 15.416666666666668,
81:     "growth_per_min": 1479.2914476654923,
82:     "boost_frac": 0.7337499999999999,
83:     "shield_intervention": 0.43722222222222223
84:    },
85:    "hard": {
86:     "minutes": 24.0,
87:     "deaths": 29,
88:     "kills": 65,
89:     "causes": {
90:      "body:other": 19,
91:      "body:cutter": 4,
92:      "body:encircler": 6
93:     },
94:     "per_seed_deaths": [
95:      6,
96:      2,
97:      6,
98:      2,
99:      3,
100:      6,
101:      2,
102:      2
103:     ],
104:     "deaths_per_10min": 12.083333333333332,
105:     "kills_per_10min": 27.083333333333336,
106:     "growth_per_min": 2068.9502940634716,
107:     "boost_frac": 0.6651851851851851,
108:     "shield_intervention": 0.5150925925925927
109:    }
110:   },
111:   "fly_shield_default": {
112:    "normal": {
113:     "minutes": 24.0,
114:     "deaths": 22,
115:     "kills": 36,
116:     "causes": {
117:      "body:other": 14,
118:      "body:cutter": 2,
119:      "body:encircler": 6
120:     },
121:     "per_seed_deaths": [
122:      3,
123:      2,
124:      1,
125:      0,
126:      2,
127:      11,
128:      2,
129:      1
130:     ],
131:     "deaths_per_10min": 9.166666666666666,
132:     "kills_per_10min": 15.0,
133:     "growth_per_min": 1337.7730635947837,
134:     "boost_frac": 0.4077777777777778,
135:     "shield_intervention": 0.35638888888888887
136:    },
137:    "hard": {
138:     "minutes": 24.0,
139:     "deaths": 33,
140:     "kills": 58,
141:     "causes": {
142:      "body:cutter": 10,
143:      "body:encircler": 6,
144:      "wall": 1,
145:      "body:other": 16
146:     },
147:     "per_seed_deaths": [
148:      4,
149:      4,
150:      1,
151:      9,
152:      5,
153:      5,
154:      2,
155:      3
156:     ],
157:     "deaths_per_10min": 13.75,
158:     "kills_per_10min": 24.166666666666664,
159:     "growth_per_min": 2201.867507860491,
160:     "boost_frac": 0.4135416666666667,
161:     "shield_intervention": 0.4843518518518518
162:    }
163:   }
164:  }
165: }
```

## runs/verify.json

SHA256: 0ed1814222307637acb92dfb0680f656fb9cdc1456c89fc2a706d4b69b1c21ac

원본 1–98행
```text
1: {
2:  "at": "2026-09-23 17:08:48",
3:  "minutes_per_seed": 3.0,
4:  "seeds": 8,
5:  "results": {
6:   "planner_default": {
7:    "normal": {
8:     "minutes": 24.0,
9:     "deaths": 16,
10:     "kills": 53,
11:     "causes": {
12:      "body:other": 11,
13:      "body:encircler": 4,
14:      "body:cutter": 1
15:     },
16:     "deaths_per_10min": 6.666666666666666,
17:     "kills_per_10min": 22.083333333333336,
18:     "growth_per_min": 1271.7921468787795,
19:     "boost_frac": 0.12898148148148147
20:    },
21:    "hard": {
22:     "minutes": 24.0,
23:     "deaths": 30,
24:     "kills": 74,
25:     "causes": {
26:      "body:cutter": 9,
27:      "body:other": 15,
28:      "body:encircler": 6
29:     },
30:     "deaths_per_10min": 12.5,
31:     "kills_per_10min": 30.833333333333336,
32:     "growth_per_min": 1754.395755949092,
33:     "boost_frac": 0.11439814814814814
34:    }
35:   },
36:   "rl_ppo_shield": {
37:    "normal": {
38:     "minutes": 24.0,
39:     "deaths": 14,
40:     "kills": 72,
41:     "causes": {
42:      "body:cutter": 3,
43:      "body:other": 10,
44:      "body:encircler": 1
45:     },
46:     "deaths_per_10min": 5.833333333333334,
47:     "kills_per_10min": 30.0,
48:     "growth_per_min": 1983.7672522590601,
49:     "boost_frac": 0.3672222222222222
50:    },
51:    "hard": {
52:     "minutes": 24.0,
53:     "deaths": 20,
54:     "kills": 88,
55:     "causes": {
56:      "body:other": 10,
57:      "body:encircler": 5,
58:      "body:cutter": 5
59:     },
60:     "deaths_per_10min": 8.333333333333334,
61:     "kills_per_10min": 36.666666666666664,
62:     "growth_per_min": 2310.567730725181,
63:     "boost_frac": 0.33965277777777775
64:    }
65:   },
66:   "fly_shield": {
67:    "normal": {
68:     "minutes": 24.0,
69:     "deaths": 21,
70:     "kills": 47,
71:     "causes": {
72:      "body:other": 12,
73:      "body:encircler": 5,
74:      "body:cutter": 4
75:     },
76:     "deaths_per_10min": 8.75,
77:     "kills_per_10min": 19.583333333333332,
78:     "growth_per_min": 1383.2058700240905,
79:     "boost_frac": 0.5840972222222223
80:    },
81:    "hard": {
82:     "minutes": 24.0,
83:     "deaths": 27,
84:     "kills": 61,
85:     "causes": {
86:      "body:encircler": 3,
87:      "body:cutter": 9,
88:      "body:other": 14,
89:      "wall": 1
90:     },
91:     "deaths_per_10min": 11.25,
92:     "kills_per_10min": 25.416666666666664,
93:     "growth_per_min": 2189.2484257296514,
94:     "boost_frac": 0.6312037037037037
95:    }
96:   }
97:  }
98: }
```
