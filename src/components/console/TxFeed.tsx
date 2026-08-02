"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Ban, Loader2, XCircle } from "lucide-react";
import { Tx } from "./types";

const ICONS: Record<Tx["status"], React.ComponentType<{ size?: number; className?: string }>> = {
  pending: Loader2,
  approved: ArrowUpRight,
  blocked: Ban,
  cancelled: XCircle,
  repayment: ArrowDownLeft,
};

const STYLES: Record<Tx["status"], string> = {
  pending: "text-warning bg-warning/10",
  approved: "text-accent bg-accent/10",
  blocked: "text-danger bg-danger/10",
  cancelled: "text-warning bg-warning/10",
  repayment: "text-accent-2 bg-accent-2/10",
};

export function TxFeed({ txs }: { txs: Tx[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Live Transaction Feed
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-accent">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" />
          streaming
        </span>
      </div>

      <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
        {txs.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            No activity yet — request credit to activate the agent&apos;s wallet.
          </p>
        )}
        <AnimatePresence initial={false}>
          {txs.map((tx) => {
            const Icon = ICONS[tx.status];
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${STYLES[tx.status]}`}>
                  <Icon size={15} className={tx.status === "pending" ? "animate-spin" : undefined} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-foreground">{tx.label}</span>
                    <span className="shrink-0 font-mono text-sm text-foreground">
                      ${tx.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[11px] text-muted">
                      {tx.counterparty}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{tx.time}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted">{tx.note}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
