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
  useState,
} from "react";
import { finoraReducer, initialFinoraState } from "./reducer";
import { FinoraAdapter, isAbortError } from "./adapter";
import { simulationAdapter } from "./adapters/simulationAdapter";
import { computeCreditTerms, computeRogueScorePenalty } from "./scoring";
import { FinoraState, Tx } from "./types";

function timeNow() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Date.now()}`;
}

function buildTx(fields: Omit<Tx, "id" | "time" | "timestamp">): Tx {
  return { ...fields, id: nextId("tx"), time: timeNow(), timestamp: Date.now() };
}

interface FinoraActions {
  requestCredit: () => void;
  sendPayment: () => void;
  simulateRogue: () => void;
  toggleFreeze: () => void;
  completeJob: () => void;
  updatePolicy: (perTxCap: number) => void;
}

const FinoraStateContext = createContext<FinoraState | null>(null);
const FinoraActionsContext = createContext<FinoraActions | null>(null);

/**
 * Owns one shared agent session. Console and PhoneApp both read from and
 * act on this same instance — freezing the agent from the phone freezes
 * the console above it, because it is the same agent, not two demos.
 *
 * The `adapter` prop is the seam between this component and where credit
 * decisions / payment outcomes actually come from. Defaults to
 * `simulationAdapter` (timers + randomness, labeled "Simulation Mode" in
 * the UI). A future OnchainAdapter that calls AgentWallet.sol through a
 * connected wallet would implement the same FinoraAdapter interface —
 * nothing below this line, the reducer, or any consuming component would
 * need to change.
 */
export function FinoraProvider({
  children,
  adapter = simulationAdapter,
}: {
  children: ReactNode;
  adapter?: FinoraAdapter;
}) {
  const [state, dispatch] = useReducer(finoraReducer, initialFinoraState);

  // Async action callbacks close over stale state on the render they were
  // created in; stateRef always reflects the latest state instead. Synced
  // in an effect (runs after every commit) rather than during render.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // One AbortController for the provider's lifetime — every in-flight
  // adapter call is cancelled on unmount instead of dispatching into a
  // torn-down tree. Lazy useState initializer instead of a ref so it's
  // created exactly once without touching a ref during render.
  const [controller] = useState(() => new AbortController());
  useEffect(() => {
    return () => controller.abort();
  }, [controller]);

  const requestCredit = useCallback(async () => {
    if (stateRef.current.creditStatus !== "idle") return;
    dispatch({ type: "CREDIT_REQUEST_STARTED" });

    try {
      const signal = controller.signal;
      await adapter.requestCredit((step) => dispatch({ type: "CREDIT_UNDERWRITING_STEP", step }), signal);

      // Terms are computed by the reducer from current score — mirror that
      // same computation here only to word the notification; the applied
      // values are whatever the reducer derives, not this one.
      const terms = computeCreditTerms(stateRef.current.score);
      dispatch({
        type: "CREDIT_APPROVED",
        notification: {
          id: nextId("notif"),
          tone: "ok",
          title: "Credit approved",
          body: `₹${terms.limit.toLocaleString("en-IN")} line issued at ${terms.apr}% APR`,
          time: timeNow(),
        },
      });
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [adapter, controller]);

  const sendPayment = useCallback(async () => {
    const s = stateRef.current;
    if (s.frozen || s.creditStatus !== "approved") return;

    try {
      const result = await adapter.attemptPayment(s, controller.signal);

      if (!result.allowed) {
        dispatch({
          type: "PAYMENT_BLOCKED",
          tx: buildTx({
            label: "Payment attempt",
            counterparty: result.merchant,
            amount: result.amount,
            status: "blocked",
            note: result.reason ?? "Blocked by policy",
          }),
          notification: {
            id: nextId("notif"),
            tone: "warn",
            title: "Payment blocked",
            body: result.reason ?? `₹${result.amount.toLocaleString("en-IN")} blocked by policy`,
            time: timeNow(),
          },
        });
        return;
      }

      // Re-check frozen state right before proposing — proposePayment()
      // on-chain is itself whenNotPaused, so a freeze that lands during
      // this decision window blocks the proposal outright rather than
      // leaving it to hang unresolved.
      if (stateRef.current.frozen) {
        dispatch({
          type: "PAYMENT_BLOCKED",
          tx: buildTx({
            label: "Payment attempt",
            counterparty: result.merchant,
            amount: result.amount,
            status: "blocked",
            note: "Blocked — agent frozen before the payment could be proposed",
          }),
          notification: {
            id: nextId("notif"),
            tone: "warn",
            title: "Payment blocked",
            body: "Agent was frozen before this payment could be proposed",
            time: timeNow(),
          },
        });
        return;
      }

      // Proposed: enters the feed as "pending", same as proposePayment()
      // on-chain — the money hasn't moved yet.
      const pendingTx = buildTx({
        label: "Task expense",
        counterparty: result.merchant,
        amount: result.amount,
        status: "pending",
        note: "Proposed — awaiting settlement window",
      });
      dispatch({ type: "PAYMENT_PROPOSED", tx: pendingTx });

      await adapter.settlePayment(controller.signal);

      // Re-check frozen state now, at settlement time, not proposal time
      // — matches executePayment()'s whenNotPaused check. If the owner
      // froze in between, FREEZE_TOGGLED already cancelled this exact
      // pending tx; standing down here avoids a second, conflicting
      // dispatch for the same payment.
      if (stateRef.current.frozen) return;

      dispatch({ type: "PAYMENT_SETTLED", id: pendingTx.id, amount: result.amount });
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [adapter, controller]);

  const simulateRogue = useCallback(async () => {
    const s = stateRef.current;
    if (s.frozen || s.creditStatus !== "approved") return;

    try {
      const result = await adapter.attemptRoguePayment(s, controller.signal);
      const risk = result.risk ?? 0.6;
      dispatch({
        type: "ROGUE_BLOCKED",
        scoreDelta: computeRogueScorePenalty(risk),
        tx: buildTx({
          label: "Payment attempt",
          counterparty: result.merchant,
          amount: result.amount,
          status: "blocked",
          note: result.reason ?? "Blocked by policy",
        }),
        notification: {
          id: nextId("notif"),
          tone: "danger",
          title: "Security alert",
          body: `Anomaly detected — spend velocity spike (risk ${risk.toFixed(2)})`,
          time: timeNow(),
        },
      });
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [adapter, controller]);

  const toggleFreeze = useCallback(async () => {
    try {
      const s = stateRef.current;
      const result = await adapter.toggleFreeze(s, controller.signal);
      const willFreeze = result.willFreeze;

      dispatch({
        type: "FREEZE_TOGGLED",
        notification: {
          id: nextId("notif"),
          tone: willFreeze ? "danger" : "ok",
          title: willFreeze ? "Agent frozen" : "Agent reinstated",
          body: willFreeze ? "All pending & future transactions cancelled" : "Policies re-armed",
          time: timeNow(),
        },
      });
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [adapter, controller]);

  const completeJob = useCallback(async () => {
    const s = stateRef.current;
    if (s.frozen || s.balance <= 0) return;

    try {
      const result = await adapter.completeJob(s, controller.signal);
      dispatch({
        type: "JOB_COMPLETED",
        tx: buildTx({
          label: "Task revenue received",
          counterparty: "client.settlement",
          amount: result.revenue,
          status: "repayment",
          note: `Auto-repaid outstanding balance of ₹${s.balance.toLocaleString("en-IN")}`,
        }),
        notification: {
          id: nextId("notif"),
          tone: "ok",
          title: "Loan repaid",
          body: "Balance auto-cleared from task revenue",
          time: timeNow(),
        },
      });
    } catch (err) {
      if (!isAbortError(err)) throw err;
    }
  }, [adapter, controller]);

  const updatePolicy = useCallback(
    async (perTxCap: number) => {
      try {
        await adapter.updatePolicy(perTxCap, controller.signal);
        dispatch({ type: "POLICY_UPDATED", perTxCap });
      } catch (err) {
        if (!isAbortError(err)) throw err;
      }
    },
    [adapter, controller]
  );

  const actions = useMemo<FinoraActions>(
    () => ({ requestCredit, sendPayment, simulateRogue, toggleFreeze, completeJob, updatePolicy }),
    [requestCredit, sendPayment, simulateRogue, toggleFreeze, completeJob, updatePolicy]
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
