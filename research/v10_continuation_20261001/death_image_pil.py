from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import gzip,json,math
p=Path('runs/v10_continuation5_20261001_113057');frames=json.load(gzip.open(p/'slp_01_box.json.gz'))['frames'];f=frames[-1];font='/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
im=Image.new('RGB',(1600,920),'#101a26');d=ImageDraw.Draw(im);F=lambda n:ImageFont.truetype(font,n)
d.text((55,25),'1판 사망 직전 — 마지막 관측 좌표 재구성',font=F(32),fill='white')
d.text((55,80),'18.397초 | 검증된 탈출 경로 0개 | 탐색 결과: 시간 예산 소진',font=F(22),fill='#ffc16b')
for left,r,title in [(55,500,'머리 주변 · 반경 500px'),(825,3300,'전체 관측 지도 · 반경 3300px')]:
 size=710;top=155;panel=Image.new('RGB',(size,size),'#142333');q=ImageDraw.Draw(panel);scale=size/(2*r);xy=lambda x,y:((x-f['x'])*scale+size/2,(y-f['y'])*scale+size/2)
 for v in range(0,size,71):q.line((v,0,v,size),fill='#203548');q.line((0,v,size,v),fill='#203548')
 for i in range(0,len(f['segs']),5):
  a,b,c,e,rr=f['segs'][i:i+5];color='#ff626c' if f['sid'][i//5]==138 else '#8195aa';q.line([xy(a,b),xy(c,e)],fill=color,width=max(1,round(2*rr*scale)))
 own=list(zip(f['own'][::2],f['own'][1::2]));q.line([xy(a,b) for a,b in own],fill='#43e3df',width=max(2,round(29*f['sc']*scale)))
 tail=[a for a in frames if a['t']>=f['t']-3];q.line([xy(a['x'],a['y']) for a in tail],fill='#ffd16b',width=2)
 for i in range(0,len(f['heads']),5):
  x,y=xy(f['heads'][i],f['heads'][i+1]);q.ellipse((x-3,y-3,x+3,y+3),fill='#ffb265')
 mid=size/2;rr=max(4,14.5*f['sc']*scale);q.ellipse((mid-rr,mid-rr,mid+rr,mid+rr),fill='#43e3df',outline='white');end=(mid+65*math.cos(f['ang']),mid+65*math.sin(f['ang']));q.line((mid,mid,*end),fill='#43e3df',width=3)
 for da in [-.5,.5]:q.line((*end,end[0]-14*math.cos(f['ang']+da),end[1]-14*math.sin(f['ang']+da)),fill='#43e3df',width=3)
 q.text((mid+18,mid+10),'우리 머리',font=F(18),fill='#43e3df')
 im.paste(panel,(left,top));d.rectangle((left,top,left+size,top+size),outline='#395065');d.text((left,120),title,font=F(23),fill='white')
d.text((55,878),'청록: 우리 몸·실제 방향  /  빨강: 가장 가까운 적(ID 138)  /  회색: 다른 적  /  노랑: 직전 3초 궤적',font=F(19),fill='#c8d4df')
im.save(p/'death_01_map.png');print(p/'death_01_map.png')
