# Changelog

All notable changes to VANTA are listed here. Versions follow [Semantic Versioning](https://semver.org).

## [Unreleased]

## [0.1.0] - 2026-11-21

First public release.

### Added

- **Swap.** Cross-chain swaps over NEAR Intents 1Click: live quotes, a one-time deposit address and order tracking, with no wallet connection.
- **Pool.** Shielded SOL balances under an ed25519 key made in the browser. Every request is signed. Deposits are read from Solana and credited once, sends between accounts are instant and free, and withdrawals leave after a random wait.
- **Launchpad.** Tokens launch and trade from shielded balances on a constant-product curve, with half of every trading fee paid to the creator.
- **Sealed openings.** Orders collect for 1, 5 or 15 minutes with the price hidden, then fill together at one clearing price.
- **Docs.** Every rule and fee, written down.

[Unreleased]: https://github.com/VantaPrivacySOL/vanta/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/VantaPrivacySOL/vanta/releases/tag/v0.1.0
