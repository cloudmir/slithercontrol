"""Slither.io brain: one state format, shared by the live browser bridge and the simulator.

State S (dict):
  x, y, ang, sp, sc, L, boost   own head, heading (rad), speed (game units), scale, length score, boosting
  wall  (cx, cy, R)             playable circle
  heads (h,5) x,y,ang,sp,sc     other snakes' heads
  segs  (m,5) ax,ay,bx,by,r     other snakes' body segments with radius
  food  (f,3) x,y,value
"""
import numpy as np
from scipy.spatial.distance import cdist

# Measured on live slither.io 2026-09-23 (protocol_version 19, game1107249518.js)
NSP1, NSP2, NSP3 = 5.39, 0.4, 14.0
SPF = 31.25            # px/s per speed unit (client moves sp/4 px per 8 ms frame)
TURN = 0.033 * 125     # rad/s turn rate before scang (mamu per 8 ms frame)
BODY_R = 14.5          # body radius at sc=1 (drawn width lsz = 29*sc)
SEG = 42.0             # body point spacing (msl)
MSCPS = 430

_fm = np.array([(1 - i / MSCPS) ** 2.25 for i in range(MSCPS)] + [(1 - (MSCPS - 1) / MSCPS) ** 2.25])
FPSLS = np.concatenate([[0.0], np.cumsum(1 / _fm[:-1])])


def score_of_sct(sct):
    return np.floor((FPSLS[min(int(sct), MSCPS)] - 1) * 15 - 5)


def sct_of_score(L):
    return int(np.clip(np.searchsorted(FPSLS, (L + 5) / 15 + 1), 2, MSCPS))


def sc_of_sct(sct):
    return min(6.0, 1 + (sct - 2) / 106)


def scang(sc):
    return .13 + .87 * ((7 - sc) / 6) ** 2


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def dense(segs):
    """Segments -> circles (x,y,r) spaced <= r apart, so gaps between body points are covered."""
    if not len(segs):
        return np.zeros((0, 3))
    a, b, r = segs[:, :2], segs[:, 2:4], segs[:, 4]
    n = np.maximum(1, np.ceil(np.hypot(*(b - a).T) / r)).astype(int)
    idx = np.repeat(np.arange(len(segs)), n)
    f = (np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n)) / np.repeat(n, n)
    return np.column_stack([a[idx] + (b - a)[idx] * f[:, None], r[idx]])


DEF = dict(K=24, H=1.6, dt=0.08, lat=0.10, margin=10.0, head_k=0.30,
           w_clear=1.0, clear_scale=150.0, w_open=1.5, open_range=1000.0,
           w_food=0.6, w_far=0.4, w_turn=0.15, boost_cost=0.5, w_prev=0.1, eat_r=25.0)


class Planner:
    """Sampling MPC: K target headings x {cruise, boost}, rolled out with the real turn/speed limits,
    scored by time-to-collision (bodies, predicted heads, wall), clearance, open space and food."""

    def __init__(self, **p):
        self.p = {**DEF, **p}
        K = int(self.p['K'])
        rel = wrap(np.arange(K) * 2 * np.pi / K)
        self.rel = np.tile(rel, 2)                     # candidate target heading relative to own heading
        self.bst = np.repeat([0, 1], K)                # candidate boost flag
        self.prev = None

    def evaluate(self, S):
        p, K = self.p, int(self.p['K'])
        sc, ang = S['sc'], S['ang']
        r_me = BODY_R * sc
        T = int(round(p['H'] / p['dt']))
        tau = p['lat'] + p['dt'] * np.arange(1, T + 1)           # time since the observation
        tm = p['dt'] * (np.arange(T) + 0.5)
        v = np.where(self.bst, NSP3, NSP1 + NSP2 * sc) * SPF
        om = TURN * scang(sc)
        # latency: until our command lands the snake keeps turning toward the last commanded heading
        turn = np.clip(wrap(S.get('tgt', ang) - ang), -om * p['lat'], om * p['lat'])
        h0 = np.array([S['x'], S['y']]) + S['sp'] * SPF * p['lat'] * np.array([np.cos(ang + turn / 2), np.sin(ang + turn / 2)])
        ang = ang + turn                                   # candidates are relative to this heading
        th = ang + np.clip(self.rel[:, None], -om * tm, om * tm)                  # (C,T)
        step = v[:, None] * p['dt']
        P = np.stack([h0[0] + np.cumsum(step * np.cos(th), 1), h0[1] + np.cumsum(step * np.sin(th), 1)], -1)
        C = len(self.rel)
        flat = P.reshape(-1, 2)

        # static bodies
        obs = dense(S['segs'])
        if len(obs):
            dh = np.hypot(obs[:, 0] - h0[0], obs[:, 1] - h0[1]) - obs[:, 2]
            near = obs[dh < v.max() * p['H'] + r_me + 50]
            far = obs[dh < p['open_range'] + r_me]
        else:
            near = far = obs
        clear = np.full((C, T), 1e4)
        if len(near):
            clear = (cdist(flat, near[:, :2]) - near[:, 2]).min(1).reshape(C, T) - r_me - p['margin']

        # other heads: swept path of the head up to time tau, inflated by uncertainty
        hd = S['heads']
        if len(hd):
            A = hd[:, :2]
            u = np.stack([np.cos(hd[:, 2]), np.sin(hd[:, 2])], -1)
            vh = hd[:, 3] * SPF
            AP = P[:, :, None, :] - A[None, None]                                  # (C,T,h,2)
            s = np.clip((AP * u).sum(-1), 0, vh[None, None] * tau[None, :, None])
            d = np.hypot(*np.moveaxis(AP - s[..., None] * u, -1, 0))
            d -= BODY_R * hd[:, 4] + r_me + p['margin'] + p['head_k'] * vh * tau[None, :, None]
            clear = np.minimum(clear, d.min(-1))

        cx, cy, R = S['wall']
        clear = np.minimum(clear, R - np.hypot(P[..., 0] - cx, P[..., 1] - cy) - r_me - p['margin'])

        bad = clear < 0
        hit = bad.any(1)
        tc = np.where(hit, tau[np.argmax(bad, 1)], p['H'] + p['lat'] + 1)
        cmin = clear.min(1)

        # open space along each target heading (straight rays from the head)
        ua = ang + self.rel[:K]
        U = np.stack([np.cos(ua), np.sin(ua)], -1)
        free = np.full(K, p['open_range'])
        if len(far):
            D = far[:, :2] - h0
            s = D @ U.T                                                            # (n,K)
            rr = (far[:, 2] + r_me)[:, None] ** 2
            perp2 = (D ** 2).sum(1)[:, None] - s ** 2
            hitd = np.where((perp2 < rr) & (s > 0), s - np.sqrt(np.maximum(rr - perp2, 0)), np.inf)
            hitd[(D ** 2).sum(1) < rr[:, 0]] = 0                                  # already inside a body
            free = np.minimum(free, np.maximum(hitd.min(0), 0))
        W = h0 - (cx, cy)
        b = U @ W
        c = W @ W - (R - r_me) ** 2
        free = np.minimum(free, np.maximum(-b + np.sqrt(np.maximum(b * b - c, 0)), 0))
        openk = free / p['open_range']
        opens = (2 * openk + np.roll(openk, 1) + np.roll(openk, -1)) / 4

        # food: eaten along the rollout, plus far attraction per heading sector
        F = S['food']
        food = np.zeros(C)
        farf = np.zeros(K)
        if len(F):
            fd = np.hypot(F[:, 0] - h0[0], F[:, 1] - h0[1])
            Fn = F[fd < v.max() * p['H'] + 100]
            if len(Fn):
                reach = cdist(flat, Fn[:, :2]).reshape(C, T, -1) < r_me + p['eat_r']
                ok = ~np.cumsum(bad, 1).astype(bool)                            # food only counts before a hit
                food = ((reach & ok[..., None]).any(1) * Fn[:, 2]).sum(1)
            fa = wrap(np.arctan2(F[:, 1] - h0[1], F[:, 0] - h0[0]) - ang)
            k = np.round(fa / (2 * np.pi / K)).astype(int) % K
            farf = np.bincount(k, F[:, 2] / (1 + fd / 300), minlength=K)
            farf = (2 * farf + np.roll(farf, 1) + np.roll(farf, -1)) / 4
            farf = farf / (farf.max() + 1e-9)
        return dict(tc=tc, cmin=cmin, open=opens, food=food, far=farf, T=T, P=P, base=ang)

    def score(self, E):
        p, K = self.p, int(self.p['K'])
        safe = E['tc'] > p['H'] + p['lat']
        sc = np.where(safe, 0.0, -10 + 5 * E['tc'] / (p['H'] + p['lat']))
        sc += p['w_clear'] * np.clip(E['cmin'], 0, p['clear_scale']) / p['clear_scale']
        sc += p['w_open'] * np.tile(E['open'], 2) + p['w_far'] * np.tile(E['far'], 2)
        sc += p['w_food'] * E['food'] / (E['food'] + 10)
        sc -= p['w_turn'] * np.abs(self.rel) / np.pi + p['boost_cost'] * self.bst
        return sc

    def act(self, S, E=None):
        E = E or self.evaluate(S)
        sc = self.score(E)
        if self.prev is not None:
            sc += self.p['w_prev'] * np.cos(wrap(E['base'] + self.rel - self.prev))
        a = int(np.argmax(sc))
        self.prev = E['base'] + self.rel[a]
        return a, E

    def action_to_cmd(self, E, a):
        return E['base'] + self.rel[a], bool(self.bst[a])

    def shield(self, E, a, best):
        """Keep the policy's action unless it collides sooner than the planner's choice."""
        return a if E['tc'][a] >= E['tc'][best] else best


def features(S, E, p=DEF):
    """Fixed-size observation for RL, built from the planner's evaluation (same in sim and live)."""
    horizon = p['H'] + p['lat']
    cx, cy, R = S['wall']
    dc = np.hypot(S['x'] - cx, S['y'] - cy)
    to_c = np.arctan2(cy - S['y'], cx - S['x']) - S['ang']
    return np.concatenate([
        np.minimum(E['tc'], horizon) / horizon,
        np.clip(E['cmin'] / p['clear_scale'], -1, 1),
        E['open'], E['far'],
        E['food'] / (E['food'] + 10),
        [S['sc'] / 6, S['sp'] / NSP3, float(S['boost']), np.log1p(max(S['L'], 0)) / 10,
         min(R - dc, 3000) / 3000, np.cos(to_c), np.sin(to_c)],
    ]).astype(np.float32)


if __name__ == '__main__':
    # self-check: a wall of body straight ahead must make the planner turn away, not go straight
    segs = np.array([[300, y, 300, y + 40, 20] for y in range(-400, 400, 40)], float)
    S = dict(x=0, y=0, ang=0.0, sp=5.8, sc=1.0, L=50, boost=False, wall=(0, 0, 5000),
             heads=np.zeros((0, 5)), segs=segs, food=np.zeros((0, 3)))
    pl = Planner()
    a, E = pl.act(S)
    assert E['tc'][0] < 2 and abs(pl.rel[a]) > 0.5, (a, pl.rel[a], E['tc'][:3])
    # a head coming straight at us must be avoided too
    S2 = dict(S, segs=np.zeros((0, 5)), heads=np.array([[400, 0, np.pi, 5.8, 1.0]]))
    a2, E2 = Planner().act(S2)
    assert E2['tc'][0] < 2 and abs(Planner().rel[a2]) > 0.3
    assert sct_of_score(score_of_sct(73)) == 73 and abs(sc_of_sct(73) - 1.67) < .01
    assert features(S, E).shape == (8 * 24 + 7,)
    print('ok', features(S, E).shape, pl.rel[a], a2)
