// VANTA videos (frame-exact, 1920x1080, 30 fps).  node _studio/videos.cjs [name]
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), { open } = require('./cdp.cjs'), { LINE, TICK, HEAD, LOAD } = require('./lib.cjs');
const B = path.join(__dirname, '..', 'brand'), K = path.join(__dirname, 'kit'), FPS = 30, url = (f) => 'file:///' + f.split(path.sep).join('/');
const VCSS = `.s{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;padding:0 130px}
.h{font-size:136px}.sub{font:400 44px/1.3 'Bricolage Grotesque';color:#8c8c8c;margin-top:36px}.eye{font-size:21px}
.row{position:absolute;left:150px;right:150px;display:grid;grid-template-columns:480px 1fr 290px;gap:34px;align-items:center;opacity:0}.row .n{font:700 54px 'Bricolage Grotesque';font-stretch:86%}.row .k{font:400 16px 'DM Mono';letter-spacing:.14em;color:#8c8c8c;margin-top:4px}
.row .t{height:26px;border-radius:99px;background:rgba(255,255,255,.08)}.row .t i{display:block;height:100%;border-radius:99px;width:0;background:linear-gradient(90deg,#555,#fff)}.row .v{font:400 50px 'DM Mono';text-align:right}
.tile{position:absolute;width:540px;height:300px;padding:36px 38px;opacity:0}.tile b{display:block;font:800 60px/1 'Bricolage Grotesque';font-stretch:84%;margin-top:46px}.tile p{font-size:27px;color:#8c8c8c;margin-top:16px;line-height:1.35}
#ew{opacity:0}#ev{opacity:0}#el{position:absolute;left:0;right:0;top:800px;text-align:center;font:400 68px 'Instrument Serif';font-style:italic;color:#e6e6e6;opacity:0}#ef{position:absolute;left:0;right:0;bottom:60px;text-align:center;opacity:0}`;
const JS = `const $=(i)=>document.getElementById(i),cl=(x)=>Math.max(0,Math.min(1,x)),e=(x)=>1-Math.pow(1-cl(x),3),win=(t,a,b,f=.45)=>cl(Math.min((t-a)/f,(b-t)/f));
const show=(id,t,a,b)=>{const o=win(t,a,b),el=$(id);el.style.opacity=o;el.style.filter='blur('+((1-o)*12).toFixed(1)+'px)';el.style.transform='translateY('+((1-o)*22).toFixed(1)+'px)';};
const pop=(id,t,a,d=.4)=>{const q=e((t-a)/d),el=$(id);el.style.opacity=q;el.style.transform='translateY('+((1-q)*26).toFixed(1)+'px)';};
// end card: the word, then the void opening in front of it and swallowing the middle
const end=(t,a)=>{const z=t-a;if(z<0)return;const q=e(z/.9);$('ew').style.opacity=q;$('ew').style.transform='translateX(-50%) scale('+(1.08-.08*q)+')';const h=e((z-.3)/1.1);$('ev').style.opacity=cl((z-.3)/.3);$('ev').style.transform='scale('+(.05+.95*h+Math.sin(z*1.6)*.012).toFixed(4)+')';['el','ef'].forEach((k,i)=>{$(k).style.opacity=cl((z-.9-i*.3)/.6);});};`;
const page = (body, line, seek, endAt) => HEAD(1920, 1080, VCSS) + body + `<div class="word" id="ew" style="font-size:720px;top:150px">VANTA</div><div class="void" id="ev" style="left:750px;top:230px;width:420px;height:420px"></div><div id="el">${line}</div><div id="ef" class="ft" style="font-size:21px">${LINE ? LINE + ' · ' : ''}<b>${TICK}</b></div>` +
  `<script>${JS}window.__seek=(t)=>{${seek}end(t,${endAt});};Promise.all(${LOAD}).then(()=>document.fonts.ready).then(()=>{window.__seek(0);window.__ready=true;});</script></body></html>`;
// market caps: CoinGecko, 18 Nov 2026
const PRIV = [['Zcash', 'SHIELDED COIN', 15.72e9, '$15.7B'], ['Monero', 'PRIVATE COIN', 9.23e9, '$9.2B'], ['Railgun', 'SHIELDED POOL', 94.6e6, '$94.6M'], ['Tornado Cash', 'MIXER', 18.9e6, '$18.9M']];
const STACK = [['01 / the pool', 'Shielded SOL.', 'Balances and sends that never touch a chain.'], ['02 / private swaps', '39 chains.', 'One send. No wallet connection.'], ['03 / private launchpad', 'Private launches.', 'No deployer wallet. No buyer list.']];
const rows = (list, top, gap, max) => list.map((r, i) => `<div class="row" id="r${i}" style="top:${top + i * gap}px"><div><div class="n">${r[0]}</div><div class="k">${r[1]}</div></div><div class="t"><i id="w${i}" data-w="${Math.max(0.8, (r[2] / max) * 100)}"></i></div><div class="v" id="v${i}" style="opacity:0">${r[3]}</div></div>`).join('');
const barsJs = (n, start) => `for(let i=0;i<${n};i++){const q=e((t-${start}-i*.45)/1.1);$('r'+i).style.opacity=cl((t-${start - 0.1}-i*.45)/.4)*o;$('w'+i).style.width=(+$('w'+i).dataset.w*q)+'%';$('v'+i).style.opacity=cl((t-${start + 0.5}-i*.45)/.4);}`;

const V = {
  'vanta-hype-12s': [12, page(`<div class="s" id="a"><div class="h">Every wallet<br><em>is a glass box.</em></div></div>
    <div class="s" id="b"><div class="h">Swap unseen.<br>Hold unseen.</div></div>
    <div class="s" id="c"><div class="h">Launch <em>unseen.</em></div><div class="sub">The first private launchpad.</div></div>`,
    'Nothing reflects.', `show('a',t,0,2.6);show('b',t,2.6,5.4);show('c',t,5.4,8.4);`, 8.4)],
  'vanta-stack-12s': [12, page(`<div class="s" id="a"><div class="h">One protocol.<br><em>Three ways to vanish.</em></div></div>
    <div id="ap" style="position:absolute;inset:0;opacity:0">${STACK.map(([k, a, b], i) => `<div class="tile card" id="p${i}" style="left:${120 + i * 570}px;top:390px"><div class="eye">${k}</div><b>${a}</b><p>${b}</p></div>`).join('')}</div>`,
    'Nothing reflects.', `show('a',t,0,2.8);$('ap').style.opacity=win(t,2.8,8.6,.5);for(let i=0;i<3;i++)pop('p'+i,t,3.1+i*.7);`, 8.6)],
  'vanta-mcap-12s': [12, page(`<div id="ct" style="position:absolute;left:150px;right:150px;top:110px;opacity:0"><div class="eye">market caps · coingecko · 18 nov 2026</div><div class="h" style="font-size:88px;margin-top:22px">$25 billion says <em>privacy is a market.</em></div></div>${rows(PRIV, 380, 122, 15.72e9)}<div class="row" id="us" style="top:870px"><div><div class="n">VANTA</div><div class="k">SWAP · POOL · LAUNCHPAD</div></div><div class="t"><i style="width:.8%;background:#fff;box-shadow:0 0 22px 6px rgba(255,255,255,.7)"></i></div><div class="v">new</div></div>`,
    'VANTA just arrived.', `const o=win(t,0,8.8,.5);$('ct').style.opacity=o;${barsJs(4, 1)}$('us').style.opacity=cl((t-4.6)/.6)*o;`, 8.8)],
};

async function render(c, name, dur, html) { const FR = path.join(__dirname, 'frames-' + name); fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
  const f = path.join(K, name + '.html'); fs.writeFileSync(f, html); await c.load(url(f), 1920, 1080); if (!(await c.ev('window.__ready===true'))) throw new Error('page did not load: ' + name);
  const N = Math.round(dur * FPS); for (let i = 0; i < N; i++) { await c.ev('__seek(' + (i / FPS).toFixed(4) + ')'); await c.shot(path.join(FR, 'f_' + String(i).padStart(4, '0') + '.jpg'), 'jpeg'); if (process.argv[3] === 'still' && [45, 120, 200, 330].includes(i)) fs.copyFileSync(path.join(FR, 'f_' + String(i).padStart(4, '0') + '.jpg'), path.join(K, `still-${name}-${i}.jpg`)); }
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(FR, 'f_%04d.jpg'), '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', path.join(B, name + '.mp4')]);
  fs.rmSync(FR, { recursive: true, force: true }); console.log('OK', name + '.mp4'); }
(async () => { fs.mkdirSync(K, { recursive: true }); fs.mkdirSync(B, { recursive: true }); const c = await open('about:blank', 1920, 1080, 9597);
  try { for (const n of Object.keys(V).filter((x) => !process.argv[2] || process.argv[2] === 'all' || x.includes(process.argv[2]))) await render(c, n, V[n][0], V[n][1]); } finally { c.close(); } })().catch((e) => { console.error(e); process.exit(1); });
