export type TxStatus = "pending" | "approved" | "blocked" | "cancelled" | "repayment";

export interface Tx {
  id: string;
  time: string;
  /** Epoch ms — used for velocity-based anomaly detection, separate from the display-only `time` string. */
  timestamp: number;
  label: string;
  counterparty: string;
  amount: number;
  status: TxStatus;
  note: string;
}

export type CreditStatus = "idle" | "underwriting" | "approved";

export type NotificationTone = "warn" | "danger" | "ok";

export interface Notification {
  id: string;
  tone: NotificationTone;
  title: string;
  body: string;
  time: string;
}

export interface FinoraState {
  frozen: boolean;
  score: number;
  creditStatus: CreditStatus;
  underwritingStep: number;
  limit: number;
  apr: number;
  balance: number;
  /** Owner-set ceiling on any single payment — the simulated analog of AgentWallet.sol's perTxLimit, live-adjustable via PolicyPanel. */
  perTxCap: number;
  txs: Tx[];
  notifications: Notification[];
}

export const ALLOWLIST = ["api.compute.gpu", "vendor.data-feed", "cloud.storage.us"] as const;
export const UNDERWRITING_STEPS = 4;
export const MIN_PER_TX_CAP = 100;
export const MAX_PER_TX_CAP = 1000;
export const DEFAULT_PER_TX_CAP = 500;
