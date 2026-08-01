import type { Metadata } from "next";
import { ConsoleSection } from "@/components/ConsoleSection";
import { CTA } from "@/components/CTA";

export const metadata: Metadata = {
  title: "Live Console — Finora",
  description:
    "Request credit for an autonomous agent, spend against it, try to break the rules, and pull the kill switch — live.",
};

export default function ConsolePage() {
  return (
    <div className="pt-10">
      <ConsoleSection />
      <CTA
        heading={
          <>
            Like what the console just did?
            <br />
            <span className="text-gradient">See how the pricing works.</span>
          </>
        }
        body="Finora is priced for how agents actually spend — per active agent, not per seat."
        ctaLabel="View pricing →"
        ctaHref="/pricing"
      />
    </div>
  );
}
