"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#console", label: "Live Console" },
  { href: "#metrics", label: "Why it holds up" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled ? "glass border-b border-border" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 font-display text-sm font-bold text-background">
            F
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Finora</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="#console"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
        >
          Launch Console
        </a>
      </div>
    </header>
  );
}
