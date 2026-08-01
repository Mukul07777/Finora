import { FinoraState, Notification, Tx } from "./types";

export type FinoraAction =
  | { type: "CREDIT_REQUEST_STARTED" }
  | { type: "CREDIT_UNDERWRITING_STEP"; step: number }
  | { type: "CREDIT_APPROVED"; limit: number; apr: number; notification: Notification }
  | { type: "PAYMENT_BLOCKED"; tx: Tx; notification: Notification }
  | { type: "PAYMENT_APPROVED"; tx: Tx; amount: number }
  | { type: "ROGUE_BLOCKED"; tx: Tx; notification: Notification }
  | { type: "FREEZE_TOGGLED"; tx: Tx | null; notification: Notification }
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

function pushNotification(notifications: Notification[], notification: Notification): Notification[] {
  return [notification, ...notifications].slice(0, 20);
}

function assertNever(x: never): never {
  throw new Error(`Unhandled Finora action: ${JSON.stringify(x)}`);
}

// Pure by design: no timers, randomness, or Date.now — those live in
// FinoraProvider's action coordinator, which builds fully-formed Tx /
// Notification objects before dispatching them here.
export function finoraReducer(state: FinoraState, action: FinoraAction): FinoraState {
  switch (action.type) {
    case "CREDIT_REQUEST_STARTED":
      return { ...state, creditStatus: "underwriting", underwritingStep: 0 };

    case "CREDIT_UNDERWRITING_STEP":
      return { ...state, underwritingStep: action.step };

    case "CREDIT_APPROVED":
      return {
        ...state,
        creditStatus: "approved",
        limit: action.limit,
        apr: action.apr,
        notifications: pushNotification(state.notifications, action.notification),
      };

    case "PAYMENT_BLOCKED":
      return {
        ...state,
        txs: pushTx(state.txs, action.tx),
        notifications: pushNotification(state.notifications, action.notification),
      };

    case "PAYMENT_APPROVED":
      return {
        ...state,
        balance: state.balance + action.amount,
        txs: pushTx(state.txs, action.tx),
      };

    case "ROGUE_BLOCKED":
      return {
        ...state,
        score: Math.max(40, state.score - 4),
        txs: pushTx(state.txs, action.tx),
        notifications: pushNotification(state.notifications, action.notification),
      };

    case "FREEZE_TOGGLED":
      return {
        ...state,
        frozen: !state.frozen,
        txs: action.tx ? pushTx(state.txs, action.tx) : state.txs,
        notifications: pushNotification(state.notifications, action.notification),
      };

    case "JOB_COMPLETED":
      return {
        ...state,
        balance: 0,
        score: Math.min(99, state.score + 2),
        txs: pushTx(state.txs, action.tx),
        notifications: pushNotification(state.notifications, action.notification),
      };

    default:
      return assertNever(action);
  }
}
