import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type TLinkPaginationProps = Readonly<{
  page: number;
  totalPages: number;
  /** Builds the URL for a page; keeps every other filter in place. */
  hrefFor: (page: number) => string;
  ariaLabel: string;
  className?: string;
}>;

const windowOf = (page: number, totalPages: number): (number | "gap")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
  return sorted.flatMap((value, index) =>
    index > 0 && value - sorted[index - 1]! > 1
      ? (["gap", value] as const)
      : [value]
  );
};

const itemClass =
  "inline-flex size-11 items-center justify-center rounded-full border text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * Pagination as plain links: it works without JavaScript, can be crawled and
 * keeps the whole filter state in the URL.
 */
export const LinkPagination = ({
  page,
  totalPages,
  hrefFor,
  ariaLabel,
  className,
}: TLinkPaginationProps) => {
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(1, page), totalPages);
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
    >
      {current > 1 ? (
        <Link
          href={hrefFor(current - 1)}
          aria-label="Previous page"
          rel="prev"
          scroll={false}
          className={cn(itemClass, "border-border hover:border-primary")}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
      {windowOf(current, totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="text-muted-foreground px-1"
          >
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            scroll={false}
            aria-label={`Page ${entry}`}
            aria-current={entry === current ? "page" : undefined}
            className={cn(
              itemClass,
              entry === current
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary"
            )}
          >
            {entry}
          </Link>
        )
      )}
      {current < totalPages ? (
        <Link
          href={hrefFor(current + 1)}
          aria-label="Next page"
          rel="next"
          scroll={false}
          className={cn(itemClass, "border-border hover:border-primary")}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
};
