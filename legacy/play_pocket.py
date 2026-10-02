"""Visible synthetic pocket scenarios; not live play or reactive opponents."""
import argparse
import math
import numpy as np
import pygame
import brain as B
from pocket import PocketController
from pocket_scenarios import PocketArena, KINDS
from staged import make_controller


def main(a):
    pygame.init()
    screen=pygame.display.set_mode((1100,800))
    pygame.display.set_caption('Local pocket defense — synthetic scenario')
    font=pygame.font.SysFont('monospace',18); clock=pygame.time.Clock()
    w=PocketArena(a.case,a.seed)
    c=PocketController() if a.controller=='pocket' else make_controller(a.controller)
    k=0;frames=0;cmd=None;e=None;fast=False;running=True;debug=True
    zoom=.9
    def pt(p): return tuple(np.rint(np.asarray(p)*zoom+[550,430]).astype(int))
    while running:
        for event in pygame.event.get():
            if event.type==pygame.QUIT: running=False
            if event.type==pygame.KEYDOWN:
                if event.key==pygame.K_ESCAPE: running=False
                if event.key==pygame.K_f: fast=not fast
                if event.key==pygame.K_d: debug=not debug
                if event.key==pygame.K_r:
                    w=PocketArena(a.case,a.seed);c.reset();k=0;cmd=None;e=None
        for _ in range(4 if fast else 1):
            if not w.alive or w.t>=a.seconds: break
            if k%2==0: cmd,e=c(w.state())
            w.step(cmd);k+=1
        screen.fill((15,20,29))
        for seg in w.barriers(w.t):
            pygame.draw.line(screen,(185,75,95),pt(seg[:2]),pt(seg[2:4]),round(2*seg[4]*zoom))
        for h in w.heads(w.t):
            pygame.draw.circle(screen,(240,80,120),pt(h[:2]),round(B.BODY_R*h[4]*zoom))
        for f in w.food:
            pygame.draw.circle(screen,(90,205,145),pt(f[:2]),max(3,round(math.sqrt(f[2])*zoom)))
        if len(w.body)>1:
            pygame.draw.lines(screen,(255,175,65),False,[pt(p) for p in w.body],round(2*B.BODY_R*w.sc*zoom))
        pygame.draw.circle(screen,(255,225,130),pt(w.p),round(B.BODY_R*w.sc*zoom))
        if debug and e is not None:
            pygame.draw.lines(screen,(255,240,100),False,[pt(p) for p in e['P'][e['selected']]],2)
            if c.center is not None:
                pygame.draw.circle(screen,(90,160,255),pt(c.center),round(c.radius*zoom),2)
        status='RUNNING' if w.alive and w.t<a.seconds else ('COMPLETE' if w.alive else 'DEAD: '+str(w.cause))
        lines=['SYNTHETIC GEOMETRY: prescribed barriers, not reactive opponents',
               f'{a.controller} | {a.case} seed {a.seed} | {status}',
               f'time {w.t:.1f}/{a.seconds:g}s | length {w.L:.0f} | escaped {w.escaped}',
               f"mode {c.last.get('mode','')} | predicted orbit radius {c.radius:.0f}",
               'R restart same case | F x4 | D planned path | ESC quit']
        pygame.draw.rect(screen,(15,20,29),(0,0,1100,140))
        for i,line in enumerate(lines):screen.blit(font.render(line,True,(230,232,237)),(12,10+25*i))
        pygame.display.flip();frames+=1
        if a.frames and frames>=a.frames:
            if a.screenshot:pygame.image.save(screen,a.screenshot)
            running=False
        clock.tick(30)
    pygame.quit()
    print(f'{a.case}: {w.t:.2f}s alive={w.alive} escaped={w.escaped}')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--case',choices=KINDS,default='opening')
    p.add_argument('--controller',choices=['pocket','predict','coil'],default='pocket')
    p.add_argument('--seed',type=int,default=71000)
    p.add_argument('--seconds',type=float,default=60)
    p.add_argument('--frames',type=int);p.add_argument('--screenshot')
    main(p.parse_args())
