"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/console", label: "Live Console" },
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

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
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 font-display text-sm font-bold text-white">
            F
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Finora
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm transition-colors ${
                  active ? "font-medium text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/console"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
        >
          Launch Console
        </Link>
      </div>
    </header>
  );
}
