// VANTA pfp, drawn on canvas. c is the mark in use; a and b are the alternates.  node _studio/pfp.cjs [a|b|c]
'use strict';
const fs = require('fs'), path = require('path'), { open } = require('./cdp.cjs');
const OUT = path.join(__dirname, '..', 'brand'), SRC = path.join(__dirname, 'kit'); fs.mkdirSync(SRC, { recursive: true });
const url = (f) => 'file:///' + f.split(path.sep).join('/');
const PRE = `const c=document.getElementById('c'),x=c.getContext('2d'),S=1000,C=500,TAU=Math.PI*2;
let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
x.fillStyle='#000';x.fillRect(0,0,S,S);
const glow=(cx,cy,r0,r1,a)=>{const g=x.createRadialGradient(cx,cy,r0,cx,cy,r1);g.addColorStop(0,'rgba(255,255,255,'+a+')');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(-S,-S,3*S,3*S);};
const stars=(n)=>{for(let i=0;i<n;i++){x.fillStyle='rgba(255,255,255,'+(rnd()*.5+.08)+')';x.beginPath();x.arc(rnd()*S,rnd()*S,rnd()*1.3+.2,0,TAU);x.fill();}};`;

const ART = {
  // A: total eclipse. streaming corona, one diamond flare on the rim
  a: `stars(140);const R=236;x.globalCompositeOperation='lighter';
glow(C,C,R*.9,400,.22);
const N=(a)=>.5+.5*(Math.sin(a*3+1.3)*.5+Math.sin(a*7+4.1)*.28+Math.sin(a*13+.7)*.22);
for(let i=0;i<5200;i++){const a=rnd()*TAU,n=N(a),len=30+Math.pow(n,2.3)*250*(.35+rnd()*.9),r0=R-4+rnd()*8,bend=(rnd()-.5)*.11;
  const x0=C+Math.cos(a)*r0,y0=C+Math.sin(a)*r0,x1=C+Math.cos(a+bend)*(r0+len),y1=C+Math.sin(a+bend)*(r0+len);
  const g=x.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,'rgba(255,255,255,'+(.05+n*.2)+')');g.addColorStop(1,'rgba(255,255,255,0)');
  x.strokeStyle=g;x.lineWidth=.5+rnd()*1.5;x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();}
x.globalCompositeOperation='source-over';x.fillStyle='#000';x.beginPath();x.arc(C,C,R,0,TAU);x.fill();
x.globalCompositeOperation='lighter';x.strokeStyle='rgba(255,255,255,.95)';x.lineWidth=2.4;x.shadowColor='#fff';x.shadowBlur=20;x.beginPath();x.arc(C,C,R+1,0,TAU);x.stroke();x.shadowBlur=0;
const fa=-.86,fx=C+Math.cos(fa)*(R+2),fy=C+Math.sin(fa)*(R+2);glow(fx,fy,0,120,.7);glow(fx,fy,0,34,1);
[[1,0,330],[0,1,150],[.7,.7,70],[.7,-.7,70]].forEach(([dx,dy,l])=>{const g=x.createLinearGradient(fx-dx*l,fy-dy*l,fx+dx*l,fy+dy*l);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');x.strokeStyle=g;x.lineWidth=2.2;x.beginPath();x.moveTo(fx-dx*l,fy-dy*l);x.lineTo(fx+dx*l,fy+dy*l);x.stroke();});`,

  // B: the horizon. a tilted disc of light, bent over and under the void
  b: `stars(110);const R=190;x.globalCompositeOperation='lighter';glow(C,C,R,470,.2);
const dop=(a)=>.32+.68*Math.pow(.5+.5*Math.cos(a-Math.PI),1.6);
const ell=(rx,ry,a0,a1,al,w)=>{x.strokeStyle='rgba(255,255,255,'+al+')';x.lineWidth=w;x.beginPath();x.ellipse(C,C+6,rx,ry,-.1,a0,a1);x.stroke();};
const disc=(front)=>{for(let i=0;i<900;i++){const t=rnd(),rx=R*1.08+Math.pow(t,1.5)*280,a0=rnd()*TAU,a1=a0+.15+rnd()*.9,mid=(a0+a1)/2,isF=Math.sin(mid)>0;if(isF!==front)continue;
  ell(rx,rx*.16,a0,a1,(.05+.3*(1-t))*dop(mid),.6+rnd()*1.8);}};
// light from behind, lifted into a halo above and below the shadow
for(let i=0;i<1500;i++){const t=rnd(),r=R+6+Math.pow(t,1.8)*105,a0=rnd()*TAU,a1=a0+.1+rnd()*.7,mid=(a0+a1)/2;
  const k=Math.pow(Math.abs(Math.sin(mid)),.7)*(Math.sin(mid)<0?1:.5);x.strokeStyle='rgba(255,255,255,'+((.04+.3*(1-t))*k*dop(mid))+')';x.lineWidth=.6+rnd()*1.6;x.beginPath();x.arc(C,C,r,a0,a1);x.stroke();}
disc(false);
x.globalCompositeOperation='source-over';x.fillStyle='#000';x.beginPath();x.arc(C,C,R,0,TAU);x.fill();
x.globalCompositeOperation='lighter';x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=2;x.shadowColor='#fff';x.shadowBlur=14;x.beginPath();x.arc(C,C,R+2,0,TAU);x.stroke();x.shadowBlur=0;
disc(true);
const g=x.createLinearGradient(40,0,960,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.3,'rgba(255,255,255,.9)');g.addColorStop(.62,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,0)');
x.save();x.translate(C,C+6);x.rotate(-.1);x.fillStyle=g;x.shadowColor='#fff';x.shadowBlur=26;x.beginPath();x.ellipse(0,R*.17,440,5,0,0,TAU);x.fill();x.restore();`,

  // C: the monogram. a V made of light rippling out of the void that sits in its notch
  c: `x.translate(C,C+18);x.scale(.8,.8);x.translate(-C,-C);const vx=C,vy=318,V=[[128,170],[322,170],[500,628],[678,170],[872,170],[596,850],[404,850]];
x.globalCompositeOperation='lighter';glow(vx,vy,0,520,.1);
x.save();x.beginPath();V.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.clip();
const bg=x.createRadialGradient(vx,vy,60,vx,vy,640);bg.addColorStop(0,'rgba(255,255,255,.34)');bg.addColorStop(1,'rgba(255,255,255,.02)');x.fillStyle=bg;x.fillRect(0,0,S,S);
for(let r=104,i=0;r<700;r+=11+i*.55,i++){const al=Math.max(.1,1-r/720);x.strokeStyle='rgba(255,255,255,'+al+')';x.lineWidth=Math.max(1.4,5.5-i*.14);x.beginPath();x.arc(vx,vy,r,0,TAU);x.stroke();}
x.restore();
x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.6;x.beginPath();V.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.stroke();
glow(vx,vy,60,210,.5);
x.globalCompositeOperation='source-over';x.fillStyle='#000';x.beginPath();x.arc(vx,vy,84,0,TAU);x.fill();
x.strokeStyle='#fff';x.lineWidth=3.4;x.shadowColor='#fff';x.shadowBlur=26;x.beginPath();x.arc(vx,vy,85,0,TAU);x.stroke();x.stroke();x.shadowBlur=0;`,
};

(async () => {
  const only = process.argv[2] || 'c', c = await open('about:blank', 1000, 1000, 9598);
  try { for (const k of Object.keys(ART).filter((n) => !only || n === only)) {
    const f = path.join(SRC, 'pfp-' + k + '.html');
    fs.writeFileSync(f, `<!doctype html><html><body style="margin:0;background:#000;overflow:hidden"><canvas id="c" width="1000" height="1000" style="display:block"></canvas><script>${PRE}${ART[k]};window.__ready=true;</script></body></html>`);
    await c.load(url(f), 1000, 1000); await c.shot(path.join(OUT, k === 'c' ? 'vanta-pfp.png' : 'vanta-pfp-' + k + '.png')); console.log('OK', k);
  } } finally { c.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
