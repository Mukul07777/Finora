"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AgentPassport } from "./AgentPassport";
import { CreditPanel } from "./CreditPanel";
import { WalletPanel } from "./WalletPanel";
import { TxFeed } from "./TxFeed";
import { KillSwitchCard } from "./KillSwitchCard";
import { PolicyPanel } from "./PolicyPanel";
import { PolicyCompiler } from "./PolicyCompiler";
import { AgentAutopilot } from "./AgentAutopilot";
import { AgentAvatar } from "./AgentAvatar";
import { StoryMode } from "./StoryMode";
import { MotionCard } from "./motion";
import { AlertBanner } from "./AlertBanner";
import { AlertMsg } from "./types";
import { useFinoraActions, useFinoraState } from "@/lib/finora/FinoraProvider";
import { ALLOWLIST } from "@/lib/finora/types";

export function Console() {
  const state = useFinoraState();
  const actions = useFinoraActions();
  const [alert, setAlert] = useState<AlertMsg | null>(null);

  useEffect(() => {
    const latest = state.notifications[0];
    if (!latest) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlert({ id: latest.id, tone: latest.tone, text: latest.body || latest.title });
    const t = setTimeout(() => {
      setAlert((cur) => (cur?.id === latest.id ? null : cur));
    }, 4200);
    return () => clearTimeout(t);
  }, [state.notifications]);

  const tier = state.score >= 85 ? "Trusted" : state.score >= 60 ? "Established" : "New";
  const creditActive = state.creditStatus === "approved";

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="orb animate-float-slow -left-20 top-10 h-72 w-72 opacity-30"
          style={{ background: "radial-gradient(circle, rgba(125,255,179,0.18), transparent 70%)" }}
        />
        <div
          className="orb animate-float-slower right-0 top-40 h-80 w-80 opacity-25"
          style={{ background: "radial-gradient(circle, rgba(110,168,255,0.18), transparent 70%)" }}
        />
      </div>

      <AlertBanner alert={alert} />

      <div className="mb-6">
        <StoryMode />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <ColumnLabel n="1" title="The agent" hint="Who it is, and the emergency brake." />
          <MotionCard delay={0.02}>
            <AgentPassport frozen={state.frozen} score={state.score} tier={tier} />
          </MotionCard>
          <MotionCard delay={0.08}>
            <AgentAvatar />
          </MotionCard>
          <MotionCard delay={0.14}>
            <KillSwitchCard frozen={state.frozen} onToggle={actions.toggleFreeze} />
          </MotionCard>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <ColumnLabel n="2" title="Credit & control" hint="Underwrite, spend, and set policy." />
          <MotionCard delay={0.05}>
            <CreditPanel
              status={state.creditStatus}
              stepIndex={state.underwritingStep}
              limit={state.limit}
              apr={state.apr}
              balance={state.balance}
              frozen={state.frozen}
              onRequest={actions.requestCredit}
              onCompleteJob={actions.completeJob}
            />
          </MotionCard>
          <MotionCard delay={0.11}>
            <WalletPanel
              spendUsed={state.balance}
              spendLimit={state.limit}
              allowlist={[...ALLOWLIST]}
              frozen={state.frozen}
              creditActive={creditActive}
              onSendPayment={actions.sendPayment}
              onSimulateRogue={actions.simulateRogue}
            />
          </MotionCard>
          <MotionCard delay={0.17}>
            <PolicyPanel perTxCap={state.perTxCap} onChange={actions.updatePolicy} />
          </MotionCard>
          <MotionCard delay={0.23}>
            <PolicyCompiler />
          </MotionCard>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <ColumnLabel n="3" title="Activity" hint="Every attempt, allowed or blocked, in real time." />
          <MotionCard delay={0.08}>
            <AgentAutopilot />
          </MotionCard>
          <MotionCard delay={0.14}>
            <TxFeed txs={state.txs} />
          </MotionCard>
        </div>
      </div>

      {/* cross-links to the dedicated pages */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <PageLink
          href="/flow"
          title="Money Map"
          body="See where capital flows and why borrowing pays — repayment skimmed at source."
        />
        <PageLink
          href="/network"
          title="Reputation & Fraud"
          body="How the score is underwritten, and how wash-trading rings get caught."
        />
      </div>
    </div>
  );
}

function ColumnLabel({ n, title, hint }: { n: string; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15 font-mono text-[11px] font-bold text-accent">
        {n}
      </span>
      <div>
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[11px] leading-snug text-muted">{hint}</p>
      </div>
    </div>
  );
}

function PageLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="card-premium group flex items-center justify-between gap-4 rounded-2xl p-5 transition-transform hover:scale-[1.01]"
    >
      <div>
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{body}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-accent transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
