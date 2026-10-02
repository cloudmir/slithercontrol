# 저녁 변경 7절 재검토 근거 — 2026-09-25

## 검토한 7절
## 7. Codex 저녁 검토 반영 (research/evening_changes_review_20260925.md) — pilot.py `9031e582…`

| 지적 | 수정 |
|---|---|
| #1 부스트 유지가 공격 직후 가속을 막음(재생 390개 개입 중 252개) | 부스트 유지는 평온한 채집 중에만 적용한다. 위험(공격자·포위 탈출·안전 후보 없음) 중에는 두 속도 경로를 그대로 비교한다. |
| #3 확인 대기가 비상·코일 진입 뒤에도 남음 | 비상·코일 틱, 0.1초(`PEND_GAP`) 넘는 공백, 모드 변경 때 대기를 버린다. |
| #4 `why`만으로 거절 이유를 알 수 없음 | trace에 `hold_by`(confirm/dwell 개입)와 `held_fail`(유지 경로가 걸린 필터: 여유, 물리 여유, 막다른 길, 반대 회전, 코일 방향)을 추가했다. `why`는 코일 경로와 다른 경로의 값이므로 코일 판정 원인으로 쓰지 않는다. `page_ms`는 페이지 안 읽기→입력 기록 시간일 뿐, 서버 적용 시각이 아니다. |
| #5 분석기 결함 | 사망 직전 재생 분석기: 관측이 없는 단계가 있으면 그 시점은 "관측 불완전"으로 뺀다(안전으로 세지 않음). 벽을 검사한다. 빠져나갈 길 없음은 0개일 때만, 1~4개는 따로 센다. 헛경보 분석기: 벽을 검사하고, 안전으로 받아들였는데 실제로 닿은 경우(놓침)도 센다. |
| #2 포위 탈출 중 역킬 가점 | 재생에서 결정 변화 0건. 포위 출구 개선 때 다룬다(미수정). |

회귀 검사(옛 코드 실패, 새 코드 통과 확인):
- 6l: 부스트를 끈 지 50ms 뒤 옆에서 공격 → 부스트를 켠다.
- 6m: 확인 대기 중 비상 틱이 끼면 대기가 사라진다.

다시 계산한 수치(P18 11판, 12판 요청 중 1판은 블랙박스 손상):
- 기동 유지 재생: 부스트 켬/끔 146.3 → 124.9/분, 방향 되돌림 16.4 → 12.9/분, 비상 비율 변화 없음. 부스트 유지를 위험 중에 쓰지 않으므로 앞서 적은 109.8보다 감소 폭이 작다.
- 사망 1.2초 전 분류(24판): 판단 정상 14, 관측 불완전 3, 안전 기동 0개 3, 1~4개 3, 플래너만 안전 0개 1. 앞선 "no_way 6 / miss 17" 수치는 이것으로 대체한다.
- 유지 경로 판정(사망 전 약 1초, 414틱): 거절 212(관측 구간 안) 중 실제로도 닿음 130·헛경보 59, 수락 116 중 실제로 닿은 놓침 18. 상대가 반응하지 않는 고정 미래이고 제어기 상태를 재생으로 다시 만든 추정이다.


## 관련 기록 마지막 절
 — pilot.py 9031e582…
- 부스트 유지(BOOST_DWELL)는 평온한 채집 중에만 적용한다(공격 직후 가속을 막던 문제). 확인 대기는 비상·코일·0.1초 공백·모드 변경 때 버린다. trace에 hold_by와 held_fail을 추가했다. 회귀 검사 6l·6m은 옛 코드 실패, 새 코드 통과.
- 분석기 수정: 관측 없는 시점은 안전으로 세지 않고, 벽도 검사하고, 놓침도 센다. 결과: 사망 1.2초 전 판단 정상 14 / 관측 불완전 3 / 안전 기동 0개 3 / 1~4개 3 / 플래너만 0개 1. 유지 경로 거절 212 중 헛경보 59, 수락 116 중 놓침 18. 이전 "no_way 6, miss 17, 19/24 유지 시 생존" 결론은 철회한다.
- 기동 유지 재생(11판): 부스트 켬/끔 146.3 → 124.9/분, 방향 되돌림 16.4 → 12.9/분.


## 직접 재검사 JSON
```json
{
  "attack_after_boost_off": {
    "mode": "evade",
    "boost": true,
    "cmd": -90.0,
    "clear": 19987.5,
    "hard": 19985.5,
    "n_safe": 37,
    "threat": 0.39,
    "enclosed": 0.0,
    "wrap": 0.0,
    "thr": 18.0,
    "eat": 0.0,
    "goal": 0.0,
    "thread": null,
    "L": 300,
    "sc": 1.0,
    "died_near": 0,
    "kills": 0,
    "big": 0.0,
    "curl": 0.0,
    "prof": "safe",
    "onward": 20276.3,
    "nh": 1,
    "why": [
      999.0,
      999.0,
      999.0,
      15.8,
      true
    ],
    "hold_by": null,
    "held_fail": [
      false,
      false,
      false,
      false,
      false
    ],
    "crowd": null,
    "gap": null,
    "esc": null
  },
  "pending_emergency": {
    "before": [
      1.3089969389957472,
      true,
      1,
      1.0,
      "feed"
    ],
    "after": null,
    "mode": "emergency"
  },
  "held_fail_counterexample": {
    "mode": "escape",
    "boost": false,
    "cmd": 0.0,
    "clear": 175.5,
    "hard": 145.5,
    "n_safe": 40,
    "threat": 0.0,
    "enclosed": 1.0,
    "wrap": 0.0,
    "thr": 18.0,
    "eat": 0.0,
    "goal": 0.0,
    "thread": [
      360.1,
      360.1,
      false
    ],
    "L": 300,
    "sc": 1.0,
    "died_near": 0,
    "kills": 0,
    "big": 0.52,
    "curl": 0.0,
    "prof": "safe",
    "onward": -14.5,
    "nh": 0,
    "why": [
      145.5,
      999.0,
      145.5,
      999.0,
      true
    ],
    "hold_by": "confirm",
    "held_fail": [
      false,
      false,
      true,
      false,
      false
    ],
    "crowd": null,
    "gap": [
      88.9,
      25.0,
      25.0,
      14.5,
      false
    ],
    "esc": null
  },
  "oracle_missing_is_unknown": true,
  "oracle_wall_gap": -11.0,
  "planner_ok_counterexample": {
    "game": "live_20260925_171431",
    "stored": {
      "game": "0260925_171431",
      "seconds": 104.3,
      "moments": [
        {
          "before": 2.0,
          "oracle_safe": 38,
          "best_gap": 126.6,
          "chosen_realized": 124.6,
          "planner_safe": 16,
          "planner_hard": 17.4,
          "mode": "evade"
        },
        {
          "before": 1.2,
          "oracle_safe": 32,
          "best_gap": 109.5,
          "chosen_realized": -23.9,
          "planner_safe": 7,
          "planner_hard": 50.1,
          "mode": "evade"
        }
      ],
      "category": "planner_ok"
    },
    "recomputed_chosen_gap": -23.935331825143763
  },
  "false_alarm_missing_middle": {
    "partial": {
      "gap": 705.1067811865476,
      "seen": [
        0,
        2
      ]
    },
    "complete": {
      "gap": -2.0,
      "seen": [
        0,
        1,
        2
      ]
    },
    "note": "Synthetic example: skipped middle can hide contact; no claim that all 18 misses or 59 false alarms are wrong."
  },
  "hashes": {
    "pilot.py": "9031e58262488ea8f30edfc875d2792cac6ac9df98543e6fd4d1a7099b3517be",
    "run_live.py": "7f3f470b1771b3d7a109e0074e3ce80e9d9733295f858e11200e50e1fbe18d0a",
    "CHANGES_20260925_evening.md": "295e71d3c38e908400c445ba610114dc1c5f07b739259590b194dab7bc3f9b29",
    "research/oracle_deaths_20260925.py": "d3af523d5b23bb5103053186735e71fb64f3ad3f5d1908a5e85efa6204d13c4d",
    "research/false_alarm_20260925.py": "0aa1076cf9c9bba039fba57b49fa66ceffe04978669ecd3ba525e9a61a16f9d9",
    "records/claim-pilot-live-20260925.md": "546a3db5392f22148af38ac989ada9137f2ce0b767dac6b875f89577ffbff9a8"
  },
  "record_bytes": 33094
}
```

## 자체 검사
종료 코드 0
```text
ok pilot; crowded tick p50 26.3 ms p95 32.1 ms
```

## pilot.py

```python
483:             thread_w = g if thread_w is None or g['w'] < thread_w['w'] else thread_w
484:         safe = (clear >= thr) & (hard >= np.minimum(thr, HARD_PHYS))
485:         if (safe & (onward >= LONG_SAFE)).any():      # dead ends (no way on within 3 s) are not safe while others exist
486:             safe &= onward >= LONG_SAFE
487:         end = pos[:, -1]
```

```python
602:         # Side preference inside what is left (Codex review 2: applied before the coil filter it could empty safe).
603:         commit = self.coil_dir if ring else self.turn_sign if self.turn_sign != 0 else (self.side if s['t'] < self.side_until else 0.)
604:         against = (commit != 0) & (np.sign(turn) == -commit) & (abs(turn) > np.radians(30))
605:         if (safe & ~against).any():
606:             safe = safe & ~against
```

```python
618:         hold_by = None                          # 'confirm' / 'dwell' when those rules changed the choice (trace)
619:         # A pending plan is only confirmed by consecutive ticks of the plain safe branch (Codex evening review #3).
620:         if self.pend is not None and (s['t']-self.pend[3] > PEND_GAP or not safe.any() or (ring and coil_hard > HARD)):
621:             self.pend = None
622:         if ring and coil_hard > HARD:
623:             # Coiling: full-rate turn every tick (no boost) -> the same circle lap after lap; leave it only if
624:             # that very circle is predicted to touch something.
625:             mode, i = 'coil', kc
626:         elif safe.any():
627:             mode = 'unwrap' if wrap_esc is not None else 'loop' if looping else 'evade' if attacker is not None else 'escape' if enclosed > .6 else 'feed' if eat.max() > 0 or goal_val > 0 else 'cruise'
628:             i = int(np.argmax(np.where(safe, score, -np.inf)))
629:             # Maneuver, not a one-tick command (P18: 891 returns to the old heading within 0.25 s, boost toggled
630:             # 134/min, a third of boost runs < 0.1 s - Codex run review). The held plan (the exact previous command)
631:             # stays while it is safe; a better plan replaces it only if it wins by SWITCH on CONFIRM ticks in a row
632:             # (same heading within 15 deg, same boost). An unsafe held plan is replaced at once.
633:             if safe[held] and not danger:           # attacked / wrapped: react at once
634:                 if i != held and score[i] >= score[held]+SWITCH:
635:                     same = (self.pend is not None and abs(wrap(hd[i]-self.pend[0])) < np.radians(15)
636:                             and bool(bst[i]) == self.pend[1] and self.pend[4] == mode)
637:                     self.pend = (hd[i], bool(bst[i]), self.pend[2]+1 if same else 1, s['t'], mode)
638:                     if self.pend[2] < CONFIRM: i, hold_by = held, 'confirm'
639:                 else:
640:                     self.pend, i = None, held
641:             elif not safe[held]:
642:                 self.pend = None
643:             else:                                   # danger: the plain hold rule
644:                 self.pend = None
645:                 if score[held] >= score[i]-SWITCH: i = held
646:             # Boost is a speed state (0.57 s to full speed): in calm feeding, no change back within BOOST_DWELL of the
647:             # last change while the same heading at the current boost state is safe too. Not in danger: a new attack
648:             # right after a boost change must get its acceleration (Codex evening review #1: 252 of 390 dwell
649:             # interventions held back an attack boost) - there both speeds are compared on their own merits.
650:             if bool(bst[i]) != self.prev_boost and s['t']-self.boost_since < BOOST_DWELL and not danger:
651:                 j = i-C if bst[i] else i+C
652:                 if safe[j]: i, hold_by = j, 'dwell'
```

```python
700:                          why=[round(float(min(gap_static[i], 999)), 1), round(float(min(gap_heads[i], 999)), 1),
701:                               round(float(min(gap_static[held_i], 999)), 1), round(float(min(gap_heads[held_i], 999)), 1),
702:                               bool(safe[held_i])],
703:                          hold_by=hold_by,
704:                          # held path: which filters failed (clear<thr, hard<phys, dead end, other side, coil side)
705:                          held_fail=[bool(clear[held_i] < thr[held_i]), bool(hard[held_i] < min(thr[held_i], HARD_PHYS)),
706:                                     bool(onward[held_i] < LONG_SAFE), bool(against[held_i]), bool(wrong[held_i])],
```

## research/oracle_deaths_20260925.py

```python
20: def realized(pos, t0, times, states, ro):
21:     """Min drawn gap of path points pos (C,N,2) at times t0+times against the bodies AND the wall observed at those
22:     times. Any step without an observation within 60 ms makes the result unknown (NaN) - never 'safe'
23:     (Codex evening review #5)."""
24:     C = pos.shape[0]; g = np.full(C, np.inf)
25:     for n, dt in enumerate(times):
26:         j = int(np.argmin(abs(times_all - (t0+dt))))
27:         if abs(times_all[j]-(t0+dt)) > .06:
28:             return np.full(C, np.nan)
29:         s = states[j]; w = s['wall']
30:         g = np.minimum(g, w[2]-np.hypot(pos[:, n, 0]-w[0], pos[:, n, 1]-w[1])-ro)
31:         segs = arr(s, 'segs', 5)
32:         if not len(segs): continue
33:         d = pilot.seg_dist(pos[:, n], segs)-segs[:, 4][None]-ro
34:         g = np.minimum(g, d.min(1))
35:     return g
36: 
```

```python
67: #  blind       planner saw no safe path (n_safe 0) while the oracle had >= 5
68: #  no_way      no maneuver stayed clear; few: 1-4 did (threshold, not a proven dead end)
69: #  chose_bad   planner had safe paths but picked one it predicted unsafe (should not happen)
70: for row in out:
71:     m = [x for x in row['moments'] if x['before'] == 1.2]
72:     if not m: row['category'] = 'unobserved'; continue
73:     m = m[0]
74:     # no_way = not one of the 48 maneuvers kept clear; few = 1-4 (a threshold, reported separately)
75:     row['category'] = ('no_way' if m['oracle_safe'] == 0 else 'few' if m['oracle_safe'] < 5 else
76:                        'blind' if not m['planner_safe'] else 'planner_ok' if (m['planner_hard'] or 0) > 0 else 'chose_bad')
77: from collections import Counter
78: print('categories at T-1.2 s:', dict(Counter(r['category'] for r in out)))
79: print('game            sec  | per moment before death: oracle-safe maneuvers(of 48) / planner n_safe / chosen realized gap / planner predicted hard')
80: for row in out:
81:     cells = ['%.1fs: %2d/%2s/%6.1f/%6s' % (m['before'], m['oracle_safe'], m['planner_safe'], m['chosen_realized'], m['planner_hard'])
```

## research/false_alarm_20260925.py

```python
45:         C = v['C']; hi = (2*C-1) if box[k-1]['cmd'][1] else (C-1)       # held candidate index (same boost)
46:         accepted = bool(v['safe'][hi])
47:         if not accepted: rej += 1
48:         # Compare only inside the observed window (up to death): the planner may have rejected the held path for a
49:         # touch it predicted after the moment we died, which the record cannot confirm or refute.
50:         pos = v['pos'][hi]; ro = pilot.R*s['sc']; g = np.inf; seen = []
51:         for m, dt in enumerate(v['t']):
52:             j = int(np.argmin(abs(ts-(s['t']+dt))))
53:             if abs(ts[j]-(s['t']+dt)) > .06: continue
54:             seen.append(m)
55:             sg = arr(states[j], 'segs', 5)
56:             if len(sg): g = min(g, float((pilot.seg_dist(pos[m][None], sg)[0]-sg[:, 4]-ro).min()))
57:         if not seen: continue
58:         wl = states[-1]['wall']                                       # wall too (Codex evening review #5)
59:         g = min(g, float((wl[2]-np.hypot(pos[seen, 0]-wl[0], pos[seen, 1]-wl[1])-ro).min()))
60:         if accepted:                                                  # judged safe: did it really stay clear?
61:             acc += 1
62:             if g <= 0: miss += 1
63:             continue
64:         pred = float(v['gap'][hi][seen].min())                       # planner's own predicted gap in that window
65:         if pred >= pilot.HARD_PHYS: continue                          # rejected for a reason outside the window
66:         rej_in += 1
67:         if g > 5: fa += 1
68:         elif g <= 0: ta += 1
69:     rows.append((f[-20:-6], n, rej_in, fa, ta, acc, miss))
70:     for key, val in zip(('ticks', 'rejected', 'false', 'true', 'accepted', 'missed'), (n, rej_in, fa, ta, acc, miss)): tot[key] = tot.get(key, 0)+val
71: print('game            ticks  held-rejected-in-window  false-alarm(>5px clear)  true(touch)  held-accepted  missed(accepted but touched)')
72: for g, n, rej, fa, ta, acc, miss in rows: print(f'{g}  {n:5d}  {rej:5d}  {fa:5d}  {ta:5d}  {acc:5d}  {miss:5d}')
73: print('total', tot)
```

## 保存된 출력
```text
_20260925_183915   108.1 ->   97.9            12.7 ->    6.4            0.023 -> 0.024
median           146.3 -> 124.9          16.4 -> 12.9            0.031 -> 0.031
total {'ticks': 414, 'rejected': 212, 'false': 59, 'true': 130, 'accepted': 116, 'missed': 18}
```