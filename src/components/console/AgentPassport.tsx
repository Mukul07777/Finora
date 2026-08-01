"use client";

import { Bot } from "lucide-react";
import { ScoreGauge } from "./ScoreGauge";

export function AgentPassport({
  frozen,
  score,
  tier,
}: {
  frozen: boolean;
  score: number;
  tier: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Agent Passport
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest ${
            frozen
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              frozen ? "bg-danger animate-blink" : "bg-accent"
            }`}
          />
          {frozen ? "Frozen" : "Active"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent-2">
          <Bot size={26} strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-semibold text-foreground">
            agent.procure-01
          </div>
          <div className="truncate font-mono text-xs text-muted">
            did:finora:9f21a7…c4a8
          </div>
          <div className="mt-1 truncate text-xs text-muted">
            owner: <span className="text-foreground">Aarav Mehta (verified)</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-5 border-t border-border pt-6">
        <ScoreGauge score={score} />
        <div className="space-y-2 text-xs">
          <Row label="Trust tier" value={tier} />
          <Row label="Tasks completed" value="482" />
          <Row label="Success rate" value="98.2%" />
          <Row label="Refund ratio" value="0.4%" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-muted">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
