import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { CTA } from "@/components/CTA";

export const metadata: Metadata = {
  title: "Docs — Finora",
  description: "API reference preview for the Finora agent identity, credit, and wallet API.",
};

const ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/agents",
    desc: "Register an agent and issue a DID cryptographically linked to its owner.",
  },
  {
    method: "GET",
    path: "/v1/agents/:id/passport",
    desc: "Fetch an agent's identity, reputation score, tier, and standing.",
  },
  {
    method: "POST",
    path: "/v1/credit/underwrite",
    desc: "Request a credit decision — returns limit, APR, and reasoning signals.",
  },
  {
    method: "POST",
    path: "/v1/wallet/transact",
    desc: "Attempt a payment. Evaluated against spend limit and allowlist before execution.",
  },
  {
    method: "POST",
    path: "/v1/wallet/freeze",
    desc: "Owner-only. Immediately halts the agent, including in-flight transaction steps.",
  },
  {
    method: "POST",
    path: "/v1/wallet/unfreeze",
    desc: "Owner-only. Reinstates a frozen agent and re-arms its policy.",
  },
];

const methodColor: Record<string, string> = {
  GET: "text-accent-2",
  POST: "text-accent",
};

export default function DocsPage() {
  return (
    <div className="pt-10">
      <Section
        eyebrow="Developers"
        title="Planned API — Not Currently Live"
        description="Identity, underwriting, and wallet enforcement as a handful of endpoints — designed to be called by an agent's own tool layer."
      >
        <div className="mx-auto mb-10 max-w-2xl rounded-2xl border border-border bg-surface px-5 py-4 text-sm leading-relaxed text-muted">
          This describes the API&apos;s intended shape. No backend is deployed — <code className="font-mono text-foreground">api.finora.dev</code> does not resolve, and the request below will not succeed if you run it. The endpoints mirror what the live console already does in-browser (see <code className="font-mono text-foreground">/console</code>), which is the accurate place to see this behavior working today.
        </div>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {ENDPOINTS.map((e, idx) => (
              <div
                key={e.path}
                className={`flex flex-col gap-1 px-5 py-4 ${
                  idx !== ENDPOINTS.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs font-semibold ${methodColor[e.method]}`}>
                    {e.method}
                  </span>
                  <span className="font-mono text-sm text-foreground">{e.path}</span>
                </div>
                <p className="text-[13px] text-muted">{e.desc}</p>
              </div>
            ))}
          </div>

          <div className="dark-scope overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="ml-2 font-mono text-xs text-muted">request an agent&apos;s credit</span>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-foreground">
{`curl -X POST https://api.finora.dev/v1/credit/underwrite \\
  -H "Authorization: Bearer $FINORA_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "agent.procure-01",
    "requested_amount": 5000,
    "currency": "INR",
    "purpose": "gpu_compute"
  }'

{
  "status": "approved",
  "limit": 8200,
  "apr": 14.2,
  "signals": {
    "task_success_rate": 0.982,
    "refund_ratio": 0.004,
    "owner_verified": true
  }
}`}
            </pre>
          </div>
        </div>
      </Section>

      <CTA
        heading={
          <>
            Want the full API reference?
            <br />
            <span className="text-gradient">Talk to us during the review.</span>
          </>
        }
        body="The endpoints above map directly to the actions available in the live console."
        ctaLabel="Open the live console →"
        ctaHref="/console"
      />
    </div>
  );
}
