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
        eyebrow="Roadmap"
        title="What ships on-chain next"
        description="The console demonstrates the policy model end-to-end in a controlled environment. Production enforcement moves the same logic on-chain, where it can't be bypassed even by us."
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent-2">
              <GitBranch size={18} strokeWidth={1.75} />
            </span>
            <h3 className="font-display text-base font-semibold text-foreground">
              Session-key smart wallet
            </h3>
          </div>
          <ul className="space-y-3 text-sm leading-relaxed text-muted">
            <li>
              <span className="font-medium text-foreground">Account abstraction (ERC-4337) or Safe modules</span> —
              the agent never holds the owner key. It holds a scoped session key with an expiry,
              a spend cap, and an allowlist encoded directly into the permission.
            </li>
            <li>
              <span className="font-medium text-foreground">On-chain policy checks</span> — every
              spend/allowlist/limit rule becomes a <code className="font-mono text-foreground">require()</code>{" "}
              in the wallet contract, so enforcement doesn&apos;t depend on our backend staying honest.
            </li>
            <li>
              <span className="font-medium text-foreground">Multi-step in-flight revocation</span> —
              structuring a payment as approve → execute means a freeze between steps reverts the
              remainder, giving real in-flight revocation without needing to interrupt a mined transaction.
            </li>
            <li>
              <span className="font-medium text-foreground">Gasless freeze via relayer</span> — the
              kill switch stays usable even if the owner&apos;s wallet is out of gas at the worst
              possible moment.
            </li>
          </ul>
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
