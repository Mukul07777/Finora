import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { UnderwritingCard } from "@/components/console/UnderwritingCard";
import { CollusionCard } from "@/components/console/CollusionCard";
import { CTA } from "@/components/CTA";

export const metadata: Metadata = {
  title: "Reputation & Fraud — Finora",
  description:
    "How an agent's credit score is underwritten from real behavior, and how wash-trading rings that fake revenue to inflate scores get caught.",
};

export default function NetworkPage() {
  return (
    <div className="pt-10">
      <Section
        eyebrow="Trust, earned and verified"
        title="Reputation you can underwrite — and can't fake"
        description="An agent has no credit history, so Finora scores it from what it has actually done. But any reputation system that rewards revenue is gameable — so a second layer checks whether that revenue is real, or just agents paying each other in circles."
      >
        <div className="dark-scope rounded-3xl border border-border p-4 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">1 · How the score is built</h3>
                <p className="text-[12px] text-muted">Behavioral underwriting — task success, spend discipline, refunds, violations. No credit file.</p>
              </div>
              <UnderwritingCard />
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">2 · Why the score can be trusted</h3>
                <p className="text-[12px] text-muted">Graph analysis flags circular payments and internal-only revenue, then discounts a fake score.</p>
              </div>
              <CollusionCard />
            </div>
          </div>
        </div>
      </Section>

      <Section
        eyebrow="The attack, named"
        title="Wash trading — and why almost no one defends it"
        description="Agent A pays B, B pays C, C pays A. Each reports the inflow as 'revenue', all three scores climb, all three unlock bigger credit lines — then default together. It's the canonical attack on reputation-based lending. Finora catches it and discounts the offenders' scores, so a lender sees the real number, not the pumped one."
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface px-6 py-5 text-sm leading-relaxed text-muted">
          This analysis is also a live API endpoint —{" "}
          <code className="font-mono text-foreground">GET /api/v1/risk/collusion</code> — returning
          per-agent authenticity, flagged rings, and reciprocal pairs over the real payment graph.
          Try it on the <a href="/docs" className="text-accent hover:underline">API page</a>.
        </div>
      </Section>

      <CTA
        heading={
          <>
            A score is only as good as it is honest.
            <br />
            <span className="text-gradient">See it drive real credit decisions.</span>
          </>
        }
        body="On the console, a low-authenticity agent gets worse terms — the fraud check feeds straight into underwriting."
        ctaLabel="Open the live console →"
        ctaHref="/console"
      />
    </div>
  );
}
