"""Local simulator served to a browser. Open http://localhost:8765 in Windows Chrome.

Uses the existing Python world/controller; never connects to slither.io.
Simulation advances only on a viewer frame request, with the original 30 Hz step.
"""
import argparse
import json
import math
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
import brain as B
from sim_active import World, DT
from staged import make_controller, observe
from evaluate_active import SETTINGS


class Simulation:
    def __init__(self, stage='pocket', seed=73100):
        self.stage, self.seed = stage, seed
        self.reset()

    def reset(self):
        self.world = World(seed=self.seed, L0=100, **SETTINGS['normal'])
        if self.stage == 'pocket':
            from pocket import PocketController
            self.ctrl = PocketController()
        else:
            self.ctrl = make_controller(self.stage)
        self.manual_used = False
        self.path = []

    def frame(self, data):
        action = data.get('action', 'frame')
        if action not in ('frame', 'reset'):
            raise ValueError('Unknown action')
        angle = float(data.get('angle', 0))
        if not math.isfinite(angle):
            raise ValueError('Invalid angle')
        if action == 'reset':
            self.seed += 1
            self.reset()
        elif data.get('running', False) and self.world.snakes[0]['alive'] and self.world.t < 600:
            if data.get('ai', True):
                cmd, e = self.ctrl(observe(self.world))
                self.path = np.asarray(e['P'][e['selected']]).tolist()
            else:
                cmd = (angle, bool(data.get('boost', False)))
                self.manual_used = True
                self.path = []
                self.ctrl.reset()
            for _ in range(2):
                if not self.world.snakes[0]['alive'] or self.world.t >= 600:
                    break
                self.world.step(cmd)
        return self.state()

    def state(self):
        w = self.world
        own = w.snakes[0]
        origin = np.array([own['x'], own['y']])
        food = w.food[np.linalg.norm(w.food[:, :2]-origin, axis=1) < 1800]
        return dict(stage=self.stage, seed=self.seed, time=w.t, length=own['L'],
                    alive=bool(own['alive']), cause=own.get('cause', ''),
                    mode=self.ctrl.last.get('mode', ''), manual=self.manual_used,
                    origin=origin.tolist(), radius=w.R, food=food.tolist(), path=self.path,
                    snakes=[dict(id=i, radius=B.BODY_R*s['sc'],
                                 points=np.asarray(s['pts']+[[s['x'], s['y']]]).tolist())
                            for i, s in enumerate(w.snakes) if s['alive'] or i == 0])


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--port', type=int, default=8765)
    ap.add_argument('--stage', choices=['coil', 'predict', 'pocket'], default='pocket')
    ap.add_argument('--seed', type=int, default=73100)
    args = ap.parse_args()
    sim = Simulation(args.stage, args.seed)
    token = secrets.token_urlsafe(32)
    lock = threading.Lock()
    page = Path(__file__).with_name('web_sim.html').read_text().replace('__TOKEN__', token).encode()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def reply(self, code, body, content_type):
            self.send_response(code)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == '/':
                self.reply(200, page, 'text/html; charset=utf-8')
            elif self.path == '/state':
                with lock:
                    result = json.dumps(sim.state()).encode()
                self.reply(200, result, 'application/json')
            else:
                self.reply(404, b'Not found', 'text/plain')

        def do_POST(self):
            if self.path != '/frame' or self.headers.get('X-Sim-Token') != token:
                self.reply(403, b'Forbidden', 'text/plain')
                return
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 2048:
                    raise ValueError('Invalid body size')
                data = json.loads(self.rfile.read(size))
                if not isinstance(data, dict):
                    raise ValueError('Expected object')
                with lock:
                    result = json.dumps(sim.frame(data)).encode()
            except (ValueError, TypeError) as exc:
                self.reply(400, str(exc).encode(), 'text/plain')
                return
            except Exception as exc:
                print(f'Simulation stopped: {exc!r}', flush=True)
                self.reply(500, b'Simulation error; stop and inspect server log', 'text/plain')
                return
            self.reply(200, result, 'application/json')

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'LOCAL SIM ready: http://localhost:{args.port} | {args.stage} | no live-site connection', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
