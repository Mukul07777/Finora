"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Zap } from "lucide-react";
import { useFinoraActions, useFinoraState } from "@/lib/finora/FinoraProvider";
import {
  AUTOPILOT_MAX_ACTIONS,
  AUTOPILOT_TICK_MS,
  AutopilotDecision,
  AutopilotSnapshot,
} from "@/lib/finora/autopilot";

interface LogEntry {
  id: string;
  time: string;
  action: AutopilotDecision["action"];
  reasoning: string;
}

const ACTION_LABEL: Record<AutopilotDecision["action"], string> = {
  requestCredit: "Request credit",
  sendPayment: "Send payment",
  completeJob: "Complete job",
  wait: "Wait",
};

/**
 * A real LLM (Groq) decides the agent's next move every tick — request
 * credit, spend, repay, or wait — by calling POST /api/agent/decide with
 * a snapshot of current state. This component only ever calls the same
 * useFinoraActions() functions a human clicking buttons would call; the
 * actual outcome (allowed, blocked, pending) is enforced identically
 * either way and shows up in the transaction feed, not here. Autopilot
 * decides; it does not enforce.
 */
export function AgentAutopilot() {
  const state = useFinoraState();
  const actions = useFinoraActions();

  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [actionsTaken, setActionsTaken] = useState(0);
  const [provider, setProvider] = useState<"lyzr" | "groq" | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // busy/actionsTaken read inside the interval closure below, which is
  // only recreated when `enabled` changes — a ref keeps these checks
  // reading the latest value instead of whatever they were when the
  // interval started.
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = busy;
  });
  const actionsTakenRef = useRef(actionsTaken);
  useEffect(() => {
    actionsTakenRef.current = actionsTaken;
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      if (cancelled || busyRef.current) return;
      if (actionsTakenRef.current >= AUTOPILOT_MAX_ACTIONS) {
        setEnabled(false);
        setError(`Session limit reached (${AUTOPILOT_MAX_ACTIONS} actions) — stopped to keep the demo API usage bounded.`);
        return;
      }

      setBusy(true);
      const s = stateRef.current;
      const snapshot: AutopilotSnapshot = {
        creditStatus: s.creditStatus,
        score: s.score,
        limit: s.limit,
        apr: s.apr,
        balance: s.balance,
        perTxCap: s.perTxCap,
        frozen: s.frozen,
        recentTx: s.txs.slice(0, 3).map((t) => ({ label: t.label, status: t.status, amount: t.amount })),
      };

      try {
        const res = await fetch("/api/agent/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        const body = await res.json();

        if (!body.ok) {
          setEnabled(false);
          setError(body.error || "Autopilot request failed.");
          return;
        }

        if (body.provider === "lyzr" || body.provider === "groq") setProvider(body.provider);
        const decision: AutopilotDecision = body.decision;
        setLog((prev) =>
          [
            {
              id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              time: new Date().toLocaleTimeString("en-IN", { hour12: false }),
              action: decision.action,
              reasoning: decision.reasoning,
            },
            ...prev,
          ].slice(0, 8)
        );
        setActionsTaken((n) => n + 1);

        switch (decision.action) {
          case "requestCredit":
            actions.requestCredit();
            break;
          case "sendPayment":
            actions.sendPayment();
            break;
          case "completeJob":
            actions.completeJob();
            break;
          case "wait":
            break;
        }
      } catch (err) {
        setEnabled(false);
        setError(err instanceof Error ? err.message : "Autopilot request failed.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, AUTOPILOT_TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  function toggle() {
    setError(null);
    setEnabled((v) => !v);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-muted">
          Agent Autopilot
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted">
          <Bot size={13} /> {provider === "lyzr" ? "Lyzr Agent" : provider === "groq" ? "Groq LLM" : "AI agent"}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Optional: let a real model (not a script) decide the agent&apos;s next move — request
        credit, spend, repay, or wait — every {Math.round(AUTOPILOT_TICK_MS / 1000)}s. Whatever it
        decides still goes through the exact same policy checks as a human clicking these
        buttons.
      </p>

      <button
        onClick={toggle}
        disabled={busy && !enabled}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled
            ? "border border-accent/40 bg-accent/10 text-accent"
            : "bg-accent text-background hover:scale-[1.01]"
        }`}
      >
        {busy && enabled ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        {enabled ? "Autopilot running — click to stop" : "Turn on autopilot"}
      </button>

      {error && (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] leading-relaxed text-danger">
          {error}
        </p>
      )}

      {log.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {log.map((entry) => (
            <li key={entry.id} className="text-[11px] leading-relaxed">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-medium text-foreground">
                  {ACTION_LABEL[entry.action]}
                </span>
                <span className="font-mono text-muted">{entry.time}</span>
              </div>
              <p className="mt-0.5 text-muted">{entry.reasoning}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
