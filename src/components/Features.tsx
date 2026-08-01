import { Section } from "./ui/Section";
import {
  Fingerprint,
  Gauge,
  Landmark,
  ShieldAlert,
  ListChecks,
  Radio,
  Repeat,
  Siren,
} from "lucide-react";

const FEATURES = [
  {
    icon: Fingerprint,
    title: "Agent Identity (DID)",
    body: "A verifiable, non-transferable link between the agent and the human or organization accountable for it.",
  },
  {
    icon: Gauge,
    title: "Reputation Engine",
    body: "Underwriting from behavioral track record — task success rate, spend discipline, refund ratio — no credit history required.",
  },
  {
    icon: Landmark,
    title: "Dynamic Credit Line",
    body: "Limits and interest rates recalculated in real time as the agent's track record changes, not fixed at onboarding.",
  },
  {
    icon: ListChecks,
    title: "Allowlisted Counterparties",
    body: "Agents can only transact with pre-approved parties — enforced at the wallet layer, invisible to the agent's own logic.",
  },
  {
    icon: ShieldAlert,
    title: "Spend Limits at the Wallet",
    body: "Hard caps live in the policy/contract layer, so a compromised or buggy agent physically cannot exceed them.",
  },
  {
    icon: Radio,
    title: "Real-time Anomaly Detection",
    body: "Velocity and pattern monitoring flags overzealous or hijacked behavior before damage compounds.",
  },
  {
    icon: Siren,
    title: "Instant Kill Switch",
    body: "One owner-controlled action freezes the agent immediately — including in-flight, multi-step transactions.",
  },
  {
    icon: Repeat,
    title: "Programmatic Auto-Repayment",
    body: "When a task's revenue lands, the loan is deducted automatically — no invoices, no chasing, no contract.",
  },
];

export function Features() {
  return (
    <Section
      eyebrow="Everything enforced, nothing assumed"
      title="A full stack for agentic money"
      description="Built for both problem statements at once: credit that agents can actually use, and a leash that actually holds."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="card-hover rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-muted"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent">
              <f.icon size={18} strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-sm font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
