import { HeroTerminal } from "./HeroTerminal";

export function Hero() {
  return (
    <div id="top" className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 -z-10 h-[720px]" />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Fintech · Autonomous Agent Credit &amp; Control
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Give agents money.
            <br />
            <span className="text-gradient">Keep a hand on the leash.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Finora is the financial operating system for autonomous AI agents — a verifiable
            identity, a real-time reputation score, a dynamically underwritten credit line, and a
            wallet-layer kill switch that works even when the agent doesn&apos;t cooperate.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#console"
              className="glow-accent rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.03]"
            >
              Launch Live Console →
            </a>
            <a
              href="#how-it-works"
              className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-muted"
            >
              How it works
            </a>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-6 border-t border-border pt-8 sm:max-w-lg">
            <Stat value="96%" label="predicted repayment" />
            <Stat value="<80ms" label="policy enforcement" />
            <Stat value="0" label="signed contracts needed" />
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroTerminal />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
