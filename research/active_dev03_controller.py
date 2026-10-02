"""Local active-survival controller. Safety gates precede activity and food.

No live connector, model training, or implicit parameter loading.
"""
import numpy as np
from scipy.spatial import cKDTree
from scipy.spatial.distance import cdist
import brain as B
from activity import ActivityRules, measure
from geometry import point_segment


def reachable_tube(heads,t):
    """Enclose head paths under arbitrary bounded steering/speed changes up to t.

    Reference motion uses midpoint speed. Integrating speed error plus
    2*sin(min(omega*s,pi)/2) bounds displacement from that reference.
    A capsule along the reference line also encloses previously laid body.
    This is deliberately used only for the immediate safety window.
    """
    vmax=B.NSP3*B.SPF
    vmin=(B.NSP1+B.NSP2*heads[:,4])*B.SPF
    mid=(vmax+vmin)/2
    om=B.TURN*B.scang(heads[:,4])
    first=np.minimum(t,np.pi/om)
    angular=4/om*(1-np.cos(om*first/2))+2*np.maximum(0,t-first)
    radius=(vmax-vmin)/2*t+mid*angular
    end=heads[:,:2]+mid[:,None]*t*np.column_stack([np.cos(heads[:,2]),np.sin(heads[:,2])])
    return end,radius


class ActiveController:
    def __init__(self,rules=None,horizon=2.4,dt=.10):
        self.rules=rules or ActivityRules()
        self.horizon,self.dt=horizon,dt
        self.reset()

    def reset(self):
        self.previous=None
        self.last={}
        self.tracks={}

    def __call__(self,S):
        dt=self.dt; T=round(self.horizon/dt)
        # Stage 1 heading, then optional turn; short boost followed by cruise.
        rel=np.radians([-160,-110,-75,-50,-30,-15,0,15,30,50,75,110,160])
        first=np.repeat(rel,6)
        second=first+np.tile(np.radians([-50,0,50,-50,0,50]),len(rel))
        boost=np.tile([False]*3+[True]*3,len(rel)) & (S['L']>30)
        C=len(first)
        ang=np.full(C,S['ang']); xy=np.tile([S['x'],S['y']],(C,1)).astype(float)
        om=B.TURN*B.scang(S['sc']); cruise=(B.NSP1+B.NSP2*S['sc'])*B.SPF
        # Execute the actual pending queue in the prediction before new commands land.
        pending=S.get('pending')
        delay=float(S.get('delay',.10))
        path0=[]
        target=S.get('tgt',S['ang']); bst=bool(S.get('boost',False))
        if pending is None:
            pending=[None]*max(0,round(delay*30))
        for cmd in pending:
            if cmd is not None: target,bst=cmd
            ang+=np.clip(B.wrap(target-ang),-om/30,om/30)
            v=(B.NSP3*B.SPF if bst and S['L']>20 else cruise)
            xy+=np.column_stack([np.cos(ang),np.sin(ang)])*v/30
            path0.append(xy.copy())
        base=float(ang[0])
        P=[]; speeds=[]
        for k in range(T):
            target=base+np.where(k*dt<.8,first,second)
            ang+=np.clip(B.wrap(target-ang),-om*dt,om*dt)
            v=np.where(boost & (k*dt<.5),B.NSP3*B.SPF,cruise)
            xy=xy+np.column_stack([np.cos(ang),np.sin(ang)])*v[:,None]*dt
            P.append(xy.copy()); speeds.append(v)
        P=np.stack(P,1); speed=np.stack(speeds,1)
        r=B.BODY_R*S['sc']
        # Dense circle inflation encloses complete capsules between body samples.
        obs=B.dense(S['segs'])
        if len(obs):
            endpoints=S['segs'][:,[2,3,4]]
            obs=np.vstack([obs,endpoints]); obs[:,2]*=1.12
        tree=cKDTree(obs[:,:2]) if len(obs) else None
        def body_clear(points,pad):
            shape=points.shape[:-1]; flat=points.reshape(-1,2)
            result=np.full(len(flat),60.)
            padding=np.broadcast_to(pad,shape).reshape(-1)
            if len(obs):
                near=tree.query_ball_point(flat,r+obs[:,2].max()+padding+60)
                sizes=np.array([len(q) for q in near])
                ii=np.repeat(np.arange(len(flat)),sizes)
                if len(ii):
                    jj=np.concatenate(near).astype(int)
                    d=np.linalg.norm(flat[ii]-obs[jj,:2],axis=1)-obs[jj,2]-r-padding[ii]
                    np.minimum.at(result,ii,d)
            wall=S['wall'][2]-np.linalg.norm(flat-S['wall'][:2],axis=1)-r-padding
            return np.minimum(result,wall).reshape(shape)
        static=body_clear(P,speed*dt/2+3)
        if path0:
            pre=np.stack(path0,1)
            initial=body_clear(pre,B.NSP3*B.SPF/60+3).min(1)
            static[:,0]=np.minimum(static[:,0],initial)
        times=delay+dt*np.arange(1,T+1)
        nominal=np.full((C,T),200.); robust=nominal.copy()
        hd=S['heads']
        all_ids=np.asarray(S.get('head_ids',np.arange(len(hd))))
        now=float(S.get('t',0.))
        observed_turn=np.zeros(len(hd))
        for j,(ident,h) in enumerate(zip(all_ids,hd)):
            prev=self.tracks.get(int(ident))
            if prev is not None:
                old_t,old_h=prev; elapsed=now-old_t
                if elapsed>0 and np.linalg.norm(h[:2]-old_h[:2])<B.NSP3*B.SPF*elapsed+30:
                    observed_turn[j]=np.clip(B.wrap(h[2]-old_h[2])/elapsed,-B.TURN*B.scang(h[4]),B.TURN*B.scang(h[4]))
        self.tracks={int(ident):(now,h.copy()) for ident,h in zip(all_ids,hd)}
        if len(hd):
            # All visible heads capable of reaching any candidate, not nearest-N.
            keep=np.linalg.norm(hd[:,:2]-[S['x'],S['y']],axis=1)<(self.horizon+delay)*B.NSP3*B.SPF*2+200
            hd=hd[keep]; observed_turn=observed_turn[keep]
        if len(hd):
            modes=np.append(np.tile([-1.,0.,1.],2),0.)
            enemy_boost=np.append(np.repeat([False,True],3),False)
            v=np.where(enemy_boost[None,:],B.NSP3,hd[:,3:4])*B.SPF
            turns=B.TURN*B.scang(hd[:,4])
            omega=turns[:,None]*modes
            omega[:,-1]=observed_turn
            theta=hd[:,2,None]+np.zeros_like(v)
            q=np.broadcast_to(hd[:,None,:2],(len(hd),7,2)).copy()
            trail=[q.copy()]
            last_t=0.
            for t in times:
                delta=t-last_t
                mid=theta+omega*delta/2
                q=q+v[:,:,None]*delta*np.stack([np.cos(mid),np.sin(mid)],-1)
                theta+=omega*delta
                trail.append(q.copy()); last_t=t
            Q=np.stack(trail,2)
            for k in range(T):
                past=Q[:,:,:k+2,:]
                d=cdist(P[:,k,:],past.reshape(-1,2)).reshape(C,len(hd),7,k+2)
                # Enclose sampled enemy trail and own inter-sample movement.
                pad=r+B.BODY_R*hd[:,4,None,None]+speed[:,k,None,None,None]*dt/2
                d=d-pad-(v[:,:,None]*max(dt,delay)/2)[None,:,:,:]-3
                nominal[:,k]=d[:,:,[1,6],:].min((1,2,3))
                robust[:,k]=d.min((1,2,3))
                if times[k]<=.9:
                    ref,uncertainty=reachable_tube(hd,times[k])
                    envelope=point_segment(P[:,k,None,:],hd[None,:,:2],ref[None,:,:])
                    envelope-=uncertainty[None,:]+r+B.BODY_R*hd[None,:,4]+speed[:,k,None]*dt/2+3
                    robust[:,k]=np.minimum(robust[:,k],envelope.min(1))
        hard=np.minimum(static,nominal)
        tc=np.where((hard<0).any(1),times[(hard<0).argmax(1)],times[-1]+1)
        tr=np.where((robust<0).any(1),times[(robust<0).argmax(1)],times[-1]+1)
        # Hard gates: full nominal path and immediate enemy maneuver robustness.
        safe=(tc>times[-1]) & (tr>max(.9,delay+.6))
        # Longer maneuver safety is preferred by discrete tiers, never exchanged for food.
        if safe.any():
            tier=tr
            safe &= tier >= tier[safe].max()-1e-9
        M=measure(S,rules=self.rules)
        # Endpoint head density for navigation; exact area coverage is measured at current state.
        end=P[:,-1]
        n=(np.linalg.norm(end[:,None,:]-S['heads'][None,:,:2],axis=2)<self.rules.radius).sum(1)
        radial=np.linalg.norm(end-S['wall'][:2],axis=1)/S['wall'][2]
        activity=np.maximum(self.rules.min_heads-n,0)+np.maximum(n-self.rules.max_heads,0)*.3
        activity+=np.maximum(radial-(self.rules.wall_fraction-.05),0)*20
        qualified=safe.copy()
        if safe.any():
            best_activity=activity[safe].min()
            # Only candidates that maintain or best recover the required activity region compete for food.
            qualified &= activity <= best_activity+.05
        F=S['food']; food=np.zeros(C); attraction=np.zeros(C); goal=None
        if len(F):
            dist=cdist(P.reshape(-1,2),F[:,:2]).reshape(C,T,-1)
            near=dist < r+25
            # Account for competitors' optimistic arrival to avoid chasing already-lost piles.
            ours=np.where(near,times[None,:,None],np.inf).min(1)
            theirs=np.full(len(F),np.inf)
            if len(S['heads']):
                theirs=(cdist(S['heads'][:,:2],F[:,:2])/np.maximum(S['heads'][:,3,None]*B.SPF,1)).min(0)
            available=(ours<theirs[None,:]+.15)
            food=(near.any(1)*available*F[:,2]).sum(1)
            d0=np.linalg.norm(F[:,:2]-[S['x'],S['y']],axis=1)
            endd=cdist(end,F[:,:2])
            attraction=((d0[None,:]-endd)/(d0[None,:]+100)*F[:,2]/(1+d0[None,:]/400)).sum(1)
        cost=boost*(4+S['L']/150)*.5
        utility=food-cost+.10*attraction-.4*np.abs(first)
        # Among comparably safe alternatives, smooth small course changes.
        if self.previous is not None:
            utility-=.3*np.abs(B.wrap(base+first-self.previous))
        if qualified.any():
            a=int(np.argmax(np.where(qualified,utility,-np.inf)))
            mode='collect' if M['active'][0] else 'return'
        else:
            # No safe candidate: lexicographic survival, then contact depth; never food.
            order=np.lexsort((hard.min(1),tc,np.minimum(tr,tc)))
            a=int(order[-1]); mode='escape'
        command=(float(B.wrap(base+first[a])),bool(boost[a]))
        self.previous=command[0]
        if len(F):
            values=F[:,2]/(1+np.linalg.norm(F[:,:2]-end[a],axis=1))
            goal=F[int(np.argmax(values)),:2].tolist()
        self.last=dict(mode=mode,safe_count=int(safe.sum()),heads=int(M['heads'][0]),
                       occupied=float(M['occupied'][0]),active=bool(M['active'][0]),
                       selected=a,tc=float(tc[a]),tr=float(tr[a]),food=float(food[a]),goal=goal)
        E=dict(P=P,tc=tc,tr=tr,safe=safe,selected=a,horizon=float(times[-1]),status=self.last)
        return command,E
