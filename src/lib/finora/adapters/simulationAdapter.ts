import { FinoraAdapter, FreezeResult, JobCompletion, PaymentAttempt } from "../adapter";
import { computeVelocityRisk } from "../scoring";
import { ALLOWLIST, FinoraState, UNDERWRITING_STEPS } from "../types";

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

export function evaluatePayment(state: FinoraState): PaymentAttempt {
  const merchant = ALLOWLIST[Math.floor(Math.random() * ALLOWLIST.length)];
  const amount = Math.round(80 + Math.random() * 370);
  const remaining = state.limit - state.balance;

  // Mirrors AgentWallet.sol's check order: per-tx cap first, then
  // remaining headroom — same two independent reasons a real payment
  // can revert on-chain.
  if (amount > state.perTxCap) {
    return {
      merchant,
      amount,
      allowed: false,
      reason: `Blocked — exceeds owner-set per-transaction cap ($${state.perTxCap.toLocaleString("en-IN")})`,
    };
  }
  if (amount > remaining) {
    return { merchant, amount, allowed: false, reason: "Blocked — exceeds available credit headroom" };
  }
  return { merchant, amount, allowed: true };
}

/**
 * The current, real backend of the demo: no network, no wallet, just
 * timers and randomness standing in for underwriting and settlement
 * latency. Every claim it produces is labeled "Simulation Mode" in the
 * UI — see ConsoleSection.tsx.
 */
export const simulationAdapter: FinoraAdapter = {
  async requestCredit(onStep, signal) {
    for (let i = 1; i <= UNDERWRITING_STEPS; i++) {
      await delay(650, signal);
      onStep(i);
    }
    await delay(650, signal);
  },

  async attemptPayment(state, signal) {
    await delay(350, signal);
    return evaluatePayment(state);
  },

  async settlePayment(signal) {
    await delay(900, signal);
  },

  async attemptRoguePayment(state, signal) {
    await delay(350, signal);
    const risk = computeVelocityRisk(state.txs, Date.now());
    const attempt: PaymentAttempt = {
      merchant: "wallet_x02.unknown",
      amount: 4000,
      allowed: false,
      reason: "Blocked — counterparty not allowlisted",
      risk,
    };
    return attempt;
  },

  async toggleFreeze(state, signal) {
    // No artificial delay — the kill switch is the one action that must
    // never feel throttled, on-chain or off.
    await delay(0, signal);
    const result: FreezeResult = { willFreeze: !state.frozen };
    return result;
  },

  async updatePolicy(_perTxCap, signal) {
    // Instant here; a real OnchainAdapter's setPolicy() would be an
    // owner-signed transaction and would actually need to await it.
    await delay(0, signal);
  },

  async completeJob(state, signal) {
    await delay(350, signal);
    const completion: JobCompletion = { revenue: state.balance + 2200 };
    return completion;
  },
};
