"use client";

import { useEffect, useState } from "react";

type Line = { text: string; tone: "ok" | "warn" | "danger" | "muted" };

const SCRIPT: Line[] = [
  { text: "$ agent.identity.verify()", tone: "muted" },
  { text: "✓ DID linked to owner: acct_9f21…c4a8", tone: "ok" },
  { text: "$ credit.underwrite(request=₹5,000)", tone: "muted" },
  { text: "→ task_success_rate: 98.2%  |  refund_ratio: 0.4%", tone: "muted" },
  { text: "✓ approved · limit ₹8,200 · APR 14.2%", tone: "ok" },
  { text: "$ wallet.tx(₹120 → api.compute.gpu)", tone: "ok" },
  { text: "✓ within policy · counterparty allowlisted", tone: "ok" },
  { text: "$ wallet.tx(₹4,000 → unknown_wallet_x02)", tone: "warn" },
  { text: "✗ BLOCKED · counterparty not allowlisted", tone: "danger" },
  { text: "⚠ anomaly score spike detected (0.91)", tone: "warn" },
  { text: "$ owner.freeze(agent_id)", tone: "muted" },
  { text: "✓ AGENT FROZEN · all pending tx cancelled", tone: "danger" },
  { text: "$ job.complete() → revenue ₹6,400", tone: "ok" },
  { text: "✓ loan auto-repaid · balance ₹0.00", tone: "ok" },
];

const toneClass: Record<Line["tone"], string> = {
  ok: "text-accent",
  warn: "text-warning",
  danger: "text-danger",
  muted: "text-muted",
};

type VisibleLine = Line & { key: number };

export function HeroTerminal() {
  const [visible, setVisible] = useState<VisibleLine[]>([]);

  useEffect(() => {
    let scriptIndex = 0;
    let lineKey = 0;

    const id = setInterval(() => {
      const nextLine = { ...SCRIPT[scriptIndex % SCRIPT.length], key: lineKey };
      scriptIndex += 1;
      lineKey += 1;

      setVisible((v) => {
        const updated = [...v, nextLine];
        return updated.length > 7 ? updated.slice(updated.length - 7) : updated;
      });
    }, 1400);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="dark-scope glass glow-accent relative w-full max-w-md overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
        <span className="ml-2 font-mono text-xs text-muted">agent_console — live</span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-accent">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" />
          LIVE
        </span>
      </div>
      <div className="h-[260px] space-y-1.5 overflow-hidden px-4 py-4 font-mono text-[12.5px] leading-relaxed">
        {visible.map((line) => (
          <div key={line.key} className={`${toneClass[line.tone]} whitespace-pre-wrap`}>
            {line.text}
          </div>
        ))}
        <div className="flex items-center gap-1 text-muted">
          <span>$</span>
          <span className="h-3.5 w-1.5 animate-blink bg-muted" />
        </div>
      </div>
    </div>
  );
}
