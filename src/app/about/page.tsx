import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CTA } from "@/components/CTA";
import { Target, ShieldCheck, Scale, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "About — Finora",
  description: "Why we're building the financial operating system for autonomous agents.",
};

const VALUES = [
  {
    icon: Target,
    title: "Enforcement over promises",
    body: "If a guarantee only holds because the agent cooperates, it isn't a guarantee. We build controls that hold even when the agent misbehaves.",
  },
  {
    icon: ShieldCheck,
    title: "Bounded risk by design",
    body: "Every credit line ships with a hard ceiling. The worst case is a design decision, not an accident.",
  },
  {
    icon: Scale,
    title: "Accountability without contracts",
    body: "Agents can't sign anything — so trust has to come from verifiable identity and behavior, not paperwork.",
  },
  {
    icon: Zap,
    title: "Built for speed, not paperwork",
    body: "Agents work at machine speed. Underwriting, approval, and revocation all need to happen in milliseconds, not business days.",
  },
];

export default function AboutPage() {
  return (
    <div className="pt-10">
      <Section
        eyebrow="About Finora"
        title="Money is becoming agentic. The rails aren't ready."
        description="Finora started from a simple observation: AI agents are already buying compute, placing orders, and executing trades — but every financial primitive we have assumes a human on the other end of the transaction."
      >
        <div className="mx-auto max-w-2xl space-y-4 text-sm leading-relaxed text-muted">
          <p>
            We built Finora for Innova Hack Chapter-1&apos;s Fintech track, starting from two
            problem statements that are really the same problem seen from opposite sides:
            agents need credit to get work done, and owners need a real way to stop an agent that
            goes wrong. Solving either one without the other doesn&apos;t hold up — a credit line
            with no enforcement is a liability, and a kill switch with no credit model has nothing
            to control.
          </p>
          <p>
            So instead of picking one problem statement, we built the layer underneath both:
            verifiable identity, behavioral reputation, dynamic underwriting, and policy
            enforcement that lives outside the agent&apos;s own reasoning.
          </p>
        </div>
      </Section>

      <Section eyebrow="What we believe" title="Principles behind the build">
        <div className="grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="card-hover rounded-2xl border border-border bg-surface p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent">
                <v.icon size={18} strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">{v.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="The team" title="Built during Innova Hack Chapter-1">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm leading-relaxed text-muted">
            Finora is built by a small team competing in the Fintech domain of Innova Hack
            Chapter-1, organised by Elite Forums and powered by Unstop. We&apos;re builders first —
            this console is real, working software, not a slide deck.
          </p>
        </div>
      </Section>

      <CTA />
    </div>
  );
}
