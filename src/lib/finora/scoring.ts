import { Tx } from "./types";

/**
 * Underwriting curve: maps a reputation score (40-99) to a credit limit
 * and APR. Pure function of score — called both when credit is first
 * approved and again whenever score changes afterward, so the terms in
 * the UI are always the live output of this formula, not a value frozen
 * at approval time.
 *
 * Tuned so the default starting score (82) lands close to the old fixed
 * demo numbers (₹8,200 @ 14.2%) — the terms now move from there instead
 * of just replaying the same two numbers forever.
 */
export function computeCreditTerms(score: number): { limit: number; apr: number } {
  const s = Math.min(99, Math.max(40, score));
  const limit = Math.round((2000 + (s - 40) * 141) / 100) * 100;
  const apr = Math.max(8, Math.round((22 - (s - 40) * 0.2) * 10) / 10);
  return { limit, apr };
}

/**
 * Heuristic velocity check — not a trained model, just a real function
 * of real data: how many of this session's transactions landed in the
 * last `windowMs`. More recent activity → higher assessed risk. Still
 * simple and hand-tuned, but it reacts to what actually happened in
 * this session rather than returning the same fixed number every time.
 */
export function computeVelocityRisk(txs: Tx[], nowMs: number, windowMs = 6000): number {
  const recentCount = txs.filter((t) => nowMs - t.timestamp < windowMs).length;
  return Math.min(0.97, Math.round((0.5 + recentCount * 0.09) * 100) / 100);
}

/** Maps an assessed risk (0-1) to a reputation score penalty, 2-9 points. */
export function computeRogueScorePenalty(risk: number): number {
  return Math.max(2, Math.min(9, Math.round(risk * 9)));
}
