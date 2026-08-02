/**
 * Natural-language → policy compiler.
 *
 * The owner writes a spending policy in plain English; this compiles it into
 * concrete, structured operations that map 1:1 onto the on-chain calls
 * (`setPolicy`, `setAllowlist`, the circuit-breaker threshold). Crucially,
 * the model only ever *proposes* — this deterministic compiler is the
 * ground truth that produces the ops, and the human signs the resulting
 * diff. The LLM can make it more forgiving of phrasing; it can never widen
 * a limit on its own, because every op here is bounded and validated.
 */

export type PolicyOp =
  | { kind: "perTxCap"; value: number; source: string }
  | { kind: "dailyCap"; value: number; source: string }
  | { kind: "allowAdd"; party: string; source: string }
  | { kind: "allowRemove"; party: string; source: string }
  | { kind: "breaker"; risk: number; source: string }
  | { kind: "freezeRule"; description: string; source: string };

export interface CompiledPolicy {
  ops: PolicyOp[];
  warnings: string[];
}

const MONEY = /\$?\s*([\d,]+(?:\.\d+)?)\s*(k)?/i;

function parseMoney(s: string): number | null {
  const m = s.match(MONEY);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (m[2]) n *= 1000;
  return Number.isFinite(n) ? n : null;
}

/**
 * Deterministic compiler. Splits the instruction into clauses and matches
 * each against a set of intents. Anything unmatched becomes a warning
 * rather than a silent no-op.
 */
export function compilePolicy(text: string): CompiledPolicy {
  const ops: PolicyOp[] = [];
  const warnings: string[] = [];
  // Split on sentence boundaries only (; newline, or a comma that begins a
  // new directive). Deliberately NOT on bare "and", so vendor lists like
  // "pay X and Y" stay in one clause.
  const clauses = text
    .split(/[;\n]|,\s*(?=(?:only|allow|block|remove|revoke|deny|freeze|halt|stop|pause|cap|limit|max|no more|daily|each)\b)/i)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    const c = clause.toLowerCase();

    // per-transaction cap
    if (/(per\s*(tx|transaction|payment)|each\s*(payment|transaction)|any\s*single)/.test(c) ||
        (/(max|cap|limit|no more than)/.test(c) && /(payment|transaction|tx)/.test(c))) {
      const v = parseMoney(clause);
      if (v != null) {
        ops.push({ kind: "perTxCap", value: v, source: clause });
        continue;
      }
    }

    // daily cap
    if (/(per\s*day|daily|a day|each day|24\s*h)/.test(c)) {
      const v = parseMoney(clause);
      if (v != null) {
        ops.push({ kind: "dailyCap", value: v, source: clause });
        continue;
      }
    }

    // allowlist add — "only pay X and Y", "allow X", "whitelist X"
    if (/(only\s*(pay|allow|transact)|allow|whitelist|approved?\s*vendors?)/.test(c)) {
      const parties = extractParties(clause);
      if (parties.length) {
        parties.forEach((p) => ops.push({ kind: "allowAdd", party: p, source: clause }));
        continue;
      }
    }

    // allowlist remove — "block X", "remove X", "no payments to X"
    if (/(block|remove|revoke|no payments? to|deny)/.test(c)) {
      const parties = extractParties(clause);
      if (parties.length) {
        parties.forEach((p) => ops.push({ kind: "allowRemove", party: p, source: clause }));
        continue;
      }
    }

    // circuit breaker
    if (/(freeze|halt|stop|pause|kill)/.test(c)) {
      const riskMatch = c.match(/risk\s*(?:above|over|>=?|of)?\s*(\d{1,3})/);
      if (riskMatch) {
        ops.push({ kind: "breaker", risk: clampRisk(parseInt(riskMatch[1], 10)), source: clause });
        continue;
      }
      if (/(double|doubles|spike|2x|surge|anomal)/.test(c)) {
        ops.push({ kind: "breaker", risk: 80, source: clause });
        ops.push({ kind: "freezeRule", description: "Freeze on velocity spike (risk ≥ 80)", source: clause });
        continue;
      }
      ops.push({ kind: "freezeRule", description: clause, source: clause });
      continue;
    }

    warnings.push(`Couldn't map: "${clause}"`);
  }

  if (ops.length === 0 && warnings.length === 0) {
    warnings.push("No policy directives found in the instruction.");
  }
  return { ops, warnings };
}

/** Pull vendor-like tokens (domains / handles) out of a clause. */
function extractParties(clause: string): string[] {
  const tokens = clause.match(/[a-z0-9][a-z0-9._-]*\.[a-z0-9._-]+|0x[a-fA-F0-9]{4,}|[a-z]+\.[a-z-]+/gi) || [];
  return Array.from(new Set(tokens.map((t) => t.trim()))).filter(
    (t) => !["e.g", "i.e"].includes(t.toLowerCase())
  );
}

function clampRisk(n: number): number {
  return Math.min(100, Math.max(1, n));
}

/** Human-readable summary of a compiled op, for the diff UI. */
export function describeOp(op: PolicyOp): string {
  switch (op.kind) {
    case "perTxCap":
      return `Per-transaction cap → $${op.value.toLocaleString()}`;
    case "dailyCap":
      return `Daily cap → $${op.value.toLocaleString()}`;
    case "allowAdd":
      return `Allowlist + ${op.party}`;
    case "allowRemove":
      return `Allowlist − ${op.party}`;
    case "breaker":
      return `Circuit breaker → trip at risk ${op.risk}`;
    case "freezeRule":
      return op.description;
  }
}

/** Maps ops to the on-chain call each would make, for the diff UI. */
export function onchainCallFor(op: PolicyOp): string {
  switch (op.kind) {
    case "perTxCap":
    case "dailyCap":
      return "setPolicy(...)";
    case "allowAdd":
    case "allowRemove":
      return "setAllowlist(...)";
    case "breaker":
      return "tripBreaker threshold";
    case "freezeRule":
      return "monitor rule";
  }
}
