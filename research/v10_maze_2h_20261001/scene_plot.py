import json,math,sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle,Polygon
from matplotlib.collections import PatchCollection
ss=json.load(open(sys.argv[1]));targets=[float(x)for x in sys.argv[2:]]or[97.5,99.75];fig,axs=plt.subplots(1,len(targets),figsize=(7*len(targets),7),squeeze=False)
for ax,t in zip(axs[0],targets):
 s=min(ss,key=lambda s:abs(s['t']-t));x,y=s['x'],s['y'];R=850;patches=[]
 for i in range(0,len(s['segs']),5):
  a,b,c,d,r=s['segs'][i:i+5]
  if min(a,c)-r>x+R or max(a,c)+r<x-R or min(b,d)-r>y+R or max(b,d)+r<y-R:continue
  dx,dy=c-a,d-b;ll=math.hypot(dx,dy);nx,ny=(-dy/ll*r,dx/ll*r)if ll else(r,0)
  patches.extend([Polygon([(a+nx,b+ny),(c+nx,d+ny),(c-nx,d-ny),(a-nx,b-ny)]),Circle((a,b),r),Circle((c,d),r)])
 ax.add_collection(PatchCollection(patches,color='#5b687d',alpha=.8,linewidth=0))
 for i in range(0,len(s['food']),3):
  fx,fy,m=s['food'][i:i+3]
  if abs(fx-x)<R and abs(fy-y)<R:ax.scatter(fx,fy,s=min(15,m),c='#edbb48',linewidths=0)
 for i in range(0,len(s['heads']),5):
  hx,hy,h,sp,sc=s['heads'][i:i+5]
  if abs(hx-x)<R and abs(hy-y)<R:ax.add_patch(Circle((hx,hy),14.5*sc,color='#e26466'));ax.arrow(hx,hy,80*math.cos(h),80*math.sin(h),width=3,head_width=20,color='#ee8890')
 for r in(s.get('route')or{}).get('routes',[]):
  path=r.get('path',[]);ax.plot([q['x']for q in path],[q['y']for q in path],lw=.7,alpha=.5)
 g=s.get('selectedGuide')
 if g:
  path=g['path'];ax.plot([q['x']for q in path],[q['y']for q in path],color='#6ee8ad',lw=2,ls='--',label='Selected geometric guide')
 ax.add_patch(Circle((x,y),14.5*s['sc'],color='#fafafa'));ax.arrow(x,y,90*math.cos(s['ang']),90*math.sin(s['ang']),width=5,head_width=24,color='white')
 ax.set(xlim=(x-R,x+R),ylim=(y+R,y-R),aspect='equal',title=f"Observation {s['t']:.3f}s | {(s.get('route')or{}).get('reason','?')}");ax.set_facecolor('#121b2b');ax.tick_params(colors='#64748b');ax.grid(alpha=.12)
 ax.text(.02,.02,'Grey: observed bodies | Red: enemy heads\nGold: food | White: us | Lines: geometric guides',transform=ax.transAxes,color='white',fontsize=8,va='bottom')
fig.suptitle('Recorded geometry - guides are not guarantees of future passage',fontsize=14);fig.tight_layout();out=Path('research/v10_maze_2h_20261001/cycle3_closure_geometry.png');fig.savefig(out,dpi=150);print(out)
