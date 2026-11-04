"use client";

import type { TEditorErrors } from "@/components/admin/editorial-editor-primitives";
import { TextareaField } from "@/components/admin/site/site-fields";
import { useState } from "react";
import type { ZodType } from "zod";

/**
 * Pretty-printed JSON textarea checked against the server's own Zod schema. The draft only receives values that
 * parse, and every failure is reported through `onError` so the parent can block saving. Mount it with a `key`
 * that changes whenever the draft is replaced (save, reload, discard) so the text restarts from the new value.
 */
export function ValidatedJsonEditor<T>({
  path,
  label,
  value,
  schema,
  onChange,
  onError,
  errors,
  disabled,
  hint,
  allowEmpty = false,
  rows = 14,
}: {
  path: string;
  label: string;
  value: T | undefined;
  schema: ZodType<T>;
  onChange: (value: T | undefined) => void;
  onError: (path: string, message: string | undefined) => void;
  errors: TEditorErrors;
  disabled: boolean;
  hint?: string;
  /** Blank text clears the value instead of being an error. */
  allowEmpty?: boolean;
  rows?: number;
}) {
  const [text, setText] = useState(() =>
    value === undefined ? "" : JSON.stringify(value, null, 2)
  );

  const handle = (next: string) => {
    setText(next);
    if (!next.trim()) {
      onError(path, allowEmpty ? undefined : "Enter a JSON object.");
      if (allowEmpty) onChange(undefined);
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(next);
    } catch (error) {
      onError(
        path,
        `Invalid JSON: ${error instanceof Error ? error.message : "parse error"}`
      );
      return;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      onError(
        path,
        result.error.issues
          .slice(0, 3)
          .map((issue) =>
            issue.path.length
              ? `${issue.path.join(".")}: ${issue.message}`
              : issue.message
          )
          .join(" · ")
      );
      return;
    }
    onError(path, undefined);
    onChange(result.data);
  };

  // Server sources point inside the object (`finder.outcomes.0.engagement_key`); show them on this one field.
  const messages = Object.entries(errors)
    .filter(([key]) => key === path || key.startsWith(`${path}.`))
    .map(([key, message]) => (key === path ? message : `${key}: ${message}`));

  return (
    <TextareaField
      path={path}
      label={label}
      value={text}
      onChange={handle}
      errors={messages.length ? { [path]: messages.join(" · ") } : {}}
      disabled={disabled}
      hint={hint}
      rows={rows}
    />
  );
}
