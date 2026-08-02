import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { ApiExplorer } from "@/components/ApiExplorer";
import { CTA } from "@/components/CTA";

export const metadata: Metadata = {
  title: "API — Finora",
  description: "The live Finora REST API: agent identity, behavioral underwriting, credit terms, and fraud detection — callable now.",
};

export default function DocsPage() {
  return (
    <div className="pt-10">
      <Section
        eyebrow="Developers"
        title="The Finora API is live"
        description="Identity, behavioral underwriting, credit terms, and fraud detection as real REST endpoints — served from this deployment, backed by a live database. Click Run on any endpoint below to call it for real."
      >
        <div className="mx-auto mb-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 px-5 py-4 text-sm leading-relaxed text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Live
          </span>
          <span>
            These are working endpoints on this app (relative paths, no key required for reads). When
            Supabase is connected they serve real data; otherwise they return a deterministic sample —
            the <code className="font-mono text-foreground">dataMode</code> field on{" "}
            <code className="font-mono text-foreground">/api/v1/health</code> tells you which.
          </span>
        </div>

        <ApiExplorer />

        <div className="mx-auto mt-10 max-w-3xl">
          <h3 className="mb-3 font-display text-sm font-semibold text-foreground">From your terminal</h3>
          <div className="dark-scope overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="ml-2 font-mono text-xs text-muted">curl (replace host with your deployment)</span>
            </div>
            <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-foreground">
{`# an agent's full passport — score, authenticity, live credit terms
curl https://<your-app>/api/v1/agents/agent.procure-01

# wash-trading / collusion analysis over the payment graph
curl https://<your-app>/api/v1/risk/collusion

# stateless underwriting calculator
curl "https://<your-app>/api/v1/credit/terms?score=82"

# compile an English policy into on-chain ops
curl -X POST https://<your-app>/api/policy/compile \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Max $500 per transaction; only pay api.compute.gpu"}'`}
            </pre>
          </div>
        </div>
      </Section>

      <CTA
        heading={
          <>
            The API powers the product.
            <br />
            <span className="text-gradient">See it drive the live console.</span>
          </>
        }
        body="Every endpoint here maps to what the console does — same scoring, same fraud checks, same credit math."
        ctaLabel="Open the live console →"
        ctaHref="/console"
      />
    </div>
  );
}
