from pathlib import Path
s=Path('ext/pilot.js').read_text()
s=s.replace('const boostPurpose=this.v9FoodGoals(s,true).length>0||s.heads.length>0;', '''const foodTarget=route.foodTarget,liveFood=foodTarget&&s.food.some((x,i)=>i%3===0&&hypot(x-foodTarget.x,s.food[i+1]-foodTarget.y)<80);
    const boostPurpose=st=>{let pressure=false;for(let i=0;i<s.heads.length;i+=5)if(hypot(st.x-s.heads[i],st.y-s.heads[i+1])<700){pressure=true;break;}
      const fd=foodTarget?hypot(st.x-foodTarget.x,st.y-foodTarget.y):0,toward=foodTarget?((foodTarget.x-st.x)*Math.cos(st.h)+(foodTarget.y-st.y)*Math.sin(st.h))/Math.max(1,fd):0;
      return pressure||liveFood&&foodTarget.mass>=(this.values.V9_BOOST_MIN_MASS??40)&&fd>(this.values.V9_BOOST_MIN_DIST??180)&&toward>.7;};''')
s=s.replace('const boost=boostPurpose && !!route.useBoost', 'const boost=s.L>=(this.values.V2_MINL??30)&&boostPurpose(st) && !!route.useBoost')
old='''      const r=this.v10Follow(s,PW,ph,root,guide,deadline);
      if(!r.ok){failures[r.reason]=(failures[r.reason]||0)+1;return false;}
      const closure=this.v10Closure(r.pts,heads),foodValue=this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods));'''
new='''      let r=this.v10Follow(s,PW,ph,root,guide,deadline);
      if(!r.ok){failures[r.reason]=(failures[r.reason]||0)+1;return false;}
      let closure=this.v10Closure(r.pts,heads),foodValue=this.v10FoodValue(foods,this.v10FoodRewards(s,r.pts,foods));
      // Speed is a control choice on the same corridor, not a new direction.
      const boostEligible=(V.V10_ESCAPE_BOOST??1)&&s.L>=(V.V2_MINL??30)&&(heads.some(h=>hypot(h.x-s.x,h.y-s.y)<700)||guide.foodTarget?.mass>=(V.V9_BOOST_MIN_MASS??40));
      if(!guide.useBoost&&routes.length===0&&boostEligible&&performance.now()<deadline-6){
        const bg={...guide,useBoost:true},br=this.v10Follow(s,PW,ph,root,bg,deadline);
        if(br.ok){const bc=this.v10Closure(br.pts,heads),bf=this.v10FoodValue(foods,this.v10FoodRewards(s,br.pts,foods));
          const current={closure,foodValue,...this.v10Utility(s,r.pts,foods,r.actions),score:0},fast={closure:bc,foodValue:bf,...this.v10Utility(s,br.pts,foods,br.actions),score:0};
          if(this.v10Compare(fast,current)<-.03){guide=bg;r=br;closure=bc;foodValue=bf;}
        }
      }'''
assert old in s;s=s.replace(old,new)
Path('research/v10_maze_2h_20261001/pilot_boost_candidate.js').write_text(s)
