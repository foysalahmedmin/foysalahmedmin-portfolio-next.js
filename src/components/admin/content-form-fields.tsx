"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const fieldClass =
  "border-border bg-background focus:border-primary w-full rounded-xl border p-3 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
export const labelClass =
  "text-muted-foreground text-xs font-bold tracking-widest uppercase";

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
  <div className={cn("space-y-2", className)}>
    <label htmlFor={htmlFor} className={cn(labelClass, "block")}>
      {label}
    </label>
    {children}
    {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    {error ? (
      <p role="alert" className="text-destructive text-xs font-semibold">
        {error}
      </p>
    ) : null}
  </div>
);

/** A titled group of fields; keeps long forms scannable. */
export const FormSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <fieldset className="border-border space-y-6 rounded-2xl border p-6">
    <legend className="px-2 text-sm font-black tracking-wide uppercase">
      {title}
    </legend>
    {description ? (
      <p className="text-muted-foreground -mt-3 text-sm">{description}</p>
    ) : null}
    {children}
  </fieldset>
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
