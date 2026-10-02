from pathlib import Path
s=Path('ext/pilot.js').read_text()
s=s.replace('const weight=this.values.V10_FOOD_W??2;if(weight<=0)return route;', 'const weight=this.values.V10_FOOD_W??2;if(weight<=0){this.v10FeedTarget=null;return route;}')
s=s.replace('const nominal=this.v10Pellets(s,route.pts,root.t+1),targets=[];', '''const nominal=this.v10Pellets(s,route.pts,root.t+1),targets=[];
    let held=this.v10FeedTarget;
    if(held&&(held.routeId!==route.id||s.t-held.t>(this.values.V9_TARGET_HOLD??1.2)||hypot(held.x-s.x,held.y-s.y)<14.5*s.sc+6||!s.food.some((x,i)=>i%3===0&&hypot(x-held.x,s.food[i+1]-held.y)<12)))held=null;
    this.v10FeedTarget=held;''')
s=s.replace('targets.sort((a,b)=>b.value-a.value);let best=route', "targets.sort((a,b)=>b.value-a.value);if(held)targets.unshift({...held,held:true});let best=route")
s=s.replace('if(score>bestScore+.02){bestScore=score;best={...route,feedPrefix:', 'if(food>0&&(g.held||score>bestScore+.02)){bestScore=score;best={...route,feedTarget:g,feedPrefix:')
s=s.replace('    }return best;\n  }\n  v10Step(s)', '''      if(g.held&&best.feedPrefix)break;
    }
    if(best.feedTarget)this.v10FeedTarget={x:best.feedTarget.x,y:best.feedTarget.y,routeId:route.id,t:held&&best.feedTarget.held?held.t:s.t};
    else if(performance.now()<deadline-2)this.v10FeedTarget=null;
    return best;
  }
  v10Step(s)''')
s=s.replace('if(performance.now()>deadline)break;\n    }\n    const heldBefore', 'if(performance.now()>deadline-(this.v10FeedTarget?3:0))break;\n    }\n    const heldBefore')
s=s.replace('setParams(values, profile) { this.v10RouteId = null;', 'setParams(values, profile) { this.v10FeedTarget=null;this.v10Held=null;this.v10Invalid=null;this.v10RouteId = null;')
Path('research/v10_maze_2h_20261001/pilot_feed_hold_candidate.js').write_text(s)
