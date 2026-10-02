"""Pilot: zero-base main controller (user plan 1.a-4.c, 2026-09-25).

Every tick (~30 Hz) it scores 24 headings x {cruise, boost}. Each candidate is a
simulated 1.2 s path built from live measurements:
- the command lands LAT s late, so we first keep turning toward the previous command;
- turn rate by thickness, speed 31 px/s per sp, boost sp 14 reached in ~0.57 s (claim-boost-speed);
- contact = drawn gap <= HARD (deaths seen at -5..-7 px drawn, probe + passive data).

Clearance of a candidate = its worst drawn gap along the path to bodies, to the wall, and to
where nearby heads will lay new body (straight cruise and straight surprise boost),
plus a small credit for time (a later threat leaves room to react).

Choice:
- safe candidates (clearance >= SAFE, or TIGHT when contesting food with no head near, 4.c)
  are ranked by food eaten along the path and toward the richest cluster (4.a/4.b: remains,
  food size >= REMAINS, pay for a boost; ordinary food only when a lot of it is on the path),
  room at the path end, escape through the widest opening when bodies surround us (2.d),
  moving away from an attacker (3.a/3.b), cutting across an attacker's path ahead of it (3.c),
  and a small cost for changing the command (no thrashing).
- none safe: emergency, maximise clearance (boost allowed) (2.c).
Trace per tick: mode, boost, clearance, threat, enclosure and the two nearest snakes on either
side ("thread", 1.c: passing precisely between snakes).
"""
import os

import cv2
import numpy as np
from scipy.spatial import cKDTree

R = 14.5
PX_PER_SP = 31.
BOOST_SP, RAMP = 14., .57            # sp while boosting; s from cruise to full boost
DT, N = .08, 15                      # path step (s) and steps: 1.2 s
LAT = .1                             # s before a new command takes effect
HARD = 0.                            # px drawn gap: contact assumed at or below (deaths seen from -1.5 px down)
SAFE, TIGHT = 18., 5.                # px drawn gap kept normally / while contesting food
SAFE_HEADS = 30.                     # px drawn gap kept while a head is within 300 px (boosting heads lay body fast)
CREDIT = 25.                         # px per s of path time added to the gap
REACH = 700.                         # px: bodies beyond this cannot matter within 1.2 s
HEAD_R = 900.                        # px: heads considered
HEAD_NEAR = 150.                     # px: head forecast gaps beyond this cannot change a decision
REMAINS = 12.                        # food size of dead-snake remains (14-16, normal food 3-9)
FOOD_R = 3000.                       # px: food considered for the goal (user: see far remains too; was 900)
EAT = 30.                            # px beyond our radius where food is sucked in (assumed)
CELL, HALF = 2., 560.                # px: body clearance grid around us (a 1.2 s boost path reaches ~520 px)
ANGLES = np.radians(np.arange(-180, 180, 15))
W_FOOD, W_GOAL, W_OPEN, W_ESC, W_AWAY, W_CUT, W_TURN = 2., 40., .05, 40., 30., 20., .12
SWITCH = 8.                         # score a new plan must beat the held one by (a plan is only valid if held)
W_WRAP = 100.                        # pull toward the opening when one snake wraps around us
BOOST_COST = 12.                     # score units per boost decision (length lost); profile sets it
W_RUN = 40.                          # attacked (both profiles, user): boost away from the attacker - leave fast
BOOST_SAFETY = 5.                    # px of clearance that pays for a boost in an emergency
HARD_PHYS = 10.                      # px: a safe plan also keeps this real drawn gap (time credit aside; Codex 2026-09-25)
BIG_RATIO, W_BIG = 1.5, 40.          # thicker than us by this: keep away (user b; 6 of 7 thicker wrappers were >= 1.5x)
W_PROG, W_WP = 20., 40.              # progress (large arcs, user c) / pull out of a loop toward open space (user d)
LOOP_STRAIGHT = .5                   # 5 s net move / path length below this = circling in place (user: still coils)
W_RING, RING_HOLD = 60., .5          # closed ring (cover >= .9 for RING_HOLD s): ride its inner edge (user a)
# User 2026-09-25 15:1x: spread out long (no coiling), never run alongside a longer snake the same way, no rim riding.
W_CURL, CURL_ON = 60., .25           # own body covering > CURL_ON of the bearings near our head: straighten away (full at .6)
W_PAR, LONG_RATIO = 30., 1.5         # alongside a snake longer (visible) or 1.3x thicker than us, same direction: avoid
W_CENTER, RIM = 40., .5              # beyond RIM of the map radius: pull back toward the middle
W_CROWD = 0.                         # aggressive profile only: pull toward where the heads are
CROWD_R = 700.                       # px: heads this close to each other count as one crowd
# User 2026-09-25 16:xx ("deaths are 2 things: we spin in place and get wrapped; and when we do circle, trace our own
# circle exactly"): calm modes turn at most CALM_RATE (large arcs, radius ~120 px at cruise); once wrapped, lock a
# full-rate turn in one direction: the game's turn rate is fixed, so every lap retraces the same circle.
# User 2026-09-25: plan at least 3 s ahead. After the 1.2 s fine path, each candidate must still have a way on for
# LONG_T s: a fan of LONG_FAN headings (within +-90 deg of its end heading) cast from its end point at cruise speed
# over a coarse field reaching LONG_HALF px; a candidate whose every ray hits a body inside LONG_T is a dead end.
# User 2026-09-25 later: 5 s if it costs nothing -> 1.2 + 3.8 s; the far field must reach 520 px + 3.8 s of cruise.
LONG_T, LONG_HALF, LONG_CELL = 3.8, 1300., 6.
LONG_FAN = np.radians(np.arange(-90, 91, 30))
LONG_SAFE = 10.                      # px drawn gap the best onward ray must keep
SIDE_HOLD = .6                       # s a sharp turn's side is held (P16)
CONFIRM = 2                          # ticks a better plan must stay best before it replaces a safe held one
PEND_GAP = .1                        # s: a pending plan older than this (no consecutive tick) is dropped
BOOST_DWELL = RAMP/2                 # s: a boost change undone sooner reaches less than half the speed change
MAX_REL = np.radians(150)            # widest command off our heading
CALM_RATE = np.radians(90)           # rad/s turning allowed while nothing forces a sharp turn
COIL_ON, COIL_OFF = .9, .5           # one snake closing the ring (open gap: escape instead) / stop below this for 1 s


def set_profile(name):
    """'safe' (default) or 'aggressive' (close-quarter data for precision, user 3.a/3.b and 16:xx):
    thinner margins, into the crowd, no running-away terms (away from attackers / thick / long snakes / crowds),
    closing in on the nearest head and cutting across heads. The collision filter itself stays on in both:
    staying alive in the crowd is what yields the data. Chosen by PILOT_MODE; logged in every trace tick."""
    global SAFE, SAFE_HEADS, HARD_PHYS, W_CUT, W_CROWD, W_AWAY, W_BIG, W_PAR, W_ESC, W_HUNT, W_THREAD, PROFILE, BOOST_COST
    PROFILE = name
    if name == 'aggressive':
        SAFE, SAFE_HEADS, HARD_PHYS, W_CUT, W_CROWD = 10., 18., 5., 60., 60.
        W_AWAY, W_BIG, W_PAR, W_ESC, W_HUNT, W_THREAD = 0., 0., 0., 0., 40., 40.
        BOOST_COST = -10.    # (beats SWITCH so a held cruise plan gives way) user: boost as much as possible (faster data, needs precision); safety filter still gates it
    else:
        SAFE, SAFE_HEADS, HARD_PHYS, W_CUT, W_CROWD = 18., 30., 10., 20., 0.
        W_AWAY, W_BIG, W_PAR, W_ESC, W_HUNT, W_THREAD = 30., 40., 30., 40., 0., 0.
        BOOST_COST = 12.


set_profile(os.environ.get('PILOT_MODE', 'safe'))


def cruise_sp(sc):
    return np.interp(sc, [1, 1.4, 1.9, 2.6, 3.5], [5.79, 5.89, 6.12, 6.33, 6.83])


def turn_rate(sc):
    return np.radians(np.interp(sc, [1, 2, 3.5], [230, 200, 130]))


def wrap(a):
    return (a+np.pi) % (2*np.pi)-np.pi


def seg_dist(pts, segs):
    """(P,2) points x (S,5) segments -> (P,S) centre distance to each segment."""
    a, ab = segs[:, :2], segs[:, 2:4]-segs[:, :2]
    ap = pts[:, None, :]-a[None]
    t = np.clip((ap*ab).sum(-1)/np.maximum((ab*ab).sum(-1), 1e-9), 0, 1)
    return np.linalg.norm(ap-t[..., None]*ab, axis=-1)


def body_field(p, segs, sid, cell=None, half=None):
    """Distance (px) from every cell of a grid around p to the nearest body surface."""
    cell, half = cell or CELL, half or HALF
    n = int(2*half/cell)
    img = np.full((n, n), 255, np.uint8)
    if len(segs):
        o = p-half
        brk = np.r_[True, (sid[1:] != sid[:-1]) | (np.abs(segs[1:, :2]-segs[:-1, 2:4]).sum(1) > 1e-3)]
        starts = np.flatnonzero(brk)
        for a, b in zip(starts, np.r_[starts[1:], len(segs)]):
            q = np.round((np.vstack((segs[a:b, :2], segs[b-1, 2:4]))-o)/cell*4).astype(np.int32)
            cv2.polylines(img, [q], False, 0, thickness=max(1, int(round(2*segs[a, 4]/cell))), shift=2)
    # ponytail: 5x5 mask (~2% distance error, ~1 px at 50 px); DIST_MASK_PRECISE if tight margins need it
    return np.minimum(cv2.distanceTransform(img, cv2.DIST_L2, cv2.DIST_MASK_5), 1e4)*cell, p-half, cell   # no body: huge


def field_gap(field, pts):
    d, o, cell = field
    ij = np.floor((pts-o)/cell).astype(int)
    inside = (ij >= 0).all(1) & (ij < d.shape[0]).all(1)
    out = np.full(len(pts), 1e3)
    out[inside] = d[ij[inside, 1], ij[inside, 0]]
    return out


def paths(p, ang, sp, sc, prev, headings, boost, prev_boost=False):
    """Positions (C,N,2) and times (N,) of our head for each (heading, boost). Until LAT the previous
    command (heading and boost) is still in force; heading and speed are taken at each step's midpoint."""
    t = np.arange(1, N+1)*DT
    tm = t-DT/2
    w = turn_rate(sc)
    hL = ang+np.clip(wrap(prev-ang), -w*LAT, w*LAT)
    after = np.maximum(tm-LAT, 0)
    d = wrap(headings-hL)[:, None]
    h = np.where(tm < LAT, ang+np.clip(wrap(prev-ang), -w*tm, w*tm), hL+np.sign(d)*np.minimum(abs(d), w*after))
    rate = (BOOST_SP-cruise_sp(sc))/RAMP
    ramp = lambda v0, up, dt: np.minimum(BOOST_SP, v0+rate*dt) if up else np.maximum(cruise_sp(sc), v0-rate*dt)
    spL = ramp(sp, prev_boost, LAT)
    v = np.where(tm < LAT, ramp(sp, prev_boost, np.minimum(tm, LAT)),
                 np.where(boost[:, None], np.minimum(BOOST_SP, spL+rate*after), np.maximum(cruise_sp(sc), spL-rate*after)))*PX_PER_SP
    step = (v*DT)[..., None]*np.stack((np.cos(h), np.sin(h)), -1)
    return p+np.cumsum(step, axis=1), t


def coil_path(p, ang, sp, sc, prev, direction, prev_boost=False):
    """Our head (N,2) when after LAT we turn at full rate in `direction` every tick (the coil as driven: the
    command is re-aimed 90 deg ahead each tick, so the heading never settles - Codex 2026-09-25 #3)."""
    t = np.arange(1, N+1)*DT
    tm = t-DT/2
    w = turn_rate(sc)
    hL = ang+np.clip(wrap(prev-ang), -w*LAT, w*LAT)
    h = np.where(tm < LAT, ang+np.clip(wrap(prev-ang), -w*tm, w*tm), hL+direction*w*np.maximum(tm-LAT, 0))
    rate = (BOOST_SP-cruise_sp(sc))/RAMP        # speed exactly as paths(): previous boost state until LAT, then cruise
    ramp = lambda v0, up, dt: np.minimum(BOOST_SP, v0+rate*dt) if up else np.maximum(cruise_sp(sc), v0-rate*dt)
    spL = ramp(sp, prev_boost, LAT)
    v = np.where(tm < LAT, ramp(sp, prev_boost, np.minimum(tm, LAT)),
                 np.maximum(cruise_sp(sc), spL-rate*np.maximum(tm-LAT, 0)))*PX_PER_SP
    return p+np.cumsum((v*DT)[:, None]*np.stack((np.cos(h), np.sin(h)), -1), axis=0), t


def head_paths(h, omega=0.):
    """Where a head will be over the next 1.2 s: at its speed and on a surprise boost, straight and,
    when it is turning (omega rad/s measured between ticks), along that arc (circling attackers)."""
    t = np.arange(1, N+1)*DT
    rate = (BOOST_SP-cruise_sp(h[4]))/RAMP
    omega = float(np.clip(omega, -turn_rate(h[4]), turn_rate(h[4])))
    out = []
    for w in ((0., omega) if abs(omega) > .5 else (0.,)):
        hdg = h[2]+w*(t-DT/2)
        u = np.stack((np.cos(hdg), np.sin(hdg)), -1)
        for v in (np.full(N, max(h[3], 4.)), np.minimum(BOOST_SP, max(h[3], 4.)+rate*t)):
            out.append(h[:2]+np.cumsum((v*PX_PER_SP*DT)[:, None]*u, axis=0))
    return np.vstack(out), np.tile(t, len(out))


GAP_EXTRA, GAP_R = 120., 450.          # narrow gap: surface-to-surface width up to 2*ro + GAP_EXTRA, within GAP_R px
THREAD_TOL = 3.                         # px we may stray from the gap's centre line before it counts against us
W_CENTRE = 40.                          # score for passing a gap on its centre line (off-centre costs up to this)


def find_gaps(p, segs, sid, near_all, ro, n_snakes=4):
    """Narrow passages between two different snakes near us (user 2026-09-25: squeeze between two bodies).
    For each pair of the n nearest snakes: the closest points of their bodies, the surface-to-surface width w,
    the midpoint m and the channel direction (perpendicular to the line joining the two bodies, pointing away
    from us). Kept if 2*ro < w <= 2*ro + GAP_EXTRA and m is within GAP_R px."""
    gaps = []
    if not len(segs): return gaps
    close = near_all < GAP_R
    ids = sorted(np.unique(sid[close]), key=lambda i: near_all[sid == i].min())[:n_snakes]
    for a in range(len(ids)):
        for b in range(a+1, len(ids)):
            A = segs[close & (sid == ids[a])]; B = segs[close & (sid == ids[b])]
            pa = np.vstack((A[:, :2], A[-1:, 2:4]))
            d = seg_dist(pa, B)
            i, j = np.unravel_index(int(np.argmin(d)), d.shape)
            q = pa[i]
            bb = B[j]; ab = bb[2:4]-bb[:2]
            tt = np.clip(((q-bb[:2])@ab)/max(ab@ab, 1e-9), 0, 1)
            qb = bb[:2]+tt*ab
            sep = qb-q; dist = float(np.hypot(*sep))
            w = dist-A[0, 4]-B[0, 4]
            if not (2*ro < w <= 2*ro+GAP_EXTRA): continue
            u = sep/max(dist, 1e-9)                                    # from body A to body B
            m = q+u*(A[0, 4]+w/2)                                      # centre of the free space between surfaces
            if np.hypot(*(m-p)) > GAP_R: continue
            ch = np.array([-u[1], u[0]])
            if ch@(m-p) < 0: ch = -ch
            gaps.append(dict(m=m, ch=ch, w=w, ra=float(A[0, 4]), rb=float(B[0, 4]), ids=(int(ids[a]), int(ids[b]))))
    return gaps


class Pilot:
    period = 1/30

    def __init__(self):
        self.prev, self.last, self.turn_sign, self.seen, self.prev_boost = None, {}, 0., {}, False
        self.close_heads, self.died_near, self.kills = {}, 0, 0
        self.cov_hist = []                   # (t, {snake: coverage}) for the wrap trend
        self.pending, self.big_prev = {}, np.empty((0, 3))
        self.hist, self.no_food_until, self.wp, self.wp_until, self.closed_since = [], -1., None, -1., None
        self.coil_dir, self.coil_low_since, self.esc_lock, self.last_coil = 0., None, None, None
        self.side, self.side_until = 0., -1.   # turn side we committed to (P16) and until when
        self.pend, self.boost_since = None, -1.  # a new plan waiting for confirmation / when boost last changed

    def __call__(self, s):
        p = np.array([s['x'], s['y']]); ang, sp, sc = float(s['ang']), float(s['sp']), float(s['sc'])
        ro = R*sc
        prev = ang if self.prev is None else self.prev
        segs, sid = s['segs'], s['sid']
        near_all = seg_dist(p[None], segs)[0]-segs[:, 4] if len(segs) else np.empty(0)
        keep = near_all < REACH
        field = body_field(p, segs[keep], sid[keep])
        far_keep = near_all < LONG_HALF+300 if len(segs) else keep
        far_field = body_field(p, segs[far_keep], sid[far_keep], LONG_CELL, LONG_HALF)
        heads, omegas, seen = [], [], {}
        for h, i in zip(s['heads'], s['hid']):
            seen[int(i)] = (float(h[2]), s['t'])
            if np.hypot(*(h[:2]-p)) >= HEAD_R: continue
            a0, t0 = self.seen.get(int(i), (None, None))
            heads.append(h); omegas.append(wrap(h[2]-a0)/(s['t']-t0) if a0 is not None and .01 < s['t']-t0 < .25 else 0.)
        self.seen = seen
        # 3.c check: a head that was within 500 px vanishes and remains appear where it was -> it died near us;
        # a kill of ours when our body was right there.
        food_now = s['food']
        big = food_now[food_now[:, 2] >= REMAINS] if len(food_now) else np.empty((0, 3))
        if len(big) and len(self.big_prev):
            new = big[(((big[:, None, :2]-self.big_prev[None, :, :2])**2).sum(-1) > 9).all(1)]
        else:
            new = big
        own = s['own']
        for i, (q, r_h) in self.close_heads.items():
            if i not in seen:        # vanished: remember whether our body was right there
                self.pending[i] = (q, s['t'], bool(len(own) and (np.hypot(own[:, 0]-q[0], own[:, 1]-q[1]) < ro+r_h+40).any()))
        for i, (q, t_v, ours) in list(self.pending.items()):
            if len(new) and (np.hypot(new[:, 0]-q[0], new[:, 1]-q[1]) < 200).any():
                self.died_near += 1; self.kills += ours; del self.pending[i]
            elif s['t']-t_v > .6 or i in seen:
                del self.pending[i]
        self.big_prev = big
        self.close_heads = {int(i): (h[:2].copy(), R*h[4]) for h, i in zip(s['heads'], s['hid']) if np.hypot(*(h[:2]-p)) < 500}
        # Commit to the side of a big turn until it is nearly done (P1 game 3 died flip-flopping -150/+165).
        rel_prev = wrap(prev-ang)
        if abs(rel_prev) > np.radians(60): self.turn_sign = np.sign(rel_prev)
        elif abs(rel_prev) < np.radians(20): self.turn_sign = 0.

        gaps = find_gaps(p, segs, sid, near_all, ro)
        aims = [a_ for g in gaps for a_ in (g['m'], g['m']+80*g['ch'])]   # the gap centre and 80 px on down the channel
        gap_rel = [wrap(np.arctan2(*(a_-p)[::-1])-ang) for a_ in aims]
        lim = CALM_RATE*self.period
        # Codex 2026-09-25 #1: every command we may emit is a candidate we evaluated. Calm turns (+-lim) are
        # candidates, not a clamp after the choice; nothing aims beyond +-150 deg (straight behind is ambiguous:
        # the game, not we, would pick the turn side - P16).
        rel = np.clip(np.r_[ANGLES, lim, -lim, gap_rel, wrap(prev-ang)], -MAX_REL, MAX_REL)   # last: the previous command
        C, crel = len(rel), rel                   # crel: candidate turns (`rel` is reused below)
        hd = np.r_[ang+rel, ang+rel]
        bst = np.r_[np.zeros(C, bool), np.ones(C, bool)]
        pos, t = paths(p, ang, sp, sc, prev, hd, bst, self.prev_boost)
        P = pos.reshape(-1, 2)
        credit = CREDIT*np.tile(t, 2*C)

        # Bodies and the wall: worst drawn gap along each path.
        gap = field_gap(field, P)-ro
        w = s['wall']
        gap = np.minimum(gap, w[2]-np.hypot(P[:, 0]-w[0], P[:, 1]-w[1])-ro)
        # Heads lay new body where they go: our point at time t meets forecast points laid before t.
        threat, attacker, hpaths = 0., None, []
        straight = len(ANGLES)//2*N            # index of our straight cruise path (ANGLES[len//2] == 0)
        tP = np.tile(t, 2*C)
        for h, om in zip(heads, omegas):
            hp, ht = head_paths(h, om)
            hpaths.append((hp, ht, R*h[4]))
            # its forecast against our straight cruise path only (the attack test below); all paths at once after the loop
            d2 = ((P[straight:straight+N, None, :]-hp[None])**2).sum(-1)
            d2 = np.where(ht[None] <= t[:, None]+.15, d2, 1e8)
            hg_s = np.sqrt(d2.min(1))-ro-R*h[4]
            # 3.a attack: coming our way, aimed at where we will be in ~0.6 s, or boosting alongside to cut us off.
            rel = p-h[:2]; dist = np.hypot(*rel)
            ahead = p+.6*sp*PX_PER_SP*np.array([np.cos(ang), np.sin(ang)])-h[:2]
            aim_off = abs(wrap(h[2]-np.arctan2(ahead[1], ahead[0])))
            closing = np.cos(h[2]-np.arctan2(rel[1], rel[0]))
            side = rel@np.array([-np.sin(ang), np.cos(ang)])
            fwd = -rel@np.array([np.cos(ang), np.sin(ang)])
            cutting = 0 < fwd < 350 and abs(side) < 250 and abs(wrap(h[2]-ang)) < np.radians(35) and h[3] > sp+1
            crossing = hg_s.min() < 40          # its forecast (arc included) runs over our way
            close = dist < 250 and h[3] >= sp-.5
            if dist < 600 and ((closing > .5 and aim_off < np.radians(25)) or cutting or crossing or close):
                level = (600-dist)/600
                if level > threat: threat, attacker = level, h
        gap_static = gap.reshape(-1, N).min(1)       # bodies and wall only (for the trace: why a path was rejected)
        gap_heads = np.full(2*C, np.inf)
        if hpaths:
            # Heads lay body where they go: our point at time t meets forecast points laid before t. Only pairs within
            # HEAD_NEAR px can change a decision (every threshold is < 60 px): a KD-tree finds them (was ~6-13 ms dense).
            H = np.vstack([hp for hp, _, _ in hpaths]); HT = np.concatenate([ht for _, ht, _ in hpaths])
            HR = np.concatenate([np.full(len(hp), hr) for hp, _, hr in hpaths])
            pr = cKDTree(P).sparse_distance_matrix(cKDTree(H), HEAD_NEAR+ro+HR.max(), output_type='ndarray')
            ok = HT[pr['j']] <= tP[pr['i']]+.15
            hg = np.full(len(P), np.inf)
            np.minimum.at(hg, pr['i'][ok], pr['v'][ok]-ro-HR[pr['j'][ok]])
            gap = np.minimum(gap, hg)
            gap_heads = hg.reshape(2*C, N).min(1)
        gap = gap.reshape(2*C, N)
        clear = (gap+credit.reshape(2*C, N)).min(1)
        hard = gap.min(1)
        # 3 s look-ahead: from each candidate's 1.2 s end, is there any way on for LONG_T more seconds?
        end_h = np.arctan2(*(pos[:, -1]-pos[:, -2]).T[::-1])
        tl = np.arange(1, 25)*(LONG_T/24)      # ~30 px steps: a body cannot slip between samples
        rays = pos[:, -1][:, None, None, :]+(tl[None, None, :, None]*cruise_sp(sc)*PX_PER_SP)*np.stack(
            (np.cos(end_h[:, None]+LONG_FAN[None]), np.sin(end_h[:, None]+LONG_FAN[None])), -1)[:, :, None, :]
        rg = field_gap(far_field, rays.reshape(-1, 2)).reshape(rays.shape[:3])-ro
        w = s['wall']
        rg = np.minimum(rg, w[2]-np.hypot(rays[..., 0]-w[0], rays[..., 1]-w[1])-ro)
        onward = rg.min(2).max(1)                 # best fan ray's worst gap: > 0 means a way on exists

        # 2.d: bodies all around? Widest opening over 24 bearings within 1000 px.
        occ = np.full(24, 1000.)
        if len(segs):
            mid = (segs[:, :2]+segs[:, 2:4])/2-p
            b = ((np.arctan2(mid[:, 1], mid[:, 0])+np.pi)/(2*np.pi)*24).astype(int) % 24
            np.minimum.at(occ, b, np.minimum(near_all, 1000.))
        enclosed = float((occ < 400).mean())
        wide = np.minimum(np.minimum(occ, np.roll(occ, 1)), np.roll(occ, -1))
        esc = (np.argmax(wide)+.5)/24*2*np.pi-np.pi
        # 2.d/3.b: one snake's body covering >= half of the bearings around us (within 500 px) is wrapping us:
        # leave through the middle of the widest bearing run it does not cover, boost allowed, before it closes.
        # Early: >= 0.4 and up by 0.15 within the last second (P6: first flagged at 0.67-0.75, closed 1-6 s later;
        # a straight long body beside us covers ~0.43, so the level alone cannot go lower).
        wrap_cov, wrap_esc, wrap_sid = 0., None, None
        covs = {}
        if len(segs):
            close = near_all < 500
            past = next((c for t0, c in self.cov_hist if s['t']-t0 <= 1.), {})
            for i in np.unique(sid[close]):
                cov = np.zeros(24, bool); cov[b[close & (sid == i)]] = True
                covs[int(i)] = cov.mean()
                rising = int(i) in past and cov.mean() >= .4 and cov.mean()-past[int(i)] >= .15
                if cov.mean() > wrap_cov and (cov.mean() >= .5 or rising):
                    wrap_cov, wrap_sid = float(cov.mean()), int(i)
                    free = np.flatnonzero(~np.roll(cov, -int(np.argmax(cov))))      # rotate so the run does not wrap
                    if not len(free):          # closed all round: the widest opening among all bodies
                        wrap_esc = esc; continue
                    run = max(np.split(free, np.flatnonzero(np.diff(free) != 1)+1), key=len)
                    bins = (run+int(np.argmax(cov))) % 24
                    ang_of = (bins+.5)/24*2*np.pi-np.pi
                    hb = [np.arctan2(*(h[:2]-p)[::-1]) for h, j in zip(s['heads'], s['hid']) if j == i]
                    if hb and len(bins) >= 3:     # its head is closing the gap: go for the end of the gap away from it
                        inner = ang_of[1:-1]
                        wrap_esc = float(inner[np.argmax(abs(wrap(inner-hb[0])))])
                    else:
                        wrap_esc = float(ang_of[len(ang_of)//2])

        self.cov_hist = [(t0, c) for t0, c in self.cov_hist if s['t']-t0 <= 1.2]+[(s['t'], covs)]
        # The escape bearing is held 1.5 s: recomputed every tick it swung with the wrapper and we swung with it.
        if wrap_esc is None:
            self.esc_lock = None
        elif self.esc_lock is not None and s['t'] < self.esc_lock[1]:
            wrap_esc = self.esc_lock[0]
        else:
            self.esc_lock = (wrap_esc, s['t']+1.5)
        # Coil on our own circle (user): wrapped -> full-rate turn, one direction chosen once (the side with more room).
        k90 = int(np.argmin(abs(ANGLES-np.pi/2))); km90 = int(np.argmin(abs(ANGLES+np.pi/2)))
        if self.coil_dir == 0 and wrap_cov >= COIL_ON:
            # Same direction as a coil that ended < 10 s ago (never switch sides around the same ring), else the roomier side.
            if self.last_coil and s['t']-self.last_coil[1] < 10.:
                self.coil_dir = self.last_coil[0]
            else:
                self.coil_dir = 1. if clear[k90] >= clear[km90] else -1.
            self.coil_low_since = None
        elif self.coil_dir != 0:
            if wrap_cov < COIL_OFF:
                self.coil_low_since = s['t'] if self.coil_low_since is None else self.coil_low_since
                if s['t']-self.coil_low_since >= 1.:
                    self.last_coil, self.coil_dir = (self.coil_dir, s['t']), 0.
            else:
                self.coil_low_since = None
        ring = self.coil_dir != 0

        # User b: snakes clearly thicker than us within 600 px; risk grows when their body already curls round us.
        big_risk, big_terms = 0., []
        if len(segs):
            for i in np.unique(sid[near_all < 600]):
                g = segs[sid == i]
                ratio = g[0, 4]/ro
                if ratio < BIG_RATIO: continue
                risk = min(1., .3+(ratio-BIG_RATIO)/1.+(.3 if covs.get(int(i), 0.) >= .3 else 0.))
                big_terms.append((risk, g, float(near_all[sid == i].min())))
                big_risk = max(big_risk, risk)

        # User c/d: circling in place over the last 5 s -> drop food for 3 s and head for open space for 2 s.
        self.hist = [(t0, q) for t0, q in self.hist if s['t']-t0 <= 5.]+[(s['t'], p.copy())]
        if len(self.hist) > 60 and s['t']-self.hist[0][0] > 4.5:
            xy = np.array([q for _, q in self.hist])
            path_len = np.hypot(*np.diff(xy, axis=0).T).sum()
            if (path_len > 200 and np.hypot(*(xy[-1]-xy[0]))/path_len < LOOP_STRAIGHT and s['t'] > self.wp_until
                    and not ring and wrap_esc is None):       # circling on purpose inside a ring / while unwrapping
                self.wp_until = s['t']+2.                  # food stays on (user: food pull as before)
                self.wp = p+600*np.array([np.cos(esc), np.sin(esc)])

        # 4: food on the path (sucked in within ro+EAT) and the richest cluster ahead.
        food = s['food']
        eat = np.zeros(2*C); goal, goal_val = None, 0.
        if len(food):
            fd = np.hypot(food[:, 0]-p[0], food[:, 1]-p[1])
            food, fd = food[fd < FOOD_R], fd[fd < FOOD_R]
        if len(food):
            val = np.where(food[:, 2] >= REMAINS, 4*food[:, 2], food[:, 2])
            reach = fd < BOOST_SP*PX_PER_SP*DT*N+ro+EAT        # only food a 1.2 s path can touch
            if reach.any():
                # Earliest time each candidate path eats each grain. Only (path point, grain) pairs within the suck
                # radius matter: a KD-tree finds them (the dense (2C,N,F) distance array took 5-10 ms a tick).
                fr = food[reach]
                pairs = cKDTree(pos.reshape(-1, 2)).sparse_distance_matrix(
                    cKDTree(fr[:, :2]), ro+EAT, output_type='ndarray')
                first = np.full((2*C, len(fr)), np.inf)
                np.minimum.at(first, (pairs['i']//N, pairs['j']), t[pairs['i'] % N])
                eat = (val[reach][None]*np.exp(-first)).sum(1)
            cell = np.floor(food[:, :2]/250).astype(int)      # remains lie along a whole body: coarse cells
            keys, inv = np.unique(cell, axis=0, return_inverse=True)
            mass = np.bincount(inv.ravel(), val)
            centre = (keys+.5)*250
            gd = np.hypot(*(centre-p).T)
            k = int(np.argmax(mass/(gd+400)))                 # far heaps count (user)
            goal, goal_val = centre[k], float(mass[k])

        # Choose.
        near_head = any(np.hypot(*(h[:2]-p)) < 400 for h in heads)
        safe_now = SAFE_HEADS if any(np.hypot(*(h[:2]-p)) < 300 for h in heads) else SAFE
        thr = np.where((eat > 20) & (not near_head) & (threat == 0), TIGHT, safe_now)
        # Threading a narrow gap: judge the pass by the gap itself - both sides equal on the centre line - instead of
        # the open-field margin, which no narrow gap can meet. Off-centre costs score; the margin asked for is the
        # centre-line clearance minus THREAD_TOL (never below the contact line).
        thread_i, thread_w, thread_bonus = np.zeros(2*C, bool), None, np.zeros(2*C)
        for g in gaps:
            dm = np.hypot(*(pos-g['m']).transpose(2, 0, 1)).min(1)          # closest approach to the gap centre
            through = dm < g['w']/2                                          # the path goes through the gap
            if not through.any(): continue
            half = g['w']/2-ro                                               # drawn clearance on the centre line
            thr = np.where(through, np.minimum(thr, max(HARD+1., half-THREAD_TOL)), thr)
            thread_bonus += np.where(through, W_THREAD-W_CENTRE*np.minimum(1., dm/max(g['w']/2, 1.)), 0.)
            thread_i |= through
            thread_w = g if thread_w is None or g['w'] < thread_w['w'] else thread_w
        safe = (clear >= thr) & (hard >= np.minimum(thr, HARD_PHYS))
        if (safe & (onward >= LONG_SAFE)).any():      # dead ends (no way on within 3 s) are not safe while others exist
            safe &= onward >= LONG_SAFE
        end = pos[:, -1]
        room = np.minimum(300., field_gap(field, end)-ro)
        # Survival first (P2-P4: 6 of 9 deaths came chasing remains while heads converged on them).
        # Food pull as in P8 (user 2026-09-25: the P9 cuts made it far too weak); off only while being wrapped.
        w_food = 0. if wrap_esc is not None else W_FOOD*(.5 if threat > 0 else 1.)
        score = w_food*eat+W_OPEN*room-W_TURN*np.degrees(abs(wrap(hd-prev)))+thread_bonus
        # Per unit of the candidate's own path length, so neither term pays for boosting.
        plen = np.hypot(*np.diff(np.concatenate((np.broadcast_to(p, (2*C, 1, 2)), pos), 1), axis=1).T).sum(0)
        score += W_PROG*np.hypot(*(end-p).T)/np.maximum(plen, 1.)            # large arcs over tight loops
        for risk, g, now in big_terms:                                       # move away from thicker snakes
            later = (seg_dist(end, g)-g[:, 4][None]).min(1)
            score += W_BIG*risk*np.clip((later-now)/np.maximum(plen, 1.), -1., 1.)
        # 2.a Coiled up (own body all round our head): straighten out away from where our body is.
        own = s['own']; curl = 0.
        if len(own) > 20 and not ring:
            rel_o = own[:-10]-p                                   # skip the neck
            near_o = rel_o[np.hypot(*rel_o.T) < 300]
            if len(near_o):
                cov_o = np.zeros(24, bool)
                cov_o[((np.arctan2(near_o[:, 1], near_o[:, 0])+np.pi)/(2*np.pi)*24).astype(int) % 24] = True
                curl = float(cov_o.mean())
                if curl > CURL_ON:
                    away_o = np.arctan2(*(-near_o.mean(0))[::-1])
                    score += W_CURL*min(1., (curl-CURL_ON)/.35)*np.cos(wrap(hd-away_o))
        # 2.b Never ride alongside a longer (or clearly thicker) snake in its own direction: it can turn in and wrap us.
        if len(segs):
            own_len = np.hypot(*np.diff(own, axis=0).T).sum() if len(own) > 1 else 0.
            for i in np.unique(sid[near_all < 400]):
                m = sid == i
                g = segs[m]
                longer = np.hypot(*(g[:, 2:4]-g[:, :2]).T).sum() >= LONG_RATIO*max(own_len, 1.)
                if not (longer or g[0, 4] >= 1.3*ro): continue
                k = int(np.argmin(near_all[m]))
                tang = np.arctan2(*(g[k, 2:4]-g[k, :2])[::-1])     # its direction of travel (pieces run tail -> head)
                score -= W_PAR*(1-near_all[m][k]/400)*np.maximum(0., np.cos(wrap(hd-tang)))
        # 4. No riding the rim: beyond RIM of the map radius, pull back toward the middle.
        w = s['wall']; d_c = np.hypot(p[0]-w[0], p[1]-w[1])
        if d_c > RIM*w[2]:
            score += W_CENTER*min(1., (d_c/w[2]-RIM)/.3)*np.cos(wrap(hd-np.arctan2(w[1]-p[1], w[0]-p[0])))
        # Aggressive: close in on the nearest head, aiming where it will be in 0.5 s (to cut across it).
        if W_HUNT and heads and attacker is None and wrap_esc is None:       # attacked: run first (user), no closing in
            hn = min(heads, key=lambda h: np.hypot(*(h[:2]-p)))
            aim = hn[:2]+.5*max(hn[3], 4.)*PX_PER_SP*np.array([np.cos(hn[2]), np.sin(hn[2])])
            score += W_HUNT*np.cos(wrap(hd-np.arctan2(*(aim-p)[::-1])))
        # 3.b Aggressive profile: head for the crowd (close-quarter data), still within the safety filter.
        # User 2026-09-25: go where the snakes are packed, as packed as possible - quiet ground wastes the run.
        # Target = the head with the most other heads within CROWD_R (all heads the client knows, out to ~3000 px),
        # discounted by distance; none known -> the map centre (busier than the edge).
        crowd_at = None
        if W_CROWD and wrap_esc is None:
            H = np.asarray(s['heads'], float).reshape(-1, 5)[:, :2]
            if len(H):
                cnt = (np.hypot(*(H[:, None]-H[None]).transpose(2, 0, 1)) < CROWD_R).sum(1)
                k = int(np.argmax(cnt/(np.hypot(*(H-p).T)+800.)))
                crowd_at = H[(np.hypot(*(H-H[k]).T) < CROWD_R)].mean(0)
                pull = min(1., cnt[k]/4)
            else:
                crowd_at, pull = np.array(w[:2], float), 1.
            if np.hypot(*(crowd_at-p)) > 250:           # in it already: let food/hunt steer
                score += W_CROWD*pull*np.cos(wrap(hd-np.arctan2(*(crowd_at-p)[::-1])))
        # User 2026-09-25: food before loop recovery - the waypoint pull only when there is nothing to eat.
        looping = s['t'] < self.wp_until and self.wp is not None and not ring and goal_val < 20 and eat.max() <= 0
        if looping:
            score += W_WP*np.cos(wrap(hd-np.arctan2(*(self.wp-p)[::-1])))
        heap_chase = False
        if goal is not None and wrap_esc is None:     # escaping a wrap: the exit, not far food (Codex run review)
            ga = np.arctan2(*(goal-p)[::-1])
            pull = min(1., goal_val/40.)            # a lone food grain barely pulls; a heap of remains does
            rivals = sum(np.hypot(*(h[:2]-goal)) < 350 for h in heads)
            pull *= .75**rivals
            score += W_GOAL*pull*np.cos(wrap(hd-ga))
            # 4.b: boosting to a heap of remains pays, when nobody else is heading for it and nothing threatens us.
            # User 2026-09-25 (aggressive, for data): no rival / attacker / +-25 deg gates; only L >= 80 stays.
            gated = PROFILE != 'aggressive' and (rivals > 0 or threat > 0)
            if goal_val >= 4*REMAINS*2 and np.hypot(*(goal-p)) > 150 and s['L'] >= 80 and not gated:
                # user: far remains too - boost there and eat them (boost pays more the bigger the heap)
                score += np.where(bst, max(BOOST_COST, 0.)+10+min(20., goal_val/100), 0.)*((1+np.cos(wrap(hd-ga)))/2 if PROFILE == "aggressive" else np.cos(wrap(hd-ga)) > .9)
                heap_chase = PROFILE == 'aggressive'
        if wrap_esc is not None:      # P5: 3 of 4 deaths inside a ring that closed while we still fed
            score += W_WRAP*wrap_cov*np.cos(wrap(hd-wrap_esc))+np.where(bst, BOOST_COST+25., 0.)*(np.cos(wrap(hd-wrap_esc)) > .8)
        else:        # continuous in `enclosed`: a step at a threshold flipped plans back and forth
            score += W_ESC*max(0., (enclosed-.3)/.7)*np.cos(wrap(hd-esc))
        if attacker is not None:
            away = np.arctan2(p[1]-attacker[1], p[0]-attacker[0])
            score += W_AWAY*threat*np.cos(wrap(hd-away))
            # User: attacked, get out fast rather than die slow - in both profiles boost away (turn rate is the same,
            # boosting only doubles the distance per second). The safety filter still decides which ways are open.
            score += W_RUN*threat*np.cos(wrap(hd-away))+np.where(bst, W_RUN*threat, 0.)*(np.cos(wrap(hd-away)) > .5)
        for h in heads:          # 3.c: our path crosses its straight path well before it gets there
            if np.hypot(*(h[:2]-p)) > 500: continue
            hp, ht = head_paths(h)
            hp, ht = hp[:N], ht[:N]
            d2 = ((pos[:, :, None, :]-hp[None, None])**2).sum(-1)
            cut = ((d2 < (ro+R*h[4]+10)**2) & (t[None, :, None]+.25 < ht[None, None, :])).any((1, 2))
            score += W_CUT*cut
        danger = attacker is not None or wrap_esc is not None or not safe.any()
        # In danger boosting is free (user): same turn rate, twice the distance - taken when its path is the safer one.
        score -= np.where(bst, min(0., BOOST_COST) if danger else BOOST_COST+(1e3 if s['L'] < 80 and attacker is None else 0.), 0.)
        w_t = turn_rate(sc)
        turn = wrap(hd-(ang+np.clip(wrap(prev-ang), -w_t*LAT, w_t*LAT)))
        flip = (np.sign(turn) == -self.turn_sign) & (abs(turn) > np.pi/2)
        score -= 50.*flip
        # P15 (3 of 3 deaths, user "rammed it at 90 deg"): commands flipped side every tick (feed vs unwrap, evade
        # re-aims), so the heading dithered around straight into a body. Mid big turn, the other side is not an
        # option at all while the committed side still has a safe way.
        # P16: the command itself flipped (U-turn target +-180 deg is ambiguous, emergency re-ranked every tick), so
        # also hold the side of the last sharp command for SIDE_HOLD s.
        kc = k90 if self.coil_dir > 0 else km90
        wrong = np.zeros(2*C, bool)
        if ring:
            # While coiling never turn the other way, not even in a fallback (user: died switching direction).
            wrong = (np.sign(turn) == -self.coil_dir) & (abs(turn) > np.radians(10))
            safe = safe & ~wrong
            score = np.where(wrong, -1e6, score)
            flip = flip | wrong
        # Side preference inside what is left (Codex review 2: applied before the coil filter it could empty safe).
        commit = self.coil_dir if ring else self.turn_sign if self.turn_sign != 0 else (self.side if s['t'] < self.side_until else 0.)
        against = (commit != 0) & (np.sign(turn) == -commit) & (abs(turn) > np.radians(30))
        if (safe & ~against).any():
            safe = safe & ~against
        if ring:        # judge the coil on the path it really drives (continuous full-rate turn), not a fixed heading
            cp, ct = coil_path(p, ang, sp, sc, prev, self.coil_dir, self.prev_boost)
            wl = s['wall']
            coil_hard = min(float((field_gap(field, cp)-ro).min()), float((wl[2]-np.hypot(*(cp-np.array(wl[:2])).T)-ro).min()))
            for hp, ht, hr in hpaths:
                d2 = ((cp[:, None, :]-hp[None])**2).sum(-1)
                d2 = np.where(ht[None] <= ct[:, None]+.15, d2, 1e8)
                coil_hard = min(coil_hard, float(np.sqrt(d2.min())-ro-hr))
        calm = (not ring and wrap_esc is None and attacker is None and big_risk < .5 and threat == 0 and not heap_chase
                and safe[int(np.argmin(abs(ANGLES)))])
        held = 2*C-1 if self.prev_boost else C-1
        hold_by = None                          # 'confirm' / 'dwell' when those rules changed the choice (trace)
        # A pending plan is only confirmed by consecutive ticks of the plain safe branch (Codex evening review #3).
        if self.pend is not None and (s['t']-self.pend[3] > PEND_GAP or not safe.any() or (ring and coil_hard > HARD)):
            self.pend = None
        if ring and coil_hard > HARD:
            # Coiling: full-rate turn every tick (no boost) -> the same circle lap after lap; leave it only if
            # that very circle is predicted to touch something.
            mode, i = 'coil', kc
        elif safe.any():
            mode = 'unwrap' if wrap_esc is not None else 'loop' if looping else 'evade' if attacker is not None else 'escape' if enclosed > .6 else 'feed' if eat.max() > 0 or goal_val > 0 else 'cruise'
            i = int(np.argmax(np.where(safe, score, -np.inf)))
            # Maneuver, not a one-tick command (P18: 891 returns to the old heading within 0.25 s, boost toggled
            # 134/min, a third of boost runs < 0.1 s - Codex run review). The held plan (the exact previous command)
            # stays while it is safe; a better plan replaces it only if it wins by SWITCH on CONFIRM ticks in a row
            # (same heading within 15 deg, same boost). An unsafe held plan is replaced at once.
            if safe[held] and not danger:           # attacked / wrapped: react at once
                if i != held and score[i] >= score[held]+SWITCH:
                    same = (self.pend is not None and abs(wrap(hd[i]-self.pend[0])) < np.radians(15)
                            and bool(bst[i]) == self.pend[1] and self.pend[4] == mode)
                    self.pend = (hd[i], bool(bst[i]), self.pend[2]+1 if same else 1, s['t'], mode)
                    if self.pend[2] < CONFIRM: i, hold_by = held, 'confirm'
                else:
                    self.pend, i = None, held
            elif not safe[held]:
                self.pend = None
            else:                                   # danger: the plain hold rule
                self.pend = None
                if score[held] >= score[i]-SWITCH: i = held
            # Boost is a speed state (0.57 s to full speed): in calm feeding, no change back within BOOST_DWELL of the
            # last change while the same heading at the current boost state is safe too. Not in danger: a new attack
            # right after a boost change must get its acceleration (Codex evening review #1: 252 of 390 dwell
            # interventions held back an attack boost) - there both speeds are compared on their own merits.
            if bool(bst[i]) != self.prev_boost and s['t']-self.boost_since < BOOST_DWELL and not danger:
                j = i-C if bst[i] else i+C
                if safe[j]: i, hold_by = j, 'dwell'
            # Calm modes turn at most CALM_RATE (large arcs, no spinning, user): toward the chosen side, through the
            # evaluated +-lim candidate with the chosen boost (Codex #1: no unchecked clamp after the choice).
            if calm and abs(crel[i % C]) > lim+1e-6:
                j = len(ANGLES)+(0 if crel[i % C] > 0 else 1)+(C if bst[i] else 0)
                if safe[j]: i = j
        else:
            # No margin anywhere: first avoid contact at all, else put it off as long as possible.
            mode = 'emergency'
            # Among the candidates that touch last, stay close to the previous command (P2 thrashed here).
            hit = np.where((gap <= HARD).any(1), (gap <= HARD).argmax(1), N)
            e = (np.minimum(clear, 50.)+.2*np.minimum(onward, 100.)-30.*flip-40.*against-.3*np.degrees(abs(wrap(hd-prev)))
                 -1e6*(ring & flip))                         # boost free in an emergency; prefer ways on beyond 1.2 s
            if attacker is not None:       # P13: 3/3 deaths cut off by a head 60-90 px away while we cruised - run fast
                e = e+W_RUN*threat*(np.cos(wrap(hd-away)) > .5)*(1.+bst)
            # Latest touch first; if all of those turn against our committed side, candidates on our side touching
            # within 3 steps (0.24 s) of it count as equal.
            # Codex #2: while coiling, only our turn direction is in the pool at all - compare touch times inside it.
            pool = ~wrong if ring else np.ones(2*C, bool)
            hmax = hit[pool].max()
            cand = pool & (hit == hmax)
            # hit == N means no touch within the horizon: never trade that for our side (Codex review 2).
            if hmax < N and not (cand & ~against).any() and (pool & (hit >= hmax-3) & ~against).any():
                cand = pool & (hit >= hmax-3) & ~against
            i = int(np.argmax(np.where(cand, e, -np.inf)))
        held_i = 2*C-1 if self.prev_boost else C-1
        if bool(bst[i]) != self.prev_boost: self.boost_since = s['t']
        cmd = float(wrap(hd[i]))                  # exactly the evaluated candidate (Codex #1)
        if abs(wrap(cmd-ang)) > np.radians(30):
            self.side, self.side_until = float(np.sign(wrap(cmd-ang))), s['t']+SIDE_HOLD
        self.prev, self.prev_boost = cmd, bool(bst[i])

        # 1.c trace: nearest two different snakes and whether they are on opposite sides of us.
        thread = None
        if len(segs):
            order = np.argsort(near_all)
            first = order[0]; other = order[sid[order] != sid[first]]
            if len(other):
                j = other[0]
                u = np.array([np.cos(ang), np.sin(ang)])
                side = lambda k: np.sign(u[0]*((segs[k, 1]+segs[k, 3])/2-p[1])-u[1]*((segs[k, 0]+segs[k, 2])/2-p[0]))
                thread = [round(float(near_all[first]-ro), 1), round(float(near_all[j]-ro), 1), bool(side(first) != side(j))]
        self.last = dict(mode=mode, trace=dict(mode=mode, boost=bool(bst[i]), cmd=round(float(np.degrees(cmd)), 1), clear=round(float(coil_hard if mode == 'coil' else clear[i]), 1),
                         hard=round(float(coil_hard if mode == 'coil' else hard[i]), 1), n_safe=int(safe.sum()), threat=round(threat, 2),
                         enclosed=round(enclosed, 2), wrap=round(wrap_cov, 2), thr=float(thr[i]), eat=round(float(eat[i]), 1), goal=round(goal_val, 1),
                         thread=thread, L=int(s['L']), sc=round(sc, 2), died_near=self.died_near, kills=self.kills,
                         big=round(big_risk, 2), curl=round(curl, 2), prof=PROFILE, onward=round(float(onward[i]), 1), nh=len(heads),
                         # min gap of the chosen and of the held (previous-command) path: bodies/wall vs head forecasts
                         why=[round(float(min(gap_static[i], 999)), 1), round(float(min(gap_heads[i], 999)), 1),
                              round(float(min(gap_static[held_i], 999)), 1), round(float(min(gap_heads[held_i], 999)), 1),
                              bool(safe[held_i])],
                         hold_by=hold_by,
                         # held path: which filters failed (clear<thr, hard<phys, dead end, other side, coil side)
                         held_fail=[bool(clear[held_i] < thr[held_i]), bool(hard[held_i] < min(thr[held_i], HARD_PHYS)),
                                    bool(onward[held_i] < LONG_SAFE), bool(against[held_i]), bool(wrong[held_i])],
                         crowd=None if crowd_at is None else round(float(np.hypot(*(crowd_at-p)))),
                         gap=None if thread_w is None else [round(thread_w['w'], 1), round(thread_w['ra'], 1), round(thread_w['rb'], 1),
                                                           round(ro, 1), bool(thread_i[i])],
                         esc=None if wrap_esc is None else round(float(np.degrees(wrap_esc)), 1)))
        return (cmd, bool(bst[i])), {}


def report(paths):
    """Per game: seconds, L max, mode shares, boost share, threads survived (1.c), last 1 s before the end."""
    import json
    for f in paths:
        r = json.loads(open(f).read())
        tr = r.get('trace', [])
        if not tr:
            print(f, r.get('status'), 'no trace'); continue
        n = len(tr)
        modes = {}
        for x in tr: modes[x['mode']] = modes.get(x['mode'], 0)+1
        # 1.c thread: two different snakes within 40 px drawn gap on opposite sides of us.
        threads, inside = 0, False
        for x in tr:
            th = x.get('thread'); now = bool(th and th[2] and th[0] < 40 and th[1] < 40)
            threads += inside and not now; inside = now          # passages completed (entered and left)
        tail = [x for x in tr if x['t'] > tr[-1]['t']-1]
        print(f"{f}  {r.get('seconds')} s  L_max {r.get('L_max')}  {r.get('reason')}  stage_ms {r.get('stage_ms')}")
        cmds = np.radians([x['cmd'] for x in tr if 'cmd' in x])
        jumps = int((abs(wrap(np.diff(cmds))) > np.pi/2).sum()) if len(cmds) > 1 else None   # >90 deg command reversals
        print('  modes', {k: round(v/n, 3) for k, v in modes.items()}, ' boost', round(sum(x['boost'] for x in tr)/n, 3),
              ' threads passed', threads, ' cmd jumps>90', jumps,
              'per min', round(jumps/max(tr[-1]['t']-tr[0]['t'], 1)*60, 1) if jumps is not None else None)
        # 2.d/3.b: wrap episodes (one snake covering >= half the bearings for >= 1 s) and how they ended.
        eps, start, last_hi = [], None, None
        for x in tr:
            if x.get('wrap', 0) >= .5:
                start = x['t'] if start is None else start; last_hi = x['t']
            elif start is not None and x['t']-last_hi > 1.:
                if last_hi-start >= 1.: eps.append('escaped')
                start = None
        if start is not None and last_hi-start >= 1.:
            eps.append(('died inside' if r.get('reason') == 'death' else 'unresolved') if tr[-1]['t']-last_hi < 1. else 'escaped')
        print('  wrap episodes', len(eps), ' escaped', eps.count('escaped'), ' died inside', eps.count('died inside'))
        mins = max(tr[-1]['t']-tr[0]['t'], 1)/60
        print('  died near us', tr[-1].get('died_near'), ' our kills', tr[-1].get('kills'),
              ' tight-eating share', round(sum(x.get('thr') == TIGHT for x in tr)/n, 3),
              ' L gain/min', round((max(x['L'] for x in tr)-tr[0]['L'])/mins))
        for x in tail[::5]:
            print('   t %.2f %-9s boost %d clear %6.1f hard %6.1f safe %2d threat %.2f encl %.2f' % (
                x['t'], x['mode'], x['boost'], x['clear'], x['hard'], x['n_safe'], x['threat'], x['enclosed']))


def _state(**kw):
    s = dict(x=0., y=0., ang=0., sp=5.8, sc=1., L=300, boost=False, t=0., segs=np.empty((0, 5)), sid=np.empty(0),
             heads=np.empty((0, 5)), hid=np.empty(0), food=np.empty((0, 3)), own=np.empty((0, 2)), wall=(0., 0., 21000.))
    s.update(kw)
    return s


def _two(c, **kw):
    """Two ticks of the same scene: a new plan replaces the held one only after CONFIRM ticks."""
    c(_state(**kw))
    return c(_state(t=kw.pop('t', 0.)+1/30, **kw))


def _line(x0, y0, x1, y1, r, n=30):
    xs, ys = np.linspace(x0, x1, n+1), np.linspace(y0, y1, n+1)
    return np.column_stack((xs[:-1], ys[:-1], xs[1:], ys[1:], np.full(n, r)))


def _drive(ctrl, s, secs, move=None):
    """Closed loop with 5 ticks (0.15 s) of command delay; returns the worst drawn gap to bodies."""
    p, ang, sp, sc = np.array([s['x'], s['y']]), s['ang'], s['sp'], s['sc']
    q, worst, dt = [(ang, False)]*5, np.inf, 1/30
    w = turn_rate(sc)
    for k in range(int(secs*30)):
        s.update(x=p[0], y=p[1], ang=ang, sp=sp, t=k*dt)
        if move: move(s, k*dt)
        cmd, _ = ctrl(s)
        q.append(cmd); a, b = q.pop(0)
        ang += np.clip(wrap(a-ang), -w*dt, w*dt)
        target = BOOST_SP if b else cruise_sp(sc)
        sp += np.clip(target-sp, -(BOOST_SP-5.8)/RAMP*dt, (BOOST_SP-5.8)/RAMP*dt)
        p = p+sp*PX_PER_SP*dt*np.array([np.cos(ang), np.sin(ang)])
        if len(s['segs']):
            worst = min(worst, (seg_dist(p[None], s['segs'])[0]-s['segs'][:, 4]).min()-R*sc)
        if len(s['food']):
            s['food'] = s['food'][np.hypot(s['food'][:, 0]-p[0], s['food'][:, 1]-p[1]) > R*sc+EAT]
    return worst, p


if __name__ == '__main__' and len(__import__('sys').argv) > 2 and __import__('sys').argv[1] == 'report':
    report(__import__('sys').argv[2:])
elif __name__ == '__main__':
    import time
    # 1. Wall of body across our way 250 px ahead: turn off without touching it.
    s = _state(segs=_line(250, -600, 250, 600, 25.), sid=np.full(30, 1.))
    worst, _ = _drive(Pilot(), s, 3)
    assert worst > 5, worst
    # 2. Corridor with a fast head closing from behind: boost straight on.
    walls = np.vstack((_line(-600, -60, 900, -60, 20.), _line(-600, 60, 900, 60, 20.)))
    s = _state(segs=walls, sid=np.r_[np.full(30, 1.), np.full(30, 2.)], heads=np.array([[-150., 0., 0., 13., 1.]]), hid=np.array([9.]))
    (a, b), _ = Pilot()(s)
    assert b and abs(a) < .3, (a, b)
    # 3. (1.c) Two snakes with an opening: pass through a gap 2*ro+40 wide, refuse one narrower than us.
    for width, ok in ((2*R+40, True), (2*R-10, False)):
        segs = np.vstack((_line(300, -900, 300, -width/2-20, 20.), _line(300, width/2+20, 300, 900, 20.)))
        s = _state(segs=segs, sid=np.r_[np.full(30, 1.), np.full(30, 2.)], food=np.array([[600., 0., 15.]]*8))
        worst, p = _drive(Pilot(), s, 3)
        assert worst > HARD, (width, worst)
        assert (p[0] > 300) == ok, (width, p)
    # 4. (2.d) Surrounded on three sides: leave through the open side.
    ring = np.vstack([_line(400*np.cos(a0), 400*np.sin(a0), 400*np.cos(a0+np.pi/4), 400*np.sin(a0+np.pi/4), 30., 6)
                      for a0 in np.arange(0, 2*np.pi-1e-6, np.pi/4) if not (np.pi*.75 <= a0 < np.pi*1.25)])
    s = _state(segs=ring, sid=np.arange(len(ring))//6*1.)
    worst, p = _drive(Pilot(), s, 4)
    assert worst > 0 and np.hypot(*p) > 450 and abs(np.arctan2(p[1], p[0])) > np.radians(125), (worst, p)   # out through the gap
    # 5. (3.a/3.b) A head aimed at us from the side, 350 px: evade away from it.
    s = _state(heads=np.array([[100., 350., -np.pi/2, 6., 1.5]]), hid=np.array([4.]))
    c = Pilot(); c(s)
    assert c.last['trace']['threat'] > 0 and c.last['mode'] == 'evade', c.last
    # 5b. Same attack, both profiles: boost away from it (user: leave fast, do not die slow).
    for prof in ('aggressive', 'safe'):
        set_profile(prof)
        c = Pilot(); (a, b), _ = c(s)
        assert b and np.cos(wrap(a+np.pi/2)) > .5, (prof, np.degrees(a), b, c.last['trace'])
    set_profile('safe')
    # 5c. Aggressive, nothing around: boost is the default (user: boost as much as possible).
    set_profile('aggressive'); c = Pilot(); c(_state()); (a, b), _ = c(_state(t=1/30)); set_profile('safe')
    assert b                        # a new plan (boost on) is taken once it stays best for CONFIRM ticks
    # 6. (4.b) Remains 500 px ahead-left, clear path: boost to them.
    heap = np.column_stack((np.full(12, 350.)+np.arange(12)*6, np.full(12, 350.), np.full(12, 15.)))
    c = Pilot(); boosts = []
    orig = c.__call__
    def spy(s):
        out = orig(s); boosts.append(out[0][1]); return out
    s = _state(food=heap.copy())
    _drive(spy, s, 1.)
    assert any(boosts) and 0 < s['ang'] < np.pi/2, (s['ang'], sum(boosts))   # calm turn toward it, then boost
    # 6b. Same heap with a rival head beside it: safe - no boost to it; aggressive - boost anyway (user 2026-09-25).
    rival = dict(food=heap, heads=np.array([[420., 450., -np.pi/2, 6., 1.5]]), hid=np.array([8.]))
    c = Pilot(); (a, b), _ = c(_state(**rival))
    assert not b, c.last
    set_profile('aggressive'); c = Pilot(); c(_state(**rival)); (a, b), _ = c(_state(t=1/30, **rival)); set_profile('safe')
    assert b, c.last
    # 6c. (user) A big heap of remains 2000 px away to the left, a few ordinary grains 200 px to the right: boost to the heap.
    heap = np.column_stack((np.full(40, -200.)+np.arange(40)*10, np.full(40, 2000.), np.full(40, 15.)))
    grains = np.array([[150., -150., 5.]]*4)
    c = Pilot(); c(_state(food=np.vstack((heap, grains)))); (a, b), _ = c(_state(t=1/30, food=np.vstack((heap, grains))))
    assert b and a > 0 and c.last["trace"]["goal"] >= 1000, (np.degrees(a), b, c.last["trace"])   # turning to it (calm rate)
    # 6d. (user) Aggressive: a pack of 5 heads 1600 px to the left, one lone head 1000 px right: turn for the pack.
    pack = np.array([[-1600.+dx, dy, 0., 6., 1.5] for dx, dy in ((0, 0), (200, 100), (-150, 200), (100, -200), (-200, -100))])
    hs = np.vstack((pack, [[1000., 0., np.pi/2, 6., 1.5]]))
    set_profile('aggressive'); c = Pilot(); c(_state(heads=hs, hid=np.arange(6.)))
    (a, b), _ = c(_state(t=1/30, heads=hs, hid=np.arange(6.))); set_profile('safe')
    assert abs(np.degrees(a)) > 2.5 and c.last['trace']['crowd'] > 1400, (np.degrees(a), c.last['trace'])   # turning (calm rate) toward x < 0
    # 6e. (P15) Mid right turn (previous command 115 deg right), remains 150 deg to the left: keep turning right.
    c = Pilot(); c.prev = -2.0
    (a, b), _ = c(_state(food=np.array([[300*np.cos(2.6), 300*np.sin(2.6), 15.]]*8)))
    assert wrap(a) <= 0, (np.degrees(a), c.last['trace'])
    # 6f. (P16) Committed left, remains straight behind: aim 150 deg left, never the ambiguous 180.
    set_profile('aggressive'); c = Pilot(); c.side, c.side_until = 1., 9.
    c(_state(food=np.array([[-400., 0., 15.]]*12))); (a, b), _ = c(_state(t=1/30, food=np.array([[-400., 0., 15.]]*12)))
    set_profile('safe')
    assert 0 < np.degrees(wrap(a)) <= 150.5, (np.degrees(a), c.last['trace'])
    # 6g. (Codex review 2) Committed left, a safe way only to the right: take it, do not trade it for a touch.
    c = Pilot(); c.side, c.side_until = 1., 9.
    c(_state(sp=9., segs=np.array([[93, -201, 189, -115, 14], [131, -18, -58, 119, 13]], float), sid=np.arange(2.)))
    assert c.last['trace']['hard'] > 0, c.last['trace']
    # 6h. (Codex review 2) Coiling left after a right command: the side preference must not empty the safe set.
    c = Pilot(); c.coil_dir, c.prev = 1., -np.pi/2
    c(_state(sp=9., segs=np.array([[154, -143, 207, -37, 27], [83, 68, -76, 76, 12]], float), sid=np.arange(2.)))
    assert c.last['trace']['n_safe'] > 0 and c.last['trace']['hard'] > 0, c.last['trace']
    # 6i. (Codex review 2) Coil speed model: decelerating from 14 during LAT - the wall case must not coil into it.
    c = Pilot(); c.coil_dir, c.prev = 1., 0.
    c(_state(sp=14., wall=(14849.242404917499, -14849.242404917497, 21054.07420073545)))
    assert c.last['mode'] != 'coil', c.last['trace']       # the true (decelerating) circle grazes the wall
    # 6j. (Codex run review) Boost is a speed state: once on, a single tick without a reason does not switch it off
    # before BOOST_DWELL; it goes off after that.
    heap_ahead = np.column_stack((np.full(12, 400.)+np.arange(12)*6, np.zeros(12), np.full(12, 15.)))
    c = Pilot()
    for k in range(4): (a, b), _ = c(_state(t=k/30, food=heap_ahead))
    assert b, c.last['trace']
    (a, b), _ = c(_state(t=4/30))
    assert b, 'boost dropped before BOOST_DWELL'
    for k in range(5, 20): (a, b), _ = c(_state(t=k/30))
    assert not b, 'boost never released'
    # 6k. (Codex run review) One tick of a different best plan does not flip the held plan; CONFIRM ticks do.
    left, right = np.array([[0., 600., 15.]]*12), np.array([[0., -600., 15.]]*12)
    set_profile('aggressive'); c = Pilot()
    for k in range(10): (a, _), _ = c(_state(t=k/30, food=left))
    assert wrap(a) > 0, np.degrees(a)
    (a, _), _ = c(_state(t=10/30, food=right))
    assert wrap(a) > 0, ('flipped on one tick', np.degrees(a))
    (a, _), _ = c(_state(t=11/30, food=right))
    set_profile('safe')
    assert wrap(a) < 0, ('did not switch after CONFIRM ticks', np.degrees(a))
    # 6l. (Codex evening review #1) Boost switched off 50 ms ago, then a head attacks from the side: the boost to get
    # away is not held back by BOOST_DWELL.
    c = Pilot(); c.prev_boost, c.boost_since = False, .95
    (a, b), _ = c(_state(t=1., heads=np.array([[100., 350., -np.pi/2, 6., 1.5]]), hid=np.array([4.])))
    assert b and c.last['trace']['threat'] > 0, c.last['trace']
    # 6m. (Codex evening review #3) A pending plan does not survive an emergency tick in between.
    set_profile('aggressive'); c = Pilot()
    for k in range(6): c(_state(t=k/30, food=left))
    c(_state(t=6/30, food=right))
    assert c.pend is not None and c.pend[2] == 1, c.pend
    box_ = np.array([[40*np.cos(a0), 40*np.sin(a0), 40*np.cos(a0+.3), 40*np.sin(a0+.3), 20.] for a0 in np.arange(0, 2*np.pi, .3)])
    c(_state(t=7/30, segs=box_, sid=np.arange(len(box_), dtype=float)+50))
    set_profile('safe')
    assert c.last['mode'] == 'emergency' and c.pend is None, (c.last['mode'], c.pend)
    # 7. (4.a) One ordinary grain 300 px ahead: no boost.
    (a, b), _ = Pilot()(_state(food=np.array([[300., 0., 5.]])))
    assert not b
    # 8. (3.a) A close head circling at 290 deg/s (measured between ticks), not aimed at us: an attack.
    c = Pilot()
    for k, a0 in enumerate((1.2, 1.2-np.radians(290)/30)):
        c(_state(t=k/30, heads=np.array([[-60., 130., a0, 14., 1.3]]), hid=np.array([5.])))
    assert c.last['trace']['threat'] > 0, c.last
    # 9. No flip-flop: remains heap behind us, a body along our left side. One committed turn, no contact.
    body = _line(-900, -45, 900, -45, 22., 60)
    heap = np.column_stack((np.full(15, -350.)+np.arange(15)*5, np.full(15, 40.), np.full(15, 15.)))
    c = Pilot(); signs = []
    s = _state(segs=body, sid=np.full(60, 1.), food=heap)
    orig = c.__call__
    def spy(s):
        out = orig(s); rel = wrap(out[0][0]-s['ang'])
        if abs(rel) > np.pi/2: signs.append(np.sign(rel))
        return out
    worst, _ = _drive(spy, s, 3)
    flips = int((np.diff(signs) != 0).sum()) if len(signs) > 1 else 0
    assert worst > HARD and flips <= 1, (worst, flips)
    # 10. (2.d/3.b) One snake wraps 3/4 around us, 300 px out, opening behind-left: unwrap through it.
    arc = np.linspace(-.25*np.pi, 1.25*np.pi, 61)
    pts = 300*np.column_stack((np.cos(arc), np.sin(arc)))
    body = np.column_stack((pts[:-1], pts[1:], np.full(60, 30.)))
    c = Pilot(); c(_state(segs=body, sid=np.full(60, 3.)))
    assert c.last['mode'] == 'unwrap', c.last
    worst, p = _drive(Pilot(), _state(segs=body, sid=np.full(60, 3.)), 3)
    assert worst > HARD and np.hypot(*p) > 330, (worst, p)        # out without touching (edge exits allowed)
    # 11. Fully closed ring of one snake: a decision (P3 game 2 crashed here) - coiling.
    ring = 300*np.column_stack((np.cos(np.linspace(0, 2*np.pi, 61)), np.sin(np.linspace(0, 2*np.pi, 61))))
    c = Pilot(); c(_state(segs=np.column_stack((ring[:-1], ring[1:], np.full(60, 30.))), sid=np.full(60, 3.)))
    assert c.last['mode'] == 'coil', c.last             # closed: coil on our own circle (user)
    # 11b. (Codex #3) Same ring, but a blob sits on the circle the coil would really drive (not on the fixed 90 deg
    # path): the coil must be refused.
    blobs = np.array([[16., 88., 18., 92., 10.], [16., -88., 18., -92., 10.]])
    c = Pilot(); c(_state(segs=np.vstack((np.column_stack((ring[:-1], ring[1:], np.full(60, 30.))), blobs)),
                         sid=np.r_[np.full(60, 3.), 7., 8.]))
    assert c.last['mode'] != 'coil', c.last
    # 12. (3.c check) A head beside our body vanishes and remains appear there: died near us, our kill.
    c = Pilot()
    c(_state(t=0., heads=np.array([[-80., 20., 0., 6., 1.]]), hid=np.array([6.]), own=np.array([[-200., 0.], [-100., 0.], [0., 0.]])))
    c(_state(t=1/30, food=np.array([[-80., 25., 15.]]*5), own=np.array([[-200., 0.], [-100., 0.], [0., 0.]])))
    assert c.died_near == 1 and c.kills == 1, (c.died_near, c.kills)
    # 13. Early wrap: one snake's cover grows 0.25 -> 0.45 within 0.5 s: unwrap before it reaches half.
    c = Pilot()
    for k, span in enumerate((.5*np.pi, .9*np.pi)):
        arc = np.linspace(0, span, 31); pts = 300*np.column_stack((np.cos(arc), np.sin(arc)))
        c(_state(t=k*.5, segs=np.column_stack((pts[:-1], pts[1:], np.full(30, 30.))), sid=np.full(30, 3.)))
    assert c.last['mode'] == 'unwrap', c.last
    # 14. Holding a plan holds the command (Codex review: the held heading used to drift with our turn).
    c = Pilot(); c.prev = np.pi/2
    s = _state(sc=2.)
    _drive(c, s, 1.5)
    assert abs(wrap(s['ang']-c.prev)) < np.radians(20), (c.prev, s['ang'])     # we drive the command we hold (calm: no 90 deg swing)
    # 15. (user b) A snake 3x our thickness runs parallel 160 px to one side with remains beside it: keep away.
    big = _line(-900, 160, 900, 160, 45., 60)
    heap = np.column_stack((np.full(12, 300.)+np.arange(12)*6, np.full(12, 90.), np.full(12, 15.)))
    s = _state(segs=big, sid=np.full(60, 2.), food=heap)
    c = Pilot(); boosts = []
    orig = c.__call__
    def spy(s):
        out = orig(s); boosts.append(out[0][1]); return out
    _drive(spy, s, 2)
    assert s['y'] < -20, (s['y'], sum(boosts))       # food boosting stays allowed (user: food pull as in P8)
    # 16. (user c/d) 5 s of circling in place -> a 2 s pull toward open space.
    c = Pilot()
    for k in range(160):
        a0 = k/30*2.5
        c(_state(t=k/30, x=60*np.cos(a0), y=60*np.sin(a0), ang=a0+np.pi/2))
    assert c.wp_until > 5 and c.last['mode'] == 'loop', (c.wp_until, c.last['mode'])
    # 16b. (user) Same circling with remains in reach: food first, no loop pull.
    c = Pilot()
    for k in range(160):
        a0 = k/30*2.5
        c(_state(t=k/30, x=60*np.cos(a0), y=60*np.sin(a0), ang=a0+np.pi/2, food=np.array([[300., 0., 15.]]*6)))
    assert c.last['mode'] != 'loop', c.last['mode']
    # 17. (user) Wrapped in a closed ring: coil on our own circle, the same circle every lap, no contact.
    ring = 320*np.column_stack((np.cos(np.linspace(0, 2*np.pi, 91)), np.sin(np.linspace(0, 2*np.pi, 91))))
    s = _state(segs=np.column_stack((ring[:-1], ring[1:], np.full(90, 30.))), sid=np.full(90, 3.))
    c = Pilot(); modes, track = [], []
    orig = c.__call__
    def spy(s):
        out = orig(s); modes.append(c.last['mode']); track.append((s['x'], s['y'])); return out
    worst, q = _drive(spy, s, 6)
    tr_ = np.array(track[-90:])                                     # last 3 s: several laps
    cen = tr_.mean(0); rad = np.hypot(*(tr_-cen).T)
    assert worst > HARD and modes[-1] == 'coil' and rad.std() < 3., (worst, set(modes), rad.std())
    # 18. (user 2.a) Coiled: our own body all round our head on the left side -> heading swings away (right).
    arc = np.linspace(.2*np.pi, 1.8*np.pi, 80)
    own = np.column_stack((120+120*np.cos(arc), 120*np.sin(arc)))[::-1]       # tail ... near our head at (0,0)
    own = np.vstack((own, [[0., 0.]]))
    c = Pilot(); (a, _), _ = _two(c, own=own, ang=np.pi/2)
    assert c.last['trace']['curl'] > CURL_ON and wrap(a-np.pi/2) > 0, (c.last['trace']['curl'], np.degrees(a))   # turning away (calm rate)
    # 19. (user 2.b) A longer snake 120 px to the side, going our way: do not keep riding parallel.
    long_ = _line(-1500, 150, 600, 150, 16., 80)                              # travels +x (tail -> head)
    c = Pilot(); (a, _), _ = _two(c, segs=long_, sid=np.full(80, 5.), own=np.column_stack((np.linspace(-300, 0, 20), np.zeros(20))))
    assert wrap(a) < 0, np.degrees(a)                  # veering off, away from the snake on the +y side
    # 20. (user 4) Near the rim, running along it: turn in toward the middle.
    c = Pilot(); (a, _), _ = _two(c, x=18000., y=0., ang=np.pi/2)
    assert wrap(a-np.pi/2) > 0, np.degrees(a)           # turning in toward the middle (calm rate)
    # 21. (user 3) Aggressive profile: thinner margins and a pull toward the heads.
    set_profile('aggressive')
    hs = np.array([[600., 400., 0., 6., 1.], [650., 450., 0., 6., 1.]])
    c = Pilot(); s = _state(heads=hs, hid=np.array([1., 2.]))
    _drive(c, s, 3)
    assert SAFE == 10. and c.last['trace']['prof'] == 'aggressive' and s['y'] > 5, (SAFE, s['y'])   # drifting toward the heads
    set_profile('safe')
    # 22. (user) Calm feeding: food straight behind -> no spinning round at full rate, command turns <= CALM_RATE.
    c = Pilot(); rels = []
    orig = c.__call__
    def spy(s):
        out = orig(s); rels.append(abs(wrap(out[0][0]-s['ang']))); return out
    _drive(spy, _state(food=np.array([[-300., 0., 5.]]*10)), 2)
    assert max(rels) <= CALM_RATE*Pilot.period+1e-6, np.degrees(max(rels))
    # 23. (user) Coiling in a closed ring with the coil circle blocked: the fallback never turns the other way.
    ring = 320*np.column_stack((np.cos(np.linspace(0, 2*np.pi, 91)), np.sin(np.linspace(0, 2*np.pi, 91))))
    segs = np.column_stack((ring[:-1], ring[1:], np.full(90, 30.)))
    c = Pilot(); c(_state(segs=segs, sid=np.full(90, 3.)))
    d0 = c.coil_dir
    blob = np.array([[0., 95.*d0, 1., 95.*d0, 25.]])                  # sits on the coil circle's far side
    for k in range(1, 6):
        (a, _), _ = c(_state(t=k/30, segs=np.vstack((segs, blob)), sid=np.r_[np.full(90, 3.), 9.]))
        assert d0 != 0 and np.sign(wrap(a)) != -d0 or abs(wrap(a)) < np.radians(10), (d0, np.degrees(a), c.last['mode'])
    # 24. (user) Aggressive: close in on the nearest head (aim ahead of it).
    set_profile('aggressive')
    s = _state(heads=np.array([[300., 400., 0., 6., 1.]]), hid=np.array([4.]))
    _drive(Pilot(), s, 2)
    assert s['y'] > 10, s['y']                           # drifted toward the head (calm turn rate)
    set_profile('safe')
    # 25. (user) Squeeze between two snakes: gap 2*ro+20 (10 px each side on the centre line, under the open-field
    # margin): go through on the centre line without touching.
    width = 2*R+20
    segs = np.vstack((_line(300, -900, 300, -width/2-22, 22.), _line(300, width/2+26, 300, 900, 26.)))
    s = _state(segs=segs, sid=np.r_[np.full(30, 1.), np.full(30, 2.)], food=np.array([[650., 0., 15.]]*8), y=40.)
    c = Pilot(); cross = []
    orig = c.__call__
    def spy(s):
        out = orig(s)
        if 280 < s['x'] < 320: cross.append(s['y'])
        return out
    worst, q = _drive(spy, s, 4)
    assert worst > HARD and q[0] > 320 and cross and max(abs(np.array(cross)-2.)) < 6., (worst, q, cross[:3])
    # 26. (user: plan 3 s ahead) A pocket open for the first ~1.2 s but closed ~2.3 s ahead: do not drive into it.
    pocket = np.vstack((_line(120, -70, 560, -70, 20., 20), _line(120, 70, 560, 70, 20., 20), _line(560, -70, 560, 70, 20., 8)))
    s = _state(segs=pocket, sid=np.r_[np.full(20, 1.), np.full(20, 2.), np.full(8, 3.)])
    c = Pilot(); inside = []
    orig = c.__call__
    def spy(s):
        out = orig(s); inside.append(120 < s['x'] < 560 and abs(s['y']) < 50); return out
    worst, q = _drive(spy, s, 4)
    assert worst > HARD and not any(inside[-30:]), (worst, q, sum(inside))
    # Timing with a crowded view.
    rng = np.random.default_rng(0)
    segs = np.vstack([_line(*rng.uniform(-900, 900, 4), 30., 40) for _ in range(50)])
    s = _state(segs=segs, sid=np.repeat(np.arange(50.), 40), heads=rng.uniform(-600, 600, (8, 5))*[1, 1, 0, 0, 0]+[0, 0, 1, 6, 2],
               hid=np.arange(8.), food=np.column_stack((rng.uniform(-800, 800, (300, 2)), np.full(300, 5.))))
    c = Pilot(); ts = []
    for k in range(30):
        t0 = time.perf_counter(); c(s); ts.append(time.perf_counter()-t0)
    print('ok pilot; crowded tick p50 %.1f ms p95 %.1f ms' % (1e3*np.median(ts), 1e3*np.percentile(ts, 95)))
