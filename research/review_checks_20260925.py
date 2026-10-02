"""Offline review probes; never opens a browser or changes production code."""
import hashlib
import json
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import pilot


def inspect(ctrl, state):
    saved = {}
    def profile(frame, event, arg):
        if event == 'return' and frame.f_code is pilot.Pilot.__call__.__code__:
            saved.update(frame.f_locals)
    sys.setprofile(profile)
    try:
        command, _ = ctrl(state)
    finally:
        sys.setprofile(None)
    return command, saved


def main():
    out = {'code_sha256': hashlib.sha256((ROOT/'pilot.py').read_bytes()).hexdigest()}
    # Search for an emitted command that differs from the evaluated safe candidate.
    pilot.set_profile('safe')
    mismatch = None
    for x in [130., 180., 230., 280., 330., 380.]:
        for y in [-220., -140., -70., 0., 70., 140., 220.]:
            seg = pilot._line(x, y-30, x, y+30, 20., 6)
            s = pilot._state(segs=seg, sid=np.ones(6), food=np.array([[x+130, y+200, 15.]]*12))
            c = pilot.Pilot()
            (a, boost), v = inspect(c, s)
            i = v['i']
            if abs(pilot.wrap(a-v['hd'][i])) < 1e-6:
                continue
            pp, _ = pilot.paths(v['p'], s['ang'], s['sp'], s['sc'], v['prev'], np.array([a]), np.array([boost]))
            gap = float((pilot.field_gap(v['field'], pp[0])-pilot.R*s['sc']).min())
            if gap < 0:
                mismatch = dict(obstacle=[x,y], mode=v['mode'], boost=boost,
                                checked_heading_deg=float(np.degrees(v['hd'][i])),
                                emitted_heading_deg=float(np.degrees(a)),
                                checked_gap=float(v['hard'][i]), emitted_gap=gap,
                                emitted_exact_segment_gap=float((pilot.seg_dist(pp[0],seg)-seg[:,4]-pilot.R).min()),
                                straight_cruise_safe=bool(v['safe'][len(pilot.ANGLES)//2]))
                break
        if mismatch:
            break
    out['post_selection_clamp'] = mismatch
    # The emergency max-hit mask is applied before the coil-direction penalty.
    pilot.set_profile('aggressive')
    rng = np.random.default_rng(20260925)
    reversal = None
    for k in range(350):
        segs = []
        for j in range(4):
            theta = rng.uniform(-np.pi, np.pi)
            centre = rng.uniform(45,150)*np.array([np.cos(theta),np.sin(theta)])
            tangent = np.array([-np.sin(theta),np.cos(theta)])*rng.uniform(30,110)
            segs.append(np.r_[centre-tangent,centre+tangent,rng.uniform(15,30)])
        s = pilot._state(segs=np.array(segs),sid=np.arange(4.), sp=9.)
        if (pilot.seg_dist(np.zeros((1,2)),s['segs'])[0]-s['segs'][:,4]-pilot.R).min() < 5:
            continue
        c = pilot.Pilot(); c.coil_dir=1.
        (a, boost), v = inspect(c,s)
        if v['mode']=='emergency' and v['wrong'][v['i']]:
            reversal = dict(iteration=k, segments=s['segs'].tolist(), command_deg=float(np.degrees(a)),
                            coil_dir=1, selected_hit=int(v['hit'][v['i']]),
                            best_allowed_hit=int(v['hit'][~v['wrong']].max()), boost=boost)
            break
    out['coil_emergency_reversal'] = reversal
    # Compare the assumed held +90 degree command with repeated +90 degree coil commands.
    pilot.set_profile('safe')
    sc=1.; speed=pilot.cruise_sp(sc); dt=1/3000; w=pilot.turn_rate(sc)
    pred,t=pilot.paths(np.zeros(2),0.,speed,sc,0.,np.array([np.pi/2]),np.array([False]))
    p=np.zeros(2); a=0.
    for k in range(round(1.2/dt)):
        if k*dt >= pilot.LAT:
            a += w*dt
        p += speed*pilot.PX_PER_SP*dt*np.array([np.cos(a),np.sin(a)])
    out['coil_rollout_mismatch'] = dict(held_command_endpoint=pred[0,-1].tolist(),
        continued_turn_endpoint=p.tolist(),endpoint_difference=float(np.linalg.norm(p-pred[0,-1])),
        note='Same speed and turn model; continuous full-rate coil after initial LAT, no disturbance.')
    # Out-of-map points are marked open by the distance-field API.
    f=pilot.body_field(np.zeros(2),np.empty((0,5)),np.empty(0),pilot.LONG_CELL,pilot.LONG_HALF)
    out['outside_field_surface_distance']=float(pilot.field_gap(f,np.array([[1400.,0.]]))[0])
    print(json.dumps(out,indent=2))


if __name__=='__main__':
    main()
