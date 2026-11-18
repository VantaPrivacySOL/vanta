// Solana by hand: base58, RPC, reading a deposit off the chain, and signing a plain SOL transfer.
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', B58I = Object.fromEntries([...B58].map((c, i) => [c, BigInt(i)]));
export function b58enc(bytes) { let n = 0n; for (const b of bytes) n = (n << 8n) | BigInt(b); let s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const b of bytes) { if (b === 0) s = '1' + s; else break; } return s; }
export function b58dec(str) { let n = 0n; for (const c of str) { const v = B58I[c]; if (v === undefined) throw new Error('not base58'); n = n * 58n + v; } const out = []; while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; } for (const c of str) { if (c === '1') out.unshift(0); else break; } return Uint8Array.from(out); }
export const isAddress = (s) => { try { return typeof s === 'string' && b58dec(s).length === 32; } catch { return false; } };
export const LAMPORTS = 1_000_000_000, SYSTEM = '11111111111111111111111111111111';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
export async function rpc(method, params = []) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
      if (r.status === 429) { last = new Error('Solana RPC is busy'); await new Promise((ok) => setTimeout(ok, 700 * (i + 1))); continue; }
      const j = await r.json(); if (j.error) throw new Error(j.error.message || 'RPC error'); return j.result;
    } catch (e) { last = e; }
  }
  throw last;
}

// What a confirmed transaction paid into `to`, in lamports. Null until the chain has it.
export async function paidInto(signature, to) {
  const tx = await rpc('getTransaction', [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]);
  if (!tx) return null;
  if (tx.meta?.err) return { failed: true };
  const keys = tx.transaction.message.accountKeys.map((k) => (typeof k === 'string' ? k : k.pubkey)), i = keys.indexOf(to);
  if (i < 0) return { lamports: 0 };
  return { lamports: tx.meta.postBalances[i] - tx.meta.preBalances[i], blockTime: tx.blockTime || 0 };
}

// ed25519 with node:crypto. A Solana secret key is 64 bytes: the seed, then the public key.
const PKCS8 = Buffer.from('302e020100300506032b657004220420', 'hex'), SPKI = Buffer.from('302a300506032b6570032100', 'hex');
export const publicKey = (raw32) => createPublicKey({ key: Buffer.concat([SPKI, Buffer.from(raw32)]), format: 'der', type: 'spki' });
export const verifySig = (raw32, message, signature) => { try { return verify(null, Buffer.from(message), publicKey(raw32), Buffer.from(signature)); } catch { return false; } };
export function signer(secretB58) {
  const raw = b58dec(secretB58); if (raw.length !== 64) throw new Error('POOL_SECRET must be a 64-byte base58 secret key');
  const key = createPrivateKey({ key: Buffer.concat([PKCS8, Buffer.from(raw.subarray(0, 32))]), format: 'der', type: 'pkcs8' });
  return { address: b58enc(raw.subarray(32)), sign: (message) => sign(null, Buffer.from(message), key) };
}

const u64 = (v) => { let n = BigInt(v); const o = new Uint8Array(8); for (let i = 0; i < 8; i++) { o[i] = Number(n & 255n); n >>= 8n; } return o; };
const cat = (...p) => { const o = new Uint8Array(p.reduce((s, x) => s + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
// One SystemProgram.transfer in a legacy message: payer and recipient writable, the system program read-only.
export function transferMessage(from, to, blockhash, lamports) {
  return cat(Uint8Array.of(1, 0, 1, 3), b58dec(from), b58dec(to), b58dec(SYSTEM), b58dec(blockhash), Uint8Array.of(1, 2, 2, 0, 1, 12, 2, 0, 0, 0), u64(lamports));
}
export async function sendSol(pool, to, lamports) {
  const { blockhash } = (await rpc('getLatestBlockhash', [{ commitment: 'finalized' }])).value;
  const message = transferMessage(pool.address, to, blockhash, lamports), tx = cat(Uint8Array.of(1), pool.sign(message), message);
  return rpc('sendTransaction', [Buffer.from(tx).toString('base64'), { encoding: 'base64', preflightCommitment: 'confirmed' }]);
}
