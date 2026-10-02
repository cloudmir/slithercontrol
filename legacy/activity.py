"""Independent activity measurement shared by the evaluator and controller."""
from dataclasses import dataclass, asdict
import numpy as np
from geometry import point_segment


@dataclass(frozen=True)
class ActivityRules:
    radius: float = 1200
    min_heads: int = 2
    max_heads: int = 10
    max_occupied: float = .40
    wall_fraction: float = .85
    initial_grace_s: float = 20
    max_absence_s: float = 30
    max_absence_fraction: float = .20
    emergency_window_s: float = 8

    def to_dict(self):
        return asdict(self)


def measure(S, positions=None, rules=None):
    rules = rules or ActivityRules()
    pos = np.asarray(positions if positions is not None else [[S['x'],S['y']]],float)
    heads = S['heads']
    count = (np.linalg.norm(pos[:,None,:]-heads[None,:,:2],axis=-1)<rules.radius).sum(1)
    # Deterministic area probes: body coverage, not number of body samples.
    theta = np.arange(24)*2*np.pi/24
    offsets = np.concatenate([np.column_stack([np.cos(theta),np.sin(theta)])*rules.radius*f for f in (.25,.55,.85)])
    probes = pos[:,None,:]+offsets[None,:,:]
    segs = S['segs']
    occupied = np.zeros(len(pos))
    if len(segs):
        # Bounded memory for candidate endpoints.
        for j in range(len(pos)):
            d = point_segment(probes[j,:,None,:],segs[None,:,:2],segs[None,:,2:4])-segs[None,:,4]
            occupied[j] = (d.min(1)<0).mean()
    center = np.asarray(S['wall'][:2])
    radial = np.linalg.norm(pos-center,axis=1)/S['wall'][2]
    active = (count>=rules.min_heads)&(count<=rules.max_heads)&(occupied<=rules.max_occupied)&(radial<rules.wall_fraction)
    return dict(heads=count,occupied=occupied,radial=radial,active=active)


class ActivityMonitor:
    """Record all off-zone time, with bounded grace for externally measured danger.

    The controller's declared mode cannot excuse inactivity. Evaluation supplies
    danger independently, and an emergency never erases cumulative absence.
    """
    def __init__(self,rules=None):
        self.rules=rules or ActivityRules()
        self.off=0.; self.streak=0.; self.longest=0.; self.unexcused=0.
        self.emergency_until=-1.; self.elapsed=0.

    def update(self,t,dt,active,danger=False):
        self.elapsed=t
        if danger:
            self.emergency_until=t+self.rules.emergency_window_s
        if t<=self.rules.initial_grace_s:
            return
        if active:
            self.streak=0.
        else:
            self.off+=dt; self.streak+=dt
            self.longest=max(self.longest,self.streak)
            if t>self.emergency_until:
                self.unexcused+=dt

    def result(self):
        evaluated=max(0.,self.elapsed-self.rules.initial_grace_s)
        fraction=self.off/max(evaluated,1e-9)
        # Short reacquisition intervals allowed; long/evasive camping fails.
        valid=(evaluated>0 and fraction<=self.rules.max_absence_fraction and
               self.longest<=self.rules.max_absence_s and self.unexcused<=.05*evaluated)
        return dict(activity_ok=bool(valid),off_s=self.off,off_fraction=fraction,
                    max_off_streak_s=self.longest,unexcused_off_s=self.unexcused)
