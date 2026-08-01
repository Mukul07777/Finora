import { computeCreditTerms } from "./scoring";
import { FinoraState, Notification, Tx } from "./types";

export type FinoraAction =
  | { type: "CREDIT_REQUEST_STARTED" }
  | { type: "CREDIT_UNDERWRITING_STEP"; step: number }
  | { type: "CREDIT_APPROVED"; notification: Notification }
  | { type: "PAYMENT_BLOCKED"; tx: Tx; notification: Notification }
  | { type: "PAYMENT_PROPOSED"; tx: Tx }
  | { type: "PAYMENT_SETTLED"; id: string; amount: number }
  | { type: "ROGUE_BLOCKED"; tx: Tx; notification: Notification; scoreDelta: number }
  | { type: "FREEZE_TOGGLED"; notification: Notification }
  | { type: "JOB_COMPLETED"; tx: Tx; notification: Notification };

export const initialFinoraState: FinoraState = {
  frozen: false,
  score: 82,
  creditStatus: "idle",
  underwritingStep: 0,
  limit: 0,
  apr: 0,
  balance: 0,
  txs: [],
  notifications: [],
};

function pushTx(txs: Tx[], tx: Tx): Tx[] {
  return [tx, ...txs].slice(0, 20);
}

function updateTx(txs: Tx[], id: string, patch: Partial<Pick<Tx, "status" | "note">>): Tx[] {
  return txs.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

function pushNotification(notifications: Notification[], notification: Notification): Notification[] {
  return [notification, ...notifications].slice(0, 20);
}

// Credit terms are a live function of score, not a value fixed at
// approval — recomputed here whenever score moves, so limit/APR only
// come from computeCreditTerms(), never from the action payload.
function withRecomputedTerms(state: FinoraState, newScore: number): Pick<FinoraState, "limit" | "apr"> {
  if (state.creditStatus !== "approved") return { limit: state.limit, apr: state.apr };
  return computeCreditTerms(newScore);
}

function assertNever(x: never): never {
  throw new Error(`Unhandled Finora action: ${JSON.stringify(x)}`);
}

// Pure by design: no timers, randomness, or Date.now — those live in
// FinoraProvider's action coordinator and simulationAdapter, which build
// fully-formed Tx / Notification objects (and compute risk/deltas) before
// dispatching here. computeCreditTerms is the one exception: it's a pure
// function of score, so calling it directly in the reducer is safe and
// keeps "terms always match current score" a reducer-level invariant.
export function finoraReducer(state: FinoraState, action: FinoraAction): FinoraState {
  switch (action.type) {
    case "CREDIT_REQUEST_STARTED":
      return { ...state, creditStatus: "underwriting", underwritingStep: 0 };

    case "CREDIT_UNDERWRITING_STEP":
      return { ...state, underwritingStep: action.step };

    case "CREDIT_APPROVED": {
      const terms = computeCreditTerms(state.score);
      return {
        ...state,
        creditStatus: "approved",
        limit: terms.limit,
        apr: terms.apr,
        notifications: pushNotification(state.notifications, action.notification),
      };
    }

    case "PAYMENT_BLOCKED":
      return {
        ...state,
        txs: pushTx(state.txs, action.tx),
        notifications: pushNotification(state.notifications, action.notification),
      };

    // Two-step payment lifecycle, mirroring AgentWallet.sol's
    // proposePayment() / executePayment() split: a proposed payment sits
    // as "pending" in the feed and only moves money once settled. If the
    // owner freezes in between, FREEZE_TOGGLED below cancels it directly
    // — the coordinator checks frozen state before calling SETTLED and
    // simply stands down if it lost the race, rather than dispatching a
    // second, separate cancellation.
    case "PAYMENT_PROPOSED":
      return { ...state, txs: pushTx(state.txs, action.tx) };

    case "PAYMENT_SETTLED":
      return {
        ...state,
        balance: state.balance + action.amount,
        txs: updateTx(state.txs, action.id, {
          status: "approved",
          note: "Executed — within policy · counterparty allowlisted",
        }),
      };

    case "ROGUE_BLOCKED": {
      const newScore = Math.max(40, state.score - action.scoreDelta);
      return {
        ...state,
        score: newScore,
        ...withRecomputedTerms(state, newScore),
        txs: pushTx(state.txs, action.tx),
        notifications: pushNotification(state.notifications, action.notification),
      };
    }

    case "FREEZE_TOGGLED": {
      const freezing = !state.frozen;
      return {
        ...state,
        frozen: freezing,
        // Freezing kills every pending payment immediately — a real
        // consequence of real pending state, not a scripted example
        // transaction. Reinstating touches nothing; nothing was ever
        // un-cancelled by a real kill switch either.
        txs: freezing
          ? state.txs.map((t) =>
              t.status === "pending"
                ? { ...t, status: "cancelled" as const, note: "Cancelled mid-execution by owner kill switch" }
                : t
            )
          : state.txs,
        notifications: pushNotification(state.notifications, action.notification),
      };
    }

    case "JOB_COMPLETED": {
      const newScore = Math.min(99, state.score + 2);
      return {
        ...state,
        balance: 0,
        score: newScore,
        ...withRecomputedTerms(state, newScore),
        txs: pushTx(state.txs, action.tx),
        notifications: pushNotification(state.notifications, action.notification),
      };
    }

    default:
      return assertNever(action);
  }
}
