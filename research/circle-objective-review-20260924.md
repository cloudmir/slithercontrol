# 원형·몸체 추종의 목표 충족 한계: 코드 원문

기준일 2026-09-24. 실행 실험 없이 현재 소스 발췌.


## staged.py 200–275행
SHA256: f4283060b792f66e746da412023b92f2906f4a2909962a59cefb7eb07b81c361

```python
200:         food = np.zeros(count)
201:         if len(s['food']):
202:             f = s['food']
203:             d = cdist(endpoint, f[:, :2])
204:             food = (f[:, 2]/(d+70)**2).sum(1)
205:             food /= max(food.max(), 1e-9)
206:         preferred = s['ang']
207:         mode = 'forage'
208:         if cfg.stage in ('circle','coil'):
209:             preferred, mode = self._coil(s, circles, cruise, omega)
210:         heading_cost = np.abs(B.wrap(angles-preferred))
211:         steering = np.abs(B.wrap(angles-s['ang']))
212:         eligible = safe.copy()
213:         if safe.any():
214:             reserve = min(cfg.reserve, float(clearance[safe].max()))
215:             eligible &= clearance >= reserve
216:             # Cruising is preferred unless boost is required for an escape.
217:             if (eligible & ~boosted).any():
218:                 eligible &= ~boosted
219:             best_activity = activity[eligible].min()
220:             eligible &= activity <= best_activity+.35
221:             if mode == 'coil':
222:                 utility = -heading_cost + .08*openness
223:             else:
224:                 utility = 1.8*food + .35*openness - .20*steering
225:             selected = int(np.argmax(np.where(eligible, utility, -np.inf)))
226:         else:
227:             # Report the emergency explicitly; no safe heading was found.
228:             actual_tc, depth = contact_times(s, path, times, cfg.stage != 'gap')
229:             selected = int(np.lexsort((-steering, clearance, depth, actual_tc))[-1])
230:             mode = 'escape'
231:         self.last = dict(stage=cfg.stage, mode=mode, safe_count=int(safe.sum()),
232:                          tc=float(tc[selected]), clearance=float(clearance[selected]),
233:                          boost=bool(boosted[selected]), food=float(food[selected]),
234:                         coil_center=None if self.center is None else self.center.tolist(),
235:                         loop_closed=self.loop_closed)
236:         return (float(B.wrap(angles[selected])), bool(boosted[selected])), dict(
237:             P=path, safe=safe, selected=selected, tc=tc, tr=tc,
238:             horizon=elapsed, status=self.last, static_clearance=static.min(1))
239: 
240:     def _coil(self, s, circles, speed, omega):
241:         """Form a bounded-curvature loop once own body can cover its perimeter.
242: 
243:         Circle Method inspired, independently implemented. The target radius is
244:         bounded by observed own-body length; no privileged enemy state is used.
245:         Leaving/rejoining an activity region remains an experimental extension.
246:         """
247:         p = np.array([s['x'], s['y']]); now = s.get('t', 0.)
248:         body = s.get('own_body', np.empty((0, 2)))
249:         length = np.linalg.norm(np.diff(body, axis=0), axis=1).sum()
250:         rad = max(self.config.coil_radius, speed/omega*1.35)
251:         nh = int((np.linalg.norm(s['heads'][:, :2]-p, axis=1)<1200).sum())
252:         if self.center is not None:
253:             if nh < 2:
254:                 if self.empty_since is None: self.empty_since = now
255:             else:
256:                 self.empty_since = None
257:             if s['L'] < self.config.coil_length*.7 or (self.empty_since is not None and now-self.empty_since>8):
258:                 self.center = None
259:                 self.loop_closed = False
260:         if self.center is None and s['L'] >= self.config.coil_length and length>2*np.pi*rad*1.25 and nh>=2:
261:             normal = np.array([-np.sin(s['ang']), np.cos(s['ang'])])
262:             centers = p+np.array([1, -1])[:, None]*normal*rad
263:             theta = np.arange(32)*np.pi/16
264:             rings = centers[:, None]+rad*np.column_stack((np.cos(theta), np.sin(theta)))
265:             room = s['wall'][2]-np.linalg.norm(rings-np.asarray(s['wall'][:2]), axis=2).max(1)
266:             if len(circles):
267:                 room = np.minimum(room, (cdist(rings.reshape(-1, 2), circles[:, :2])-circles[:, 2]).min(1).reshape(2, -1).min(1))
268:             i = int(room.argmax())
269:             if room[i] > B.BODY_R*s['sc']+50:
270:                 self.center, self.orient, self.radius = centers[i], (1 if i==0 else -1), rad
271:                 self.coil_since = now
272:                 self.empty_since = None
273:                 self.loop_closed = False
274:         if self.center is None:
275:             return s['ang'], 'forage'
```


## activity.py 24–43행
SHA256: b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87

```python
24:     rules = rules or ActivityRules()
25:     pos = np.asarray(positions if positions is not None else [[S['x'],S['y']]],float)
26:     heads = S['heads']
27:     count = (np.linalg.norm(pos[:,None,:]-heads[None,:,:2],axis=-1)<rules.radius).sum(1)
28:     # Deterministic area probes: body coverage, not number of body samples.
29:     theta = np.arange(24)*2*np.pi/24
30:     offsets = np.concatenate([np.column_stack([np.cos(theta),np.sin(theta)])*rules.radius*f for f in (.25,.55,.85)])
31:     probes = pos[:,None,:]+offsets[None,:,:]
32:     segs = S['segs']
33:     occupied = np.zeros(len(pos))
34:     if len(segs):
35:         # Bounded memory for candidate endpoints.
36:         for j in range(len(pos)):
37:             d = point_segment(probes[j,:,None,:],segs[None,:,:2],segs[None,:,2:4])-segs[None,:,4]
38:             occupied[j] = (d.min(1)<0).mean()
39:     center = np.asarray(S['wall'][:2])
40:     radial = np.linalg.norm(pos-center,axis=1)/S['wall'][2]
41:     active = (count>=rules.min_heads)&(count<=rules.max_heads)&(occupied<=rules.max_occupied)&(radial<rules.wall_fraction)
42:     return dict(heads=count,occupied=occupied,radial=radial,active=active)
43: 
```
