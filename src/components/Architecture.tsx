import { Section } from "./ui/Section";

const LAYERS = [
  { name: "Identity Layer", detail: "DID issuance · owner binding · non-transferable agent keys" },
  { name: "Reputation Engine", detail: "Behavioral scoring · task success rate · spend pattern analysis" },
  { name: "Credit / Policy Engine", detail: "Dynamic limits · APR pricing · unified credit + spend policy object" },
  { name: "Wallet Enforcement Layer", detail: "Allowlists · spend caps · in-flight revocation · smart-contract or API-level controls" },
  { name: "Audit & Monitoring", detail: "Real-time anomaly detection · immutable transaction log · owner alerts" },
];

export function Architecture() {
  return (
    <Section
      eyebrow="Under the hood"
      title="Five layers, one policy object"
      description="Credit decisions and spend controls are read from the same source of truth — there's no gap between what an agent is allowed to borrow and what it's allowed to spend."
    >
      <div className="mx-auto max-w-2xl">
        {LAYERS.map((l, idx) => (
          <div key={l.name} className="relative pl-10">
            {idx !== LAYERS.length - 1 && (
              <span className="absolute left-[15px] top-9 h-[calc(100%-4px)] w-px bg-border" />
            )}
            <span className="absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface font-mono text-[11px] text-accent">
              {idx + 1}
            </span>
            <div className="mb-8">
              <h3 className="font-display text-base font-semibold text-foreground">{l.name}</h3>
              <p className="mt-1.5 text-sm text-muted">{l.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
