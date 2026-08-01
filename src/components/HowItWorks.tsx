import { Section } from "./ui/Section";

const STEPS = [
  {
    n: "01",
    title: "Verify identity",
    body: "Every agent gets a DID cryptographically linked to the human or org that authorized it. No anonymous wallets — every spend traces back to an accountable owner.",
  },
  {
    n: "02",
    title: "Score reputation",
    body: "No credit bureau exists for agents, so Finora builds one from behavioral signals: task success rate, spend patterns, refund ratio, and owner standing.",
  },
  {
    n: "03",
    title: "Underwrite & issue credit",
    body: "A dynamic limit and interest rate are computed in real time — no signed contract. Enforcement happens programmatically at the wallet layer, not on trust.",
  },
  {
    n: "04",
    title: "Enforce, monitor, and kill",
    body: "Spend caps and allowlists are enforced independent of the agent's own logic. The owner can freeze execution instantly — even mid-transaction.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How Finora works"
      title="One pipeline, two guarantees"
      description="The same policy object that decides how much an agent can borrow is the one that enforces how much it can spend — credit and control are never separate systems."
    >
      <div className="relative grid gap-8 md:grid-cols-4">
        <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
        {STEPS.map((s) => (
          <div key={s.n} className="relative">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface font-mono text-sm text-accent">
              {s.n}
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">{s.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
