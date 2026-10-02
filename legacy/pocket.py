"""Temporary pocket defense, independent of the preserved staged coil policy.

A conservative local occupancy grid detects enclosure and routes to openings.
Kinematically rolled entry + complete orbit replaces straight-heading proposals
inside a pocket. A full orbit is checked against observed body geometry, while
moving heads are only forecast for two seconds; this is NOT a safety guarantee.
"""
from collections import deque
import numpy as np
from scipy.ndimage import label, distance_transform_edt
from scipy.spatial.distance import cdist
from scipy.spatial import cKDTree
import brain as B
from staged import StagedController, obstacles
from geometry import nearest_gap

STEP = 32.
N = 65
MARGIN = 8.


def clearance(points, s, circles):
    shape = points.shape[:-1]
    p = np.asarray(points).reshape(-1, 2)
    r = B.BODY_R*s['sc']
    w = np.asarray(s['wall'])
    d = w[2]-np.linalg.norm(p-w[:2], axis=1)-r
    if len(circles):
        d = np.minimum(d, nearest_gap(p, circles)-r)   # exact, k-d tree
    return d.reshape(shape)


def local_space(s, circles):
    origin = np.array([s['x'], s['y']])-STEP*(N//2)
    yy, xx = np.mgrid[:N, :N]
    points = origin+np.stack((xx, yy), -1)*STEP
    # Exact threshold test using nearby pairs; far circles cannot block a cell.
    flat=points.reshape(-1,2)
    padding=B.BODY_R*s['sc']+MARGIN+STEP/np.sqrt(2)
    wall=np.asarray(s['wall'])
    free=(wall[2]-np.linalg.norm(flat-wall[:2],axis=1)>padding)
    if len(circles):
        pairs=cKDTree(flat).sparse_distance_matrix(cKDTree(circles[:,:2]),
            padding+circles[:,2].max(),output_type='coo_matrix')
        blocked=pairs.data<=padding+circles[pairs.col,2]
        free[pairs.row[blocked]]=False
    free=free.reshape(N,N)
    components, _ = label(free)
    own = components[N//2, N//2]
    component = components == own if own else np.zeros_like(free)
    boundary = np.zeros_like(free)
    boundary[[0, -1], :] = True; boundary[:, [0, -1]] = True
    reachable = component & boundary
    route = None
    if reachable.any():
        # Four-neighbor BFS cannot cut a blocked cell's corner.
        start = (N//2, N//2)
        queue = deque([start]); previous = {start: None}
        goal = None
        while queue:
            cur = queue.popleft()
            if boundary[cur]: goal = cur; break
            y, x = cur
            for nxt in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if 0 <= nxt[0] < N and 0 <= nxt[1] < N and component[nxt] and nxt not in previous:
                    previous[nxt] = cur; queue.append(nxt)
        if goal is not None:
            path = []
            while goal is not None:
                path.append(points[goal]); goal = previous[goal]
            route = np.array(path[::-1])
    theta = np.arange(72)*2*np.pi/72
    p = np.array([s['x'], s['y']])
    # Only circles a 650 px ray can reach matter; farther ones never set the
    # minimum (hits are clipped at 650), so the result is unchanged.
    reach = np.linalg.norm(circles[:, :2]-p, axis=1) < 650.+B.BODY_R*s['sc']+MARGIN+circles[:, 2] if len(circles) else []
    rays = B.rays(np.tile(p, (72,1)), np.column_stack((np.cos(theta),np.sin(theta))),
                  circles[reach], B.BODY_R*s['sc']+MARGIN, 650., s['wall'])
    return dict(origin=origin, points=points, component=component, route=route,
                enclosed=bool(own and not reachable.any()), coverage=float(np.mean(rays<640)),
                valid=bool(own), room=distance_transform_edt(component)*STEP)


def orbit_heading(xy, centers, radii, signs):
    delta = xy-centers
    norm = np.maximum(np.linalg.norm(delta, axis=-1), 1.)
    radial = delta/norm[...,None]
    tangent = np.stack((-radial[...,1],radial[...,0]), -1)*np.asarray(signs)[...,None]
    vector = tangent - 2*((norm-radii)/radii)[...,None]*radial
    return np.arctan2(vector[...,1],vector[...,0])


def roll_orbits(s, candidates):
    c = np.array([x[0] for x in candidates]); r = np.array([x[1] for x in candidates])
    sign = np.array([x[2] for x in candidates])
    speed = (B.NSP1+B.NSP2*s['sc'])*B.SPF
    omega = B.TURN*B.scang(s['sc'])
    dt = 2/30
    xy = np.tile([s['x'],s['y']], (len(c),1)).astype(float)
    angle = np.full(len(c), float(s['ang']))
    elapsed = 0.; paths=[]; times=[]
    target, boost = s.get('tgt',s['ang']), s.get('boost',False)
    for command in s.get('pending',[]):
        if command is not None: target, boost = command
        angle += np.clip(B.wrap(target-angle), -omega/30, omega/30)
        v = B.NSP3*B.SPF if boost and s['L']>20 else speed
        xy += np.column_stack((np.cos(angle),np.sin(angle)))*v/30
        elapsed += 1/30; paths.append(xy.copy()); times.append(elapsed)
    first = orbit_heading(xy,c,r,sign)
    # Entry settling time plus more than a full lap, per candidate.
    duration = 2. + 1.25*2*np.pi*r/speed
    nsteps = np.ceil(duration/dt).astype(int)
    progress = np.zeros(len(c)); phase = np.arctan2(*(xy-c).T[::-1])
    for k in range(int(nsteps.max())):
        target = orbit_heading(xy,c,r,sign)
        angle += np.clip(B.wrap(target-angle), -omega*dt, omega*dt)
        xy += np.column_stack((np.cos(angle),np.sin(angle)))*speed*dt
        newphase = np.arctan2(*(xy-c).T[::-1])
        if k*dt >= 2.:
            progress += np.where(k<nsteps, B.wrap(newphase-phase)*sign, 0.)
        phase = newphase
        elapsed += dt; paths.append(xy.copy()); times.append(elapsed)
    paths = np.stack(paths,1); times=np.array(times)
    mask = times[None,:] <= duration[:,None]+len(s.get('pending',[]))/30+dt
    return first, paths, times, mask, progress


def check_orbits(s, candidates, circles):
    first, paths, times, mask, progress = roll_orbits(s,candidates)
    # A half-step inflation bounds unsampled static contact over each segment.
    queued_boost = any(cmd is not None and cmd[1] for cmd in s.get('pending', []))
    vmax = max(B.NSP3*B.SPF if s.get('boost') or queued_boost else 0.,
               (B.NSP1+B.NSP2*s['sc'])*B.SPF)
    static = clearance(paths,s,circles)-MARGIN-vmax/30
    safe = (np.where(mask,static,np.inf).min(1)>0) & (progress>=2*np.pi)
    short = times<=2.
    near = static[:,short].copy()
    for h in s['heads']:
        v = h[3]*B.SPF*np.array([np.cos(h[2]),np.sin(h[2])])
        t = times[short]
        q = h[:2]+t[:,None]*v
        uncertainty = np.minimum(80., 20*t*t)
        d = np.linalg.norm(paths[:,short]-q[None],axis=-1)-B.BODY_R*(s['sc']+h[4])-MARGIN
        d -= (vmax+np.linalg.norm(v))/30+uncertainty
        near = np.minimum(near,d)
        # Forecast the new body as a capsule from the observed head.
        from geometry import point_segment
        near = np.minimum(near, point_segment(paths[:,short],h[:2],q[None])
                          -B.BODY_R*(s['sc']+h[4])-MARGIN-vmax/30-uncertainty)
    if near.shape[1]: safe &= near.min(1)>0
    quality = np.where(mask,static,np.inf).min(1)
    return first, paths, times, safe, quality


class PocketController:
    def __init__(self):
        self.base = StagedController('predict')
        self.reset()

    def reset(self):
        self.base.reset(); self.last={}; self.center=None; self.radius=0.; self.orient=1
        self.loop_closed=False; self.defending=False; self.mapping=None; self.map_at=-1e9

    def __call__(self,s):
        circles = obstacles(s['segs'])
        p = np.array([s['x'],s['y']]); now=s.get('t',0.)
        if self.mapping is None or now-self.map_at>=.25:
            self.mapping=local_space(s,circles); self.map_at=now
        m=self.mapping
        if m['enclosed'] or m['coverage']>=.75: self.defending=True
        if not m['enclosed'] and m['coverage']<.4: self.defending=False
        if not self.defending:
            self.center=None; self.loop_closed=False
            cmd,e=self.base(s); self.last=dict(self.base.last,stage='pocket',enclosed=False)
            return cmd,e
        # Favor a route out as soon as observed geometry permits one.
        if m['route'] is not None:
            route=m['route']; j=int(np.argmin(np.linalg.norm(route-p,axis=1)))
            # A waypoint closer than one prediction horizon can reward looping
            # around it. Look beyond the horizon and rank safe forward progress.
            waypoint=route[min(j+12,len(route)-1)]
            routed=dict(s, food=np.array([[*waypoint,100.]]))
            cmd,e=self.base(routed)
            eligible=e['safe'].copy()
            n=self.base.config.directions
            if eligible[:n].any(): eligible[n:]=False
            if eligible.any():
                cost=np.linalg.norm(e['P'][:,-1]-waypoint,axis=1)
                best=int(np.argmin(np.where(eligible,cost,np.inf)))
                cmd=(float(B.wrap(s['ang']+(best%n)*2*np.pi/n)),bool(best>=n))
                e['selected']=best
                self.center=None; self.loop_closed=False
                self.last=dict(stage='pocket',mode='exit',enclosed=False,
                    safe_count=int(eligible.sum()),boost=cmd[1],tc=float(e['tc'][best]))
                e['status']=self.last
                return cmd,e
        # Preserve the previous feasible orbit before searching new centers.
        if self.center is not None:
            options=[(self.center,self.radius,self.orient)]
            first,paths,times,safe,quality=check_orbits(s,options,circles)
            if safe[0]: return self._choose(options,first,paths,times,safe,quality,0,m)
        speed=(B.NSP1+B.NSP2*s['sc'])*B.SPF
        minimum=speed/(B.TURN*B.scang(s['sc']))*1.25
        options=[]
        normal=np.array([-np.sin(s['ang']),np.cos(s['ang'])])
        for r in minimum*np.array([1.,1.4,2.,3.,4.]):
            if r>400: continue
            for sign in (-1,1): options.append((p+normal*r*sign,r,sign))
        room=m['room'].copy()
        for _ in range(4):
            index=np.unravel_index(room.argmax(),room.shape)
            available=room[index]-STEP*1.5
            if available<minimum: break
            center=m['points'][index]
            for r in np.unique([minimum,min(400.,available*.75)]):
                if r>=minimum:
                    for sign in (-1,1): options.append((center,r,sign))
            room[np.linalg.norm(m['points']-center,axis=-1)<minimum*1.5]=0
        if options:
            first,paths,times,safe,quality=check_orbits(s,options,circles)
            if safe.any():
                best=int(np.argmax(np.where(safe,quality,-np.inf)))
                return self._choose(options,first,paths,times,safe,quality,best,m)
        # No certified observed-geometry loop: do not label a desperate turn safe.
        self.center=None; self.loop_closed=False
        cmd,e=self.base(s)
        self.last=dict(self.base.last,stage='pocket',mode='no_loop',enclosed=m['enclosed'])
        return cmd,e

    def _choose(self,options,first,paths,times,safe,quality,best,m):
        self.center,self.radius,self.orient=options[best]
        # This is a predicted feasible orbit, not observed body-loop closure.
        self.loop_closed=False
        self.last=dict(stage='pocket',mode='pocket_loop',enclosed=m['enclosed'],
                       safe_count=int(safe.sum()),predicted_orbit=True,radius=float(self.radius),
                       clearance=float(quality[best]),head_prediction_s=2.)
        return (float(B.wrap(first[best])),False),dict(P=paths,safe=safe,selected=best,
            tc=np.where(safe,times[-1],0.),tr=np.where(safe,times[-1],0.),horizon=times[-1],
            status=self.last,static_clearance=quality)
