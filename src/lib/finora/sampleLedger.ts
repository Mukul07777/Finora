import { PaymentEdge } from "./collusion";

/**
 * A demo payment ledger with one honest agent and a three-agent
 * wash-trading ring, so the collusion detector has something real to catch.
 *
 * - agent.procure-01  → honest: paid only by external customers.
 * - ring.a / ring.b / ring.c → collude: they pay each other in a circle
 *   (a→b→c→a) and also do reciprocal a↔b payments, reporting the inflows as
 *   "revenue" to pump their scores. Almost none of their revenue is external.
 */

export const DEMO_AGENTS = ["agent.procure-01", "ring.a", "ring.b", "ring.c"];

const T = Date.UTC(2026, 6, 1);
const h = (n: number) => T - n * 3_600_000;

export const SAMPLE_LEDGER: PaymentEdge[] = [
  // honest agent — all revenue from external customers
  { from: "customer.acme", to: "agent.procure-01", amount: 4200, at: h(40) },
  { from: "customer.globex", to: "agent.procure-01", amount: 3100, at: h(28) },
  { from: "customer.initech", to: "agent.procure-01", amount: 2600, at: h(12) },
  { from: "agent.procure-01", to: "vendor.data-feed", amount: 900, at: h(11) },

  // wash-trading ring: circular a→b→c→a
  { from: "ring.a", to: "ring.b", amount: 5000, at: h(30) },
  { from: "ring.b", to: "ring.c", amount: 4800, at: h(29) },
  { from: "ring.c", to: "ring.a", amount: 4700, at: h(28) },
  // plus reciprocal a↔b to double-pump
  { from: "ring.b", to: "ring.a", amount: 3000, at: h(20) },
  { from: "ring.a", to: "ring.b", amount: 2900, at: h(19) },
  // a tiny sliver of real external revenue to look legitimate
  { from: "customer.smallco", to: "ring.a", amount: 400, at: h(6) },
];
