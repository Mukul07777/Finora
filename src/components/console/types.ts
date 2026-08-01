export type TxStatus = "approved" | "blocked" | "cancelled" | "repayment";

export interface Tx {
  id: string;
  time: string;
  label: string;
  counterparty: string;
  amount: number;
  status: TxStatus;
  note: string;
}

export type CreditStatus = "idle" | "underwriting" | "approved";

export interface AlertMsg {
  id: string;
  tone: "warn" | "danger" | "ok";
  text: string;
}

export interface PhoneNotif {
  id: string;
  tone: "warn" | "danger" | "ok";
  title: string;
  body: string;
}
