import { NextResponse } from "next/server";
import { getAgents } from "@/lib/finora/serverData";

/** GET /api/v1/agents — list registered agents. */
export async function GET() {
  const { agents, source } = await getAgents();
  return NextResponse.json({ ok: true, source, count: agents.length, agents });
}
