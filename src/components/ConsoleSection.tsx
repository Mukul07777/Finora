import { Section } from "./ui/Section";
import { Console } from "./console/Console";

export function ConsoleSection() {
  return (
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
  );
}
