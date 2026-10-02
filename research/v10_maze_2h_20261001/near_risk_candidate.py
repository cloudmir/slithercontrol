from pathlib import Path
p=Path('research/v10_maze_2h_20261001');s=Path('ext/pilot.js').read_text()
s=s.replace('let slack=Infinity,exposure=0,weight=0,first=Infinity,enemy=null;', 'let slack=Infinity,exposure=0,weight=0,nearExposure=0,nearWeight=0,first=Infinity,enemy=null;')
s=s.replace('exposure+=wt*clip(-margin/.6,0,1);weight+=wt;', 'const hazard=clip(-margin/.6,0,1);exposure+=wt*hazard;weight+=wt;\n      if(pts[i]<1.2){const f=Math.min(1,(1.2-pts[i])/Math.max(1e-6,dt));nearExposure+=wt*f*hazard;nearWeight+=wt*f;}')
s=s.replace('return {risk:weight?exposure/weight:0,slack:', 'const longRisk=weight?exposure/weight:0,nearRisk=nearWeight?nearExposure/nearWeight:0;\n    return {risk:Math.max(longRisk,nearRisk),longRisk,nearRisk,slack:')
s=s.replace('v10_closure_risk:picked?.closure.risk??null,', 'v10_closure_risk:picked?.closure.risk??null,v10_near_risk:picked?.closure.nearRisk??null,v10_long_risk:picked?.closure.longRisk??null,')
(p/'pilot_near_risk_candidate.js').write_text(s)
