/**
 * Behavioral underwriting.
 *
 * The weakest link in most "agent credit" demos is the score: it's a magic
 * constant. Here the starting score is DERIVED from an agent's real
 * execution telemetry — the same signals PS1 asks for (task success rate,
 * spend discipline, refund ratio) plus tenure and volume — with an explicit
 * factor breakdown so the number is auditable instead of asserted.
 *
 * `scoreFromTelemetry` is a pure function: given a log of events, it returns
 * the same score every time, and the same breakdown the UI shows. Swap the
 * sample log for a real agent's trace and nothing else changes.
 */

export type TelemetryKind =
  | "task_success"
  | "task_failure"
  | "refund_issued"
  | "payment" // an in-policy spend
  | "policy_violation_attempt"; // a blocked over-cap / unlisted attempt

export interface TelemetryEvent {
  kind: TelemetryKind;
  /** epoch ms */
  at: number;
  /** payment amount, for spend-discipline signal (optional) */
  amount?: number;
}

export interface ScoreFactor {
  label: string;
  /** points contributed (can be negative), for the breakdown UI */
  points: number;
  detail: string;
}

export interface UnderwritingResult {
  score: number; // 40..99
  factors: ScoreFactor[];
  summary: {
    tasks: number;
    successRate: number; // 0..1
    refundRatio: number; // 0..1
    violations: number;
    tenureDays: number;
  };
}

const BASE = 55; // an agent with no track record starts here, not at 82

/** Pure underwriting curve over a telemetry log. */
export function scoreFromTelemetry(events: TelemetryEvent[], nowMs: number = Date.now()): UnderwritingResult {
  const successes = events.filter((e) => e.kind === "task_success").length;
  const failures = events.filter((e) => e.kind === "task_failure").length;
  const tasks = successes + failures;
  const refunds = events.filter((e) => e.kind === "refund_issued").length;
  const payments = events.filter((e) => e.kind === "payment");
  const violations = events.filter((e) => e.kind === "policy_violation_attempt").length;

  const successRate = tasks > 0 ? successes / tasks : 0;
  const refundRatio = successes > 0 ? refunds / successes : 0;

  const firstAt = events.length ? Math.min(...events.map((e) => e.at)) : nowMs;
  const tenureDays = Math.max(0, (nowMs - firstAt) / 86_400_000);

  // Spend discipline: reward consistent, modest payment sizes; penalize
  // wild variance (a proxy for erratic behavior).
  const amounts = payments.map((p) => p.amount ?? 0).filter((a) => a > 0);
  const mean = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  const variance = amounts.length
    ? amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length
    : 0;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0; // coefficient of variation
  const disciplinePts = Math.round(Math.max(0, 10 - cv * 12)); // 0..10

  const factors: ScoreFactor[] = [
    {
      label: "Task success rate",
      points: Math.round(successRate * 30),
      detail: `${successes}/${tasks || 0} tasks completed (${Math.round(successRate * 100)}%)`,
    },
    {
      label: "Track record volume",
      points: Math.min(12, Math.round(Math.log2(1 + tasks) * 4)),
      detail: `${tasks} tasks on record`,
    },
    {
      label: "Tenure",
      points: Math.min(8, Math.round(tenureDays / 15)),
      detail: `${Math.round(tenureDays)} days active`,
    },
    {
      label: "Spend discipline",
      points: disciplinePts,
      detail: amounts.length
        ? `${amounts.length} payments, ${Math.round(cv * 100)}% size variance`
        : "no payment history",
    },
    {
      label: "Refund ratio",
      points: -Math.round(refundRatio * 15),
      detail: `${refunds} refunds on ${successes} completions`,
    },
    {
      label: "Policy violations",
      points: -violations * 6,
      detail: `${violations} blocked over-cap / unlisted attempts`,
    },
  ];

  const raw = BASE + factors.reduce((s, f) => s + f.points, 0);
  const score = Math.min(99, Math.max(40, Math.round(raw)));

  return {
    score,
    factors,
    summary: { tasks, successRate, refundRatio, violations, tenureDays },
  };
}
