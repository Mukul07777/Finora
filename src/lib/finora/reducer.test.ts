import { describe, expect, it } from "vitest";
import { finoraReducer, initialFinoraState } from "./reducer";
import { computeCreditTerms } from "./scoring";
import { Notification, Tx } from "./types";

const notif: Notification = { id: "n1", tone: "ok", title: "t", body: "b", time: "00:00:00" };
const tx: Tx = {
  id: "tx1",
  time: "00:00:00",
  timestamp: 0,
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

  it("approves credit with terms computed from current score", () => {
    const base = { ...initialFinoraState, score: 82 };
    const s = finoraReducer(base, { type: "CREDIT_APPROVED", notification: notif });
    const expected = computeCreditTerms(82);

    expect(s.creditStatus).toBe("approved");
    expect(s.limit).toBe(expected.limit);
    expect(s.apr).toBe(expected.apr);
    expect(s.notifications).toHaveLength(1);
  });

  it("increases balance on an approved payment", () => {
    const s = finoraReducer(initialFinoraState, { type: "PAYMENT_APPROVED", tx, amount: 100 });
    expect(s.balance).toBe(100);
    expect(s.txs[0]).toBe(tx);
  });

  it("docks score by the given scoreDelta on a rogue-spend block", () => {
    const s = finoraReducer(
      { ...initialFinoraState, score: 82 },
      { type: "ROGUE_BLOCKED", tx, notification: notif, scoreDelta: 4 }
    );
    expect(s.score).toBe(78);
  });

  it("clamps score to a floor of 40", () => {
    const s = finoraReducer(
      { ...initialFinoraState, score: 41 },
      { type: "ROGUE_BLOCKED", tx, notification: notif, scoreDelta: 9 }
    );
    expect(s.score).toBe(40);
  });

  it("recomputes credit terms when a rogue block changes score on an active line", () => {
    const approved = { ...initialFinoraState, score: 82, creditStatus: "approved" as const, limit: 7900, apr: 13.6 };
    const s = finoraReducer(approved, { type: "ROGUE_BLOCKED", tx, notification: notif, scoreDelta: 6 });
    const expected = computeCreditTerms(76);

    expect(s.score).toBe(76);
    expect(s.limit).toBe(expected.limit);
    expect(s.apr).toBe(expected.apr);
  });

  it("leaves limit/apr untouched by score changes when no line is active", () => {
    const idle = { ...initialFinoraState, score: 82, limit: 0, apr: 0 };
    const s = finoraReducer(idle, { type: "ROGUE_BLOCKED", tx, notification: notif, scoreDelta: 4 });
    expect(s.limit).toBe(0);
    expect(s.apr).toBe(0);
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
