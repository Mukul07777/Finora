import { FinoraState } from "./types";

/**
 * Everything FinoraProvider needs from "the world" — where credit
 * decisions and payment outcomes actually come from. SimulationAdapter
 * answers these with in-memory timers and randomness; a future
 * OnchainAdapter would answer them by calling AgentWallet.sol through a
 * connected wallet instead. Either way, the reducer, the action
 * coordinator's dispatch shape, and every UI component stay identical —
 * only the adapter changes.
 */
export interface PaymentAttempt {
  merchant: string;
  amount: number;
  allowed: boolean;
  /** Human-readable reason, required when allowed is false. */
  reason?: string;
  /** 0-1 assessed risk, present on rogue/anomalous attempts. Drives the score penalty and notification copy — see scoring.ts. */
  risk?: number;
}

export interface FreezeResult {
  willFreeze: boolean;
}

export interface JobCompletion {
  revenue: number;
}

export interface FinoraAdapter {
  /**
   * Resolves once underwriting finishes; calls onStep as each stage
   * completes. Returns nothing — the actual limit/APR are a pure
   * function of the agent's current score (see scoring.ts), computed by
   * the reducer, not decided by the adapter.
   */
  requestCredit(onStep: (step: number) => void, signal?: AbortSignal): Promise<void>;
  attemptPayment(state: FinoraState, signal?: AbortSignal): Promise<PaymentAttempt>;
  attemptRoguePayment(state: FinoraState, signal?: AbortSignal): Promise<PaymentAttempt>;
  toggleFreeze(state: FinoraState, signal?: AbortSignal): Promise<FreezeResult>;
  completeJob(state: FinoraState, signal?: AbortSignal): Promise<JobCompletion>;
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
