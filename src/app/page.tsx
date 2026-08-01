import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { HowItWorks } from "@/components/HowItWorks";
import { Features } from "@/components/Features";
import { ConsoleSection } from "@/components/ConsoleSection";
import { Metrics } from "@/components/Metrics";
import { Architecture } from "@/components/Architecture";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <ConsoleSection />
        <Metrics />
        <Architecture />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
