"""Exercise direct-policy viewer, human handover, and respawn with saved weights."""
import argparse,json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import pygame
import play
from recovery_env import RecoveryController

def main(model):
    calls=[];resets=[];frame=[0]
    original_call=RecoveryController.__call__;original_reset=RecoveryController.reset
    def call(self,S):calls.append(frame[0]);return original_call(self,S)
    def reset(self):resets.append(frame[0]);return original_reset(self)
    def events():
        frame[0]+=1
        key={4:pygame.K_TAB,8:pygame.K_TAB,11:pygame.K_r}.get(frame[0])
        return [pygame.event.Event(pygame.KEYDOWN,key=key)] if key is not None else []
    args=SimpleNamespace(ai=True,active=False,recovery_model=model,fly=None,params=None,model=None,shield=False,
        seed=57000,bots=50,hunters=.3,delay=2,frames=16,screenshot='runs/recovery_v1/viewer.png')
    with patch.object(RecoveryController,'__call__',call),patch.object(RecoveryController,'reset',reset),patch.object(pygame.event,'get',events):
        play.main(args)
    assert calls and not any(4<=f<8 for f in calls) and any(f>=8 for f in calls)
    assert 8 in resets and 11 in resets
    result=dict(passed=True,policy_call_frames=calls,reset_frames=resets,human_handover=True,respawn=True,model=model)
    Path('runs/recovery_v1/viewer_check.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--model',required=True);main(ap.parse_args().model)
