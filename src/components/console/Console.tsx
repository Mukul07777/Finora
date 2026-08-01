"use client";

import { useEffect, useRef, useState } from "react";
import { AgentPassport } from "./AgentPassport";
import { CreditPanel } from "./CreditPanel";
import { WalletPanel } from "./WalletPanel";
import { TxFeed } from "./TxFeed";
import { KillSwitchCard } from "./KillSwitchCard";
import { AlertBanner } from "./AlertBanner";
import { PhoneMock } from "./PhoneMock";
import { AlertMsg, CreditStatus, PhoneNotif, Tx } from "./types";

const ALLOWLIST = ["api.compute.gpu", "vendor.data-feed", "cloud.storage.us"];
const UNDERWRITING_STEPS = 4;
const PHONE_NOTIF_TTL = 6000;

function timeNow() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

let txCounter = 0;
function nextId() {
  txCounter += 1;
  return `tx_${txCounter}_${Date.now()}`;
}

export function Console() {
  const [frozen, setFrozen] = useState(false);
  const [score, setScore] = useState(82);
  const [creditStatus, setCreditStatus] = useState<CreditStatus>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [limit, setLimit] = useState(0);
  const [apr, setApr] = useState(0);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [alert, setAlert] = useState<AlertMsg | null>(null);
  const [phoneNotifs, setPhoneNotifs] = useState<PhoneNotif[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!alert) return;
    const id = setTimeout(() => setAlert(null), 4200);
    timers.current.push(id);
    return () => clearTimeout(id);
  }, [alert]);

  const tier = score >= 85 ? "Trusted" : score >= 60 ? "Established" : "New";
  const creditActive = creditStatus === "approved";

  function pushTx(tx: Omit<Tx, "id" | "time">) {
    setTxs((prev) => [{ ...tx, id: nextId(), time: timeNow() }, ...prev].slice(0, 12));
  }

  function pushPhone(title: string, body: string, tone: PhoneNotif["tone"]) {
    const id = nextId();
    setPhoneNotifs((prev) => [{ id, title, body, tone }, ...prev].slice(0, 4));
    const t = setTimeout(() => {
      setPhoneNotifs((prev) => prev.filter((n) => n.id !== id));
    }, PHONE_NOTIF_TTL);
    timers.current.push(t);
  }

  function handleRequestCredit() {
    if (creditStatus !== "idle") return;
    setCreditStatus("underwriting");
    setStepIndex(0);
    for (let i = 1; i <= UNDERWRITING_STEPS; i++) {
      const t = setTimeout(() => setStepIndex(i), i * 650);
      timers.current.push(t);
    }
    const done = setTimeout(() => {
      setCreditStatus("approved");
      setLimit(8200);
      setApr(14.2);
      setAlert({ id: nextId(), tone: "ok", text: "Credit approved — ₹8,200 line at 14.2% APR" });
      pushPhone("Credit approved", "₹8,200 line issued to agent.procure-01 at 14.2% APR", "ok");
    }, (UNDERWRITING_STEPS + 1) * 650);
    timers.current.push(done);
  }

  function handleSendPayment() {
    if (frozen || !creditActive) return;
    const merchant = ALLOWLIST[Math.floor(Math.random() * ALLOWLIST.length)];
    const amount = Math.round(80 + Math.random() * 370);
    const remaining = limit - balance;

    if (amount > remaining) {
      pushTx({
        label: "Payment attempt",
        counterparty: merchant,
        amount,
        status: "blocked",
        note: "Blocked — exceeds available credit headroom",
      });
      setAlert({ id: nextId(), tone: "warn", text: "Payment blocked — over available limit" });
      pushPhone("Payment blocked", `₹${amount.toLocaleString("en-IN")} attempt exceeded available credit`, "warn");
      return;
    }

    setBalance((b) => b + amount);
    pushTx({
      label: "Task expense",
      counterparty: merchant,
      amount,
      status: "approved",
      note: "Within policy · counterparty allowlisted",
    });
  }

  function handleSimulateRogue() {
    if (frozen || !creditActive) return;
    pushTx({
      label: "Payment attempt",
      counterparty: "wallet_x02.unknown",
      amount: 4000,
      status: "blocked",
      note: "Blocked — counterparty not allowlisted",
    });
    setScore((s) => Math.max(40, s - 4));
    setAlert({
      id: nextId(),
      tone: "danger",
      text: "Anomaly detected — spend velocity spike (risk 0.91)",
    });
    pushPhone(
      "Security alert",
      "Blocked ₹4,000 attempt to an unlisted wallet — risk score spiked to 0.91",
      "danger"
    );
  }

  function handleToggleFreeze() {
    if (!frozen) {
      setFrozen(true);
      pushTx({
        label: "In-flight transfer",
        counterparty: "api.compute.gpu",
        amount: 260,
        status: "cancelled",
        note: "Cancelled mid-execution by owner kill switch",
      });
      setAlert({
        id: nextId(),
        tone: "danger",
        text: "Agent frozen — all pending & future transactions cancelled",
      });
      pushPhone(
        "Agent frozen",
        "agent.procure-01 stopped instantly. All pending & future transactions cancelled.",
        "danger"
      );
    } else {
      setFrozen(false);
      setAlert({ id: nextId(), tone: "ok", text: "Agent reinstated — policies re-armed" });
      pushPhone("Agent reinstated", "agent.procure-01 is back online — policies re-armed", "ok");
    }
  }

  function handleCompleteJob() {
    if (frozen || balance <= 0) return;
    const revenue = balance + 2200;
    pushTx({
      label: "Task revenue received",
      counterparty: "client.settlement",
      amount: revenue,
      status: "repayment",
      note: `Auto-repaid outstanding balance of ₹${balance.toLocaleString("en-IN")}`,
    });
    const repaid = balance;
    setBalance(0);
    setScore((s) => Math.min(99, s + 2));
    setAlert({ id: nextId(), tone: "ok", text: "Loan auto-repaid — reputation score updated" });
    pushPhone("Loan repaid", `₹${repaid.toLocaleString("en-IN")} auto-deducted from task revenue — balance ₹0`, "ok");
  }

  return (
    <div>
      <AlertBanner alert={alert} />
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-1">
          <AgentPassport frozen={frozen} score={score} tier={tier} />
          <KillSwitchCard frozen={frozen} onToggle={handleToggleFreeze} />
        </div>

        <div className="space-y-6 lg:col-span-1">
          <CreditPanel
            status={creditStatus}
            stepIndex={stepIndex}
            limit={limit}
            apr={apr}
            balance={balance}
            frozen={frozen}
            onRequest={handleRequestCredit}
            onCompleteJob={handleCompleteJob}
          />
          <WalletPanel
            spendUsed={balance}
            spendLimit={limit}
            allowlist={ALLOWLIST}
            frozen={frozen}
            creditActive={creditActive}
            onSendPayment={handleSendPayment}
            onSimulateRogue={handleSimulateRogue}
          />
        </div>

        <div className="lg:col-span-1">
          <TxFeed txs={txs} />
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <PhoneMock notifs={phoneNotifs} />
          </div>
        </div>
      </div>
    </div>
  );
}
