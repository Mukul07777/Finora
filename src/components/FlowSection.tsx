"use client";

import { Section } from "./ui/Section";
import { MoneyFlow } from "./console/MoneyFlow";
import { MaxLoss } from "./console/MaxLoss";
import { StoryMode } from "./console/StoryMode";
import { MotionCard } from "./console/motion";
import { FinoraProvider } from "@/lib/finora/FinoraProvider";

export function FlowSection() {
  return (
    <FinoraProvider>
      <Section
        eyebrow="Follow the money"
        title="Where capital flows — and why borrowing pays"
        description="The hardest question in agent credit isn't 'can it borrow' — it's 'does it ever pay back'. This traces every dollar: into the agent, out to vendors, and back through repayment that's skimmed before the agent can touch it. Press play to watch it move."
      >
        <div className="dark-scope space-y-6 rounded-3xl border border-border p-4 sm:p-8">
          <StoryMode />
          <MotionCard>
            <MoneyFlow />
          </MotionCard>
          <div className="grid gap-6 lg:grid-cols-2">
            <MotionCard delay={0.08}>
              <MaxLoss />
            </MotionCard>
            <div className="card-premium flex flex-col justify-center rounded-2xl p-6">
              <h3 className="font-display text-base font-semibold text-foreground">Repayment isn&apos;t trust — it&apos;s plumbing</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Task revenue routes through the credit line, and outstanding debt is deducted before
                the agent can withdraw a cent. The agent never holds the gross, so it can&apos;t route
                around repayment. On-chain, this is <code className="font-mono text-foreground">SettlementEscrow.sol</code>{" "}
                → <code className="font-mono text-foreground">CreditLine.reportRevenue()</code>.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                The max-loss figure on the left is live value-at-risk: the worst an owner could lose
                if the agent turned adversarial right now. Tighten the per-transaction cap on the
                console and watch it shrink.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </FinoraProvider>
  );
}
