import json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'research/t5_contours_20261002'
pilot=(ROOT/'ext/pilot.js').read_text();mod=(ROOT/'ext/mod.js').read_text()
parts=['# T5 전체 적 외곽선 표시·릴리즈 원본\n\nUser direct request: 이번에는 주변에 있는 모든 적들의 외곽선라인 (지금 주행라인으로 그리고 있는) 을 그리는 기능을 개발해서 릴리즈해줘 T5로\n\nScope: T4 follower retained; T5 adds two offset rails for all visible live enemies, including short and unselected enemies. The rails are head-centre guide lines, not literal sprite borders or certified safe paths. Offset = enemy radius + own radius + T4_GAP (currently user-selected -5px).\n\nWindows existing MOD extension reloaded while idle, T5 selected, existing T4 tuning and bot state preserved; no game started. Build 1002-9011616e.']
for title,filename in [('Geometry and recorded replay output','check.json'),('Real local Chromium / Worker verification','mock.json'),('Windows release before / after and production hashes','release.json')]:
 parts.append('\n## '+title+'\n\n```json\n'+(OUT/filename).read_text()+'\n```\n')
parts.append('\n## Exact production geometry\n\n```javascript\n'+pilot[pilot.index('function t5Contours('):pilot.index('\nclass Pilot {',pilot.index('function t5Contours('))]+'\n```\n')
parts.append('\n## Exact follower wrapper\n\n```javascript\n'+pilot[pilot.index('  t5Step(s) {'):pilot.index('  t4Step(s) {')]+'\n```\n')
parts.append('\n## Exact production display geometry\n\n```javascript\n'+mod[mod.index('function t5DisplayPaths('):mod.index('\nfunction overlay() {')]+'\n```\n')
lines=mod.splitlines();parts.append('\n## Exact overlay render\n\n```javascript\n'+'\n'.join(lines[843:857])+'\n```\n')
parts.append('\n## Artifact paths\n\nresearch/t5_contours_20261002/check.mjs, mock.py, release.py, preview.png, live_release.png. Prior source snapshot: before/.\n\nDisplay refresh: 100ms cache; two 0.5-screen-pixel rails, cyan for other enemies and green for selected enemy. Works with bot OFF and predicted-path display OFF. Display toggle: 표시 → T5 적 외곽선. Dense geometry benchmark is synthetic local work time, not a live FPS result. No new live survival test.\n')
(OUT/'evidence.md').write_text('\n'.join(parts))
print('evidence.md written')
