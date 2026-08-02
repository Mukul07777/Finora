"use client";

import { Power, ExternalLink } from "lucide-react";

// Real transaction from `npm run demo:live` (onchain/scripts/proveSepolia.ts)
// — the owner's actual pause() call against the deployed Sepolia AgentWallet.
// See src/components/LiveTransactionProof.tsx for the full proof set.
const REAL_PAUSE_TX =
  "https://sepolia.etherscan.io/tx/0xda934331e4a6ed3181deb9198028897d913e48a2c1eab3b131a6cfd28cea0a4f";

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

        {frozen && (
          <a
            href={REAL_PAUSE_TX}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-[10.5px] text-accent transition hover:bg-accent/10"
          >
            This exact action already happened for real on Sepolia
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}
