from pathlib import Path
p=Path('research/v10_maze_2h_20261001');s=Path('ext/pilot.js').read_text()
a='''      const r=this.v9Roll(s,W,ph,root.st,0,.32,root.t,angle,false);if(!r.ok)continue;
      const joinRoot={...r,pts:[...root.pts,...r.pts],clear:Math.min(root.clear,r.clear)};
      const joined=this.v10Follow(s,W,ph,joinRoot,route,deadline,.64);if(!joined.ok)continue;'''
b='''      // Aim at the pellet again after each curved step. A fixed bearing
      // misses side pellets because the head cannot turn instantaneously.
      let st=root.st,t=root.t,clear=root.clear,ok=true,reached=false;const foodPts=[...root.pts],foodActions=[];
      const reach=14.5*s.sc+6,limit=Math.min(2.4,hypot(g.x-st.x,g.y-st.y)/Math.max(80,st.v)*2+.5);
      while(t-root.t<limit){
        if(performance.now()>deadline-2){ok=false;break;}
        if(hypot(g.x-st.x,g.y-st.y)<reach){reached=true;break;}
        const target=Math.atan2(g.y-st.y,g.x-st.x),r=this.v9Roll(s,W,ph,st,0,.1,t,target,false);
        if(!r.ok){ok=false;break;}clear=Math.min(clear,r.clear);foodPts.push(...r.pts);foodActions.push({start:t,end:r.t,target,boost:false});st=r.st;t=r.t;
      }
      if(!ok||!reached||!foodActions.length)continue;
      const r={ok:true,st,t,clear,pts:foodPts},joinRoot=r;
      const joined=this.v10Follow(s,W,ph,joinRoot,route,deadline,1.2);if(!joined.ok)continue;'''
assert a in s;s=s.replace(a,b)
s=s.replace('const food=this.v10Pellets(s,joined.pts,root.t+1),score=', 'const food=this.v10Pellets(s,joined.pts,t+1.2),score=')
s=s.replace('actions:[{start:root.t,end:root.t+.13,target:angle,boost:false},...joined.actions]', 'actions:[...foodActions,...joined.actions]')
s=s.replace('const nominal=this.v10Pellets(s,route.pts,root.t+1),targets=[];', 'const nominal=this.v10Pellets(s,route.pts,root.t+1),targets=[],feedHeads=this.v10Blockers(s,W);')
s=s.replace('const food=this.v10Pellets(s,joined.pts,t+1.2),score=weight*food-gap*.003;', """const food=this.v10Pellets(s,joined.pts,t+1.2),feedRisk=this.v10Closure(joined.pts,feedHeads).risk;
      const baseRisk=this.v10Closure(route.pts.filter((_,i)=>route.pts[i-i%5]<=t+1.2),feedHeads).risk,riskDelta=Math.max(0,feedRisk-baseRisk);
      const appetite=clip((this.values.V10_FOOD_RISK??0)/100,0,1),score=weight*food-gap*.003-(8-7*appetite)*riskDelta;""")
s=s.replace('food>0&&(g.held||score>bestScore+.02)', 'food>0&&(g.held&&riskDelta<=.02||score>bestScore+.02)')
s=s.replace('    return best;\n  }\n  v10Step(s)', """    if(best.feedPrefix){
      const full=[...best.feedPrefix],end=full.length-5,original=route.pts;let nearest=Infinity,idx=-1;
      for(let i=0;i<original.length;i+=5){const d=hypot(original[i+1]-full[end+1],original[i+2]-full[end+2]);if(d<nearest){nearest=d;idx=i;}}
      if(idx>=0){const shift=full[end]-original[idx];for(let i=idx+5;i<original.length;i+=5)full.push(original[i]+shift,...original.slice(i+1,i+5));}
      best={...best,pts:full,feedPrefix:full,closure:this.v10Closure(full,feedHeads)};
    }
    return best;
  }
  v10Step(s)""")
s=s.replace('picked=this.v10FeedPrefix(s,PW,ph,root,picked,deadline);action=', 'picked=this.v10FeedPrefix(s,PW,ph,root,picked,deadline);valid[0]=picked;action=')
(p/'pilot_food_pursuit_candidate.js').write_text(s)
