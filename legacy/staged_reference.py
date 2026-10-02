"""Independent, incremental local policy inspired by angular-gap / Circle Method bots.

Original Python implementation; no legacy Planner, shield, ActiveController or learned
policy is called. Shared brain imports are measured physics constants only.
Stages: gap -> predict -> coil. Prediction is an approximation, not a safety proof.
"""
from dataclasses import dataclass, asdict
import numpy as np
from scipy.spatial.distance import cdist
import brain as B


@dataclass(frozen=True)
class Config:
    stage: str = 'gap'
    directions: int = 48
    horizon: float = 1.6
    margin: float = 12.
    reserve: float = 65.
    coil_length: float = 1800.
    coil_radius: float = 210.


def observe(world):
    """Public observation plus own visible body; never expose enemy intentions/RNG."""
    s = world.state()
    a = world.snakes[0]
    s['own_body'] = np.asarray(a['pts'] + [[a['x'], a['y']]], float)
    return s


def obstacles(segs):
    """Cover entire body capsules by inflated samples, including endpoints."""
    if not len(segs):
        return np.empty((0, 3))
    a, b = segs[:, :2], segs[:, 2:4]
    n = np.maximum(1, np.ceil(np.linalg.norm(b-a, axis=1)/24).astype(int))
    ix = np.repeat(np.arange(len(n)), n+1)
    start = np.repeat(np.cumsum(n+1)-(n+1), n+1)
    f = (np.arange(len(ix))-start)/n[ix]
    # Half-spacing inflation conservatively encloses each intervening segment.
    return np.column_stack((a[ix]+(b-a)[ix]*f[:, None],
                            segs[ix, 4]+np.linalg.norm(b-a, axis=1)[ix]/n[ix]/2))


class StagedController:
    def __init__(self, stage='gap', config=None):
        self.config = config or Config(stage=stage)
        if self.config.stage not in ('gap', 'predict', 'coil'):
            raise ValueError('stage must be gap, predict or coil')
        self.reset()

    def reset(self):
        self.last = {}
        self.center = None
        self.orient = 1
        self.radius = 0.
        self.coil_since = 0.
        self.empty_since = None

    def __call__(self, s):
        cfg = self.config
        p = np.array([s['x'], s['y']])
        r = B.BODY_R*s['sc']
        cruise = (B.NSP1+B.NSP2*s['sc'])*B.SPF
        omega = B.TURN*B.scang(s['sc'])
        heads = s['heads']
        dt = .1
        angles = s['ang'] + np.arange(cfg.directions)*2*np.pi/cfg.directions
        boosted = np.zeros(len(angles), bool)
        if cfg.stage != 'gap' and s['L'] > 40:
            angles = np.tile(angles, 2)
            boosted = np.repeat([False, True], cfg.directions)
        count = len(angles)
        xy = np.tile(p, (count, 1))
        direction = np.full(count, s['ang'])
        target, boost = s.get('tgt', s['ang']), s.get('boost', False)
        path, times, speeds = [], [], []
        elapsed = 0.
        # Exact queued commands before a new action can take effect.
        for command in s.get('pending', []):
            if command is not None:
                target, boost = command
            direction += np.clip(B.wrap(target-direction), -omega/30, omega/30)
            speed = B.NSP3*B.SPF if boost and s['L'] > 20 else cruise
            xy += np.column_stack((np.cos(direction), np.sin(direction)))*speed/30
            elapsed += 1/30
            path.append(xy.copy()); times.append(elapsed); speeds.append(np.full(count, speed))
        for _ in range(round(cfg.horizon/dt)):
            direction += np.clip(B.wrap(angles-direction), -omega*dt, omega*dt)
            speed = np.where(boosted, B.NSP3*B.SPF, cruise)
            xy += np.column_stack((np.cos(direction), np.sin(direction)))*speed[:, None]*dt
            elapsed += dt
            path.append(xy.copy()); times.append(elapsed); speeds.append(speed)
        path = np.stack(path, 1); times = np.array(times); speeds = np.stack(speeds, 1)
        pad = r+cfg.margin+speeds*dt/2
        circles = obstacles(s['segs'])
        if len(circles):
            keep = np.linalg.norm(circles[:, :2]-p, axis=1) < elapsed*B.NSP3*B.SPF+r+circles[:, 2]+100
            circles = circles[keep]
        if len(heads):
            circles = np.vstack((circles, np.column_stack((heads[:, :2], B.BODY_R*heads[:, 4]))))
        clear = np.full(path.shape[:2], 1000.)
        if len(circles):
            # Chunking bounds memory, while retaining every obstacle radius.
            for chunk in np.array_split(circles, max(1, len(circles)//500+1)):
                dist = cdist(path.reshape(-1, 2), chunk[:, :2])-chunk[:, 2]
                clear = np.minimum(clear, dist.min(1).reshape(clear.shape)-pad)
        wall = np.asarray(s['wall'])
        clear = np.minimum(clear, wall[2]-np.linalg.norm(path-wall[:2], axis=2)-pad)
        static = clear.copy()
        if cfg.stage != 'gap' and len(heads):
            # Predict heads AND the new body they leave behind. Current velocity
            # is observable; uncertainty grows with time. Not an enemy oracle.
            for h in heads:
                if np.linalg.norm(h[:2]-p) > elapsed*(cruise+B.NSP3*B.SPF)+250:
                    continue
                velocity = h[3]*B.SPF*np.array([np.cos(h[2]), np.sin(h[2])])
                q = h[:2] + times[:, None]*velocity
                dist = cdist(path.reshape(-1, 2), np.vstack((h[:2], q))).reshape(count, len(times), -1)
                for k, t in enumerate(times):
                    # Own sampling + enemy sampling enclose inter-tick motion.
                    d = dist[:, k, :k+2].min(1)-pad[:, k]-B.BODY_R*h[4]-np.linalg.norm(velocity)*dt/2
                    d -= min(100., 25*t*t)
                    clear[:, k] = np.minimum(clear[:, k], d)
        hit = clear < 0
        tc = np.where(hit.any(1), times[hit.argmax(1)], elapsed+dt)
        safe = ~hit.any(1)
        clearance = clear.min(1)
        # Basic angular gap: runs of available cruise headings.
        openness = safe[:cfg.directions].astype(float)
        openness = sum(np.roll(openness, k) for k in range(-2, 3))/5
        openness = np.tile(openness, count//cfg.directions)
        endpoint = path[:, -1]
        n = (np.linalg.norm(endpoint[:, None]-heads[None, :, :2], axis=2) < 1200).sum(1)
        radial = np.linalg.norm(endpoint-wall[:2], axis=1)/wall[2]
        activity = np.maximum(2-n, 0)+np.maximum(n-10, 0)*.5+20*np.maximum(radial-.78, 0)
        # If there are too few local heads, head toward the observed group.
        if len(heads) and (np.linalg.norm(heads[:, :2]-p, axis=1)<1200).sum()<2:
            activity += np.linalg.norm(endpoint-heads[:, :2].mean(0), axis=1)/1200
        food = np.zeros(count)
        if len(s['food']):
            f = s['food']
            d = cdist(endpoint, f[:, :2])
            food = (f[:, 2]/(d+70)**2).sum(1)
            food /= max(food.max(), 1e-9)
        preferred = s['ang']
        mode = 'forage'
        if cfg.stage == 'coil':
            preferred, mode = self._coil(s, circles, cruise, omega)
        heading_cost = np.abs(B.wrap(angles-preferred))
        steering = np.abs(B.wrap(angles-s['ang']))
        eligible = safe.copy()
        if safe.any():
            reserve = min(cfg.reserve, float(clearance[safe].max()))
            eligible &= clearance >= reserve
            # Cruising is preferred unless boost is required for an escape.
            if (eligible & ~boosted).any():
                eligible &= ~boosted
            best_activity = activity[eligible].min()
            eligible &= activity <= best_activity+.35
            if mode == 'coil':
                utility = -heading_cost + .08*openness
            else:
                utility = 1.8*food + .35*openness - .20*steering
            selected = int(np.argmax(np.where(eligible, utility, -np.inf)))
        else:
            # Report the emergency explicitly; no safe heading was found.
            selected = int(np.lexsort((-steering, clearance, tc))[-1])
            mode = 'escape'
        self.last = dict(stage=cfg.stage, mode=mode, safe_count=int(safe.sum()),
                         tc=float(tc[selected]), clearance=float(clearance[selected]),
                         boost=bool(boosted[selected]), food=float(food[selected]),
                         coil_center=None if self.center is None else self.center.tolist())
        return (float(B.wrap(angles[selected])), bool(boosted[selected])), dict(
            P=path, safe=safe, selected=selected, tc=tc, tr=tc,
            horizon=elapsed, status=self.last, static_clearance=static.min(1))

    def _coil(self, s, circles, speed, omega):
        """Form a bounded-curvature loop once own body can cover its perimeter.

        Circle Method inspired, independently implemented. The target radius is
        bounded by observed own-body length; no privileged enemy state is used.
        Leaving/rejoining an activity region remains an experimental extension.
        """
        p = np.array([s['x'], s['y']]); now = s.get('t', 0.)
        body = s.get('own_body', np.empty((0, 2)))
        length = np.linalg.norm(np.diff(body, axis=0), axis=1).sum()
        rad = max(self.config.coil_radius, speed/omega*1.35)
        nh = int((np.linalg.norm(s['heads'][:, :2]-p, axis=1)<1200).sum())
        if self.center is not None:
            if nh < 2:
                if self.empty_since is None: self.empty_since = now
            else:
                self.empty_since = None
            if s['L'] < self.config.coil_length*.7 or (self.empty_since is not None and now-self.empty_since>8):
                self.center = None
        if self.center is None and s['L'] >= self.config.coil_length and length>2*np.pi*rad*1.25 and nh>=2:
            normal = np.array([-np.sin(s['ang']), np.cos(s['ang'])])
            centers = p+np.array([1, -1])[:, None]*normal*rad
            theta = np.arange(32)*np.pi/16
            rings = centers[:, None]+rad*np.column_stack((np.cos(theta), np.sin(theta)))
            room = s['wall'][2]-np.linalg.norm(rings-np.asarray(s['wall'][:2]), axis=2).max(1)
            if len(circles):
                room = np.minimum(room, (cdist(rings.reshape(-1, 2), circles[:, :2])-circles[:, 2]).min(1).reshape(2, -1).min(1))
            i = int(room.argmax())
            if room[i] > B.BODY_R*s['sc']+50:
                self.center, self.orient, self.radius = centers[i], (1 if i==0 else -1), rad
                self.coil_since = now
                self.empty_since = None
        if self.center is None:
            return s['ang'], 'forage'
        radial = p-self.center
        phase = np.arctan2(radial[1], radial[0])
        # Pursuit along the circle keeps a corridor occupied by our own body.
        target = self.center+self.radius*np.array([np.cos(phase+self.orient*.55), np.sin(phase+self.orient*.55)])
        return np.arctan2(*(target-p)[::-1]), 'coil'

