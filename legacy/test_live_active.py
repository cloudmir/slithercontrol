"""Offline regression for the live JSON-to-controller boundary."""
import unittest
import numpy as np
from active import ActiveController
from live_active import observation


def wire(angle=0):
    return dict(x=0,y=0,ang=angle,tgt=0,sp=5.8,sc=1,L=100,
                boost=False,wall=[0,0,4500],heads=[],segs=[],food=[])


class LiveObservationTests(unittest.TestCase):
    def test_integer_zero_matches_float_angle(self):
        integer_state=observation(wire(0),0.)
        float_state=observation(wire(0.),0.)
        self.assertIs(type(integer_state['ang']),float)
        integer_cmd,_=ActiveController()(integer_state)
        float_cmd,_=ActiveController()(float_state)
        np.testing.assert_allclose(integer_cmd,float_cmd)
        self.assertTrue(np.isfinite(integer_cmd).all())

    def test_nonfinite_scalar_rejected(self):
        with self.assertRaisesRegex(ValueError,'ang'):
            observation(wire(float('nan')),0.)


if __name__=='__main__':unittest.main()
