import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * A8 System: 404, route errors and the loading shell. One centred plate on a blueprint texture;
 * the static maquette still replaces the texture in Phase 3. `busy` marks the loading variant.
 */
export function SystemPage({
  code,
  title,
  description,
  actions,
  busy,
  className,
  children,
}: {
  /** A Mono status code or path shown above the title, for example `404 · Not found`. */
  code?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  busy?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <main
      data-archetype="A8"
      data-public-route="system"
      aria-busy={busy || undefined}
      className={cn(
        "tx-blueprint relative isolate grid min-h-[70dvh] place-items-center py-[var(--space-section)]",
        className
      )}
    >
      <div className="container">
        <div className="ticks border-line-2 bg-card/80 mx-auto flex max-w-2xl flex-col gap-6 rounded-lg border p-8 md:p-12">
          {code ? <p className="t-eyebrow text-fg-secondary">{code}</p> : null}
          <h1 className="t-h3">{title}</h1>
          {description ? (
            <p className="t-lead t-measure">{description}</p>
          ) : null}
          {children}
          {actions ? (
            <div className="flex flex-wrap gap-3">{actions}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
