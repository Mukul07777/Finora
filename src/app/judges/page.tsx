import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { CTA } from "@/components/CTA";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "For Judges — Finora",
  description: "A 60-second guided walkthrough, plus exactly what's real versus simulated — no digging through the repo required.",
};

const STEPS = [
  {
    title: "Request credit",
    body: "Watch the underwriting steps run, then note the limit/APR — computed from the agent's score, not hardcoded.",
    href: "/console",
    cta: "Open the console",
  },
  {
    title: "Send a payment, watch it go pending",
    body: "A real two-step lifecycle (propose → settle), mirroring proposePayment()/executePayment() on-chain — not an instant approve/reject.",
  },
  {
    title: "Freeze it while a payment is still pending",
    body: "The exact in-flight transaction gets cancelled — ₹0 moved. The same in-flight revocation proven in the Solidity test suite, reproduced live in the browser.",
  },
  {
    title: "Drag the per-transaction cap slider down",
    body: "Then try to pay. The next payment blocks with the new cap as the stated reason — live owner policy, not fixed at deployment.",
  },
  {
    title: "Do the same from the phone below the console",
    body: "It's the same agent, same shared state. Freeze it from the phone; watch the console above freeze too.",
  },
  {
    title: "Click \"Simulate rogue spend\" a few times quickly",
    body: "The assessed risk in the alert changes each time — computed from actual transaction velocity, not a fixed number — and credit terms visibly worsen.",
  },
  {
    title: "Run the on-chain attack demo",
    body: "The same policy rules, enforced by real Solidity, with real revert reasons — including a live reentrancy attack that fails.",
    href: "/security",
    cta: "Open Security",
  },
];

interface HonestyRow {
  claim: string;
  status: string;
  tone: "real" | "computed" | "simulated" | "seeded" | "not-live";
  detail: string;
}

const HONESTY_TABLE: HonestyRow[] = [
  {
    claim: "On-chain enforcement (limits, allowlist, pause, in-flight revocation)",
    status: "Real",
    tone: "real",
    detail: "AgentWallet.sol, 24/24 tests passing — run it yourself in /onchain",
  },
  {
    claim: "Attack demo reverts",
    status: "Real",
    tone: "real",
    detail: "Real Solidity execution on an in-memory Hardhat EVM, including a live reentrancy attack",
  },
  {
    claim: "Console/phone payment lifecycle",
    status: "Simulated, modeled on the real thing",
    tone: "simulated",
    detail: "Genuinely goes pending → settled, and freezing mid-payment really cancels that exact transaction",
  },
  {
    claim: "Credit limit / APR",
    status: "Computed",
    tone: "computed",
    detail: "A real formula (computeCreditTerms), recalculated live whenever score changes — not fixed once at approval",
  },
  {
    claim: "Anomaly / velocity risk",
    status: "Heuristic, computed",
    tone: "computed",
    detail: "Derived from this session's actual transaction timestamps — not a fixed number, not a trained model either",
  },
  {
    claim: "The agent's decisions",
    status: "Scripted by default, real LLM in Autopilot",
    tone: "simulated",
    detail: "Optional Agent Autopilot hands decisions to a real Groq model through the same policy path a human click would use",
  },
  {
    claim: "Starting reputation score",
    status: "Seeded",
    tone: "seeded",
    detail: "Every session starts at 82 — a bootstrap value, since there's no real history yet",
  },
  {
    claim: "REST API (/docs)",
    status: "Not live",
    tone: "not-live",
    detail: "Describes the planned API shape; api.finora.dev does not resolve",
  },
  {
    claim: "Public testnet deployment",
    status: "Not deployed",
    tone: "not-live",
    detail: "Deliberate choice, to keep the demo reliable during judging — deployment script is ready in onchain/",
  },
];

const TONE_STYLE: Record<HonestyRow["tone"], string> = {
  real: "border-accent/40 bg-accent/10 text-accent",
  computed: "border-accent-2/40 bg-accent-2/10 text-accent-2",
  simulated: "border-violet/40 bg-violet/10 text-violet",
  seeded: "border-warning/40 bg-warning/10 text-warning",
  "not-live": "border-border bg-surface-2 text-muted",
};

const PHASES = [
  { n: "00", title: "Credibility cleanup", body: "Removed fabricated stats, labeled every simulated surface \"Simulation Mode.\"" },
  { n: "01", title: "Shared state", body: "One FinoraProvider — console and phone became live views of the same agent." },
  { n: "02", title: "Contract hardening", body: "Reentrancy guard, two-step ownership transfer, test suite grew to 24." },
  { n: "03", title: "Adapter pattern", body: "Backend logic extracted behind a FinoraAdapter interface — swappable, not rewritten." },
  { n: "04", title: "Financial intelligence", body: "Credit terms and anomaly risk became computed, live, not hardcoded numbers." },
  { n: "05", title: "Payment lifecycle", body: "Real pending → settled flow; freezing mid-payment cancels the actual transaction." },
  { n: "06", title: "Owner policy controls", body: "A live, draggable per-transaction cap — the one contract capability with no UI before this." },
  { n: "07", title: "Final polish", body: "Lint clean, cross-page smoke tests, refreshed screenshots, this page." },
];

export default function JudgesPage() {
  return (
    <div className="pt-10">
      <Section
        eyebrow="For judges"
        title="Everything you need to evaluate this, in one place"
        description="No digging through the repo required — a 60-second walkthrough, then exactly what's real versus simulated, then how it was actually built."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {STEPS.map((s, idx) => (
            <div key={s.title} className="card-premium relative rounded-2xl p-6">
              <span className="font-display text-4xl font-bold text-border">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-display text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.body}</p>
              {s.href && (
                <Link
                  href={s.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                >
                  {s.cta} <ArrowRight size={13} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="No spin"
        title="Real vs. simulated"
        description="Every claim on this site, checked against what actually runs. This table is the same one in the repo's README — it just shouldn't take opening GitHub to find it."
      >
        <div className="card-premium overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-4 text-xs font-mono uppercase tracking-widest text-muted">Claim</th>
                <th className="px-5 py-4 text-xs font-mono uppercase tracking-widest text-muted">Status</th>
                <th className="px-5 py-4 text-xs font-mono uppercase tracking-widest text-muted">Detail</th>
              </tr>
            </thead>
            <tbody>
              {HONESTY_TABLE.map((row, idx) => (
                <tr key={row.claim} className={idx !== HONESTY_TABLE.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-5 py-4 align-top font-medium text-foreground">{row.claim}</td>
                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide ${TONE_STYLE[row.tone]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-[13px] leading-relaxed text-muted">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="How it got here"
        title="Built in eight phases, each one shipped and verified"
        description="Not one push before the deadline — every phase below has its own commit, its own tests, and was checked working before the next one started."
      >
        <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((p) => (
            <div key={p.n} className="card-premium rounded-2xl p-5">
              <span className="icon-badge inline-flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-semibold text-accent">
                {p.n}
              </span>
              <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <CTA
        heading={
          <>
            Ready when you are.
            <br />
            <span className="text-gradient">Open the console and start breaking things.</span>
          </>
        }
        body="Every control on this site is real and clickable — the fastest way to evaluate Finora is to just use it."
        ctaLabel="Open the live console →"
        ctaHref="/console"
      />
    </div>
  );
}
