import gzip,json,math,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent));from report import analyse
out=Path(__file__).resolve().parent/'report_check';out.mkdir(exist_ok=True)
keys=['t','t2_on','t2_phase','t2_target','t2_set','t2_lateral','t2_heading_error','t2_bend','t2_enemy_r','t2_own_r','t2_gap','t2_level','t2_valid','t2_reason']
e={'serial':1,'t':9.9,'target':9,'own_r':14.5,'enemy_r':20,'set':1,'gap':1.1,'gap_min':1,'gap_max':1.2,'samples':20,'duration':.8,'speed':5.8,'heading':0,'lateral':1}
row=[9.9,1,'follow',9,1,1,0,0,20,14.5,1.1,e,1,'clean']
fr={'t':9.92,'x':30000,'y':30034,'sc':1,'segs':[29000,30000,31000,30000,20],'sid':[9],'heads':[],'hid':[],'sp':5.8,'wall':[30000,30000,20000]}
rec={'seconds':10,'L_max':100,'errors':0};(out/'slp_01.json').write_text(json.dumps(rec))
def write(rows,frames):
 for name,data in [('log',{'keys':keys,'log':rows}),('box',{'frames':frames})]:
  with gzip.open(out/f'slp_01_{name}.json.gz','wt') as f:json.dump(data,f)
write([row],[{**fr,'t':9.88},fr]);a=analyse(out,1,False);assert a['candidate']['kind']=='death_candidate';assert a['candidate']['gap']==-.5
row[5]=40;write([row],[{**fr,'t':9.88},fr]);a=analyse(out,1,False);assert a['candidate']['kind']=='excluded_death';assert '빠른 수직 접근' in a['excluded']
a=analyse(out,1,True);assert a['candidate'] is None
(out/'result.json').write_text(json.dumps({'deathCandidateRequiresCleanFollow':True,'fastApproachExcluded':True,'capNotDeath':True,'syntheticFixtureOnly':True},indent=2));print('report classification checks passed')
