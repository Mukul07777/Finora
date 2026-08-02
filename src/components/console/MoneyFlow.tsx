"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, TrendingUp, Wallet, Landmark, Store, Coins, ShieldCheck } from "lucide-react";
import { useFinoraState } from "@/lib/finora/FinoraProvider";
import { computeBondRatio } from "@/lib/finora/scoring";
import { AnimatedNumber, AnimatedBar } from "./motion";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

interface Snapshot {
  i: number;
  drawn: number;
  score: number;
}

/**
 * MoneyFlow — the "why + where" visualizer. It reads the same live
 * FinoraProvider state the rest of the console does, so every number here
 * animates as the user requests credit, pays, or completes a job:
 *
 *   1. Cash-flow map   — where the money goes (pool → wallet → vendors),
 *                        and how revenue is skimmed to repay before the
 *                        agent keeps anything.
 *   2. Why borrow      — the lending economics: task value vs. cost of
 *                        credit, and the net gain that justifies the loan.
 *   3. Balance & debt  — outstanding debt and reputation over recent steps.
 *   4. Bond vs. rep    — collateral shrinking as reputation rises.
 */
export function MoneyFlow() {
  const state = useFinoraState();
  const approved = state.creditStatus === "approved";

  const limit = state.limit;
  const drawn = state.balance; // current outstanding (repaid to 0 on job complete)
  const available = Math.max(0, limit - drawn);
  const utilization = limit > 0 ? drawn / limit : 0;

  const spentToVendors = state.txs
    .filter((t) => t.status === "approved")
    .reduce((sum, t) => sum + t.amount, 0);

  // Illustrative task economics at the current live terms.
  const costToComplete = drawn > 0 ? drawn : Math.round(limit * 0.6) || 600;
  const termDays = 7;
  const interest = costToComplete * (state.apr / 100) * (termDays / 365);
  const revenue = Math.round(costToComplete * 2.4);
  const netGain = revenue - costToComplete - interest;

  const bondRatio = computeBondRatio(state.score);
  const bondAmount = (limit || 8000) * bondRatio;

  // --- rolling history for the timeline -----------------------------------
  const [history, setHistory] = useState<Snapshot[]>([]);
  const counter = useRef(0);
  const last = useRef<string>("");
  useEffect(() => {
    const key = `${drawn}|${state.score}`;
    if (key === last.current) return;
    last.current = key;
    counter.current += 1;
    setHistory((h) => [...h, { i: counter.current, drawn, score: state.score }].slice(-16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawn, state.score]);

  return (
    <div className="dark-scope card-premium rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Money map</h3>
          <p className="mt-0.5 text-[11px] text-muted">
            Where funds move, and why borrowing pays — live from the same agent state.
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide ${
            approved
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border bg-surface-2 text-muted"
          }`}
        >
          {approved ? "line active" : "no line yet"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CashFlowMap
          limit={limit}
          drawn={drawn}
          available={available}
          spentToVendors={spentToVendors}
          revenue={approved ? revenue : 0}
          repay={approved ? Math.min(revenue, costToComplete + interest) : 0}
          net={approved ? Math.max(0, netGain) : 0}
        />
        <WhyBorrow
          revenue={revenue}
          cost={costToComplete}
          interest={interest}
          net={netGain}
          apr={state.apr}
          approved={approved}
        />
        <DebtTimeline history={history} limit={limit} />
        <BondVsReputation score={state.score} bondRatio={bondRatio} bondAmount={bondAmount} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border pt-3 text-[10px] text-muted">
        <Legend swatch="bg-accent-2" label="Credit / drawdown" />
        <Legend swatch="bg-accent" label="Revenue / net kept" />
        <Legend swatch="bg-violet" label="Repayment (skimmed)" />
        <Legend swatch="bg-warning" label="Collateral bond" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${swatch}`} />
      {label}
    </span>
  );
}

/* ---------------------------------------------------------------- 1. FLOW */

function CashFlowMap({
  limit,
  drawn,
  available,
  spentToVendors,
  revenue,
  repay,
  net,
}: {
  limit: number;
  drawn: number;
  available: number;
  spentToVendors: number;
  revenue: number;
  repay: number;
  net: number;
}) {
  const max = Math.max(limit, revenue, 1);
  const w = (v: number) => `${Math.max(4, (v / max) * 100)}%`;

  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
        <ArrowRight size={13} className="text-accent-2" /> Where the money goes
      </div>

      {/* outbound: pool -> wallet -> vendors */}
      <div className="space-y-2.5">
        <FlowRow
          icon={<Landmark size={13} />}
          label="Lender pool"
          sub={`limit ${money(limit)}`}
          barClass="bg-accent-2/30"
          fill={w(limit)}
          value={money(limit)}
        />
        <FlowConnector />
        <FlowRow
          icon={<Wallet size={13} />}
          label="Agent wallet — drawn"
          sub={`available ${money(available)}`}
          barClass="bg-accent-2"
          fill={w(drawn)}
          value={money(drawn)}
        />
        <FlowConnector />
        <FlowRow
          icon={<Store size={13} />}
          label="Paid to vendors"
          sub="allowlisted only"
          barClass="bg-accent-2/70"
          fill={w(spentToVendors)}
          value={money(spentToVendors)}
        />
      </div>

      {/* inbound: revenue -> skim -> net */}
      <div className="my-3 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
        <TrendingUp size={13} className="text-accent" /> When the task pays out
      </div>
      <div className="space-y-2.5">
        <FlowRow
          icon={<Coins size={13} />}
          label="Task revenue"
          sub="routed through the line"
          barClass="bg-accent"
          fill={w(revenue)}
          value={money(revenue)}
        />
        <FlowConnector />
        <FlowRow
          icon={<ShieldCheck size={13} />}
          label="Repayment skimmed"
          sub="deducted before the agent"
          barClass="bg-violet"
          fill={w(repay)}
          value={money(repay)}
        />
        <FlowConnector />
        <FlowRow
          icon={<Wallet size={13} />}
          label="Agent keeps (net)"
          sub="only the leftover"
          barClass="bg-accent/70"
          fill={w(net)}
          value={money(net)}
        />
      </div>
    </div>
  );
}

function FlowRow({
  icon,
  label,
  sub,
  barClass,
  fill,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  barClass: string;
  fill: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-muted">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[11px] text-foreground">{label}</span>
          <span className="shrink-0 font-mono text-[11px] text-foreground">{value}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className={`h-full rounded-full ${barClass} transition-all duration-700 ease-out`}
            style={{ width: fill }}
          />
        </div>
        <span className="text-[9.5px] text-muted">{sub}</span>
      </div>
    </div>
  );
}

function FlowConnector() {
  return <div className="ml-3 h-2 w-px bg-border" />;
}

/* ---------------------------------------------------------- 2. WHY BORROW */

function WhyBorrow({
  revenue,
  cost,
  interest,
  net,
  apr,
  approved,
}: {
  revenue: number;
  cost: number;
  interest: number;
  net: number;
  apr: number;
  approved: boolean;
}) {
  const max = Math.max(revenue, 1);
  const numPct = (v: number) => (v / max) * 100;
  const worthIt = net > 0;

  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
        <TrendingUp size={13} className="text-accent" /> Why take the loan
      </div>

      <div className="space-y-3">
        <BarLine label="Task pays" value={money(revenue)} pct={numPct(revenue)} className="bg-accent" delay={0.05} />
        <BarLine
          label="Drawdown to complete it"
          value={money(cost)}
          pct={numPct(cost)}
          className="bg-accent-2"
          delay={0.12}
        />
        <BarLine
          label={`Interest @ ${apr || 0}% APR · 7d`}
          value={money(interest)}
          pct={numPct(interest)}
          className="bg-violet"
          delay={0.19}
        />
      </div>

      <div
        className={`mt-4 rounded-lg border p-3 ${
          worthIt ? "border-accent/40 bg-accent/10" : "border-warning/40 bg-warning/10"
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-foreground">
            {worthIt ? "Net gain from borrowing" : "Not worth it at these terms"}
          </span>
          <AnimatedNumber
            value={net}
            prefix={net >= 0 ? "+$" : "$"}
            className={`font-mono text-sm font-semibold ${worthIt ? "text-accent" : "text-warning"}`}
          />
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-muted">
          {approved
            ? "The agent can't fund this task from its own balance — borrowing turns a task it couldn't take into net profit, after the cost of credit."
            : "Illustrative at current score. Request credit to see the line sized to this agent's reputation."}
        </p>
      </div>
    </div>
  );
}

function BarLine({
  label,
  value,
  pct,
  className,
  delay = 0,
}: {
  label: string;
  value: string;
  pct: number;
  className: string;
  delay?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-foreground">{value}</span>
      </div>
      <div className="mt-1">
        <AnimatedBar pct={pct} className={className} track="bg-surface" height="h-2" delay={delay} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------- 3. DEBT TIMELINE */

function DebtTimeline({ history, limit }: { history: Snapshot[]; limit: number }) {
  const W = 260;
  const H = 90;
  const pad = 6;
  const n = Math.max(history.length, 1);
  const maxDebt = Math.max(limit, ...history.map((h) => h.drawn), 1);

  const x = (i: number) => pad + (i / Math.max(n - 1, 1)) * (W - pad * 2);
  const yDebt = (v: number) => H - pad - (v / maxDebt) * (H - pad * 2);
  const yScore = (v: number) => H - pad - ((v - 40) / (99 - 40)) * (H - pad * 2);

  const debtPath = history.map((h, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${yDebt(h.drawn)}`).join(" ");
  const scorePath = history
    .map((h, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${yScore(h.score)}`)
    .join(" ");
  const debtArea = history.length
    ? `${debtPath} L ${x(history.length - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`
    : "";

  const latest = history[history.length - 1];

  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Wallet size={13} className="text-accent-2" /> Debt &amp; reputation over time
        </span>
        <span className="font-mono text-[10px] text-muted">
          {latest ? `debt ${money(latest.drawn)} · score ${latest.score}` : "—"}
        </span>
      </div>

      {history.length < 2 ? (
        <div className="flex h-[90px] items-center justify-center text-center text-[10px] text-muted">
          Interact with the console — debt and score plot here as the agent acts.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[90px] w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="debtFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={debtArea} fill="url(#debtFill)" />
          <path d={debtPath} fill="none" stroke="var(--accent-2)" strokeWidth="1.8" />
          <path d={scorePath} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeDasharray="3 2" />
        </svg>
      )}
      <div className="mt-2 flex items-center gap-4 text-[9.5px] text-muted">
        <Legend swatch="bg-accent-2" label="Outstanding debt" />
        <Legend swatch="bg-accent" label="Reputation score" />
      </div>
    </div>
  );
}

/* --------------------------------------------------- 4. BOND VS REPUTATION */

function BondVsReputation({
  score,
  bondRatio,
  bondAmount,
}: {
  score: number;
  bondRatio: number;
  bondAmount: number;
}) {
  const scorePct = ((score - 40) / (99 - 40)) * 100;

  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
        <ShieldCheck size={13} className="text-warning" /> Collateral shrinks as trust grows
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted">Required bond</span>
        <span className="font-mono text-sm font-semibold text-warning">
          {Math.round(bondRatio * 100)}% · {money(bondAmount)}
        </span>
      </div>

      {/* the descending curve: bond% high at low score, low at high score */}
      <div className="relative mt-3 h-16">
        <svg viewBox="0 0 260 64" className="h-16 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bondFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--warning)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* bond ratio drops from 60% (y high) at left to 5% at right */}
          <path d="M 0 8 L 260 55 L 260 64 L 0 64 Z" fill="url(#bondFill)" />
          <path d="M 0 8 L 260 55" fill="none" stroke="var(--warning)" strokeWidth="1.8" />
          {/* current-score marker */}
          <line
            x1={`${scorePct * 2.6}`}
            y1="0"
            x2={`${scorePct * 2.6}`}
            y2="64"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
        </svg>
      </div>

      <div className="mt-1 flex items-center justify-between text-[9.5px] text-muted">
        <span>low score · ~60%</span>
        <span className="text-accent">score {score}</span>
        <span>high score · ~5%</span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        The agent pledges nothing. Its principal posts this bond — and the better the agent&apos;s
        on-chain reputation, the less capital the loan requires.
      </p>
    </div>
  );
}
