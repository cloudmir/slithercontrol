import json,math,html
from pathlib import Path
ss=json.load(open('research/v10_maze_2h_20261001/cycle3_last_states.json'));parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 800"><rect width="1440" height="800" fill="#101827"/>'];parts.append('<text x="24" y="28" fill="white" font-size="18">실제 관측 지도: 포위가 닫히기 전 / 후</text>')
for col,t in enumerate([97.5,99.75]):
 s=min(ss,key=lambda s:abs(s['t']-t));x,y=s['x'],s['y'];scale=.39;cx=360+720*col;cy=420
 xy=lambda a,b:(cx+(a-x)*scale,cy+(b-y)*scale)
 parts.append(f'<defs><clipPath id="c{col}"><rect x="{col*720+10}" y="60" width="700" height="700"/></clipPath></defs><g clip-path="url(#c{col})">')
 for i in range(0,len(s['segs']),5):
  a,b,c,d,r=s['segs'][i:i+5];a,b=xy(a,b);c,d=xy(c,d);parts.append(f'<line x1="{a}" y1="{b}" x2="{c}" y2="{d}" stroke="#5e6d86" stroke-width="{r*2*scale}" stroke-linecap="round"/>')
 for i in range(0,len(s['food']),3):
  a,b,m=s['food'][i:i+3];a,b=xy(a,b);parts.append(f'<circle cx="{a}" cy="{b}" r="1.5" fill="#ffcc66"/>')
 for r in(s.get('route')or{}).get('routes',[]):
  pts=' '.join(f'{a},{b}'for a,b in[xy(q['x'],q['y'])for q in r.get('path',[])]);parts.append(f'<polyline points="{pts}" fill="none" stroke="#4cacdf" stroke-width="1"/>')
 if s.get('selectedGuide'):
  pts=' '.join(f'{a},{b}'for a,b in[xy(q['x'],q['y'])for q in s['selectedGuide']['path']]);parts.append(f'<polyline points="{pts}" fill="none" stroke="#63e7a8" stroke-width="2" stroke-dasharray="5 5"/>')
 for i in range(0,len(s['heads']),5):
  hx,hy,h,sp,sc=s['heads'][i:i+5];a,b=xy(hx,hy);c,d=xy(hx+90*math.cos(h),hy+90*math.sin(h));parts.append(f'<circle cx="{a}" cy="{b}" r="{14.5*sc*scale}" fill="#ed6976"/><line x1="{a}" y1="{b}" x2="{c}" y2="{d}" stroke="#ed6976" stroke-width="3"/>')
 a,b=xy(x,y);c,d=xy(x+100*math.cos(s['ang']),y+100*math.sin(s['ang']));parts.append(f'<circle cx="{a}" cy="{b}" r="{14.5*s["sc"]*scale}" fill="white"/><line x1="{a}" y1="{b}" x2="{c}" y2="{d}" stroke="white" stroke-width="4"/>');parts.append('</g>')
 parts.append(f'<text x="{col*720+24}" y="54" fill="white" font-size="16">판단 {s["t"]:.3f}초 · {html.escape(s["route"]["reason"])}</text>')
parts.append('<text x="24" y="785" fill="#d0dbea" font-size="14">회색: 몸통 · 빨강: 적 머리/방향 · 흰색: 우리 · 선: 기하학 경로(미래 통과 보장 아님)</text></svg>');svg=''.join(parts);p=Path('research/v10_maze_2h_20261001');(p/'cycle3_closure_geometry.svg').write_text(svg);(p/'cycle3_closure_geometry.html').write_text('<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#101827}svg{width:100%;height:98vh}</style>'+svg)
