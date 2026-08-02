import { NextResponse } from "next/server";
import { getAgents, getPayments } from "@/lib/finora/serverData";
import { detectCollusion } from "@/lib/finora/collusion";

/**
 * GET /api/v1/risk/collusion — wash-trading / collusion analysis over the
 * live payment graph. Returns per-agent authenticity, flagged rings, and
 * reciprocal pairs.
 */
export async function GET() {
  const [{ agents }, { edges, source }] = await Promise.all([getAgents(), getPayments()]);
  const report = detectCollusion(edges, agents.map((a) => a.id));
  return NextResponse.json({
    ok: true,
    source,
    rings: report.rings,
    reciprocal_pairs: report.suspiciousPairs,
    findings: report.findings,
  });
}
