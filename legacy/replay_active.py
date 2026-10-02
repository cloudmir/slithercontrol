"""Render a recorded local failure's final observation without connecting to a site.

python replay_active.py runs/active_test_traces/active_normal_50000.json --out runs/failure.png
"""
import argparse,json,os
import numpy as np


def main(a):
    os.environ.setdefault('SDL_VIDEODRIVER','dummy')
    os.environ.setdefault('SDL_AUDIODRIVER','dummy')
    import pygame
    import brain as B
    r=json.load(open(a.trace)); frame=r['tail'][a.frame]
    pygame.init(); screen=pygame.display.set_mode((1000,800))
    font=pygame.font.SysFont('monospace',16)
    cx,cy=frame['x'],frame['y']; zoom=.6
    screen.fill((18,22,30))
    def point(x,y):return ((x-cx)*zoom+500,(y-cy)*zoom+400)
    for ax,ay,bx,by,rad in frame['segs']:
        pygame.draw.line(screen,(110,150,190),point(ax,ay),point(bx,by),max(1,round(2*rad*zoom)))
    for x,y,ang,sp,sc in frame['heads']:
        pygame.draw.circle(screen,(240,70,70),point(x,y),max(2,B.BODY_R*sc*zoom))
        pygame.draw.line(screen,(255,160,160),point(x,y),point(x+80*np.cos(ang),y+80*np.sin(ang)),2)
    rad=B.BODY_R*B.sc_of_sct(B.sct_of_score(frame['L']))
    pygame.draw.circle(screen,(255,160,40),point(cx,cy),rad*zoom)
    cmd=frame['cmd']
    pygame.draw.line(screen,(255,240,40),point(cx,cy),point(cx+150*np.cos(cmd[0]),cy+150*np.sin(cmd[0])),3)
    own=[[f['x'],f['y']] for f in r['tail'] if f['t']<=frame['t']]
    if len(own)>1:pygame.draw.lines(screen,(255,160,40),False,[point(*p) for p in own],2)
    lines=[f"{r['result']['controller']} seed {r['result']['seed']} at {frame['t']:.2f}s",
           f"L {frame['L']:.0f} boost {cmd[1]} active {frame['active']} danger {frame['danger']}",
           str(frame['status']), 'Recorded observation: orange agent, red heads, blue bodies, yellow command']
    for i,line in enumerate(lines):screen.blit(font.render(line[:110],True,(240,240,240)),(10,10+i*22))
    pygame.image.save(screen,a.out);pygame.quit()
    print(a.out)


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('trace');ap.add_argument('--frame',type=int,default=-1)
    ap.add_argument('--out',default='runs/active_failure.png')
    main(ap.parse_args())
