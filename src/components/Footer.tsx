import Link from "next/link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Live Console", href: "/console" },
      { label: "Security", href: "/security" },
      { label: "Pricing", href: "/pricing" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Home", href: "/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-7xl px-6 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md font-display text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #059669, #4338ca)" }}
              >
                F
              </span>
              <span className="font-display text-lg font-semibold text-foreground">Finora</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The financial operating system for autonomous agents — verifiable identity,
              real-time reputation, dynamic credit, and a wallet-layer kill switch.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted">
                {col.title}
              </div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted sm:flex-row">
          <span>© 2026 Finora. Built for Innova Hack Chapter-1 · Domain 1: Fintech.</span>
          <span>Credit &amp; control for autonomous agents.</span>
        </div>
      </div>
    </footer>
  );
}
