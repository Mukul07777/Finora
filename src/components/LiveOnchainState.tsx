"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Radio } from "lucide-react";

/**
 * Live, read-only proof that the deployed Sepolia contracts aren't just
 * addresses on Etherscan — they hold real, queryable state right now.
 * Calls /api/v1/onchain/status, which does actual eth_call reads against
 * AgentWallet, CreditLine, and ReputationRegistry. No wallet, no gas.
 */

type Status = {
  ok: boolean;
  network?: string;
  fetchedAt?: string;
  agentWallet?: {
    address: string;
    owner: string;
    agent: string;
    paused: boolean;
    perTxLimitEth: string;
    dailyLimitEth: string;
  };
  reputation?: {
    address: string;
    agentScoreDisplay: number;
    bootstrapped: boolean;
  };
  creditLine?: {
    address: string;
    open: boolean;
    baseLimitEth: string;
    aprPercent: number;
    drawnEth: string;
    bondEth: string;
    poolBalanceEth: string;
  };
  error?: string;
};

function short(addr?: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function LiveOnchainState() {
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/onchain/status", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ ok: false, error: "Network error reaching the read API." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-accent" />
          <h3 className="font-display text-base font-semibold text-foreground">Live on-chain state</h3>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] font-medium text-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          {loading ? "Reading…" : "Refresh"}
        </button>
      </div>

      <p className="mb-4 text-[12px] leading-relaxed text-muted">
        Real <code className="font-mono text-foreground">eth_call</code> reads against the deployed contracts on{" "}
        {data?.network || "Ethereum Sepolia"} — no wallet, no gas, no simulation. This is what those addresses
        actually hold right now.
      </p>

      {!data && (
        <div className="rounded-xl border border-border bg-surface-2/40 px-4 py-6 text-center text-[12px] text-muted">
          Loading on-chain state…
        </div>
      )}

      {data && !data.ok && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-4 text-[12px] text-danger">
          {data.error || "Could not read on-chain state."}
        </div>
      )}

      {data?.ok && (
        <div className="space-y-2.5">
          <div className="rounded-xl border border-border bg-surface-2/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[12px] text-foreground">AgentWallet</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                  data.agentWallet?.paused ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"
                }`}
              >
                {data.agentWallet?.paused ? "Paused" : "Active"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[11.5px] text-muted">
              <span>Owner</span>
              <span className="text-right font-mono text-foreground">{short(data.agentWallet?.owner)}</span>
              <span>Agent</span>
              <span className="text-right font-mono text-foreground">{short(data.agentWallet?.agent)}</span>
              <span>Per-tx cap</span>
              <span className="text-right font-mono text-foreground">{data.agentWallet?.perTxLimitEth} ETH</span>
              <span>Daily cap</span>
              <span className="text-right font-mono text-foreground">{data.agentWallet?.dailyLimitEth} ETH</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[12px] text-foreground">ReputationRegistry</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                  data.reputation?.bootstrapped ? "bg-accent/10 text-accent" : "bg-surface text-muted"
                }`}
              >
                {data.reputation?.bootstrapped ? "Bootstrapped" : "Unbootstrapped"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[11.5px] text-muted">
              <span>Agent score</span>
              <span className="text-right font-mono text-foreground">
                {data.reputation?.bootstrapped ? data.reputation?.agentScoreDisplay : "—"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/40 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[12px] text-foreground">CreditLine</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                  data.creditLine?.open ? "bg-accent/10 text-accent" : "bg-surface text-muted"
                }`}
              >
                {data.creditLine?.open ? "Open" : "Closed"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[11.5px] text-muted">
              <span>Base limit</span>
              <span className="text-right font-mono text-foreground">{data.creditLine?.baseLimitEth} ETH</span>
              <span>APR</span>
              <span className="text-right font-mono text-foreground">{data.creditLine?.aprPercent}%</span>
              <span>Drawn</span>
              <span className="text-right font-mono text-foreground">{data.creditLine?.drawnEth} ETH</span>
              <span>Bond posted</span>
              <span className="text-right font-mono text-foreground">{data.creditLine?.bondEth} ETH</span>
            </div>
          </div>

          {data.fetchedAt && (
            <p className="pt-1 text-center text-[10px] text-muted/70">
              Read at {new Date(data.fetchedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
