"use client";

import { Button } from "@/components/ui/button";
import { formControlVariants } from "@/components/ui/form-control-variants";
import { MonoLabel } from "@/components/ui/mono-label";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusMark } from "@/components/ui/status-mark";
import { cn } from "@/lib/utils";
import { useId, type ReactNode } from "react";

/** The native control look of the console; the surface sets the 2 px radius and the focus ring. */
export const editorialInputClassName = cn(
  formControlVariants({ size: "none" }),
  "px-3 py-2 text-sm"
);

export const editorialTextareaClassName = cn(
  editorialInputClassName,
  "leading-6"
);

export type TEditorErrors = Readonly<Record<string, string>>;

export function EditorialErrorSummary({ errors }: { errors: TEditorErrors }) {
  const entries = Object.entries(errors);
  if (!entries.length) return null;

  const focus = (path: string) => {
    const exact = document.getElementById(path);
    if (exact instanceof HTMLElement) {
      exact.focus();
      if (typeof exact.scrollIntoView === "function") {
        exact.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    const sectionMatch = path.match(/^sections\.(\d+)/);
    const section = sectionMatch
      ? document.getElementById(`page-section-${sectionMatch[1]}`)
      : null;
    if (typeof section?.scrollIntoView === "function") {
      section.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="cp-validation" role="alert">
      <p className="cp-validation__title">
        <StatusMark state="error">
          Review {entries.length} validation source
          {entries.length === 1 ? "" : "s"}
        </StatusMark>
      </p>
      <ul className="cp-validation__list">
        {entries.map(([path, message]) => (
          <li key={path}>
            <button
              type="button"
              onClick={() => focus(path)}
              className="text-left underline underline-offset-4"
            >
              {path || "Editorial composition"}: {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EditorialWorkspaceHeader({
  eyebrow,
  title,
  description,
  status,
  actions,
  headingId,
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: ReactNode;
  actions?: ReactNode;
  headingId?: string;
}) {
  const generatedId = useId();
  const resolvedHeadingId = headingId ?? `editorial-heading-${generatedId}`;

  return (
    <header aria-labelledby={resolvedHeadingId} className="cp-header">
      <div className="cp-header__text">
        <MonoLabel>{eyebrow}</MonoLabel>
        <h1 id={resolvedHeadingId} className="cp-title">
          {title}
        </h1>
        <p className="cp-lede">{description}</p>
        {status ? (
          <div className="cp-meta" aria-label="Editorial status">
            {status}
          </div>
        ) : null}
      </div>
      {actions ? <div className="cp-header__actions">{actions}</div> : null}
    </header>
  );
}

export function EditorialStatus({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const badgeTone = tone === "danger" ? "destructive" : tone;

  return <StatusBadge tone={badgeTone}>{children}</StatusBadge>;
}

export function EditorialPanel({
  title,
  description,
  children,
  id,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  const generatedId = useId();
  const headingId = id ?? `editorial-section-${generatedId}`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn("cp-section", className)}
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

export function EditorialField({
  path,
  label,
  hint,
  error,
  required,
  children,
}: {
  path: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const describedBy =
    [hint ? `${path}-hint` : "", error ? `${path}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="cp-field" data-editor-path={path}>
      <label htmlFor={path} className="cp-label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div data-editor-control data-described-by={describedBy}>
        {children}
      </div>
      {hint ? (
        <p id={`${path}-hint`} className="cp-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${path}-error`}
          className="text-destructive text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function EditorialNotice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      data-notice={tone}
      className="cwa-notice"
    >
      <p className="cwa-notice__title">
        {tone === "neutral" ? (
          title
        ) : (
          <StatusMark state={tone === "danger" ? "error" : tone}>
            {title}
          </StatusMark>
        )}
      </p>
      {children ? <div className="cwa-notice__body">{children}</div> : null}
    </div>
  );
}

export function EditorialStickyActions({
  dirty,
  busy,
  canEdit,
  onSave,
  onReset,
  children,
}: {
  dirty: boolean;
  busy: boolean;
  canEdit: boolean;
  onSave: () => void;
  onReset: () => void;
  children?: ReactNode;
}) {
  return (
    <EditorialPublishBar
      busy={busy}
      dirty={dirty}
      message={dirty ? "Unsaved changes" : "Draft matches the saved revision"}
    >
      <div className="flex flex-wrap justify-end gap-2">
        {children}
        {canEdit ? (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              disabled={!dirty || busy}
            >
              Discard local changes
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={!dirty || busy}
              isLoading={busy}
            >
              Save draft
            </Button>
          </>
        ) : null}
      </div>
    </EditorialPublishBar>
  );
}

export function EditorialPublishBar({
  message,
  busy = false,
  dirty = false,
  children,
  className,
}: {
  message: string;
  busy?: boolean;
  /** Unsaved edits: the message turns bold (weight, not colour). */
  dirty?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label="Publishing controls"
      aria-busy={busy || undefined}
      data-dirty={dirty}
      className={cn("cp-actionbar", className)}
    >
      <p className="cp-actionbar__state" role="status" aria-live="polite">
        {message}
      </p>
      {children}
    </div>
  );
}

export type TEditorialCompletenessItem = Readonly<{
  id: string;
  label: string;
  complete: boolean;
  detail?: string;
  required?: boolean;
}>;

export const summarizeEditorialCompleteness = (
  items: readonly TEditorialCompletenessItem[]
) => {
  const requiredItems = items.filter((item) => item.required !== false);
  const completeRequired = requiredItems.filter((item) => item.complete).length;
  const percent = requiredItems.length
    ? Math.round((completeRequired / requiredItems.length) * 100)
    : 100;

  return {
    required: requiredItems.length,
    completeRequired,
    percent,
    ready: completeRequired === requiredItems.length,
  } as const;
};

export function EditorialCompletenessPanel({
  items,
  title = "Publishing completeness",
  description = "This guidance does not replace server-side evidence and integrity checks.",
}: {
  items: readonly TEditorialCompletenessItem[];
  title?: string;
  description?: string;
}) {
  const generatedId = useId();
  const headingId = `editorial-completeness-${generatedId}`;
  const summary = summarizeEditorialCompleteness(items);

  return (
    <aside aria-labelledby={headingId} className="cp-section">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="cp-section__head">
          <h2 id={headingId} className="cp-section__title">
            {title}
          </h2>
          <p className="cp-section__desc">{description}</p>
        </div>
        <EditorialStatus tone={summary.ready ? "success" : "warning"}>
          {summary.ready ? "Required checks ready" : "Needs attention"}
        </EditorialStatus>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div
          role="progressbar"
          aria-label="Required editorial checks"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.percent}
          aria-valuetext={`${summary.completeRequired} of ${summary.required} required checks complete`}
          className="cwa-meter"
        >
          <span
            className="cwa-meter__fill"
            style={{ width: `${summary.percent}%` }}
          />
        </div>
        <p className="cp-hint font-semibold">
          {summary.completeRequired}/{summary.required} required
        </p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => {
          const required = item.required !== false;
          return (
            <li
              key={item.id}
              className="cwa-row flex items-start justify-between gap-4"
            >
              <div>
                <p className="cp-label">{item.label}</p>
                {item.detail ? <p className="cp-hint">{item.detail}</p> : null}
              </div>
              <EditorialStatus
                tone={
                  item.complete ? "success" : required ? "warning" : "neutral"
                }
              >
                {item.complete
                  ? "Complete"
                  : required
                    ? "Required"
                    : "Optional"}
              </EditorialStatus>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export const toEditorialSlug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function EditorialSlugEditor({
  id,
  value,
  sourceValue,
  onChange,
  label = "Canonical slug",
  sourceLabel = "title",
  help = "Use lowercase letters, numbers, and single hyphens.",
  error,
  disabled = false,
  required = false,
  maxLength = 180,
  basePath = "/",
}: {
  id: string;
  value: string;
  sourceValue: string;
  onChange: (value: string) => void;
  label?: string;
  sourceLabel?: string;
  help?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  basePath?: string;
}) {
  const generatedSlug = toEditorialSlug(sourceValue)
    .slice(0, maxLength)
    .replace(/-+$/, "");
  const normalizedValue = value.trim();
  const formatError =
    normalizedValue && !SLUG_PATTERN.test(normalizedValue)
      ? "Use lowercase letters, numbers, and single hyphens."
      : undefined;
  const resolvedError = error ?? formatError;
  const previewSlug = normalizedValue || generatedSlug || "generated-slug";
  const normalizedBasePath = `/${basePath}`
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
  const previewPath = `${normalizedBasePath}/${previewSlug}`.replace(
    /\/{2,}/g,
    "/"
  );
  const describedBy = [
    help ? `${id}-hint` : "",
    resolvedError ? `${id}-error` : "",
    `${id}-preview`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <EditorialField
      path={id}
      label={label}
      hint={help}
      error={resolvedError}
      required={required}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(resolvedError)}
          aria-describedby={describedBy}
          className={editorialInputClassName}
          placeholder="derived-from-title"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(generatedSlug)}
          disabled={
            disabled || !generatedSlug || generatedSlug === normalizedValue
          }
          aria-describedby={`${id}-preview`}
          className="shrink-0"
        >
          {normalizedValue
            ? `Replace from ${sourceLabel}`
            : `Generate from ${sourceLabel}`}
        </Button>
      </div>
      <output
        id={`${id}-preview`}
        htmlFor={id}
        aria-live="polite"
        className="text-muted-foreground mt-2 block font-mono text-xs"
      >
        {normalizedValue ? "Canonical path" : "Proposed path"}: {previewPath}
      </output>
    </EditorialField>
  );
}

export function EditorialSeoSocialPreview({
  title,
  description,
  url,
  siteName = "Published site",
  fallbackTitle = "Inherited Site title",
  fallbackDescription = "Inherited Site description",
  socialMedia,
  noindex = false,
}: {
  title?: string;
  description?: string;
  url: string;
  siteName?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  socialMedia?: ReactNode;
  noindex?: boolean;
}) {
  const generatedId = useId();
  const headingId = `editorial-seo-preview-${generatedId}`;
  const resolvedTitle = title?.trim() || fallbackTitle;
  const resolvedDescription = description?.trim() || fallbackDescription;
  const titleLength = title?.trim().length ?? 0;
  const descriptionLength = description?.trim().length ?? 0;

  return (
    <section aria-labelledby={headingId} className="cwa-row mt-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 id={headingId} className="cp-label">
            SEO and social preview
          </h3>
          <p className="cp-hint">
            Approximate editorial preview; search engines and social platforms
            control final rendering.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Metadata checks">
          <EditorialStatus
            tone={!titleLength || titleLength > 60 ? "warning" : "success"}
          >
            Title {titleLength}/60
          </EditorialStatus>
          <EditorialStatus
            tone={
              !descriptionLength || descriptionLength > 160
                ? "warning"
                : "success"
            }
          >
            Description {descriptionLength}/160
          </EditorialStatus>
          {noindex ? (
            <EditorialStatus tone="warning">Noindex</EditorialStatus>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2" aria-live="polite">
        <article aria-label="Search result preview" className="cwa-row bg-card">
          <p className="text-muted-foreground truncate text-xs">{url}</p>
          <p className="mt-1 line-clamp-1 text-lg font-medium underline underline-offset-2">
            {resolvedTitle}
          </p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-5">
            {resolvedDescription}
          </p>
        </article>

        <article
          aria-label="Social card preview"
          className="cwa-frame bg-card overflow-hidden"
        >
          <div className="bg-muted flex aspect-[1.91/1] items-center justify-center overflow-hidden">
            {socialMedia ?? (
              <p className="text-muted-foreground px-4 text-center text-xs font-bold tracking-wider uppercase">
                Published Site social image fallback
              </p>
            )}
          </div>
          <div className="p-4">
            <p className="text-muted-foreground text-[0.65rem] font-bold tracking-wider uppercase">
              {siteName} · {url}
            </p>
            <p className="mt-1 line-clamp-1 font-black">{resolvedTitle}</p>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">
              {resolvedDescription}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
