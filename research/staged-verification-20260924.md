# 새 제어기 검증 출력 원문 (2026-09-24)

생성 시각: 2026-09-24T11:23:23.807197+09:00

독립 비교: 24/24판 완료, 환경 유효 24/24판.

| 방식 | 활동 준수 600초 완주 | 평균 생존(상한 600초) | 평균 길이 순증 |
|---|---:|---:|---:|
| 기존 active v5 (`active`) | 0/4 | 302.0초 | +13120 |
| 단순 방향 회피 (`gap`) | 0/4 | 101.8초 | +1533 |
| 이동 예측·비상 부스트 (`predict`) | 0/4 | 228.6초 | +9073 |
| 초기 고정 원형 주행 (`circle_v0`) | 1/4 | 350.4초 | +2801 |
| 후속 고정 원형 주행 (`circle`) | 0/4 | 312.3초 | +3402 |
| 자기 몸 경로 추종 (`coil`) | 3/4 | 464.3초 | +4363 |

## 시드별 원본 결과

```json

[
  {
    "controller": "active",
    "seed": 62000,
    "valid": true,
    "seconds": 271.73333333333386,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 9199.877020026126,
    "modes": {
      "collect": 3504,
      "escape": 189,
      "return": 383
    },
    "cause": "body:other"
  },
  {
    "controller": "active",
    "seed": 62001,
    "valid": true,
    "seconds": 527.8333333335106,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 29446.07543432669,
    "modes": {
      "return": 1074,
      "collect": 6482,
      "escape": 362
    },
    "cause": "body:other"
  },
  {
    "controller": "active",
    "seed": 62002,
    "valid": true,
    "seconds": 294.3000000000185,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 12455.144850865294,
    "modes": {
      "collect": 3635,
      "escape": 105,
      "return": 675
    },
    "cause": "body:other"
  },
  {
    "controller": "active",
    "seed": 62003,
    "valid": true,
    "seconds": 114.23333333332941,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 1376.962777495367,
    "modes": {
      "collect": 1583,
      "return": 50,
      "escape": 81
    },
    "cause": "body:other"
  },
  {
    "controller": "circle",
    "seed": 62000,
    "valid": true,
    "seconds": 437.23333333346557,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 4602.685371845865,
    "modes": {
      "forage": 1232,
      "escape": 162,
      "coil": 5165
    },
    "cause": "body:other"
  },
  {
    "controller": "circle",
    "seed": 62001,
    "valid": true,
    "seconds": 56.999999999999325,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 133.78359896184617,
    "modes": {
      "forage": 505,
      "escape": 350
    },
    "cause": "body:cutter"
  },
  {
    "controller": "circle",
    "seed": 62002,
    "valid": true,
    "seconds": 513.6333333335235,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 5870.466855312344,
    "modes": {
      "forage": 1304,
      "escape": 451,
      "coil": 5950
    },
    "cause": "body:other"
  },
  {
    "controller": "circle",
    "seed": 62003,
    "valid": true,
    "seconds": 241.3333333333222,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 2999.8032509654918,
    "modes": {
      "forage": 1567,
      "escape": 207,
      "coil": 1846
    },
    "cause": "body:other"
  },
  {
    "controller": "circle_v0",
    "seed": 62000,
    "valid": true,
    "seconds": 348.0000000000612,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 3247.936972769192,
    "modes": {
      "forage": 2469,
      "escape": 380,
      "coil": 2371
    },
    "cause": "body:cutter"
  },
  {
    "controller": "circle_v0",
    "seed": 62001,
    "valid": true,
    "seconds": 600.0000000001116,
    "alive": true,
    "activity_ok": true,
    "success": true,
    "gain": 4543.616604611816,
    "modes": {
      "forage": 2259,
      "escape": 112,
      "coil": 6629
    },
    "cause": null
  },
  {
    "controller": "circle_v0",
    "seed": 62002,
    "valid": true,
    "seconds": 382.6333333334221,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 3374.5302837455006,
    "modes": {
      "forage": 1900,
      "escape": 320,
      "coil": 3520
    },
    "cause": "body:other"
  },
  {
    "controller": "circle_v0",
    "seed": 62003,
    "valid": true,
    "seconds": 70.76666666666522,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 37.55639404249601,
    "modes": {
      "forage": 496,
      "escape": 566
    },
    "cause": "body:cutter"
  },
  {
    "controller": "coil",
    "seed": 62000,
    "valid": true,
    "seconds": 600.0000000001116,
    "alive": true,
    "activity_ok": true,
    "success": true,
    "gain": 5891.687762545803,
    "modes": {
      "forage": 1232,
      "escape": 460,
      "coil": 7308
    },
    "cause": null
  },
  {
    "controller": "coil",
    "seed": 62001,
    "valid": true,
    "seconds": 56.999999999999325,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 133.78359896184617,
    "modes": {
      "forage": 505,
      "escape": 350
    },
    "cause": "body:cutter"
  },
  {
    "controller": "coil",
    "seed": 62002,
    "valid": true,
    "seconds": 600.0000000001116,
    "alive": true,
    "activity_ok": true,
    "success": true,
    "gain": 7168.72621058902,
    "modes": {
      "forage": 1304,
      "escape": 424,
      "coil": 7272
    },
    "cause": null
  },
  {
    "controller": "coil",
    "seed": 62003,
    "valid": true,
    "seconds": 600.0000000001116,
    "alive": true,
    "activity_ok": true,
    "success": true,
    "gain": 4256.422082095626,
    "modes": {
      "forage": 1596,
      "escape": 301,
      "coil": 7103
    },
    "cause": null
  },
  {
    "controller": "gap",
    "seed": 62000,
    "valid": true,
    "seconds": 232.93333333332268,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 1756.0328323121023,
    "modes": {
      "forage": 2202,
      "escape": 1292
    },
    "cause": "body:cutter"
  },
  {
    "controller": "gap",
    "seed": 62001,
    "valid": true,
    "seconds": 17.266666666666683,
    "alive": false,
    "activity_ok": false,
    "success": false,
    "gain": 62.29133023766343,
    "modes": {
      "forage": 238,
      "escape": 21
    },
    "cause": "body:cutter"
  },
  {
    "controller": "gap",
    "seed": 62002,
    "valid": true,
    "seconds": 150.16666666666072,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 4302.794143883378,
    "modes": {
      "forage": 2250,
      "escape": 3
    },
    "cause": "body:other"
  },
  {
    "controller": "gap",
    "seed": 62003,
    "valid": true,
    "seconds": 6.899999999999985,
    "alive": false,
    "activity_ok": false,
    "success": false,
    "gain": 10.859017655321367,
    "modes": {
      "forage": 100,
      "escape": 4
    },
    "cause": "body:cutter"
  },
  {
    "controller": "predict",
    "seed": 62000,
    "valid": true,
    "seconds": 159.09999999999354,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 5295.714257162384,
    "modes": {
      "forage": 2201,
      "escape": 186
    },
    "cause": "body:other"
  },
  {
    "controller": "predict",
    "seed": 62001,
    "valid": true,
    "seconds": 56.999999999999325,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 133.78359896184617,
    "modes": {
      "forage": 505,
      "escape": 350
    },
    "cause": "body:cutter"
  },
  {
    "controller": "predict",
    "seed": 62002,
    "valid": true,
    "seconds": 354.20000000006615,
    "alive": false,
    "activity_ok": true,
    "success": false,
    "gain": 14126.376283053929,
    "modes": {
      "forage": 4737,
      "escape": 576
    },
    "cause": "body:other"
  },
  {
    "controller": "predict",
    "seed": 62003,
    "valid": true,
    "seconds": 343.9666666667247,
    "alive": false,
    "activity_ok": false,
    "success": false,
    "gain": 16737.773970664042,
    "modes": {
      "forage": 4757,
      "escape": 403
    },
    "cause": "body:other"
  }
]

```

## 원본 요약

```json

{
  "active/normal": {
    "attempted": 4,
    "valid": 4,
    "invalid": 0,
    "survival_rate": 0.0,
    "activity_success_rate": 0.0,
    "success_ci95": [
      0.0,
      0.6023646356164746
    ],
    "mean_life_s": 302.02500000004807,
    "mean_gain": 13119.51502067837,
    "mean_off_fraction": 0.10516972895520627,
    "target_90_certified": false
  },
  "coil/normal": {
    "attempted": 4,
    "valid": 4,
    "invalid": 0,
    "survival_rate": 0.75,
    "activity_success_rate": 0.75,
    "success_ci95": [
      0.19412044968324338,
      0.9936905367902902
    ],
    "mean_life_s": 464.25000000008356,
    "mean_gain": 4362.654913548074,
    "mean_off_fraction": 0.04369990680334808,
    "target_90_certified": false
  },
  "gap/normal": {
    "attempted": 4,
    "valid": 4,
    "invalid": 0,
    "survival_rate": 0.0,
    "activity_success_rate": 0.0,
    "success_ci95": [
      0.0,
      0.6023646356164746
    ],
    "mean_life_s": 101.81666666666251,
    "mean_gain": 1532.9943310221163,
    "mean_off_fraction": 0.009681785710563698,
    "target_90_certified": false
  },
  "predict/normal": {
    "attempted": 4,
    "valid": 4,
    "invalid": 0,
    "survival_rate": 0.0,
    "activity_success_rate": 0.0,
    "success_ci95": [
      0.0,
      0.6023646356164746
    ],
    "mean_life_s": 228.56666666669594,
    "mean_gain": 9073.41202746055,
    "mean_off_fraction": 0.07250901093703932,
    "target_90_certified": false
  },
  "circle/normal": {
    "attempted": 4,
    "valid": 4,
    "invalid": 0,
    "survival_rate": 0.0,
    "activity_success_rate": 0.0,
    "success_ci95": [
      0.0,
      0.6023646356164746
    ],
    "mean_life_s": 312.30000000007766,
    "mean_gain": 3401.6847692713864,
    "mean_off_fraction": 0.061343939107793136,
    "target_90_certified": false
  },
  "circle_v0/normal": {
    "attempted": 4,
    "valid": 4,
    "invalid": 0,
    "survival_rate": 0.25,
    "activity_success_rate": 0.25,
    "success_ci95": [
      0.006309463209709866,
      0.8058795503167565
    ],
    "mean_life_s": 350.35000000006505,
    "mean_gain": 2800.910063792251,
    "mean_off_fraction": 0.03224080648403009,
    "target_90_certified": false
  }
}

```

## 시험 출력

```

----------------------------------------------------------------------
Ran 35 tests in 0.443s

OK


```

## 복원 시험

```json

{
  "passed": true,
  "seed": 61333,
  "seconds": 22,
  "keys": [
    "seconds",
    "alive",
    "activity_ok",
    "off_s",
    "gain",
    "boost_fraction",
    "modes",
    "samples",
    "cause"
  ],
  "all_commands_equal": true,
  "command_count": 660,
  "final_physical_world_and_rng_equal": true,
  "world_keys": [
    "snakes",
    "food",
    "queue",
    "t",
    "kills",
    "pending_spawns",
    "spawn_wait_s",
    "min_live_bots",
    "rng"
  ]
}

```

## 계산 시간 시험

```json

{
  "controller": "coil",
  "observations": 68,
  "note": "Cold controller per recorded observation; excludes simulator, rendering and I/O. CPU time and wall time separated; not a real-time guarantee.",
  "cpu_p95_ms": 35.26579499999994,
  "wall_p95_ms": 33.20658364100381,
  "max_wall_ms": 43.789504998130724
}

```

## 기존 소스 보존

9개 기존 소스 SHA-256 일치.

```json

{
  "active.py": "5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757",
  "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9",
  "sim_active.py": "62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1",
  "sim.py": "2aacde3546f0e6471cab2c78b7ecd21cbe23ee0ddddc3461ccf1b2842eabd2a3",
  "play.py": "b64d928cc1ba58f8012445b8be9384dc0d9f624f259d301b013d951c6a25465c",
  "activity.py": "b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87",
  "evaluate_active.py": "63f8f4b8d3e64d453a99bc2e4841cc4d8b61aacf0055a38ba2ad06949db7d12a",
  "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68",
  "recovery_env.py": "8142532b50676e3869d4c31f7eae3da9db9cd33bd3ed8039c8fefdf89a2335d5"
}

```

## 현재 소스 해시

```json

{
  "staged.py": "f4283060b792f66e746da412023b92f2906f4a2909962a59cefb7eb07b81c361",
  "staged_reference.py": "671771c86d2f9f1a1867715c3c1f28b50b603ca9f779a442907c46f6bef57fe7",
  "evaluate_staged.py": "b6ccf4b4f8f5a23a67d5573a3949f1447f84d5163105bba46ff7855788d4c125",
  "play_staged.py": "08f89ef1b0d68349da1435225fb1712b9d76e39d15c5e66f37d4b466fd0ee83a",
  "test_staged.py": "ff219fbb02f73dbf97b5f52a14b94ff135e135ca3d6e443da5403ca4a252aa2b"
}

```

## 동결 실험 위치

staged_holdout_normal {"args": {"controllers": "gap,predict,coil,active", "settings": "normal", "seeds": 4, "seed0": 62000, "seconds": 600.0, "workers": 1, "out": "runs/staged_holdout_normal", "frozen": false}, "source_hashes": {"staged.py": "b4651f485d5f25840bcdfcba6b63f83b5b9aa6a354686e2ffa8cbc6cffe58bf1", "evaluate_staged.py": "4aa0b553b0198819a3df31c6760c6d8dab2b27dc93ba5b2d98d428c4cd0c2ad7", "sim_active.py": "62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1", "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9", "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68", "activity.py": "b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87", "evaluate_active.py": "63f8f4b8d3e64d453a99bc2e4841cc4d8b61aacf0055a38ba2ad06949db7d12a", "active.py": "5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757"}, "rules": {"radius": 1200, "min_heads": 2, "max_heads": 10, "max_occupied": 0.4, "wall_fraction": 0.85, "initial_grace_s": 20, "max_absence_s": 30, "max_absence_fraction": 0.2, "emergency_window_s": 8}}

staged_circle_holdout {"args": {"controllers": "circle", "settings": "normal", "seeds": 4, "seed0": 62000, "seconds": 600.0, "workers": 2, "out": "runs/staged_circle_holdout", "frozen": false}, "source_hashes": {"staged.py": "70a7774f6591dd4c78f62053d8e2d54b385fa614555843c4a908eeedf5db52df", "evaluate_staged.py": "3987f5f6f47eccf817ee77aa2744268c82c0db2a57f3d61d384ace48a6e62dd3", "sim_active.py": "62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1", "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9", "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68", "activity.py": "b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87", "evaluate_active.py": "63f8f4b8d3e64d453a99bc2e4841cc4d8b61aacf0055a38ba2ad06949db7d12a", "active.py": "5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757"}, "rules": {"radius": 1200, "min_heads": 2, "max_heads": 10, "max_occupied": 0.4, "wall_fraction": 0.85, "initial_grace_s": 20, "max_absence_s": 30, "max_absence_fraction": 0.2, "emergency_window_s": 8}}

staged_circle_v0_holdout {"args": {"controllers": "circle_v0", "settings": "normal", "seeds": 4, "seed0": 62000, "seconds": 600.0, "workers": 2, "out": "runs/staged_circle_v0_holdout", "frozen": false}, "source_hashes": {"staged.py": "f4283060b792f66e746da412023b92f2906f4a2909962a59cefb7eb07b81c361", "staged_reference.py": "671771c86d2f9f1a1867715c3c1f28b50b603ca9f779a442907c46f6bef57fe7", "evaluate_staged.py": "b6ccf4b4f8f5a23a67d5573a3949f1447f84d5163105bba46ff7855788d4c125", "sim_active.py": "62a0aa47615c911c9578edfef134a6606cf739d4159135d01d1132549d9515f1", "brain.py": "2b7b2697840d03e55a6158679ef423fc63c7ef474ba2b70f50d04b80cff1c6b9", "geometry.py": "2ac04f03341599edaa90c7a4273519baf497a2984df2dff5b47e7b7be1a9ee68", "activity.py": "b3c97f28cb31a8d444dd4dcb1825f0c73e429da8c3b0f9880d76d81c47658f87", "evaluate_active.py": "63f8f4b8d3e64d453a99bc2e4841cc4d8b61aacf0055a38ba2ad06949db7d12a", "active.py": "5486f2283a980177c830209b5485f190e5f843d53ec04733bba0b04159f56757"}, "rules": {"radius": 1200, "min_heads": 2, "max_heads": 10, "max_occupied": 0.4, "wall_fraction": 0.85, "initial_grace_s": 20, "max_absence_s": 30, "max_absence_fraction": 0.2, "emergency_window_s": 8}}

## 제어 구현 발췌

```python

22:     coil_radius: float = 210.

23: 

24: 

25: def make_controller(stage, config=None):

26:     """Keep the empirically promising first circle implementation reproducible."""

27:     if stage == 'circle_v0':

28:         from staged_reference import StagedController as Reference, Config as ReferenceConfig

29:         return Reference(config=ReferenceConfig(**dict(config or {},stage='coil')))

30:     return StagedController(config=Config(**dict(config or {},stage=stage)))

31: 

32: 

33: def observe(world):

34:     """Public observation plus own visible body; never expose enemy intentions/RNG."""

35:     s = world.state()

36:     a = world.snakes[0]

37:     s['own_body'] = np.asarray(a['pts'] + [[a['x'], a['y']]], float)

38:     return s

39: 

40: 

41: def obstacles(segs):

42:     """Cover entire body capsules by inflated samples, including endpoints."""

43:     if not len(segs):

44:         return np.empty((0, 3))

45:     a, b = segs[:, :2], segs[:, 2:4]

199:             activity += np.linalg.norm(endpoint-heads[:, :2].mean(0), axis=1)/1200

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

274:         if self.center is None:

275:             return s['ang'], 'forage'

276:         # After the first lap, follow the already occupied body corridor. Ignore

277:         # the neck and follow in the order it was laid, toward the current head.

278:         # This avoids treating a fixed geometric circle as body-following.

279:         if self.config.stage == 'coil' and now-self.coil_since > 2*np.pi*self.radius/speed and len(body)>10:

280:             segment_lengths = np.linalg.norm(np.diff(body, axis=0), axis=1)

281:             arc = np.r_[0., np.cumsum(segment_lengths)]

282:             candidates = np.flatnonzero(arc < arc[-1]-np.pi*self.radius)

283:             if len(candidates):

284:                 j = candidates[np.argmin(np.linalg.norm(body[candidates]-p, axis=1))]

285:                 if np.linalg.norm(body[j]-p) < B.BODY_R*s['sc']*2+80:

286:                     self.loop_closed = True

287:                     pursuit = min(arc[-1], arc[j]+max(90., speed*.45))

288:                     target = np.array([np.interp(pursuit,arc,body[:,d]) for d in (0,1)])

289:                     # Stay slightly inside the existing body, which separates

290:                     # the head from opponents approaching from outside.

291:                     inward = self.center-target

292:                     target += inward/max(np.linalg.norm(inward),1.)*B.BODY_R*s['sc']*.2

293:                     return np.arctan2(*(target-p)[::-1]), 'coil'

294:         self.loop_closed = False

295:         radial = p-self.center

296:         phase = np.arctan2(radial[1], radial[0])

297:         # Pursuit along the circle keeps a corridor occupied by our own body.

298:         target = self.center+self.radius*np.array([np.cos(phase+self.orient*.55), np.sin(phase+self.orient*.55)])

299:         return np.arctan2(*(target-p)[::-1]), 'coil'

```

## 범위

로컬 보통 난이도만 검증. 실사이트·어려움 난이도·90% 목표 미검증. 개발 결과와 미완료 판은 독립 비교에 포함하지 않음.