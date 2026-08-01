import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluatePayment } from "./simulationAdapter";
import { ALLOWLIST, FinoraState } from "../types";
import { initialFinoraState } from "../reducer";

function stateWith(overrides: Partial<FinoraState>): FinoraState {
  return { ...initialFinoraState, ...overrides };
}

describe("evaluatePayment", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("picks a merchant from the allowlist and an amount in the expected range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = evaluatePayment(stateWith({ limit: 10_000, balance: 0 }));

    expect(ALLOWLIST).toContain(result.merchant);
    expect(result.merchant).toBe(ALLOWLIST[0]);
    expect(result.amount).toBe(80); // 80 + 0 * 370, rounded
    expect(result.allowed).toBe(true);
  });

  it("blocks the payment when it would exceed remaining headroom", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // pushes amount toward the top of its range
    const result = evaluatePayment(stateWith({ limit: 500, balance: 470 })); // only 30 remaining

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/exceeds available credit/i);
  });

  it("allows the payment when headroom comfortably covers it", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = evaluatePayment(stateWith({ limit: 10_000, balance: 0 }));

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
