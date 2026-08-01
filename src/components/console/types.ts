export type { Tx, TxStatus, CreditStatus } from "@/lib/finora/types";

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
