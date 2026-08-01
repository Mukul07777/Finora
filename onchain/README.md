# Finora on-chain — AgentWallet

A session-key smart wallet for an autonomous agent. The agent holds a
session key (never the owner key) and can only move funds within an
owner-defined policy — everything is enforced by the EVM, not by the
agent's own cooperation.

Enforced on-chain, independent of the agent:

- **Per-transaction spend cap**
- **Rolling daily spend cap**
- **Counterparty allowlist** (re-checked at execution time, not just proposal time)
- **Owner-only kill switch** (`pause` / `unpause`) — blocks every spend path instantly
- **In-flight revocation** — a payment proposed via `proposePayment()` can still be
  killed by `pause()` before its matching `executePayment()` runs, even though the
  first step already succeeded on-chain

## Layout

```
onchain/
  contracts/AgentWallet.sol   the contract
  test/AgentWallet.test.ts    17 tests covering every rule above
  scripts/deploy.ts           deploy + seed a demo policy/allowlist/deposit
  scripts/attackAgent.ts      scripted attack narration — every attempt to
                               break policy, run against a real EVM
```

## Run it yourself

```bash
cd onchain
npm install
npm test              # 17 passing — every enforcement rule, proven
npm run demo:attack   # scripted attack agent vs. the contract, live reverts
```

`demo:attack` deploys a fresh instance to an in-memory Hardhat chain and
narrates: a normal allowlisted payment succeeding, a payment to an unlisted
address reverting, a payment over the per-tx cap reverting, split payments
hitting the daily cap, and — the interesting one — the owner freezing the
agent *between* `proposePayment()` and `executePayment()`, proving the
pending payment cannot complete once frozen.

## Deploying to a public testnet (Base Sepolia)

This step needs a **funded burner wallet** — never a wallet holding real
funds.

1. Generate a fresh wallet (e.g. a new MetaMask account) and export its
   private key.
2. Fund it with testnet ETH from a Base Sepolia faucet.
3. `cp .env.example .env` and fill in `DEPLOYER_PRIVATE_KEY` (and optionally
   `AGENT_ADDRESS` — a second address to act as the agent's session key).
4. `npm run deploy:baseSepolia`
5. Verify on Basescan: `npx hardhat verify --network baseSepolia <address> <agent> <perTxLimit> <dailyLimit>`

The deployed address is what the frontend's live console would point at in
production (`NEXT_PUBLIC_AGENT_WALLET_ADDRESS`) — the console currently runs
a frontend simulation of this exact state machine so the demo doesn't
depend on testnet uptime or gas funds during judging.
