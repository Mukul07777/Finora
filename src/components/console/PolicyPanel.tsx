"use client";

import { SlidersHorizontal } from "lucide-react";
import { MAX_PER_TX_CAP, MIN_PER_TX_CAP } from "@/lib/finora/types";

export function PolicyPanel({
  perTxCap,
  onChange,
}: {
  perTxCap: number;
  onChange: (perTxCap: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Owner Policy Controls
        </span>
        <SlidersHorizontal size={16} className="text-accent-2" />
      </div>

      <div className="mb-1.5 flex justify-between text-[11px] text-muted">
        <span>Per-transaction cap</span>
        <span className="font-mono text-foreground">${perTxCap.toLocaleString("en-IN")}</span>
      </div>
      <input
        type="range"
        min={MIN_PER_TX_CAP}
        max={MAX_PER_TX_CAP}
        step={50}
        value={perTxCap}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Per-transaction spend cap"
        className="w-full accent-accent"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>${MIN_PER_TX_CAP.toLocaleString("en-IN")}</span>
        <span>${MAX_PER_TX_CAP.toLocaleString("en-IN")}</span>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Enforced on the agent&apos;s very next payment attempt — the same rule as{" "}
        <code className="font-mono text-foreground">perTxLimit</code> in{" "}
        <code className="font-mono text-foreground">AgentWallet.sol</code>, tunable live here
        instead of fixed at deployment.
      </p>
    </div>
  );
}
