"""Optional execution-time shield; recovery training stays unchanged."""
import numpy as np
import brain as B
from recovery_env import ANGLES


class ShieldedRecoveryController:
    def __init__(self, policy):
        self.policy=policy
        # Include every exact PPO heading as well as the default escape grid.
        angles=np.unique(np.r_[B.Planner().rel[:B.DEF['K']],ANGLES])
        self.pl=B.Planner(K=len(angles))
        self.pl.rel=np.tile(angles,2)
        self.pl.bst=np.repeat([0,1],len(angles))
        self.last={}

    def __call__(self,S):
        proposed,_=self.policy(S)
        best,E=self.pl.act(S)
        distance=np.abs(B.wrap(E['base']+self.pl.rel-proposed[0]))
        distance=np.where(self.pl.bst==int(proposed[1]),distance,np.inf)
        action=int(np.argmin(distance))
        if distance[action]>1e-8:raise ValueError('PPO proposal missing from shield candidates')
        chosen=self.pl.shield(E,action,best)
        cmd=proposed if chosen==action else self.pl.action_to_cmd(E,chosen)
        self.pl.prev=cmd[0]
        self.last=dict(self.policy.last,shield_interventions=int(self.pl.n_int),
                       shield_decisions=int(self.pl.n_dec),shield_replaced=chosen!=action)
        return cmd,E
