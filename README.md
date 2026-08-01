# Finora — the financial OS for autonomous agents

Fintech track submission for Innova Hack Chapter-1. Finora gives AI agents
a verifiable identity, a real-time reputation score, dynamically
underwritten credit, and a wallet-layer kill switch that works even when
the agent doesn't cooperate.

## What's here

- **`/` (this folder)** — the Next.js marketing site + interactive console
  (Home, Live Console, Security, Pricing, Docs, About).
- **`/onchain`** — the real enforcement layer: a Solidity smart wallet
  (`AgentWallet.sol`) enforcing per-tx limits, a rolling daily cap, a
  counterparty allowlist, an owner kill switch, and in-flight revocation —
  with a 17-test suite and a scripted attack-agent demo. See
  [`onchain/README.md`](onchain/README.md).

## Running the site

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running the on-chain layer

```bash
cd onchain
npm install
npm test              # 17 passing
npm run demo:attack   # scripted attack agent vs. the contract, live reverts
```
