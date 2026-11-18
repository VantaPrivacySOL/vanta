# VANTA

Private swaps, shielded SOL balances and a private launchpad on Solana. One Node.js process, no dependencies.

- **Swap.** A terminal on NEAR Intents 1Click: live quote, a one-time deposit address, tracking. No wallet connection and no account.
- **Pool.** Shielded SOL balances. An account is an ed25519 key made in the browser; every request is signed with it. Deposits are read from Solana and credited once; sends between accounts never touch a chain; withdrawals leave after a random wait.
- **Launchpad.** Tokens launch and trade from shielded balances on a constant-product curve. Sealed openings collect orders and fill them together at one price. The tape shows amounts, never accounts.

## Run it

```bash
npm start     # http://localhost:8302
npm test      # 40 end-to-end checks against a throwaway node
```

Node 22 or newer.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8302` | HTTP port |
| `DATA_PATH` | `./vanta.json` | The ledger. Put it on a persistent disk |
| `TREASURY` | empty | The pool's Solana address. Deposits open when it is set |
| `POOL_SECRET` | empty | The pool's base58 secret key. When set, the node pays withdrawals itself and `TREASURY` is derived from it |
| `ADMIN_KEY` | empty | Enables `/api/admin/queue` and `/api/admin/paid` for settling withdrawals by hand |
| `RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC |
| `ONECLICK_JWT` | empty | NEAR Intents partner token. When set, swaps request confidential handling |
| `FEE_RECIPIENT`, `FEE_BPS` | empty, `40` | NEAR account that receives the swap partner fee, and its size |
| `SITE_URL`, `X_URL`, `GH_URL` | empty | Links shown on the site |
| `TOKEN_MINT` | empty | The $VANTA mint, shown on the home page once it exists |

## Layout

| Path | What it is |
|---|---|
| `server/sol.js` | Solana by hand: base58, RPC, reading a deposit, signing a transfer |
| `server/engine.js` | The pool ledger, withdrawals, and the launchpad curve |
| `server/swap.js` | Quotes, orders and tracking over 1Click |
| `server/index.js` | HTTP routes and the static site |
| `client/` | Home, swap, pool, launch and docs pages |
| `test/run.js` | The test suite |

## License

MIT
