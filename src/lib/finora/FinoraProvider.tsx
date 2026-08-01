"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { finoraReducer, initialFinoraState } from "./reducer";
import { ALLOWLIST, FinoraState, UNDERWRITING_STEPS } from "./types";

function timeNow() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Date.now()}`;
}

interface FinoraActions {
  requestCredit: () => void;
  sendPayment: () => void;
  simulateRogue: () => void;
  toggleFreeze: () => void;
  completeJob: () => void;
}

const FinoraStateContext = createContext<FinoraState | null>(null);
const FinoraActionsContext = createContext<FinoraActions | null>(null);

/**
 * Owns one shared agent session. Console and PhoneApp both read from and
 * act on this same instance — freezing the agent from the phone freezes
 * the console above it, because it is the same agent, not two demos.
 */
export function FinoraProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(finoraReducer, initialFinoraState);

  // Timer callbacks close over stale state on the render they were
  // scheduled in; stateRef always reflects the latest state instead.
  const stateRef = useRef(state);
  stateRef.current = state;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const requestCredit = useCallback(() => {
    if (stateRef.current.creditStatus !== "idle") return;
    dispatch({ type: "CREDIT_REQUEST_STARTED" });

    for (let i = 1; i <= UNDERWRITING_STEPS; i++) {
      const t = setTimeout(() => dispatch({ type: "CREDIT_UNDERWRITING_STEP", step: i }), i * 650);
      timers.current.push(t);
    }

    const done = setTimeout(() => {
      dispatch({
        type: "CREDIT_APPROVED",
        limit: 8200,
        apr: 14.2,
        notification: {
          id: nextId("notif"),
          tone: "ok",
          title: "Credit approved",
          body: "₹8,200 line issued at 14.2% APR",
          time: timeNow(),
        },
      });
    }, (UNDERWRITING_STEPS + 1) * 650);
    timers.current.push(done);
  }, []);

  const sendPayment = useCallback(() => {
    const s = stateRef.current;
    if (s.frozen || s.creditStatus !== "approved") return;

    const merchant = ALLOWLIST[Math.floor(Math.random() * ALLOWLIST.length)];
    const amount = Math.round(80 + Math.random() * 370);
    const remaining = s.limit - s.balance;

    if (amount > remaining) {
      dispatch({
        type: "PAYMENT_BLOCKED",
        tx: {
          id: nextId("tx"),
          time: timeNow(),
          label: "Payment attempt",
          counterparty: merchant,
          amount,
          status: "blocked",
          note: "Blocked — exceeds available credit headroom",
        },
        notification: {
          id: nextId("notif"),
          tone: "warn",
          title: "Payment blocked",
          body: `₹${amount.toLocaleString("en-IN")} exceeded available credit`,
          time: timeNow(),
        },
      });
      return;
    }

    dispatch({
      type: "PAYMENT_APPROVED",
      amount,
      tx: {
        id: nextId("tx"),
        time: timeNow(),
        label: "Task expense",
        counterparty: merchant,
        amount,
        status: "approved",
        note: "Within policy · counterparty allowlisted",
      },
    });
  }, []);

  const simulateRogue = useCallback(() => {
    const s = stateRef.current;
    if (s.frozen || s.creditStatus !== "approved") return;

    dispatch({
      type: "ROGUE_BLOCKED",
      tx: {
        id: nextId("tx"),
        time: timeNow(),
        label: "Payment attempt",
        counterparty: "wallet_x02.unknown",
        amount: 4000,
        status: "blocked",
        note: "Blocked — counterparty not allowlisted",
      },
      notification: {
        id: nextId("notif"),
        tone: "danger",
        title: "Security alert",
        body: "Anomaly detected — spend velocity spike (risk 0.91)",
        time: timeNow(),
      },
    });
  }, []);

  const toggleFreeze = useCallback(() => {
    const willFreeze = !stateRef.current.frozen;

    dispatch({
      type: "FREEZE_TOGGLED",
      tx: willFreeze
        ? {
            id: nextId("tx"),
            time: timeNow(),
            label: "In-flight transfer",
            counterparty: "api.compute.gpu",
            amount: 260,
            status: "cancelled",
            note: "Cancelled mid-execution by owner kill switch",
          }
        : null,
      notification: {
        id: nextId("notif"),
        tone: willFreeze ? "danger" : "ok",
        title: willFreeze ? "Agent frozen" : "Agent reinstated",
        body: willFreeze ? "All pending & future transactions cancelled" : "Policies re-armed",
        time: timeNow(),
      },
    });
  }, []);

  const completeJob = useCallback(() => {
    const s = stateRef.current;
    if (s.frozen || s.balance <= 0) return;

    const revenue = s.balance + 2200;
    dispatch({
      type: "JOB_COMPLETED",
      tx: {
        id: nextId("tx"),
        time: timeNow(),
        label: "Task revenue received",
        counterparty: "client.settlement",
        amount: revenue,
        status: "repayment",
        note: `Auto-repaid outstanding balance of ₹${s.balance.toLocaleString("en-IN")}`,
      },
      notification: {
        id: nextId("notif"),
        tone: "ok",
        title: "Loan repaid",
        body: "Balance auto-cleared from task revenue",
        time: timeNow(),
      },
    });
  }, []);

  const actions = useMemo<FinoraActions>(
    () => ({ requestCredit, sendPayment, simulateRogue, toggleFreeze, completeJob }),
    [requestCredit, sendPayment, simulateRogue, toggleFreeze, completeJob]
  );

  return (
    <FinoraActionsContext.Provider value={actions}>
      <FinoraStateContext.Provider value={state}>{children}</FinoraStateContext.Provider>
    </FinoraActionsContext.Provider>
  );
}

export function useFinoraState() {
  const ctx = useContext(FinoraStateContext);
  if (!ctx) throw new Error("useFinoraState must be used within a FinoraProvider");
  return ctx;
}

export function useFinoraActions() {
  const ctx = useContext(FinoraActionsContext);
  if (!ctx) throw new Error("useFinoraActions must be used within a FinoraProvider");
  return ctx;
}
