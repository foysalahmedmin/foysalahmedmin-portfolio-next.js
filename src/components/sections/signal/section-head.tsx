import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * The one heading block every home section uses: a mono eyebrow, a display title and a lead. It never
 * carries a number (the public site does not number its cards), and it centres or starts from the
 * edge, so the sections can differ in layout while reading as one system.
 */
export function SectionHead({
  eyebrow,
  title,
  titleId,
  lead,
  align = "start",
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  titleId?: string;
  lead?: ReactNode;
  align?: "start" | "center";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header
      data-align={align}
      className={cn(
        "section-head",
        align === "center" ? "mx-auto text-center" : "text-start",
        className
      )}
    >
      {eyebrow && <p className="t-eyebrow text-fg-secondary">{eyebrow}</p>}
      <h2 id={titleId} className="t-h2 mt-3">
        {title}
      </h2>
      {lead && <p className="t-lead text-fg-secondary mt-4">{lead}</p>}
      {children}
    </header>
  );
}
