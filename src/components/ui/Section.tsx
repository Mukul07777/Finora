import { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative mx-auto w-full max-w-7xl px-6 py-24 sm:px-8 ${className}`}>
      {(eyebrow || title || description) && (
        <div className="mx-auto mb-14 max-w-2xl text-center">
          {eyebrow && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-mono uppercase tracking-widest text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {eyebrow}
            </div>
          )}
          {title && (
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
          )}
          {description && <p className="mt-4 text-base text-muted">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
