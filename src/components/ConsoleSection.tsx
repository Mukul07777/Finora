import { Section } from "./ui/Section";
import { Console } from "./console/Console";
import { PhoneApp } from "./console/PhoneApp";

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
    <>
      <Section
        id="console"
        eyebrow="Try it yourself"
        title="A live, clickable console — not a mockup"
        description="Request credit, spend against it, try to break the rules, and pull the kill switch. Every panel below reacts in real time."
      >
        <div className="dark-scope rounded-3xl border border-border p-4 sm:p-8">
          <SimulationBadge />
          <Console />
        </div>
      </Section>

      <Section
        eyebrow="Same policy, another surface"
        title="Or run the whole thing from your pocket"
        description="This isn't a notification mirror of the console above — it's a separate, fully working mobile app with its own state. Tap through it: request credit, spend, get blocked, and pull the kill switch, all from the phone itself."
      >
        <div className="dark-scope rounded-3xl border border-border p-4 sm:p-10">
          <SimulationBadge />
          <PhoneApp />
        </div>
      </Section>
    </>
  );
}
