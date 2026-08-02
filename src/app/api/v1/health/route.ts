import { NextResponse } from "next/server";
import { dataMode } from "@/lib/finora/serverData";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "finora-api",
    version: "v1",
    dataMode, // "live" (Supabase) or "sample"
    time: new Date().toISOString(),
  });
}
