"use client";

import { useEffect, useState } from "react";
import { AgentPassport } from "./AgentPassport";
import { CreditPanel } from "./CreditPanel";
import { WalletPanel } from "./WalletPanel";
import { TxFeed } from "./TxFeed";
import { KillSwitchCard } from "./KillSwitchCard";
import { PolicyPanel } from "./PolicyPanel";
import { AgentAutopilot } from "./AgentAutopilot";
import { MoneyFlow } from "./MoneyFlow";
import { UnderwritingCard } from "./UnderwritingCard";
import { PolicyCompiler } from "./PolicyCompiler";
import { MaxLoss } from "./MaxLoss";
import { AgentAvatar } from "./AgentAvatar";
import { CollusionCard } from "./CollusionCard";
import { StoryMode } from "./StoryMode";
import { AlertBanner } from "./AlertBanner";
import { MotionCard } from "./motion";
import { AlertMsg } from "./types";
import { useFinoraActions, useFinoraState } from "@/lib/finora/FinoraProvider";
import { ALLOWLIST } from "@/lib/finora/types";

export function Console() {
  const state = useFinoraState();
  const actions = useFinoraActions();
  const [alert, setAlert] = useState<AlertMsg | null>(null);

  // Surfaces the most recent shared notification as a self-dismissing
  // banner. Deliberately an effect, not a render-time derivation: it
  // schedules a real timeout to auto-dismiss, which can't happen during
  // render.
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
      {/* ambient, slow-drifting color wash behind the whole console */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="orb animate-float-slow -left-20 top-10 h-72 w-72 opacity-30"
          style={{ background: "radial-gradient(circle, rgba(125,255,179,0.18), transparent 70%)" }}
        />
        <div
          className="orb animate-float-slower right-0 top-40 h-80 w-80 opacity-25"
          style={{ background: "radial-gradient(circle, rgba(110,168,255,0.18), transparent 70%)" }}
        />
        <div
          className="orb animate-float-slow left-1/2 bottom-0 h-64 w-64 opacity-20"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.18), transparent 70%)" }}
        />
      </div>

      <AlertBanner alert={alert} />

      <div className="mb-6">
        <StoryMode />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <ColumnLabel n="1" title="Who is this agent?" hint="Identity, reputation, and the emergency brake." />
          <MotionCard delay={0.02}>
            <AgentPassport frozen={state.frozen} score={state.score} tier={tier} />
          </MotionCard>
          <MotionCard delay={0.08}>
            <UnderwritingCard />
          </MotionCard>
          <MotionCard delay={0.14}>
            <AgentAutopilot />
          </MotionCard>
          <MotionCard delay={0.2}>
            <KillSwitchCard frozen={state.frozen} onToggle={actions.toggleFreeze} />
          </MotionCard>
          <MotionCard delay={0.26}>
            <MaxLoss />
          </MotionCard>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <ColumnLabel n="2" title="Give it credit — and rules" hint="Underwrite, spend, and set policy in plain English." />
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
          <ColumnLabel n="3" title="Proof it's safe" hint="Live agent, activity, and fraud detection." />
          <MotionCard delay={0.08}>
            <AgentAvatar />
          </MotionCard>
          <MotionCard delay={0.14}>
            <TxFeed txs={state.txs} />
          </MotionCard>
          <MotionCard delay={0.2}>
            <CollusionCard />
          </MotionCard>
        </div>
      </div>

      <div className="mt-6">
        <MotionCard delay={0.1}>
          <MoneyFlow />
        </MotionCard>
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
