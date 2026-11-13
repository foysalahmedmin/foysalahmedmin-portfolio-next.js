"use client";

import {
  EditorActionBar,
  EditorHeader,
  SectionIndex,
  ValidationSummary,
  type ValidationIssue,
} from "@/components/console";
import { ConsoleEditor } from "@/components/templates/console-templates";
import { Button, buttonVariants } from "@/components/ui/button";
import { formControlVariants } from "@/components/ui/form-control-variants";
import type { StatusMarkState } from "@/components/ui/status-mark";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";

/** The native control look of the console (hairline, 2 px radius); the surface sets height and padding of FormControl. */
export const fieldClass = cn(
  formControlVariants({ size: "none" }),
  "px-3 py-2 text-sm"
);
export const labelClass = "cp-label";

/** Label + control + optional helper/error, used by every content form. */
export const Field = ({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) => (
  <div className={cn("cp-field", className)}>
    <label htmlFor={htmlFor} className={labelClass}>
      {label}
    </label>
    {children}
    {hint ? <p className="cp-hint">{hint}</p> : null}
    {error ? (
      <p role="alert" className="text-destructive text-sm">
        {error}
      </p>
    ) : null}
  </div>
);

export const Checkbox = ({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center gap-3">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="border-border text-primary focus:ring-primary size-5 rounded"
    />
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
  </div>
);

/** One section of a content editor: the index link, and the form fields whose edits or errors mark it. */
export type ContentSection = Readonly<{
  id: string;
  label: string;
  fields: readonly string[];
}>;

/** The form fields whose value differs from the initial form state (compared by value). */
export const changedFields = <T extends object>(
  current: T,
  initial: T
): string[] =>
  (Object.keys(current) as (keyof T & string)[]).filter(
    (key) => JSON.stringify(current[key]) !== JSON.stringify(initial[key])
  );

/** The save mark of a record status; the shape and the word carry it, never a colour. */
export type ContentStatusMark = Readonly<{
  state: StatusMarkState;
  label: string;
}>;

/**
 * The C3 editor frame of a content form: header, validation summary, section index and the sticky
 * action bar around the form's own Cancel and Save buttons. Cmd/Ctrl+S requests the same submit as
 * the Save button, including native validation. The frame never decides what a button does.
 */
export function ContentEditorFrame({
  formRef,
  onSubmit,
  noValidate,
  title,
  backHref,
  backLabel,
  status,
  savedAt,
  sections,
  changed,
  errored = [],
  issues = [],
  loading,
  onCancel,
  submitLabel,
  children,
}: {
  formRef: RefObject<HTMLFormElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  noValidate?: boolean;
  title: string;
  backHref: string;
  backLabel: string;
  status?: ContentStatusMark;
  savedAt?: string | null;
  sections: readonly ContentSection[];
  /** Field names whose value differs from the saved record. */
  changed: readonly string[];
  /** Field names that currently carry a validation error. */
  errored?: readonly string[];
  issues?: readonly ValidationIssue[];
  loading?: boolean;
  onCancel: () => void;
  submitLabel: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!loading) formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formRef, loading]);

  const known = sections.flatMap(({ fields }) => fields);
  const unsaved = changed.filter((field) => known.includes(field));

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate={noValidate}>
      <ConsoleEditor
        header={
          <EditorHeader
            title={title}
            back={
              <Link
                href={backHref}
                aria-label={backLabel}
                className={buttonVariants({
                  variant: "outline",
                  shape: "icon",
                })}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
            }
            status={status}
            savedAt={savedAt}
          />
        }
        validation={<ValidationSummary issues={issues} />}
        sectionIndex={
          // the index earns its place from four sections up
          sections.length >= 4 ? (
            <SectionIndex
              sections={sections.map(({ id, label, fields }) => ({
                id,
                label,
                dirty: fields.some((field) => unsaved.includes(field)),
                error: fields.some((field) => errored.includes(field)),
              }))}
            />
          ) : undefined
        }
        actionBar={
          <EditorActionBar
            unsavedCount={unsaved.length}
            discard={
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            }
            saveDraft={
              <Button type="submit" className="gap-2" isLoading={loading}>
                <Save aria-hidden="true" className="size-4" />
                {submitLabel}
              </Button>
            }
          />
        }
      >
        {children}
      </ConsoleEditor>
    </form>
  );
}

/** One entry per line ↔ string[]; blank lines are ignored. */
export const linesToList = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const listToLines = (list: readonly string[] | undefined): string =>
  (list ?? []).join("\n");

/** Comma separated ↔ string[]. */
export const commaToList = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const toLocalDateTime = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export const toIsoDateTime = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export const getFormErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
