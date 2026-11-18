// VANTA X kit: writes brand/X-KIT.md and fails if any tweet is over 245 characters.  node _studio/tweets.cjs
'use strict';
const fs = require('fs'), path = require('path'), { X, SITE, CA } = require('./lib.cjs');
const len = (s) => [...s].length, URL = SITE ? 'https://' + SITE : '', L = URL ? '\n\n' + URL : '';
const NAME = 'VANTA | $VANTA';
const BIO = 'Private swaps. Shielded SOL. The first private launchpad. No wallet connection, no trail. Nothing reflects. $VANTA';
const DEX = 'VANTA is a privacy terminal on Solana with three products. Swap: cross-chain swaps over NEAR Intents across 39 chains, with a live quote, a one-time deposit address and no wallet connection. Pool: shielded SOL balances held under a key made in your browser, with free instant sends between accounts that never touch a chain and withdrawals that leave after a random wait. Launchpad: tokens launch and trade from shielded balances on a bonding curve, so there is no deployer wallet and no buyer list, and every launch can open sealed so all early orders fill at one price. $VANTA is the token of the protocol.';
// [title, media, text]. Market caps: CoinGecko, 18 Nov 2026.
const T = [
  ['Pinned (video)', 'vanta-hype-12s.mp4', `VANTA is a private swap and a private launchpad on Solana.

Private swap: 39 chains, no wallet connection.

Private launchpad: no deployer wallet, no buyer list.

What you do with your money is nobody's business.${L}

$VANTA`],
  ['Key art', 'vanta-g01-keyart.png', `VANTA.

Nothing reflects.

$VANTA`],
  ['The stack (video)', 'vanta-stack-12s.mp4', `One protocol, three ways to vanish:

01 Shielded SOL balances
02 Private swaps across 39 chains
03 The first private launchpad

All three are running today.

$VANTA`],
  ['Privacy market', 'vanta-g07-mcap.png', `Zcash: $15.7B market cap.
Monero: $9.2B.

$25 billion says people will pay to not be watched.

Neither one lets you launch a token.

VANTA does.

$VANTA`],
  ['Swap', 'vanta-g03-swap.png', `Swapped on VANTA and never connected a wallet.

Pick the route. Send one exact amount to a one-time address. It lands on the other chain.

39 chains. Zero popups asking to "connect".

$VANTA`],
  ['Pool', 'vanta-g04-pool.png', `Put SOL in the pool and it stops being a number strangers can look up.

Send it to another account: instant, free, nothing written to Solana.

Take it out to a wallet that never met the first one.

$VANTA`],
  ['Launchpad', 'vanta-g05-launch.png', `Every launch you've ever aped had a dev wallet you could watch.

On VANTA there isn't one.

No deployer wallet. No buyer list. No holder names. Just the chart.

The first private launchpad.

$VANTA`],
  ['Sealed opening', 'vanta-g06-sealed.png', `Snipers win because they're first.

On VANTA nobody is first.

Launches open sealed: every order in the window fills at one price. The bot gets exactly what you get.

$VANTA`],
  ['Launchpad market', 'vanta-g08-pump.png', `pump.fun: $1.17B market cap.

Every deployer, every bundle, every buyer on it is public forever.

The private version of that didn't exist.

Now it does.

$VANTA`],
  ['Predecessors (video)', 'vanta-mcap-12s.mp4', `Railgun is a shielded pool: $94.6M market cap.
Tornado Cash is a mixer: $18.9M.

VANTA is a shielded pool, a cross-chain swap and a launchpad in one.

It just arrived.

$VANTA`],
  ['Clarity', 'vanta-g09-seen.png', `What a chain sees on VANTA: money going in, money coming out.

What it never sees: your balance, who you sent to, what you launched, what you bought.

The middle is yours.

$VANTA`],
  ['Launch day, paste the CA', 'vanta-g10-live.png', `$VANTA is live.

Private swaps. Shielded SOL. The first private launchpad.

CA: ${CA || '<paste the contract address>'}${L}`],
];
let bad = 0; const out = [`# VANTA X kit\n`, `Handle: ${X || '(not set)'}  ·  Site: ${URL || '(not set)'}\n`, '## Profile\n', 'Display name\n```\n' + NAME + '\n```\n', `Bio (${len(BIO)})\n` + '```\n' + BIO + '\n```\n', 'DexScreener description\n```\n' + DEX + '\n```\n', '## Tweets\n'];
T.forEach(([t, m, s], i) => { const n = len(s.replace('<paste the contract address>', 'x'.repeat(44))); if (n > 245) { bad++; console.log('TOO LONG', i + 1, n); } out.push(`${i + 1}. ${t} · \`${m}\` · ${n} chars\n` + '```\n' + s + '\n```\n'); });
if (len(BIO) > 160) { bad++; console.log('BIO TOO LONG', len(BIO)); }
fs.writeFileSync(path.join(__dirname, '..', 'brand', 'X-KIT.md'), out.join('\n'));
console.log(bad ? 'FAILED' : `${T.length} tweets ok, longest ${Math.max(...T.map((x) => len(x[2])))}, bio ${len(BIO)}`); process.exit(bad ? 1 : 0);
