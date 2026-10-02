# 저녁 변경 검토 원자료 — 2026-09-25

로컬 재생·합성 반례. 운영 코드 수정·실사이트 실행 없음.

## research/review_evening_changes_20260925.json

```json
{
  "note": "Open-loop replay, initialized at the start of each saved terminal window. Not full-game or survival evidence.",
  "inputs": {
    "research/evening_review_inputs/before_maneuver.py": "b814ac9e616bc65a29b1be8e3169d8d2151d53d4df13aca225efd65bae0b98ca",
    "research/evening_review_inputs/pilot_reviewed.py": "6eb10d1e84ea4390031a5d49776a3a24a6cdf3b5808ab957c24e94e060b3396c"
  },
  "rows": [
    {
      "game": "_20260925_170651",
      "frames": 900,
      "old": {
        "boost_toggles_min": 157.38607203123166,
        "returns_min": 17.35875794462114,
        "emergency_share": 0.06666666666666667
      },
      "new": {
        "boost_toggles_min": 123.82580667163079,
        "returns_min": 15.04425688533832,
        "emergency_share": 0.06444444444444444
      }
    },
    {
      "game": "_20260925_171431",
      "frames": 900,
      "old": {
        "boost_toggles_min": 202.7488604724431,
        "returns_min": 20.794754920250575,
        "emergency_share": 0.01888888888888889
      },
      "new": {
        "boost_toggles_min": 149.462300989301,
        "returns_min": 18.195410555219254,
        "emergency_share": 0.02
      }
    },
    {
      "game": "_20260925_171635",
      "frames": 900,
      "old": {
        "boost_toggles_min": 78.16209653020174,
        "returns_min": 15.292584103735123,
        "emergency_share": 0.012222222222222223
      },
      "new": {
        "boost_toggles_min": 69.66621647257112,
        "returns_min": 10.195056069156749,
        "emergency_share": 0.012222222222222223
      }
    },
    {
      "game": "_20260925_171833",
      "frames": 900,
      "old": {
        "boost_toggles_min": 129.1468123702428,
        "returns_min": 10.331744989619423,
        "emergency_share": 0.06
      },
      "new": {
        "boost_toggles_min": 109.77479051470637,
        "returns_min": 12.91468123702428,
        "emergency_share": 0.06333333333333334
      }
    },
    {
      "game": "_20260925_172034",
      "frames": 900,
      "old": {
        "boost_toggles_min": 146.26661599559557,
        "returns_min": 16.365495496010695,
        "emergency_share": 0.022222222222222223
      },
      "new": {
        "boost_toggles_min": 107.39856419257018,
        "returns_min": 7.159904279504678,
        "emergency_share": 0.025555555555555557
      }
    },
    {
      "game": "_20260925_172303",
      "frames": 900,
      "old": {
        "boost_toggles_min": 167.6075453358314,
        "returns_min": 27.426689236772408,
        "emergency_share": 0.03111111111111111
      },
      "new": {
        "boost_toggles_min": 112.75416686228657,
        "returns_min": 12.189639660787737,
        "emergency_share": 0.03111111111111111
      }
    },
    {
      "game": "_20260925_172548",
      "frames": 900,
      "old": {
        "boost_toggles_min": 193.90232479202828,
        "returns_min": 38.49531448077032,
        "emergency_share": 0.03666666666666667
      },
      "new": {
        "boost_toggles_min": 151.12975314672792,
        "returns_min": 25.66354298718021,
        "emergency_share": 0.034444444444444444
      }
    },
    {
      "game": "_20260925_173206",
      "frames": 900,
      "old": {
        "boost_toggles_min": 179.6996452893297,
        "returns_min": 21.820671213704323,
        "emergency_share": 0.04555555555555556
      },
      "new": {
        "boost_toggles_min": 134.77473396699727,
        "returns_min": 16.686395634009187,
        "emergency_share": 0.04777777777777778
      }
    },
    {
      "game": "_20260925_183803",
      "frames": 429,
      "old": {
        "boost_toggles_min": 39.487241773972094,
        "returns_min": 0.0,
        "emergency_share": 0.03263403263403263
      },
      "new": {
        "boost_toggles_min": 39.487241773972094,
        "returns_min": 0.0,
        "emergency_share": 0.03263403263403263
      }
    },
    {
      "game": "_20260925_183834",
      "frames": 567,
      "old": {
        "boost_toggles_min": 115.0450756685116,
        "returns_min": 14.64210053962875,
        "emergency_share": 0.021164021164021163
      },
      "new": {
        "boost_toggles_min": 85.7608745892541,
        "returns_min": 12.550371891110357,
        "emergency_share": 0.021164021164021163
      }
    },
    {
      "game": "_20260925_183915",
      "frames": 799,
      "old": {
        "boost_toggles_min": 108.1231530042195,
        "returns_min": 12.720370941672883,
        "emergency_share": 0.02252816020025031
      },
      "new": {
        "boost_toggles_min": 87.77055949754289,
        "returns_min": 6.360185470836441,
        "emergency_share": 0.023779724655819776
      }
    }
  ],
  "counters": {
    "ticks": 8995,
    "wrap_ticks": 805,
    "wrap_cut_available": 134,
    "wrap_cut_selected": 24,
    "dwell_changes": 390,
    "dwell_in_attack": 252,
    "dwell_in_wrap": 37,
    "dwell_blocks_boost_on_in_attack": 252,
    "coil_why_mismatch": 106,
    "cut_ablation_tested": 60,
    "cut_ablation_command_changed": 0
  },
  "dwell_examples": [
    {
      "game": "_20260925_170651",
      "t": 354.2818976099952,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 60.0,
      "cut_any": true,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 45.870594096633624,
      "hard_after": 41.589410521382504,
      "t_since_boost": 0.10444733998156153,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 354.77958537000814,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": true,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 20.7381022810695,
      "hard_after": 81.18306683441529,
      "t_since_boost": 0.2785347900062334,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 356.02037307000137,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 13.37268453994487,
      "hard_after": 14.08179921116583,
      "t_since_boost": 0.04484133000369184,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 356.07346928998595,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 43.71067374316843,
      "hard_after": 36.239046544437315,
      "t_since_boost": 0.09793754998827353,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 356.1172884000116,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 18.413270992053143,
      "hard_after": 13.461744069105038,
      "t_since_boost": 0.14175666001392528,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 357.3033035399858,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 34.68299491450472,
      "hard_after": 25.02856229487476,
      "t_since_boost": 0.03384341998025775,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 357.44426982000005,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 17.36480979199679,
      "hard_after": 25.118096910358148,
      "t_since_boost": 0.07035021000774577,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 359.0556074999913,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 40.53523875473023,
      "hard_after": 66.332599711868,
      "t_since_boost": 0.19081979998736642,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 359.11040291999234,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 73.83338553950472,
      "hard_after": 73.83338553950472,
      "t_since_boost": 0.24561521998839453,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 364.40793854999356,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 43.99257904628538,
      "hard_after": 43.99257904628538,
      "t_since_boost": 0.11300066998228431,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 364.97707433998585,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 18.697982466403133,
      "hard_after": 31.952737825282995,
      "t_since_boost": 0.075788369984366,
      "why_coil_mismatch": false
    },
    {
      "game": "_20260925_170651",
      "t": 365.0285611799918,
      "mode": "evade",
      "wrap": false,
      "attacker": true,
      "cut_selected": 0.0,
      "cut_any": false,
      "dwell_changed": true,
      "boost_before": true,
      "boost_after": false,
      "hard_before": 13.451066385208918,
      "hard_after": 55.77312005204763,
      "t_since_boost": 0.12727520999033004,
      "why_coil_mismatch": false
    }
  ],
  "cut_examples": [],
  "medians": {
    "old": {
      "boost_toggles_min": 146.26661599559557,
      "returns_min": 16.365495496010695,
      "emergency_share": 0.03111111111111111
    },
    "new": {
      "boost_toggles_min": 109.77479051470637,
      "returns_min": 12.550371891110357,
      "emergency_share": 0.03111111111111111
    }
  }
}
```

## research/review_evening_edge_checks_20260925.json

```json
{
  "pending_across_emergency": {
    "before": [
      1.3089969389957472,
      true,
      1
    ],
    "after": [
      1.3089969389957472,
      true,
      1
    ],
    "mode": "emergency",
    "same_pending": true
  },
  "new_attack_after_recent_boost_off": {
    "profile": "safe",
    "boost_off_at": 0.95,
    "attack_at": 1.0,
    "normal": {
      "boost": false,
      "angle_deg": -90.0,
      "mode": "evade",
      "predicted_gap": 23.7
    },
    "without_dwell": {
      "boost": true,
      "angle_deg": -90.0,
      "mode": "evade",
      "predicted_gap": 19985.5
    },
    "note": "Synthetic same observed state and same controller history; only BOOST_DWELL differs. Not a demonstrated death."
  },
  "oracle_missing_observation": {
    "gap": "inf",
    "counted_safe": true
  },
  "oracle_wall": {
    "body_gap": 691.1089380465382,
    "wall_gap": -11,
    "counted_safe": true
  },
  "hashes": {
    "research/evening_review_inputs/pilot_reviewed.py": "6eb10d1e84ea4390031a5d49776a3a24a6cdf3b5808ab957c24e94e060b3396c",
    "research/oracle_deaths_20260925.py": "81027a6bfa4f3e74cfd330f6e8aeb8a0fb7b60fc48d4c75bc3deed5d8a308551",
    "research/false_alarm_20260925.py": "7ee48add01aca74f801aad21e2951f3c862cb1893b8eb2425b39859ad7e995f4",
    "run_live.py": "7f3f470b1771b3d7a109e0074e3ce80e9d9733295f858e11200e50e1fbe18d0a",
    "CHANGES_20260925_evening.md": "afa7fc47a5d06f0d07e4afc6af26648bc62e72bb9ddf3230e148675bd19d6eb8"
  }
}
```

## 자체 검사

`PYTHONDONTWRITEBYTECODE=1 .venv/bin/python pilot.py` 종료 코드 0
```text
ok pilot; crowded tick p50 28.9 ms p95 35.5 ms
```

## pilot.py

SHA256 6eb10d1e84ea4390031a5d49776a3a24a6cdf3b5808ab957c24e94e060b3396c

```python
574:         for h in heads:          # 3.c: our path crosses its straight path well before it gets there
575:             if np.hypot(*(h[:2]-p)) > 500: continue
576:             hp, ht = head_paths(h)
577:             hp, ht = hp[:N], ht[:N]
578:             d2 = ((pos[:, :, None, :]-hp[None, None])**2).sum(-1)
579:             cut = ((d2 < (ro+R*h[4]+10)**2) & (t[None, :, None]+.25 < ht[None, None, :])).any((1, 2))
580:             score += W_CUT*cut
581:         danger = attacker is not None or wrap_esc is not None or not safe.any()
582:         # In danger boosting is free (user): same turn rate, twice the distance - taken when its path is the safer one.
583:         score -= np.where(bst, min(0., BOOST_COST) if danger else BOOST_COST+(1e3 if s['L'] < 80 and attacker is None else 0.), 0.)
584:         w_t = turn_rate(sc)
```

```python
607:             cp, ct = coil_path(p, ang, sp, sc, prev, self.coil_dir, self.prev_boost)
608:             wl = s['wall']
609:             coil_hard = min(float((field_gap(field, cp)-ro).min()), float((wl[2]-np.hypot(*(cp-np.array(wl[:2])).T)-ro).min()))
610:             for hp, ht, hr in hpaths:
611:                 d2 = ((cp[:, None, :]-hp[None])**2).sum(-1)
612:                 d2 = np.where(ht[None] <= ct[:, None]+.15, d2, 1e8)
613:                 coil_hard = min(coil_hard, float(np.sqrt(d2.min())-ro-hr))
614:         calm = (not ring and wrap_esc is None and attacker is None and big_risk < .5 and threat == 0 and not heap_chase
615:                 and safe[int(np.argmin(abs(ANGLES)))])
616:         if ring and coil_hard > HARD:
617:             # Coiling: full-rate turn every tick (no boost) -> the same circle lap after lap; leave it only if
618:             # that very circle is predicted to touch something.
619:             mode, i = 'coil', kc
620:         elif safe.any():
621:             mode = 'unwrap' if wrap_esc is not None else 'loop' if looping else 'evade' if attacker is not None else 'escape' if enclosed > .6 else 'feed' if eat.max() > 0 or goal_val > 0 else 'cruise'
622:             i = int(np.argmax(np.where(safe, score, -np.inf)))
623:             # Maneuver, not a one-tick command (P18: 891 returns to the old heading within 0.25 s, boost toggled
624:             # 134/min, a third of boost runs < 0.1 s - Codex run review). The held plan (the exact previous command)
625:             # stays while it is safe; a better plan replaces it only if it wins by SWITCH on CONFIRM ticks in a row
626:             # (same heading within 15 deg, same boost). An unsafe held plan is replaced at once.
627:             held = 2*C-1 if self.prev_boost else C-1
628:             if safe[held] and not danger:           # attacked / wrapped: react at once
629:                 if i != held and score[i] >= score[held]+SWITCH:
630:                     same = (self.pend is not None and abs(wrap(hd[i]-self.pend[0])) < np.radians(15)
631:                             and bool(bst[i]) == self.pend[1])
632:                     self.pend = (hd[i], bool(bst[i]), self.pend[2]+1 if same else 1)
633:                     if self.pend[2] < CONFIRM: i = held
634:                 else:
635:                     self.pend, i = None, held
636:             elif not safe[held]:
637:                 self.pend = None
638:             else:                                   # danger: the plain hold rule
639:                 self.pend = None
640:                 if score[held] >= score[i]-SWITCH: i = held
641:             # Boost is a speed state (0.57 s to full speed): no change back within BOOST_DWELL of the last change
642:             # while the same heading at the current boost state is safe too. Safety changes it at once.
643:             # (also in danger: the first change is free, only undoing it within BOOST_DWELL is held back)
644:             if bool(bst[i]) != self.prev_boost and s['t']-self.boost_since < BOOST_DWELL:
645:                 j = i-C if bst[i] else i+C
646:                 if safe[j]: i = j
647:             # Calm modes turn at most CALM_RATE (large arcs, no spinning, user): toward the chosen side, through the
648:             # evaluated +-lim candidate with the chosen boost (Codex #1: no unchecked clamp after the choice).
649:             if calm and abs(crel[i % C]) > lim+1e-6:
650:                 j = len(ANGLES)+(0 if crel[i % C] > 0 else 1)+(C if bst[i] else 0)
651:                 if safe[j]: i = j
652:         else:
653:             # No margin anywhere: first avoid contact at all, else put it off as long as possible.
654:             mode = 'emergency'
655:             # Among the candidates that touch last, stay close to the previous command (P2 thrashed here).
656:             hit = np.where((gap <= HARD).any(1), (gap <= HARD).argmax(1), N)
657:             e = (np.minimum(clear, 50.)+.2*np.minimum(onward, 100.)-30.*flip-40.*against-.3*np.degrees(abs(wrap(hd-prev)))
658:                  -1e6*(ring & flip))                         # boost free in an emergency; prefer ways on beyond 1.2 s
659:             if attacker is not None:       # P13: 3/3 deaths cut off by a head 60-90 px away while we cruised - run fast
660:                 e = e+W_RUN*threat*(np.cos(wrap(hd-away)) > .5)*(1.+bst)
661:             # Latest touch first; if all of those turn against our committed side, candidates on our side touching
662:             # within 3 steps (0.24 s) of it count as equal.
663:             # Codex #2: while coiling, only our turn direction is in the pool at all - compare touch times inside it.
664:             pool = ~wrong if ring else np.ones(2*C, bool)
665:             hmax = hit[pool].max()
666:             cand = pool & (hit == hmax)
667:             # hit == N means no touch within the horizon: never trade that for our side (Codex review 2).
668:             if hmax < N and not (cand & ~against).any() and (pool & (hit >= hmax-3) & ~against).any():
669:                 cand = pool & (hit >= hmax-3) & ~against
670:             i = int(np.argmax(np.where(cand, e, -np.inf)))
671:         held_i = 2*C-1 if self.prev_boost else C-1
672:         if bool(bst[i]) != self.prev_boost: self.boost_since = s['t']
673:         cmd = float(wrap(hd[i]))                  # exactly the evaluated candidate (Codex #1)
674:         if abs(wrap(cmd-ang)) > np.radians(30):
675:             self.side, self.side_until = float(np.sign(wrap(cmd-ang))), s['t']+SIDE_HOLD
676:         self.prev, self.prev_boost = cmd, bool(bst[i])
677: 
678:         # 1.c trace: nearest two different snakes and whether they are on opposite sides of us.
679:         thread = None
680:         if len(segs):
681:             order = np.argsort(near_all)
682:             first = order[0]; other = order[sid[order] != sid[first]]
683:             if len(other):
684:                 j = other[0]
685:                 u = np.array([np.cos(ang), np.sin(ang)])
686:                 side = lambda k: np.sign(u[0]*((segs[k, 1]+segs[k, 3])/2-p[1])-u[1]*((segs[k, 0]+segs[k, 2])/2-p[0]))
687:                 thread = [round(float(near_all[first]-ro), 1), round(float(near_all[j]-ro), 1), bool(side(first) != side(j))]
688:         self.last = dict(mode=mode, trace=dict(mode=mode, boost=bool(bst[i]), cmd=round(float(np.degrees(cmd)), 1), clear=round(float(coil_hard if mode == 'coil' else clear[i]), 1),
689:                          hard=round(float(coil_hard if mode == 'coil' else hard[i]), 1), n_safe=int(safe.sum()), threat=round(threat, 2),
690:                          enclosed=round(enclosed, 2), wrap=round(wrap_cov, 2), thr=float(thr[i]), eat=round(float(eat[i]), 1), goal=round(goal_val, 1),
691:                          thread=thread, L=int(s['L']), sc=round(sc, 2), died_near=self.died_near, kills=self.kills,
692:                          big=round(big_risk, 2), curl=round(curl, 2), prof=PROFILE, onward=round(float(onward[i]), 1), nh=len(heads),
693:                          # min gap of the chosen and of the held (previous-command) path: bodies/wall vs head forecasts
694:                          why=[round(float(min(gap_static[i], 999)), 1), round(float(min(gap_heads[i], 999)), 1),
695:                               round(float(min(gap_static[held_i], 999)), 1), round(float(min(gap_heads[held_i], 999)), 1),
696:                               bool(safe[held_i])],
697:                          crowd=None if crowd_at is None else round(float(np.hypot(*(crowd_at-p)))),
698:                          gap=None if thread_w is None else [round(thread_w['w'], 1), round(thread_w['ra'], 1), round(thread_w['rb'], 1),
699:                                                            round(ro, 1), bool(thread_i[i])],
700:                          esc=None if wrap_esc is None else round(float(np.degrees(wrap_esc)), 1)))
```

## run_live.py

SHA256 7f3f470b1771b3d7a109e0074e3ce80e9d9733295f858e11200e50e1fbe18d0a

```python
41: OBSERVE_JS = """([R, RF]) => {
42:   const s = window.slither;
43:   if (!window.playing || !s || s.dead) return null;
44:   const hx = s.xx, hy = s.yy, R2 = R * R, inr = (x, y) => (x-hx)*(x-hx) + (y-hy)*(y-hy) < R2,
45:         RF2 = RF * RF, inf = (x, y) => (x-hx)*(x-hx) + (y-hy)*(y-hy) < RF2;
46:   const segs = [], sid = [], heads = [], hid = [], food = [], own = [];
47:   for (const o of slithers) {
48:     if (o === s || o.dead) continue;
49:     const r = 14.5 * o.sc, P = o.pts;
50:     let px = null, py = null, pin = false;
51:     for (let i = 0; i <= P.length; i++) {
52:       let x, y;
53:       if (i < P.length) { if (P[i].dying) continue; x = P[i].xx; y = P[i].yy; } else { x = o.xx; y = o.yy; }
54:       const inn = inr(x, y);
55:       if (px !== null && (inn || pin)) { segs.push(px, py, x, y, r); sid.push(o.id); }
56:       px = x; py = y; pin = inn;
57:     }
58:     if (inf(o.xx, o.yy)) { heads.push(o.xx, o.yy, o.ang, o.sp, o.sc); hid.push(o.id); }
59:   }
60:   for (let i = 0; i < foods_c; i++) { const f = foods[i]; if (f && !f.eaten && inf(f.xx, f.yy)) food.push(f.xx, f.yy, f.sz); }
61:   for (const p of s.pts) if (!p.dying) own.push(p.xx, p.yy);
62:   own.push(hx, hy);
63:   const pack = a => { const u = new Uint8Array(new Float32Array(a).buffer); let t = '';
64:     for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
65:     return btoa(t); };
66:   const sct = s.sct + s.rsc;
67:   return {pt: performance.now(), x: hx, y: hy, ang: s.ang, sp: s.sp, sc: s.sc, boost: s.md, wall: [grd, grd, flux_grd], rank,
68:           L: Math.floor((fpsls[sct] + s.fam / fmlts[sct] - 1) * 15 - 5),
69:           segs: pack(segs), sid: pack(sid), heads: pack(heads), hid: pack(hid), food: pack(food), own: pack(own)};
70: }"""
71: COMMAND_JS = """([a, b]) => {
72:   if (!window.playing || !window.slither || window.slither.dead || window.__stop) return false;
73:   window.__lastCmd = Date.now();
74:   window.xm = Math.cos(a) * 250; window.ym = Math.sin(a) * 250;
75:   window.setAcceleration(b ? 1 : 0);
76:   return performance.now();            // page clock when the command took effect in the page
```

```python
136:             tick = time.monotonic(); ticks.append(tick)
137:             raw = await asyncio.wait_for(page.evaluate(OBSERVE_JS, [RADIUS, FOOD_RADIUS]), timeout=5)
138:             if raw is None:
139:                 break
140:             t_obs = time.monotonic()
141:             s = unpack(raw); s['t'] = tick-start
142:             L_max = max(L_max, s['L'])
143:             cmd, _ = await asyncio.wait_for(asyncio.to_thread(ctrl, s), timeout=1.)
144:             t_dec = time.monotonic()
145:             sent = await asyncio.wait_for(page.evaluate(COMMAND_JS, [float(cmd[0]), bool(cmd[1])]), timeout=5)
146:             stage.append(((t_obs-tick)*1e3, (t_dec-t_obs)*1e3, (time.monotonic()-tick)*1e3))
147:             work.append(time.monotonic()-tick)
148:             last = dict(getattr(ctrl, 'last', {}))
149:             modes[last.get('mode')] = modes.get(last.get('mode'), 0)+1
150:             # page clock: state read -> command applied, ms (the part of the latency that is ours)
151:             page_ms = round(sent-s['pt'], 1) if sent and 'pt' in s else None
152:             if 'trace' in last: trace.append(dict(t=round(s['t'], 3), page_ms=page_ms, **last['trace']))
153:             box.append(dict(state={k: (v.astype(np.float32) if isinstance(v, np.ndarray) else v) for k, v in s.items()},
154:                             cmd=(float(cmd[0]), bool(cmd[1])), last=last, page_ms=page_ms))
155:             if not sent:
156:                 reason = 'user_escape' if await page.evaluate('window.__stop') else 'death'
157:                 break
158:             if measure and len(ticks) % 30 == 0:
```

## research/oracle_deaths_20260925.py

SHA256 81027a6bfa4f3e74cfd330f6e8aeb8a0fb7b60fc48d4c75bc3deed5d8a308551

```python
19: 
20: def realized(pos, t0, times, states, ro):
21:     """Min drawn gap of path points pos (C,N,2) at times t0+times against the bodies observed at those times."""
22:     C = pos.shape[0]; g = np.full(C, np.inf)
23:     for n, dt in enumerate(times):
24:         j = int(np.argmin(abs(times_all - (t0+dt))))
25:         if abs(times_all[j]-(t0+dt)) > .06: continue          # no observation that late (past death): skip
26:         segs = arr(states[j], 'segs', 5)
27:         if not len(segs): continue
28:         d = pilot.seg_dist(pos[:, n], segs)-segs[:, 4][None]-ro
29:         g = np.minimum(g, d.min(1))
30:     return g
31: 
```

```python
57:     out.append(row)
58: 
59: # Category at T-1.2 s (window ends at death):
60: #  miss        planner judged its chosen path safe (n_safe>0, hard>0) and the oracle still had safe maneuvers
61: #  blind       planner saw no safe path (n_safe 0) while the oracle had >= 5
62: #  no_way      the oracle had < 5 safe maneuvers (position already lost)
63: #  chose_bad   planner had safe paths but picked one it predicted unsafe (should not happen)
64: for row in out:
65:     m = [x for x in row['moments'] if x['before'] == 1.2][0]
66:     row['category'] = ('no_way' if m['oracle_safe'] < 5 else 'blind' if not m['planner_safe'] else
67:                        'miss' if (m['planner_hard'] or 0) > 0 else 'chose_bad')
```

## research/false_alarm_20260925.py

SHA256 7ee48add01aca74f801aad21e2951f3c862cb1893b8eb2425b39859ad7e995f4

```python
32:     if r.get('reason') != 'death': continue
33:     states = [b['state'] for b in box]; ts = np.array([s['t'] for s in states]); T = ts[-1]
34:     c = pilot.Pilot(); fa = ta = rej = n = rej_in = 0
35:     for k, b in enumerate(box):
36:         s = {kk: (np.asarray(v, float) if kk in ('segs', 'sid', 'heads', 'hid', 'food', 'own') else v) for kk, v in b['state'].items()}
37:         for kk, w in (('segs', 5), ('food', 3), ('heads', 5), ('own', 2)): s[kk] = s[kk].reshape(-1, w)
38:         if k: c.prev, c.prev_boost = box[k-1]['cmd']          # the command actually being driven
39:         if T-s['t'] > 1.2 or T-s['t'] < .15:
40:             c(s); continue
41:         v = locals_of(c, s); n += 1
42:         held = 2*v['C']-1 if v['self'].prev_boost is False and False else None
43:         C = v['C']; hi = (2*C-1) if box[k-1]['cmd'][1] else (C-1)       # held candidate index (same boost)
44:         if v['safe'][hi]: continue
45:         rej += 1
46:         # Compare only inside the observed window (up to death): the planner may have rejected the held path for a
47:         # touch it predicted after the moment we died, which the record cannot confirm or refute.
48:         pos = v['pos'][hi]; ro = pilot.R*s['sc']; g = np.inf; seen = []
49:         for m, dt in enumerate(v['t']):
50:             j = int(np.argmin(abs(ts-(s['t']+dt))))
51:             if abs(ts[j]-(s['t']+dt)) > .06: continue
52:             seen.append(m)
53:             sg = arr(states[j], 'segs', 5)
54:             if len(sg): g = min(g, float((pilot.seg_dist(pos[m][None], sg)[0]-sg[:, 4]-ro).min()))
55:         if not seen: continue
56:         pred = float(v['gap'][hi][seen].min())                       # planner's own predicted gap in that window
57:         if pred >= pilot.HARD_PHYS: continue                          # rejected for a reason outside the window
58:         rej_in += 1
59:         if g > 5: fa += 1
60:         elif g <= 0: ta += 1
61:     rows.append((f[-20:-6], n, rej_in, fa, ta))
```

## 재현 스크립트

research/review_evening_changes_20260925.py
research/review_evening_edge_checks_20260925.py

변경 전후 소스는 research/evening_review_inputs 에 보존. 기존 replay_flap txt의 판 목록을 그대로 사용.