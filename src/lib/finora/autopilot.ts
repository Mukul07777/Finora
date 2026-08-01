export const AUTOPILOT_ACTIONS = ["requestCredit", "sendPayment", "completeJob", "wait"] as const;
export type AutopilotAction = (typeof AUTOPILOT_ACTIONS)[number];

export function isAutopilotAction(value: unknown): value is AutopilotAction {
  return typeof value === "string" && (AUTOPILOT_ACTIONS as readonly string[]).includes(value);
}

export interface AutopilotDecision {
  action: AutopilotAction;
  reasoning: string;
}

/** What the LLM sees each tick — a compact, honest snapshot, not the full state. */
export interface AutopilotSnapshot {
  creditStatus: "idle" | "underwriting" | "approved";
  score: number;
  limit: number;
  apr: number;
  balance: number;
  perTxCap: number;
  frozen: boolean;
  recentTx: { label: string; status: string; amount: number }[];
}

export const AUTOPILOT_MAX_ACTIONS = 12;
export const AUTOPILOT_TICK_MS = 4500;
