import { Button } from "@/components/ui/button";
import { StatusMark } from "@/components/ui/status-mark";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/*
 * The four list states of the C2 pattern (docs plan 4.3): loading, empty, filtered-empty and error.
 * Each says what happened and offers the next step. Server-safe; a client adopter passes onClear / onRetry,
 * a server page passes clearHref / retryHref.
 */

type StateProps = { className?: string; headingLevel?: "h2" | "h3" };

function StateBlock({
  kind,
  title,
  children,
  action,
  className,
  headingLevel: Heading = "h2",
  role,
}: StateProps & {
  kind: "empty" | "filtered" | "error";
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div
      data-cp="state"
      data-kind={kind}
      role={role}
      className={cn("cp-state", className)}
    >
      {kind === "error" ? <StatusMark state="error">Error</StatusMark> : null}
      <Heading className="cp-state__title">{title}</Heading>
      {children ? <p className="cp-state__text">{children}</p> : null}
      {action ? <div className="cp-state__action">{action}</div> : null}
    </div>
  );
}

/** Rows at the real row height (`--cp-row-h`) so the swap to data does not shift the page. */
export function ConsoleListSkeleton({
  rows = 8,
  columns = 4,
  label = "Loading",
  className,
}: {
  rows?: number;
  columns?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      data-cp="skeleton"
      role="status"
      aria-busy="true"
      className={cn("cp-skeleton", className)}
      style={{ "--cp-cols": columns } as CSSProperties}
    >
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="cp-skeleton__row">
            {Array.from({ length: columns }, (_, cell) => (
              <span key={cell} className="cp-skeleton__cell" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Nothing exists yet: what this workspace is for, plus the action that creates the first record. */
export function ConsoleEmpty({
  title,
  description,
  action,
  ...props
}: StateProps & {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <StateBlock kind="empty" title={title} action={action} {...props}>
      {description}
    </StateBlock>
  );
}

/** Records exist but none match: say so and offer to clear the filters. */
export function ConsoleFilteredEmpty({
  title = "No results match these filters",
  description,
  clearHref,
  onClear,
  clearLabel = "Clear filters",
  ...props
}: StateProps & {
  title?: ReactNode;
  description?: ReactNode;
  clearHref?: string;
  onClear?: () => void;
  clearLabel?: string;
}) {
  const action = clearHref ? (
    <Button as="a" href={clearHref} variant="outline" size="sm">
      {clearLabel}
    </Button>
  ) : onClear ? (
    <Button type="button" variant="outline" size="sm" onClick={onClear}>
      {clearLabel}
    </Button>
  ) : null;
  return (
    <StateBlock kind="filtered" title={title} action={action} {...props}>
      {description}
    </StateBlock>
  );
}

/** What failed plus a retry. `role="alert"` so the failure is announced. */
export function ConsoleError({
  title = "Could not load this list",
  description,
  onRetry,
  retryHref,
  retryLabel = "Try again",
  ...props
}: StateProps & {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryHref?: string;
  retryLabel?: string;
}) {
  const action = retryHref ? (
    <Button as="a" href={retryHref} variant="outline" size="sm">
      {retryLabel}
    </Button>
  ) : onRetry ? (
    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
      {retryLabel}
    </Button>
  ) : null;
  return (
    <StateBlock
      kind="error"
      title={title}
      action={action}
      role="alert"
      {...props}
    >
      {description}
    </StateBlock>
  );
}
