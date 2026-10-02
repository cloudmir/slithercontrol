from pathlib import Path
s=Path('ext/pilot.js').read_text()
s=s.replace('edge,deadline,preferred=null) {','edge,deadline,preferred=null,foodTargets=[]) {')
s=s.replace('const exits=new Map();let expanded=0;','const exits=new Map(),foodNodes=new Map();let expanded=0;')
s=s.replace("if(preferred&&!exits.has('held')", "for(let f=0;f<foodTargets.length;f++){const g=foodTargets[f];if(!foodNodes.has(f)&&hypot(p.x-g.x,p.y-g.y)<cell*1.5&&W.check(p,g,0,0,.5,false)>=0)foodNodes.set(f,k);}\n      if(preferred&&!exits.has('held')")
anchor="    return {guides,expanded,reason:guides.length?'maze':heap.length?'grid_budget':'grid_disconnected'};"
extra="""    // A food waypoint is admissible only with a connected continuation to
    // an existing exit. It cannot replace escape search with a dead-end goal.
    const foodGuides=[];
    for(const [f,k] of foodNodes){
      const food=foodTargets[f],chain=[];for(let q=k;q>=0;q=parent[q]){chain.push(point(q));if(q===start)break;}chain.reverse();chain.push({x:food.x,y:food.y});
      const prefix=[chain[0]];let i=0;
      while(i<chain.length-1){let next=i+1;for(let j=chain.length-1;j>i;j--)if(W.check(chain[i],chain[j],0,0,.5,false)>=0){next=j;break;}if(W.check(chain[i],chain[next],0,0,.5,false)<0){prefix.length=0;break;}prefix.push(chain[next]);i=next;}
      if(prefix.length<2)continue;let best=null;
      for(const exit of guides)for(let j=1;j<exit.path.length;j++){
        if(W.check(food,exit.path[j],0,0,.5,false)<0)continue;
        const path=[...prefix,...exit.path.slice(j)];let length=0;for(let q=1;q<path.length;q++)length+=hypot(path[q].x-path[q-1].x,path[q].y-path[q-1].y);
        if(!best||length<best.length)best={...exit,path,length,kind:'food_escape',preferred:false,foodTarget:food,foodIndex:f,score:-length};
      }
      if(best)foodGuides.push(best);
    }
    guides.push(...foodGuides);
"""
assert anchor in s;s=s.replace(anchor,extra+anchor)
s=s.replace('*.55),old?.goal);','*.55),old?.goal,(V.V10_FOOD_W??2)>0?foods:[]);')
s=s.replace('return g.length-(V.V10_FOOD_W??2)*food*200-', 'return g.length-(V.V10_FOOD_W??2)*(food*200+(g.foodTarget?800*g.foodTarget.mass/(g.foodTarget.mass+80):0))-')
s=s.replace('`${ver}:${g.sector}`;','`${ver}:${g.kind===\'food_escape\'?\'food\'+g.foodIndex:g.sector}`;')
Path('research/v10_maze_2h_20261001/pilot_food_candidate.js').write_text(s)
