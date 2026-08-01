import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { Metrics } from "@/components/Metrics";
import { Architecture } from "@/components/Architecture";
import { CTA } from "@/components/CTA";
import { ShieldCheck, Lock, Radio, GitBranch } from "lucide-react";

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
    body: "A human notices something wrong and needs to stop the agent immediately, without waiting on support tickets or dispute processes. Mitigated: the kill switch is a single owner-signed action that freezes future and in-flight steps instantly.",
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
        <div className="grid gap-6 md:grid-cols-3">
          {THREATS.map((t) => (
            <div key={t.title} className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent">
                <t.icon size={18} strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">{t.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{t.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Architecture />
      <Metrics />

      <Section
        eyebrow="Shipped, not just described"
        title="The on-chain enforcement layer is real code"
        description="AgentWallet.sol is a working Solidity contract with a 17-test suite and a scripted attack agent — not a diagram. It lives in this repo's /onchain folder."
      >
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent-2">
                <GitBranch size={18} strokeWidth={1.75} />
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
                <span className="font-medium text-foreground">17/17 tests passing</span> — ownership,
                direct payments, the kill switch, in-flight revocation, and funds custody are each
                covered in <code className="font-mono text-foreground">onchain/test/AgentWallet.test.ts</code>.
              </li>
            </ul>
          </div>

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
            → in-flight revocation confirmed: no funds moved`}
            </pre>
          </div>

          <p className="text-center text-xs text-muted">
            Full output, deployment script, and Base Sepolia testnet instructions in{" "}
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
