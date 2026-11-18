// VANTA node: the swap terminal, the shielded pool, the launchpad and the site, in one process with no dependencies.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEngine, RULES } from './engine.js';
import { signer, isAddress, rpc, LAMPORTS } from './sol.js';
import * as swap from './swap.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), CLIENT = path.join(ROOT, 'client');
const PORT = Number(process.env.PORT || 8302), DATA_PATH = process.env.DATA_PATH || path.join(ROOT, 'vanta.json');
const abs = (u) => { u = (u || '').trim(); return u && !/^https?:\/\//i.test(u) ? 'https://' + u.replace(/^\/+/, '') : u; };
const SITE_URL = abs(process.env.SITE_URL).replace(/\/$/, ''), X_URL = abs(process.env.X_URL), GH_URL = abs(process.env.GH_URL), TOKEN_MINT = process.env.TOKEN_MINT || '', ADMIN_KEY = process.env.ADMIN_KEY || '';
const pool = process.env.POOL_SECRET ? signer(process.env.POOL_SECRET) : null, TREASURY = pool?.address || process.env.TREASURY || '';
if (TREASURY && !isAddress(TREASURY)) throw new Error('TREASURY is not a Solana address');
const E = makeEngine({ dataPath: DATA_PATH, treasury: TREASURY, pool, test: process.env.VANTA_TEST === '1' });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };
const PAGES = { '/': 'index.html', '/swap': 'swap.html', '/pool': 'pool.html', '/launch': 'launch.html', '/docs': 'docs.html' };
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
const read = (req) => new Promise((ok, no) => { let b = '', n = 0; req.on('data', (c) => { n += c.length; if (n > 300000) { no(Object.assign(new Error('Too large'), { code: 413 })); req.destroy(); } else b += c; }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { no(Object.assign(new Error('Bad request'), { code: 400 })); } }); });

// a small per-address rate limit for the routes that reach other services
const hits = new Map(); setInterval(() => hits.clear(), 60e3).unref();
const limit = (req, n) => { const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), c = (hits.get(ip) || 0) + 1; hits.set(ip, c); if (c > n) throw Object.assign(new Error('Slow down a little'), { code: 429 }); };

const signed = { '/api/pool/me': E.me, '/api/pool/intent': E.intent, '/api/pool/confirm': E.confirm, '/api/pool/send': E.send, '/api/pool/withdraw': E.withdraw, '/api/launch/create': E.create, '/api/launch/buy': E.buy, '/api/launch/sell': E.sell };

async function api(req, res, url) {
  const p = url.pathname, q = url.searchParams;
  if (req.method === 'POST' && signed[p]) return json(res, 200, await signed[p](p, await read(req)));
  if (p === '/api/config') return json(res, 200, { site: SITE_URL, x: X_URL, github: GH_URL, mint: TOKEN_MINT, pool: { open: !!TREASURY, address: TREASURY, auto: !!pool }, rules: { shieldFeeBps: RULES.shieldFeeBps, minDeposit: RULES.minDeposit / LAMPORTS, maxDeposit: RULES.maxDeposit / LAMPORTS, minWithdraw: RULES.minWithdraw / LAMPORTS, launchFee: RULES.launchFee / LAMPORTS, tradeFeeBps: RULES.tradeFeeBps, sealed: RULES.sealed, sealedCap: RULES.sealedCap / LAMPORTS }, route: swap.routeInfo() });
  if (p === '/api/stats') { const t = await swap.tokens().catch(() => ({ list: [] })); return json(res, 200, { ...E.stats(), solUsd: t.list.find((x) => x.symbol === 'SOL' && x.chain === 'sol')?.price || 0 }); }
  if (p === '/api/pool/blockhash') { limit(req, 30); return json(res, 200, { blockhash: (await rpc('getLatestBlockhash', [{ commitment: 'finalized' }])).value.blockhash }); }
  if (p === '/api/swap/tokens') return json(res, 200, (await swap.tokens()).list);
  if (p === '/api/swap/quote' && req.method === 'POST') { limit(req, 90); return json(res, 200, await swap.quote(await read(req))); }
  if (p === '/api/swap/order' && req.method === 'POST') { limit(req, 20); return json(res, 200, await swap.order(await read(req))); }
  if (p === '/api/swap/status') { limit(req, 120); return json(res, 200, await swap.status(q.get('address'), q.get('memo') || '')); }
  if (p === '/api/swap/submit' && req.method === 'POST') { limit(req, 20); const b = await read(req); await swap.submit(String(b.txHash || ''), String(b.address || '')); return json(res, 200, { ok: true }); }
  if (p === '/api/launches') return json(res, 200, E.launches(q.get('sort') || 'new'));
  if (p === '/api/launch/preview') return json(res, 200, E.preview(q.get('id'), q.get('side'), q.get('amount')));
  const m = p.match(/^\/api\/launch\/([1-9A-HJ-NP-Za-km-z]{4,12})(\/image)?$/);
  if (m && m[2]) { const d = E.image(m[1]), x = d.match(/^data:(image\/[a-z]+);base64,(.+)$/); if (!x) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': x[1], 'cache-control': 'public, max-age=86400' }); return res.end(Buffer.from(x[2], 'base64')); }
  if (m) return json(res, 200, E.launch(m[1]));
  if (p.startsWith('/api/admin/')) {
    if (!ADMIN_KEY || req.headers['x-admin-key'] !== ADMIN_KEY) return json(res, 401, { error: 'Not allowed' });
    if (p === '/api/admin/queue') return json(res, 200, E.queue());
    if (p === '/api/admin/paid' && req.method === 'POST') { const b = await read(req); return json(res, 200, await E.settle(b.id, b.signature)); }
  }
  return json(res, 404, { error: 'Not found' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname === '/health') return json(res, 200, { ok: true });
    const file = PAGES[url.pathname] || (url.pathname.startsWith('/t/') ? 'launch.html' : url.pathname.slice(1)), fp = path.join(CLIENT, path.normalize(file));
    if (!fp.startsWith(CLIENT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(CLIENT, '404.html'), 'utf8')); }
    const ext = path.extname(fp), type = TYPES[ext] || 'application/octet-stream';
    if (ext === '.html' || ext === '.js') { const origin = SITE_URL || (req.headers['x-forwarded-proto'] || 'http') + '://' + req.headers.host; res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' }); return res.end(fs.readFileSync(fp, 'utf8').replaceAll('{{SITE_URL}}', origin).replaceAll('{{X_URL}}', X_URL).replaceAll('{{GH_URL}}', GH_URL).replaceAll('{{TOKEN_MINT}}', TOKEN_MINT)); }
    res.writeHead(200, { 'content-type': type, 'cache-control': ext === '.css' ? 'no-cache' : 'public, max-age=3600' }); fs.createReadStream(fp).pipe(res);
  } catch (e) { json(res, e.code >= 400 && e.code < 600 ? e.code : 500, { error: e.code ? e.message : 'Something went wrong on our side' }); if (!e.code) console.error(e); }
}).listen(PORT, () => console.log(`VANTA on http://localhost:${PORT}  pool ${TREASURY || 'closed'}${pool ? ' (pays withdrawals itself)' : ''}`));
