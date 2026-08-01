"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ShieldOff, CheckCircle2 } from "lucide-react";
import { AlertMsg } from "./types";

const STYLES: Record<AlertMsg["tone"], string> = {
  warn: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-danger/40 bg-danger/10 text-danger",
  ok: "border-accent/40 bg-accent/10 text-accent",
};

const ICONS: Record<AlertMsg["tone"], React.ComponentType<{ size?: number }>> = {
  warn: AlertTriangle,
  danger: ShieldOff,
  ok: CheckCircle2,
};

export function AlertBanner({ alert }: { alert: AlertMsg | null }) {
  return (
    <div className="pointer-events-none sticky top-[70px] z-10 mb-4 flex justify-center">
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className={`pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs shadow-lg backdrop-blur ${STYLES[alert.tone]}`}
          >
            {(() => {
              const Icon = ICONS[alert.tone];
              return <Icon size={14} />;
            })()}
            {alert.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
