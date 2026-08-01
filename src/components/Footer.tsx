export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted sm:flex-row sm:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 font-display text-[11px] font-bold text-background">
            F
          </span>
          <span className="font-display text-sm text-foreground">Finora</span>
          <span className="ml-2">— Credit &amp; control for autonomous agents</span>
        </div>
        <div>Built for Innova Hack Chapter-1 · Domain 1: Fintech</div>
      </div>
    </footer>
  );
}
