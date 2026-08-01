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
  txs: Tx[];
  notifications: Notification[];
}

export const ALLOWLIST = ["api.compute.gpu", "vendor.data-feed", "cloud.storage.us"] as const;
export const UNDERWRITING_STEPS = 4;
