import { Section } from "./ui/Section";

const METRICS = [
  {
    value: "Trust design",
    body: "Reputation is computed from verifiable behavior, not vibes — so extending credit with no collateral is a modeled risk, not a leap of faith.",
  },
  {
    value: "Repayment enforceability",
    body: "Repayment isn't requested, it's programmatic — revenue events are intercepted and applied to the outstanding balance automatically.",
  },
  {
    value: "Enforcement independence",
    body: "Spend limits and allowlists live at the wallet layer. A compromised agent can't reason its way past a policy it never controls.",
  },
  {
    value: "Kill-switch reliability",
    body: "One owner action freezes everything — including work already in flight — with no negotiation, approval queue, or legal process.",
  },
  {
    value: "Risk containment",
    body: "Credit limits double as spend limits. A misbehaving agent's worst case is capped by design, not by hoping it behaves.",
  },
  {
    value: "Real-world plausibility",
    body: "Every mechanism shown — identity linking, underwriting, policy enforcement, revocation — maps to primitives that exist today: DIDs, smart contracts, and card-network controls.",
  },
];

export function Metrics() {
  return (
    <Section
      id="metrics"
      eyebrow="Built against the hard questions"
      title="Why this holds up outside a demo"
      description="Finora is designed around the exact tension judges (and real lenders) will press on: how do you trust an entity that can't be sued?"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m) => (
          <div key={m.value} className="card-hover card-premium rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-accent">{m.value}</h3>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">{m.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
