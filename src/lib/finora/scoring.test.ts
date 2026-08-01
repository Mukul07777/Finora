import { describe, expect, it } from "vitest";
import { computeCreditTerms, computeRogueScorePenalty, computeVelocityRisk } from "./scoring";
import { Tx } from "./types";

function tx(timestamp: number): Tx {
  return {
    id: `tx_${timestamp}`,
    time: "00:00:00",
    timestamp,
    label: "Task expense",
    counterparty: "api.compute.gpu",
    amount: 100,
    status: "approved",
    note: "",
  };
}

describe("computeCreditTerms", () => {
  it("gives worse terms at the score floor than at the ceiling", () => {
    const low = computeCreditTerms(40);
    const high = computeCreditTerms(99);
    expect(low.limit).toBeLessThan(high.limit);
    expect(low.apr).toBeGreaterThan(high.apr);
  });

  it("moves terms in the expected direction as score changes", () => {
    const before = computeCreditTerms(82);
    const after = computeCreditTerms(76);
    expect(after.limit).toBeLessThan(before.limit);
    expect(after.apr).toBeGreaterThan(before.apr);
  });

  it("clamps out-of-range scores instead of producing nonsense terms", () => {
    expect(computeCreditTerms(10)).toEqual(computeCreditTerms(40));
    expect(computeCreditTerms(200)).toEqual(computeCreditTerms(99));
  });
});

describe("computeVelocityRisk", () => {
  it("is low when there's no recent transaction history", () => {
    const risk = computeVelocityRisk([], Date.now());
    expect(risk).toBeCloseTo(0.5, 2);
  });

  it("rises with more transactions inside the recency window", () => {
    const now = 100_000;
    const txs = [tx(now - 1000), tx(now - 2000), tx(now - 3000)];
    const risk = computeVelocityRisk(txs, now, 6000);
    expect(risk).toBeGreaterThan(0.5);
  });

  it("ignores transactions outside the recency window", () => {
    const now = 100_000;
    const txs = [tx(now - 60_000)];
    const risk = computeVelocityRisk(txs, now, 6000);
    expect(risk).toBeCloseTo(0.5, 2);
  });

  it("never exceeds the 0.97 ceiling", () => {
    const now = 100_000;
    const txs = Array.from({ length: 20 }, (_, i) => tx(now - i * 100));
    expect(computeVelocityRisk(txs, now, 6000)).toBeLessThanOrEqual(0.97);
  });
});

describe("computeRogueScorePenalty", () => {
  it("stays within the 2-9 point range across the full risk domain", () => {
    for (let risk = 0; risk <= 1; risk += 0.1) {
      const penalty = computeRogueScorePenalty(risk);
      expect(penalty).toBeGreaterThanOrEqual(2);
      expect(penalty).toBeLessThanOrEqual(9);
    }
  });

  it("penalizes higher risk more than lower risk", () => {
    expect(computeRogueScorePenalty(0.9)).toBeGreaterThan(computeRogueScorePenalty(0.1));
  });
});
