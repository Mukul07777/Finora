"use client";

import { useEffect, useMemo, useState } from "react";
import { Network, ShieldAlert, ShieldCheck } from "lucide-react";
import { detectCollusion, authenticityAdjustedScore, PaymentEdge } from "@/lib/finora/collusion";
import { SAMPLE_LEDGER, DEMO_AGENTS } from "@/lib/finora/sampleLedger";
import { fetchAgentIds, fetchPayments, supabaseConfigured } from "@/lib/finora/supabaseClient";
import { AnimatedBar } from "./motion";

/**
 * Reputation authenticity — the defense against wash trading. Runs the
 * collusion detector over the payment ledger and shows which agents earn
 * real external revenue versus which pump their scores by paying each other
 * in circles. A high score built on fake revenue is visibly discounted.
 */
export function CollusionCard() {
  const [ledger, setLedger] = useState<PaymentEdge[]>(SAMPLE_LEDGER);
  const [agents, setAgents] = useState<string[]>(DEMO_AGENTS);
  const [live, setLive] = useState(false);

  // Prefer real Supabase data when configured; otherwise the seeded sample.
  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const [pays, ids] = await Promise.all([fetchPayments(), fetchAgentIds()]);
      if (cancelled || pays.length === 0 || ids.length === 0) return;
      setLedger(pays);
      setAgents(ids);
      setLive(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo(() => detectCollusion(ledger, agents), [ledger, agents]);

  return (
    <div className="dark-scope card-premium rounded-2xl p-5">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Network size={13} className="text-violet" /> Reputation authenticity
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[8.5px] font-mono uppercase ${
              live ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-surface-2 text-muted"
            }`}
          >
            {live ? "live" : "seed"}
          </span>
          {report.rings.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-[9.5px] font-mono uppercase text-danger">
              <ShieldAlert size={10} /> {report.rings.length} ring{report.rings.length > 1 ? "s" : ""}
            </span>
          )}
        </span>
      </div>
      <p className="mb-3 text-[10.5px] leading-relaxed text-muted">
        Agents can fake revenue by paying each other in circles to pump scores. This graph check
        discounts self-dealt revenue — real lenders should trust the adjusted number.
      </p>

      <div className="space-y-2.5">
        {report.findings
          .slice()
          .sort((a, b) => b.authenticity - a.authenticity)
          .map((f) => {
            const clean = f.authenticity >= 70;
            const rawScore = f.agent === "agent.procure-01" ? 83 : 90;
            const adjusted = authenticityAdjustedScore(rawScore, f.authenticity);
            return (
              <div key={f.agent} className="rounded-lg border border-border bg-surface-2/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 truncate font-mono text-[10.5px] text-foreground">
                    {clean ? (
                      <ShieldCheck size={11} className="text-accent" />
                    ) : (
                      <ShieldAlert size={11} className="text-danger" />
                    )}
                    {f.agent}
                  </span>
                  <span className={`font-mono text-[10.5px] ${clean ? "text-accent" : "text-danger"}`}>
                    {f.authenticity}% real
                  </span>
                </div>

                <div className="mt-1.5">
                  <AnimatedBar
                    pct={f.authenticity}
                    className={clean ? "bg-accent" : "bg-danger"}
                    track="bg-surface"
                    height="h-1.5"
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-muted">
                  <span>{f.reasons[0]}</span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[9.5px]">
                  <span className="text-muted">
                    ext {money(f.externalRevenue)} · internal {money(f.internalRevenue)}
                  </span>
                  <span className="font-mono text-muted">
                    score {rawScore} →{" "}
                    <span className={clean ? "text-accent" : "text-danger"}>{adjusted}</span>
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}
