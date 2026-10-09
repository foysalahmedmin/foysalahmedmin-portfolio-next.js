import { cn } from "@/lib/utils";
import Link from "next/link";
import type { TBreadcrumbs } from "./breadcrumb";

/**
 * The breadcrumb, written as a system path (`~ / case-studies / portfolio-platform`). It is a real
 * landmark with `aria-current` on the last item, so it replaces the visual breadcrumb on every
 * public page without losing the accessibility contract.
 */
export function SystemPath({
  items,
  className,
}: {
  items: TBreadcrumbs;
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("t-eyebrow", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          const label = index === 0 ? "~" : item.name;
          return (
            <li key={item.index} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-fg-faint">
                  /
                </span>
              ) : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="link-draw text-fg-secondary hover:text-foreground"
                  {...(index === 0 ? { "aria-label": item.name } : {})}
                >
                  {label}
                </Link>
              ) : (
                <span
                  className="text-foreground"
                  aria-current={last ? "page" : undefined}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
