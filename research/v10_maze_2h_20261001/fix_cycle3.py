from pathlib import Path
p=Path('ext/pilot.js');s=p.read_text();s=s.replace('const old=this.v10Committed;','const old=s.selectedGuide===undefined?this.v10Committed:s.selectedGuide;')
s=s.replace("this.last={trace,mode,plan:pts,controls:[{...action", "this.last={trace,mode,selectedGuide:picked?Object.fromEntries(['id','t0','path','goal','length','kind','sector','lookScale','useBoost','score'].map(k=>[k,picked[k]])):null,plan:pts,controls:[{...action")
p.write_text(s)
p=Path('ext/mod.js');s=p.read_text();s=s.replace('trace: pilot.last.trace, plan:', 'trace: pilot.last.trace, selectedGuide:pilot.last.selectedGuide, plan:')
s=s.replace('st.threat=threat;', 'st.threat=threat;st.selectedGuide=last?.selectedGuide??null;')
s=s.replace('wall: st.wall, L: st.L, viewRadius:st.viewRadius, route:', 'wall: st.wall, L: st.L, viewRadius:st.viewRadius, threat:st.threat?{...st.threat,t0:st.threat.t0-game.t0/1000}:undefined, selectedGuide:st.selectedGuide?{...st.selectedGuide,t0:st.selectedGuide.t0-game.t0/1000}:null, route:')
p.write_text(s)
