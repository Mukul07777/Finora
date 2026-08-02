"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useFinoraState } from "@/lib/finora/FinoraProvider";
import { ShieldCheck, Fingerprint, Activity } from "lucide-react";

/**
 * A living wireframe of the agent. Not decoration: its colour and pulse
 * track real state — it breathes and streams data down its limbs when
 * active, flares red and stiffens when frozen. Fills the console's right
 * rail with the thing the whole product is about: the agent itself.
 */
export function AgentAvatar() {
  const state = useFinoraState();
  const reduce = useReducedMotion();

  const mode = state.frozen ? "frozen" : state.creditStatus === "approved" ? "active" : "idle";
  const color =
    mode === "frozen" ? "var(--danger)" : mode === "active" ? "var(--accent)" : "var(--accent-2)";
  const label =
    mode === "frozen" ? "Frozen" : mode === "active" ? "Operating" : "Standby";

  // Data pulses only travel when the agent is live and moving money.
  const pulsing = mode === "active" && !reduce;

  return (
    <div className="dark-scope card-premium relative overflow-hidden rounded-2xl p-5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">Live agent</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9.5px] font-mono uppercase tracking-wide"
          style={{ color, borderColor: color, backgroundColor: "color-mix(in srgb, transparent 88%, currentColor)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            {mode !== "frozen" && (
              <span
                className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full"
                style={{ background: color }}
              />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          </span>
          {label}
        </span>
      </div>
      <p className="mb-2 font-mono text-[9.5px] text-muted">agent.procure-01 · did:finora:9f21…c4a8</p>

      <motion.div
        className="relative mx-auto"
        style={{ color }}
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 300 560" className="mx-auto h-[340px] w-auto" fill="none" aria-hidden>
          <defs>
            <radialGradient id="avatarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
            {/* limb paths reused for the travelling data pulses */}
            <path id="pArmL" d="M112 168 L70 300" />
            <path id="pArmR" d="M188 168 L230 300" />
            <path id="pLegL" d="M126 300 L108 520" />
            <path id="pLegR" d="M174 300 L192 520" />
            <path id="pSpine" d="M150 130 L150 300" />
          </defs>

          {/* ambient head glow */}
          <circle cx="150" cy="88" r="70" fill="url(#avatarGlow)" opacity={mode === "frozen" ? 0.18 : 0.28} />

          {/* rotating orbit ring around the head */}
          {!reduce && (
            <motion.g
              style={{ transformOrigin: "150px 88px" }}
              animate={{ rotate: 360 }}
              transition={{ duration: mode === "frozen" ? 0 : 22, repeat: Infinity, ease: "linear" }}
            >
              <ellipse cx="150" cy="88" rx="60" ry="60" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
              <circle cx="150" cy="28" r="3.2" fill="currentColor" />
            </motion.g>
          )}

          {/* head */}
          <circle cx="150" cy="88" r="44" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.6" />
          {/* pulsing core */}
          <circle cx="150" cy="80" r="7" fill="currentColor">
            {!reduce && (
              <animate attributeName="r" values="6;9;6" dur="2.4s" repeatCount="indefinite" />
            )}
          </circle>

          {/* neck + torso */}
          <line x1="150" y1="132" x2="150" y2="150" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.6" />
          <path
            d="M112 152 L188 152 L182 300 L118 300 Z"
            stroke="currentColor"
            strokeOpacity="0.55"
            strokeWidth="1.6"
          />
          {/* the dashed "data" line across the torso */}
          <path
            d="M120 232 C140 244, 160 244, 180 232"
            stroke="currentColor"
            strokeOpacity="0.4"
            strokeWidth="1.4"
            strokeDasharray="4 4"
          />

          {/* arms + legs */}
          <use href="#pArmL" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.6" />
          <use href="#pArmR" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.6" />
          <use href="#pLegL" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.6" />
          <use href="#pLegR" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.6" />

          {/* hands + joints */}
          {[
            [70, 300],
            [230, 300],
            [112, 160],
            [188, 160],
            [126, 300],
            [174, 300],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i < 2 ? 8 : 3.2} stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" fill={i < 2 ? "none" : "currentColor"}>
              {!reduce && (
                <animate attributeName="fill-opacity" values="0.4;1;0.4" dur={`${2 + (i % 3) * 0.6}s`} repeatCount="indefinite" />
              )}
            </circle>
          ))}

          {/* travelling data pulses along the limbs (only when operating) */}
          {pulsing &&
            ["#pSpine", "#pArmL", "#pArmR", "#pLegL", "#pLegR"].map((p, i) => (
              <circle key={p} r="3.4" fill="currentColor">
                <animateMotion dur={`${2 + i * 0.35}s`} repeatCount="indefinite" begin={`${i * 0.3}s`}>
                  <mpath href={p} />
                </animateMotion>
                <animate attributeName="fill-opacity" values="0;1;0" dur={`${2 + i * 0.35}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
              </circle>
            ))}
        </svg>
      </motion.div>

      <div className="mt-1 grid grid-cols-3 gap-2 text-center">
        <Chip icon={<Fingerprint size={11} />} label="Identity" ok />
        <Chip icon={<ShieldCheck size={11} />} label="Policy" ok={!state.frozen} />
        <Chip icon={<Activity size={11} />} label={`Score ${state.score}`} ok />
      </div>
    </div>
  );
}

function Chip({ icon, label, ok }: { icon: React.ReactNode; label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[9.5px] ${
        ok ? "border-accent/30 bg-accent/5 text-accent" : "border-danger/40 bg-danger/10 text-danger"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}
