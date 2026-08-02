import { NextResponse } from "next/server";
import { getAgents, getPayments, getTelemetry } from "@/lib/finora/serverData";
import { scoreFromTelemetry } from "@/lib/finora/telemetry";
import { computeCreditTerms, computeBondRatio } from "@/lib/finora/scoring";
import { detectCollusion, authenticityAdjustedScore } from "@/lib/finora/collusion";

/**
 * GET /api/v1/agents/:id — the agent passport: identity, behavioral score,
 * collusion-adjusted authenticity, and live credit terms. Everything here
 * is computed from real data, not stored constants.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const [{ agents }, { events, source: telemetrySource }, { edges }] = await Promise.all([
    getAgents(),
    getTelemetry(id),
    getPayments(),
  ]);

  const agent = agents.find((a) => a.id === id);
  if (!agent) {
    return NextResponse.json({ ok: false, error: `Unknown agent: ${id}` }, { status: 404 });
  }

  const underwriting = scoreFromTelemetry(events, Date.now());
  const rawScore = underwriting.score;

  // authenticity from the payment graph
  const report = detectCollusion(
    edges,
    agents.map((a) => a.id)
  );
  const finding = report.findings.find((f) => f.agent === id);
  const authenticity = finding ? finding.authenticity : 100;
  // rawScore is already on the 40-99 reputation scale; the authenticity
  // adjustment keeps it on that scale. computeCreditTerms clamps internally.
  const adjustedScore = authenticityAdjustedScore(rawScore, authenticity);
  const terms = computeCreditTerms(adjustedScore);
  const bondRatio = computeBondRatio(adjustedScore);

  return NextResponse.json({
    ok: true,
    agent: {
      id: agent.id,
      did: agent.did,
      session_key: agent.sessionKey,
    },
    reputation: {
      raw_score: rawScore,
      authenticity_pct: authenticity,
      adjusted_score: adjustedScore,
      telemetry_source: telemetrySource,
      factors: underwriting.factors,
      summary: underwriting.summary,
      flags: finding?.reasons ?? [],
    },
    credit: {
      limit: terms.limit,
      apr: terms.apr,
      required_bond_ratio: Math.round(bondRatio * 1000) / 1000,
    },
  });
}
