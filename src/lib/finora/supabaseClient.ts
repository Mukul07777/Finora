/**
 * Minimal, dependency-free Supabase data layer.
 *
 * Talks to Supabase's PostgREST endpoint over `fetch` (no @supabase/supabase-js
 * needed), so it adds zero install weight and can't break the build. All reads
 * use the public anon key and are protected by Row-Level Security.
 *
 * If the env vars aren't set, every function resolves to an empty result and
 * the app falls back to its deterministic simulation — the demo never breaks
 * for a missing key.
 */

import type { PaymentEdge } from "./collusion";
import type { TelemetryEvent, TelemetryKind } from "./telemetry";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(URL && ANON);

async function rest<T>(path: string): Promise<T[]> {
  if (!supabaseConfigured) return [];
  try {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
      headers: { apikey: ANON as string, Authorization: `Bearer ${ANON}` },
      // reads are cacheable; the caller can revalidate
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

interface PaymentRow {
  from_party: string;
  to_party: string;
  amount: number;
  at: string;
}

interface TelemetryRow {
  kind: TelemetryKind;
  amount: number | null;
  at: string;
}

/** All payment edges (for the collusion detector). */
export async function fetchPayments(): Promise<PaymentEdge[]> {
  const rows = await rest<PaymentRow>("payments?select=from_party,to_party,amount,at&order=at.asc");
  return rows.map((r) => ({
    from: r.from_party,
    to: r.to_party,
    amount: Number(r.amount),
    at: new Date(r.at).getTime(),
  }));
}

/** Telemetry for one agent (feeds behavioral underwriting). */
export async function fetchTelemetry(agentId: string): Promise<TelemetryEvent[]> {
  const rows = await rest<TelemetryRow>(
    `telemetry?agent_id=eq.${encodeURIComponent(agentId)}&select=kind,amount,at&order=at.asc`
  );
  return rows.map((r) => ({
    kind: r.kind,
    amount: r.amount == null ? undefined : Number(r.amount),
    at: new Date(r.at).getTime(),
  }));
}

/** Distinct agent ids that belong to Finora (for the collusion detector). */
export async function fetchAgentIds(): Promise<string[]> {
  const rows = await rest<{ id: string }>("agents?select=id");
  return rows.map((r) => r.id);
}
