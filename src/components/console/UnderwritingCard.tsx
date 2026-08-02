"use client";

import { ClipboardList } from "lucide-react";
import { SAMPLE_UNDERWRITING } from "@/lib/finora/sampleTelemetry";

/**
 * Shows that the reputation score is UNDERWRITTEN, not seeded: the factor
 * breakdown that produced the starting number, straight from the telemetry
 * scorer. Judges can see exactly why the score is what it is.
 */
export function UnderwritingCard() {
  const { score, factors, summary } = SAMPLE_UNDERWRITING;

  return (
    <div className="dark-scope card-premium rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <ClipboardList size={13} className="text-accent-2" /> Underwriting breakdown
        </span>
        <span className="font-mono text-[10px] text-muted">from telemetry</span>
      </div>

      <p className="mb-3 text-[10.5px] leading-relaxed text-muted">
        Score derived from {summary.tasks} tasks · {Math.round(summary.successRate * 100)}% success ·{" "}
        {summary.violations} blocked attempts — not a seeded number.
      </p>

      <div className="space-y-1.5">
        {factors.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate text-[10.5px] text-muted" title={f.detail}>
              {f.label}
            </span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`absolute top-0 h-full rounded-full ${
                  f.points >= 0 ? "left-1/2 bg-accent" : "right-1/2 bg-danger"
                }`}
                style={{ width: `${Math.min(50, Math.abs(f.points) * 2.2)}%` }}
              />
              <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
            </div>
            <span
              className={`w-8 shrink-0 text-right font-mono text-[10.5px] ${
                f.points >= 0 ? "text-accent" : "text-danger"
              }`}
            >
              {f.points >= 0 ? "+" : ""}
              {f.points}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2">
        <span className="text-[11px] text-muted">Resulting score</span>
        <span className="font-mono text-sm font-semibold text-foreground">{score}</span>
      </div>
    </div>
  );
}
