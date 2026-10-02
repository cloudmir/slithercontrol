from pathlib import Path
p=Path('research/v10_maze_2h_20261001');s=Path('ext/pilot.js').read_text()
a='''    return W;
  }
  v10Threat(s,ver=0){'''
b='''    // Preserve at least a queued command plus a 90-degree turn. At high
    // appetite, farther uncertain head forecasts become closure risk rather
    // than permanent impassable walls. Observed bodies remain hard obstacles.
    const reaction=clip((V.TRACK_LAT??.17)+Math.PI/(2*this.v4Physics(s.sc).w),.6,1.2);
    W.forecastHardH=1.2-clip((V.V10_FOOD_RISK??0)/100,0,1)*(1.2-reaction);
    return W;
  }
  v10Threat(s,ver=0){'''
assert a in s;s=s.replace(a,b).replace('const near = 1.2;', 'const near = W.forecastHardH??1.2;')
s=s.replace('v10_world_ms:worldMs,', 'v10_world_ms:worldMs,v10_head_h:W.forecastHardH,')
(p/'pilot_forecast_candidate.js').write_text(s)
