import { ExternalLink, CheckCircle2, CircleDashed } from "lucide-react";

/**
 * Shows the live deployment status of each contract on Base Sepolia. Reads
 * the deployed addresses from env (set after `npm run deploy:baseSepolia`).
 * When an address is present it links straight to the verified contract on
 * Basescan — turning "enforced on-chain" from a claim into something a judge
 * can click and inspect: source, state, and every transaction.
 */

// Defaults to Base Sepolia; set NEXT_PUBLIC_EXPLORER_URL to
// "https://sepolia.etherscan.io/address/" if you deploy to Ethereum Sepolia.
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.basescan.org/address/";
const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "Base Sepolia";

const CONTRACTS = [
  { name: "AgentWallet.sol", env: process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS, desc: "Spend caps, allowlist, kill switch, in-flight revocation, grants" },
  { name: "CreditLine.sol", env: process.env.NEXT_PUBLIC_CREDIT_LINE_ADDRESS, desc: "Reputation-scaled credit, slashable bond, skim-at-source repayment" },
  { name: "ReputationRegistry.sol", env: process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS, desc: "Portable on-chain reputation, principal-inheritance" },
  { name: "SettlementEscrow.sol", env: process.env.NEXT_PUBLIC_SETTLEMENT_ESCROW_ADDRESS, desc: "Trustless revenue capture — agent can't redirect income" },
];

export function OnchainStatus() {
  const anyDeployed = CONTRACTS.some((c) => c.env);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">On {NETWORK_NAME}</h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest ${
            anyDeployed ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-surface-2 text-muted"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${anyDeployed ? "bg-accent" : "bg-muted"}`} />
          {anyDeployed ? "Live" : "Deploy pending"}
        </span>
      </div>

      <div className="space-y-2.5">
        {CONTRACTS.map((c) => {
          const deployed = Boolean(c.env);
          return (
            <div key={c.name} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-2/40 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {deployed ? (
                    <CheckCircle2 size={14} className="shrink-0 text-accent" />
                  ) : (
                    <CircleDashed size={14} className="shrink-0 text-muted" />
                  )}
                  <span className="font-mono text-[13px] text-foreground">{c.name}</span>
                </div>
                <p className="mt-0.5 pl-6 text-[11.5px] leading-snug text-muted">{c.desc}</p>
              </div>
              {deployed ? (
                <a
                  href={`${EXPLORER}${c.env}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent/20"
                >
                  Explorer <ExternalLink size={11} />
                </a>
              ) : (
                <span className="shrink-0 font-mono text-[10px] uppercase text-muted">not set</span>
              )}
            </div>
          );
        })}
      </div>

      {!anyDeployed && (
        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          Run <code className="font-mono text-foreground">cd onchain &amp;&amp; npm run deploy:baseSepolia</code>,
          then add the printed addresses to <code className="font-mono text-foreground">.env.local</code> — this
          panel lights up with live Basescan links automatically.
        </p>
      )}
    </div>
  );
}
