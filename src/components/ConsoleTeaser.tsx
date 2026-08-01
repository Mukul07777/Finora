import Link from "next/link";
import { Fingerprint, Gauge, Power, ShieldCheck } from "lucide-react";
import { Section } from "./ui/Section";

const CHIPS = [
  { icon: Fingerprint, label: "Identity verified" },
  { icon: Gauge, label: "Score: 82 / Established" },
  { icon: ShieldCheck, label: "Spend within policy" },
  { icon: Power, label: "Kill switch: standby" },
];

export function ConsoleTeaser() {
  return (
    <Section
      id="console-teaser"
      eyebrow="Try it yourself"
      title="A live, clickable console — not a mockup"
      description="Request credit, spend against it, try to break the rules, and pull the kill switch. Every panel reacts in real time."
    >
      <div className="dark-scope glow-accent relative overflow-hidden rounded-3xl border border-border p-10 text-center sm:p-16">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-3">
            {CHIPS.map((c) => (
              <span
                key={c.label}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 font-mono text-xs text-foreground"
              >
                <c.icon size={14} className="text-accent" />
                {c.label}
              </span>
            ))}
          </div>

          <h3 className="mt-8 font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Full agent passport, credit engine, wallet, and kill switch —
            <br className="hidden sm:block" /> live in one console.
          </h3>

          <Link
            href="/console"
            className="mt-8 inline-block rounded-full bg-accent px-7 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.03]"
          >
            Open the live console →
          </Link>
        </div>
      </div>
    </Section>
  );
}
