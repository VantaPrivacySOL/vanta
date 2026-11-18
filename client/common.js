// Shared by every page: the nav and footer, the account key that stays in this browser, and signed requests.
export const X_URL = '{{X_URL}}', GH_URL = '{{GH_URL}}', TOKEN_MINT = '{{TOKEN_MINT}}';
export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const LAMPORTS = 1e9;
export const sol = (lamports, dp = 4) => (lamports / LAMPORTS).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp });
export const num = (n, dp = 2) => Number(n).toLocaleString('en-US', { maximumFractionDigits: dp });
export const compact = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : num(n, 2));
export const ago = (t) => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? Math.floor(s) + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; };
export const short = (s, a = 6, b = 4) => (s && s.length > a + b + 2 ? s.slice(0, a) + '…' + s.slice(-b) : s);

const XI = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 1.2h3.7l-8 9.2 9.4 12.4h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L.1 1.2h7.6l5.2 6.9 6-6.9Zm-1.3 19.4h2L6.5 3.3H4.3l13.3 17.3Z"/></svg>';
const GI = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>';
const NAV = [['/swap', 'Swap'], ['/pool', 'Pool'], ['/launch', 'Launch'], ['/docs', 'Docs']];
export function chrome(active) {
  const h = document.createElement('header'); h.className = 'top';
  h.innerHTML = `<a class="mark" href="/" aria-label="VANTA home"><i></i><span>VANTA</span></a><nav>${NAV.map(([u, l]) => `<a href="${u}" class="${active === u ? 'on' : ''}">${l}</a>`).join('')}${X_URL ? `<a class="ico" href="${X_URL}" target="_blank" rel="noopener" aria-label="VANTA on X">${XI}</a>` : ''}${GH_URL ? `<a class="ico" href="${GH_URL}" target="_blank" rel="noopener" aria-label="VANTA on GitHub">${GI}</a>` : ''}</nav>`;
  document.body.prepend(h);
  const f = document.createElement('footer'); f.className = 'end';
  f.innerHTML = `<div class="wrap plq"><span><b>VANTA</b>, 2026. Private swaps, shielded balances, private launches. Solana.</span><nav>${NAV.map(([u, l]) => `<a href="${u}">${l}</a>`).join('')}${X_URL ? `<a href="${X_URL}" target="_blank" rel="noopener">X</a>` : ''}${GH_URL ? `<a href="${GH_URL}" target="_blank" rel="noopener">GitHub</a>` : ''}</nav></div>`;
  document.body.append(f);
  const t = document.createElement('div'); t.id = 'toast'; document.body.append(t);
}
let tt; export function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
export async function copy(text, what = 'Copied') { try { await navigator.clipboard.writeText(text); toast(what); } catch { toast('Copy failed. Select it by hand.'); } }
document.addEventListener('click', (e) => { const c = e.target.closest('[data-copy]'); if (c) copy(c.dataset.copy, c.dataset.said || 'Copied'); });

export async function get(path) { const r = await fetch(path), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed'); return j; }
export async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed'); return j; }

// ---- the account: an ed25519 key made here, kept here ----
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function b58enc(bytes) { let n = 0n; for (const b of bytes) n = (n << 8n) | BigInt(b); let s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const b of bytes) { if (b === 0) s = '1' + s; else break; } return s; }
const hex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join(''), unhex = (s) => Uint8Array.from(s.match(/../g).map((x) => parseInt(x, 16)));
const PKCS8 = unhex('302e020100300506032b657004220420'), b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
let me = null;
async function load(seedHex) {
  const der = new Uint8Array(48); der.set(PKCS8); der.set(unhex(seedHex), 16);
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, true, ['sign']), jwk = await crypto.subtle.exportKey('jwk', key);
  return { seed: seedHex, key, id: 'vn_' + b58enc(b64u(jwk.x)) };
}
export const hasAccount = () => !!localStorage.getItem('vanta_key');
export async function account() { if (me) return me; const s = localStorage.getItem('vanta_key'); if (!s) return null; try { me = await load(s); } catch { me = null; } return me; }
export async function createAccount() { const s = hex(crypto.getRandomValues(new Uint8Array(32))); me = await load(s); localStorage.setItem('vanta_key', s); return me; }
export async function restoreAccount(text) { const s = String(text).trim().toLowerCase().replace(/^vanta-/, ''); if (!/^[0-9a-f]{64}$/.test(s)) throw new Error('A recovery key is 64 characters, 0-9 and a-f'); me = await load(s); localStorage.setItem('vanta_key', s); return me; }
export function lock() { localStorage.removeItem('vanta_key'); me = null; }
let last = 0;
export async function signed(path, body = {}) {
  const a = await account(); if (!a) throw new Error('Create your account first');
  const raw = JSON.stringify(body), ts = (last = Math.max(last + 1, Date.now())), sig = new Uint8Array(await crypto.subtle.sign('Ed25519', a.key, new TextEncoder().encode(`vanta:${path}:${ts}:${raw}`)));
  return post(path, { acct: a.id, ts, sig: b58enc(sig), body: raw });
}
// The gate every pool and launch page shares: make a key, or bring one back.
export function gate(el, done) {
  el.innerHTML = `<p class="lbl">Your account</p><p style="font:600 26px/1.15 var(--disp);margin:10px 0 8px">A key made in this browser. No wallet, no email.</p><p class="lbl" style="line-height:1.7;text-transform:none;letter-spacing:0;font-size:12px">It signs every request. It never leaves this device, so save the recovery key it gives you.</p><hr><button class="btn on" id="gNew">Create account</button><p class="lbl" style="margin:18px 0 4px">or restore</p><input id="gKey" placeholder="recovery key" autocomplete="off" spellcheck="false"><button class="btn line" id="gRes" style="margin-top:12px;width:100%">Restore</button><p class="err" id="gErr"></p>`;
  const fail = (e) => { el.querySelector('#gErr').textContent = /Ed25519|not supported|Unrecognized/i.test(e.message) ? 'This browser cannot make the key. Update it, or use a current Chrome, Safari or Firefox.' : e.message; };
  el.querySelector('#gNew').onclick = () => createAccount().then(done, fail);
  el.querySelector('#gRes').onclick = () => restoreAccount(el.querySelector('#gKey').value).then(done, fail);
}
