/**
 * Server-side data access for the live REST API.
 *
 * Reads from Supabase over PostgREST (dependency-free). Prefers the
 * service-role key when present (server-only, full read), else the public
 * anon key (RLS-guarded). If Supabase isn't configured, falls back to the
 * bundled deterministic sample so the API still returns coherent data.
 */

import type { PaymentEdge } from "./collusion";
import type { TelemetryEvent, TelemetryKind } from "./telemetry";
import { SAMPLE_LEDGER, DEMO_AGENTS } from "./sampleLedger";
import { SAMPLE_TELEMETRY } from "./sampleTelemetry";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const dataMode = URL && KEY ? "live" : "sample";

async function rest<T>(path: string): Promise<T[] | null> {
  if (!URL || !KEY) return null;
  try {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

interface AgentRow {
  id: string;
  did: string | null;
  session_key_address: string | null;
  owner_account: string | null;
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

export interface AgentRecord {
  id: string;
  did: string | null;
  sessionKey: string | null;
}

export async function getAgents(): Promise<{ agents: AgentRecord[]; source: string }> {
  const rows = await rest<AgentRow>("agents?select=id,did,session_key_address,owner_account");
  if (rows && rows.length) {
    return { agents: rows.map((r) => ({ id: r.id, did: r.did, sessionKey: r.session_key_address })), source: "live" };
  }
  return {
    agents: DEMO_AGENTS.map((id) => ({ id, did: `did:finora:${id}`, sessionKey: null })),
    source: "sample",
  };
}

export async function getPayments(): Promise<{ edges: PaymentEdge[]; source: string }> {
  const rows = await rest<PaymentRow>("payments?select=from_party,to_party,amount,at&order=at.asc");
  if (rows && rows.length) {
    return {
      edges: rows.map((r) => ({ from: r.from_party, to: r.to_party, amount: Number(r.amount), at: new Date(r.at).getTime() })),
      source: "live",
    };
  }
  return { edges: SAMPLE_LEDGER, source: "sample" };
}

export async function getTelemetry(agentId: string): Promise<{ events: TelemetryEvent[]; source: string }> {
  const rows = await rest<TelemetryRow>(
    `telemetry?agent_id=eq.${encodeURIComponent(agentId)}&select=kind,amount,at&order=at.asc`
  );
  if (rows && rows.length) {
    return {
      events: rows.map((r) => ({ kind: r.kind, amount: r.amount == null ? undefined : Number(r.amount), at: new Date(r.at).getTime() })),
      source: "live",
    };
  }
  // sample telemetry only exists for the demo agent
  if (agentId === "agent.procure-01") return { events: SAMPLE_TELEMETRY, source: "sample" };
  return { events: [], source: "empty" };
}
