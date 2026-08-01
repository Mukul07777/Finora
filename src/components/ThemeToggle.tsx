"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("finora-theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-muted"
    >
      {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
