from pathlib import Path
s=Path('research/v10_maze_2h_20261001/pilot_boost_candidate.js').read_text()
s=s.replace(',...foodTargets.map(g=>hypot(g.x-p.x,g.y-p.y))','')
s=s.replace('    const foodGuides=[];','''    const mainHadFrontier=heap.length>0,foodParents=new Map();
    // Food searches share the remaining geometry budget. They cannot consume
    // the time reserved for finding the first escape connection.
    if(guides.length)for(let f=0;f<foodTargets.length;f++){
      if(foodNodes.has(f)||performance.now()>deadline-2)continue;
      const target=foodTargets[f],fd=new Float64Array(N).fill(Infinity),fp=new Int32Array(N).fill(-1);heap.length=0;
      const key=k=>{const p=point(k);return fd[k]+hypot(p.x-target.x,p.y-target.y);};fd[start]=0;push(start,key(start));let steps=0;
      while(heap.length){
        if((steps++&31)===0&&performance.now()>deadline)break;
        const [k,score]=pop();if(Math.abs(score-key(k))>1e-7)continue;const p=point(k);
        if(hypot(p.x-target.x,p.y-target.y)<cell*1.5&&W.check(p,target,0,0,.5,false)>=0){foodNodes.set(f,k);foodParents.set(f,fp);break;}
        const i=k%n,j=Math.floor(k/n);for(const [dx,dy]of dirs){const x=i+dx,y=j+dy;if(x<0||y<0||x>=n||y>=n)continue;const q=at(x,y);if(blocked[q]||dx&&dy&&(blocked[at(i+dx,j)]||blocked[at(i,j+dy)]))continue;
          const nd=fd[k]+cell*(dx&&dy?Math.SQRT2:1)*(1+.6*Math.max(0,(32-clearance[q])/32)**2);if(nd>=fd[q])continue;fd[q]=nd;fp[q]=k;push(q,key(q));}
      }
    }
    const foodGuides=[];''')
s=s.replace('const food=foodTargets[f],chain=[];for(let q=k;q>=0;q=parent[q])', 'const food=foodTargets[f],chain=[],parents=foodParents.get(f)||parent;for(let q=k;q>=0;q=parents[q])')
s=s.replace("reason:guides.length?'maze':heap.length?'grid_budget':'grid_disconnected'", "reason:guides.length?'maze':mainHadFrontier?'grid_budget':'grid_disconnected'")
# Try a faster crossing on the SAME geometrical route when cruise arrives too late.
old='''      let r=this.v10Follow(s,PW,ph,root,guide,deadline);
      if(!r.ok){failures[r.reason]=(failures[r.reason]||0)+1;return false;}'''
new='''      const boostEligible=(V.V10_ESCAPE_BOOST??1)&&s.L>=(V.V2_MINL??30)&&(heads.some(h=>hypot(h.x-s.x,h.y-s.y)<700)||guide.foodTarget?.mass>=(V.V9_BOOST_MIN_MASS??40));
      let r=this.v10Follow(s,PW,ph,root,guide,deadline);
      if(!r.ok&&r.reason!=='budget'&&!guide.useBoost&&boostEligible&&performance.now()<deadline-4){const bg={...guide,useBoost:true},br=this.v10Follow(s,PW,ph,root,bg,deadline);if(br.ok){guide=bg;r=br;}}
      if(!r.ok){failures[r.reason]=(failures[r.reason]||0)+1;return false;}'''
assert old in s;s=s.replace(old,new)
line='      const boostEligible=(V.V10_ESCAPE_BOOST??1)&&s.L>=(V.V2_MINL??30)&&(heads.some(h=>hypot(h.x-s.x,h.y-s.y)<700)||guide.foodTarget?.mass>=(V.V9_BOOST_MIN_MASS??40));'
first=s.index(line);second=s.index(line,first+len(line));s=s[:second]+s[second+len(line):]
Path('research/v10_maze_2h_20261001/pilot_cycle6_candidate.js').write_text(s)
