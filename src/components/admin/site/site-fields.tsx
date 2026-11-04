"use client";

import {
  EditorialField,
  editorialInputClassName,
  editorialTextareaClassName,
  type TEditorErrors,
} from "@/components/admin/editorial-editor-primitives";

export const fieldError = (errors: TEditorErrors, path: string) => errors[path];
const describedBy = (errors: TEditorErrors, path: string, hint = false) =>
  [hint ? `${path}-hint` : "", errors[path] ? `${path}-error` : ""]
    .filter(Boolean)
    .join(" ") || undefined;

export const optional = (value: string): string | undefined =>
  value.trim() ? value : undefined;

export function TextField({
  path,
  label,
  value,
  onChange,
  errors,
  disabled,
  hint,
  type = "text",
  required,
}: {
  path: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  errors: TEditorErrors;
  disabled: boolean;
  hint?: string;
  type?: "text" | "email" | "url" | "tel" | "datetime-local";
  required?: boolean;
}) {
  const error = fieldError(errors, path);
  return (
    <EditorialField
      path={path}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <input
        id={path}
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(errors, path, Boolean(hint))}
        className={editorialInputClassName}
      />
    </EditorialField>
  );
}

export function TextareaField({
  path,
  label,
  value,
  onChange,
  errors,
  disabled,
  hint,
  rows = 4,
}: {
  path: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  errors: TEditorErrors;
  disabled: boolean;
  hint?: string;
  rows?: number;
}) {
  const error = fieldError(errors, path);
  return (
    <EditorialField path={path} label={label} hint={hint} error={error}>
      <textarea
        id={path}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(errors, path, Boolean(hint))}
        className={editorialTextareaClassName}
      />
    </EditorialField>
  );
}

export function SelectField({
  path,
  label,
  value,
  onChange,
  options,
  errors,
  disabled,
  hint,
}: {
  path: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Readonly<{ value: string; label: string }>[];
  errors: TEditorErrors;
  disabled: boolean;
  hint?: string;
}) {
  const error = fieldError(errors, path);
  return (
    <EditorialField path={path} label={label} hint={hint} error={error}>
      <select
        id={path}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(errors, path, Boolean(hint))}
        className={editorialInputClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </EditorialField>
  );
}

export function CheckField({
  path,
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  path: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
  hint?: string;
}) {
  return (
    <label
      htmlFor={path}
      className="border-border bg-background flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
    >
      <input
        id={path}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-4 accent-current"
      />
      <span>
        <span className="block font-bold">{label}</span>
        {hint ? (
          <span className="text-muted-foreground mt-1 block text-xs leading-5">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}
