/**
 * Collusion / wash-trading detection.
 *
 * A reputation system that rewards "revenue" is gameable: agents can pay
 * each other in circles, report the inflows as real revenue, inflate their
 * scores, unlock bigger credit lines, and default together. This is the
 * canonical attack on undercollateralized, reputation-based lending — and
 * defending it is what separates a toy score from a trustworthy one.
 *
 * This module runs graph analysis over the payment ledger and derives, per
 * agent, a REPUTATION AUTHENTICITY score (0-100) that discounts revenue
 * which looks self-dealt rather than earned from real, external customers.
 *
 * Pure and deterministic: same ledger in, same verdict out.
 */

export interface PaymentEdge {
  from: string; // payer id (agent or external customer)
  to: string; // payee id (agent or vendor)
  amount: number;
  at: number; // epoch ms
}

export interface AgentFinding {
  agent: string;
  authenticity: number; // 0..100 (100 = clean, all revenue externally sourced)
  reasons: string[];
  externalRevenue: number;
  internalRevenue: number;
  reciprocalPartners: string[];
  inCycle: boolean;
}

export interface CollusionReport {
  findings: AgentFinding[];
  rings: string[][]; // detected payment cycles among agents
  suspiciousPairs: [string, string][]; // reciprocal (A↔B) pairs
}

/**
 * @param edges   the payment ledger
 * @param agents  the set of ids that are Finora agents (everything else —
 *                real customers, external vendors — is treated as "external")
 */
export function detectCollusion(edges: PaymentEdge[], agents: string[]): CollusionReport {
  const agentSet = new Set(agents);

  // Aggregate directed flow between parties.
  const flow = new Map<string, number>(); // "from->to" -> amount
  const key = (a: string, b: string) => `${a}->${b}`;
  for (const e of edges) {
    flow.set(key(e.from, e.to), (flow.get(key(e.from, e.to)) ?? 0) + e.amount);
  }

  // Reciprocal pairs among agents: A→B and B→A both exist.
  const suspiciousPairs: [string, string][] = [];
  const reciprocalOf = new Map<string, Set<string>>();
  for (const a of agents) {
    for (const b of agents) {
      if (a >= b) continue; // unordered pair, once
      if ((flow.get(key(a, b)) ?? 0) > 0 && (flow.get(key(b, a)) ?? 0) > 0) {
        suspiciousPairs.push([a, b]);
        if (!reciprocalOf.has(a)) reciprocalOf.set(a, new Set());
        if (!reciprocalOf.has(b)) reciprocalOf.set(b, new Set());
        reciprocalOf.get(a)!.add(b);
        reciprocalOf.get(b)!.add(a);
      }
    }
  }

  // Cycles among agents up to length 4 (A→B→C→A). DFS on the agent subgraph.
  const adj = new Map<string, string[]>();
  for (const a of agents) adj.set(a, []);
  for (const e of edges) {
    if (agentSet.has(e.from) && agentSet.has(e.to) && e.from !== e.to) {
      adj.get(e.from)!.push(e.to);
    }
  }
  const rings = findCycles(adj, agents, 4);
  const inCycle = new Set<string>();
  rings.forEach((r) => r.forEach((n) => inCycle.add(n)));

  // Per-agent revenue split: external (from a non-agent) vs internal (from
  // another agent). Internal revenue is the raw material of wash trading.
  const findings: AgentFinding[] = agents.map((agent) => {
    let external = 0;
    let internal = 0;
    for (const e of edges) {
      if (e.to !== agent) continue;
      if (agentSet.has(e.from)) internal += e.amount;
      else external += e.amount;
    }
    const total = external + internal;
    const internalShare = total > 0 ? internal / total : 0;

    const reasons: string[] = [];
    let penalty = 0;

    if (internalShare > 0) {
      penalty += internalShare * 55;
      reasons.push(
        `${Math.round(internalShare * 100)}% of revenue comes from other agents, not external customers`
      );
    }
    const partners = Array.from(reciprocalOf.get(agent) ?? []);
    if (partners.length) {
      penalty += 25;
      reasons.push(`Reciprocal payments with ${partners.join(", ")} (pays and is paid by the same party)`);
    }
    if (inCycle.has(agent)) {
      penalty += 25;
      reasons.push("Sits inside a circular payment ring");
    }
    if (reasons.length === 0) {
      reasons.push("All revenue externally sourced — no self-dealing detected");
    }

    const authenticity = Math.max(0, Math.min(100, Math.round(100 - penalty)));
    return {
      agent,
      authenticity,
      reasons,
      externalRevenue: external,
      internalRevenue: internal,
      reciprocalPartners: partners,
      inCycle: inCycle.has(agent),
    };
  });

  return { findings, rings, suspiciousPairs };
}

/** Simple bounded cycle enumeration on a small directed graph. */
function findCycles(adj: Map<string, string[]>, nodes: string[], maxLen: number): string[][] {
  const cycles: string[][] = [];
  const seen = new Set<string>();

  for (const start of nodes) {
    const stack: string[] = [start];
    const onPath = new Set<string>([start]);

    const dfs = (node: string) => {
      for (const next of adj.get(node) ?? []) {
        if (next === start && stack.length >= 2) {
          const cyc = [...stack];
          const sig = [...cyc].sort().join("|");
          if (!seen.has(sig)) {
            seen.add(sig);
            cycles.push(cyc);
          }
          continue;
        }
        if (onPath.has(next) || stack.length >= maxLen) continue;
        // only extend to nodes greater-or-equal keeps duplicates down a bit
        stack.push(next);
        onPath.add(next);
        dfs(next);
        stack.pop();
        onPath.delete(next);
      }
    };
    dfs(start);
  }
  return cycles;
}

/**
 * Blends a raw reputation score with authenticity: a high score built on
 * fake revenue is discounted. This is what a lender should actually use.
 */
export function authenticityAdjustedScore(rawScore: number, authenticity: number): number {
  return Math.round(rawScore * (0.4 + 0.6 * (authenticity / 100)));
}
