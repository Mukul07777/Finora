export function CTA() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-24 sm:px-8">
      <div className="glow-accent relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-16 text-center sm:px-16">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-0 opacity-60" />
        <div className="relative">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Agents are already spending money.
            <br />
            <span className="text-gradient">Someone should be able to stop them.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Finora is the missing layer between autonomous agents and the financial system —
            credit they can use, and control you can trust.
          </p>
          <a
            href="#console"
            className="mt-8 inline-block rounded-full bg-accent px-7 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.03]"
          >
            Try the live console →
          </a>
        </div>
      </div>
    </section>
  );
}
