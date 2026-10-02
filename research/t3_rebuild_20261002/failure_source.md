# T3 measurement failure audit — original code and fixed log snapshot

Build: 1002-11dad5e1. Population: same 94 ended records at 2026-10-02 11:47:40 KST, 93 actual deaths, one user interruption. Later collection excluded from this audit. Read-only audit; no production or classifier changes.

## Raw audit output
```json
{
  "snapshot": "2026-10-02 11:47:40",
  "deaths": 93,
  "death_actual_phase": {
    "align": 56,
    "seek": 28,
    "follow": 9
  },
  "death_guard_changed": {
    "1": 93
  },
  "death_valid": {
    "0": 93
  },
  "death_reasons": {
    "head_interference": 57,
    "entry_no_safe_turn": 6,
    "body_interference": 30
  },
  "qualify_if_only_valid_gate_removed": 0,
  "boost_ticks_actual_phase": {
    "align": 3,
    "follow": 1291,
    "seek": 15
  },
  "boost_ticks_valid": {
    "0": 314,
    "1": 995
  },
  "qualified_levels_by_speed_request": {
    "0": 79,
    "1": 19
  },
  "boost_window_audit": {
    "longest_constant_command_qualified_boost_segment": {
      "duration": 1.4989999999999952,
      "run": "t3_20261002_095256",
      "game": 4,
      "samples": 47,
      "boost_command": 1,
      "gap_range": 4.310378543562493,
      "speed_range": 0,
      "median_goal_error": 2.837846162520428
    },
    "overlapping_boost_windows_failures": {
      "goal_error_ge2": 90,
      "gap_range_ge3": 189,
      "speed_range_ge1": 185
    }
  }
}
```

## Production guard and stability window
```js
    const local=new Set();if(tg)for(let i=0;i<tg.ks.length;i++)if(Math.abs((tg.cum[i]+tg.cum[i+1])/2-tg.q.a)<450)local.add(tg.ks[i]);
    const keys=[];for(let k=0;k<sid.length;k++)if(segDist(px,py,S,k)-S[k*5+4]-ro<BOOST_SP*PX_PER_SP+80)keys.push(k);
    const check=(cmd,accel)=>{let st={x:px,y:py,h:ang,v:velocity},clear=Infinity,track=0;const horizon=pr.phase==='follow'?.40:.70,steps=Math.ceil(horizon/.025);
      for(let n=0;n<steps;n++){const tt=(n+1)*.025;st=this.v4Adv(st,n<4?(s.cmdNow??ang):cmd,n<4?!!s.boostNow:accel,.025,ph);
        for(const k of keys){const isTrack=tg&&sid[k]===tg.id&&local.has(k),allow=isTrack?pr.phase==='follow'?pr.set-8:8:16;clear=Math.min(clear,segDist(st.x,st.y,S,k)-ro-S[k*5+4]-allow);}
        for(let j=0;j<hid.length;j++){const speed=H[j*5+3]*PX_PER_SP;clear=Math.min(clear,hypot(st.x-H[j*5]-speed*tt*Math.cos(H[j*5+2]),st.y-H[j*5+1]-speed*tt*Math.sin(H[j*5+2]))-ro-R*H[j*5+4]-25);}
        if(s.wall)clear=Math.min(clear,s.wall[2]-hypot(st.x-s.wall[0],st.y-s.wall[1])-ro-25);
      }
      if(tg){const q=closest(tg,st.x,st.y),e=q.d-ro-tg.r-pr.normalVelocity*horizon-pr.set;track=(e/35)**2*.4+Math.abs(wrap(cmd-desired))**2*3;}
      else track=Math.abs(wrap(cmd-desired))**2;return {cmd,boost:accel,clear,track,st};};
    let chosen=check(desired,boost),changed=false;
    if(chosen.clear<0){const choices=[check(desired,false),...[-PI,-PI/2,-PI/3,-PI/6,0,PI/6,PI/3,PI/2].map(d=>check(ang+d,false))],safe=choices.filter(q=>q.clear>=0);chosen=(safe.length?safe:choices).sort((a,b)=>safe.length?a.track-b.track:b.clear-a.clear)[0];changed=true;reason=safe.length?'entry_collision_turn':'entry_no_safe_turn';path=[px,py,chosen.st.x,chosen.st.y];}
    boost=chosen.boost;
    let interference=false;for(let k=0;k<sid.length;k++)if((!tg||sid[k]!==tg.id)&&segDist(px,py,S,k)-ro-S[k*5+4]<35){reason='body_interference';interference=true;break;}
    for(let j=0;j<hid.length;j++)if(hypot(H[j*5]-px,H[j*5+1]-py)<250){reason='head_interference';interference=true;break;}
    if(s.wall&&s.wall[2]-hypot(px-s.wall[0],py-s.wall[1])-ro<100){reason='wall_interference';interference=true;}
    // Parallel holding can occur on a bend; bend data is not accepted as a straight collision offset.
    if(tg&&!changed&&!interference&&remaining>150&&heading<rad(15)&&Math.abs(gap-pr.set)<8){pr.history.push({t:T,gap,err:Math.abs(gap-pr.set),ro,rt:tg.r,heading,lateral:Math.abs(lateral),speed:sp,boost:+boost,bend,contactBend:tg.contactBend});while(pr.history.length&&T-pr.history[0].t>1.5)pr.history.shift();}
    else pr.history=[];
    const a=pr.history,med=k=>a.map(q=>q[k]).sort((x,y)=>x-y)[a.length>>1],range=k=>Math.max(...a.map(q=>q[k]))-Math.min(...a.map(q=>q[k]));
    let valid=false;
    if(a.length>=15&&T-a[0].t>=.75&&T-pr.since>=1.5&&med('err')<2&&range('gap')<3&&med('heading')<rad(8)&&med('lateral')<10&&range('ro')<.3&&range('rt')<.3&&range('speed')<1&&range('boost')===0){
      pr.phase='follow';hold={t:T,target:tg.id,episode:pr.episode,set:pr.set,gap:med('gap'),duration:T-a[0].t,samples:a.length,heading:med('heading'),bend:med('bend'),speed:med('speed'),own_r:med('ro'),enemy_r:med('rt')};
```

## Classifier input and death gates
```python
 meta=json.loads((out/'summary.json').read_text()) if (out/'summary.json').exists() else {};protocol=meta.get('protocol','legacy_fallback');build=meta.get('build','unknown')
 rec=json.loads((out/f'slp_{k:02}.json').read_text());L=json.load(gzip.open(out/f'slp_{k:02}_log.json.gz'));rows=[dict(zip(L['keys'],r)) for r in L['log']];
 for row in rows:
  if row.get('t3_on')==1:
   for key,val in list(row.items()):
    if key.startswith('t3_'):row['t1_'+key[3:]]=val
   row['sp']=row.get('t3_speed');row['t1_phase']='follow' if row.get('t3_valid') else 'excluded'
 box=json.load(gzip.open(out/f'slp_{k:02}_box.json.gz'));frames=box['frames']
 levels=[];seen=set();samples=[];holds=[];hold_seen=set()
 for row in rows:
  if row.get('t1_on')!=1:continue
  if row.get('t3_hold'):
   h=row['t3_hold'];token=(h.get('episode'),h.get('set'),round(h.get('speed',0)))
   if token not in hold_seen:holds.append({**h,'t':row['t'],'game':k,'run':out.name,'build':build});hold_seen.add(token)
  if row.get('t1_level'):
   e=dict(row['t1_level']);e['t']=row['t'];e['game']=k;e['run']=out.name;e['kind']='alive';e['speed_class']=e.get('speed_class','boost_speed' if e.get('speed',0)>8 else 'cruise_speed');e['protocol']=protocol;e['build']=build;e['source']=str(out/f'slp_{k:02}_log.json.gz');token=(e['serial'],e['target'])
   if token not in seen:levels.append(e);seen.add(token)
  if row.get('t1_enemy_r') is not None:
   samples.append([round(row['t'],3),row['t1_own_r'],row['t1_enemy_r'],row['t1_gap'],row['t1_set'],row['t1_target'],row.get('t1_heading_error'),row.get('t1_lateral'),row.get('t1_bend'),row.get('t3_phase') or row.get('t1_phase'),row.get('t3_valid'),row.get('t3_reason'),row.get('boost'),row.get('sp'),row.get('t3_enemy_speed'),row.get('t3_boost_reason')])
 candidate=None;excluded=[]
 if not capped and rows and frames:
  row=rows[-1];fr=frames[-1];nb=nearest(fr);tid=row.get('t1_target');own=14.5*fr['sc'];same=[e for e in levels if e['target']==tid and row['t']-e['t']<2.5]
  if row.get('t1_phase')!='follow':excluded.append('사망 전 추종 중 아님')
  if not nb or nb['target']!=tid:excluded.append('최근접 몸통이 추종 대상과 다름')
  if not same:excluded.append('최근 2.5초 안정 유지 표본 없음')
  elif abs(same[-1]['speed']-fr['sp'])>.75 or same[-1].get('speed_class')!=('boost_speed' if fr['sp']>8 else 'cruise_speed'):excluded.append('안정 단계 이후 속도 조건 변화')
  if abs(row.get('t1_lateral') or 0)>10:excluded.append('빠른 수직 접근')
  if (row.get('t1_heading_error') or 0)>math.radians(6):excluded.append('평행 주행 아님')
  if row.get('t3_contact_bend') is None:
   if (row.get('t1_bend') or 0)>math.radians(6):excluded.append('곡선 몸통')
  elif (row.get('t1_bend') or 0)>math.radians(30) or row['t3_contact_bend']>math.radians(6):excluded.append('접촉 구간 곡률 큼')
  interval=fr['t']-frames[-2]['t'] if len(frames)>1 else None
  if interval is None or interval>.12:excluded.append('관측 공백 큼')
  window=rec['seconds']-fr['t']
  if not 0<=window<=.25:excluded.append('사망 전 관측 시점 불확실')
  head_d=min((math.hypot(fr['heads'][i]-fr['x'],fr['heads'][i+1]-fr['y']) for i in range(0,len(fr['heads']),5)),default=1e9)
  if head_d<250:excluded.append('다른 머리 간섭 가능')
  wall=fr['wall'];wall_gap=wall[2]-math.hypot(fr['x']-wall[0],fr['y']-wall[1])-own
  if wall_gap<100:excluded.append('맵 경계 간섭 가능')
  if nb:candidate={**nb,'geometry_class':'straight' if (row.get('t1_bend') or 0)<=math.radians(6) else 'gentle_curve','kind':'death_candidate' if not excluded else 'excluded_death','game':k,'run':out.name,'t':fr['t'],'set':row.get('t1_set'),'speed':fr['sp'],'speed_class':'boost_speed' if fr['sp']>8 else 'cruise_speed','boost_command':row.get('boost'),'gap_min':nb['gap'],'gap_max':nb['gap'],'death_window_s':window,'sample_interval_s':interval,'last_alive_gap':nb['gap'],'last_alive_distance':nb['distance'],'head_distance':head_d,'reasons':excluded,'protocol':protocol,'build':build,'source':str(out/f'slp_{k:02}_box.json.gz')}
 g={'protocol':protocol,'build':build,'game':k,'run':out.name,'seconds':rec['seconds'],'end':'cap' if capped else 'death','L_max':rec.get('L_max'),'errors':rec.get('errors'),'follow_samples':len(samples),'hold_episodes':len({h.get('episode') for h in holds}),'hold_stages':len(holds),'parallel_follow_ticks':sum(r.get('t3_phase')=='follow' for r in rows),'levels':len(levels),'candidate':candidate,'excluded':excluded,'parameters':rec.get('values')}
 a={'game':g,'levels':levels,'holds':holds,'samples':samples};(out/f'analysis_{k:02}.json').write_text(json.dumps(a,ensure_ascii=False,indent=2));return g

```

## Interpretation and limits
84 of 93 final phases are align or seek; 9 are follow. All final traces have guard_changed=1 and t3_valid=0. t3_valid is measurement eligibility, not actual phase. Classifier maps this flag into t1_phase and misleadingly labels all as not following. Removing this gate alone still yields zero qualified deaths because other gates fail. Guard/interference clears the rolling stability history; target acquisition restarts the nominal gap. These code facts and the last-phase distribution indicate poor acquisition and stable approach, not simply insufficient game count.

Boost is actually present: 1291 follow-phase speed>8 ticks, 995 valid boost ticks. No completed qualified boost levels in the fixed population. The approximate boost-window audit checks eligible constant-command windows only and omits some production predicates; overlapping window counts are not independent samples. The longest such segment fails median goal error (<2px) and gap range (<3px). This audit does not identify server collision thresholds or establish the causal contribution of each guard.
