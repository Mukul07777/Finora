import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Accordion } from "@/components/ui/Accordion";
import { CTA } from "@/components/CTA";

export const metadata: Metadata = {
  title: "Pricing — Finora",
  description: "Finora pricing — per active agent, not per seat.",
};

const TIERS = [
  {
    name: "Builder",
    price: "Free",
    unit: "up to 3 agents",
    tagline: "For prototyping agent credit and kill-switch flows.",
    features: [
      "Agent identity (DID) issuance",
      "Reputation scoring (sandbox data)",
      "Fixed credit limit (no dynamic underwriting)",
      "Manual kill switch",
      "Community support",
    ],
    cta: "Start building",
    highlighted: false,
  },
  {
    name: "Scale",
    price: "$0.35",
    unit: "per active agent / day",
    tagline: "For teams putting real agents into production.",
    features: [
      "Everything in Builder",
      "Dynamic underwriting & APR pricing",
      "Wallet-layer spend limits & allowlists",
      "Real-time anomaly detection",
      "Instant + in-flight kill switch",
      "Auto-repayment from revenue events",
      "Priority support",
    ],
    cta: "Talk to us",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "volume & compliance pricing",
    tagline: "For banks, card networks, and large agent fleets.",
    features: [
      "Everything in Scale",
      "On-chain session-key enforcement",
      "Dedicated risk model tuning",
      "SLA-backed kill-switch latency",
      "Audit exports & compliance reporting",
      "Dedicated solutions engineer",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

const FAQ = [
  {
    q: "Why price per agent instead of per seat?",
    a: "Humans don't spend money the way agents do. An agent can execute thousands of transactions a day with no human touching a keyboard — the unit of risk (and cost) is the agent, not a login.",
  },
  {
    q: "Do you take a cut of the credit line?",
    a: "No. Finora charges a platform fee for identity, underwriting, and enforcement infrastructure. Interest on the credit line accrues to whoever is funding it — us, a partner lender, or your own treasury.",
  },
  {
    q: "What happens if an agent's owner never pays?",
    a: "Outstanding balances are capped by the dynamic credit limit, which shrinks automatically as risk signals worsen. The kill switch and allowlist mean worst-case exposure is bounded well before it becomes uncollectable.",
  },
  {
    q: "Can I self-host the enforcement layer?",
    a: "Enterprise plans support deploying the wallet-layer policy contracts to your own infrastructure or chain of choice, with Finora providing the identity and reputation layer as a service.",
  },
];

export default function PricingPage() {
  return (
    <div className="pt-10">
      <Section
        eyebrow="Pricing"
        title="Priced for how agents actually spend"
        description="Per active agent, not per seat — because the risk you're managing scales with agents, not headcount."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`card-hover relative rounded-2xl p-8 ${
                t.highlighted
                  ? "glow-accent border border-accent/40 bg-surface"
                  : "card-premium"
              }`}
            >
              {t.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-on-accent">
                  Most common
                </span>
              )}
              <h3 className="font-display text-lg font-semibold text-foreground">{t.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold text-foreground">
                  {t.price}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">{t.unit}</div>
              <p className="mt-4 text-sm text-muted">{t.tagline}</p>

              <ul className="mt-6 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check size={15} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/console"
                className={`mt-8 block rounded-full px-5 py-3 text-center text-sm font-semibold transition-transform hover:scale-[1.02] ${
                  t.highlighted
                    ? "btn-shine bg-accent text-on-accent"
                    : "border border-border text-foreground hover:border-muted"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="FAQ" title="Common questions">
        <Accordion items={FAQ} />
      </Section>

      <CTA />
    </div>
  );
}
