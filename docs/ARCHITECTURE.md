# Finora — Architecture & Stack

_Last updated: 2026-08-02_

Finora is a financial operating system for autonomous AI agents: verifiable
identity, portable reputation, dynamically underwritten credit, and spend
control enforced **outside** the agent's own logic. This document is the
single reference for what the project is built with and how the pieces fit.

---

## 1. Technology stack

### Frontend / app
| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Components) |
| UI runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-variable theme, dark default + light) |
| Animation | Framer Motion 12 |
| Icons | lucide-react |
| Charts (where used) | inline SVG + Recharts |

### On-chain
| Concern | Technology |
|---|---|
| Contracts | Solidity 0.8.26 |
| Dev/test framework | Hardhat |
| Client library | ethers v6 |
| Type bindings | TypeChain |
| Target network | Base Sepolia (testnet) |
| Signatures | EIP-712 typed-data (delegated grants, completion attestations) |

### Intelligence / off-chain services
| Concern | Technology |
|---|---|
| Optional LLM agent + policy normalization | Groq (`llama-3.1-8b-instant`), server-side only |
| Behavioral underwriting | pure TypeScript scorer over telemetry events |
| Planned persistence / accounts | Supabase (Postgres, Auth, Row-Level Security, Realtime) |

### Testing / quality
| Concern | Technology |
|---|---|
| Contract tests | Mocha + Chai via Hardhat (67 passing) |
| Frontend unit tests | Vitest (pure reducer/scoring) |
| Type safety | `tsc --noEmit` |
| Lint | ESLint (next config) |

---

## 2. Smart contracts (the money truth)

| Contract | Responsibility |
|---|---|
| `AgentWallet.sol` | Session-key smart wallet. Per-tx & rolling daily caps, counterparty allowlist, owner kill switch, in-flight revocation, reentrancy guard, two-step ownership transfer, EIP-712 delegated spend grants, guardian freeze roles, automated circuit breaker, dead-man switch. |
| `CreditLine.sol` | Undercollateralized working capital. Reputation-scaled limit, principal-posted slashable bond, **repayment skimmed at source** (revenue is deducted before the agent can withdraw), default handling. |
| `ReputationRegistry.sol` | Portable on-chain reputation keyed to agent identity. Reporter-gated writes, principal-inheritance for cold-start, bond-ratio curve (trust substitutes for capital). |
| `SettlementEscrow.sol` | Trustless revenue capture. Customer pays an escrow bound to the credit line; release only ever routes into the line's skim, so the agent has no address to redirect income to. |

Demos (`npm run demo:*`): `attack`, `redteam`, `peer`.

---

## 3. Frontend architecture

```
src/
  app/                 routes: /, /console, /security, /pricing, /docs, /about
    api/agent/decide   server route → Groq (LLM autopilot decision)
    api/policy/compile server route → Groq-normalized → deterministic policy compiler
  lib/finora/
    reducer.ts         pure state machine (single source of truth for the demo)
    FinoraProvider.tsx useReducer store + async action coordinator
    adapter.ts         FinoraAdapter seam (simulation today, on-chain/Supabase next)
    scoring.ts         credit terms, velocity risk, bond ratio (pure)
    telemetry.ts       behavioral underwriting scorer (pure)
    sampleTelemetry.ts deterministic telemetry log → derived starting score
    policyCompiler.ts  natural-language → structured policy ops (pure)
  components/console/   live console + phone app (two views of one provider)
```

Key design seam: **`FinoraAdapter`**. The reducer and components never call a
backend directly — they go through the adapter. Today it's `simulationAdapter`
(timers + deterministic seed). Swapping to a real backend (contracts + Supabase)
means writing a new adapter, not rewriting the UI.

---

## 4. Data model — where each fact lives

Two sources of truth, deliberately:

| Data | Source of truth | Why |
|---|---|---|
| Balances, drawdowns, repayment, defaults | **Contracts (Base Sepolia)** | Money must be enforced by the EVM, not a database |
| Reputation score writes | **`ReputationRegistry.sol`** | Portable, reporter-gated, tamper-evident |
| User accounts / auth / wallet linking | **Supabase** | Off-chain identity, sessions, RLS |
| Agent telemetry (task success, spend, violations) | **Supabase** | Feeds underwriting; too high-volume/private for chain |
| Indexed contract events (for fast reads) | **Supabase** (cache of chain) | Chain is slow to query; index for the UI |
| Collusion / payment graph | **Supabase** (derived) | Graph analysis over indexed payment edges |

Principle: **on-chain for what must be trustless; Supabase for what must be fast, private, or account-scoped.** No random/simulated values in production paths — every number is either an on-chain read or a computed function of stored rows.

### Planned Supabase schema (draft)
```
accounts(id, wallet_address, email, created_at)
agents(id, owner_account, did, session_key_address, created_at)
telemetry(id, agent_id, kind, amount, at)         -- feeds scoring.ts
events(id, tx_hash, contract, name, args_jsonb, block_time)  -- indexed chain events
credit_lines(id, agent_id, contract_address, base_limit, apr_bps)
payments(id, from_agent, to_party, amount, tx_hash, at)  -- collusion graph edges
```
Row-Level Security: an account can read/write only its own agents, telemetry, and lines.

---

## 5. Secrets & configuration

Never committed. All in `.env.local` (gitignored):

```
GROQ_API_KEY=                         # server-only, LLM
NEXT_PUBLIC_SUPABASE_URL=             # safe client-side
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # safe client-side, guarded by RLS
SUPABASE_SERVICE_ROLE_KEY=            # server-only, NEVER client, NEVER committed
DEPLOYER_PRIVATE_KEY=                 # burner wallet only, for testnet deploy
NEXT_PUBLIC_AGENT_WALLET_ADDRESS=     # set after deploy
NEXT_PUBLIC_CREDIT_LINE_ADDRESS=
NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=
NEXT_PUBLIC_SETTLEMENT_ESCROW_ADDRESS=
```

---

## 6. Roadmap (next integrations)

1. Deploy the four contracts to Base Sepolia; link Basescan.
2. Supabase: accounts + auth (wallet sign-in), telemetry + events tables, RLS.
3. Event indexer → Supabase `events`/`payments`, seeded deterministically so the demo is always populated.
4. On-chain `FinoraAdapter` so the console reads live contract + Supabase state instead of simulation.
5. Collusion / wash-trading detector over the `payments` graph, surfaced as a reputation-authenticity score.
