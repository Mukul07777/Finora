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
import { AlertBanner } from "./AlertBanner";
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
    <div>
      <AlertBanner alert={alert} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <AgentPassport frozen={state.frozen} score={state.score} tier={tier} />
          <UnderwritingCard />
          <AgentAutopilot />
          <KillSwitchCard frozen={state.frozen} onToggle={actions.toggleFreeze} />
          <MaxLoss />
        </div>

        <div className="space-y-6 lg:col-span-1">
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
          <WalletPanel
            spendUsed={state.balance}
            spendLimit={state.limit}
            allowlist={[...ALLOWLIST]}
            frozen={state.frozen}
            creditActive={creditActive}
            onSendPayment={actions.sendPayment}
            onSimulateRogue={actions.simulateRogue}
          />
          <PolicyPanel perTxCap={state.perTxCap} onChange={actions.updatePolicy} />
          <PolicyCompiler />
        </div>

        <div className="lg:col-span-1">
          <TxFeed txs={state.txs} />
        </div>
      </div>

      <div className="mt-6">
        <MoneyFlow />
      </div>
    </div>
  );
}
