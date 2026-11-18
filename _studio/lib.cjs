// shared look for the VANTA kit: black and white, Bricolage headlines, DM Mono labels, and the void with its ring of light
'use strict';
// fill these in when they exist, then re-run kit.cjs, videos.cjs and tweets.cjs
const X = '', SITE = '', TICK = '$VANTA', CA = '';
const LINE = [SITE, X].filter(Boolean).join(' · ');
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">`;
const CSS = (W, H) => `*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;position:relative;background:radial-gradient(${W * 0.8}px ${H * 0.9}px at 50% 0%,#1a1a1a,#050505 70%);color:#f4f4f4;font:400 28px/1.4 'Bricolage Grotesque',sans-serif;-webkit-font-smoothing:antialiased}
.word{position:absolute;left:50%;transform:translateX(-50%);font-weight:800;font-stretch:76%;line-height:.8;letter-spacing:-.03em;white-space:nowrap;background:linear-gradient(180deg,#fff 10%,#9a9a9a 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.void{position:absolute;border-radius:50%;background:#000;box-shadow:0 0 0 3px #fff,0 0 34px 6px rgba(255,255,255,.75),0 0 150px 40px rgba(255,255,255,.22),0 0 420px 120px rgba(255,255,255,.07)}
.eye{font:500 16px 'DM Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:#bdbdbd}
.h{font:800 96px/.94 'Bricolage Grotesque';font-stretch:82%;letter-spacing:-.035em}
.h em,.it{font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;letter-spacing:-.01em;color:#cfcfcf}
.dim{color:#8c8c8c}.mono{font-family:'DM Mono',monospace}
.card{position:absolute;border:1px solid rgba(255,255,255,.16);border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 45%),#0b0b0b;box-shadow:0 40px 90px -40px rgba(255,255,255,.14)}
.tag{display:inline-block;font:500 13px 'DM Mono';letter-spacing:.14em;padding:5px 10px;border-radius:99px;border:1px solid #fff;color:#fff}
.kv{display:flex;justify-content:space-between;gap:30px;align-items:baseline;padding:17px 0;border-bottom:1px solid rgba(255,255,255,.13)}.kv:last-child{border:0}.kv>span:first-child{color:#8c8c8c}.kv>span:last-child{font-family:'DM Mono';text-align:right}
.foot{position:absolute;left:70px;right:70px;bottom:44px;display:flex;justify-content:space-between;align-items:center}
.mk{display:flex;align-items:center;gap:14px;font:800 30px 'Bricolage Grotesque';letter-spacing:.14em}.mk i{width:54px;height:54px;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAwIDEwMDAiPjxkZWZzPjxjbGlwUGF0aCBpZD0idiI+PHBhdGggZD0iTTEyOCAxNzBIMzIyTDUwMCA2MjggNjc4IDE3MEg4NzJMNTk2IDg1MEg0MDRaIi8+PC9jbGlwUGF0aD48L2RlZnM+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTAwIDUxMCkgc2NhbGUoMS4xKSB0cmFuc2xhdGUoLTUwMCAtNTEwKSI+PGcgY2xpcC1wYXRoPSJ1cmwoI3YpIj48cmVjdCB3aWR0aD0iMTAwMCIgaGVpZ2h0PSIxMDAwIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4yIi8+PGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjUyIj48Y2lyY2xlIGN4PSI1MDAiIGN5PSIzMTgiIHI9IjE5MCIgc3Ryb2tlLW9wYWNpdHk9IjEuMDAiLz48Y2lyY2xlIGN4PSI1MDAiIGN5PSIzMTgiIHI9IjI5NCIgc3Ryb2tlLW9wYWNpdHk9IjAuODgiLz48Y2lyY2xlIGN4PSI1MDAiIGN5PSIzMTgiIHI9IjM5OCIgc3Ryb2tlLW9wYWNpdHk9IjAuNzYiLz48Y2lyY2xlIGN4PSI1MDAiIGN5PSIzMTgiIHI9IjUwMiIgc3Ryb2tlLW9wYWNpdHk9IjAuNjQiLz48Y2lyY2xlIGN4PSI1MDAiIGN5PSIzMTgiIHI9IjYwNiIgc3Ryb2tlLW9wYWNpdHk9IjAuNTIiLz48Y2lyY2xlIGN4PSI1MDAiIGN5PSIzMTgiIHI9IjcxMCIgc3Ryb2tlLW9wYWNpdHk9IjAuNDUiLz48L2c+PC9nPjxjaXJjbGUgY3g9IjUwMCIgY3k9IjMxOCIgcj0iOTYiIGZpbGw9IiMwMDAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyNiIvPjwvZz48L3N2Zz4K) center/contain no-repeat;display:block;filter:drop-shadow(0 0 10px rgba(255,255,255,.35))}
.ft{font:400 15px 'DM Mono';letter-spacing:.2em;text-transform:uppercase;color:#8c8c8c}.ft b{color:#fff;font-weight:500}`;
const LOAD = `[document.fonts.load('800 40px "Bricolage Grotesque"'),document.fonts.load('400 40px "Bricolage Grotesque"'),document.fonts.load('600 40px "Bricolage Grotesque"'),document.fonts.load('400 20px "DM Mono"'),document.fonts.load('500 20px "DM Mono"'),document.fonts.load('italic 40px "Instrument Serif"')]`;
const READY = `<script>Promise.all(${LOAD}).then(()=>document.fonts.ready).then(()=>{window.__ready=true})</script>`;
const HEAD = (W, H, extra = '') => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS(W, H)}${extra}</style></head><body>`;
const FOOT = () => `<div class="foot"><span class="mk"><i></i>VANTA</span><span class="ft">${LINE ? LINE + ' · ' : ''}<b>${TICK}</b></span></div>`;
const VOID = (size, left, top, extra = '') => `<div class="void" style="left:${left}px;top:${top}px;width:${size}px;height:${size}px;${extra}"></div>`;
const WORD = (t, size, top, extra = '') => `<div class="word" style="font-size:${size}px;top:${top}px;${extra}">${t}</div>`;
module.exports = { X, SITE, TICK, CA, LINE, HEAD, FOOT, READY, LOAD, VOID, WORD };
