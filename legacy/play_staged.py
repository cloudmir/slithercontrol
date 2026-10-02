"""Watch or take over the independent local controller. No live-site connector."""
import argparse
import math
from pathlib import Path
import numpy as np
import pygame
import brain as B
from activity import ActivityMonitor, measure
from evaluate_active import SETTINGS, independent_danger
from sim_active import World, DT
from staged import make_controller, observe


def main(a):
    pygame.init()
    screen = pygame.display.set_mode((1200, 800))
    pygame.display.set_caption('Slither local — staged controller')
    font = pygame.font.SysFont('monospace', 18)
    clock = pygame.time.Clock()
    w = World(seed=a.seed, L0=100, **SETTINGS[a.setting])
    if a.stage == 'pocket':
        from pocket import PocketController
        ctrl = PocketController()
    elif a.stage == 'pocket2':
        from pocket2 import Pocket2Controller
        ctrl = Pocket2Controller()
    elif a.stage == 'pocket3':
        from pocket3 import Pocket3Controller
        ctrl = Pocket3Controller()
    elif a.stage == 'pocket4':
        from pocket4 import Pocket4Controller
        ctrl = Pocket4Controller()
    elif a.stage == 'pocket5':
        from pocket5 import Pocket5Controller
        ctrl = Pocket5Controller()
    elif a.stage == 'pocket6':
        from pocket6 import Pocket6Controller
        ctrl = Pocket6Controller()
    elif a.stage == 'pocket7':
        from pocket7 import Pocket7Controller
        ctrl = Pocket7Controller()
    elif a.stage == 'pocket8':
        from pocket8 import Pocket8Controller
        ctrl = Pocket8Controller()
    else:
        ctrl = make_controller(a.stage)
    mon = ActivityMonitor()
    ai, debug, fast, zoom, k, frames = True, True, False, .6, 0, 0
    cmd, e = None, None
    mode_changed = False
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT: running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE: running = False
                elif event.key == pygame.K_TAB:
                    ai = not ai; mode_changed = True; ctrl.reset()
                elif event.key == pygame.K_d: debug = not debug
                elif event.key == pygame.K_f: fast = not fast
                elif event.key in (pygame.K_EQUALS, pygame.K_PLUS): zoom = min(2., zoom*1.2)
                elif event.key == pygame.K_MINUS: zoom = max(.15, zoom/1.2)
                elif event.key == pygame.K_r:
                    # A fresh seed starts a separate life; no score aggregation.
                    a.seed += 1
                    w = World(seed=a.seed, L0=100, **SETTINGS[a.setting])
                    ctrl.reset(); mon = ActivityMonitor(); k=0; cmd=None; e=None; mode_changed=False
        ag = w.snakes[0]
        for _ in range(4 if fast else 1):
            if not ag['alive'] or w.t>=600: break
            if k%2==0:
                s=observe(w); m=measure(s); active=bool(m['active'][0]); danger=independent_danger(s)
                if ai: cmd,e=ctrl(s)
                else:
                    mx,my=pygame.mouse.get_pos()
                    cmd=(math.atan2(my-400,mx-600),bool(pygame.mouse.get_pressed()[0] or pygame.key.get_pressed()[pygame.K_SPACE]))
                    e=None
            w.step(cmd); mon.update(w.t,DT,active,danger); k+=1
        origin=np.array([ag['x'],ag['y']])
        def pt(p): return tuple(np.rint((np.asarray(p)-origin)*zoom+[600,400]).astype(int))
        screen.fill((15,20,29))
        pygame.draw.circle(screen,(120,45,55),pt([0,0]),int(w.R*zoom),3)
        for f in w.food:
            pos=pt(f[:2])
            if -20<pos[0]<1220 and -20<pos[1]<820:
                pygame.draw.circle(screen,(90,205,145),pos,max(2,min(10,int((2+math.sqrt(f[2]))*zoom))))
        for i,snake in enumerate(w.snakes):
            if not snake['alive'] and i: continue
            color=pygame.Color(0); color.hsva=((i*137.5)%360,55,85,100)
            if i==0: color=(255,175,65) if snake['alive'] else (200,65,65)
            points=[pt(p) for p in snake['pts']+[[snake['x'],snake['y']]]]
            radius=max(2,int(B.BODY_R*snake['sc']*zoom))
            if len(points)>1: pygame.draw.lines(screen,color,False,points,2*radius)
            pygame.draw.circle(screen,color,points[-1],radius)
        if debug and e is not None:
            for i,path in enumerate(e['P']):
                if i==e['selected']: continue
                color=(40,95,70) if e['safe'][i] else (90,40,45)
                pygame.draw.lines(screen,color,False,[pt(p) for p in path],1)
            pygame.draw.lines(screen,(255,240,100),False,[pt(p) for p in e['P'][e['selected']]],3)
            if ctrl.center is not None:
                pygame.draw.circle(screen,(90,160,255),pt(ctrl.center),int(ctrl.radius*zoom),2)
        result=mon.result()
        status='RUNNING' if ag['alive'] and w.t<600 else ('600s COMPLETE' if ag['alive'] else 'DEAD: '+ag.get('cause',''))
        lines=[f"{a.stage} | {'AI' if ai else 'MANUAL'} | {a.setting} seed {a.seed} | {status}",
               f"time {w.t:.1f}/600s | length {ag['L']:.0f} | gain {ag['L']-100:+.0f}",
               f"activity {'PASS SO FAR' if result['activity_ok'] else 'NOT MET'} | off-zone {result['off_fraction']:.1%}",
               f"mode {'body-follow' if ctrl.last.get('loop_closed') else ctrl.last.get('mode','')} | safe headings {ctrl.last.get('safe_count','')} | fps {clock.get_fps():.0f}",
               'TAB take over | D paths | F x4 | R new seed/life | +/- zoom | ESC quit']
        if mode_changed: lines.append('Manual intervention: this life is not an autonomous benchmark.')
        if w.t<=20: lines[2]='Activity: initial entry grace (20s)'
        pygame.draw.rect(screen,(15,20,29),(0,0,1200,25*len(lines)+10))
        for i,line in enumerate(lines): screen.blit(font.render(line,True,(230,232,237)),(12,10+25*i))
        pygame.display.flip(); frames+=1
        if a.frames and frames>=a.frames:
            if a.screenshot: pygame.image.save(screen,a.screenshot)
            running=False
        clock.tick(30)
    pygame.quit()
    print(f'Local life: {w.t:.1f}s alive={ag["alive"]} activity={mon.result()["activity_ok"]} manual={mode_changed}')


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--stage',choices=['gap','predict','circle_v0','circle','coil','pocket','pocket2','pocket3','pocket4','pocket5','pocket6','pocket7','pocket8'],default='coil')
    ap.add_argument('--seed',type=int,default=61000)
    ap.add_argument('--setting',choices=SETTINGS,default='normal')
    ap.add_argument('--frames',type=int)
    ap.add_argument('--screenshot')
    main(ap.parse_args())
