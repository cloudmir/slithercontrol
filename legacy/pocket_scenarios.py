"""Synthetic geometry stress tests, NOT a reconstruction of a live match.

Prescribed barriers model fixed, shrinking, and opening pockets; they are not
reactive opponent snakes. Agent turn/speed, command delay and body radii use the
existing simulator constants. General play is tested separately in sim_active.
"""
from collections import deque
import numpy as np
import brain as B
from geometry import segment_distance, moving_distance

KINDS=('closed','offset','ellipse','opening','shrinking','too_small','intruder','open_food','squeeze','closing')


class PocketArena:
    def __init__(self,kind='closed',seed=0):
        if kind not in KINDS: raise ValueError(kind)
        self.kind=kind; self.seed=seed; self.rng=np.random.default_rng(seed)
        self.t=0.; self.alive=True; self.cause=None; self.escaped=False
        self.L=100.; self.sc=B.sc_of_sct(B.sct_of_score(self.L)); self.angle=float(self.rng.uniform(-np.pi,np.pi))
        self.target=self.angle; self.boost=False; self.queue=deque([None,None]); self.food_eaten=0
        self.ring=250.+self.rng.uniform(-20,20); self.rotation=self.angle
        self.p=np.zeros(2) if kind!='offset' else np.array([90.,-30.])
        self.body=[self.p.copy()]; self.radius=16.
        self.squeeze_R=self.ring   # 'squeeze': an encircler tightening until it would touch our body
        self.food=np.array([[700*np.cos(self.rotation),700*np.sin(self.rotation),1000.]])
        if kind=='too_small': self.ring=65.
        if kind=='open_food': self.food=np.array([[260*np.cos(self.rotation),260*np.sin(self.rotation),50.]])
        if kind=='closing': self.radius=1.6*B.BODY_R*self.sc   # a thicker snake closing its ring

    def barriers(self,t):
        if self.kind=='open_food': return np.empty((0,5))
        n=96; theta=np.linspace(0,2*np.pi,n+1)+self.rotation
        radius=max(40.,self.ring-3.5*t) if self.kind=='shrinking' else self.squeeze_R if self.kind=='squeeze' else self.ring
        p=radius*np.column_stack((np.cos(theta),np.sin(theta)))
        if self.kind=='ellipse': p[:,0]*=1.4; p[:,1]*=.65
        seg=np.column_stack((p[:-1],p[1:],np.full(n,self.radius)))
        if self.kind=='opening' and t>=8:
            midpoint=theta[:-1]+np.pi/n-self.rotation
            seg=seg[np.abs(B.wrap(midpoint))>.55]
        if self.kind=='closing':
            # The gap sits behind us and closes over 6 s (half-width 1.2 rad -> 0).
            midpoint=theta[:-1]+np.pi/n-self.rotation-np.pi
            seg=seg[np.abs(B.wrap(midpoint))>max(0.,1.2-.2*t)]
        return seg

    def heads(self,t):
        if self.kind!='intruder': return np.empty((0,5))
        # An independent intruder sweeps across the pocket at modest speed.
        return np.array([[170*np.sin(t*.45),70.,0. if np.cos(t*.45)>=0 else np.pi,
                          abs(170*.45*np.cos(t*.45))/B.SPF,1.]])

    def state(self):
        return dict(x=float(self.p[0]),y=float(self.p[1]),ang=self.angle,tgt=self.target,
                    sp=B.NSP3 if self.boost else B.NSP1+B.NSP2*self.sc,sc=self.sc,L=self.L,
                    boost=self.boost,pending=list(self.queue),delay=2/30,t=self.t,
                    heads=self.heads(self.t),segs=self.barriers(self.t),food=self.food.copy(),
                    own_body=np.array(self.body),wall=(0.,0.,4500.))

    def step(self,command):
        if not self.alive: return
        dt=1/30; old=self.p.copy(); self.queue.append(command); applied=self.queue.popleft()
        if self.kind=='squeeze':
            # A real encircler cannot pass through our body (its head would die), so
            # the ring shrinks 7 px/s only while it stays clear of every body point
            # we have laid; it never widens again, so drifting outward is fatal.
            reach=np.linalg.norm(np.array(self.body),axis=1).max()+B.BODY_R*self.sc+self.radius+.5
            self.squeeze_R=min(self.squeeze_R,max(self.squeeze_R-7*dt,reach))
        if applied is not None: self.target,self.boost=applied
        om=B.TURN*B.scang(self.sc)
        self.angle+=float(np.clip(B.wrap(self.target-self.angle),-om*dt,om*dt))
        v=(B.NSP3 if self.boost and self.L>20 else B.NSP1+B.NSP2*self.sc)*B.SPF
        self.p+=v*dt*np.array([np.cos(self.angle),np.sin(self.angle)])
        radius=B.BODY_R*self.sc
        for t in (self.t,self.t+dt):
            seg=self.barriers(t)
            if len(seg):
                # Include boundary movement in the continuous static capsule test.
                motion=3.5*dt if self.kind=='shrinking' else 0.
                d=segment_distance(old,self.p,seg[:,:2],seg[:,2:4])-radius-seg[:,4]-motion
                if (d<=0).any(): self.alive=False;self.cause='barrier'
        h0,h1=self.heads(self.t),self.heads(self.t+dt)
        if len(h0) and (moving_distance(old,self.p,h0[:,:2],h1[:,:2])-radius-B.BODY_R*h0[:,4]<=0).any():
            self.alive=False;self.cause='intruder'
        if len(self.food):
            eaten=np.linalg.norm(self.food[:,:2]-self.p,axis=1)<radius+25
            self.L+=float(self.food[eaten,2].sum());self.food_eaten+=int(eaten.sum());self.food=self.food[~eaten]
        if self.boost and self.L>20: self.L-=(4+self.L/150)*dt
        self.sc=B.sc_of_sct(B.sct_of_score(self.L))
        self.body.append(self.p.copy());self.body=self.body[-B.sct_of_score(self.L)*7:]
        self.t+=dt
        if self.kind in ('opening','closing') and np.linalg.norm(self.p)>self.ring+80: self.escaped=True
