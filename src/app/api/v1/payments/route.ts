import { NextResponse } from "next/server";
import { getPayments } from "@/lib/finora/serverData";

/** GET /api/v1/payments — the payment ledger (edges for the risk graph). */
export async function GET() {
  const { edges, source } = await getPayments();
  return NextResponse.json({ ok: true, source, count: edges.length, payments: edges });
}
