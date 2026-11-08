import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * A8 System: 404, route errors and the loading shell. One left-aligned column in the container over
 * an optional decorative `backdrop` (the static maquette still on 404); without one it sits on the
 * blueprint texture. `path` is a Mono status line (for example `~/no-such-route: no route`) and
 * `busy` marks the loading variant.
 */
export function SystemPage({
  code,
  path,
  title,
  description,
  actions,
  busy,
  backdrop,
  className,
  children,
}: {
  /** A Mono status code shown above the title, for example `404 · Not found`. */
  code?: string;
  /** A Mono path line between two hairlines, shown above the code. */
  path?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  busy?: boolean;
  /** Decorative media behind the column; it must carry no information. */
  backdrop?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <main
      data-archetype="A8"
      data-public-route="system"
      aria-busy={busy || undefined}
      className={cn("nr-system", backdrop ? null : "tx-blueprint", className)}
    >
      {backdrop}
      <div className="container">
        <div className="nr-system-body">
          {path ? <p className="nr-path t-mono">{path}</p> : null}
          {code ? <p className="t-eyebrow text-fg-secondary">{code}</p> : null}
          <h1 className="t-h2">{title}</h1>
          {description ? (
            <p className="t-lead t-measure">{description}</p>
          ) : null}
          {children}
          {actions ? <div className="nr-system-actions">{actions}</div> : null}
        </div>
      </div>
    </main>
  );
}
