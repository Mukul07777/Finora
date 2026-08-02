"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Pause, RotateCcw, ArrowRight } from "lucide-react";
import { useFinoraActions, useFinoraState } from "@/lib/finora/FinoraProvider";

/**
 * Guided narrative. A first-time visitor shouldn't have to guess what the
 * panels mean — Story Mode drives the real agent through the actual problem
 * and solution, one plain-language beat at a time, so the whole console
 * explains itself in about a minute.
 */

interface Beat {
  title: string;
  say: string; // what's happening, plain English
  why: string; // why it matters
  run?: (a: ReturnType<typeof useFinoraActions>) => void;
  /** advance once this predicate is true (polled), else after `hold` ms */
  until?: (s: ReturnType<typeof useFinoraState>) => boolean;
  hold?: number;
}

const BEATS: Beat[] = [
  {
    title: "The problem",
    say: "Meet agent.procure-01 — an AI agent that needs $5,000 to buy compute and finish a paid task.",
    why: "It's software. It can't sign a contract, post collateral, or be taken to court. No bank will lend to it.",
    hold: 5200,
  },
  {
    title: "Underwriting",
    say: "Finora scores it from behaviour — task success, spend discipline, refund history — not a credit file.",
    why: "That's how you lend to something with no credit history: judge what it has actually done.",
    run: (a) => a.requestCredit(),
    until: (s) => s.creditStatus === "approved",
    hold: 10000,
  },
  {
    title: "It spends — safely",
    say: "Approved. The agent pays a vendor to do its work.",
    why: "But only allow-listed vendors, under a hard per-transaction cap — enforced outside the agent's own code.",
    run: (a) => a.sendPayment(),
    hold: 4200,
  },
  {
    title: "It tries to cheat",
    say: "Now the agent goes rogue — attempting a payment to an unknown party, over its cap.",
    why: "This is the real fear with autonomous money. Watch what the wallet layer does.",
    run: (a) => a.simulateRogue(),
    hold: 3600,
  },
  {
    title: "Blocked — not asked nicely",
    say: "The payment is refused and the agent's score drops.",
    why: "The rule lives in the wallet, not the agent. A compromised agent literally cannot override it.",
    hold: 4200,
  },
  {
    title: "The kill switch",
    say: "The owner sees something wrong and freezes the agent instantly.",
    why: "One action halts everything — including a payment already in flight. No support ticket, no delay.",
    run: (a) => a.toggleFreeze(),
    hold: 3600,
  },
  {
    title: "Back online",
    say: "Once it's safe, the owner reinstates the agent.",
    why: "Control is reversible and always in the owner's hands, not the agent's.",
    run: (a) => a.toggleFreeze(),
    hold: 3200,
  },
  {
    title: "It pays the loan back",
    say: "The task completes and revenue arrives — the loan is repaid automatically.",
    why: "Repayment is skimmed from revenue before the agent can touch it. It can't 'forget' to repay.",
    run: (a) => a.completeJob(),
    hold: 4200,
  },
  {
    title: "That's Finora",
    say: "Credit an autonomous agent can actually use — and a leash that actually holds.",
    why: "Identity, reputation, and credit to make it possible; wallet-layer enforcement to make it safe.",
    hold: 6000,
  },
];

export function StoryMode() {
  const state = useFinoraState();
  const actions = useFinoraActions();

  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(-1); // -1 = not started

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const playingRef = useRef(false);

  async function run() {
    playingRef.current = true;
    setPlaying(true);
    for (let i = 0; i < BEATS.length; i++) {
      if (!playingRef.current) return;
      setIndex(i);
      const beat = BEATS[i];
      if (beat.run) {
        try {
          beat.run(actions);
        } catch {
          /* guarded actions no-op if state isn't valid */
        }
      }
      await advance(beat);
      if (!playingRef.current) return;
    }
    playingRef.current = false;
    setPlaying(false);
  }

  function advance(beat: Beat): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now();
      const max = beat.hold ?? 3500;
      const tick = () => {
        if (!playingRef.current) return resolve();
        const elapsed = Date.now() - start;
        if (beat.until && beat.until(stateRef.current) && elapsed > 800) return resolve();
        if (elapsed >= max) return resolve();
        setTimeout(tick, 200);
      };
      setTimeout(tick, 200);
    });
  }

  function stop() {
    playingRef.current = false;
    setPlaying(false);
  }

  function restart() {
    stop();
    setIndex(-1);
    // brief tick so the loop restarts cleanly
    setTimeout(() => run(), 60);
  }

  useEffect(() => {
    return () => {
      playingRef.current = false;
    };
  }, []);

  const beat = index >= 0 ? BEATS[index] : null;

  return (
    <div className="dark-scope card-premium relative overflow-hidden rounded-2xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-accent">
              Guided story
            </span>
            <span className="text-[10px] text-muted">~60 seconds · watch it work</span>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground">
            New here? Don&apos;t click around blind — press play and watch a real agent get credit,
            try to cheat, get stopped, and pay it back. Every panel below reacts live.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!playing ? (
            <button
              onClick={index >= 0 ? restart : run}
              className="btn-shine inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-transform hover:scale-[1.03]"
            >
              <Play size={14} /> {index >= 0 ? "Replay" : "Play the story"}
            </button>
          ) : (
            <button
              onClick={stop}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
            >
              <Pause size={14} /> Pause
            </button>
          )}
          {index >= 0 && !playing && (
            <button
              onClick={restart}
              aria-label="Restart"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* progress dots */}
      <div className="mt-4 flex items-center gap-1.5">
        {BEATS.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= index ? "bg-accent" : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {beat && (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="mt-4 grid gap-3 rounded-xl border border-border bg-surface-2/50 p-4 sm:grid-cols-[auto_1fr]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 font-mono text-sm font-bold text-accent">
              {index + 1}
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-accent">{beat.title}</div>
              <p className="mt-1 text-[15px] font-medium leading-snug text-foreground">{beat.say}</p>
              <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-muted">
                <ArrowRight size={13} className="mt-0.5 shrink-0 text-accent-2" />
                {beat.why}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
