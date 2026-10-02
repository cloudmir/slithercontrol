import unittest
import numpy as np
import brain as B
from pocket import PocketController, local_space, roll_orbits, clearance, MARGIN, STEP
from pocket_scenarios import PocketArena
from staged import obstacles, StagedController


def run(arena, controller, seconds):
    modes=[]; positions=[]; cmd=None
    for k in range(round(seconds*30)):
        if k%2==0:
            cmd,_=controller(arena.state())
            modes.append(controller.last['mode'])
        arena.step(cmd); positions.append(arena.p.copy())
        if not arena.alive: break
    return modes,np.array(positions)


class PocketTests(unittest.TestCase):
    def test_sparse_grid_matches_dense_collision_threshold(self):
        w=PocketArena('offset',71000);s=w.state();circles=obstacles(s['segs'])
        m=local_space(s,circles)
        from scipy.ndimage import label
        free=clearance(m['points'],s,circles)>MARGIN+STEP/np.sqrt(2)
        labels,_=label(free);mid=len(labels)//2;own=labels[mid,mid]
        expected=labels==own if own else np.zeros_like(free)
        np.testing.assert_array_equal(m['component'],expected)

    def test_closed_component_and_opening_route(self):
        w=PocketArena('opening',71000)
        s=w.state(); self.assertTrue(local_space(s,obstacles(s['segs']))['enclosed'])
        w.t=9; s=w.state(); m=local_space(s,obstacles(s['segs']))
        self.assertFalse(m['enclosed']); self.assertIsNotNone(m['route'])
        self.assertTrue((np.abs(np.diff(m['route'],axis=0)).sum(1)==32).all())

    def test_small_snake_completes_multiple_laps(self):
        w=PocketArena('closed',71000); c=PocketController()
        c(w.state()); center=c.center.copy()
        modes,points=run(w,c,12)
        angle=np.unwrap(np.arctan2(points[:,1]-center[1],points[:,0]-center[0]))
        self.assertTrue(w.alive); self.assertGreater(abs(angle[-1]-angle[0]),4*np.pi)
        self.assertTrue(all(m=='pocket_loop' for m in modes))
        self.assertFalse(c.loop_closed)  # not falsely called body-following
        self.assertEqual(w.L,100)

    def test_opening_exits_and_returns_to_food(self):
        # 72001 exposed a near-waypoint orbit; now a development regression case.
        for seed in (71000,72001):
            with self.subTest(seed=seed):
                w=PocketArena('opening',seed); c=PocketController()
                modes,_=run(w,c,22)
                self.assertTrue(w.alive); self.assertTrue(w.escaped)
                self.assertIn('pocket_loop',modes); self.assertIn('exit',modes)
                self.assertEqual(modes[-1],'forage'); self.assertGreater(w.food_eaten,0)

    def test_impossible_pocket_and_invalidated_orbit(self):
        w=PocketArena('closed',71000); c=PocketController();c(w.state())
        self.assertIsNotNone(c.center)
        w.ring=65.;w.t=1
        c(w.state())
        self.assertEqual(c.last['mode'],'no_loop');self.assertIsNone(c.center)
        c.reset();self.assertFalse(c.defending);self.assertIsNone(c.mapping)

    def test_pending_boost_and_turn_are_rolled_before_orbit(self):
        w=PocketArena('closed',71000);s=w.state();s['pending']=[(s['ang']+1,True)]
        _,path,_,_,_=roll_orbits(s,[(np.array([0.,60.]),60.,1)])
        angle=s['ang']+B.TURN*B.scang(s['sc'])/30
        expected=w.p+B.NSP3*B.SPF/30*np.array([np.cos(angle),np.sin(angle)])
        np.testing.assert_allclose(path[0,0],expected)

    def test_unenclosed_food_action_matches_predict_baseline(self):
        w=PocketArena('open_food',71000);s=w.state()
        c=PocketController();cmd,_=c(s);ref,_=StagedController('predict')(s)
        np.testing.assert_allclose(cmd,ref)
        self.assertEqual(c.last['mode'],'forage');self.assertIsNone(c.center)


if __name__=='__main__': unittest.main()
