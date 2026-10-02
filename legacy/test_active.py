"""Deterministic regression checks for geometry, physics, safety and success accounting."""
import unittest
import numpy as np
import brain as B
from geometry import segment_distance, moving_distance
from sim_active import World, DT, SpawnUnavailable
from active import ActiveController
from activity import ActivityMonitor, ActivityRules, measure
from evaluate_active import summarize


def state(**kw):
    s=dict(x=0.,y=0.,ang=0.,tgt=0.,sp=5.8,sc=1.,L=100.,boost=False,
           pending=[],delay=0.,t=0.,wall=(0.,0.,4500.),heads=np.zeros((0,5)),
           segs=np.zeros((0,5)),food=np.zeros((0,3)))
    s.update(kw)
    return s


class GeometryTests(unittest.TestCase):
    def test_crossing_and_degenerate_segments(self):
        self.assertEqual(float(segment_distance(np.array([-1.,0]),np.array([1.,0]),np.array([0.,-1]),np.array([0.,1]))),0)
        self.assertEqual(float(segment_distance(np.array([0.,0]),np.array([0.,0]),np.array([3.,4]),np.array([3.,4]))),5)
        self.assertAlmostEqual(float(segment_distance(np.array([0.,0]),np.array([2.,0]),np.array([1.,1]),np.array([3.,1]))),1)

    def test_head_crossing_is_synchronized(self):
        a,b=np.array([-20.,0]),np.array([20.,0])
        self.assertEqual(float(moving_distance(a,b,-a,-b)),0.)
        # Geometric paths cross but never occupy the crossing together.
        self.assertGreater(float(moving_distance(a,b,np.array([0.,0]),np.array([0.,40]))),0)


class WorldTests(unittest.TestCase):
    def test_deferred_spawn_preserves_request_and_recovers(self):
        from unittest.mock import patch
        w=World(seed=4,n_bots=1,L0=100)
        original=w.snakes[1].copy()
        w.snakes[1]['alive']=False
        request=dict(length=321.,traits=dict(role='cutter',skill=.9,boosty=.2))
        w.pending_spawns[1]=(0.,request)
        with patch.object(w,'spawn',side_effect=SpawnUnavailable(request)):
            w._retry_spawns()
        self.assertEqual(w.pending_spawns[1][1],request)
        self.assertFalse(w.snakes[1]['alive'])
        w.t=.5;original['alive']=True
        with patch.object(w,'spawn',return_value=original) as spawn:
            w._retry_spawns()
            spawn.assert_called_once_with(True,request=request,attempts=8)
        self.assertEqual(w.pending_spawns,{})
        self.assertTrue(w.snakes[1]['alive'])

    def test_empty_world_can_rebuild_and_respawn(self):
        w=World(seed=1,n_bots=0,L0=100)
        w.snakes[0]['alive']=False
        w.rebuild()
        self.assertEqual(len(w.segs),0)
        w.respawn_agent()
        self.assertTrue(w.snakes[0]['alive'])

    def test_retry_preserves_requested_population_traits(self):
        w=World(seed=1,n_bots=0,L0=100)
        bad=w.snakes[0].copy(); calls=[]
        def candidate(bot,length=None):
            calls.append(length)
            return bad.copy()
        w._spawn_candidate=candidate
        with self.assertRaises(RuntimeError):w.spawn(True)
        self.assertIsNone(calls[0])
        self.assertTrue(all(x==100 for x in calls[1:]))

    def test_pending_command_and_respawn_queue(self):
        w=World(seed=3,n_bots=0,L0=100,delay=2)
        old=w.snakes[0]['tgt']; target=old+1
        w.step((target,False)); self.assertEqual(w.snakes[0]['tgt'],old)
        self.assertEqual(w.state()['pending'],[None,(target,False)])
        w.step((target,False)); self.assertEqual(w.snakes[0]['tgt'],old)
        w.step((target,False)); self.assertEqual(w.snakes[0]['tgt'],target)
        w.snakes[0]['alive']=False
        w.respawn_agent(); self.assertEqual(w.queue,[None,None])

    def test_spawn_never_silently_accepts_bad_candidate(self):
        w=World(seed=1,n_bots=0,L0=100)
        bad=w.snakes[0].copy()
        w._spawn_candidate=lambda bot, length=None:bad
        with self.assertRaisesRegex(RuntimeError,'safe spawn unavailable'):
            w.spawn(True)

    def test_own_body_does_not_mask_foreign_collision(self):
        w=World(seed=4,n_bots=0,L0=100)
        s=w.snakes[0]
        s.update(x=0.,y=0.,ang=0.,tgt=0.,pts=[[0.,0.]]*100)
        other=s.copy()
        other.update(x=100.,y=100.,pts=[[10.,-100.],[10.,100.]],bot=False)
        w.snakes.append(other); w.rebuild(); w.step((0.,False))
        self.assertFalse(w.snakes[0]['alive'])


class PolicyTests(unittest.TestCase):
    def test_reachable_envelope_covers_switching_maneuvers(self):
        from active import reachable_tube
        from geometry import point_segment
        rng=np.random.default_rng(10)
        n=200
        h=np.tile([0.,0.,0.,6.,1.],(n,1));p=np.zeros((n,2));angle=np.zeros(n)
        for step in range(1,91):
            angle+=rng.uniform(-B.TURN,B.TURN,n)*.01
            speed=rng.uniform((B.NSP1+B.NSP2)*B.SPF,B.NSP3*B.SPF,n)
            p+=np.column_stack([np.cos(angle),np.sin(angle)])*speed[:,None]*.01
            end,rad=reachable_tube(h,step*.01)
            # Numerical integration error gets a sub-tick travel allowance.
            self.assertTrue((point_segment(p,h[:,:2],end)<=rad+5).all())

    def test_open_space_holds_heading(self):
        cmd,E=ActiveController()(state())
        self.assertAlmostEqual(cmd[0],0.)
        self.assertFalse(cmd[1]); self.assertTrue(E['safe'][E['selected']])

    def test_wall_food_cannot_override_safety(self):
        S=state(x=4200.,food=np.array([[4470.,0.,1e8]]))
        cmd,E=ActiveController()(S)
        self.assertGreater(abs(cmd[0]),.3)
        self.assertTrue(E['safe'][E['selected']])

    def test_oncoming_boost_head_is_avoided(self):
        S=state(heads=np.array([[420.,0.,np.pi,14.,1.]]))
        cmd,E=ActiveController()(S)
        self.assertGreater(abs(cmd[0]),.3)

    def test_safe_food_side_is_selected(self):
        c=ActiveController()
        cmd,E=c(state(food=np.array([[140.,140.,50.]])))
        self.assertGreater(cmd[0],0)
        self.assertTrue(E['safe'][E['selected']])

    def test_queue_is_part_of_forecast(self):
        c=ActiveController()
        _,e0=c(state())
        _,e1=c(state(pending=[(1.,False)]*3,delay=.1))
        self.assertGreater(e1['P'][0,0,1],e0['P'][0,0,1])

    def test_reset_clears_previous_life(self):
        c=ActiveController(); c(state()); c.reset()
        self.assertIsNone(c.previous); self.assertEqual(c.last,{})


class ActivityTests(unittest.TestCase):
    def test_no_heads_and_outer_ring_are_not_active(self):
        self.assertFalse(measure(state())['active'][0])
        h=np.array([[3900.,100.,0.,6.,1.],[3900.,-100.,0.,6.,1.]])
        self.assertFalse(measure(state(x=4000.,heads=h))['active'][0])

    def test_emergency_cannot_excuse_camping(self):
        m=ActivityMonitor()
        for i in range(600):m.update(i+1,1,False,True)
        self.assertFalse(m.result()['activity_ok'])

    def test_temporary_escape_then_return(self):
        m=ActivityMonitor()
        for i in range(600):m.update(i+1,1,not(50<=i<55),i==50)
        self.assertTrue(m.result()['activity_ok'])

    def test_short_run_cannot_certify_ten_minutes(self):
        rows=[dict(controller='active',setting='normal',valid=True,success=True,alive=True,
                   seconds=30,requested_seconds=30,gain=10,off_fraction=0) for _ in range(100)]
        self.assertFalse(summarize(rows)['active/normal']['target_90_certified'])

    def test_invalid_environment_prevents_certification(self):
        rows=[dict(controller='active',setting='normal',valid=True,success=True,alive=True,
                   seconds=600,requested_seconds=600,gain=10,off_fraction=0) for _ in range(100)]
        rows.append(dict(controller='active',setting='normal',valid=False,error='spawn failure'))
        self.assertFalse(summarize(rows)['active/normal']['target_90_certified'])


class CheckpointTests(unittest.TestCase):
    def test_missing_opponents_invalidate_episode(self):
        from evaluate_chunk import Episode
        from unittest.mock import patch
        with patch('evaluate_chunk.World',lambda **kw:World(seed=5,n_bots=0,L0=100)):
            ep=Episode('active','normal',5,1.,ActivityRules())
        ep.w.target_bots=50;ep.w.min_live_bots=40;ep.w.t=10
        ep.w.spawn_wait_s=10
        self.assertFalse(ep.result()['valid'])
        ep.w.min_live_bots=50;ep.w.spawn_wait_s=0
        self.assertTrue(ep.result()['valid'])

    def test_resumed_world_and_policy_match_uninterrupted(self):
        import pickle
        from evaluate_chunk import Episode
        from unittest.mock import patch
        real_world=World
        with patch('evaluate_chunk.World',lambda **kw:real_world(seed=5,n_bots=0,L0=100,delay=2)):
            ep=Episode('active','normal',5,1.,ActivityRules())
        for _ in range(4):ep.step()
        restored=pickle.loads(pickle.dumps(ep))
        for _ in range(4):ep.step();restored.step()
        self.assertEqual(ep.cmd,restored.cmd)
        self.assertEqual(ep.w.snakes[0]['x'],restored.w.snakes[0]['x'])
        np.testing.assert_array_equal(ep.w.food,restored.w.food)
        self.assertEqual(ep.monitor.result(),restored.monitor.result())


if __name__=='__main__':unittest.main()
