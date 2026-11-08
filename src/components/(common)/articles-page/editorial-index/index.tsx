import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import Link from "next/link";

/*
 * The parts the Articles and Videos index pages share (Phase 6, editorial slice). All server markup: the
 * filters are a native GET form, the active filters and the pager are plain links, so the URL stays the one
 * source of truth and no client JavaScript is needed. Styles: `ed-*` in pages-editorial.css.
 */

export type TIndexOption = Readonly<{ value: string; label: string }>;

export type TIndexSearchField = Readonly<{
  name: string;
  label: string;
  value: string;
  placeholder: string;
}>;

export type TIndexSelectField = Readonly<{
  name: string;
  label: string;
  value: string;
  options: readonly TIndexOption[];
}>;

/** A native GET form: Apply submits the fields, Clear is a link to the unfiltered page. */
export function IndexFilterForm({
  action,
  legend,
  search,
  selects,
  active,
  clearHref,
}: Readonly<{
  action: string;
  legend: string;
  search: TIndexSearchField;
  selects: readonly TIndexSelectField[];
  active: boolean;
  clearHref: string;
}>) {
  return (
    <form
      method="get"
      action={action}
      role="search"
      aria-label={legend}
      className="ed-filters"
    >
      <div className="ed-filters__fields">
        <label className="ed-field ed-field--search">
          <span className="t-eyebrow">{search.label}</span>
          <input
            type="search"
            name={search.name}
            defaultValue={search.value}
            maxLength={100}
            autoComplete="off"
            placeholder={search.placeholder}
            className="ed-control"
          />
        </label>
        {selects.map((field) => (
          <label key={field.name} className="ed-field">
            <span className="t-eyebrow">{field.label}</span>
            <select
              name={field.name}
              defaultValue={field.value}
              className="ed-control"
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="ed-actions">
        <button
          type="submit"
          className={buttonVariants({ variant: "default", size: "default" })}
        >
          Apply
        </button>
        {active ? (
          <Link href={clearHref} className="ed-clear link-draw">
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export type TIndexChip = Readonly<{
  key: string;
  label: string;
  value: string;
  /** The same page without this one filter. */
  href: string;
}>;

/** One removable chip per active filter; the whole chip is the link. */
export function IndexFilterChips({
  chips,
}: Readonly<{ chips: readonly TIndexChip[] }>) {
  if (chips.length === 0) return null;
  return (
    <ul className="ed-chips" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            className="ed-chip t-eyebrow"
            aria-label={`Remove filter ${chip.label}: ${chip.value}`}
          >
            <span>
              {chip.label}: {chip.value}
            </span>
            <X className="size-3.5" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function IndexCount({
  total,
  noun,
  filtered,
}: Readonly<{ total: number; noun: string; filtered: boolean }>) {
  return (
    <p className="ed-count t-eyebrow" aria-live="polite">
      {total} {total === 1 ? noun : `${noun}s`}
      {filtered ? " match the current filters" : " available"}
    </p>
  );
}

/** Previous / Next as plain links with the current position between them. */
export function IndexPager({
  page,
  totalPages,
  hrefFor,
  ariaLabel,
  className,
}: Readonly<{
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  ariaLabel: string;
  className?: string;
}>) {
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(1, page), totalPages);
  return (
    <nav aria-label={ariaLabel} className={cn("ed-pager t-eyebrow", className)}>
      {current > 1 ? (
        <Link
          href={hrefFor(current - 1)}
          rel="prev"
          className="ed-pager__prev link-draw"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span aria-current="page">
        Page {current} of {totalPages}
      </span>
      {current < totalPages ? (
        <Link
          href={hrefFor(current + 1)}
          rel="next"
          className="ed-pager__next link-draw"
        >
          Next
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Empty and unavailable states: a hairline block with a statement, never an icon disc. */
export function IndexNotice({
  tone,
  title,
  description,
  action,
}: Readonly<{
  tone: "empty" | "error";
  title: string;
  description: string;
  action?: { href: string; label: string };
}>) {
  return (
    <div
      className="ed-empty"
      data-state={tone}
      role={tone === "error" ? "alert" : "status"}
    >
      <p className="t-eyebrow">
        {tone === "error" ? "Unavailable" : "No results"}
      </p>
      <h3 className="ed-empty__title">{title}</h3>
      <p>{description}</p>
      {action ? (
        <Link href={action.href} className="ed-clear link-draw">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
