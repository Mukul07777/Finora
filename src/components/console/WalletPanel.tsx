"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap, Skull } from "lucide-react";

export function WalletPanel({
  spendUsed,
  spendLimit,
  allowlist,
  frozen,
  creditActive,
  onSendPayment,
  onSimulateRogue,
}: {
  spendUsed: number;
  spendLimit: number;
  allowlist: string[];
  frozen: boolean;
  creditActive: boolean;
  onSendPayment: () => void;
  onSimulateRogue: () => void;
}) {
  const pct = spendLimit > 0 ? Math.min(100, (spendUsed / spendLimit) * 100) : 0;
  const disabled = frozen || !creditActive;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Wallet Enforcement Layer
        </span>
        <ShieldCheck size={16} className="text-accent-2" />
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-[11px] text-muted">
          <span>Spend this cycle</span>
          <span>
            ${spendUsed.toLocaleString("en-IN")} / ${spendLimit.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className={`h-full rounded-full ${
              pct > 85 ? "bg-warning" : "bg-gradient-to-r from-accent-2 to-accent"
            }`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-muted">
          Allowlisted counterparties
        </div>
        <div className="flex flex-wrap gap-2">
          {allowlist.map((a) => (
            <span
              key={a}
              className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-foreground"
            >
              {a}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={onSendPayment}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Zap size={13} /> Send allowed payment
        </button>
        <button
          onClick={onSimulateRogue}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-danger/30 bg-danger/5 py-3 text-xs font-medium text-danger transition-colors hover:border-danger/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Skull size={13} /> Simulate rogue spend
        </button>
      </div>
      {!creditActive && (
        <p className="mt-3 text-center text-[11px] text-muted">
          Approve a credit line first to activate the wallet.
        </p>
      )}
    </div>
  );
}
