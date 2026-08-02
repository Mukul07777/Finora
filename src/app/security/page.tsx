import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { Metrics } from "@/components/Metrics";
import { Architecture } from "@/components/Architecture";
import { CTA } from "@/components/CTA";
import { ShieldCheck, Lock, Radio, GitBranch, Coins } from "lucide-react";
import { OnchainStatus } from "@/components/OnchainStatus";
import { LiveOnchainState } from "@/components/LiveOnchainState";
import { LiveTransactionProof } from "@/components/LiveTransactionProof";

export const metadata: Metadata = {
  title: "Security & Trust — Finora",
  description:
    "How Finora enforces credit and spend policy independent of the agent, and what ships next on-chain.",
};

const THREATS = [
  {
    icon: Lock,
    title: "Compromised agent logic",
    body: "A jailbroken or prompt-injected agent tries to pay an unlisted party or exceed its cap. Mitigated: policy checks run at the wallet layer, outside the agent's reasoning — there is no path from 'the agent decided to' to 'the transaction executed'.",
  },
  {
    icon: Radio,
    title: "Slow-drip overspend",
    body: "An agent stays inside limits per-transaction but drains the line through many small payments. Mitigated: rolling-window spend caps and velocity-based anomaly scoring catch pattern abuse, not just single-transaction breaches.",
  },
  {
    icon: ShieldCheck,
    title: "Owner needs to act now",
    body: "A human notices something wrong and needs to stop the agent immediately, without waiting on support tickets or dispute processes. Mitigated: the kill switch is a single owner-signed action that freezes future and in-flight steps instantly — and guardians or an automated circuit breaker can trip it too, so it doesn't hinge on one key.",
  },
  {
    icon: Coins,
    title: "Agent takes the money and runs",
    body: "The agent borrows working capital, earns revenue, and simply never repays. Mitigated: repayment is skimmed at source — task revenue routes through CreditLine.sol and outstanding debt is deducted before the agent can withdraw a cent. It never controls the gross, so it can't route around repayment.",
  },
];

export default function SecurityPage() {
  return (
    <div className="pt-10">
      <Section
        eyebrow="Security & trust"
        title="Designed to survive the hard questions"
        description="This page exists because 'trust me' isn't a security model. Here's the threat model, the enforcement architecture, and what's still on the roadmap."
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {THREATS.map((t) => (
            <div key={t.title} className="card-hover card-premium rounded-2xl p-6">
              <div className="icon-badge mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-accent">
                <t.icon size={19} strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">{t.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{t.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Deployed, not just described"
        title="The contracts live on a public testnet"
        description="Not an in-memory demo — the enforcement layer is deployed to Ethereum Sepolia, verified, and inspectable. Click through to the source, state, and every transaction."
      >
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <OnchainStatus />
          <LiveOnchainState />
        </div>
      </Section>

      <Architecture />
      <Metrics />

      <Section
        eyebrow="Shipped, not just described"
        title="The on-chain enforcement layer is real code"
        description="AgentWallet.sol is a working Solidity contract with a 24-test suite and a scripted attack agent — not a diagram. It lives in this repo's /onchain folder."
      >
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="card-premium rounded-2xl p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="icon-badge flex h-11 w-11 items-center justify-center rounded-xl text-accent-2">
                <GitBranch size={19} strokeWidth={1.75} />
              </span>
              <h3 className="font-display text-base font-semibold text-foreground">
                AgentWallet.sol — session-key smart wallet
              </h3>
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-muted">
              <li>
                <span className="font-medium text-foreground">Session key, not owner key</span> —
                the agent address is a settable, revocable session key. It can never call the
                owner-only functions (policy, allowlist, pause, withdraw).
              </li>
              <li>
                <span className="font-medium text-foreground">On-chain policy checks</span> — per-tx
                cap, rolling daily cap, and allowlist are each a custom-error revert inside the
                contract (<code className="font-mono text-foreground">ExceedsPerTxLimit</code>,{" "}
                <code className="font-mono text-foreground">ExceedsDailyLimit</code>,{" "}
                <code className="font-mono text-foreground">NotAllowlisted</code>) — not application
                logic that depends on a backend staying honest.
              </li>
              <li>
                <span className="font-medium text-foreground">Real in-flight revocation</span> —
                <code className="font-mono text-foreground"> proposePayment()</code> and{" "}
                <code className="font-mono text-foreground">executePayment()</code> are separate
                transactions. A test proves that calling{" "}
                <code className="font-mono text-foreground">pause()</code> between them makes the
                second step revert, even though the first step already succeeded on-chain.
              </li>
              <li>
                <span className="font-medium text-foreground">Reentrancy-guarded</span> — every
                value-moving function (<code className="font-mono text-foreground">directPay</code>,{" "}
                <code className="font-mono text-foreground">executePayment</code>,{" "}
                <code className="font-mono text-foreground">withdraw</code>) is protected by a{" "}
                <code className="font-mono text-foreground">nonReentrant</code> guard, proven by a
                test that deploys a hostile agent contract and watches its re-entry attempt revert.
              </li>
              <li>
                <span className="font-medium text-foreground">Two-step ownership transfer</span> —
                <code className="font-mono text-foreground"> transferOwnership()</code> /{" "}
                <code className="font-mono text-foreground">acceptOwnership()</code> means a mistyped
                or unreachable new owner can never strand the kill switch.
              </li>
              <li>
                <span className="font-medium text-foreground">EIP-712 delegated spend grants</span> —
                the owner signs a scoped, expiring capability off-chain (
                <code className="font-mono text-foreground">payWithGrant</code>); the contract
                recovers the signer and only pays if it&apos;s the current owner. The agent&apos;s
                authority is a verifiable cryptographic delegation, not a bare address — and grants
                are single-use (nonce) and still bounded by the per-tx cap.
              </li>
              <li>
                <span className="font-medium text-foreground">Guardians &amp; automated circuit
                breaker</span> — guardians can trip the kill switch but can never withdraw, and a
                designated monitor can freeze the agent on anomalous velocity (
                <code className="font-mono text-foreground">tripBreaker</code>) with no human in the
                loop. Monitoring that acts, not just observes.
              </li>
              <li>
                <span className="font-medium text-foreground">Dead-man switch</span> — if the owner
                stops sending heartbeats, agent spend authority auto-expires (
                <code className="font-mono text-foreground">AgentExpired</code>), so an abandoned
                owner can&apos;t leave an agent spending forever.
              </li>
              <li>
                <span className="font-medium text-foreground">67/67 tests passing</span> — ownership,
                payments, kill switch, in-flight revocation, reentrancy, delegation, guardians,
                dead-man switch, and the full credit lifecycle are covered across{" "}
                <code className="font-mono text-foreground">onchain/test/</code>.
              </li>
            </ul>
          </div>

          <div className="card-premium rounded-2xl p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="icon-badge flex h-11 w-11 items-center justify-center rounded-xl text-accent-2">
                <Coins size={19} strokeWidth={1.75} />
              </span>
              <h3 className="font-display text-base font-semibold text-foreground">
                CreditLine.sol — repayment enforced at source
              </h3>
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-muted">
              <li>
                <span className="font-medium text-foreground">Skim-at-source repayment</span> — task
                revenue is routed into the contract; outstanding principal + interest is deducted
                before any balance becomes the agent&apos;s. The agent never handles gross revenue,
                so repayment isn&apos;t a promise it keeps — it&apos;s a deduction it can&apos;t
                route around.
              </li>
              <li>
                <span className="font-medium text-foreground">Reputation-scaled slashable bond</span>{" "}
                — the agent can pledge nothing, so its principal posts a bond sized by on-chain
                reputation (better score → smaller bond). On default, the lender slashes it and the
                default is written to reputation for every future lender to see.
              </li>
              <li>
                <span className="font-medium text-foreground">Live, reputation-derived limit</span> —
                the credit limit is <code className="font-mono text-foreground">baseLimit × score</code>,
                recomputed on every read, never frozen at approval.
              </li>
              <li>
                <span className="font-medium text-foreground">Portable reputation</span> —{" "}
                <code className="font-mono text-foreground">ReputationRegistry.sol</code> keys score
                to agent identity, readable by any lender, and lets a fresh agent inherit its
                principal&apos;s standing at a discount to solve cold-start.
              </li>
            </ul>
          </div>

          <p className="text-sm leading-relaxed text-muted">
            The demos below run on an in-memory Hardhat EVM and verify real Solidity behavior — they
            require no deployment, funds, or network. An Ethereum Sepolia deploy script ships in{" "}
            <code className="font-mono text-foreground">onchain/scripts/deploy.ts</code>; the demos
            are kept in-memory so a judge can reproduce them in one command without a funded wallet.
          </p>

          <div className="dark-scope overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="ml-2 font-mono text-xs text-muted">npm run demo:attack</span>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[12px] leading-relaxed text-foreground">
{`[2] Attack: agent tries to pay an address that was never allowlisted.
✓ BLOCKED — pay unlisted address
            reason: reverted with custom error 'NotAllowlisted(...)'

[5] Owner freezes the agent mid-sequence — after a payment is
    proposed, before it executes.
  step 1/2 — proposePayment() succeeded (payment is now pending)
  ⚠ owner.pause() called — kill switch engaged
✓ BLOCKED — execute the already-proposed payment after the freeze
            reason: reverted with custom error 'ContractPaused()'
            → in-flight revocation confirmed: no funds moved

[8] Attack: a malicious agent contract tries to re-enter directPay()
    from its own receive() hook, mid-payment.
  reentry attempt made: 1 (reverted by the nonReentrant guard)
✓ BLOCKED — reentrant call reverted with custom error 'Reentrant()'`}
            </pre>
          </div>

          <div className="dark-scope overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="ml-2 font-mono text-xs text-muted">npm run demo:redteam</span>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[12px] leading-relaxed text-foreground">
{`[5] Task earns 5 ETH. Agent tries to keep the gross revenue.
    → repayment skimmed at source. remaining debt: 0.0 ETH
    → agent's withdrawable NET: 0.99... ETH (not the 5 gross)

[6] Agent forges its own spend authorization (self-signed grant).
✓ BLOCKED — pay with an agent-forged grant
            reason: reverted with custom error 'BadSignature()'

[7] Owner-signed grant used once, then replayed.
✓ BLOCKED — replay the same grant
            reason: reverted with custom error 'GrantAlreadyUsed(...)'

[10] Dead-man switch: owner goes silent, authority auto-expires.
✓ BLOCKED — agent payment after owner heartbeat lapsed
            reason: reverted with custom error 'AgentExpired()'`}
            </pre>
          </div>

          <LiveTransactionProof />

          <p className="text-center text-xs text-muted">
            Full output, deployment script, and Ethereum Sepolia testnet instructions in{" "}
            <code className="font-mono text-foreground">onchain/README.md</code>.
          </p>
        </div>
      </Section>

      <CTA
        heading={
          <>
            Want to see the enforcement layer in action?
            <br />
            <span className="text-gradient">The console shows exactly this.</span>
          </>
        }
        body="Every rule described on this page is running in the live demo — not just described."
        ctaLabel="Open the live console →"
        ctaHref="/console"
      />
    </div>
  );
}
