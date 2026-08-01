"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { PhoneNotif } from "./types";

const ICONS: Record<PhoneNotif["tone"], React.ComponentType<{ size?: number; className?: string }>> = {
  ok: ShieldCheck,
  warn: TriangleAlert,
  danger: ShieldAlert,
};

const RING: Record<PhoneNotif["tone"], string> = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  danger: "text-red-400",
};

export function PhoneMock({ notifs }: { notifs: PhoneNotif[] }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--";
  const date = now
    ? now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="mx-auto w-[260px] select-none">
      <div className="relative rounded-[2.6rem] border-[6px] border-black bg-black p-1.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
        <div className="relative h-[540px] w-full overflow-hidden rounded-[2.1rem] bg-gradient-to-b from-[#141a2e] via-[#0c0f1c] to-[#050609]">
          {/* dynamic island */}
          <div className="absolute left-1/2 top-2.5 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          {/* status bar */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-3.5 text-[11px] font-medium text-white/90">
            <span>{time}</span>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-3.5 rounded-[2px] border border-white/70" />
            </div>
          </div>

          {/* lock screen clock */}
          <div className="relative z-10 mt-8 flex flex-col items-center text-white">
            <span className="font-display text-5xl font-semibold tracking-tight">{time}</span>
            <span className="mt-1 text-xs text-white/60">{date}</span>
          </div>

          {/* notifications */}
          <div className="relative z-10 mt-8 flex flex-col gap-2 px-3">
            <AnimatePresence initial={false}>
              {notifs.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 text-center text-[11px] text-white/35"
                >
                  No notifications
                  <div className="mt-1 text-white/25">Owner alerts appear here in real time</div>
                </motion.div>
              )}
              {notifs.map((n) => {
                const Icon = ICONS[n.tone];
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: -16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-xl"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <Icon size={14} className={RING[n.tone]} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                            Finora
                          </span>
                          <span className="shrink-0 text-[10px] text-white/40">now</span>
                        </div>
                        <div className="text-[12.5px] font-medium leading-snug text-white">{n.title}</div>
                        <div className="mt-0.5 text-[11.5px] leading-snug text-white/70">{n.body}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted">
        Owner&apos;s phone — receives the same alerts as the console, in real time.
      </p>
    </div>
  );
}
