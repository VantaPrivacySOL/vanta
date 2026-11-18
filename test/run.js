// End-to-end checks against a throwaway node. Run with: npm test
import { spawn } from 'node:child_process';
import { generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { b58enc } from '../server/sol.js';

const PORT = 8303, BASE = 'http://localhost:' + PORT, data = path.join(os.tmpdir(), 'vanta-test-' + Date.now() + '.json');
const env = { ...process.env, PORT, DATA_PATH: data, VANTA_TEST: '1', TREASURY: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', POOL_SECRET: '' };
const start = async () => { const n = spawn(process.execPath, ['server/index.js'], { env, stdio: 'ignore' }); for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/health'); break; } catch { await sleep(150); } } return n; };
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
let pass = 0, fail = 0; const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log((cond ? '  ok  ' : 'FAIL  ') + name + (cond ? '' : ' ' + extra)); };
function account() { const { publicKey, privateKey } = generateKeyPairSync('ed25519'); return { id: 'vn_' + b58enc(publicKey.export({ format: 'der', type: 'spki' }).subarray(12)), privateKey }; }
let clock = Date.now();
async function call(a, p, body = {}, tamper) { const raw = JSON.stringify(body), ts = (clock = Math.max(clock + 1, Date.now())); const sig = b58enc(sign(null, Buffer.from(`vanta:${p}:${ts}:${raw}`), a.privateKey)); const r = await fetch(BASE + p, { method: 'POST', body: JSON.stringify({ acct: a.id, ts, sig, body: tamper || raw }) }); return { s: r.status, ...(await r.json()) }; }
const get = async (p) => (await fetch(BASE + p)).json();
const post = (p, body) => fetch(BASE + p, { method: 'POST', body: JSON.stringify(body) });
const SOL = 1e9;
let node = await start();
try {
  const A = account(), B = account(), C = account();
  console.log('pool');
  let r = await call(A, '/api/pool/me'); ok('new account starts empty', r.balance === 0);
  r = await call(A, '/api/pool/me', {}, '{"x":1}'); ok('tampered body is refused', r.s === 401);
  const i1 = await call(A, '/api/pool/intent', { lamports: 5 * SOL }); ok('deposit request gives the pool address and an exact amount', i1.address && i1.lamports > 5 * SOL && i1.lamports < 5.0001 * SOL);
  r = await call(B, '/api/pool/confirm', { intent: i1.intent, signature: 'test:a' }); ok('another account cannot claim it', r.s === 400);
  r = await call(A, '/api/pool/confirm', { intent: i1.intent, signature: 'test:a' }); ok('deposit credits minus 0.5%', r.credited === i1.lamports - Math.floor(i1.lamports * 0.005), JSON.stringify(r));
  const balA = r.balance;
  const i2 = await call(A, '/api/pool/intent', { lamports: 1 * SOL }); r = await call(A, '/api/pool/confirm', { intent: i2.intent, signature: 'test:a' }); ok('a transaction credits once', r.s === 400);
  r = await call(A, '/api/pool/intent', { lamports: 1000 }); ok('deposit minimum holds', r.s === 400);
  r = await call(A, '/api/pool/send', { to: B.id, lamports: 2 * SOL }); ok('private send moves balance', r.balance === balA - 2 * SOL);
  r = await call(B, '/api/pool/me'); ok('recipient sees it', r.balance === 2 * SOL && r.log[0].kind === 'received');
  r = await call(B, '/api/pool/send', { to: A.id, lamports: 3 * SOL }); ok('cannot send more than the balance', r.s === 400);
  r = await call(B, '/api/pool/withdraw', { to: 'not-an-address', lamports: SOL }); ok('withdrawal needs a Solana address', r.s === 400);
  r = await call(B, '/api/pool/withdraw', { to: 'Vote111111111111111111111111111111111111111', lamports: SOL, speed: 'fast' }); ok('withdrawal queues net of fees', r.lamports === SOL - 5_000_000 - 5000 && r.due > Date.now(), JSON.stringify(r));

  console.log('launchpad');
  r = await call(C, '/api/launch/create', { name: 'Nope', symbol: 'NOPE', sealed: 0 }); ok('launching needs shielded balance', r.s === 400);
  const L = await call(A, '/api/launch/create', { name: 'Pitch', symbol: 'pitch', about: 'test', sealed: 0 }); ok('open launch is created', L.symbol === 'PITCH' && !L.sealed, JSON.stringify(L));
  r = await call(A, '/api/launch/create', { name: 'Pitch 2', symbol: 'PITCH', sealed: 0 }); ok('tickers are unique', r.s === 400);
  const pv = await get(`/api/launch/preview?id=${L.id}&side=buy&amount=${SOL}`);
  r = await call(B, '/api/launch/buy', { id: L.id, lamports: SOL, min: pv.out }); ok('buy fills at the previewed amount', r.tokens === pv.out && r.tokens > 34e12 && r.tokens < 35e12, JSON.stringify(r));
  let d = await get('/api/launch/' + L.id); ok('price moved up and the tape names no account', d.price > L.price && d.tape.length === 1 && !JSON.stringify(d).includes(B.id) && !JSON.stringify(d).includes(A.id));
  r = await call(A, '/api/pool/me'); ok('creator earned half the 1% fee', r.created[0].earned === 5_000_000, JSON.stringify(r.created));
  r = await call(B, '/api/launch/sell', { id: L.id, tokens: pv.out * 2 }); ok('cannot sell more than held', r.s === 400);
  const before = (await call(B, '/api/pool/me')).balance; r = await call(B, '/api/launch/sell', { id: L.id, tokens: pv.out });
  ok('round trip costs about 2%', r.balance - before > 0.975 * SOL && r.balance - before < 0.985 * SOL, String(r.balance - before));
  d = await get('/api/launch/' + L.id); ok('curve returns to its start', Math.abs(d.raised) < 1e-6 && d.holders === 0, JSON.stringify([d.raised, d.holders]));
  r = await call(B, '/api/launch/buy', { id: L.id, lamports: SOL / 10, min: 9e15 }); ok('slippage limit holds', r.s === 400);

  console.log('sealed window');
  const ic = await call(C, '/api/pool/intent', { lamports: 3 * SOL }); await call(C, '/api/pool/confirm', { intent: ic.intent, signature: 'test:c' });
  const Z = await call(A, '/api/launch/create', { name: 'Sealed', symbol: 'SEAL', sealed: 60 }); ok('sealed launch starts sealed', Z.sealed && Z.sealed.until > Date.now(), JSON.stringify(Z));
  r = await call(B, '/api/launch/buy', { id: Z.id, lamports: 0.3 * SOL }); ok('sealed order is held', r.sealed === true);
  await call(C, '/api/launch/buy', { id: Z.id, lamports: 0.6 * SOL }); r = await call(C, '/api/launch/buy', { id: Z.id, lamports: 1.5 * SOL }); ok('2 SOL per account in the window', r.s === 400);
  r = await call(B, '/api/launch/sell', { id: Z.id, tokens: 1 }); ok('no selling in the window', r.s === 400);
  d = await get('/api/launch/' + Z.id); ok('window shows totals only', d.sealed.orders === 2 && Math.abs(d.sealed.committed - 0.9) < 1e-9 && d.price === Z.price);
  // close the window by moving the stored deadline, then restart on the same file
  await sleep(1800); node.kill(); await sleep(400);
  const st = JSON.parse(fs.readFileSync(data, 'utf8')); st.launches[Z.id].sealedUntil = Date.now() - 1; fs.writeFileSync(data, JSON.stringify(st));
  node = await start(); await sleep(900);
  d = await get('/api/launch/' + Z.id); ok('state survives a restart and the window clears as one buy', !d.sealed && d.tape.length === 1 && d.tape[0].side === 'open' && d.holders === 2, JSON.stringify(d).slice(0, 300));
  const pb = (await call(B, '/api/pool/me')).positions.find((x) => x.id === Z.id), pc = (await call(C, '/api/pool/me')).positions.find((x) => x.id === Z.id);
  ok('everyone in the window pays one price', pb && pc && Math.abs(pc.tokens / pb.tokens - 2) < 1e-6, JSON.stringify([pb, pc]));
  r = await call(B, '/api/pool/me'); ok('withdrawal was paid out', r.withdrawals[0].status === 'paid', JSON.stringify(r.withdrawals));
  const s = await get('/api/stats'); ok('stats add up', s.accounts === 3 && s.launches === 2 && s.fees.shield > 0 && s.fees.trade > 0 && s.tvl > 0, JSON.stringify(s));

  console.log('swap (live route)');
  const toks = await get('/api/swap/tokens'), sol = toks.find((t) => t.symbol === 'SOL' && t.chain === 'sol'), zec = toks.find((t) => t.symbol === 'ZEC' && t.chain === 'zec');
  ok('token list loads', toks.length > 100 && sol && zec);
  r = await (await post('/api/swap/quote', { from: sol.id, to: zec.id, amount: '1' })).json(); ok('live quote without any address', Number(r.amountOut) > 0 && r.seconds > 0, JSON.stringify(r));
  r = await post('/api/swap/order', { from: sol.id, to: zec.id, amount: '1' }); ok('an order needs both addresses', r.status === 400);
  for (const pg of ['/', '/swap', '/pool', '/launch', '/docs', '/t/' + L.id]) { const x = await fetch(BASE + pg); ok('page ' + pg, x.status === 200 && (await x.text()).includes('VANTA')); }
} finally { node.kill(); try { fs.unlinkSync(data); } catch {} }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
