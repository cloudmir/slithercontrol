# 활동 구역 생존 제어기 v5 — 구현과 검증 원자료

기준일 2026-09-23. 아래는 로컬 코드·시험 출력·결과 JSON의 원문 발췌다. 코드/결과는 실행된 v5 스냅샷으로 추적 가능하다.

## runs/active_final_v5_planned_summary.json

SHA256: 01d81a862f3f5ebacc2c92c912d9a245f3cdc84515a66fc627efda8c77e29b2b

원본 1–96행
```text
1: {
2:   "plan": {
3:     "purpose": "independent first-life validation of candidate v5; frozen activity rules and population guard",
4:     "normal_seeds": [
5:       56000,
6:       56001,
7:       56002,
8:       56003,
9:       56004,
10:       56005,
11:       56006,
12:       56007,
13:       56008,
14:       56009
15:     ],
16:     "baseline_seeds": [
17:       56000,
18:       56001,
19:       56002
20:     ],
21:     "hard_seeds": [
22:       56500,
23:       56501,
24:       56502
25:     ],
26:     "seconds": 600,
27:     "rules": "runs/active_rules_v1.json",
28:     "target": 0.9,
29:     "missing_invalid_or_discontinued_prevent_certification": true
30:   },
31:   "planned": 19,
32:   "completed": 19,
33:   "missing": [],
34:   "summary": {
35:     "active/hard": {
36:       "attempted": 3,
37:       "valid": 3,
38:       "invalid": 0,
39:       "survival_rate": 0.0,
40:       "activity_success_rate": 0.0,
41:       "success_ci95": [
42:         0.0,
43:         0.7075982261787133
44:       ],
45:       "mean_life_s": 186.12222222221422,
46:       "mean_gain": 7567.059923494169,
47:       "mean_off_fraction": 0.11632437344446456,
48:       "target_90_certified": false
49:     },
50:     "active/normal": {
51:       "attempted": 10,
52:       "valid": 10,
53:       "invalid": 0,
54:       "survival_rate": 0.0,
55:       "activity_success_rate": 0.0,
56:       "success_ci95": [
57:         0.0,
58:         0.3084971078187607
59:       ],
60:       "mean_life_s": 280.3866666667044,
61:       "mean_gain": 11667.39351612395,
62:       "mean_off_fraction": 0.06782794555312177,
63:       "target_90_certified": false
64:     },
65:     "planner/normal": {
66:       "attempted": 3,
67:       "valid": 3,
68:       "invalid": 0,
69:       "survival_rate": 0.0,
70:       "activity_success_rate": 0.0,
71:       "success_ci95": [
72:         0.0,
73:         0.7075982261787133
74:       ],
75:       "mean_life_s": 208.39999999999682,
76:       "mean_gain": 4971.45423211208,
77:       "mean_off_fraction": 0.17654434097635385,
78:       "target_90_certified": false
79:     },
80:     "straight/normal": {
81:       "attempted": 3,
82:       "valid": 3,
83:       "invalid": 0,
84:       "survival_rate": 0.0,
85:       "activity_success_rate": 0.0,
86:       "success_ci95": [
87:         0.0,
88:         0.7075982261787133
89:       ],
90:       "mean_life_s": 154.4888888888884,
91:       "mean_gain": 706.2055193850347,
92:       "mean_off_fraction": 0.5327984395766548,
93:       "target_90_certified": false
94:     }
95:   }
96: }
```

## runs/active_tests.txt

SHA256: 1f73348b0fd333597a5701bb70a59e61a5aa9595ed7824c41fb4ee2d5a539e43

원본 1–27행
```text
1: test_emergency_cannot_excuse_camping (test_active.ActivityTests.test_emergency_cannot_excuse_camping) ... ok
2: test_invalid_environment_prevents_certification (test_active.ActivityTests.test_invalid_environment_prevents_certification) ... ok
3: test_no_heads_and_outer_ring_are_not_active (test_active.ActivityTests.test_no_heads_and_outer_ring_are_not_active) ... ok
4: test_short_run_cannot_certify_ten_minutes (test_active.ActivityTests.test_short_run_cannot_certify_ten_minutes) ... ok
5: test_temporary_escape_then_return (test_active.ActivityTests.test_temporary_escape_then_return) ... ok
6: test_missing_opponents_invalidate_episode (test_active.CheckpointTests.test_missing_opponents_invalidate_episode) ... ok
7: test_resumed_world_and_policy_match_uninterrupted (test_active.CheckpointTests.test_resumed_world_and_policy_match_uninterrupted) ... ok
8: test_crossing_and_degenerate_segments (test_active.GeometryTests.test_crossing_and_degenerate_segments) ... ok
9: test_head_crossing_is_synchronized (test_active.GeometryTests.test_head_crossing_is_synchronized) ... ok
10: test_oncoming_boost_head_is_avoided (test_active.PolicyTests.test_oncoming_boost_head_is_avoided) ... ok
11: test_open_space_holds_heading (test_active.PolicyTests.test_open_space_holds_heading) ... ok
12: test_queue_is_part_of_forecast (test_active.PolicyTests.test_queue_is_part_of_forecast) ... ok
13: test_reachable_envelope_covers_switching_maneuvers (test_active.PolicyTests.test_reachable_envelope_covers_switching_maneuvers) ... ok
14: test_reset_clears_previous_life (test_active.PolicyTests.test_reset_clears_previous_life) ... ok
15: test_safe_food_side_is_selected (test_active.PolicyTests.test_safe_food_side_is_selected) ... ok
16: test_wall_food_cannot_override_safety (test_active.PolicyTests.test_wall_food_cannot_override_safety) ... ok
17: test_deferred_spawn_preserves_request_and_recovers (test_active.WorldTests.test_deferred_spawn_preserves_request_and_recovers) ... ok
18: test_empty_world_can_rebuild_and_respawn (test_active.WorldTests.test_empty_world_can_rebuild_and_respawn) ... ok
19: test_own_body_does_not_mask_foreign_collision (test_active.WorldTests.test_own_body_does_not_mask_foreign_collision) ... ok
20: test_pending_command_and_respawn_queue (test_active.WorldTests.test_pending_command_and_respawn_queue) ... ok
21: test_retry_preserves_requested_population_traits (test_active.WorldTests.test_retry_preserves_requested_population_traits) ... ok
22: test_spawn_never_silently_accepts_bad_candidate (test_active.WorldTests.test_spawn_never_silently_accepts_bad_candidate) ... ok
23: 
24: ----------------------------------------------------------------------
25: Ran 22 tests in 0.199s
26: 
27: OK
```

## runs/active_viewer_smoke.txt

SHA256: 832998189bd9f563453540d3f71de87f49738cc76e1844585b7f4bacbaeabca6

원본 1–3행
```text
1: pygame 2.6.1 (SDL 2.28.4, Python 3.12.3)
2: Hello from the pygame community. https://www.pygame.org/contribute.html
3: PASS: AI -> human -> respawn -> AI, 8 rendered frames
```

## runs/active_preservation_check.json

SHA256: 1dd641a4ed847a93a0e764a0310f4ac3508d988af616dd99d1c3b9890037828c

원본 1–22행
```text
1: {
2:   "brain.py": {
3:     "before": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9",
4:     "after": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9",
5:     "unchanged": true
6:   },
7:   "sim.py": {
8:     "before": "2aacde3546f0e6471cab2c78b7ecd21cbe23ee0ddddc3461ccf1b2842eabd2a3",
9:     "after": "2aacde3546f0e6471cab2c78b7ecd21cbe23ee0ddddc3461ccf1b2842eabd2a3",
10:     "unchanged": true
11:   },
12:   "compare.py": {
13:     "before": "15a11303717b3463cfeb233abb0cbe563c87cd32c9805d1ae3e174023b01cd9b",
14:     "after": "15a11303717b3463cfeb233abb0cbe563c87cd32c9805d1ae3e174023b01cd9b",
15:     "unchanged": true
16:   },
17:   "tune.py": {
18:     "before": "ac3971492e9c237d04eca3fa5c6997f5f1c7ab9a1c9948bcf437baa7cbdfec1d",
19:     "after": "ac3971492e9c237d04eca3fa5c6997f5f1c7ab9a1c9948bcf437baa7cbdfec1d",
20:     "unchanged": true
21:   }
22: }
```

## runs/active_rules_v1.json

SHA256: 14f1a7401f7f87df74a2f597c21e276c2d97ae308c826dcc1dce900182331849

원본 1–11행
```text
1: {
2:   "radius": 1200,
3:   "min_heads": 2,
4:   "max_heads": 10,
5:   "max_occupied": 0.4,
6:   "wall_fraction": 0.85,
7:   "initial_grace_s": 20,
8:   "max_absence_s": 30,
9:   "max_absence_fraction": 0.2,
10:   "emergency_window_s": 8
11: }
```

## active.py

SHA256: 5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757

원본 37–83행
```text
37: 
38:     def reset(self):
39:         self.previous=None
40:         self.plan=None
41:         self.last={}
42:         self.tracks={}
43: 
44:     def __call__(self,S):
45:         dt=self.dt; T=round(self.horizon/dt)
46:         # Stage 1 heading, then optional turn; short boost followed by cruise.
47:         rel=np.radians([-160,-110,-75,-50,-30,-15,0,15,30,50,75,110,160])
48:         first=np.repeat(rel,6)
49:         second=first+np.tile(np.radians([-50,0,50,-50,0,50]),len(rel))
50:         boost=np.tile([False]*3+[True]*3,len(rel)) & (S['L']>30)
51:         orbit=np.r_[np.zeros(len(first)),1.,-1.,1.,-1.,0.]
52:         first=np.r_[first,np.pi/2,-np.pi/2,np.pi/2,-np.pi/2,0.]
53:         second=np.r_[second,np.pi/2,-np.pi/2,np.pi/2,-np.pi/2,0.]
54:         boost=np.r_[boost,False,False,S['L']>30,S['L']>30,False]
55:         C=len(first)
56:         ang=np.full(C,S['ang']); xy=np.tile([S['x'],S['y']],(C,1)).astype(float)
57:         om=B.TURN*B.scang(S['sc']); cruise=(B.NSP1+B.NSP2*S['sc'])*B.SPF
58:         # Execute the actual pending queue in the prediction before new commands land.
59:         pending=S.get('pending')
60:         delay=float(S.get('delay',.10))
61:         path0=[]
62:         target=S.get('tgt',S['ang']); bst=bool(S.get('boost',False))
63:         if pending is None:
64:             pending=[None]*max(0,round(delay*30))
65:         for cmd in pending:
66:             if cmd is not None: target,bst=cmd
67:             ang+=np.clip(B.wrap(target-ang),-om/30,om/30)
68:             v=(B.NSP3*B.SPF if bst and S['L']>20 else cruise)
69:             xy+=np.column_stack([np.cos(ang),np.sin(ang)])*v/30
70:             path0.append(xy.copy())
71:         base=float(ang[0])
72:         now=float(S.get('t',0.))
73:         if self.plan is not None:
74:             phase=self.plan['first'] if now+delay<self.plan['switch'] else self.plan['second']
75:             first[-1]=B.wrap(phase-base);second[-1]=first[-1]
76:             orbit[-1]=self.plan['orbit']
77:             if orbit[-1]:first[-1]=orbit[-1]*np.pi/2
78:             boost[-1]=S['L']>30 and now+delay<self.plan['boost_end']
79:         P=[]; speeds=[]
80:         for k in range(T):
81:             target=base+np.where(k*dt<.8,first,second)
82:             if self.plan is not None:
83:                 target[-1]=self.plan['first'] if now+delay+k*dt<self.plan['switch'] else self.plan['second']
```

원본 170–237행
```text
170:         tr=np.where((robust<0).any(1),times[(robust<0).argmax(1)],times[-1]+1)
171:         # Hard gates: full nominal path and immediate enemy maneuver robustness.
172:         safe=(tc>times[-1]) & (tr>max(.8,delay+.6))
173:         # Longer maneuver safety is preferred by discrete tiers, never exchanged for food.
174:         if safe.any():
175:             tier=tr
176:             safe &= tier >= tier[safe].max()-1e-9
177:             # Retain geometric room before optimizing food. Never exchange a
178:             # narrow near-contact route for a larger food pile when room exists.
179:             clearance=hard.min(1)
180:             reserve=min(50.,float(clearance[safe].max()))
181:             safe &= clearance>=reserve-1e-9
182:         M=measure(S,rules=self.rules)
183:         # Endpoint head density for navigation; exact area coverage is measured at current state.
184:         end=P[:,-1]
185:         n=(np.linalg.norm(end[:,None,:]-S['heads'][None,:,:2],axis=2)<self.rules.radius).sum(1)
186:         radial=np.linalg.norm(end-S['wall'][:2],axis=1)/S['wall'][2]
187:         activity=np.maximum(self.rules.min_heads-n,0)+np.maximum(n-self.rules.max_heads,0)*.3
188:         activity+=np.maximum(radial-(self.rules.wall_fraction-.05),0)*20
189:         activity+=.03*np.abs(n-4)
190:         qualified=safe.copy()
191:         if safe.any():
192:             best_activity=activity[safe].min()
193:             # Only candidates that maintain or best recover the required activity region compete for food.
194:             qualified &= activity <= best_activity+.05
195:         F=S['food']; food=np.zeros(C); attraction=np.zeros(C); goal=None
196:         if len(F):
197:             dist=cdist(P.reshape(-1,2),F[:,:2]).reshape(C,T,-1)
198:             near=dist < r+25
199:             # Account for competitors' optimistic arrival to avoid chasing already-lost piles.
200:             ours=np.where(near,times[None,:,None],np.inf).min(1)
201:             theirs=np.full(len(F),np.inf)
202:             if len(S['heads']):
203:                 theirs=(cdist(S['heads'][:,:2],F[:,:2])/np.maximum(S['heads'][:,3,None]*B.SPF,1)).min(0)
204:             available=(ours<theirs[None,:]+.15)
205:             food=(near.any(1)*available*F[:,2]).sum(1)
206:             d0=np.linalg.norm(F[:,:2]-[S['x'],S['y']],axis=1)
207:             endd=cdist(end,F[:,:2])
208:             attraction=((d0[None,:]-endd)/(d0[None,:]+100)*F[:,2]/(1+d0[None,:]/400)).sum(1)
209:         cost=boost*(4+S['L']/150)*.5
210:         utility=food-cost+.10*attraction-.4*np.abs(first)
211:         # Among comparably safe alternatives, smooth small course changes.
212:         if self.previous is not None:
213:             utility-=.3*np.abs(B.wrap(base+first-self.previous))
214:         if qualified.any():
215:             a=int(np.argmax(np.where(qualified,utility,-np.inf)))
216:             # Complete an already safe maneuver unless a new meal is materially
217:             # better. Risk and activity eligibility have already been checked.
218:             if self.plan is not None and qualified[-1] and utility[-1]>=utility[a]-.2*abs(utility[a])-5:
219:                 a=C-1
220:             mode='collect' if M['active'][0] else 'return'
221:         else:
222:             # No safe candidate: lexicographic survival, then contact depth; never food.
223:             order=np.lexsort((hard.min(1),np.minimum(tr,tc),tc))
224:             a=int(order[-1]); mode='escape'
225:         command=(float(B.wrap(base+first[a])),bool(boost[a]))
226:         self.previous=command[0]
227:         if a!=C-1 or self.plan is None:
228:             self.plan=dict(first=base+first[a],second=base+second[a],switch=now+delay+.8,
229:                            boost_end=now+delay+(.5 if boost[a] else 0),orbit=float(orbit[a]))
230:         if len(F):
231:             values=F[:,2]/(1+np.linalg.norm(F[:,:2]-end[a],axis=1))
232:             goal=F[int(np.argmax(values)),:2].tolist()
233:         self.last=dict(mode=mode,safe_count=int(safe.sum()),heads=int(M['heads'][0]),
234:                        occupied=float(M['occupied'][0]),active=bool(M['active'][0]),
235:                        selected=a,tc=float(tc[a]),tr=float(tr[a]),food=float(food[a]),goal=goal)
236:         E=dict(P=P,tc=tc,tr=tr,safe=safe,selected=a,horizon=float(times[-1]),status=self.last)
237:         return command,E
```

## sim_active.py

SHA256: 62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1

원본 24–42행
```text
24: 
25: 
26: class World:
27:     def __init__(self, seed=None, R=4500, n_bots=50, n_food=3500, hunters=0.3, delay=2, L0=None, crowd=0.3):
28:         self.rng = np.random.default_rng(seed)
29:         self.R, self.n_food, self.hunters, self.delay, self.L0, self.crowd = R, n_food, hunters, delay, L0, crowd
30:         self.t, self.kills, self.tree = 0.0, 0, None
31:         self.target_bots=n_bots
32:         self.pending_spawns={}
33:         self.spawn_wait_s=0.
34:         self.min_live_bots=n_bots
35:         self.food = np.zeros((0, 3))
36:         self.add_food(n_food)
37:         self.snakes = []
38:         for _ in range(n_bots):
39:             self.snakes.append(self.spawn(bot=True))
40:         self.snakes.insert(0, self.spawn(bot=False))
41:         self.queue = [None] * delay
42:         self.rebuild()
```

원본 87–142행
```text
87:             role = 'cutter' if rng.random() < 0.5 else 'encircler'
88:         s = dict(x=x, y=y, ang=ang, tgt=ang, L=L, boost=False, pts=pts[::-1], bot=bot, alive=True, role=role,
89:                  skill=rng.uniform(0.6, 1.0), boosty=rng.uniform(0.05, 0.35), t_next=0.0, t_boost=0.0, born=self.t)
90:         self.size(s)
91:         return s
92: 
93:     def spawn(self, bot, request=None, attempts=200):
94:         # Reject materialization near living heads. No retry may silently accept overlap.
95:         existing = [s for s in self.snakes if s['alive']]
96:         if existing:
97:             heads = np.array([[s['x'], s['y']] for s in existing])
98:             radii = np.array([B.BODY_R*s['sc'] for s in existing])
99:             bodies = []
100:             for s in existing:
101:                 p = np.array(s['pts'] + [[s['x'], s['y']]])
102:                 bodies.append(np.column_stack([p[:-1],p[1:],np.full(len(p)-1,B.BODY_R*s['sc'])]))
103:             bodies = np.vstack(bodies)
104:         length=request['length'] if request else None
105:         traits=request['traits'] if request else None
106:         for _ in range(attempts):
107:             s = self._spawn_candidate(bot,length=length)
108:             if traits is None:
109:                 length=s['L']; traits={k:s[k] for k in ('role','skill','boosty')}
110:             else:
111:                 s.update(traits)
112:             if not existing:
113:                 return s
114:             p = np.array(s['pts'] + [[s['x'], s['y']]])
115:             r = B.BODY_R*s['sc']
116:             # Bodies may cross bodies (not lethal), but never appear across a head or its reaction space.
117:             gap = point_segment(heads[:,None,:],p[None,:-1],p[None,1:])-r-radii[:,None]
118:             own = point_segment(p[-1], bodies[:,:2], bodies[:,2:4])-r-bodies[:,4]
119:             if gap.min() > 180 and own.min() > 100 and np.linalg.norm(p,axis=1).max()+r < self.R:
120:                 return s
121:         raise SpawnUnavailable(dict(length=length,traits=traits))
122: 
123:     def _retry_spawns(self):
124:         changed=False
125:         for i,(at,request) in list(self.pending_spawns.items()):
126:             if self.t<at:continue
127:             try:
128:                 self.snakes[i]=self.spawn(True,request=request,attempts=8)
129:                 del self.pending_spawns[i];changed=True
130:             except SpawnUnavailable as ex:
131:                 self.pending_spawns[i]=(self.t+.5,ex.request)
132:         if changed:self.rebuild()
133: 
134:     def size(self, s):
135:         s['sct'] = B.sct_of_score(s['L'])
136:         s['sc'] = B.sc_of_sct(s['sct'])
137: 
138:     def clearance_at(self, x, y):
139:         if self.tree is not None:
140:             return self.tree.query([x, y])[0]
141:         best = 1e9
142:         for s in self.snakes:
```

원본 261–335행
```text
261:             if len(s['pts']) > s['sct']:
262:                 del s['pts'][:len(s['pts']) - s['sct']]
263:         self.rebuild()
264:         # Broad phase by capsule extent, not a fixed number of nearest centers.
265:         ids = np.array([i for i,s in enumerate(self.snakes) if s['alive']])
266:         hs = np.array([[self.snakes[i]['x'],self.snakes[i]['y'],B.BODY_R*self.snakes[i]['sc']] for i in ids])
267:         starts, ends = old_heads[ids], hs[:,:2]
268:         mid = (self.segs[:,:2]+self.segs[:,2:4])/2
269:         extent = np.linalg.norm(self.segs[:,2:4]-self.segs[:,:2],axis=1)/2+self.segs[:,4]
270:         tree = cKDTree(mid)
271:         q = tree.query_ball_point((starts+ends)/2, np.linalg.norm(ends-starts,axis=1)/2+hs[:,2]+extent.max())
272:         ii = np.repeat(np.arange(len(ids)),[len(x) for x in q])
273:         jj = np.concatenate(q).astype(int)
274:         keep = self.seg_own[jj] != ids[ii]
275:         ii,jj = ii[keep],jj[keep]
276:         dist = segment_distance(starts[ii],ends[ii],self.segs[jj,:2],self.segs[jj,2:4])-hs[ii,2]-self.segs[jj,4]
277:         killer = np.full(len(ids),-1,int)
278:         for k,j in zip(ii[dist<0],jj[dist<0]):
279:             killer[k] = self.seg_own[j]
280:         # Synchronized head/head motion; do not miss a crossing between tick endpoints.
281:         dh = moving_distance(starts[:,None],ends[:,None],starts[None,:],ends[None,:])-hs[:,None,2]-hs[None,:,2]
282:         np.fill_diagonal(dh,np.inf)
283:         for k in np.flatnonzero((dh<0).any(1)):
284:             killer[k] = ids[np.argmin(dh[k])]
285:         out = np.linalg.norm(ends,axis=1)+hs[:,2] > self.R
286:         dead = [(int(i),'wall',None) for i in ids[out]]
287:         dead += [(int(i),'body',int(killer[k])) for k,i in enumerate(ids) if killer[k]>=0 and not out[k]]
288:         # eating: food near each living head
289:         gone = {i for i, _, _ in dead}
290:         live = np.array([i not in gone for i in ids])
291:         if live.any():
292:             ft = cKDTree(self.food[:, :2])
293:             near = ft.query_ball_point(hs[live, :2], hs[live, 2] + EAT)
294:             eaten = np.zeros(len(self.food), bool)
295:             for i, fl in zip(ids[live], near):
296:                 fl = [f for f in fl if not eaten[f]]
297:                 if fl:
298:                     eaten[fl] = True
299:                     self.snakes[i]['L'] += self.food[fl, 2].sum()
300:                     self.size(self.snakes[i])
301:             self.food = self.food[~eaten]
302:         roles = [s['role'] for s in self.snakes]
303:         for i, _, _ in dead:
304:             self.snakes[i]['alive'] = False
305:         for i, cause, killer in dead:
306:             s = self.snakes[i]
307:             s['alive'] = False
308:             s['cause'] = cause if killer is None else f"body:{roles[killer] or 'other'}"
309:             if killer == 0:
310:                 self.kills += 1
311:             p = np.array(s['pts'])[::2]
312:             self.add_food(len(p), at=p + self.rng.normal(0, 8, p.shape), v=np.full(len(p), max(1.0, 0.7 * s['L'] / max(len(p), 1))))
313:             if s['bot']:
314:                 try:
315:                     self.snakes[i] = self.spawn(bot=True)
316:                 except SpawnUnavailable as ex:
317:                     self.pending_spawns[i]=(self.t+.5,ex.request)
318:         if len(self.food) < self.n_food:
319:             self.add_food(min(20, self.n_food - len(self.food)))
320:         if dead:
321:             self.rebuild()
322:         self.spawn_wait_s+=len(self.pending_spawns)*DT
323:         self.min_live_bots=min(self.min_live_bots,sum(s['alive'] and s['bot'] for s in self.snakes))
324:         self.t += DT
325: 
326:     def respawn_agent(self):
327:         self.snakes[0] = self.spawn(bot=False)
328:         self.queue = [None] * self.delay
329:         self.rebuild()
330: 
331:     # ---- agent view, same format as live.py ----
332:     def state(self):
333:         s = self.snakes[0]
334:         h = np.array([s['x'], s['y']])
335:         m = (self.seg_own != 0) & ((np.hypot(*(self.segs[:, :2] - h).T) < VIEW) | (np.hypot(*(self.segs[:, 2:4] - h).T) < VIEW))
```

## evaluate_chunk.py

SHA256: 4ae60a337c3cc2839d42fd773b4ba4f08b2a2e80e9fefe8b6ef4be5e80cd7f19

원본 57–78행
```text
57:         if self.k%300==0:
58:             self.samples.append(dict(t=w.t,L=ag['L'],heads=self.head_counts[-1],active=self.active))
59: 
60:     def result(self):
61:         ag=self.w.snakes[0];a=self.monitor.result()
62:         alive=bool(ag['alive']);full=self.k>=round(self.seconds/DT)
63:         population_fraction=1-self.w.spawn_wait_s/max(self.w.t*self.w.target_bots,1e-9)
64:         population_ok=population_fraction>=.99 and self.w.min_live_bots>=.9*self.w.target_bots
65:         return dict(controller=self.name,setting=self.setting,seed=self.seed,valid=bool(population_ok),
66:             population_fraction=population_fraction,min_live_bots=self.w.min_live_bots,
67:             population_ok=bool(population_ok),spawn_wait_s=self.w.spawn_wait_s,
68:             complete=self.complete,seconds=self.w.t,requested_seconds=self.seconds,
69:             alive=alive,**a,success=bool(population_ok and full and alive and a['activity_ok']),
70:             L_start=self.initial,L_end=ag['L'],gain=ag['L']-self.initial,
71:             boost_fraction=self.boost/max(self.w.t,1e-9),cause=ag.get('cause'),samples=self.samples,
72:             decision_ms_p50=float(np.percentile(self.timings,50)*1000) if self.timings else 0.,
73:             decision_ms_p95=float(np.percentile(self.timings,95)*1000) if self.timings else 0.,
74:             decision_over_66ms=float(np.mean(np.array(self.timings)>2*DT)) if self.timings else 0.,
75:             head_count_range=[min(self.head_counts),max(self.head_counts)] if self.head_counts else [],wall_seconds=self.wall)
76: 
77: 
78: def atomic_bytes(path,data):
```

## activity.py

SHA256: b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87

원본 9–24행
```text
9:     radius: float = 1200
10:     min_heads: int = 2
11:     max_heads: int = 10
12:     max_occupied: float = .40
13:     wall_fraction: float = .85
14:     initial_grace_s: float = 20
15:     max_absence_s: float = 30
16:     max_absence_fraction: float = .20
17:     emergency_window_s: float = 8
18: 
19:     def to_dict(self):
20:         return asdict(self)
21: 
22: 
23: def measure(S, positions=None, rules=None):
24:     rules = rules or ActivityRules()
```

원본 46–77행
```text
46:     """Record all off-zone time, with bounded grace for externally measured danger.
47: 
48:     The controller's declared mode cannot excuse inactivity. Evaluation supplies
49:     danger independently, and an emergency never erases cumulative absence.
50:     """
51:     def __init__(self,rules=None):
52:         self.rules=rules or ActivityRules()
53:         self.off=0.; self.streak=0.; self.longest=0.; self.unexcused=0.
54:         self.emergency_until=-1.; self.elapsed=0.
55: 
56:     def update(self,t,dt,active,danger=False):
57:         self.elapsed=t
58:         if danger:
59:             self.emergency_until=t+self.rules.emergency_window_s
60:         if t<=self.rules.initial_grace_s:
61:             return
62:         if active:
63:             self.streak=0.
64:         else:
65:             self.off+=dt; self.streak+=dt
66:             self.longest=max(self.longest,self.streak)
67:             if t>self.emergency_until:
68:                 self.unexcused+=dt
69: 
70:     def result(self):
71:         evaluated=max(0.,self.elapsed-self.rules.initial_grace_s)
72:         fraction=self.off/max(evaluated,1e-9)
73:         # Short reacquisition intervals allowed; long/evasive camping fails.
74:         valid=(evaluated>0 and fraction<=self.rules.max_absence_fraction and
75:                self.longest<=self.rules.max_absence_s and self.unexcused<=.05*evaluated)
76:         return dict(activity_ok=bool(valid),off_s=self.off,off_fraction=fraction,
77:                     max_off_streak_s=self.longest,unexcused_off_s=self.unexcused)
```
