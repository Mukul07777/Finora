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
    title: "Signed Owner→Agent Delegation",
    body: "The owner signs a scoped, expiring EIP-712 capability; the contract verifies the signature on-chain. The agent's authority is a cryptographic delegation from a named human, not a bare address.",
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
    title: "Circuit Breaker That Acts",
    body: "Velocity monitoring doesn't just flag — above a risk threshold a monitor trips the on-chain kill switch automatically, with no human in the loop. Guardians can freeze too, but none of them can withdraw.",
  },
  {
    icon: Siren,
    title: "Instant Kill Switch",
    body: "One owner-controlled action freezes the agent immediately — including in-flight, multi-step transactions.",
  },
  {
    icon: Repeat,
    title: "Repayment Skimmed at Source",
    body: "Task revenue routes through the credit contract and outstanding debt is deducted before the agent can touch a cent. Repayment isn't a promise it keeps — it's a deduction it can't route around.",
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
          <div key={f.title} className="card-hover card-premium rounded-2xl p-6">
            <div className="icon-badge mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-accent">
              <f.icon size={19} strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-sm font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
