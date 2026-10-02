import unittest
import numpy as np
from staged import StagedController, Config, obstacles, contact_times, make_controller
from test_active import state


class StagedTests(unittest.TestCase):
    def test_reference_factory_uses_preserved_circle_policy(self):
        c=make_controller('circle_v0')
        self.assertEqual(type(c).__module__,'staged_reference')
        self.assertEqual(c.config.stage,'coil')
        cmd,e=c(state())
        self.assertAlmostEqual(cmd[0],0.)
        self.assertTrue(e['safe'][e['selected']])

    def test_open_space_and_food(self):
        for stage in ('gap', 'predict', 'circle', 'coil'):
            c = StagedController(stage)
            cmd, e = c(state())
            self.assertAlmostEqual(cmd[0], 0.)
            self.assertFalse(cmd[1]); self.assertTrue(e['safe'][e['selected']])
            cmd, e = c(state(food=np.array([[200.,200.,20.]])))
            self.assertGreater(cmd[0], 0.)

    def test_body_and_wall_override_arbitrarily_rich_food(self):
        for stage in ('gap', 'predict', 'circle', 'coil'):
            c = StagedController(stage)
            for s in (state(x=4300., food=np.array([[4480.,0.,1e12]])),
                      state(segs=np.array([[150.,-200.,150.,200.,20.]]),food=np.array([[240.,0.,1e12]]))):
                cmd,e = c(s)
                self.assertGreater(abs(cmd[0]), .3)
                self.assertTrue(e['safe'][e['selected']])

    def test_predict_avoids_approaching_head(self):
        s = state(heads=np.array([[500.,0.,np.pi,14.,1.]]))
        _, g = StagedController('gap')(s)
        _, p = StagedController('predict')(s)
        self.assertFalse(p['safe'][0])
        self.assertTrue(p['safe'][p['selected']])
        self.assertGreater(g['tc'][0], p['tc'][0])

    def test_cruising_enemy_can_suddenly_boost(self):
        s=state(heads=np.array([[320.,0.,np.pi,5.8,1.]]))
        cmd,e=StagedController('predict')(s)
        self.assertFalse(e['safe'][0])
        self.assertGreater(abs(cmd[0]),.3)

    def test_pending_commands_change_prediction(self):
        c = StagedController()
        _, a = c(state(pending=[(1.,False)]*3))
        _, b = c(state(pending=[(0.,False)]*3))
        self.assertGreater(a['P'][0,0,1], b['P'][0,0,1])

    def test_collision_unavoidable_is_not_labelled_safe(self):
        s = state(segs=np.array([[-5.,-50.,-5.,50.,60.]]))
        c = StagedController('predict'); cmd,e = c(s)
        self.assertFalse(e['safe'].any()); self.assertEqual(c.last['mode'], 'escape')
        self.assertTrue(np.isfinite(cmd[0]))

    def test_cover_degenerate_and_endpoints(self):
        obs = obstacles(np.array([[0.,0.,0.,0.,7.],[0.,0.,100.,0.,10.]]))
        self.assertTrue(np.isfinite(obs).all())
        self.assertTrue((obs[:,0]==100).any())

    def test_emergency_separates_buffer_breach_from_contact(self):
        # Both paths start inside a desired 65px reserve, but only one hits.
        s=state(segs=np.array([[50.,-100.,50.,100.,10.]]))
        paths=np.array([[[10.,0.],[40.,0.]], [[0.,10.],[-20.,30.]]])
        tc,depth=contact_times(s,paths,np.array([.1,.2]))
        self.assertLess(tc[0],tc[1])
        self.assertLess(depth[0],0);self.assertGreater(depth[1],0)

    def test_coil_follows_observed_body_after_closure(self):
        c=StagedController('coil');c.center=np.array([0.,0.]);c.radius=210.;c.coil_since=0.
        theta=np.linspace(0,2*np.pi,120)
        body=210*np.column_stack((np.cos(theta),np.sin(theta)))
        h=np.array([[800.,500.,0.,6.,1.],[-800.,-500.,0.,6.,1.]])
        c(state(x=210.,ang=np.pi/2,tgt=np.pi/2,L=3000.,heads=h,own_body=body,t=20.))
        self.assertTrue(c.loop_closed)

    def test_circle_keeps_geometric_route_without_body_following(self):
        c=StagedController('circle');c.center=np.array([0.,0.]);c.radius=210.;c.coil_since=0.
        theta=np.linspace(0,2*np.pi,120)
        body=210*np.column_stack((np.cos(theta),np.sin(theta)))
        h=np.array([[800.,500.,0.,6.,1.],[-800.,-500.,0.,6.,1.]])
        c(state(x=210.,ang=np.pi/2,tgt=np.pi/2,L=3000.,heads=h,own_body=body,t=20.))
        self.assertFalse(c.loop_closed)
        self.assertEqual(c.last['mode'],'coil')

    def test_coil_does_not_start_small_or_without_neighbours(self):
        c = StagedController('coil')
        c(state(L=10000., own_body=np.array([[0.,0.],[4000.,0.]])))
        self.assertIsNone(c.center)
        h = np.array([[800.,500.,0.,6.,1.],[-800.,-500.,0.,6.,1.]])
        c(state(L=100., heads=h, own_body=np.array([[0.,0.],[4000.,0.]])))
        self.assertIsNone(c.center)

    def test_coil_resets_and_rejoins_activity(self):
        c = StagedController('coil')
        h = np.array([[800.,500.,0.,6.,1.],[-800.,-500.,0.,6.,1.]])
        c(state(L=3000., heads=h, own_body=np.array([[-4000.,0.],[0.,0.]])))
        self.assertIsNotNone(c.center)
        c(state(L=3000.,t=1.)); c(state(L=3000.,t=10.))
        self.assertIsNone(c.center)
        c.reset(); self.assertEqual(c.last,{})


if __name__ == '__main__': unittest.main()
