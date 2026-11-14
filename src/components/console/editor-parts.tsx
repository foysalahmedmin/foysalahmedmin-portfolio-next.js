import { StatusMark, type StatusMarkState } from "@/components/ui/status-mark";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { UnsavedChangesGuard } from "./unsaved-guard";

const formatSavedAt = (iso: string) => {
  const date = new Date(iso);
  // UTC and a fixed locale: the server and the browser print the same text
  return Number.isNaN(date.getTime())
    ? null
    : `${new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date)} UTC`;
};

export type EditorHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  /** The record title (or "New …"). The only Display text on the page. */
  title: ReactNode;
  titleId?: string;
  /** A back link or breadcrumb placed before the title. */
  back?: ReactNode;
  /** The saved state of the record: a status mark with its visible label. */
  status?: { state: StatusMarkState; label: ReactNode };
  /** The record revision, only when the API provides one ("r13"). Omitted when unknown, never invented. */
  revision?: ReactNode;
  /** ISO timestamp of the last save. Omitted when the record is new. */
  savedAt?: string | null;
  actions?: ReactNode;
};

/** C3 header: record title, status mark, revision and last saved. */
export function EditorHeader({
  title,
  titleId,
  back,
  status,
  revision,
  savedAt,
  actions,
  className,
  ...props
}: EditorHeaderProps) {
  const saved = savedAt ? formatSavedAt(savedAt) : null;
  return (
    <header
      data-cp="editor-header"
      className={cn("cp-header", className)}
      {...props}
    >
      <div className="cp-header__text">
        <div className="cp-header__lead">
          {back}
          <h1 id={titleId} className="cp-title">
            {title}
          </h1>
        </div>
        {status || revision || saved ? (
          <p className="cp-meta">
            {status ? (
              <StatusMark state={status.state}>{status.label}</StatusMark>
            ) : null}
            {revision ? (
              <span>
                Revision <span className="t-mono">{revision}</span>
              </span>
            ) : null}
            {saved ? (
              <span>
                Last saved{" "}
                <time className="t-mono" dateTime={savedAt ?? undefined}>
                  {saved}
                </time>
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      {actions ? <div className="cp-header__actions">{actions}</div> : null}
    </header>
  );
}

/** A section of the editor: a heading and its fields, separated from the next section by a hairline (not a card). */
export function EditorSection({
  id,
  title,
  description,
  className,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  id: string;
  title: ReactNode;
  description?: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-cp="section"
      className={cn("cp-section", className)}
      {...props}
    >
      <div className="cp-section__head">
        <h2 id={headingId} className="cp-section__title">
          {title}
        </h2>
        {description ? <p className="cp-section__desc">{description}</p> : null}
      </div>
      <div className="cp-section__body">{children}</div>
    </section>
  );
}

export type ValidationIssue = {
  /** Anchor of the offending field or section ("#article-category"). Without it the issue is plain text. */
  href?: string;
  /** The field name, shown before the message. */
  field?: ReactNode;
  message: ReactNode;
};

/** Validation summary at the top of an editor, with a jump link to each field. Renders nothing when there are no issues. */
export function ValidationSummary({
  issues,
  id,
  className,
}: {
  issues: readonly ValidationIssue[];
  id?: string;
  className?: string;
}) {
  if (!issues.length) return null;
  const count = issues.length;
  return (
    <div
      id={id}
      role="alert"
      data-cp="validation"
      className={cn("cp-validation", className)}
    >
      <p className="cp-validation__title">
        <StatusMark state="error">
          {count === 1 ? "1 problem to fix" : `${count} problems to fix`}
        </StatusMark>
      </p>
      <ul className="cp-validation__list">
        {issues.map((issue, index) => (
          <li key={index}>
            {issue.field ? <strong>{issue.field}: </strong> : null}
            {issue.href ? (
              <a href={issue.href}>{issue.message}</a>
            ) : (
              issue.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Sticky solid action bar. The slots are filled by the editor: the pattern never decides what a button
 * does (Cmd/Ctrl+S included). `unsavedCount` drives the "N unsaved changes" label and the leave-page guard.
 */
export function EditorActionBar({
  unsavedCount = 0,
  discard,
  saveDraft,
  preview,
  publish,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  unsavedCount?: number;
  discard?: ReactNode;
  saveDraft?: ReactNode;
  preview?: ReactNode;
  publish?: ReactNode;
  /** Any further action (a save with a different label, a delete). */
  children?: ReactNode;
}) {
  const dirty = unsavedCount > 0;
  return (
    <div
      role="group"
      aria-label="Editor actions"
      data-cp="action-bar"
      data-dirty={dirty}
      className={cn("cp-actionbar", className)}
      {...props}
    >
      <UnsavedChangesGuard dirty={dirty} />
      <p className="cp-actionbar__state" aria-live="polite">
        {dirty ? (
          <StatusMark state="pending">
            {unsavedCount === 1
              ? "1 unsaved change"
              : `${unsavedCount} unsaved changes`}
          </StatusMark>
        ) : (
          "No unsaved changes"
        )}
      </p>
      <div className="cp-actionbar__actions">
        {discard}
        {saveDraft}
        {preview}
        {publish}
        {children}
      </div>
    </div>
  );
}
