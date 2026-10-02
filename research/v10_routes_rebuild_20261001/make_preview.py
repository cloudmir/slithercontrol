import json,base64
from pathlib import Path
p=Path('research/v10_routes_rebuild_20261001')
data=(p/'preview_data.json').read_text()
ref=base64.b64encode(Path('research/v10_continuation_20261001/user_yellow_routes.png').read_bytes()).decode()
html='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V10 긴 경로 탐색 초안</title><style>
*{box-sizing:border-box}body{margin:0;background:#0c111a;color:#e4edf9;font:15px system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:22px}h1{font-size:24px;margin:0 0 10px}p{line-height:1.65;color:#b9c9da}.tag{color:#ffc96e;font-size:13px}.flow{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.flow span{padding:12px;background:#1c2c3e;border:1px solid #34516a;border-radius:8px}.bar{display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:12px;background:#162130}select,button{background:#24374c;color:white;border:1px solid #54728d;border-radius:5px;padding:7px}canvas{width:100%;height:660px;display:block;background:#070c12;border:1px solid #2b3b4b}.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;margin:12px 0}.dot{display:inline-block;width:10px;height:10px;border-radius:100%;margin-right:6px}#cards{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.card{background:#172231;padding:12px;border-radius:7px;min-width:210px}details{background:#141e2b;padding:14px;border-radius:8px;margin:18px 0}summary{cursor:pointer}img{max-width:100%;margin:12px auto;display:block}small{color:#90a4b9}input{accent-color:#ffdb64}footer{font-size:12px;overflow-wrap:anywhere;color:#8095ab;margin:18px 0}@media(max-width:700px){main{padding:12px}canvas{height:500px}}</style>
<main><div class="tag">설계·계산 초안 / 게임 미적용</div><h1>긴 경로를 찾고, 비교하고, 선택하기</h1>
<p>기록된 몸통을 벽으로 재구성하고, 실제 회전 궤적을 이어 긴 후보를 탐색한 결과입니다. 색상은 식별용이며 게임 스킨과 다릅니다.</p>
<div class="flow"><span>① 몸통·두께 지도</span><span>→ ② 회전 가능한 긴 후보</span><span>→ ③ 공간·위협·먹이 비교</span><span>→ ④ 경로 선택·추종·재검사</span></div>
<div class="bar"><label>로그 시점 <select id="time"></select></label><label>확대 <input id="zoom" type="range" min="0.65" max="2.3" value="1" step="0.05"></label><label><input id="routes" type="checkbox" checked> 후보 경로</label><span id="status"></span></div>
<div class="legend"><span><i class="dot" style="background:#fff3b0"></i>내 머리·몸</span><span><i class="dot" style="background:#ffdc64"></i>1순위 후보</span><span><i class="dot" style="background:#59dcec"></i>후보 2</span><span><i class="dot" style="background:#e5a4ff"></i>후보 3</span><span>실선: 근거리 예측 검사 · 점선: 장거리 정적 몸통 검사</span></div>
<canvas id="map"></canvas><div id="cards"></div>
<p><b>표시 범위:</b> 후보 전체는 현재 몸통·회전 모델로 계산하며, 움직이는 적의 충돌 예측은 관측 후 1.2초까지 적용한 초안입니다. 점선 구간은 미래 안전 확정이 아닙니다. 1순위는 탐색 점수 순위이며 실제 제어기의 채택·추종 검증은 남아 있습니다.</p>
<details><summary>사용자가 그린 노란색 경로 참고 이미지</summary><img src="data:image/png;base64,REF"><small>요구 형태 참고. 아래 로그 시간과 스크린샷 촬영 시간의 기준은 다르므로 동일한 27초 프레임이라고 단정하지 않습니다.</small></details>
<details><summary>검토할 항목</summary><p>서로 다른 통로를 충분히 탐색하는지, 길이 좁아지기 전에 경로를 선택하는지, 선택한 곡선을 실제 조향이 따라가는지 검증해야 합니다. 현재 후보는 순항으로 계산합니다.</p></details>
<footer id="source"></footer></main><script>const DATA=DATA_JSON;
const cv=document.getElementById('map'),ctx=cv.getContext('2d'),sel=document.getElementById('time'),zoom=document.getElementById('zoom'),show=document.getElementById('routes');
DATA.samples.forEach((s,i)=>sel.add(new Option(s.t.toFixed(3)+'초',i)));sel.value=1;
const colors=['#ffdc64','#59dcec','#e5a4ff'];const enemy=id=>'hsl('+((Number(id)*137.5)%360)+' 52% 40%)';
function render(){const q=DATA.samples[+sel.value],s=q.state,r=q.result,w=cv.clientWidth,h=cv.clientHeight,dpr=window.devicePixelRatio||1;cv.width=w*dpr;cv.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const scale=Math.min(w/2200,h/1600)*Number(zoom.value);const X=x=>w/2+(x-s.x)*scale,Y=y=>h/2+(y-s.y)*scale;
ctx.strokeStyle='#182435';ctx.lineWidth=1;for(let i=-2000;i<=2000;i+=200){ctx.beginPath();ctx.moveTo(X(s.x+i),0);ctx.lineTo(X(s.x+i),h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,Y(s.y+i));ctx.lineTo(w,Y(s.y+i));ctx.stroke();}
ctx.lineCap='round';const seg=s.segs;for(let i=0;i<seg.length;i+=5){ctx.strokeStyle=enemy(s.sid[i/5]);ctx.lineWidth=2*seg[i+4]*scale;ctx.beginPath();ctx.moveTo(X(seg[i]),Y(seg[i+1]));ctx.lineTo(X(seg[i+2]),Y(seg[i+3]));ctx.stroke();}
for(let i=0;i<s.heads.length;i+=5){const x=X(s.heads[i]),y=Y(s.heads[i+1]);ctx.fillStyle='#ec887d';ctx.beginPath();ctx.arc(x,y,Math.max(2,8*scale),0,7);ctx.fill();}
ctx.strokeStyle='#fff3b0';ctx.lineWidth=29*s.sc*scale;ctx.beginPath();for(let i=0;i<s.own.length;i+=2){const x=X(s.own[i]),y=Y(s.own[i+1]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
if(show.checked)r.routes.forEach((route,j)=>{const p=route.pts;ctx.strokeStyle=colors[j%3];ctx.lineWidth=j===0?2.2:1.7;for(let i=5;i<p.length;i+=5){ctx.setLineDash(p[i]<=1.2?[]:[5,5]);ctx.beginPath();ctx.moveTo(X(p[i-4]),Y(p[i-3]));ctx.lineTo(X(p[i+1]),Y(p[i+2]));ctx.stroke();}ctx.setLineDash([]);const end=p.length-5,px=X(p[end+1]),py=Y(p[end+2]),a=p[end+3];ctx.beginPath();ctx.moveTo(px-12*Math.cos(a-.5),py-12*Math.sin(a-.5));ctx.lineTo(px,py);ctx.lineTo(px-12*Math.cos(a+.5),py-12*Math.sin(a+.5));ctx.stroke();ctx.fillStyle=colors[j%3];ctx.font='bold 14px system-ui';ctx.fillText('후보 '+(j+1),px+9,py-9);});
ctx.fillStyle='#fff3b0';ctx.beginPath();ctx.arc(w/2,h/2,5,0,7);ctx.fill();ctx.strokeStyle='#fff3b0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w/2+30*Math.cos(s.ang),h/2+30*Math.sin(s.ang));ctx.stroke();ctx.fillStyle='#fff3b0';ctx.font='13px system-ui';ctx.fillText('내 머리',w/2+14,h/2+21);
ctx.fillStyle='#9fb5c9';ctx.fillText('세계 좌표 재구성 · 격자 200 px',14,h-17);
document.getElementById('status').textContent=r.routes.length+'개 후보 · 계산 '+r.ms.toFixed(1)+' ms';document.getElementById('cards').innerHTML=r.routes.map((a,i)=>'<div class="card" style="border-top:2px solid '+colors[i%3]+'"><b>후보 '+(i+1)+(i===0?' · 탐색 1순위':'')+'</b><br>경로 길이 '+Math.round(a.length)+' px · 전개 '+a.duration.toFixed(2)+'초</div>').join('')||'<div class="card">초안이 긴 후보를 반환하지 못했습니다: '+r.reason+'</div>';
}sel.onchange=zoom.oninput=show.onchange=render;new ResizeObserver(render).observe(cv);document.getElementById('source').textContent='원본: '+DATA.source+' | 초안 SHA-256: '+DATA.candidate_sha256;render();</script></html>'''
html=html.replace('REF',ref).replace('DATA_JSON',data)
(p/'draft_preview.html').write_text(html)
print(p/'draft_preview.html')
