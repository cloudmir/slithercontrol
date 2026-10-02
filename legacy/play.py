"""Play or watch the local simulator.

  python play.py                         # you play: mouse steers, hold left button or SPACE to boost
  python play.py --ai --active           # new active-survival controller + corrected local world
  python play.py --ai                    # watch the planner AI; TAB takes over / hands back
  python play.py --ai --params runs/best_params.json
  python play.py --ai --model runs/ppo.zip --shield
  python play.py --ai --fly [runs/fly_params.json] [--shield]   # fruit-fly connectome drives the snake

keys: TAB human/AI   D planner overlay   F fast-forward (AI)   R respawn   +/- zoom   ESC quit
"""
import argparse, json, math, time
import numpy as np
import pygame
import brain as B
from sim import DT, World, make_ctrl

W, H = 1280, 800
AGENT_COLOR = (255, 150, 40)
PANEL_W = 480
KFONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'


class FlyPanel:
    """Right-hand view of the connectome: neurons at their real soma positions lighting up as they spike,
    the fly's visual field (food / threat input per LC receptive field), and the fly steering from its DN output."""

    def __init__(self, circuit, x0):
        import os, fly
        self.c, self.x0 = circuit, x0
        self.font = pygame.font.Font(KFONT, 15) if os.path.exists(KFONT) else pygame.font.SysFont('monospace', 14)
        s, t = circuit.soma, circuit.type
        self.idx = np.flatnonzero(np.isfinite(s[:, 0]))
        lo, hi = np.nanmin(s[:, :2], 0), np.nanmax(s[:, :2], 0)
        k = min((PANEL_W - 40) / (hi[0] - lo[0]), 250 / (hi[1] - lo[1]))
        flip = np.column_stack([hi[0] - s[:, 0], s[:, 1] - lo[1]])       # seen from behind: fly's right = screen right
        self.xy = flip * k + [x0 + 20 + ((PANEL_W - 40) - (hi[0] - lo[0]) * k) / 2, 50]
        col = np.tile([210, 210, 210], (circuit.n, 1))
        for types, rgb in ((fly.FOOD, (60, 230, 100)), (fly.LOOM, (245, 70, 60)), (fly.EXTRA, (170, 120, 255)),
                           (fly.STEER + fly.ESCAPE + fly.GF, (255, 175, 40))):
            col[np.isin(t, types)] = rgb
        self.col = col
        self.bg = pygame.Surface((PANEL_W, H))
        self.bg.fill((12, 14, 20))
        for i in self.idx:
            pygame.draw.circle(self.bg, col[i] * 0.22, self.xy[i] - [x0, 0], 1)
        self.bg.blit(self.font.render('초파리 뇌 활동 · MaleCNS v1.0 · 뉴런 %d개 (뒤에서 본 위치)' % circuit.n, True, (230, 230, 230)), (12, 12))
        legend = [('먹이 LC10a', (60, 230, 100)), ('위협 LC4/LPLC2', (245, 70, 60)), ('기타 LC', (170, 120, 255)),
                  ('중간', (210, 210, 210)), ('하강 DN', (255, 175, 40))]
        x = 12
        for name, rgb in legend:
            pygame.draw.circle(self.bg, rgb, (x + 5, 318), 4)
            self.bg.blit(self.font.render(name, True, (190, 190, 190)), (x + 12, 309))
            x += 12 + self.font.size(name)[0] + 14
        self.bg.blit(self.font.render('초파리 시야와 조종', True, (230, 230, 230)), (12, 350))
        self.bg.blit(self.font.render('하강 뉴런 출력 (좌 | 우)', True, (230, 230, 230)), (270, 350))

    def draw(self, screen, ctrl):
        screen.blit(self.bg, (self.x0, 0))
        last, c = ctrl.last, self.c
        if last is None:
            return
        act = ctrl.act
        for i in self.idx[act[self.idx] > 0.4]:
            pygame.draw.circle(screen, self.col[i], self.xy[i], 1.5 + min(3.5, 0.6 * act[i]))
        # visual field: each LC at its receptive-field azimuth (up = heading), brightness = input rate
        cx, cy, R = self.x0 + 130, 540, 105
        pygame.draw.circle(screen, (45, 50, 62), (cx, cy), R + 8, 1)
        for grp, az, rad, rgb in ((c.food, c.az_food, R, (60, 230, 100)), (c.loom, c.az_loom, R - 16, (245, 70, 60))):
            lvl = np.clip(last['rate'][grp] / 250, 0, 1)
            for a, l, i in zip(az, lvl, grp):
                on = max(l, min(1, act[i] * 0.3))
                if on > 0.05:
                    pygame.draw.circle(screen, [int(v * (0.25 + 0.75 * on)) for v in rgb],
                                       (cx + rad * math.sin(a), cy - rad * math.cos(a)), 2 + 3 * on)
        # the fly, turned by its descending-neuron command; wings flare when the giant fiber fires (boost)
        th = -math.pi / 2 + max(-1.4, min(1.4, last['turn']))
        u, v = np.array([math.cos(th), math.sin(th)]), np.array([-math.sin(th), math.cos(th)])
        o = np.array([cx, cy])
        spread = 1.15 if last['boost'] else 0.45
        for side in (-1, 1):
            tip = o - u * 34 * math.cos(spread) + side * v * 34 * math.sin(spread)
            base = o + u * 4
            pygame.draw.polygon(screen, (170, 200, 230) if last['boost'] else (120, 140, 160),
                                [base, tip + u * 7, tip - u * 7, o - u * 6])
        body = [o + u * 16 * math.cos(f) + v * 7 * math.sin(f) for f in np.linspace(0, 2 * math.pi, 16)]
        pygame.draw.polygon(screen, (150, 110, 60), body)
        pygame.draw.circle(screen, (120, 90, 50), o + u * 19, 7)
        for side in (-1, 1):
            pygame.draw.circle(screen, (220, 40, 40), o + u * 21 + side * v * 5, 3)
        pygame.draw.line(screen, (255, 230, 0), o + u * 26, o + u * 60, 2)
        # descending-neuron bars
        for row, (name, key, rgb) in enumerate((('방향 DNa', 'steer', (255, 175, 40)), ('탈출 DNp', 'escape', (245, 90, 60)),
                                               ('거대섬유 DNp01', 'gf', (255, 240, 120)))):
            y = 390 + row * 52
            l, r = last[key]
            screen.blit(self.font.render(f'{name}  {int(l)} | {int(r)}', True, (200, 200, 200)), (self.x0 + 270, y))
            mid = self.x0 + 370
            pygame.draw.rect(screen, rgb, (mid - min(90, 3 * l), y + 22, min(90, 3 * l), 12))
            pygame.draw.rect(screen, rgb, (mid + 2, y + 22, min(90, 3 * r), 12))
            pygame.draw.line(screen, (90, 90, 90), (mid + 1, y + 20), (mid + 1, y + 36))
        msg = f"회전 {math.degrees(last['turn']):+.0f}°" + ('   부스트!' if last['boost'] else '')
        screen.blit(self.font.render(msg, True, (255, 230, 120)), (self.x0 + 270, 560))


def palette(i):
    h = (i * 0.61803) % 1
    c = pygame.Color(0)
    c.hsva = (h * 360, 60, 95, 100)
    return c


def main(a):
    pygame.init()
    screen = pygame.display.set_mode((W + (PANEL_W if a.fly else 0), H))
    pygame.display.set_caption('slither sim')
    font = pygame.font.SysFont('monospace', 16)
    big = pygame.font.SysFont('monospace', 40, bold=True)
    clock = pygame.time.Clock()
    params = json.load(open(a.params)) if a.params else None
    world_cls = World
    recovery_model=getattr(a,'recovery_model',None)
    modern=a.active or bool(recovery_model)
    if modern:
        from sim_active import World as world_cls
    w = world_cls(seed=a.seed, n_bots=a.bots if a.bots is not None else (50 if modern else 30), hunters=a.hunters if a.hunters is not None else (.3 if modern else .25), delay=a.delay, **({'L0':100} if modern else {}))
    if recovery_model:
        import torch
        from stable_baselines3 import PPO
        from recovery_env import RecoveryController
        torch.set_num_threads(1)
        ctrl=RecoveryController(PPO.load(recovery_model,device='cpu'))
    elif a.active:
        from active import ActiveController
        ctrl = ActiveController()
    elif a.fly:
        import fly, os
        fp = json.load(open(a.fly)) if os.path.exists(a.fly) else None
        ctrl = fly.make_fly(fp, a.shield, params)
        panel = FlyPanel(ctrl.circuit, W)
    else:
        ctrl = make_ctrl(params, a.model, a.shield)
    ai, debug, fast, zoom = a.ai, a.active, False, 0.6
    cmd, E, k = None, None, 0
    lives, t_life, dead_until, cause = [], 0.0, 0.0, ''

    def to_screen(x, y, cx, cy):
        return (x - cx) * zoom + W / 2, (y - cy) * zoom + H / 2

    running = True
    frames = 0
    while running:
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT or (ev.type == pygame.KEYDOWN and ev.key == pygame.K_ESCAPE):
                running = False
            elif ev.type == pygame.KEYDOWN:
                if ev.key == pygame.K_TAB:
                    ai = not ai
                    if ai and hasattr(ctrl,'reset'): ctrl.reset()
                elif ev.key == pygame.K_d:
                    debug = not debug
                elif ev.key == pygame.K_f:
                    fast = not fast
                elif ev.key == pygame.K_r:
                    w.respawn_agent()
                    t_life, cmd, E, k, dead_until = 0.0, None, None, 0, 0.0
                    if hasattr(ctrl, 'reset'): ctrl.reset()
                elif ev.key in (pygame.K_PLUS, pygame.K_EQUALS, pygame.K_KP_PLUS):
                    zoom = min(2.0, zoom * 1.25)
                elif ev.key in (pygame.K_MINUS, pygame.K_KP_MINUS):
                    zoom = max(0.15, zoom / 1.25)

        ag = w.snakes[0]
        for _ in range(4 if fast and ai else 1):
            if not ag['alive']:
                break
            if ai:
                if k % 2 == 0:
                    cmd, E = ctrl(w.state())
            else:
                mx, my = pygame.mouse.get_pos()
                boost = pygame.mouse.get_pressed()[0] or pygame.key.get_pressed()[pygame.K_SPACE]
                cmd, E = (math.atan2(my - H / 2, mx - W / 2), bool(boost)), None
            w.step(cmd)
            k += 1
            t_life += DT
        if not ag['alive'] and not dead_until:
            cause = ag.get('cause', '')
            lives.append(t_life)
            dead_until = time.time() + 1.5
        if dead_until and time.time() > dead_until:
            w.respawn_agent()
            t_life, dead_until, E, cmd, k = 0.0, 0.0, None, None, 0
            if hasattr(ctrl, 'reset'): ctrl.reset()
            ag = w.snakes[0]

        # ---- draw ----
        cx, cy = ag['x'], ag['y']
        screen.fill((18, 22, 30))
        g = 200
        for gx in np.arange(math.floor((cx - W / 2 / zoom) / g) * g, cx + W / 2 / zoom, g):
            pygame.draw.line(screen, (30, 36, 48), to_screen(gx, cy - H, cx, cy), to_screen(gx, cy + H, cx, cy))
        for gy in np.arange(math.floor((cy - H / 2 / zoom) / g) * g, cy + H / 2 / zoom, g):
            pygame.draw.line(screen, (30, 36, 48), to_screen(cx - W, gy, cx, cy), to_screen(cx + W, gy, cx, cy))
        pygame.draw.circle(screen, (160, 30, 30), to_screen(0, 0, cx, cy), w.R * zoom, max(2, int(20 * zoom)))
        view = (abs(w.food[:, 0] - cx) < W / zoom) & (abs(w.food[:, 1] - cy) < H / zoom)
        for fx, fy, fv in w.food[view]:
            pygame.draw.circle(screen, palette(int(fx) % 7 + 3), to_screen(fx, fy, cx, cy), max(1, (2 + fv) * zoom))
        for i, s in enumerate(w.snakes):
            if not s['alive'] or abs(s['x'] - cx) > 2 * W / zoom + 5000:
                continue
            r = B.BODY_R * s['sc']
            col = AGENT_COLOR if i == 0 else palette(i)
            pts = [to_screen(px, py, cx, cy) for px, py in s['pts'] + [[s['x'], s['y']]]]
            if len(pts) > 1:
                pygame.draw.lines(screen, col, False, pts, max(2, int(2 * r * zoom)))
            for p in pts:
                pygame.draw.circle(screen, col, p, max(1, r * zoom))
            hx, hy = pts[-1]
            if debug and s.get('hunter'):
                pygame.draw.circle(screen, (255, 60, 60), (hx, hy), r * zoom + 4, 2)
            if s['boost']:
                pygame.draw.circle(screen, (255, 255, 255), (hx, hy), r * zoom + 2, 1)
            ex, ey = math.cos(s['ang']), math.sin(s['ang'])
            for side in (-1, 1):
                e = (hx + (ex * 0.5 - ey * side * 0.5) * r * zoom, hy + (ey * 0.5 + ex * side * 0.5) * r * zoom)
                pygame.draw.circle(screen, (255, 255, 255), e, max(2, r * zoom * 0.3))
        if debug and E is not None and ai:
            safe = E['safe'] if 'safe' in E else E['tc'] > ctrl.pl.p['H'] + ctrl.pl.p['lat']
            for c in range(len(E['tc'])):
                col = (60, 200, 90) if safe[c] else (220, 60, 60)
                pygame.draw.lines(screen, col, False, [to_screen(px, py, cx, cy) for px, py in E['P'][c]], 1)
            if 'selected' in E:
                pygame.draw.lines(screen, (255,230,50), False, [to_screen(px,py,cx,cy) for px,py in E['P'][E['selected']]], 3)
                goal=E['status'].get('goal')
                if goal: pygame.draw.circle(screen,(70,230,230),to_screen(*goal,cx,cy),8,2)
            tgt = (W / 2 + math.cos(cmd[0]) * 120, H / 2 + math.sin(cmd[0]) * 120)
            pygame.draw.line(screen, (255, 230, 0), (W / 2, H / 2), tgt, 3)
            pygame.draw.circle(screen, (80, 80, 160), (W / 2, H / 2), 1600 * zoom, 1)
        hud = [f"{'AI' if ai else 'YOU'}{' x4' if fast and ai else ''}  length {ag['L']:.0f}  alive {t_life:5.1f}s",
               f"deaths {len(lives)}  mean life {np.mean(lives) if lives else 0:5.1f}s  fps {clock.get_fps():4.1f}",
               'TAB AI/you  D overlay  F fast  R respawn  +/- zoom  ESC quit']

        if a.active and ctrl.last and E is not None:
            z=ctrl.last
            hud.append(f"{z['mode']} | nearby {z['heads']} | coverage {z['occupied']:.0%} | active {z['active']} | safe paths {z['safe_count']}")
            limit=E['horizon']
            tc=f"{z['tc']:.2f}s" if z['tc']<=limit else f"clear through {limit:.2f}s"
            tr=f"{z['tr']:.2f}s" if z['tr']<=limit else f"clear through {limit:.2f}s"
            hud.append(f"collision {tc} | maneuver {tr} | food {z['food']:.1f}")
        if recovery_model and ai and ctrl.last:
            hud.append(f"recovery RL | direct actions | boost {ctrl.last['boost']}")
        for j, line in enumerate(hud):
            screen.blit(font.render(line, True, (220, 220, 220)), (10, 10 + 20 * j))
        if dead_until:
            t = big.render(f'DEAD ({cause})', True, (255, 80, 80))
            screen.blit(t, t.get_rect(center=(W / 2, H / 2 - 60)))
        if a.fly:
            panel.draw(screen, ctrl)
        pygame.display.flip()
        frames += 1
        if a.frames and frames >= a.frames:
            if a.screenshot: pygame.image.save(screen,a.screenshot)
            running = False
        clock.tick(30)
    pygame.quit()
    if lives:
        print(f'deaths {len(lives)}, mean life {np.mean(lives):.1f}s')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--ai', action='store_true')
    ap.add_argument('--active', action='store_true', help='active-survival controller and corrected local simulator')
    ap.add_argument('--recovery-model',help='direct-action PPO trained on pre-death worlds')
    ap.add_argument('--frames',type=int,help='exit after N rendered frames (smoke check)')
    ap.add_argument('--screenshot',help='save final frame when using --frames')
    ap.add_argument('--params')
    ap.add_argument('--model')
    ap.add_argument('--shield', action='store_true')
    ap.add_argument('--fly', nargs='?', const='runs/fly_params.json', help='connectome controller (optional params json)')
    ap.add_argument('--bots', type=int)
    ap.add_argument('--hunters', type=float)
    ap.add_argument('--delay', type=int, default=2, help='command latency in 1/30 s steps')
    ap.add_argument('--seed', type=int)
    args=ap.parse_args()
    if args.active and (args.fly or args.model or args.params): ap.error('--active has its own controller; omit --fly/--model/--params')
    if args.recovery_model and (args.active or args.fly or args.model or args.params or args.shield): ap.error('--recovery-model is a direct policy; omit other controller options')
    main(args)
