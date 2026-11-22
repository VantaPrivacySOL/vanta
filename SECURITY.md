# Security

VANTA holds balances, so the code that matters most is the path that moves them: the signature check on every pool and launchpad request, the deposit reader, and the withdrawal queue. All of it lives in `server/engine.js` and `server/sol.js`.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository: [report a vulnerability](https://github.com/VantaPrivacySOL/vanta/security/advisories/new). Include the steps to reproduce and what you observed. Please do not open a public issue for anything in the list below.

You will get an acknowledgement within 72 hours and a fix or a written assessment within 14 days.

## In scope

- Moving, crediting or withdrawing a shielded balance without a valid signature from the account's key
- Crediting one Solana deposit more than once, or crediting a transfer that did not reach the pool
- Replaying a signed request
- Learning which account launched, bought or holds a token from any public endpoint
- Filling a sealed opening at anything other than one clearing price
- Stopping the node or corrupting the ledger from the public API

## Supported versions

The `main` branch and the latest release.
