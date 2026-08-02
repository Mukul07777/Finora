import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";

/**
 * Real transaction hashes from `npm run demo:live` (onchain/scripts/proveSepolia.ts)
 * run against the ALREADY-DEPLOYED Sepolia contracts — not the in-memory Hardhat
 * EVM the demos above use. Every link is a real, independently-verifiable
 * Sepolia transaction, including the two blocked payments, which reverted
 * on-chain (not just in a local test) with the exact policy error described.
 *
 * Regenerate by re-running `npm run demo:live` in /onchain and swapping the
 * hashes below with the new output.
 */
const PROOF = [
  {
    label: "Allowlist demo vendor",
    detail: "Owner adds a fresh counterparty to the allowlist — setAllowlist(vendor, true)",
    hash: "0x6892c33839404475aa7f06d4bb15c0b81f039bc0d7593c284ab2f5a8cd6c1209",
    result: "success" as const,
  },
  {
    label: "Allowed payment to allowlisted vendor",
    detail: "directPay() to the now-allowlisted address — passes every policy check",
    hash: "0xd32650b43088506c3f0901a454378931fd533f4b4c713ae692136737a3391ba0",
    result: "success" as const,
  },
  {
    label: "Blocked: payment to unlisted address",
    detail: "directPay() to a random, never-allowlisted address",
    hash: "0x8afcfbe9d0fc69c5de970c8f0e34a557f42b3fdef180f80fd8b593d128786bc2",
    result: "reverted" as const,
    reason: "NotAllowlisted(...)",
  },
  {
    label: "Owner pause() — kill switch engaged",
    detail: "One owner-signed transaction freezes the wallet",
    hash: "0xda934331e4a6ed3181deb9198028897d913e48a2c1eab3b131a6cfd28cea0a4f",
    result: "success" as const,
  },
  {
    label: "Blocked: payment while paused",
    detail: "directPay() to the allowlisted vendor — blocked anyway, because the wallet is frozen",
    hash: "0x4ac3ddabc873d40610db9421b7355c189dd9a7deb6967dccfc5de0b962c58d67",
    result: "reverted" as const,
    reason: "ContractPaused()",
  },
  {
    label: "Owner unpause() — restore normal operation",
    detail: "Wallet returns to normal operation for the next visitor",
    hash: "0x13c1f6941c6bb1cc890daef5fa0cbae8e984f20100848ac33c611188e56d39c1",
    result: "success" as const,
  },
];

const EXPLORER = "https://sepolia.etherscan.io/tx/";

export function LiveTransactionProof() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-accent">
          Verified on Sepolia
        </span>
        <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-muted">
          The same attack-and-kill-switch story above, run for real against the deployed contracts —
          not the in-memory Hardhat EVM. Every hash below is a real Sepolia transaction, including the
          two blocked payments, which reverted on-chain with the exact policy error shown.
        </p>
      </div>

      <div className="space-y-2">
        {PROOF.map((p) => (
          <a
            key={p.hash}
            href={`${EXPLORER}${p.hash}`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3 transition hover:border-accent/40 hover:bg-surface-2"
          >
            {p.result === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 text-accent" />
            ) : (
              <XCircle size={16} className="shrink-0 text-danger" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">{p.label}</span>
                {p.result === "reverted" && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 font-mono text-[10px] text-danger">
                    reverted: {p.reason}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11.5px] text-muted">{p.detail}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 font-mono text-[10.5px] text-muted group-hover:text-accent">
              {p.hash.slice(0, 8)}…{p.hash.slice(-6)} <ExternalLink size={11} />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
