"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

/**
 * Shared motion primitives for the console: a count-up number, a
 * spring-filled bar, and a card that rises in on first view. Kept in one
 * place so every panel animates consistently and respects reduced-motion.
 */

/** Smoothly counts from the previous value to the next whenever it changes. */
export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  const formatted =
    decimals > 0
      ? display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : Math.round(display).toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/** A bar whose fill width springs to the target percentage. */
export function AnimatedBar({
  pct,
  className = "bg-accent",
  track = "bg-surface",
  height = "h-1.5",
  delay = 0,
}: {
  pct: number; // 0..100
  className?: string;
  track?: string;
  height?: string;
  delay?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`w-full overflow-hidden rounded-full ${track} ${height}`}>
      <motion.div
        className={`h-full rounded-full ${className}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20, delay }}
      />
    </div>
  );
}

/** A card that fades/rises into view once, then reacts to hover. */
export function MotionCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      whileHover={reduce ? undefined : { y: -3 }}
    >
      {children}
    </motion.div>
  );
}

/** Pulsing status dot. */
export function PulseDot({ className = "bg-accent" }: { className?: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full animate-pulse-ring rounded-full ${className}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}
