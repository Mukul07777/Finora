"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { CreditStatus } from "./types";

const STEP_LABELS = [
  "Verifying agent identity & owner link",
  "Pulling behavioral track record",
  "Scoring task success rate & spend pattern",
  "Computing risk-adjusted limit & APR",
];

export function CreditPanel({
  status,
  stepIndex,
  limit,
  apr,
  balance,
  frozen,
  onRequest,
  onCompleteJob,
}: {
  status: CreditStatus;
  stepIndex: number;
  limit: number;
  apr: number;
  balance: number;
  frozen: boolean;
  onRequest: () => void;
  onCompleteJob: () => void;
}) {
  const used = limit > 0 ? Math.min(100, (balance / limit) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Credit Engine
        </span>
        {status === "approved" && (
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-accent">
            Active line
          </span>
        )}
      </div>

      {status === "idle" && (
        <div>
          <p className="text-sm leading-relaxed text-muted">
            Agent requests short-term working capital to buy GPU compute for its current task.
            No contract, no collateral — just a policy-checked line of credit.
          </p>
          <button
            onClick={onRequest}
            disabled={frozen}
            className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Request ₹5,000 credit
          </button>
        </div>
      )}

      {status === "underwriting" && (
        <ul className="space-y-3">
          {STEP_LABELS.map((label, idx) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              {idx < stepIndex ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : idx === stepIndex ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent-2">
                  <Loader2 size={12} className="animate-spin" />
                </span>
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border border-border" />
              )}
              <span className={idx <= stepIndex ? "text-foreground" : "text-muted"}>{label}</span>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {status === "approved" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              <Metric label="Limit" value={`₹${limit.toLocaleString("en-IN")}`} />
              <Metric label="APR" value={`${apr}%`} />
              <Metric label="Outstanding" value={`₹${balance.toLocaleString("en-IN")}`} />
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[11px] text-muted">
                <span>Utilization</span>
                <span>{used.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                  initial={{ width: 0 }}
                  animate={{ width: `${used}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <button
              onClick={onCompleteJob}
              disabled={frozen || balance <= 0}
              className="mt-5 w-full rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {balance <= 0 ? "Loan fully repaid" : "Complete job → auto-repay from revenue"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 py-3">
      <div className="font-mono text-sm font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}
