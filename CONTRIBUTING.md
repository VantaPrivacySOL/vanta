# Contributing

Thanks for looking. VANTA is one Node.js program with no dependencies.

## Getting set up

```bash
git clone https://github.com/VantaPrivacySOL/vanta
cd vanta
npm start            # http://localhost:8302
npm test             # 40 end-to-end checks against a throwaway node
```

Node 22 or newer.

## Where things live

- `server/sol.js` is Solana by hand: base58, RPC, reading a deposit, signing a transfer.
- `server/engine.js` is the pool ledger, the withdrawal queue and the launchpad curve.
- `server/swap.js` is quotes, orders and tracking over NEAR Intents 1Click.
- `server/index.js` is the HTTP routes and the static site.
- `client/` is the site: one HTML file per page, a shared `vanta.css` and `common.js`.
- `test/run.js` is the end-to-end suite.

## Making a change

1. Branch from `dev`.
2. Keep the change small and add a test that fails without it.
3. Run the tests.
4. Open a pull request against `dev`, and say which tests you ran.

Security issues go through [private reporting](https://github.com/VantaPrivacySOL/vanta/security/advisories/new), not pull requests.
