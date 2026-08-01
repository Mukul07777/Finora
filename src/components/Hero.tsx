"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroTerminal } from "./HeroTerminal";
import { ParticleMesh } from "./ui/ParticleMesh";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Hero() {
  return (
    <div id="top" className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 -z-10 h-[720px]" />

      {/* decorative gradient orbs */}
      <div
        className="orb animate-float-slow -left-24 top-10 h-72 w-72 opacity-60"
        style={{ background: "radial-gradient(circle, rgba(5,150,105,0.22), transparent 70%)" }}
      />
      <div
        className="orb animate-float-slower right-0 top-32 h-96 w-96 opacity-50"
        style={{ background: "radial-gradient(circle, rgba(67,56,202,0.18), transparent 70%)" }}
      />
      <div
        className="orb animate-float-slow left-1/3 top-96 h-64 w-64 opacity-40"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.16), transparent 70%)" }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-28"
      >
        <div>
          <motion.div
            variants={item}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Fintech · Autonomous Agent Credit &amp; Control
          </motion.div>

          <motion.h1
            variants={item}
            className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Give agents money.
            <br />
            <span className="text-gradient">Keep a hand on the leash.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Finora is the financial operating system for autonomous AI agents — a verifiable
            identity, a real-time reputation score, a dynamically underwritten credit line, and a
            wallet-layer kill switch that works even when the agent doesn&apos;t cooperate.
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/console"
              className="glow-accent rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition-transform hover:scale-[1.03]"
            >
              Launch Live Console →
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-muted"
            >
              How it works
            </a>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-14 flex flex-col gap-3 border-t border-border pt-8 sm:max-w-lg"
          >
            <Capability text="Policy enforced outside the agent" />
            <Capability text="Owner-controlled emergency pause" />
            <Capability text="In-flight payment revocation" />
          </motion.div>
        </div>

        <motion.div
          variants={item}
          className="relative flex justify-center lg:justify-end"
        >
          <ParticleMesh className="pointer-events-none absolute -right-10 -top-14 h-40 w-64 opacity-80" />
          <div className="animate-float-card">
            <HeroTerminal />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Capability({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-foreground">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      {text}
    </div>
  );
}
