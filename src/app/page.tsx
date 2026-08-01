import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { ConsoleTeaser } from "@/components/ConsoleTeaser";
import { CTA } from "@/components/CTA";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <ConsoleTeaser />
      <CTA />
    </>
  );
}
