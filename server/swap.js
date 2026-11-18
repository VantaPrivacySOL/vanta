// Private routing over NEAR Intents 1Click: quote, a one-time deposit address, and tracking. No wallet, no account.
const API = process.env.ONECLICK_URL || 'https://1click.chaindefuser.com', JWT = process.env.ONECLICK_JWT || '';
const FEE_TO = process.env.FEE_RECIPIENT || '', FEE_BPS = Number(process.env.FEE_BPS || 40);
const CHAINS = { sol: 'Solana', eth: 'Ethereum', btc: 'Bitcoin', near: 'NEAR', base: 'Base', arb: 'Arbitrum', bsc: 'BNB Chain', zec: 'Zcash', op: 'Optimism', pol: 'Polygon', avax: 'Avalanche', sui: 'Sui', ton: 'TON', tron: 'TRON', xrp: 'XRP Ledger', doge: 'Dogecoin', ltc: 'Litecoin', bch: 'Bitcoin Cash', dash: 'Dash', aptos: 'Aptos', stellar: 'Stellar', cardano: 'Cardano', gnosis: 'Gnosis', bera: 'Berachain', monad: 'Monad', starknet: 'Starknet', hood: 'Robinhood Chain', hypercore: 'Hyperliquid', plasma: 'Plasma', xlayer: 'X Layer', scroll: 'Scroll', aleo: 'Aleo', movement: 'Movement', abs: 'Abstract', fogo: 'Fogo', miden: 'Miden', adi: 'ADI', qtc: 'QTC', prl: 'PRL' };
const ORDER = ['sol', 'btc', 'eth', 'zec', 'near', 'base', 'arb', 'bsc'];
const MAJOR = ['SOL', 'BTC', 'ETH', 'ZEC', 'NEAR', 'BNB', 'USDC', 'USDT', 'wNEAR'], major = (t) => (MAJOR.indexOf(t.symbol) + 1 || 99);
const err = (m, code = 400) => Object.assign(new Error(m), { code });

async function call(path, body) {
  const r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(JWT ? { authorization: 'Bearer ' + JWT } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw err(typeof j.message === 'string' ? j.message[0].toUpperCase() + j.message.slice(1) : 'The route did not answer. Try again.', r.status === 404 ? 404 : 400);
  return j;
}

let cache = { at: 0, list: [], byId: new Map() };
export async function tokens() {
  if (Date.now() - cache.at < 60e3 && cache.list.length) return cache;
  try {
    const raw = await call('/v0/tokens');
    const list = raw.filter((t) => t.price > 0).map((t) => ({ id: t.assetId, symbol: t.symbol, chain: t.blockchain, chainName: CHAINS[t.blockchain] || t.blockchain.toUpperCase(), decimals: t.decimals, price: t.price }))
      .sort((a, b) => ((ORDER.indexOf(a.chain) + 1 || 99) - (ORDER.indexOf(b.chain) + 1 || 99)) || a.chainName.localeCompare(b.chainName) || (major(a) - major(b)) || a.symbol.localeCompare(b.symbol));
    cache = { at: Date.now(), list, byId: new Map(list.map((t) => [t.id, t])) };
  } catch (e) { if (!cache.list.length) throw e; }
  return cache;
}
const units = (amount, decimals) => { const [i, f = ''] = String(amount).trim().split('.'); if (!/^\d*$/.test(i) || !/^\d*$/.test(f) || !(i + f)) throw err('Enter an amount'); const n = BigInt(i + f.padEnd(decimals, '0').slice(0, decimals)); if (n <= 0n) throw err('Enter an amount'); return n.toString(); };

function request(from, to, amount, o) {
  const withAddr = o.recipient && o.refundTo;
  return { dry: !o.order, swapType: 'EXACT_INPUT', slippageTolerance: Math.min(500, Math.max(10, Number(o.slippage) || 100)), originAsset: from.id, depositType: 'ORIGIN_CHAIN', destinationAsset: to.id, amount: units(amount, from.decimals),
    ...(withAddr ? { refundTo: String(o.refundTo).trim(), refundType: 'ORIGIN_CHAIN', recipient: String(o.recipient).trim(), recipientType: 'DESTINATION_CHAIN' } : { refundTo: 'intents.near', refundType: 'INTENTS', recipient: 'intents.near', recipientType: 'INTENTS' }),
    deadline: new Date(Date.now() + 2 * 3600e3).toISOString(), ...(JWT ? { confidentiality: 'basic' } : {}), ...(FEE_TO ? { appFees: [{ recipient: FEE_TO, fee: FEE_BPS }] } : {}) };
}
const shape = (j, from, to) => ({ from: { symbol: from.symbol, chain: from.chainName }, to: { symbol: to.symbol, chain: to.chainName }, amountIn: j.quote.amountInFormatted, amountInUsd: Number(j.quote.amountInUsd), amountOut: j.quote.amountOutFormatted, amountOutUsd: Number(j.quote.amountOutUsd),
  minOut: (Number(j.quote.minAmountOut) / 10 ** to.decimals).toString(), seconds: j.quote.timeEstimate, confidential: j.quoteRequest?.confidentiality && j.quoteRequest.confidentiality !== 'public', feeBps: FEE_TO ? FEE_BPS : 0 });

export async function quote(o) {
  const { byId } = await tokens(), from = byId.get(o.from), to = byId.get(o.to);
  if (!from || !to) throw err('Pick the asset you send and the asset you receive'); if (from.id === to.id) throw err('Pick two different assets');
  return shape(await call('/v0/quote', request(from, to, o.amount, { ...o, order: false })), from, to);
}
export async function order(o) {
  const { byId } = await tokens(), from = byId.get(o.from), to = byId.get(o.to);
  if (!from || !to) throw err('Pick the asset you send and the asset you receive');
  if (!o.recipient) throw err('Enter the address that receives ' + to.symbol); if (!o.refundTo) throw err(`Enter a ${from.chainName} address for refunds`);
  const j = await call('/v0/quote', request(from, to, o.amount, { ...o, order: true }));
  if (!j.quote.depositAddress) throw err('No deposit address came back for this route. Try again.');
  return { ...shape(j, from, to), deposit: j.quote.depositAddress, memo: j.quote.depositMemo || '', expires: j.quote.deadline, recipient: j.quoteRequest.recipient, refundTo: j.quoteRequest.refundTo };
}
const STAGE = { PENDING_DEPOSIT: 'Waiting for your deposit', KNOWN_DEPOSIT_TX: 'Deposit seen', PROCESSING: 'Routing', SUCCESS: 'Delivered', INCOMPLETE_DEPOSIT: 'Deposit is short of the quoted amount', REFUNDED: 'Refunded', FAILED: 'Failed' };
export async function status(address, memo) {
  if (!/^[A-Za-z0-9:._-]{20,120}$/.test(address || '')) throw err('That is not a deposit address');
  const j = await call('/v0/status?depositAddress=' + encodeURIComponent(address) + (memo ? '&depositMemo=' + encodeURIComponent(memo) : '')), d = j.swapDetails || {}, q = j.quoteResponse || {};
  const { byId } = await tokens(), from = byId.get(q.quoteRequest?.originAsset), to = byId.get(q.quoteRequest?.destinationAsset);
  return { status: j.status, stage: STAGE[j.status] || j.status, done: ['SUCCESS', 'REFUNDED', 'FAILED'].includes(j.status), updated: j.updatedAt, from: from && { symbol: from.symbol, chain: from.chainName }, to: to && { symbol: to.symbol, chain: to.chainName },
    amountIn: q.quote?.amountInFormatted, amountOut: d.amountOutFormatted || q.quote?.amountOutFormatted, delivered: !!d.amountOutFormatted, refunded: d.refundedAmountFormatted !== '0' ? d.refundedAmountFormatted : '', expires: q.quote?.deadline,
    originTx: (d.originChainTxHashes || []).map((x) => x.hash), destinationTx: (d.destinationChainTxHashes || []).map((x) => x.hash) };
}
export const submit = (txHash, depositAddress) => call('/v0/deposit/submit', { txHash, depositAddress });
export const routeInfo = () => ({ confidential: !!JWT, feeBps: FEE_TO ? FEE_BPS : 0 });
