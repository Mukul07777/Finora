"use client";

import { useState } from "react";
import { Play, Loader2, Check, AlertCircle } from "lucide-react";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  desc: string;
  body?: string; // JSON body for POST
}

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/api/v1/health", desc: "Service status and whether it's serving live (Supabase) or sample data." },
  { method: "GET", path: "/api/v1/agents", desc: "List registered agents and their DIDs." },
  {
    method: "GET",
    path: "/api/v1/agents/agent.procure-01",
    desc: "Agent passport: behavioral score, collusion-adjusted authenticity, and live credit terms.",
  },
  { method: "GET", path: "/api/v1/credit/terms?score=82", desc: "Stateless underwriting calculator — limit, APR, bond ratio for a score." },
  { method: "GET", path: "/api/v1/payments", desc: "The payment ledger (edges the fraud graph runs on)." },
  { method: "GET", path: "/api/v1/risk/collusion", desc: "Wash-trading analysis: authenticity per agent, flagged rings." },
  {
    method: "POST",
    path: "/api/policy/compile",
    desc: "Compile an English spending policy into structured on-chain ops.",
    body: JSON.stringify({ text: "Max $500 per transaction; only pay api.compute.gpu; freeze if spend doubles" }, null, 2),
  },
];

const methodColor: Record<string, string> = { GET: "text-accent-2", POST: "text-accent" };

export function ApiExplorer() {
  const [active, setActive] = useState(0);
  const ep = ENDPOINTS[active];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* endpoint list */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {ENDPOINTS.map((e, i) => (
          <button
            key={e.path}
            onClick={() => setActive(i)}
            className={`flex w-full flex-col gap-1 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0 ${
              i === active ? "bg-surface-2" : "hover:bg-surface-2/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-10 shrink-0 font-mono text-xs font-semibold ${methodColor[e.method]}`}>{e.method}</span>
              <span className="truncate font-mono text-[13px] text-foreground">{e.path}</span>
            </div>
            <p className="pl-[52px] text-[12px] text-muted">{e.desc}</p>
          </button>
        ))}
      </div>

      {/* runner */}
      <Runner key={ep.path} ep={ep} />
    </div>
  );
}

function Runner({ ep }: { ep: Endpoint }) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [code, setCode] = useState<number | null>(null);
  const [out, setOut] = useState<string>("");

  async function run() {
    setStatus("loading");
    setOut("");
    try {
      const res = await fetch(ep.path, {
        method: ep.method,
        headers: ep.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: ep.method === "POST" ? ep.body : undefined,
      });
      setCode(res.status);
      const json = await res.json();
      setOut(JSON.stringify(json, null, 2));
      setStatus(res.ok ? "ok" : "error");
    } catch (err) {
      setStatus("error");
      setOut(String(err));
    }
  }

  return (
    <div className="dark-scope overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
          <span className="ml-2 font-mono text-xs text-muted">
            <span className={methodColor[ep.method]}>{ep.method}</span> {ep.path}
          </span>
        </div>
        <button
          onClick={run}
          disabled={status === "loading"}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-on-accent transition-transform hover:scale-[1.04] disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Run
        </button>
      </div>

      {ep.method === "POST" && (
        <pre className="border-b border-border px-5 py-3 font-mono text-[11.5px] leading-relaxed text-muted">
{`body: ${ep.body}`}
        </pre>
      )}

      <div className="flex items-center gap-2 px-5 py-2 text-[11px] font-mono text-muted">
        {status === "idle" && <span>Press Run to call the live endpoint →</span>}
        {status === "ok" && (
          <span className="inline-flex items-center gap-1 text-accent">
            <Check size={12} /> {code} OK
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1 text-danger">
            <AlertCircle size={12} /> {code ?? "failed"}
          </span>
        )}
      </div>

      <pre className="max-h-[360px] overflow-auto px-5 pb-5 font-mono text-[12px] leading-relaxed text-foreground">
        {out || " "}
      </pre>
    </div>
  );
}
