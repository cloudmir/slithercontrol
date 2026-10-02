import unittest,json,pickle
from unittest.mock import patch
from pathlib import Path
import numpy as np
from recovery_env import RecoveryEnv,encode,command,rotate_state,N_ACTIONS,OBS_SIZE
from test_active import state

class ObservationTests(unittest.TestCase):
    def test_finite_fixed_shape(self):
        self.assertEqual(encode(state()).shape,(OBS_SIZE,))
    def test_rotation_equivariance(self):
        s=state(x=400.,y=200.,heads=np.array([[600.,300.,.4,9.,1.]]),
                segs=np.array([[500.,100.,600.,300.,15.]]),food=np.array([[450.,260.,20.]]),pending=[(.4,True)])
        np.testing.assert_allclose(encode(s),encode(rotate_state(s,1.2)),atol=2e-5)
    def test_direct_action_no_safety_filter(self):
        s=state()
        self.assertTrue(command(s,N_ACTIONS-1)[1])
        self.assertNotEqual(command(s,0),command(s,12))

class EnvironmentTests(unittest.TestCase):
    def setUp(self):
        if not Path('runs/recovery_v1/56001.case.json').exists():self.skipTest('capture not ready')
    def test_no_planner_or_shield_called_by_rl_step(self):
        e=RecoveryEnv(augment=False);obs,_=e.reset(seed=3)
        with patch('active.ActiveController.__call__',side_effect=AssertionError('planner called')),patch('brain.Planner.shield',side_effect=AssertionError('shield called')):
            obs,r,done,trunc,info=e.step(6)
        self.assertEqual(obs.shape,(2*OBS_SIZE,));self.assertEqual(info['shield_interventions'],0)
    def test_reset_does_not_mutate_saved_world(self):
        e=RecoveryEnv(augment=False);e.reset(options=dict(case=0,rotation=0));x=e.w.snakes[0]['x']
        e.step(0);e.reset(options=dict(case=0,rotation=0));self.assertEqual(e.w.snakes[0]['x'],x)
    def test_original_controller_reproduces_death(self):
        e=RecoveryEnv(augment=False);e.reset(options=dict(case=0,rotation=0));done=False
        while not done:
            cmd,_=e.original_controller(e.w.state());_,_,done,_,info=e.step_command(cmd)
        self.assertFalse(info['alive']);self.assertLess(abs(info['elapsed']-info['original_death_after']),.035)
    def test_splits_are_disjoint_original_events(self):
        p=json.loads(Path('runs/recovery_v1/plan.json').read_text())['splits']
        self.assertFalse(set(p['train'])&set(p['test']))
        self.assertFalse(set(p['validation'])&set(p['test']))
        self.assertFalse(set(p['train'])&set(p['validation']))

if __name__=='__main__':unittest.main()
