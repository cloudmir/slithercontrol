from pathlib import Path
p=Path('research/v10_escape_20261001');code=(p/'before/pilot.js').read_text()
start=code.index('  v10Geometry(');end=code.index('  // Same feedback law',start);code=code[:start]+(p/'methods.js').read_text()+code[end:]
start=code.index('  v10Route(',code.index('  v10Follow('));end=code.index('  v10Root(',start);code=code[:start]+code[end:]
start=code.index('  v10Step(');end=code.index('\n  v8Values(',start);code=code[:start]+(p/'step.js').read_text()+code[end:]
code=code.replace('setParams(values, profile) { this.v10Committed = null;', 'setParams(values, profile) { this.v10RouteId = null; this.v10Committed = null;')
code=code.replace('Math.min(14,Math.max(3,(route.length||2000)', 'Math.min(45,Math.max(3,(route.length||2000)')
code=code.replace('for(let i=index;i<path.length;i++){','for(let i=index;i<(step===0?path.length:Math.min(path.length,index+25));i++){')
(p/'pilot.js').write_text(code)
