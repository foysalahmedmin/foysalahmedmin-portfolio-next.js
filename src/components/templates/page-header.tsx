import { SystemPath } from "@/components/ui/system-path";
import type { TBreadcrumbs } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  /** One sentence, up to 62 characters wide. */
  lede?: string | undefined;
  /** The system path: it doubles as the breadcrumb (`~ / case-studies / portfolio-platform`). */
  path?: TBreadcrumbs | undefined;
  /** A Mono eyebrow shown when there is no path (for example `/legal`). */
  eyebrow?: string | undefined;
  /** `index` sets the title at --step-5, `detail` at --step-4 (docs plan 3.13). */
  level?: "index" | "detail";
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * The shared page header (docs plan 3.13). Every public inner page starts with this: a system-path
 * eyebrow, the H1, a lede, an optional Mono meta row and actions, over a faded hairline grid.
 * Pages never build their own header.
 */
export function PageHeader({
  title,
  lede,
  path,
  eyebrow,
  level = "index",
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-page-header
      data-level={level}
      className={cn(
        "border-line-2 relative isolate overflow-clip border-b pt-[var(--space-section-compact)] pb-[var(--space-section-compact)]",
        className
      )}
    >
      <div
        className="hairline-grid pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]"
        aria-hidden="true"
      />
      <div className="container flex flex-col gap-6">
        {path && path.length > 0 ? (
          <SystemPath items={path} />
        ) : eyebrow ? (
          <p className="t-eyebrow text-fg-secondary">{eyebrow}</p>
        ) : null}
        {/* No ch-based width here: the ch unit follows the glyph width, so it re-wraps when the display face swaps in */}
        <h1 className={level === "index" ? "t-h1" : "t-h2"}>{title}</h1>
        {lede ? <p className="t-lead t-measure">{lede}</p> : null}
        {meta ? (
          <div className="t-eyebrow text-fg-secondary flex flex-wrap gap-x-6 gap-y-2">
            {meta}
          </div>
        ) : null}
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
