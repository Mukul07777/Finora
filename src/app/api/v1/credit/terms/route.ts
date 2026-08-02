import { NextResponse } from "next/server";
import { computeCreditTerms, computeBondRatio } from "@/lib/finora/scoring";

/**
 * GET /api/v1/credit/terms?score=82 — stateless underwriting calculator.
 * Returns the live credit terms for a given reputation score (40-99).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const score = Number(searchParams.get("score") ?? "82");
  if (!Number.isFinite(score) || score < 40 || score > 99) {
    return NextResponse.json(
      { ok: false, error: "score must be a number between 40 and 99" },
      { status: 400 }
    );
  }
  const terms = computeCreditTerms(score);
  const bondRatio = computeBondRatio(score);
  return NextResponse.json({
    ok: true,
    score,
    limit: terms.limit,
    apr: terms.apr,
    required_bond_ratio: Math.round(bondRatio * 1000) / 1000,
  });
}
