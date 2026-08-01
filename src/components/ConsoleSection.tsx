import { Section } from "./ui/Section";
import { Console } from "./console/Console";
import { PhoneApp } from "./console/PhoneApp";

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
          <Console />
        </div>
      </Section>

      <Section
        eyebrow="Same policy, another surface"
        title="Or run the whole thing from your pocket"
        description="This isn't a notification mirror of the console above — it's a separate, fully working mobile app with its own state. Tap through it: request credit, spend, get blocked, and pull the kill switch, all from the phone itself."
      >
        <div className="dark-scope rounded-3xl border border-border p-4 sm:p-10">
          <PhoneApp />
        </div>
      </Section>
    </>
  );
}
