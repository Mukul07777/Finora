"use client";

import { motion } from "framer-motion";

export function ScoreGauge({ score, size = 108 }: { score: number; size?: number }) {
  const stroke = Math.max(3, Math.round(size * 0.083));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  const color = score >= 80 ? "#7dffb3" : score >= 55 ? "#ffb85c" : "#ff5c6c";
  const scoreFontSize = Math.max(11, Math.round(size * 0.22));
  const labelFontSize = Math.max(7, Math.round(size * 0.09));
  const showLabel = size >= 60;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#1e2230"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-display font-semibold text-foreground"
          style={{ fontSize: scoreFontSize }}
        >
          {score}
        </span>
        {showLabel && (
          <span
            className="mt-1 uppercase tracking-widest text-muted"
            style={{ fontSize: labelFontSize }}
          >
            score
          </span>
        )}
      </div>
    </div>
  );
}
