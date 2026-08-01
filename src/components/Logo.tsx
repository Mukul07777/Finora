import { Cog } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const badge = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? 15 : 17;
  const text = size === "sm" ? "text-base" : "text-lg";

  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex ${badge} shrink-0 items-center justify-center rounded-full bg-accent text-on-accent`}
      >
        <Cog size={icon} strokeWidth={2.25} />
      </span>
      <span className={`font-display ${text} font-semibold tracking-tight text-foreground`}>
        finora<span className="text-accent">.</span>
      </span>
    </span>
  );
}
