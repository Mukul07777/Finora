import { scoreFromTelemetry, TelemetryEvent, UnderwritingResult } from "./telemetry";

/**
 * A recorded execution trace for the demo agent. In production this would be
 * the agent's real event stream; here it's a fixed, deterministic log so the
 * derived score is stable across server/client render (no hydration drift).
 *
 * The starting reputation is the OUTPUT of underwriting this log — not a
 * seeded constant.
 */

// Fixed reference clock so the score is deterministic.
export const SAMPLE_NOW = Date.UTC(2026, 6, 1); // 2026-07-01
const DAY = 86_400_000;
const day = (d: number) => SAMPLE_NOW - d * DAY;

export const SAMPLE_TELEMETRY: TelemetryEvent[] = [
  // ~45 days of history
  { kind: "task_success", at: day(45) },
  { kind: "payment", at: day(45), amount: 210 },
  { kind: "task_success", at: day(43) },
  { kind: "payment", at: day(43), amount: 195 },
  { kind: "task_failure", at: day(41) },
  { kind: "task_success", at: day(39) },
  { kind: "payment", at: day(39), amount: 230 },
  { kind: "refund_issued", at: day(38) },
  { kind: "policy_violation_attempt", at: day(37) },
  { kind: "task_success", at: day(35) },
  { kind: "payment", at: day(35), amount: 205 },
  { kind: "task_success", at: day(33) },
  { kind: "payment", at: day(33), amount: 220 },
  { kind: "task_success", at: day(30) },
  { kind: "payment", at: day(30), amount: 200 },
  { kind: "task_failure", at: day(28) },
  { kind: "policy_violation_attempt", at: day(27) },
  { kind: "task_success", at: day(25) },
  { kind: "payment", at: day(25), amount: 215 },
  { kind: "task_success", at: day(22) },
  { kind: "payment", at: day(22), amount: 190 },
  { kind: "task_success", at: day(19) },
  { kind: "refund_issued", at: day(18) },
  { kind: "task_success", at: day(16) },
  { kind: "payment", at: day(16), amount: 225 },
  { kind: "task_success", at: day(13) },
  { kind: "payment", at: day(13), amount: 208 },
  { kind: "task_failure", at: day(11) },
  { kind: "policy_violation_attempt", at: day(10) },
  { kind: "task_success", at: day(8) },
  { kind: "payment", at: day(8), amount: 212 },
  { kind: "task_success", at: day(5) },
  { kind: "payment", at: day(5), amount: 198 },
  { kind: "task_success", at: day(3) },
  { kind: "task_failure", at: day(2) },
  { kind: "task_success", at: day(1) },
  { kind: "payment", at: day(1), amount: 204 },
];

export const SAMPLE_UNDERWRITING: UnderwritingResult = scoreFromTelemetry(SAMPLE_TELEMETRY, SAMPLE_NOW);
