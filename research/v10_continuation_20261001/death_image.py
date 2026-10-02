import gzip,json,math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.patches import Circle
from matplotlib.lines import Line2D
from matplotlib.font_manager import FontProperties
p=Path('runs/v10_continuation5_20261001_113057');frames=json.load(gzip.open(p/'slp_01_box.json.gz'))['frames'];f=frames[-1]
font=FontProperties(fname='/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc');plt.rcParams.update({'font.family':font.get_name(),'axes.unicode_minus':False,'font.size':11})
fig,axes=plt.subplots(1,2,figsize=(14,7),facecolor='#101a26');fig.subplots_adjust(left=.055,right=.965,top=.83,bottom=.19,wspace=.14)
x,y=f['x'],f['y'];tail=[a for a in frames if a['t']>=f['t']-3]
for ax,r,title in zip(axes,[500,3300],['머리 주변 확대 · 반경 500px','전체 관측 지도 · 반경 3300px']):
 ax.set_facecolor('#142333');ax.set_aspect('equal');ax.set_xlim(-r,r);ax.set_ylim(r,-r);ax.set_title(title,color='white',pad=14,fontweight='bold');ax.tick_params(colors='#9aafc3');ax.grid(alpha=.1);ax.set_xlabel('내 머리 기준 거리 (px)',color='#9aafc3')
 for sp in ax.spines.values():sp.set_color('#395065')
fig.canvas.draw()
for ax,r in zip(axes,[500,3300]):
 scale=ax.get_window_extent().width/fig.dpi*72/(2*r)
 lines=[];width=[];colors=[]
 for i in range(0,len(f['segs']),5):
  a,b,c,d,rr=f['segs'][i:i+5];sid=f['sid'][i//5];lines.append([(a-x,b-y),(c-x,d-y)]);width.append(2*rr*scale);colors.append('#ff626c' if sid==138 else '#8195aa')
 ax.add_collection(LineCollection(lines,linewidths=width,colors=colors,capstyle='round',alpha=.9))
 own=list(zip(f['own'][::2],f['own'][1::2]));ax.plot([a-x for a,b in own],[b-y for a,b in own],color='#43e3df',lw=2*14.5*f['sc']*scale,solid_capstyle='round')
 ax.plot([a['x']-x for a in tail],[a['y']-y for a in tail],color='#ffd16b',lw=1.7,ls='--',alpha=.95)
 for i in range(0,len(f['heads']),5):
  a,b,h,sp,sc=f['heads'][i:i+5];ax.scatter(a-x,b-y,s=20 if r==500 else 12,color='#ffb265',edgecolors='none',zorder=4)
 ax.add_patch(Circle((0,0),14.5*f['sc'],facecolor='#43e3df',edgecolor='white',linewidth=1,zorder=6))
 size=90 if r==500 else 350
 ax.annotate('',xy=(math.cos(f['ang'])*size,math.sin(f['ang'])*size),xytext=(0,0),arrowprops={'arrowstyle':'->','color':'#43e3df','lw':2},zorder=7)
 ax.annotate('우리 머리',xy=(0,0),xytext=(-r*.55,-r*.55),color='#43e3df',arrowprops={'arrowstyle':'-','color':'#43e3df'},zorder=8)
 if r==3300:ax.add_patch(Circle((0,0),500,fill=False,color='#43e3df',linestyle=':',lw=1.2))
fig.suptitle('1판 사망 직전 — 마지막 관측 프레임 재구성',color='white',fontsize=19,fontweight='bold',y=.97)
fig.text(.5,.902,f"t = {f['t']:.3f}s  |  검증된 탈출 경로 0개  |  탐색 상태: 시간 예산 소진 (budget)",ha='center',color='#ffc16b',fontsize=12)
handles=[Line2D([0],[0],color='#43e3df',lw=5,label='우리 몸 / 화살표: 실제 진행 방향'),Line2D([0],[0],color='#ff626c',lw=5,label='가장 가까운 적 몸 (ID 138)'),Line2D([0],[0],color='#8195aa',lw=5,label='다른 관측 몸통'),Line2D([0],[0],color='#ffd16b',ls='--',label='우리의 직전 3초 이동 궤적')]
fig.legend(handles=handles,loc='lower center',bbox_to_anchor=(.5,.065),ncol=2,facecolor='#142333',edgecolor='#395065',labelcolor='white',fontsize=10)
fig.text(.5,.035,'실제 스크린샷이 아닌 저장 좌표 지도입니다. 빨간 몸이 서버에서 판정한 충돌 상대라는 뜻은 아닙니다.',ha='center',color='#9aafc3',fontsize=10)
fig.savefig(p/'death_01_map.png',dpi=160,facecolor=fig.get_facecolor());print(p/'death_01_map.png')
