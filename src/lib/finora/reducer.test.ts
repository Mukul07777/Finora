import { describe, expect, it } from "vitest";
import { finoraReducer, initialFinoraState } from "./reducer";
import { Notification, Tx } from "./types";

const notif: Notification = { id: "n1", tone: "ok", title: "t", body: "b", time: "00:00:00" };
const tx: Tx = {
  id: "tx1",
  time: "00:00:00",
  label: "Task expense",
  counterparty: "api.compute.gpu",
  amount: 100,
  status: "approved",
  note: "note",
};

describe("finoraReducer", () => {
  it("starts underwriting from idle", () => {
    const s = finoraReducer(initialFinoraState, { type: "CREDIT_REQUEST_STARTED" });
    expect(s.creditStatus).toBe("underwriting");
    expect(s.underwritingStep).toBe(0);
  });

  it("approves credit and records a notification", () => {
    const s = finoraReducer(initialFinoraState, {
      type: "CREDIT_APPROVED",
      limit: 8200,
      apr: 14.2,
      notification: notif,
    });
    expect(s.creditStatus).toBe("approved");
    expect(s.limit).toBe(8200);
    expect(s.notifications).toHaveLength(1);
  });

  it("increases balance on an approved payment", () => {
    const s = finoraReducer(initialFinoraState, { type: "PAYMENT_APPROVED", tx, amount: 100 });
    expect(s.balance).toBe(100);
    expect(s.txs[0]).toBe(tx);
  });

  it("docks score on a rogue-spend block", () => {
    const s = finoraReducer({ ...initialFinoraState, score: 82 }, {
      type: "ROGUE_BLOCKED",
      tx,
      notification: notif,
    });
    expect(s.score).toBe(78);
  });

  it("clamps score to a floor of 40", () => {
    const s = finoraReducer({ ...initialFinoraState, score: 41 }, {
      type: "ROGUE_BLOCKED",
      tx,
      notification: notif,
    });
    expect(s.score).toBe(40);
  });

  it("toggles frozen and cancels an in-flight tx only when freezing", () => {
    const frozen = finoraReducer(initialFinoraState, { type: "FREEZE_TOGGLED", tx, notification: notif });
    expect(frozen.frozen).toBe(true);
    expect(frozen.txs).toHaveLength(1);

    const reinstated = finoraReducer(frozen, { type: "FREEZE_TOGGLED", tx: null, notification: notif });
    expect(reinstated.frozen).toBe(false);
    expect(reinstated.txs).toHaveLength(1); // no new tx appended on reinstate
  });

  it("clears balance and bumps score on job completion, capped at 99", () => {
    const withBalance = { ...initialFinoraState, balance: 500, score: 98 };
    const s = finoraReducer(withBalance, { type: "JOB_COMPLETED", tx, notification: notif });
    expect(s.balance).toBe(0);
    expect(s.score).toBe(99);
  });

  it("blocks a payment without mutating balance", () => {
    const s = finoraReducer(initialFinoraState, { type: "PAYMENT_BLOCKED", tx, notification: notif });
    expect(s.balance).toBe(0);
    expect(s.txs).toHaveLength(1);
    expect(s.notifications).toHaveLength(1);
  });
});
