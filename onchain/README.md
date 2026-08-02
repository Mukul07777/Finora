# Finora on-chain

Three contracts that make credit for an autonomous agent both *possible*
and *safe*, with every guarantee enforced by the EVM rather than the
agent's cooperation:

- **`AgentWallet.sol`** — a session-key smart wallet: spend caps, allowlist,
  kill switch, in-flight revocation, plus EIP-712 delegated spend grants,
  guardian freeze roles, an automated circuit breaker, and a dead-man switch.
- **`CreditLine.sol`** — undercollateralized working capital with **repayment
  skimmed at source**: task revenue routes through the contract and
  outstanding debt is deducted before the agent can touch a wei. A
  reputation-scaled, slashable bond posted by the agent's principal is the
  collateral substitute.
- **`ReputationRegistry.sol`** — portable, on-chain reputation keyed to the
  agent's identity, readable by any lender, with principal-inheritance to
  solve cold-start.

## AgentWallet — session-key smart wallet

The agent holds a session key (never the owner key) and can only move funds
within an owner-defined policy — everything is enforced by the EVM, not by
the agent's own cooperation.

Enforced on-chain, independent of the agent:

- **Per-transaction spend cap**
- **Rolling daily spend cap**
- **Counterparty allowlist** (re-checked at execution time, not just proposal time)
- **Owner-only kill switch** (`pause` / `unpause`) — blocks every spend path instantly
- **In-flight revocation** — a payment proposed via `proposePayment()` can still be
  killed by `pause()` before its matching `executePayment()` runs, even though the
  first step already succeeded on-chain
- **Reentrancy guard** on every value-moving function (`directPay`, `executePayment`,
  `withdraw`) — belt-and-suspenders on top of checks-effects-interactions ordering
- **Two-step ownership transfer** (`transferOwnership` / `acceptOwnership`) — a typo'd
  or unreachable new owner can't strand the kill switch; the old owner stays fully in
  control until the new one actively accepts
- **Zero-address guard** on payment destinations, agent assignment, and ownership transfer

## Layout

```
onchain/
  contracts/AgentWallet.sol            the contract
  contracts/test-helpers/              malicious contracts used only to prove attacks fail
  test/AgentWallet.test.ts             24 tests covering every rule above
  scripts/deploy.ts                    deploy + seed a demo policy/allowlist/deposit
  scripts/attackAgent.ts               scripted attack narration — every attempt to
                                        break policy, run against a real EVM
```

## Run it yourself

```bash
cd onchain
npm install
npm test              # 67 passing — every enforcement rule, proven
npm run demo:attack   # scripted attack agent vs. AgentWallet, live reverts
npm run demo:redteam  # adversarial demo: enforced repayment, EIP-712 grants,
                      # guardians, circuit breaker, dead-man switch
```

`demo:attack` deploys a fresh instance to an in-memory Hardhat chain and
narrates: a normal allowlisted payment succeeding, a payment to an unlisted
address reverting, a payment over the per-tx cap reverting, split payments
hitting the daily cap, and — the interesting one — the owner freezing the
agent *between* `proposePayment()` and `executePayment()`, proving the
pending payment cannot complete once frozen.

## Deliberately out of scope: EIP-712 / nonce-based replay protection

The agent calls `directPay` / `proposePayment` / `executePayment` directly,
as `msg.sender == agent` — there's no meta-transaction relayer and no
off-chain-signed payload for anyone to replay. Replay protection matters
when a *signature* authorizes an action that a third party then relays;
here the transaction itself is the authorization, submitted by the session
key. The actual trust boundary is the session key, and it's already
revocable in one owner transaction (`setAgent`, or the blanket `pause`).

Adding EIP-712 signed intents would matter if a future version lets the
agent construct payments off-chain for a relayer to submit gaslessly —
that's a real feature, not a hardening gap in the current design, so it's
left for a later phase rather than bolted on here.

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
