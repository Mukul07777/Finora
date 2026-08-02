"use client";

import { useState } from "react";
import { Wand2, ArrowRight, Check } from "lucide-react";
import { useFinoraActions } from "@/lib/finora/FinoraProvider";
import {
  compilePolicy,
  describeOp,
  onchainCallFor,
  CompiledPolicy,
  PolicyOp,
} from "@/lib/finora/policyCompiler";
import { MIN_PER_TX_CAP, MAX_PER_TX_CAP } from "@/lib/finora/types";

const EXAMPLE =
  "Max $500 per transaction; only pay api.compute.gpu and vendor.data-feed; block unknown.wallet-x02; no more than $2000 per day; freeze if spend doubles";

export function PolicyCompiler() {
  const actions = useFinoraActions();
  const [text, setText] = useState(EXAMPLE);
  const [compiled, setCompiled] = useState<CompiledPolicy | null>(null);
  const [busy, setBusy] = useState(false);
  const [usedModel, setUsedModel] = useState<boolean | null>(null);
  const [applied, setApplied] = useState(false);

  async function onCompile() {
    setBusy(true);
    setApplied(false);
    try {
      const res = await fetch("/api/policy/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data?.ok && data.compiled) {
        setCompiled(data.compiled);
        setUsedModel(Boolean(data.usedModel));
      } else {
        // Fall back to the identical deterministic compiler in-browser.
        setCompiled(compilePolicy(text));
        setUsedModel(false);
      }
    } catch {
      setCompiled(compilePolicy(text));
      setUsedModel(false);
    } finally {
      setBusy(false);
    }
  }

  function onApply() {
    if (!compiled) return;
    // Only the per-tx cap is a live control in the simulation; the rest are
    // shown as the on-chain calls they'd make. Clamp to the enforceable range.
    const perTx = compiled.ops.find((o): o is Extract<PolicyOp, { kind: "perTxCap" }> => o.kind === "perTxCap");
    if (perTx) {
      const clamped = Math.min(MAX_PER_TX_CAP, Math.max(MIN_PER_TX_CAP, perTx.value));
      actions.updatePolicy(clamped);
    }
    setApplied(true);
  }

  return (
    <div className="dark-scope card-premium rounded-2xl p-5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-foreground">
        <Wand2 size={13} className="text-violet" /> Policy in plain English
      </div>
      <p className="mb-3 text-[10.5px] leading-relaxed text-muted">
        Write the rules; the compiler turns them into the exact on-chain calls. The model only
        proposes — it can never widen a limit. You sign the diff.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground outline-none focus:border-violet/50"
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={onCompile}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-violet px-3.5 py-1.5 text-[11px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-60"
        >
          {busy ? "Compiling…" : "Compile policy"} <ArrowRight size={12} />
        </button>
        {usedModel !== null && (
          <span className="font-mono text-[9.5px] text-muted">
            {usedModel ? "normalized by Groq → deterministic compile" : "deterministic compile"}
          </span>
        )}
      </div>

      {compiled && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-surface-2/50 p-3">
          {compiled.ops.length === 0 && (
            <p className="text-[10.5px] text-warning">No directives recognized.</p>
          )}
          {compiled.ops.map((op, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="truncate text-[10.5px] text-foreground">
                <span className="text-accent">+</span> {describeOp(op)}
              </span>
              <span className="shrink-0 font-mono text-[9px] text-muted">{onchainCallFor(op)}</span>
            </div>
          ))}
          {compiled.warnings.map((w, i) => (
            <p key={`w${i}`} className="text-[10px] text-warning">
              ⚠ {w}
            </p>
          ))}

          {compiled.ops.some((o) => o.kind === "perTxCap") && (
            <button
              onClick={onApply}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent"
            >
              {applied ? (
                <>
                  <Check size={12} /> Applied — cap live on next payment
                </>
              ) : (
                <>Sign &amp; apply per-tx cap</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
