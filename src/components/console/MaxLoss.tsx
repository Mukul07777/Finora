"use client";

import { AlertTriangle, ShieldCheck, Timer } from "lucide-react";
import { useFinoraState } from "@/lib/finora/FinoraProvider";
import { computeBondRatio } from "@/lib/finora/scoring";
import { AnimatedNumber, PulseDot } from "./motion";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * Live value-at-risk. Quantifies risk containment instead of asserting it:
 * if the agent turned adversarial right now, this is the worst the owner
 * could lose — and it visibly shrinks as the cap tightens, the bond grows,
 * or reputation rises. Turns "we contain risk" into a number a judge can
 * watch move.
 */
export function MaxLoss() {
  const state = useFinoraState();
  const limit = state.limit || 0;
  const drawn = state.balance;
  const available = Math.max(0, limit - drawn);

  const bondRatio = computeBondRatio(state.score);
  const bond = limit * bondRatio;

  // Gross exposure: the full line could be drawn and defaulted on.
  const grossExposure = Math.max(drawn, limit);
  // The bond is recoverable by the lender on default.
  const netMaxLoss = state.frozen ? Math.max(0, drawn - bond) : Math.max(0, grossExposure - bond);

  // How many payments it would take to drain the remaining line at the
  // current per-tx cap — more steps = more time for the breaker / owner to
  // catch it. This is the lever the cap slider moves.
  const drainSteps = state.perTxCap > 0 ? Math.ceil(available / state.perTxCap) : 0;

  const containedPct = grossExposure > 0 ? Math.round((1 - netMaxLoss / grossExposure) * 100) : 100;

  return (
    <div className="dark-scope card-premium rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <AlertTriangle size={13} className="text-warning" /> If the agent turned rogue now
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9.5px] font-mono uppercase ${
            state.frozen
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-accent/30 bg-accent/10 text-accent"
          }`}
        >
          <PulseDot className={state.frozen ? "bg-danger" : "bg-accent"} />
          {state.frozen ? "frozen" : "live"}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted">Max loss (value at risk)</div>
          <AnimatedNumber
            value={netMaxLoss}
            prefix="$"
            className="font-mono text-2xl font-semibold text-warning"
          />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-muted">Contained</div>
          <AnimatedNumber
            value={containedPct}
            suffix="%"
            className="font-mono text-lg font-semibold text-accent"
          />
        </div>
      </div>

      {/* exposure bar: recoverable bond (green) vs at-risk (amber) */}
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="flex h-full w-full">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${grossExposure > 0 ? (Math.min(bond, grossExposure) / grossExposure) * 100 : 0}%` }}
          />
          <div
            className="h-full bg-warning transition-all duration-500"
            style={{ width: `${grossExposure > 0 ? (netMaxLoss / grossExposure) * 100 : 0}%` }}
          />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-4 text-[9.5px] text-muted">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck size={10} className="text-accent" /> Bond recovers {money(Math.min(bond, grossExposure))}
        </span>
        <span className="inline-flex items-center gap-1">
          <AlertTriangle size={10} className="text-warning" /> At risk {money(netMaxLoss)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2/50 p-2.5">
        <Timer size={13} className="shrink-0 text-accent-2" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          At the current ${state.perTxCap} cap, draining the rest of the line takes{" "}
          <span className="font-mono text-foreground">{drainSteps}</span> payment
          {drainSteps === 1 ? "" : "s"} — every one a chance for the breaker or owner to freeze it.
          Lower the cap to widen that window.
        </p>
      </div>
    </div>
  );
}
