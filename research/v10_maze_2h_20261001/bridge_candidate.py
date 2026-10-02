from pathlib import Path
p=Path('research/v10_maze_2h_20261001')
s=(p/'pilot_feed_hold_candidate.js').read_text()
needle='    const picked=this.v10Choose(routes,old?.id);'
insert='''    // A geometric corridor can start behind the current turning circle.
    // Search a short collision-checked manoeuvre, then verify the resulting
    // complete guide again with the same follower used by the actuator.
    if(!routes.length&&goals.length&&performance.now()<deadline-5){
      bridge:for(const offset of [0,-.6,.6,-1.2,1.2,-2,2,Math.PI])for(const boost of [false,true]){
        if(performance.now()>deadline-5)break bridge;
        if(boost&&(!(V.V10_ESCAPE_BOOST??1)||s.L<(V.V2_MINL??30)))continue;
        const seedRoll=this.v9Roll(s,PW,ph,root.st,0,.39,root.t,root.st.h+offset,boost);
        if(!seedRoll.ok)continue;
        const seed={...seedRoll,pts:[...root.pts,...seedRoll.pts],clear:Math.min(root.clear,seedRoll.clear)};
        for(const g of goals){
          if(performance.now()>deadline-4)break bridge;
          const joined=this.v10Follow(s,PW,ph,seed,{...g,useBoost:boost},deadline);
          if(!joined.ok)continue;
          const guide={...g,useBoost:boost,kind:'maneuver_escape',entry:{until:s.t+seedRoll.t,target:root.st.h+offset,boost}};
          if(accept(guide,g.preferred&&old?old.id:`${ver}:maneuver${g.sector}`))break bridge;
        }
      }
    }
'''
assert s.count(needle)==1
s=s.replace(needle,insert+needle)
s=s.replace("      let nearest=Infinity,projection=null;", """      if(route.entry&&s.t+t<route.entry.until-1e-6){
        const dt=Math.min(.13,route.entry.until-s.t-t),e=route.entry;
        const r=this.v9Roll(s,W,ph,st,0,dt,t,e.target,e.boost&&boostPurpose(st));
        clear=Math.min(clear,r.clear);if(!r.ok){reason='collision';break;}
        actions.push({start:t,end:r.t,target:e.target,boost:e.boost&&boostPurpose(st)});pts.push(...r.pts);travel+=hypot(r.st.x-st.x,r.st.y-st.y);st=r.st;t=r.t;continue;
      }
      let nearest=Infinity,projection=null;""")
s=s.replace('  v10FeedPrefix(s,W,ph,root,route,deadline) {', '  v10FeedPrefix(s,W,ph,root,route,deadline) {\n    if(route.entry && s.t+root.t<route.entry.until)return route;')
s=s.replace("'score','foodTarget'].map", "'score','foodTarget','entry'].map")
(p/'pilot_bridge_candidate.js').write_text(s)
