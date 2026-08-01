"use client";

import { Power } from "lucide-react";

export function KillSwitchCard({
  frozen,
  onToggle,
}: {
  frozen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 transition-colors ${
        frozen ? "border-danger/40 bg-danger/[0.06]" : "border-border bg-surface"
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Owner Kill Switch
        </span>
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${
            frozen ? "text-danger" : "text-muted"
          }`}
        >
          {frozen ? "engaged" : "standby"}
        </span>
      </div>

      <div className="flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          aria-label={frozen ? "Reinstate agent" : "Freeze agent"}
          className="relative flex h-24 w-24 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        >
          {!frozen && (
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-danger/40" />
          )}
          <span
            className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 ${
              frozen
                ? "border-danger bg-danger/20 text-danger"
                : "border-danger/70 bg-danger/10 text-danger glow-danger"
            }`}
          >
            <Power size={30} strokeWidth={2} />
          </span>
        </button>
        <p className="mt-5 max-w-[220px] text-center text-xs leading-relaxed text-muted">
          {frozen
            ? "Agent is frozen. All pending and future transactions are cancelled instantly, independent of the agent's cooperation."
            : "Enforced at the wallet layer — this can halt the agent mid-transaction, at any point, with no legal process required."}
        </p>
        <span className="mt-4 text-xs font-medium text-foreground">
          {frozen ? "Click to reinstate agent" : "Click to freeze agent"}
        </span>
      </div>
    </div>
  );
}
