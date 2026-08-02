import type { Metadata } from "next";
import { FlowSection } from "@/components/FlowSection";
import { CTA } from "@/components/CTA";

export const metadata: Metadata = {
  title: "Money Map — Finora",
  description:
    "Trace every dollar of an autonomous agent's credit: drawdown, spend, and repayment skimmed at source before the agent can touch it.",
};

export default function FlowPage() {
  return (
    <div className="pt-10">
      <FlowSection />
      <CTA
        heading={
          <>
            Money can&apos;t escape the contract.
            <br />
            <span className="text-gradient">See how the rules are enforced.</span>
          </>
        }
        body="Repayment, spend caps, and the kill switch are all enforced on-chain, independent of the agent."
        ctaLabel="Open the live console →"
        ctaHref="/console"
      />
    </div>
  );
}
