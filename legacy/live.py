"""Play real slither.io in a visible Chromium with the shared brain; one JSON line per game in runs/.

  python live.py --games 5 [--params runs/best_params.json] [--model runs/ppo.zip [--shield]] [--headless]
"""
import argparse, asyncio, collections, glob, json, os, random, re, sys, time
import numpy as np
from playwright.async_api import async_playwright
import brain as B
from sim import VIEW, make_ctrl

CHROME = os.environ.get('CHROME', os.path.expanduser('~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'))

# applies the previous command, then returns the state around our head (same format as sim.World.state)
STATE_JS = """([a, b, R]) => {
  const s = window.slither;
  if (!window.playing || !s) return null;
  if (a !== null) { xm = Math.cos(a) * 250; ym = Math.sin(a) * 250; setAcceleration(b ? 1 : 0); }
  const hx = s.xx, hy = s.yy, R2 = R * R, heads = [], segs = [], food = [], sid = [], hid = [];
  const inr = (x, y) => (x - hx) * (x - hx) + (y - hy) * (y - hy) < R2;
  for (const o of slithers) {
    if (o === s || o.dead) continue;
    const r = 14.5 * o.sc, P = o.pts;
    let px = null, py = null, pin = false;
    for (let i = 0; i <= P.length; i++) {
      let x, y;
      if (i < P.length) { if (P[i].dying) continue; x = P[i].xx; y = P[i].yy; } else { x = o.xx; y = o.yy; }
      const inn = inr(x, y);
      if (px !== null && (inn || pin)) { segs.push(px, py, x, y, r); sid.push(o.id); }
      px = x; py = y; pin = inn;
    }
    if (inr(o.xx, o.yy)) { heads.push(o.xx, o.yy, o.ang, o.sp, o.sc); hid.push(o.id); }
  }
  for (let i = 0; i < foods_c; i++) { const f = foods[i]; if (f && !f.eaten && inr(f.xx, f.yy)) food.push(f.xx, f.yy, f.sz); }
  for (const p of preys) if (!p.eaten && inr(p.xx, p.yy)) food.push(p.xx, p.yy, 10);
  const sct = s.sct + s.rsc;
  const L = Math.floor((fpsls[sct] + s.fam / fmlts[sct] - 1) * 15 - 5);
  return {x: hx, y: hy, ang: s.ang, tgt: s.eang, sp: s.sp, sc: s.sc, L, boost: s.md, wall: [grd, grd, flux_grd],
          heads, segs, food, sid, hid, rank, n: slither_count};   // sid/hid: owner snake id per segment/head
}"""

GREEK = ['Athena', 'Apollo', 'Artemis', 'Hermes', 'Hera', 'Ares', 'Hades', 'Poseidon', 'Demeter', 'Hestia',
         'Dionysus', 'Persephone', 'Achilles', 'Odysseus', 'Perseus', 'Theseus', 'Atlas', 'Helios', 'Selene',
         'Nike', 'Iris', 'Hector', 'Jason', 'Cronus', 'Rhea', 'Gaia', 'Nyx', 'Eos', 'Hyperion', 'Ariadne']
PLANETS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']
MAX_PER_DAY = float('inf')   # user 2026-09-24: no daily cap (was 20); live runs still only on user instruction


def games_today():
    today = time.strftime('%F')
    return sum(1 for f in glob.glob('runs/live_*.jsonl') for l in open(f) if json.loads(l)['at'].startswith(today))


def fly_panel(ctrl):
    """Separate window showing the connectome's activity while Chrome plays (same panel as play.py)."""
    import pygame
    from play import FlyPanel, PANEL_W
    pygame.init()
    screen = pygame.display.set_mode((PANEL_W, 640))
    pygame.display.set_caption('fruit-fly connectome')
    panel = FlyPanel(ctrl.circuit, 0)

    def draw(c):
        pygame.event.pump()
        panel.draw(screen, c)
        pygame.display.flip()
    return draw


# keep the user's mouse from steering the bot while the window is watched
BLOCK_MOUSE_JS = """() => { for (const ev of ['mousemove', 'mousedown', 'mouseup'])
  window.addEventListener(ev, e => { if (window.playing) e.stopImmediatePropagation(); }, true); }"""


def to_state(d):
    d['heads'] = np.array(d['heads'], float).reshape(-1, 5)
    d['segs'] = np.array(d['segs'], float).reshape(-1, 5)
    d['food'] = np.array(d['food'], float).reshape(-1, 3)
    return d


async def open_game(pw, headless):
    br = await pw.chromium.launch(headless=headless, executable_path=CHROME, args=[
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'])
    pg = await br.new_page(viewport={'width': 1280, 'height': 800})
    await pg.goto('http://slither.io/', wait_until='domcontentloaded')
    await pg.wait_for_function('typeof connect==="function" && document.getElementById("nick")', timeout=60000)
    await pg.evaluate(BLOCK_MOUSE_JS)
    return br, pg


async def play(pg, ctrl, nick, cap_s):
    await pg.wait_for_function('!window.playing && !document.getElementById("nick").disabled', timeout=60000)
    await pg.fill('#nick', nick)
    await pg.press('#nick', 'Enter')
    await pg.wait_for_function('window.playing && window.slither', timeout=60000)
    t0, cmd, ticks, lmax, rank = time.time(), None, 0, 0, 10 ** 9
    tail = collections.deque(maxlen=20)
    lat = []
    while True:
        t1 = time.time()
        d = await pg.evaluate(STATE_JS, [None if cmd is None else float(cmd[0]), bool(cmd and cmd[1]), VIEW])
        if d is None or time.time() - t0 > cap_s:
            break
        t2 = time.time()
        S = to_state(d)
        cmd, E = ctrl(S)
        if getattr(ctrl, 'panel', None):
            ctrl.panel(ctrl)
        lat.append((t2 - t1, time.time() - t2))
        ticks += 1
        lmax = max(lmax, S['L'])
        rank = min(rank, S['rank'] or rank)
        cx, cy, R = S['wall']
        tail.append(dict(t=round(t2 - t0, 2), L=S['L'], boost=bool(cmd[1]), tc_min=round(float(E['tc'].min()), 2),
                         tc_max=round(float(E['tc'].max()), 2), n_heads=len(S['heads']), n_segs=len(S['segs']),
                         wall=round(R - np.hypot(S['x'] - cx, S['y'] - cy)),
                         turn=round(float(B.wrap(cmd[0] - S['ang'])), 2)))
    dur = time.time() - t0
    alive = d is not None                               # hit the time cap: still alive (censored)
    await asyncio.sleep(1.5)
    final = 'alive at cap' if alive else await pg.evaluate('document.getElementById("lastscore").innerText')
    lat = np.array(lat) * 1000
    return dict(t_s=round(dur, 1), alive_at_cap=alive, L_max=int(lmax), final=final, best_rank=rank, hz=round(ticks / dur, 1),
                ms_state=round(float(lat[:, 0].mean()), 1), ms_brain=round(float(lat[:, 1].mean()), 1),
                last=list(tail))


async def main(a):
    a.nick = a.nick or random.choice(GREEK) + random.choice(PLANETS)
    if re.search(r'bot|auto|script|(^|[^a-z])ai([^a-z]|$)', a.nick, re.I):
        sys.exit(f'refusing bot-like nickname {a.nick!r}')
    os.makedirs('runs', exist_ok=True)
    left = MAX_PER_DAY - games_today()
    if left <= 0:
        sys.exit(f'daily limit reached ({MAX_PER_DAY} live games); try tomorrow')
    a.games = min(a.games, left)
    a.cap_min = min(a.cap_min, 10)                     # agreed limit: at most 10 minutes per game
    print(f'nick {a.nick!r}, playing {a.games} game(s) ({left} left today)', flush=True)
    params = json.load(open(a.params)) if a.params else None
    tag = ('fly_shield' if a.shield else 'fly') if a.fly else 'rl_shield' if a.model and a.shield else 'rl' if a.model else 'planner'
    out = f'runs/live_{tag}_{time.strftime("%Y%m%d_%H%M%S")}.jsonl'
    async with async_playwright() as pw:
        br, pg = await open_game(pw, a.headless)
        for g in range(a.games):
            if g:
                await asyncio.sleep(random.uniform(30, 90))    # human-like pause between games
            if a.fly:
                import fly
                ctrl = fly.make_fly(json.load(open(a.fly)), a.shield, params)       # same 66 ms neural window as in tuning
                ctrl.panel = fly_panel(ctrl)
            else:
                ctrl = make_ctrl(params, a.model, a.shield)
            try:
                r = await play(pg, ctrl, a.nick, a.cap_min * 60)
                if r['alive_at_cap']:
                    await pg.reload(wait_until='domcontentloaded')
                    await pg.wait_for_function('typeof connect==="function" && document.getElementById("nick")', timeout=60000)
                    await pg.evaluate(BLOCK_MOUSE_JS)
            except Exception as e:                      # never auto-reconnect: a retry loop looks like abuse
                print('game error, stopping:', repr(e)[:200], flush=True)
                open(out, 'a').write(json.dumps(dict(game=g, ctrl=tag, error=repr(e)[:200], at=time.strftime('%F %T'))) + '\n')
                break
            r.update(game=g, ctrl=tag, params=a.params, model=a.model, at=time.strftime('%F %T'))
            open(out, 'a').write(json.dumps(r) + '\n')
            print(f"[{tag}] game {g}: {r['t_s']}s  maxL {r['L_max']}  {r['final']!r}  rank {r['best_rank']}  "
                  f"{r['hz']}Hz  state {r['ms_state']}ms brain {r['ms_brain']}ms", flush=True)
        await br.close()
    print('log:', out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--games', type=int, default=5)
    ap.add_argument('--params')
    ap.add_argument('--model')
    ap.add_argument('--shield', action='store_true')
    ap.add_argument('--fly', nargs='?', const='runs/fly_params.json', help='connectome controller params json')
    ap.add_argument('--nick', default='')
    ap.add_argument('--headless', action='store_true')
    ap.add_argument('--cap-min', type=float, default=10, help='end a game alive after this many minutes')
    asyncio.run(main(ap.parse_args()))
