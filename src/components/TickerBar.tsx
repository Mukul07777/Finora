const EVENTS: { tone: "ok" | "warn" | "danger"; text: string }[] = [
  { tone: "ok", text: "agent.procure-01 repaid ₹6,400 — balance ₹0.00" },
  { tone: "warn", text: "credit line approved · ₹8,200 @ 14.2% APR" },
  { tone: "danger", text: "blocked ₹4,000 → unlisted wallet · NotAllowlisted()" },
  { tone: "ok", text: "agent.data-sync-04 score 91 · Trusted tier" },
  { tone: "danger", text: "kill switch engaged · all transactions cancelled in <80ms" },
  { tone: "ok", text: "in-flight payment reverted after freeze · ContractPaused()" },
  { tone: "warn", text: "anomaly detected · spend velocity spike (risk 0.91)" },
  { tone: "ok", text: "17/17 on-chain enforcement tests passing" },
];

const DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  danger: "bg-red-400",
};

function TickerContent() {
  return (
    <>
      {EVENTS.map((e, i) => (
        <span key={i} className="mx-6 inline-flex items-center gap-2 whitespace-nowrap">
          <span className={`h-1.5 w-1.5 rounded-full ${DOT[e.tone]}`} />
          {e.text}
        </span>
      ))}
    </>
  );
}

export function TickerBar() {
  return (
    <div className="relative z-50 overflow-hidden border-b border-white/10 bg-[#06070a] py-2 text-[11px] font-mono text-white/70">
      <div className="flex w-max animate-ticker">
        <div className="flex">
          <TickerContent />
        </div>
        <div className="flex" aria-hidden="true">
          <TickerContent />
        </div>
      </div>
    </div>
  );
}
