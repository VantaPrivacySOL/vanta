// The shielded pool and the launchpad that lives inside it. Balances are lamports, token amounts are 6-decimal units.
import fs from 'node:fs';
import { randomBytes, randomInt } from 'node:crypto';
import { b58enc, b58dec, isAddress, verifySig, paidInto, sendSol, LAMPORTS } from './sol.js';

export const RULES = {
  shieldFeeBps: 50, minDeposit: 0.01 * LAMPORTS, maxDeposit: 100 * LAMPORTS, minSend: 0.0001 * LAMPORTS, minWithdraw: 0.005 * LAMPORTS, networkFee: 5000,
  intentTtl: 30 * 60e3, delay: { fast: [20e3, 90e3], standard: [5 * 60e3, 30 * 60e3] },
  launchFee: 0.02 * LAMPORTS, tradeFeeBps: 100, creatorShare: 0.5, supply: 1_000_000_000e6, vSol: 30 * LAMPORTS, vTok: 1_073_000_000e6,
  sealed: [0, 60, 300, 900], sealedCap: 2 * LAMPORTS, minTrade: 0.001 * LAMPORTS,
};
const err = (m, code = 400) => Object.assign(new Error(m), { code });
const fee = (n, bps) => Math.floor((n * bps) / 10000);

export function makeEngine({ dataPath, treasury, pool, test }) {
  let S = { accounts: {}, intents: {}, usedSigs: {}, withdrawals: [], launches: {}, positions: {}, fees: { shield: 0, launch: 0, trade: 0, creators: 0 }, totals: { deposited: 0, withdrawn: 0, sent: 0, volume: 0, deposits: 0 }, tape: [] };
  try { S = { ...S, ...JSON.parse(fs.readFileSync(dataPath, 'utf8')) }; } catch { /* first run */ }
  let dirty = false; const save = () => { dirty = true; };
  setInterval(() => { if (!dirty) return; dirty = false; fs.writeFile(dataPath + '.tmp', JSON.stringify(S), (e) => { if (!e) fs.rename(dataPath + '.tmp', dataPath, () => {}); }); }, 1500).unref();

  // ---- accounts: an ed25519 key that never leaves the browser ----
  const seen = new Map();
  function auth(path, env) {
    const { acct, ts, sig, body } = env || {};
    if (typeof acct !== 'string' || !acct.startsWith('vn_') || typeof body !== 'string' || typeof sig !== 'string') throw err('Unsigned request', 401);
    let pub, s; try { pub = b58dec(acct.slice(3)); s = b58dec(sig); } catch { throw err('Bad signature', 401); }
    if (pub.length !== 32 || s.length !== 64) throw err('Bad signature', 401);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 90e3) throw err('Your clock is out of step. Reload and try again.', 401);
    if ((seen.get(acct) || 0) >= ts) throw err('Request already used', 401);
    if (!verifySig(pub, `vanta:${path}:${ts}:${body}`, s)) throw err('Bad signature', 401);
    seen.set(acct, ts);
    let p; try { p = JSON.parse(body); } catch { throw err('Bad request'); }
    return { id: acct, a: (S.accounts[acct] ||= { bal: 0, created: Date.now(), log: [] }), p };
  }
  const note = (a, kind, lamports, text) => { a.log.unshift({ t: Date.now(), kind, lamports, text }); if (a.log.length > 60) a.log.length = 60; };
  const lamportsOf = (v, min, what) => { const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < min) throw err(`${what} is below the minimum`); return n; };

  // ---- pool ----
  function intent(path, env) {
    const { id, p } = auth(path, env); if (!treasury) throw err('Deposits are not open yet', 503);
    const base = lamportsOf(p.lamports, RULES.minDeposit, 'Deposit'); if (base > RULES.maxDeposit) throw err('Deposit is above the 100 SOL limit');
    const now = Date.now(); for (const [k, i] of Object.entries(S.intents)) if (i.expires < now) delete S.intents[k];
    let lamports; do { lamports = base + randomInt(1, 100000); } while (Object.values(S.intents).some((i) => i.lamports === lamports));
    const key = b58enc(randomBytes(8)); S.intents[key] = { acct: id, lamports, created: now, expires: now + RULES.intentTtl }; save();
    return { intent: key, address: treasury, lamports, sol: lamports / LAMPORTS, expires: now + RULES.intentTtl };
  }
  async function confirm(path, env) {
    const { id, a, p } = auth(path, env), i = S.intents[p.intent];
    if (!i || i.acct !== id) throw err('That deposit request has expired. Start a new one.');
    const sig = String(p.signature || ''); if (S.usedSigs[sig]) throw err('That transaction was already credited');
    let paid;
    if (test && sig.startsWith('test:')) paid = { lamports: i.lamports };
    else { if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(sig)) throw err('That is not a Solana transaction signature'); paid = await paidInto(sig, treasury); }
    if (!paid) return { pending: true };
    if (paid.failed) throw err('That transaction failed on Solana');
    if (paid.lamports !== i.lamports) throw err(`That transaction paid ${paid.lamports / LAMPORTS} SOL, not the exact ${i.lamports / LAMPORTS} SOL of this deposit`);
    if (S.usedSigs[sig]) throw err('That transaction was already credited');
    const f = fee(i.lamports, RULES.shieldFeeBps), net = i.lamports - f;
    S.usedSigs[sig] = 1; delete S.intents[p.intent]; a.bal += net; S.fees.shield += f; S.totals.deposited += i.lamports; S.totals.deposits++;
    note(a, 'deposit', net, 'Shielded'); S.tape.unshift({ t: Date.now(), kind: 'in', lamports: i.lamports }); S.tape.length = Math.min(S.tape.length, 40); save();
    return { credited: net, fee: f, balance: a.bal };
  }
  function send(path, env) {
    const { id, a, p } = auth(path, env), n = lamportsOf(p.lamports, RULES.minSend, 'Amount'), to = String(p.to || '');
    if (!to.startsWith('vn_') || !isAddress(to.slice(3))) throw err('That is not a VANTA account');
    if (to === id) throw err('That is your own account'); if (n > a.bal) throw err('Not enough shielded balance');
    const b = (S.accounts[to] ||= { bal: 0, created: Date.now(), log: [] });
    a.bal -= n; b.bal += n; S.totals.sent += n; note(a, 'sent', -n, 'Private send'); note(b, 'received', n, 'Private receive'); save();
    return { balance: a.bal };
  }
  function withdraw(path, env) {
    const { id, a, p } = auth(path, env), n = lamportsOf(p.lamports, RULES.minWithdraw, 'Withdrawal'), to = String(p.to || '');
    if (!isAddress(to)) throw err('That is not a Solana address'); if (to === treasury) throw err('That is the pool itself'); if (n > a.bal) throw err('Not enough shielded balance');
    const f = fee(n, RULES.shieldFeeBps), out = n - f - RULES.networkFee, [lo, hi] = test ? [200, 600] : RULES.delay[p.speed === 'fast' ? 'fast' : 'standard'];
    const w = { id: b58enc(randomBytes(8)), acct: id, to, lamports: out, fee: f, at: Date.now(), due: Date.now() + randomInt(lo, hi), status: 'queued' };
    a.bal -= n; S.fees.shield += f; S.withdrawals.push(w); note(a, 'withdraw', -n, 'Withdrawal ' + w.id); save();
    return { id: w.id, lamports: out, due: w.due, balance: a.bal };
  }
  const finish = (w, signature) => { w.status = 'paid'; w.signature = signature; w.paidAt = Date.now(); S.totals.withdrawn += w.lamports; S.tape.unshift({ t: Date.now(), kind: 'out', lamports: w.lamports }); S.tape.length = Math.min(S.tape.length, 40); save(); };
  let paying = false;
  async function payouts() {
    if (paying) return; paying = true;
    try {
      for (const w of S.withdrawals) {
        if (w.status !== 'queued' || w.due > Date.now()) continue;
        if (test) { finish(w, 'test'); continue; }
        if (!pool) continue;
        try { w.status = 'sending'; save(); finish(w, await sendSol(pool, w.to, w.lamports)); } catch (e) { w.status = 'queued'; w.due = Date.now() + 60e3; w.error = String(e.message || e).slice(0, 160); save(); }
      }
    } finally { paying = false; }
  }
  setInterval(payouts, test ? 400 : 15e3).unref();
  // The operator settles by hand when the node holds no pool key.
  async function settle(id, signature) {
    const w = S.withdrawals.find((x) => x.id === id); if (!w || w.status === 'paid') throw err('No such open withdrawal');
    const paid = await paidInto(signature, w.to); if (!paid || paid.failed || paid.lamports < w.lamports) throw err('That transaction did not pay this withdrawal');
    finish(w, signature); return { ok: true };
  }
  function me(path, env) {
    const { id, a } = auth(path, env);
    const positions = Object.entries(S.positions).filter(([, h]) => h[id] > 0).map(([lid, h]) => { const l = S.launches[lid]; return { id: lid, name: l.name, symbol: l.symbol, tokens: h[id], value: quoteSell(l, h[id]).out }; });
    const sealed = Object.values(S.launches).filter((l) => l.orders?.[id]).map((l) => ({ id: l.id, symbol: l.symbol, lamports: l.orders[id] }));
    return { account: id, balance: a.bal, log: a.log.slice(0, 30), withdrawals: S.withdrawals.filter((w) => w.acct === id).slice(-12).reverse().map(({ acct, ...w }) => w), positions, sealed, created: Object.values(S.launches).filter((l) => l.creator === id).map((l) => ({ id: l.id, symbol: l.symbol, earned: l.creatorEarned })) };
  }

  // ---- launchpad: a virtual constant-product curve, traded from shielded balances ----
  const big = BigInt, k = (l) => big(l.vS) * big(l.vT);
  const quoteBuy = (l, lamportsIn) => { const f = fee(lamportsIn, RULES.tradeFeeBps), net = lamportsIn - f; let out = Number(big(l.vT) - k(l) / big(l.vS + net)); return { out: Math.min(out, RULES.supply - l.sold), fee: f, net, capped: out > RULES.supply - l.sold }; };
  function quoteSell(l, tokens) { const gross = Number(big(l.vS) - k(l) / big(l.vT + tokens)), f = fee(gross, RULES.tradeFeeBps); return { out: gross - f, fee: f, gross }; }
  const price = (l) => (l.vS / LAMPORTS) / (l.vT / 1e6);
  const isSealed = (l) => !l.opened;
  const takeFee = (l, f) => { const c = Math.floor(f * RULES.creatorShare); S.fees.trade += f - c; S.fees.creators += c; l.creatorEarned += c; const a = S.accounts[l.creator]; if (a) a.bal += c; };
  const mark = (l, side, lamports, tokens) => { l.tape.unshift({ t: Date.now(), side, lamports, tokens, price: price(l) }); if (l.tape.length > 60) l.tape.length = 60; l.points.push([Date.now(), price(l)]); if (l.points.length > 400) l.points.shift(); l.volume += lamports; S.totals.volume += lamports; };
  const view = (l, full) => ({ id: l.id, name: l.name, symbol: l.symbol, about: l.about, created: l.created, image: l.image ? `/api/launch/${l.id}/image` : '', price: price(l), mcap: price(l) * 1e9, raised: (l.vS - RULES.vSol) / LAMPORTS, sold: l.sold / RULES.supply, volume: l.volume / LAMPORTS, holders: Object.values(S.positions[l.id] || {}).filter((v) => v > 0).length, trades: l.trades,
    sealed: isSealed(l) ? { until: l.sealedUntil, orders: Object.keys(l.orders).length, committed: Object.values(l.orders).reduce((s, v) => s + v, 0) / LAMPORTS } : null, ...(full ? { tape: l.tape, points: l.points, sealedSeconds: l.sealedSeconds, open: l.open || null } : {}) });

  function create(path, env) {
    const { id, a, p } = auth(path, env);
    const name = String(p.name || '').trim().slice(0, 32), symbol = String(p.symbol || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10), about = String(p.about || '').trim().slice(0, 280), secs = Number(p.sealed);
    if (name.length < 2 || symbol.length < 2) throw err('Give the token a name and a ticker'); if (!RULES.sealed.includes(secs)) throw err('Pick a sealed window');
    if (Object.values(S.launches).some((l) => l.symbol === symbol)) throw err('That ticker is taken');
    let image = ''; if (p.image) { if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image) || p.image.length > 140000) throw err('The image must be a PNG, JPEG or WebP under 100 KB'); image = p.image; }
    if (a.bal < RULES.launchFee) throw err('Launching costs 0.02 SOL of shielded balance');
    a.bal -= RULES.launchFee; S.fees.launch += RULES.launchFee; note(a, 'launch', -RULES.launchFee, 'Launched $' + symbol);
    const lid = b58enc(randomBytes(6)), now = Date.now();
    const l = S.launches[lid] = { id: lid, name, symbol, about, image, creator: id, created: now, vS: RULES.vSol, vT: RULES.vTok, sold: 0, volume: 0, trades: 0, creatorEarned: 0, tape: [], points: [[now, RULES.vSol / LAMPORTS / (RULES.vTok / 1e6)]], sealedSeconds: secs, sealedUntil: now + secs * 1000, orders: {}, opened: secs === 0 };
    S.positions[lid] = {}; save(); return view(l, true);
  }
  // The sealed window clears as one buy: everyone in it pays the same price.
  function open(l) {
    if (l.opened || Date.now() < l.sealedUntil) return;
    const total = Object.values(l.orders).reduce((s, v) => s + v, 0);
    if (total > 0) {
      const q = quoteBuy(l, total), h = S.positions[l.id];
      for (const [acct, lamports] of Object.entries(l.orders)) { const t = Math.floor((q.out * lamports) / total); h[acct] = (h[acct] || 0) + t; const a = S.accounts[acct]; if (a) note(a, 'fill', 0, `Sealed fill $${l.symbol}`); }
      l.vS += q.net; l.vT -= q.out; l.sold += q.out; l.trades += Object.keys(l.orders).length; takeFee(l, q.fee); mark(l, 'open', total, q.out);
      l.open = { orders: Object.keys(l.orders).length, lamports: total, price: (total / LAMPORTS) / (q.out / 1e6) };
    }
    l.orders = {}; l.opened = true; save();
  }
  setInterval(() => { for (const l of Object.values(S.launches)) open(l); }, 500).unref();
  const launchOf = (id) => { const l = S.launches[id]; if (!l) throw err('No such launch', 404); open(l); return l; };

  function buy(path, env) {
    const { id, a, p } = auth(path, env), l = launchOf(p.id), n = lamportsOf(p.lamports, RULES.minTrade, 'Order');
    if (n > a.bal) throw err('Not enough shielded balance');
    if (isSealed(l)) {
      if ((l.orders[id] || 0) + n > RULES.sealedCap) throw err('The sealed window takes 2 SOL per account');
      a.bal -= n; l.orders[id] = (l.orders[id] || 0) + n; note(a, 'sealed', -n, `Sealed order $${l.symbol}`); save(); return { sealed: true, committed: l.orders[id], balance: a.bal };
    }
    const q = quoteBuy(l, n); if (q.capped || q.out <= 0) throw err('That is more than the supply left on the curve'); if (q.out < Number(p.min || 0)) throw err('The price moved past your slippage limit');
    a.bal -= n; l.vS += q.net; l.vT -= q.out; l.sold += q.out; l.trades++; const h = S.positions[l.id]; h[id] = (h[id] || 0) + q.out;
    takeFee(l, q.fee); mark(l, 'buy', n, q.out); note(a, 'buy', -n, `Bought $${l.symbol}`); save(); return { tokens: q.out, balance: a.bal, position: h[id] };
  }
  function sell(path, env) {
    const { id, a, p } = auth(path, env), l = launchOf(p.id), h = S.positions[l.id], t = Math.floor(Number(p.tokens));
    if (isSealed(l)) throw err('Selling opens when the sealed window clears'); if (!(t > 0) || t > (h[id] || 0)) throw err('You do not hold that many');
    const q = quoteSell(l, t); if (q.out < Number(p.min || 0)) throw err('The price moved past your slippage limit');
    h[id] -= t; l.vT += t; l.vS -= q.gross; l.sold -= t; l.trades++; a.bal += q.out; takeFee(l, q.fee); mark(l, 'sell', q.gross, t); note(a, 'sell', q.out, `Sold $${l.symbol}`); save();
    return { lamports: q.out, balance: a.bal, position: h[id] };
  }
  function preview(id, side, amount) {
    const l = launchOf(id), n = Math.floor(Number(amount)); if (!(n > 0)) throw err('Enter an amount');
    if (side === 'sell') { const q = quoteSell(l, n); return { out: q.out, fee: q.fee }; }
    if (isSealed(l)) return { sealed: true }; const q = quoteBuy(l, n); return { out: q.out, fee: q.fee, capped: q.capped };
  }
  function launches(sort) {
    const all = Object.values(S.launches); all.forEach(open);
    const by = { new: (a, b) => b.created - a.created, cap: (a, b) => price(b) - price(a), volume: (a, b) => b.volume - a.volume }[sort] || ((a, b) => b.created - a.created);
    return all.sort(by).slice(0, 200).map((l) => view(l));
  }
  const stats = () => {
    const tvl = Object.values(S.accounts).reduce((s, a) => s + a.bal, 0) + Object.values(S.launches).reduce((s, l) => s + (l.vS - RULES.vSol) + Object.values(l.orders).reduce((x, v) => x + v, 0), 0);
    return { open: !!treasury, pool: treasury || '', tvl: tvl / LAMPORTS, accounts: Object.keys(S.accounts).length, deposits: S.totals.deposits, deposited: S.totals.deposited / LAMPORTS, withdrawn: S.totals.withdrawn / LAMPORTS, sent: S.totals.sent / LAMPORTS, launches: Object.keys(S.launches).length, volume: S.totals.volume / LAMPORTS,
      fees: { shield: S.fees.shield / LAMPORTS, launch: S.fees.launch / LAMPORTS, trade: S.fees.trade / LAMPORTS, creators: S.fees.creators / LAMPORTS }, queue: S.withdrawals.filter((w) => w.status !== 'paid').length, tape: S.tape.slice(0, 12) };
  };
  return { intent, confirm, send, withdraw, me, settle, create, buy, sell, preview, launches, launch: (id) => view(launchOf(id), true), image: (id) => S.launches[id]?.image || '', stats,
    queue: () => S.withdrawals.filter((w) => w.status !== 'paid').map(({ acct, ...w }) => w) };
}
