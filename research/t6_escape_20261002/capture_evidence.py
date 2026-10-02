import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'research/t6_escape_20261002'
pilot=(ROOT/'ext/pilot.js').read_text();parts=['# T6 외곽선 탈출 — 구현·검증·릴리즈 원본\n\nUser direct request: 지금 기능을 이용해서 밖으로 빠르게 빠져나가는 회피 알고리즘을 민들어보자\n']
parts.append((OUT/'README.md').read_text())
for title,filename in [('Original closed-loop and replay verification output','check.json'),('Actual local Chromium / Worker output','mock.json'),('Windows extension release verification / production hashes','release.json')]:
 parts.append('\n## '+title+'\n\n```json\n'+(OUT/filename).read_text()+'\n```\n')
parts.append('\n## Exact T6 production methods\n\n```javascript\n'+pilot[pilot.index('  t6World(s) {'):pilot.index('  t5Step(s) {')]+'\n```\n')
(OUT/'evidence.md').write_text('\n'.join(parts));print('T6 evidence captured')
