"use client";

import type { TEditorErrors } from "@/components/admin/editorial-editor-primitives";
import {
  CheckField,
  SelectField,
  TextareaField,
  TextField,
  optional,
} from "@/components/admin/site/site-fields";
import { Button } from "@/components/ui/button";
import {
  SITE_DELIVERABLE_KINDS,
  type TSiteCommitment,
  type TSiteDeliverableSample,
  type TSiteEngagementModel,
  type TSiteVerification,
} from "@/app/api/site/site.type";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type RowProps = Readonly<{
  disabled: boolean;
  errors: TEditorErrors;
}>;

const VERIFICATION_OPTIONS = (
  ["unverified", "derived", "verified"] as const
).map((value) => ({ value, label: value }));

const nextRowKey = (prefix: string, rows: readonly { key: string }[]) => {
  let suffix = rows.length + 1;
  while (rows.some((row) => row.key === `${prefix}-${suffix}`)) suffix += 1;
  return `${prefix}-${suffix}`;
};

const toLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Keeps the raw text locally so a trailing newline survives while the parent stores trimmed, non-empty lines. */
function LinesField({
  path,
  label,
  value,
  onChange,
  errors,
  disabled,
  hint,
}: RowProps & {
  path: string;
  label: string;
  value: readonly string[];
  onChange: (lines: string[]) => void;
  hint?: string;
}) {
  const [text, setText] = useState(value.join("\n"));
  useEffect(() => {
    // Re-sync only when the parent changed the rows (reorder, reset), not on the echo of our own typing.
    setText((current) =>
      toLines(current).join("\n") === value.join("\n")
        ? current
        : value.join("\n")
    );
  }, [value]);
  return (
    <TextareaField
      path={path}
      label={label}
      value={text}
      onChange={(next) => {
        setText(next);
        onChange(toLines(next));
      }}
      errors={errors}
      disabled={disabled}
      hint={hint}
    />
  );
}

/** Add, remove and reorder rows with the same affordances as the Process editor. */
function RowListEditor<T extends { key: string }>({
  title,
  description,
  noun,
  addLabel,
  emptyText,
  rows,
  maximum,
  disabled,
  create,
  describe,
  onChange,
  renderRow,
}: {
  title: string;
  description: string;
  noun: string;
  addLabel: string;
  emptyText: string;
  rows: readonly T[];
  maximum: number;
  disabled: boolean;
  create: (rows: readonly T[]) => T;
  describe: (row: T) => string;
  onChange: (rows: T[]) => void;
  renderRow: (
    row: T,
    index: number,
    update: (patch: Partial<T>) => void
  ) => ReactNode;
}) {
  const update = (index: number, patch: Partial<T>) =>
    onChange(
      rows.map((row, itemIndex) =>
        itemIndex === index ? { ...row, ...patch } : row
      )
    );
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= rows.length) return;
    const reordered = [...rows];
    const [row] = reordered.splice(index, 1);
    if (!row) return;
    reordered.splice(destination, 0, row);
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black">{title}</h3>
          <p className="text-muted-foreground mt-1 max-w-3xl text-xs leading-5">
            {description}
          </p>
        </div>
        {!disabled && rows.length < maximum ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange([...rows, create(rows)])}
          >
            <Plus className="size-4" />
            {addLabel}
          </Button>
        ) : null}
      </div>

      {rows.map((row, index) => {
        const accessibleName = describe(row) || `${noun} ${index + 1}`;
        return (
          // The stable key is editable, so only the position identifies a row.
          <fieldset key={index} className="border-border rounded-xl border p-4">
            <legend className="px-2 text-sm font-black">
              {noun} {String(index + 1).padStart(2, "0")} ·{" "}
              {describe(row) || "Untitled draft"}
            </legend>
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                shape="icon"
                aria-label={`Move ${accessibleName} up`}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                shape="icon"
                aria-label={`Move ${accessibleName} down`}
                disabled={disabled || index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              {!disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  shape="icon"
                  aria-label={`Remove ${accessibleName}`}
                  onClick={() =>
                    onChange(rows.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
            {renderRow(row, index, (patch) => update(index, patch))}
          </fieldset>
        );
      })}

      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          {emptyText}
        </p>
      ) : null}
    </div>
  );
}

export function EngagementModelsEditor({
  models,
  disabled,
  errors,
  onChange,
}: RowProps & {
  models: readonly TSiteEngagementModel[];
  onChange: (models: TSiteEngagementModel[]) => void;
}) {
  return (
    <RowListEditor
      title="Engagement models"
      description="Up to four ways to work together. Array order is the public order. A price is public only when verification is verified, and an unverified model cannot be enabled at publish."
      noun="Model"
      addLabel="Add engagement model"
      emptyText="No engagement models configured. The public Site receives an empty list."
      rows={models}
      maximum={4}
      disabled={disabled}
      create={(rows): TSiteEngagementModel => ({
        key: nextRowKey("engagement-model", rows),
        name: "",
        you_get: [],
        verification: "unverified",
        enabled: false,
      })}
      describe={(model) => model.name}
      onChange={onChange}
      renderRow={(model, index, update) => {
        const prefix = `engagement_models.${index}`;
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField
                path={`${prefix}.key`}
                label="Stable key"
                value={model.key}
                onChange={(value) => update({ key: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <TextField
                path={`${prefix}.name`}
                label="Model name"
                value={model.name}
                onChange={(value) => update({ name: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <TextField
                path={`${prefix}.duration_label`}
                label="Duration label"
                value={model.duration_label}
                onChange={(value) =>
                  update({ duration_label: optional(value) })
                }
                errors={errors}
                disabled={disabled}
              />
              <TextField
                path={`${prefix}.price_label`}
                label="Price label"
                value={model.price_label}
                onChange={(value) => update({ price_label: optional(value) })}
                errors={errors}
                disabled={disabled}
                hint="Public only when verification is verified."
              />
              <TextareaField
                path={`${prefix}.best_when`}
                label="Best when"
                value={model.best_when}
                onChange={(value) => update({ best_when: optional(value) })}
                errors={errors}
                disabled={disabled}
              />
              <LinesField
                path={`${prefix}.you_get`}
                label="You get"
                value={model.you_get}
                onChange={(lines) => update({ you_get: lines })}
                errors={errors}
                disabled={disabled}
                hint="One deliverable per line, up to six."
              />
              <TextareaField
                path={`${prefix}.how_it_runs`}
                label="How it runs"
                value={model.how_it_runs}
                onChange={(value) => update({ how_it_runs: optional(value) })}
                errors={errors}
                disabled={disabled}
              />
              <SelectField
                path={`${prefix}.verification`}
                label="Verification"
                value={model.verification}
                onChange={(value) =>
                  update({ verification: value as TSiteVerification })
                }
                options={VERIFICATION_OPTIONS}
                errors={errors}
                disabled={disabled}
                hint="Unverified terms cannot be published."
              />
            </div>
            <div className="mt-4 max-w-sm">
              <CheckField
                path={`${prefix}.enabled`}
                label="Include in published Site"
                checked={model.enabled}
                onChange={(value) => update({ enabled: value })}
                disabled={disabled}
                hint="Enabling needs best-when, at least one deliverable, how it runs, and a non-unverified state."
              />
            </div>
          </>
        );
      }}
    />
  );
}

/** Commitments, principles and next steps share one row shape. */
export function TitledRowsEditor({
  rows,
  path,
  title,
  description,
  noun,
  maximum,
  disabled,
  errors,
  onChange,
}: RowProps & {
  rows: readonly TSiteCommitment[];
  path: "commitments" | "principles" | "next_steps";
  title: string;
  description: string;
  noun: string;
  maximum: number;
  onChange: (rows: TSiteCommitment[]) => void;
}) {
  return (
    <RowListEditor
      title={title}
      description={description}
      noun={noun}
      addLabel={`Add ${noun.toLowerCase()}`}
      emptyText={`No ${title.toLowerCase()} configured. The public Site receives an empty list.`}
      rows={rows}
      maximum={maximum}
      disabled={disabled}
      create={(current) => ({
        key: nextRowKey(path.replace("_", "-"), current),
        title: "",
        summary: "",
        enabled: false,
      })}
      describe={(row) => row.title}
      onChange={onChange}
      renderRow={(row, index, update) => {
        const prefix = `${path}.${index}`;
        return (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <TextField
                path={`${prefix}.key`}
                label="Stable key"
                value={row.key}
                onChange={(value) => update({ key: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <TextField
                path={`${prefix}.title`}
                label="Title"
                value={row.title}
                onChange={(value) => update({ title: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <TextareaField
                path={`${prefix}.summary`}
                label="Summary"
                value={row.summary}
                onChange={(value) => update({ summary: value })}
                errors={errors}
                disabled={disabled}
              />
            </div>
            <div className="mt-4 max-w-sm">
              <CheckField
                path={`${prefix}.enabled`}
                label="Include in published Site"
                checked={row.enabled}
                onChange={(value) => update({ enabled: value })}
                disabled={disabled}
              />
            </div>
          </>
        );
      }}
    />
  );
}

export function DeliverableSamplesEditor({
  samples,
  disabled,
  errors,
  onChange,
}: RowProps & {
  samples: readonly TSiteDeliverableSample[];
  onChange: (samples: TSiteDeliverableSample[]) => void;
}) {
  return (
    <RowListEditor
      title="Deliverable samples"
      description="Up to six redacted excerpts of real artifacts. Excerpts are plain text and escaped at render; an enabled sample cannot be unverified at publish."
      noun="Sample"
      addLabel="Add deliverable sample"
      emptyText="No deliverable samples configured. The public Site receives an empty list."
      rows={samples}
      maximum={6}
      disabled={disabled}
      create={(rows): TSiteDeliverableSample => ({
        key: nextRowKey("deliverable-sample", rows),
        title: "",
        kind: "decision_record",
        excerpt: "",
        source_label: "",
        verification: "unverified",
        enabled: false,
      })}
      describe={(sample) => sample.title}
      onChange={onChange}
      renderRow={(sample, index, update) => {
        const prefix = `deliverable_samples.${index}`;
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField
                path={`${prefix}.key`}
                label="Stable key"
                value={sample.key}
                onChange={(value) => update({ key: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <TextField
                path={`${prefix}.title`}
                label="Sample title"
                value={sample.title}
                onChange={(value) => update({ title: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <SelectField
                path={`${prefix}.kind`}
                label="Kind"
                value={sample.kind}
                onChange={(value) =>
                  update({ kind: value as TSiteDeliverableSample["kind"] })
                }
                options={SITE_DELIVERABLE_KINDS.map((value) => ({
                  value,
                  label: value,
                }))}
                errors={errors}
                disabled={disabled}
              />
              <SelectField
                path={`${prefix}.verification`}
                label="Verification"
                value={sample.verification}
                onChange={(value) =>
                  update({ verification: value as TSiteVerification })
                }
                options={VERIFICATION_OPTIONS}
                errors={errors}
                disabled={disabled}
              />
              <TextField
                path={`${prefix}.source_label`}
                label="Source label"
                value={sample.source_label}
                onChange={(value) => update({ source_label: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <TextField
                path={`${prefix}.source_slug`}
                label="Source case study slug"
                value={sample.source_slug}
                onChange={(value) => update({ source_slug: optional(value) })}
                errors={errors}
                disabled={disabled}
              />
            </div>
            <div className="mt-4">
              <TextareaField
                path={`${prefix}.excerpt`}
                label="Excerpt"
                value={sample.excerpt}
                onChange={(value) => update({ excerpt: value })}
                errors={errors}
                disabled={disabled}
                rows={8}
                hint="Plain text, up to 1,200 characters. Line breaks are kept; markup is refused."
              />
            </div>
            <div className="mt-4 max-w-sm">
              <CheckField
                path={`${prefix}.enabled`}
                label="Include in published Site"
                checked={sample.enabled}
                onChange={(value) => update({ enabled: value })}
                disabled={disabled}
              />
            </div>
          </>
        );
      }}
    />
  );
}
