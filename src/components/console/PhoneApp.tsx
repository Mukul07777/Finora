"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Bell,
  Fingerprint,
  Home,
  ListChecks,
  Loader2,
  Power,
  Radio,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  XCircle,
  Zap,
} from "lucide-react";
import { ScoreGauge } from "./ScoreGauge";
import type { PhoneNotif, Tx } from "./types";
import { useFinoraActions, useFinoraState } from "@/lib/finora/FinoraProvider";
import { MAX_PER_TX_CAP, MIN_PER_TX_CAP, type CreditStatus } from "@/lib/finora/types";

type Tab = "home" | "activity" | "alerts" | "agent";

function timeNow() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

const TX_ICONS: Record<Tx["status"], React.ComponentType<{ size?: number; className?: string }>> = {
  pending: Loader2,
  approved: ArrowUpRight,
  blocked: Ban,
  cancelled: XCircle,
  repayment: ArrowDownLeft,
};
const TX_STYLES: Record<Tx["status"], string> = {
  pending: "text-amber-400 bg-amber-400/10",
  approved: "text-emerald-400 bg-emerald-400/10",
  blocked: "text-red-400 bg-red-400/10",
  cancelled: "text-amber-400 bg-amber-400/10",
  repayment: "text-sky-400 bg-sky-400/10",
};

const NOTIF_ICONS: Record<PhoneNotif["tone"], React.ComponentType<{ size?: number; className?: string }>> = {
  ok: ShieldCheck,
  warn: TriangleAlert,
  danger: ShieldAlert,
};
const NOTIF_RING: Record<PhoneNotif["tone"], string> = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  danger: "text-red-400",
};

/**
 * A fully interactive mobile app running inside a phone frame — tap
 * through it directly, it doesn't just mirror console notifications.
 * It shares one FinoraProvider instance with the console above it, so
 * both surfaces are live views of the same agent: pull the kill switch
 * here and the console freezes too, and vice versa.
 */
export function PhoneApp() {
  const state = useFinoraState();
  const actions = useFinoraActions();
  const { frozen, score, creditStatus, limit, apr, balance, txs, perTxCap } = state;
  const underwriting = creditStatus === ("underwriting" as CreditStatus);

  const [tab, setTab] = useState<Tab>("home");
  const [notifs, setNotifs] = useState<PhoneNotif[]>([]);
  const [toast, setToast] = useState<PhoneNotif | null>(null);
  const [clock, setClock] = useState("--:--");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Placeholder "--:--" is rendered on mount (matches SSR) to avoid a
    // hydration mismatch against the server's clock; corrected here once
    // mounted, same pattern as ThemeToggle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock(timeNow());
    const clockId = setInterval(() => setClock(timeNow()), 30000);
    return () => clearInterval(clockId);
  }, []);

  // Mirrors shared notifications into this screen's own list + toast —
  // presentation only, the underlying agent state lives in FinoraProvider.
  // An effect because it schedules a real toast-dismiss timeout.
  useEffect(() => {
    const latest = state.notifications[0];
    if (!latest) return;
    const notif: PhoneNotif = { id: latest.id, title: latest.title, body: latest.body, tone: latest.tone };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifs((prev) => (prev[0]?.id === notif.id ? prev : [notif, ...prev].slice(0, 20)));
    setToast(notif);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((cur) => (cur?.id === notif.id ? null : cur)), 3200);
  }, [state.notifications]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const tier = score >= 85 ? "Trusted" : score >= 60 ? "Established" : "New";

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "activity", label: "Activity", icon: ListChecks },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "agent", label: "Agent", icon: Fingerprint },
  ];

  return (
    <div className="mx-auto w-[270px] select-none">
      <div className="relative rounded-[2.6rem] border-[6px] border-black bg-black p-1.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
        <div className="relative flex h-[560px] w-full flex-col overflow-hidden rounded-[2.1rem] bg-[#0a0d16]">
          <div className="absolute left-1/2 top-2 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          <div className="relative z-10 flex items-center justify-between px-5 pt-3 text-[10px] font-medium text-white/80">
            <span>{clock}</span>
            <span className="h-2.5 w-3.5 rounded-[2px] border border-white/60" />
          </div>

          <div className="relative z-10 flex items-center justify-between px-5 pb-2 pt-2">
            <span className="font-display text-sm font-semibold text-white">Finora</span>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide ${
                frozen ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${frozen ? "bg-red-400 animate-blink" : "bg-emerald-400"}`} />
              {frozen ? "Frozen" : "Active"}
            </span>
          </div>

          {/* toast */}
          <div className="pointer-events-none absolute left-0 right-0 top-14 z-40 flex justify-center px-3">
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: -14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-xl"
                >
                  <div className="flex items-start gap-2.5">
                    {(() => {
                      const Icon = NOTIF_ICONS[toast.tone];
                      return (
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/15">
                          <Icon size={13} className={NOTIF_RING[toast.tone]} />
                        </span>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-white">{toast.title}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-white/70">{toast.body}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* screen content */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "home" && (
                  <HomeScreen
                    frozen={frozen}
                    score={score}
                    tier={tier}
                    creditStatus={creditStatus}
                    underwriting={underwriting}
                    limit={limit}
                    apr={apr}
                    balance={balance}
                    onRequestCredit={actions.requestCredit}
                    onPay={actions.sendPayment}
                    onRogue={actions.simulateRogue}
                    onFreeze={actions.toggleFreeze}
                    onRepay={actions.completeJob}
                  />
                )}
                {tab === "activity" && <ActivityScreen txs={txs} />}
                {tab === "alerts" && <AlertsScreen notifs={notifs} />}
                {tab === "agent" && (
                  <AgentScreen score={score} tier={tier} perTxCap={perTxCap} onUpdatePolicy={actions.updatePolicy} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* bottom tab bar */}
          <div className="relative z-20 flex items-center justify-around border-t border-white/10 bg-black/40 px-2 pb-4 pt-2 backdrop-blur">
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="relative flex flex-col items-center gap-1 px-2 py-1"
                >
                  <Icon size={17} className={active ? "text-white" : "text-white/40"} />
                  <span className={`text-[9px] ${active ? "text-white" : "text-white/40"}`}>{t.label}</span>
                  {t.id === "alerts" && notifs.length > 0 && (
                    <span className="absolute -top-0.5 right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-semibold text-white">
                      {notifs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted">
        A working phone app — tap through it. Its own state, its own kill switch.
      </p>
    </div>
  );
}

// --- Screens ------------------------------------------------------------

function HomeScreen({
  frozen,
  score,
  tier,
  creditStatus,
  underwriting,
  limit,
  apr,
  balance,
  onRequestCredit,
  onPay,
  onRogue,
  onFreeze,
  onRepay,
}: {
  frozen: boolean;
  score: number;
  tier: string;
  creditStatus: CreditStatus;
  underwriting: boolean;
  limit: number;
  apr: number;
  balance: number;
  onRequestCredit: () => void;
  onPay: () => void;
  onRogue: () => void;
  onFreeze: () => void;
  onRepay: () => void;
}) {
  const creditActive = creditStatus === "approved";
  const used = limit > 0 ? Math.min(100, (balance / limit) * 100) : 0;

  return (
    <div className="space-y-3 pb-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold text-white">agent.procure-01</div>
            <div className="text-[10px] text-white/50">{tier} · score {score}</div>
          </div>
          <ScoreGauge score={score} size={44} />
        </div>
      </div>

      <button
        onClick={onFreeze}
        className={`flex w-full items-center justify-between rounded-2xl border p-3.5 transition-colors ${
          frozen ? "border-red-500/40 bg-red-500/10" : "border-white/10 bg-white/[0.04]"
        }`}
      >
        <div className="text-left">
          <div className="text-[12px] font-semibold text-white">{frozen ? "Agent frozen" : "Kill switch"}</div>
          <div className="text-[10px] text-white/50">{frozen ? "Tap to reinstate" : "Tap to freeze instantly"}</div>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${frozen ? "border-red-400 text-red-400" : "border-red-400/60 text-red-400"}`}>
          <Power size={16} />
        </span>
      </button>

      {creditStatus === "idle" && !underwriting && (
        <button
          onClick={onRequestCredit}
          disabled={frozen}
          className="w-full rounded-2xl bg-emerald-400 py-3 text-[12px] font-semibold text-black disabled:opacity-40"
        >
          Request $5,000 credit
        </button>
      )}

      {underwriting && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-[11px] text-white/70">
          <Loader2 size={14} className="animate-spin text-emerald-400" />
          Underwriting agent…
        </div>
      )}

      {creditActive && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Limit" value={`$${limit.toLocaleString("en-IN")}`} />
            <MiniStat label="APR" value={`${apr}%`} />
            <MiniStat label="Owed" value={`$${balance.toLocaleString("en-IN")}`} />
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${used}%` }} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={onPay}
              disabled={frozen}
              className="flex items-center justify-center gap-1 rounded-xl border border-white/10 py-2.5 text-[10.5px] text-white disabled:opacity-40"
            >
              <Zap size={12} /> Pay vendor
            </button>
            <button
              onClick={onRogue}
              disabled={frozen}
              className="flex items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-500/5 py-2.5 text-[10.5px] text-red-400 disabled:opacity-40"
            >
              <Radio size={12} /> Try blocked pay
            </button>
          </div>

          {balance > 0 && (
            <button
              onClick={onRepay}
              disabled={frozen}
              className="mt-2 w-full rounded-xl border border-white/10 py-2.5 text-[10.5px] text-white disabled:opacity-40"
            >
              Complete job → auto-repay
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] font-semibold text-white">{value}</div>
      <div className="text-[8.5px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}

function ActivityScreen({ txs }: { txs: Tx[] }) {
  return (
    <div className="space-y-2 pb-4 pt-1">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">Activity</div>
      {txs.length === 0 && (
        <p className="py-10 text-center text-[11px] text-white/40">No transactions yet.</p>
      )}
      {txs.map((tx) => {
        const Icon = TX_ICONS[tx.status];
        return (
          <div key={tx.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TX_STYLES[tx.status]}`}>
              <Icon size={13} className={tx.status === "pending" ? "animate-spin" : undefined} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-white">{tx.label}</span>
                <span className="shrink-0 font-mono text-[11px] text-white">${tx.amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="truncate text-[9.5px] text-white/40">{tx.note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlertsScreen({ notifs }: { notifs: PhoneNotif[] }) {
  return (
    <div className="space-y-2 pb-4 pt-1">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">Alerts</div>
      {notifs.length === 0 && (
        <p className="py-10 text-center text-[11px] text-white/40">No alerts yet.</p>
      )}
      {notifs.map((n) => {
        const Icon = NOTIF_ICONS[n.tone];
        return (
          <div key={n.id} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Icon size={13} className={NOTIF_RING[n.tone]} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-white">{n.title}</div>
              <div className="mt-0.5 text-[10px] leading-snug text-white/50">{n.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentScreen({
  score,
  tier,
  perTxCap,
  onUpdatePolicy,
}: {
  score: number;
  tier: string;
  perTxCap: number;
  onUpdatePolicy: (perTxCap: number) => void;
}) {
  return (
    <div className="space-y-3 pb-4 pt-1">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">Agent Passport</div>
      <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <ScoreGauge score={score} size={72} />
        <div className="mt-3 text-[12px] font-semibold text-white">agent.procure-01</div>
        <div className="font-mono text-[9.5px] text-white/40">did:finora:9f21a7…c4a8</div>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-[10.5px]">
        <Row label="Trust tier" value={tier} />
        <Row label="Owner" value="Aarav Mehta ✓" />
        <Row label="Tasks completed" value="482" />
        <Row label="Success rate" value="98.2%" />
        <Row label="Refund ratio" value="0.4%" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="mb-2 flex items-center justify-between text-[10.5px]">
          <span className="uppercase tracking-wide text-white/50">Owner: per-tx cap</span>
          <span className="font-mono text-white">${perTxCap.toLocaleString("en-IN")}</span>
        </div>
        <input
          type="range"
          min={MIN_PER_TX_CAP}
          max={MAX_PER_TX_CAP}
          step={50}
          value={perTxCap}
          onChange={(e) => onUpdatePolicy(Number(e.target.value))}
          aria-label="Per-transaction spend cap"
          className="w-full accent-emerald-400"
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{label}</span>
      <span className="font-mono text-white">{value}</span>
    </div>
  );
}
