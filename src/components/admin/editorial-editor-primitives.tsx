"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const editorialInputClassName =
  "border-input bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/25 min-h-11 w-full rounded-xl border px-4 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

export const editorialTextareaClassName = `${editorialInputClassName} py-3 leading-6`;

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
    <div
      className="border-destructive/30 bg-destructive/10 rounded-xl border p-4"
      role="alert"
    >
      <p className="text-destructive font-black">
        Review {entries.length} validation source
        {entries.length === 1 ? "" : "s"}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {entries.map(([path, message]) => (
          <li key={path}>
            <button
              type="button"
              onClick={() => focus(path)}
              className="focus-visible:ring-ring rounded text-left underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
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
}: {
  eyebrow: string;
  title: string;
  description: string;
  status: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="border-border bg-card rounded-2xl border p-5 shadow-[var(--shadow-sm)] sm:p-7">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="max-w-3xl space-y-2">
          <p className="text-primary text-xs font-black tracking-[0.18em] uppercase">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-6">
            {description}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">{status}</div>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
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
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[0.68rem] font-black tracking-wider uppercase",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "danger" && "bg-destructive/15 text-destructive",
        tone === "neutral" && "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

export function EditorialPanel({
  title,
  description,
  children,
  id,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-border bg-card rounded-2xl border p-5 shadow-[var(--shadow-sm)] sm:p-7"
    >
      <div className="mb-6">
        <h2 id={id} className="text-xl font-black tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-6">
            {description}
          </p>
        ) : null}
      </div>
      {children}
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
    <div className="space-y-2" data-editor-path={path}>
      <label htmlFor={path} className="text-sm font-bold">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <div data-editor-control data-described-by={describedBy}>
        {children}
      </div>
      {hint ? (
        <p
          id={`${path}-hint`}
          className="text-muted-foreground text-xs leading-5"
        >
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${path}-error`}
          className="text-destructive text-xs"
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
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "danger" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "warning" && "border-warning/30 bg-warning/10",
        tone === "success" && "border-success/30 bg-success/10",
        tone === "neutral" && "border-border bg-muted/40"
      )}
    >
      <p className="font-bold">{title}</p>
      {children ? (
        <div className="mt-1 text-xs leading-5 opacity-90">{children}</div>
      ) : null}
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
    <div className="border-border bg-background/95 sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 shadow-[var(--shadow-lg)] backdrop-blur-md">
      <p className="text-muted-foreground px-2 text-sm" role="status">
        {dirty ? "Unsaved changes" : "Draft matches the saved revision"}
      </p>
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
