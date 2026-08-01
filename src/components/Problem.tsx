import { Section } from "./ui/Section";

const CARDS = [
  {
    tag: "No identity, no credit",
    title: "Agents can create value but can't borrow to get there.",
    body: "AI agents purchase compute, place orders, and execute trades — but they have no legal identity, no assets to pledge, and no ability to sign a contract. Every lending mechanism assumes a borrower who can be identified, bound, and chased for repayment. Agents that could complete valuable work are stuck waiting on funds they can't access.",
    accentClass: "text-accent-2",
  },
  {
    tag: "No leash, no control",
    title: "Once an agent holds a wallet, \"be careful\" isn't a control.",
    body: "Autonomous agents increasingly transact without a human approving every move. A compromised, buggy, or overzealous agent can spend money faster than any human can react — because most controls live inside the agent's own logic instead of being enforced independently of it.",
    accentClass: "text-danger",
  },
];

export function Problem() {
  return (
    <Section
      id="problem"
      eyebrow="The gap in today's financial system"
      title="Two problems, one root cause"
      description="Financial infrastructure was built for humans and corporations who can be identified, bound, and held accountable. Autonomous agents are neither — and that breaks lending and spend-control at the same time."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {CARDS.map((c, idx) => (
          <div
            key={c.tag}
            className="card-hover card-premium group relative overflow-hidden rounded-2xl p-8"
          >
            <span className="font-display text-5xl font-bold text-border transition-colors group-hover:text-surface-2">
              0{idx + 1}
            </span>
            <div
              className={`mt-5 mb-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-mono uppercase tracking-widest ${c.accentClass}`}
            >
              {c.tag}
            </div>
            <h3 className="font-display text-xl font-semibold leading-snug text-foreground">
              {c.title}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted">{c.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
