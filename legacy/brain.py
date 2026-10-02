"""Slither.io brain: one state format, shared by the live browser bridge and the simulator.

State S (dict):
  x, y, ang, tgt, sp, sc, L, boost   own head, heading, last commanded heading, speed (game units), scale, length, boosting
  wall  (cx, cy, R)                  playable circle
  heads (h,5) x,y,ang,sp,sc          other snakes' heads
  segs  (m,5) ax,ay,bx,by,r          other snakes' body segments with radius
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


def rays(O, U, obs, r_me, maxd, wall):
    """Free distance along rays O + s*U (M rays) before touching a body circle or the wall."""
    free = np.full(len(O), float(maxd))
    if len(obs):
        D = obs[None, :, :2] - O[:, None, :]
        s = (D * U[:, None, :]).sum(-1)
        rr = (obs[:, 2] + r_me)[None, :] ** 2
        d2 = (D ** 2).sum(-1)
        perp2 = d2 - s ** 2
        hit = np.where((perp2 < rr) & (s > 0), s - np.sqrt(np.maximum(rr - perp2, 0)), np.inf)
        hit[d2 < rr] = 0                                              # already touching
        free = np.minimum(free, np.maximum(hit.min(1), 0))
    cx, cy, R = wall
    W = O - (cx, cy)
    b = (U * W).sum(1)
    c = (W ** 2).sum(1) - (R - r_me) ** 2
    return np.minimum(free, np.maximum(-b + np.sqrt(np.maximum(b * b - c, 0)), 0))


TURNS = np.array([-1.0, 0.0, 1.0])                 # enemy maneuvers: fraction of its max turn rate
EN_F = np.tile(TURNS, 2)                          # x {current speed, boost}
EN_B = np.repeat([0, 1], len(TURNS))
LIKELY = 1                                        # straight on at current speed

DEF = dict(K=24, H=1.6, dt=0.08, lat=0.10, buffer=4.0, margin=12.0, head_k=0.08,
           w_risk=1.0, w_clear=0.8, clear_scale=150.0, w_open=1.0, w_future=1.0, w_escape=2.0,
           open_range=1000.0, w_food=0.5, w_far=0.4, w_kill=0.5, w_turn=0.1, boost_cost=0.6,
           w_prev=0.1, eat_r=25.0)


class Planner:
    """Sampling MPC: K target headings x {cruise, boost}, rolled out with the real turn/speed limits.
    Hard collision time (actual contact with bodies, wall, enemies going straight) decides life or death;
    enemy turn/boost maneuvers, safety margin, open space, food and counter-kills rank the survivors."""

    def __init__(self, **p):
        self.p = {**DEF, **p}
        K = int(self.p['K'])
        self.rel = np.tile(wrap(np.arange(K) * 2 * np.pi / K), 2)   # target heading relative to own heading
        self.bst = np.repeat([0, 1], K)
        self.prev = None
        self.n_dec = self.n_int = 0                    # shield decisions / interventions

    def evaluate(self, S):
        p, K = self.p, int(self.p['K'])
        sc, ang = S['sc'], S['ang']
        r_me = BODY_R * sc
        T = int(round(p['H'] / p['dt']))
        tau = p['lat'] + p['dt'] * np.arange(1, T + 1)           # time since the observation
        horizon = p['H'] + p['lat']
        tm = p['dt'] * (np.arange(T) + 0.5)
        v = np.where(self.bst, NSP3, NSP1 + NSP2 * sc) * SPF
        om = TURN * scang(sc)
        # latency: until our command lands the snake keeps turning toward the last commanded heading
        turn = np.clip(wrap(S.get('tgt', ang) - ang), -om * p['lat'], om * p['lat'])
        h0 = np.array([S['x'], S['y']]) + S['sp'] * SPF * p['lat'] * np.array([np.cos(ang + turn / 2), np.sin(ang + turn / 2)])
        ang = ang + turn
        th = ang + np.clip(self.rel[:, None], -om * tm, om * tm)                  # (C,T)
        step = v[:, None] * p['dt']
        P = np.stack([h0[0] + np.cumsum(step * np.cos(th), 1), h0[1] + np.cumsum(step * np.sin(th), 1)], -1)
        C = len(self.rel)
        flat = P.reshape(-1, 2)
        reach = v.max() * p['H'] + r_me + 100

        # bodies and wall: actual contact, no margin
        obs = dense(S['segs'])
        near = obs
        if len(obs):
            near = obs[np.hypot(obs[:, 0] - h0[0], obs[:, 1] - h0[1]) - obs[:, 2] < reach]
        # rays only need the raw body points (<= 42 px apart, radius >= 29 incl. ours, so no gaps)
        far = S['segs'][:, [0, 1, 4]] if len(S['segs']) else np.zeros((0, 3))
        far = far[np.hypot(far[:, 0] - h0[0], far[:, 1] - h0[1]) < reach + p['open_range']]
        d_body = np.full((C, T), 1e4)
        if len(near):
            d_body = (cdist(flat, near[:, :2]) - near[:, 2]).min(1).reshape(C, T) - r_me
        cx, cy, R = S['wall']
        d_wall = R - np.hypot(P[..., 0] - cx, P[..., 1] - cy) - r_me

        # enemy heads: every maneuver within their turn/boost limits; the body they lay down counts too
        d_head = d_risk = np.full((C, T), 1e4)
        kill = np.zeros(C)
        hd = S['heads']
        if len(hd):
            dist = np.hypot(hd[:, 0] - h0[0], hd[:, 1] - h0[1])
            keep = np.argsort(dist)[:6]
            hd, dist = hd[keep], dist[keep]
            ok = dist < reach + NSP3 * SPF * horizon
            hd, dist = hd[ok], dist[ok]
        if len(hd):
            n, O = len(hd), len(EN_F)
            rj = BODY_R * hd[:, 4]
            omj = TURN * scang(hd[:, 4])
            vj = np.where(EN_B[None, :], NSP3, hd[:, 3:4]) * SPF                   # (n,O)
            t_all = np.concatenate([[0.0], tau])
            dts = np.diff(t_all)
            tmid = t_all[:-1] + dts / 2
            thj = hd[:, 2][:, None, None] + EN_F[None, :, None] * omj[:, None, None] * tmid
            stp = (vj[:, :, None] * dts)[..., None] * np.stack([np.cos(thj), np.sin(thj)], -1)
            Q = np.concatenate([np.broadcast_to(hd[:, None, None, :2], (n, O, 1, 2)),
                                hd[:, None, None, :2] + np.cumsum(stp, 2)], 2)   # (n,O,T+1,2)
            rad = rj[:, None, None] + r_me + p['head_k'] * vj[:, :, None] * t_all
            D = cdist(flat, Q.reshape(-1, 2)).reshape(C, T, n, O, T + 1) - rad
            future = np.arange(T + 1)[None, :] > np.arange(T)[:, None] + 1          # not laid down yet at our step
            D = np.where(future[None, :, None, None, :], np.inf, D).min(-1)         # (C,T,n,O)
            d_head = D[..., LIKELY].min(-1)
            d_risk = D.min((-1, -2))
            # counter-kill: an attacker aiming at us, whose straight path runs into the body we lay down
            to_me = np.arctan2(h0[1] - hd[:, 1], h0[0] - hd[:, 0])
            threat = (dist < 900) & (np.abs(wrap(to_me - hd[:, 2])) < 1.0)
            if threat.any():
                Eh = Q[threat, LIKELY, 1:]                                          # (nt,T,2)
                DK = cdist(Eh.reshape(-1, 2), flat).reshape(len(Eh), T, C, T)
                laid = np.arange(T)[None, :] < np.arange(T)[:, None] - 1            # our point k' is body at time k
                DK = np.where(laid[None, :, None, :], DK, np.inf).min(-1)           # (nt,T,C)
                hit = (DK < (rj[threat] + r_me)[:, None, None]).any(1)              # (nt,C)
                kill = (hit * hd[threat, 4:5]).max(0)

        hard = np.minimum(np.minimum(d_body, d_wall), d_head) - p['buffer']      # small buffer for model error
        bad = hard < 0
        tc = np.where(bad.any(1), tau[np.argmax(bad, 1)], horizon + 1)
        badr = d_risk < 0
        tr = np.where(badr.any(1), tau[np.argmax(badr, 1)], horizon + 1)
        cmin_hard = hard.min(1)
        cmin_soft = np.minimum(hard, d_risk).min(1) - p['margin']

        # open space: straight rays from the head per heading, and from each rollout's end
        ua = ang + self.rel[:K]
        openk = rays(np.tile(h0, (K, 1)), np.stack([np.cos(ua), np.sin(ua)], -1), far, r_me, p['open_range'], S['wall']) / p['open_range']
        enc = float((openk < 0.5).mean())                                           # how enclosed we are
        opens = (2 * openk + np.roll(openk, 1) + np.roll(openk, -1)) / 4
        ue = th[:, -1][:, None] + np.array([-0.5, 0, 0.5])
        fut = rays(np.repeat(P[:, -1], 3, 0), np.stack([np.cos(ue), np.sin(ue)], -1).reshape(-1, 2),
                   far, r_me, p['open_range'], S['wall']).reshape(C, 3).mean(1) / p['open_range']

        # food: eaten along the rollout (before any hit), plus far attraction per heading sector
        F = S['food']
        food, farf = np.zeros(C), np.zeros(K)
        if len(F):
            fd = np.hypot(F[:, 0] - h0[0], F[:, 1] - h0[1])
            Fn = F[fd < reach]
            if len(Fn):
                got = cdist(flat, Fn[:, :2]).reshape(C, T, -1) < r_me + p['eat_r']
                alive = ~np.cumsum(bad, 1).astype(bool)
                food = ((got & alive[..., None]).any(1) * Fn[:, 2]).sum(1)
            fa = wrap(np.arctan2(F[:, 1] - h0[1], F[:, 0] - h0[0]) - ang)
            k = np.round(fa / (2 * np.pi / K)).astype(int) % K
            farf = np.bincount(k, F[:, 2] / (1 + fd / 300), minlength=K)
            farf = (2 * farf + np.roll(farf, 1) + np.roll(farf, -1)) / 4
            farf = farf / (farf.max() + 1e-9)
        return dict(tc=tc, tr=tr, cmin_hard=cmin_hard, cmin_soft=cmin_soft, open=opens, fut=fut, enc=enc,
                    kill=kill, food=food, far=farf, T=T, P=P, base=ang, horizon=horizon)

    def score(self, E):
        p = self.p
        hz = E['horizon']
        sc = p['w_risk'] * np.minimum(E['tr'], hz) / hz
        sc += p['w_clear'] * np.clip(E['cmin_soft'], 0, p['clear_scale']) / p['clear_scale']
        sc += p['w_open'] * np.tile(E['open'], 2) + (p['w_future'] + p['w_escape'] * E['enc']) * E['fut']
        sc += p['w_far'] * np.tile(E['far'], 2) + p['w_food'] * E['food'] / (E['food'] + 10)
        sc += p['w_kill'] * np.minimum(E['kill'], 2)
        sc -= p['w_turn'] * np.abs(self.rel) / np.pi + p['boost_cost'] * (1 - E['enc']) * self.bst
        # a doomed candidate is ranked only by how late and how shallow the contact is
        return np.where(E['tc'] > hz, sc, -20 + 5 * E['tc'] / hz + 2 * np.tanh(E['cmin_hard'] / 50))

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

    def shield(self, E, a, best, eps=0.3):
        """Keep the policy's action unless it collides sooner than the planner's choice, or - when both are
        collision-free - a likely enemy maneuver (turn/boost) reaches it clearly sooner (tr, eps seconds)."""
        hz = E['horizon']
        safe_both = E['tc'][a] > hz and E['tc'][best] > hz
        out = best if E['tc'][a] < E['tc'][best] or (safe_both and E['tr'][a] < E['tr'][best] - eps) else a
        self.n_dec += 1
        self.n_int += out != a
        return out


def features(S, E, p=DEF):
    """Fixed-size observation for RL, built from the planner's evaluation (same in sim and live)."""
    hz = E['horizon']
    cx, cy, R = S['wall']
    dc = np.hypot(S['x'] - cx, S['y'] - cy)
    to_c = np.arctan2(cy - S['y'], cx - S['x']) - S['ang']
    return np.concatenate([
        np.minimum(E['tc'], hz) / hz, np.minimum(E['tr'], hz) / hz,
        np.clip(E['cmin_soft'] / p['clear_scale'], -1, 1), E['fut'], np.minimum(E['kill'], 2) / 2,
        E['food'] / (E['food'] + 10), E['open'], E['far'],
        [E['enc'], S['sc'] / 6, S['sp'] / NSP3, float(S['boost']), np.log1p(max(S['L'], 0)) / 10,
         min(R - dc, 3000) / 3000, np.cos(to_c), np.sin(to_c)],
    ]).astype(np.float32)


def n_features(K=DEF['K']):
    return 14 * K + 8


if __name__ == '__main__':
    base = dict(x=0, y=0, ang=0.0, tgt=0.0, sp=5.8, sc=1.0, L=50, boost=False, wall=(0, 0, 5000),
                heads=np.zeros((0, 5)), segs=np.zeros((0, 5)), food=np.zeros((0, 3)))
    wall = lambda x, y0, y1: [[x, y, x, y + 20, 14.5] for y in range(y0, y1, 20)]
    line = lambda y, x0, x1: [[x, y, x + 20, y, 14.5] for x in range(x0, x1, 20)]
    # 1. body wall straight ahead: turn away
    S = dict(base, segs=np.array(wall(300, -400, 400), float))
    pl = Planner()
    a, E = pl.act(S)
    assert E['tc'][0] < 2 and abs(pl.rel[a]) > 0.5, (pl.rel[a], E['tc'][:3])
    # 2. a head coming straight at us: dodge
    a, E = Planner().act(dict(base, heads=np.array([[400, 0, np.pi, 5.8, 1.0]])))
    assert E['tc'][0] < 2 and abs(pl.rel[a]) > 0.3
    # 3. squeezed in a corridor inside the safety margin (the live death pattern): go through, don't panic
    corridor = dict(base, segs=np.array(line(31, -400, 900) + line(-31, -400, 900), float))   # 1 px real clearance
    a, E = Planner(buffer=0).act(corridor)
    assert E['tc'][a] > E['horizon'] and abs(pl.rel[a]) < 0.3, (pl.rel[a], E['tc'][[0, 24]])
    a, E = Planner().act(corridor)                                   # buffer > clearance: still the shallowest way
    assert abs(pl.rel[a]) < 0.3, pl.rel[a]
    # 4. enclosed by a ring with a gap at +90 deg: head for the gap
    ring = [[250 * np.cos(t), 250 * np.sin(t), 250 * np.cos(t + .08), 250 * np.sin(t + .08), 14.5]
            for t in np.arange(0, 2 * np.pi, .08) if abs(wrap(t - np.pi / 2)) > 0.35]
    a, E = Planner().act(dict(base, segs=np.array(ring)))
    assert 0.8 < pl.rel[a] < 2.4 and E['tc'][a] > E['horizon'], (pl.rel[a], E['enc'])
    # 5. an attacker diving at our path from the side: cutting across it is scored as a kill
    a, E = Planner().act(dict(base, heads=np.array([[150, 250, -np.pi / 2, 5.8, 1.2]])))
    assert E['kill'][0] > 0 and E['tc'][0] > E['horizon'], (E['kill'][:4], E['tc'][:4])
    assert sct_of_score(score_of_sct(73)) == 73 and abs(sc_of_sct(73) - 1.67) < .01
    assert features(S, E).shape == (n_features(),)
    print('brain ok', n_features())
