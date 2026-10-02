from pathlib import Path
import json
p=Path('ext/pilot.js');s=p.read_text()
start=s.index('  v9Route(s, ver)');end=s.index('\n  v8Values(six)',start)
v=s[start:end]
helper='''  v9FoodGoals(s) {
    const V = this.values, bins = new Map(), cell = V.V9_HEAP_SIZE ?? 160;
    if (!(V.V9_FOOD_W ?? 2)) { this.v9FoodTarget = null; return []; }
    for (let i = 0; i + 2 < (s.food || []).length; i += 3) {
      const [x,y,m] = s.food.slice(i,i+3), d = hypot(x-s.x,y-s.y);
      if (![x,y,m].every(Number.isFinite) || m < (V.V9_REMAINS_MIN ?? 12) || d > (V.V9_FOOD_R ?? 3000) || d < R*s.sc*.6) continue;
      const key = Math.floor(x/cell)+','+Math.floor(y/cell);
      if (!bins.has(key)) bins.set(key,{mass:0,points:[],sx:0,sy:0});
      const g=bins.get(key);g.mass+=m;g.sx+=x*m;g.sy+=y*m;g.points.push([x,y]);
    }
    const goals = [...bins.values()].map(g=>{
      const cx=g.sx/g.mass,cy=g.sy/g.mass;
      // Target a real pellet, not a centroid that could lie inside an enemy wall.
      g.points.sort((a,b)=>hypot(a[0]-cx,a[1]-cy)-hypot(b[0]-cx,b[1]-cy));
      const [x,y]=g.points[0],d=hypot(x-s.x,y-s.y);
      return {x,y,mass:g.mass,d,score:g.mass/(d+180)};
    }).sort((a,b)=>b.score-a.score);
    const prev=this.v9FoodTarget, old=prev && goals.find(g=>hypot(g.x-prev.x,g.y-prev.y)<cell*.8);
    if(old && s.t-prev.since<(V.V9_TARGET_HOLD ?? 1.2) && goals[0].score<old.score*1.5) {
      goals.splice(goals.indexOf(old),1);goals.unshift(old);old.since=prev.since;
    }
    if(goals.length) { goals[0].since ??= s.t;this.v9FoodTarget=goals[0]; } else this.v9FoodTarget=null;
    return goals;
  }
'''
v=v.replace("const routes = [], C = 32", "const foodGoals = this.v9FoodGoals(s), foodTarget = foodGoals[0] || null;\n    const routes = [], C = 32")
v=v.replace("routes, reason, certified:","routes, reason, foodTarget, certified:")
v=v.replace("const order = goals.map((g, k) => ({k, d: g.length ? Math.min(...g.map(i => distance[i])) + Math.min(k, 8 - k) * 2 : Infinity})).filter(g => Number.isFinite(g.d)).sort((a, b) => a.d - b.d);",'''const centerDistance=hypot(s.x-s.wall[0],s.y-s.wall[1]);
    const preference = q => {
      const food = foodTarget ? (foodTarget.d-hypot(q.x-foodTarget.x,q.y-foodTarget.y))/edge : 0;
      const center = (centerDistance-hypot(q.x-s.wall[0],q.y-s.wall[1]))/edge * Math.min(1,centerDistance/2000);
      return (V.V9_FOOD_W ?? 2)*food*20+(V.V9_CENTER_W ?? 2)*center*8;
    };
    const order = goals.map((g,k)=>({k,cells:g,kind:'escape',d:g.length?Math.min(...g.map(i=>distance[i]))+Math.min(k,8-k)*2-Math.max(...g.map(i=>preference(xy(i)))):Infinity}))
      .filter(g=>Number.isFinite(g.d)).sort((a,b)=>a.d-b.d);
    // Food within the observed map gets an exact target; distant food biases
    // reachable exits only. Never certify the unobserved leg to distant food.
    const foodJobs=[];
    for(const target of foodGoals.slice(0,3)) {
      if(target.d>W.obs-80) continue;
      const cells=queue.filter(i=>hypot(xy(i).x-target.x,xy(i).y-target.y)<48);
      if(cells.length) foodJobs.push({kind:'food',target,cells,k:-1,d:-100});
    }
    order.unshift(...foodJobs.slice(0,1));''')
v=v.replace("q = [...goals[goal.k]]; for (const i of q)","q = [...goal.cells]; for (const i of q)")
v=v.replace("if (hypot(n.st.x - s.x, n.st.y - s.y) >= edge && sector(n.st) === goal.k) { found = n; break; }",'''const reached = goal.kind==='food' ? hypot(n.st.x-goal.target.x,n.st.y-goal.target.y)<=Math.max(20,W.ro*.8) : hypot(n.st.x-s.x,n.st.y-s.y)>=edge && sector(n.st)===goal.k;
        if (reached) {
          // Keep a checked coast after a food pickup; do not end on a pellet
          // with an untested wall immediately beyond it.
          const tail=goal.kind==='food'?this.v9Roll(s,W,ph,n.st,0,.6,n.t,n.st.h,false):null;
          if(!tail || tail.ok) { found=tail?{st:tail.st,t:tail.t,parent:n,part:tail.pts,action:{start:n.t,end:tail.t,target:n.st.h,turn:0,boost:false},clear:Math.min(n.clear,tail.clear)}:n;break; }
        }''')
v=v.replace("for (const turn of [0, -.5, .5, -1, 1]) {\n          const target",'''const targetFood=goal.target || foodTarget, fd=targetFood?hypot(targetFood.x-n.st.x,targetFood.y-n.st.y):0;
        const wantsBoost=!!V.V9_BOOST_ON && targetFood && targetFood.mass>=(V.V9_BOOST_MIN_MASS ?? 48) && fd>=(V.V9_BOOST_MIN_DIST ?? 180) && Math.abs(wrap(Math.atan2(targetFood.y-n.st.y,targetFood.x-n.st.x)-n.st.h))<rad(65);
        for (const boost of wantsBoost?[true,false]:[false]) for (const turn of [0, -.5, .5, -1, 1]) {
          const target''')
v=v.replace(".28, n.t, target);", ".28, n.t, target, boost);")
v=v.replace("turn, target}, turnCost", "turn, target, boost}, turnCost")
v=v.replace("if (!routes.some(r => Math.abs(wrap(r.angle - endAngle)) < rad(25))) routes.push({pts, actions, angle: endAngle, clear: found.clear, duration: found.t, goal: [found.st.x, found.st.y]});", "if (goal.kind==='food' || !routes.some(r => r.kind!=='food' && Math.abs(wrap(r.angle - endAngle)) < rad(25))) routes.push({pts, actions, kind:goal.kind, target:goal.target || foodTarget, angle: endAngle, clear: found.clear, duration: found.t, goal: [found.st.x, found.st.y]});")
v=v.replace("let reason = !source", "const foods=this.v9FoodGoals(s), target=foods[0] || null;\n    const hasFood=t=>t && foods.some(f=>hypot(f.x-t.x,f.y-t.y)<(V.V9_HEAP_SIZE ?? 160));\n    let reason = !source")
v=v.replace("let st = root.st, t = root.t, pts = [...root.pts], controls = [], clear = root.clear, ok = true;", "if (route.kind==='food' && !hasFood(route.target)) continue;\n      if (route.actions.some(a=>a.boost) && (!V.V9_BOOST_ON || !hasFood(route.target))) continue;\n      let st = root.st, t = root.t, pts = [...root.pts], controls = [], clear = root.clear, ok = true;")
v=v.replace("t, a.target);", "t, a.target, !!a.boost);")
v=v.replace("end: until, target: a.target}", "end: until, target: a.target, boost:!!a.boost}")
v=v.replace("if (ok && radial >= edge - ph.cs * (V.V9_ROUTE_AGE ?? .65) && t > root.t + .5) valid.push({pts, controls, clear, end: st, duration: t});",'''let foodReached=false;
      if(route.kind==='food') for(let i=0;i<pts.length;i+=5) if(hypot(pts[i+1]-route.target.x,pts[i+2]-route.target.y)<=Math.max(24,W.ro)) {foodReached=true;break;}
      if (ok && (route.kind==='food' ? foodReached : radial >= edge - ph.cs * (V.V9_ROUTE_AGE ?? .65)) && t > root.t + .1) valid.push({pts, controls, clear, end: st, duration: t, kind:route.kind || 'escape', target:route.target});''')
v=v.replace("let selected = valid[0], unsafe = false;",'''const score = r => {
      let progress=0;
      if(target) { let closest=target.d;for(let i=0;i<r.pts.length;i+=5) closest=Math.min(closest,hypot(r.pts[i+1]-target.x,r.pts[i+2]-target.y));progress=(target.d-closest)/Math.max(180,target.d); }
      const centerD=hypot(s.x-s.wall[0],s.y-s.wall[1]),center=(centerD-hypot(r.end.x-s.wall[0],r.end.y-s.wall[1]))/Math.max(300,V.V9_EDGE ?? 900)*Math.min(1,centerD/2000);
      return (V.V9_FOOD_W ?? 2)*progress*10+(V.V9_CENTER_W ?? 2)*center - r.duration*.08;
    };
    valid.sort((a,b)=>score(b)-score(a));
    let selected = valid[0], unsafe = false;''')
v=v.replace("boost: false, cmd: r1(deg(cmd))", "boost: !!selected.controls?.[0]?.boost, cmd: r1(deg(cmd))")
v=v.replace("mode: valid.length ? 'v9escape'", "mode: valid.length ? (selected.kind==='food'?'v9food':target?'v9seek':'v9escape')")
v=v.replace("v6_intent: 'escape',", "v6_intent: selected.kind==='food'?'food':target?'seek':'escape', v9_goal_x:target?.x, v9_goal_y:target?.y, v9_goal_mass:target?.mass || 0,")
v=v.replace("v9At: s.t, v9Paths:", "v9FoodPath: selected.kind==='food', v9At: s.t, v9Paths:")
v=v.replace("goal: null, ro: W.ro", "goal: target ? [target.x,target.y] : null, ro: W.ro")
v=v.replace("this.prev = cmd; this.prevBoost = false; return [cmd, false];", "this.prev = cmd; this.prevBoost = trace.boost; return [cmd, trace.boost];")
s=s[:start]+helper+v+s[end:];p.write_text(s)
# Single source of parameter defaults and controls.
p=Path('params.json');c=json.loads(p.read_text())
items=[('V9_FOOD_W','잔해 추종 가중치',2,0,10,.5),('V9_FOOD_R','잔해 탐색 범위',3000,500,5000,100),('V9_BOOST_ON','잔해 적극 부스트',1,0,1,1),('V9_CENTER_W','중앙 이동 가중치',2,0,10,.5),('V9_REMAINS_MIN','잔해 판정 최소 크기',12,10,30,1),('V9_HEAP_SIZE','잔해 묶음 범위',160,80,400,20),('V9_BOOST_MIN_MASS','부스트 최소 잔해량',48,0,500,8),('V9_BOOST_MIN_DIST','부스트 최소 거리',180,50,800,10),('V9_TARGET_HOLD','목표 유지 시간',1.2,0,5,.2)]
for k,label,value,mi,ma,st in items:c['defaults'][k]=value;c['presets']['v9_maze']['values'][k]=value
c['ui'][0]['items'][1:1]=[[k,label,mi,ma,st,True] for k,label,value,mi,ma,st in items]
p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
p=Path('ext/mod.js');s=p.read_text()
s=s.replace("RF2 = (seven ?", "RF2 = (nine ? Math.max(FOOD_RADIUS,S.values.V9_FOOD_R ?? 3000) : seven ?")
s=s.replace("applyCmd(action.target, false, 'v9_controls')", "applyCmd(action.target, !!action.boost, 'v9_controls')")
s=s.replace("draw: {v9At: d.v9At", "draw: {v9FoodPath:d.v9FoodPath, v9At: d.v9At")
s=s.replace("`V9 · 관측 내 탈출 ${candidates.length}개`", "`V9 · ${d.v9FoodPath ? '잔해 경로' : '관측 내 탈출'} ${candidates.length}개`")
s=s.replace("'v9_plan_ms']", "'v9_plan_ms', 'v9_goal_x', 'v9_goal_y', 'v9_goal_mass']")
s=s.replace("tr.v9_plan_ms]);", "tr.v9_plan_ms, tr.v9_goal_x, tr.v9_goal_y, tr.v9_goal_mass]);")
entries=[]
helptext=['관측된 큰 먹이를 향하는 경로 선호. 0이면 잔해 목표 끔','보이는 잔해의 목표 탐색 반경 (px). 미로 밖 구간은 접근 방향만 안내','검사에 통과한 잔해 접근 경로에서 부스트 사용','안전 후보의 맵 중심 접근 선호. 0이면 끔','크기로 사체 먹이를 추정. 기본12; 일반 작은 먹이 제외','가까운 잔해를 하나의 목표로 묶는 범위 (px)','이 크기 합계 이상인 잔해 묶음에 부스트 허용','목표 가까이에서는 부스트를 끄고 감속 (px)','비슷한 목표 사이의 잦은 전환을 억제. 먹이가 사라지면 즉시 해제']
for (k,label,*_),desc in zip(items,helptext):entries.append(f"sw('{k}', '{label}', '{desc}')")
s=s.replace("? [sw('V9_OBS'", "? ["+', '.join(entries)+", sw('V9_OBS'",1)
p.write_text(s)
