import { Section } from "./ui/Section";
import { Console } from "./console/Console";
import { PhoneApp } from "./console/PhoneApp";
import { FinoraProvider } from "@/lib/finora/FinoraProvider";

function SimulationBadge() {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted" />
      Simulation Mode — in-browser state, no blockchain involved
    </div>
  );
}

export function ConsoleSection() {
  return (
    <FinoraProvider>
      <Section
        id="console"
        eyebrow="The problem, made concrete"
        title="An AI agent needs money to work. How do you lend to it — safely?"
        description="Autonomous agents already buy compute and place orders, but they can't sign a contract, post collateral, or be sued. Finora gives an agent a credit line it can use, and enforces the rules at the wallet layer — so a rogue agent is stopped by code, not trust. New here? Press play on the guided story below and watch it happen."
      >
        <div className="dark-scope rounded-3xl border border-border p-4 sm:p-8">
          <SimulationBadge />
          <Console />
        </div>
      </Section>

      <Section
        eyebrow="Same policy, another surface"
        title="Or run the whole thing from your pocket"
        description="This is the same agent session as the console above, not a separate demo — it's a fully working mobile app you can tap through on its own. Pull the kill switch here and the console above freezes too, because it's the same policy enforced from a different surface."
      >
        <div className="dark-scope rounded-3xl border border-border p-4 sm:p-10">
          <SimulationBadge />
          <PhoneApp />
        </div>
      </Section>
    </FinoraProvider>
  );
}
