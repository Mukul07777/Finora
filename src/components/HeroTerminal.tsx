"use client";

import { useEffect, useState } from "react";
import { Power, ShieldCheck } from "lucide-react";

type Line = { text: string; tone: "ok" | "warn" | "danger" | "muted"; prompt?: boolean };

const SCRIPT: Line[] = [
  { text: "agent.identity.verify()", tone: "muted", prompt: true },
  { text: "✓ DID linked to owner: acct_9f21…c4a8", tone: "ok" },
  { text: "credit.underwrite(request=$5,000)", tone: "muted", prompt: true },
  { text: "→ task_success_rate: 98.2%  |  refund_ratio: 0.4%", tone: "muted" },
  { text: "✓ approved · limit $8,200 · APR 14.2%", tone: "ok" },
  { text: "wallet.tx($120 → api.compute.gpu)", tone: "muted", prompt: true },
  { text: "✓ within policy · counterparty allowlisted", tone: "ok" },
  { text: "wallet.tx($4,000 → unknown_wallet_x02)", tone: "muted", prompt: true },
  { text: "✗ BLOCKED · counterparty not allowlisted", tone: "danger" },
  { text: "⚠ anomaly score spike detected (0.91)", tone: "warn" },
  { text: "owner.freeze(agent_id)", tone: "muted", prompt: true },
  { text: "✓ AGENT FROZEN · all pending tx cancelled", tone: "danger" },
  { text: "job.complete() → revenue $6,400", tone: "muted", prompt: true },
  { text: "✓ loan auto-repaid · balance $0.00", tone: "ok" },
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
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    let scriptIndex = 0;
    let lineKey = 0;

    const id = setInterval(() => {
      const line = SCRIPT[scriptIndex % SCRIPT.length];
      const nextLine = { ...line, key: lineKey };
      scriptIndex += 1;
      lineKey += 1;

      if (line.text.includes("FROZEN")) setFrozen(true);
      if (line.text.includes("auto-repaid")) setFrozen(false);

      setVisible((v) => {
        const updated = [...v, nextLine];
        return updated.length > 7 ? updated.slice(updated.length - 7) : updated;
      });
    }, 1400);

    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
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
            <div key={line.key} className="whitespace-pre-wrap">
              {line.prompt && <span className="text-accent-2">$ </span>}
              <span className={toneClass[line.tone]}>{line.text}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-muted">
            <span className="text-accent-2">$</span>
            <span className="h-3.5 w-1.5 animate-blink bg-muted" />
          </div>
        </div>
      </div>

      {/* Floating status chip — overlapping the terminal for depth, the
          same "product screenshot with a UI chip peeking off it" layering
          premium SaaS hero sections use. Reacts to the same script. */}
      <div
        className={`glass absolute -bottom-5 -left-6 hidden items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-2xl transition-colors duration-500 sm:flex ${
          frozen ? "border-danger/40" : "border-accent/30"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-500 ${
            frozen ? "border-danger/50 bg-danger/10 text-danger" : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          <Power size={14} />
        </span>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted">Kill switch</div>
          <div className={`font-mono text-xs font-semibold ${frozen ? "text-danger" : "text-accent"}`}>
            {frozen ? "Engaged" : "Standby"}
          </div>
        </div>
      </div>

      <div className="glass absolute -right-5 -top-5 hidden items-center gap-2 rounded-full border border-border px-3 py-2 shadow-xl sm:flex">
        <ShieldCheck size={13} className="text-accent-2" />
        <span className="font-mono text-[10px] text-muted">Score 82 · Established</span>
      </div>
    </div>
  );
}
