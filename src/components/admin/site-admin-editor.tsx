"use client";

import type {
  TSiteAdminDto,
  TSiteDraftSnapshot,
  TSiteLink,
  TSiteMetric,
  TSiteProcessStep,
  TSiteSocialLink,
} from "@/app/api/site/site.type";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  EditorialField,
  EditorialErrorSummary,
  EditorialNotice,
  EditorialPanel,
  EditorialStatus,
  EditorialStickyActions,
  EditorialWorkspaceHeader,
  editorialInputClassName,
  editorialTextareaClassName,
  type TEditorErrors,
} from "@/components/admin/editorial-editor-primitives";
import {
  getPillarLabel,
  PILLAR_ACCENTS,
  PILLAR_ICON_KEYS,
  PILLAR_KEYS,
} from "@/lib/content/pillars";
import {
  createAdminSiteClient,
  EditorialRequestError,
  getAdminSiteClient,
  publishAdminSiteClient,
  updateAdminSiteClient,
} from "@/services/site-page-admin.service";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  TFileEditorialMetadataInput,
  TFilePopulated,
  TFilePurpose,
} from "@/types/file.type";

type SiteAdminEditorProps = Readonly<{
  initialSite: TSiteAdminDto | null;
  canEdit: boolean;
  canPublish: boolean;
}>;

const cloneDraft = (draft: TSiteDraftSnapshot): TSiteDraftSnapshot =>
  structuredClone(draft);

const sourceMap = (error: EditorialRequestError): TEditorErrors =>
  Object.fromEntries(
    error.sources.map((source) => {
      const match = source.path.match(/^pillars\.([a-z_]+)(\..+)$/);
      const pillarIndex = match
        ? PILLAR_KEYS.indexOf(match[1] as (typeof PILLAR_KEYS)[number])
        : -1;
      return [
        pillarIndex >= 0
          ? `pillars.${pillarIndex}${match?.[2] ?? ""}`
          : source.path,
        source.message,
      ];
    })
  );

const fieldError = (errors: TEditorErrors, path: string) => errors[path];
const describedBy = (errors: TEditorErrors, path: string, hint = false) =>
  [hint ? `${path}-hint` : "", errors[path] ? `${path}-error` : ""]
    .filter(Boolean)
    .join(" ") || undefined;

const optional = (value: string): string | undefined =>
  value.trim() ? value : undefined;

function TextField({
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

function TextareaField({
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

function SelectField({
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

function CheckField({
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

function ManagedFileReferenceField({
  path,
  label,
  value,
  onChange,
  purpose,
  errors,
  disabled,
  metadata,
}: {
  path: string;
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  purpose: TFilePurpose;
  errors: TEditorErrors;
  disabled: boolean;
  metadata?: TFileEditorialMetadataInput;
}) {
  const [uploaded, setUploaded] = useState<TFilePopulated | null>(null);
  return (
    <div className="space-y-3">
      <TextField
        path={path}
        label={label}
        value={value}
        onChange={(next) => {
          setUploaded(null);
          onChange(optional(next));
        }}
        errors={errors}
        disabled={disabled}
        hint="Managed File ID. Existing references stay authoritative until replaced or cleared."
      />
      <FileUploader
        purpose={purpose}
        value={uploaded}
        onChange={(file) => {
          setUploaded(file);
          onChange(file?._id);
        }}
        metadata={metadata}
        accept={
          purpose === "resume"
            ? "application/pdf,.pdf"
            : "image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
        }
        label={`Upload ${label.toLowerCase()} replacement`}
        disabled={disabled}
      />
      <p className="text-muted-foreground text-xs leading-5">
        Uploads use the provider-neutral managed storage pipeline. Save the Site
        draft to attach the returned File reference.
      </p>
    </div>
  );
}

function LinkListEditor({
  title,
  path,
  links,
  maximum,
  disabled,
  errors,
  onChange,
  single = false,
}: {
  title: string;
  path: string;
  links: readonly TSiteLink[];
  maximum: number;
  disabled: boolean;
  errors: TEditorErrors;
  onChange: (links: TSiteLink[]) => void;
  single?: boolean;
}) {
  const add = () => {
    let index = links.length + 1;
    let key = `link-${index}`;
    while (links.some((link) => link.key === key)) {
      index += 1;
      key = `link-${index}`;
    }
    onChange([
      ...links,
      { key, label: "", kind: "internal", href: "/", enabled: false },
    ]);
  };
  const update = (index: number, patch: Partial<TSiteLink>) =>
    onChange(
      links.map((link, itemIndex) =>
        itemIndex === index ? { ...link, ...patch } : link
      )
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        {!disabled && links.length < maximum ? (
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="size-4" aria-hidden="true" />
            Add link
          </Button>
        ) : null}
      </div>
      {links.length ? (
        <div className="space-y-4">
          {links.map((link, index) => {
            const prefix = single ? path : `${path}.${index}`;
            const supportsHref =
              link.kind === "internal" || link.kind === "external";
            return (
              <fieldset
                key={`${link.key}-${index}`}
                className="border-border rounded-xl border p-4"
              >
                <legend className="px-2 text-xs font-black tracking-wider uppercase">
                  {link.label || `Link ${index + 1}`}
                </legend>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <TextField
                    path={`${prefix}.key`}
                    label="Stable key"
                    value={link.key}
                    onChange={(value) => update(index, { key: value })}
                    errors={errors}
                    disabled={disabled}
                    required
                  />
                  <TextField
                    path={`${prefix}.label`}
                    label="Label"
                    value={link.label}
                    onChange={(value) => update(index, { label: value })}
                    errors={errors}
                    disabled={disabled}
                    required
                  />
                  <SelectField
                    path={`${prefix}.kind`}
                    label="Destination type"
                    value={link.kind}
                    onChange={(value) =>
                      update(index, {
                        kind: value as TSiteLink["kind"],
                        href:
                          value === "internal"
                            ? "/"
                            : value === "external"
                              ? ""
                              : undefined,
                        open_in_new_tab:
                          value === "external"
                            ? link.open_in_new_tab
                            : undefined,
                      })
                    }
                    options={[
                      "internal",
                      "external",
                      "email",
                      "phone",
                      "resume",
                    ].map((value) => ({
                      value,
                      label: value.replace("_", " "),
                    }))}
                    errors={errors}
                    disabled={disabled}
                  />
                  {supportsHref ? (
                    <TextField
                      path={`${prefix}.href`}
                      label={
                        link.kind === "internal" ? "Public path" : "HTTPS URL"
                      }
                      value={link.href}
                      onChange={(value) => update(index, { href: value })}
                      errors={errors}
                      disabled={disabled}
                      required
                    />
                  ) : (
                    <div className="border-border bg-muted/40 rounded-xl border p-3 text-xs leading-5">
                      <strong>Destination is derived.</strong>
                      <br />
                      Site contact or resume settings remain the authority.
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <CheckField
                    path={`${prefix}.enabled`}
                    label="Enabled"
                    checked={link.enabled}
                    onChange={(value) => update(index, { enabled: value })}
                    disabled={disabled}
                  />
                  {link.kind === "external" ? (
                    <CheckField
                      path={`${prefix}.open_in_new_tab`}
                      label="Open in a new tab"
                      checked={Boolean(link.open_in_new_tab)}
                      onChange={(value) =>
                        update(index, { open_in_new_tab: value })
                      }
                      disabled={disabled}
                    />
                  ) : null}
                  {!disabled ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive ml-auto"
                      onClick={() =>
                        onChange(
                          links.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </fieldset>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          No links configured. This list fails closed.
        </p>
      )}
      {fieldError(errors, path) ? (
        <p className="text-destructive text-xs" role="alert">
          {fieldError(errors, path)}
        </p>
      ) : null}
    </div>
  );
}

function SocialLinksEditor({
  links,
  disabled,
  errors,
  onChange,
}: {
  links: readonly TSiteSocialLink[];
  disabled: boolean;
  errors: TEditorErrors;
  onChange: (links: TSiteSocialLink[]) => void;
}) {
  const update = (index: number, patch: Partial<TSiteSocialLink>) =>
    onChange(
      links.map((link, itemIndex) =>
        itemIndex === index ? { ...link, ...patch } : link
      )
    );
  const add = () =>
    onChange([
      ...links,
      {
        key: `social-${links.length + 1}`,
        platform: "other",
        label: "",
        url: "",
        enabled: false,
      },
    ]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black">Social profiles</h3>
        {!disabled && links.length < 12 ? (
          <Button type="button" size="sm" variant="outline" onClick={add}>
            <Plus className="size-4" aria-hidden="true" />
            Add profile
          </Button>
        ) : null}
      </div>
      {links.map((link, index) => {
        const prefix = `social_links.${index}`;
        return (
          <div
            key={`${link.key}-${index}`}
            className="border-border grid gap-4 rounded-xl border p-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <TextField
              path={`${prefix}.key`}
              label="Stable key"
              value={link.key}
              onChange={(value) => update(index, { key: value })}
              errors={errors}
              disabled={disabled}
            />
            <SelectField
              path={`${prefix}.platform`}
              label="Platform"
              value={link.platform}
              onChange={(value) =>
                update(index, {
                  platform: value as TSiteSocialLink["platform"],
                })
              }
              options={[
                "github",
                "linkedin",
                "x",
                "youtube",
                "facebook",
                "instagram",
                "other",
              ].map((value) => ({ value, label: value }))}
              errors={errors}
              disabled={disabled}
            />
            <TextField
              path={`${prefix}.label`}
              label="Accessible label"
              value={link.label}
              onChange={(value) => update(index, { label: value })}
              errors={errors}
              disabled={disabled}
            />
            <TextField
              path={`${prefix}.url`}
              label="HTTPS URL"
              type="url"
              value={link.url}
              onChange={(value) => update(index, { url: value })}
              errors={errors}
              disabled={disabled}
            />
            <div className="flex items-end gap-2">
              <CheckField
                path={`${prefix}.enabled`}
                label="Enabled"
                checked={link.enabled}
                onChange={(value) => update(index, { enabled: value })}
                disabled={disabled}
              />
              {!disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  shape="icon"
                  aria-label={`Remove ${link.label || `social profile ${index + 1}`}`}
                  onClick={() =>
                    onChange(
                      links.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
      {links.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          No social profiles configured.
        </p>
      ) : null}
    </div>
  );
}

function MetricsEditor({
  metrics,
  disabled,
  errors,
  onChange,
}: {
  metrics: readonly TSiteMetric[];
  disabled: boolean;
  errors: TEditorErrors;
  onChange: (metrics: TSiteMetric[]) => void;
}) {
  const update = (index: number, patch: Partial<TSiteMetric>) =>
    onChange(
      metrics.map((metric, itemIndex) =>
        itemIndex === index ? { ...metric, ...patch } : metric
      )
    );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black">Evidence metrics</h3>
        {!disabled && metrics.length < 12 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange([
                ...metrics,
                {
                  key: `metric-${metrics.length + 1}`,
                  label: "",
                  verification: "unverified",
                  enabled: false,
                },
              ])
            }
          >
            <Plus className="size-4" />
            Add metric
          </Button>
        ) : null}
      </div>
      {metrics.map((metric, index) => {
        const prefix = `metrics.${index}`;
        return (
          <div
            key={`${metric.key}-${index}`}
            className="border-border grid gap-4 rounded-xl border p-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <TextField
              path={`${prefix}.key`}
              label="Stable key"
              value={metric.key}
              onChange={(value) => update(index, { key: value })}
              errors={errors}
              disabled={disabled}
            />
            <TextField
              path={`${prefix}.label`}
              label="Label"
              value={metric.label}
              onChange={(value) => update(index, { label: value })}
              errors={errors}
              disabled={disabled}
            />
            <TextField
              path={`${prefix}.value`}
              label="Value"
              value={metric.value}
              onChange={(value) => update(index, { value: optional(value) })}
              errors={errors}
              disabled={disabled}
            />
            <SelectField
              path={`${prefix}.verification`}
              label="Verification"
              value={metric.verification}
              onChange={(value) =>
                update(index, {
                  verification: value as TSiteMetric["verification"],
                })
              }
              options={["unverified", "derived", "verified"].map((value) => ({
                value,
                label: value,
              }))}
              errors={errors}
              disabled={disabled}
            />
            <div className="flex items-end gap-2">
              <CheckField
                path={`${prefix}.enabled`}
                label="Enabled"
                checked={metric.enabled}
                onChange={(value) => update(index, { enabled: value })}
                disabled={disabled}
              />
              {!disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  shape="icon"
                  aria-label={`Remove ${metric.label || `metric ${index + 1}`}`}
                  onClick={() =>
                    onChange(
                      metrics.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const nextProcessStepKey = (steps: readonly TSiteProcessStep[]): string => {
  let suffix = steps.length + 1;
  let key = `process-step-${suffix}`;
  while (steps.some((step) => step.key === key)) {
    suffix += 1;
    key = `process-step-${suffix}`;
  }
  return key;
};

function ProcessEditor({
  steps,
  disabled,
  errors,
  onChange,
}: {
  steps: readonly TSiteProcessStep[];
  disabled: boolean;
  errors: TEditorErrors;
  onChange: (steps: TSiteProcessStep[]) => void;
}) {
  const update = (index: number, patch: Partial<TSiteProcessStep>) =>
    onChange(
      steps.map((step, itemIndex) =>
        itemIndex === index ? { ...step, ...patch } : step
      )
    );
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= steps.length) return;
    const reordered = [...steps];
    const [step] = reordered.splice(index, 1);
    if (!step) return;
    reordered.splice(destination, 0, step);
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black">Client-facing delivery process</h3>
          <p className="text-muted-foreground mt-1 max-w-3xl text-xs leading-5">
            Array order is the public sequence. Disabled steps remain private
            draft material; enabled steps require both a summary and concrete
            deliverable before Site publication.
          </p>
        </div>
        {!disabled && steps.length < 12 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange([
                ...steps,
                {
                  key: nextProcessStepKey(steps),
                  title: "",
                  enabled: false,
                },
              ])
            }
          >
            <Plus className="size-4" />
            Add process step
          </Button>
        ) : null}
      </div>

      {steps.map((step, index) => {
        const prefix = `process.${index}`;
        const accessibleName = step.title || `process step ${index + 1}`;
        return (
          <fieldset
            key={`${step.key}-${index}`}
            className="border-border rounded-xl border p-4"
          >
            <legend className="px-2 text-sm font-black">
              Step {String(index + 1).padStart(2, "0")} ·{" "}
              {step.title || "Untitled draft"}
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
                disabled={disabled || index === steps.length - 1}
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
                    onChange(
                      steps.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField
                path={`${prefix}.key`}
                label="Stable key"
                value={step.key}
                onChange={(value) => update(index, { key: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <TextField
                path={`${prefix}.title`}
                label="Step title"
                value={step.title}
                onChange={(value) => update(index, { title: value })}
                errors={errors}
                disabled={disabled}
                required
              />
              <TextareaField
                path={`${prefix}.summary`}
                label="Step summary"
                value={step.summary}
                onChange={(value) =>
                  update(index, { summary: optional(value) })
                }
                errors={errors}
                disabled={disabled}
                hint="Explain the collaboration, decision, or engineering activity in plain language."
              />
              <TextareaField
                path={`${prefix}.deliverable`}
                label="Concrete deliverable"
                value={step.deliverable}
                onChange={(value) =>
                  update(index, { deliverable: optional(value) })
                }
                errors={errors}
                disabled={disabled}
                hint="Name what the client receives or can review at this step."
              />
            </div>
            <div className="mt-4 max-w-sm">
              <CheckField
                path={`${prefix}.enabled`}
                label="Include in published process"
                checked={step.enabled}
                onChange={(value) => update(index, { enabled: value })}
                disabled={disabled}
                hint="Publication still validates the complete Site revision atomically."
              />
            </div>
          </fieldset>
        );
      })}

      {steps.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          No process steps configured. The public Site receives an empty list;
          no generic methodology is invented.
        </p>
      ) : null}
    </div>
  );
}

export default function SiteAdminEditor({
  initialSite,
  canEdit,
  canPublish,
}: SiteAdminEditorProps) {
  const router = useRouter();
  const [site, setSite] = useState(initialSite);
  const [draft, setDraft] = useState<TSiteDraftSnapshot | null>(() =>
    initialSite ? cloneDraft(initialSite.draft) : null
  );
  const [savedDraft, setSavedDraft] = useState<TSiteDraftSnapshot | null>(() =>
    initialSite ? cloneDraft(initialSite.draft) : null
  );
  const [busy, setBusy] = useState<
    "create" | "save" | "publish" | "reload" | null
  >(null);
  const [errors, setErrors] = useState<TEditorErrors>({});
  const [notice, setNotice] = useState<{
    tone: "success" | "warning" | "danger";
    title: string;
    detail?: string;
  } | null>(null);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const dirty = useMemo(
    () =>
      Boolean(
        draft &&
          savedDraft &&
          JSON.stringify(draft) !== JSON.stringify(savedDraft)
      ),
    [draft, savedDraft]
  );
  const disabled = !canEdit || Boolean(busy);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const accept = (next: TSiteAdminDto, message: string) => {
    setSite(next);
    setDraft(cloneDraft(next.draft));
    setSavedDraft(cloneDraft(next.draft));
    setErrors({});
    setConflictRevision(null);
    setNotice({ tone: "success", title: message });
    router.refresh();
  };
  const fail = (error: unknown) => {
    if (error instanceof EditorialRequestError) {
      setErrors(sourceMap(error));
      setConflictRevision(
        error.status === 409 ? (error.currentRevision ?? null) : null
      );
      setNotice({
        tone: error.status === 409 ? "warning" : "danger",
        title: error.message,
        detail: [
          error.code,
          error.requestId ? `Request ${error.requestId}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      });
    } else
      setNotice({ tone: "danger", title: "The Site operation failed safely." });
  };
  const reload = async () => {
    setBusy("reload");
    setNotice(null);
    try {
      accept(await getAdminSiteClient(), "Latest Site revision loaded.");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };
  const create = async () => {
    setBusy("create");
    setNotice(null);
    try {
      accept(
        await createAdminSiteClient(),
        "Neutral Site draft created. No public content was published."
      );
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };
  const save = async () => {
    if (!site || !draft || !dirty) return;
    setBusy("save");
    setNotice(null);
    setErrors({});
    try {
      accept(
        await updateAdminSiteClient(site.revision, draft),
        "Site draft saved."
      );
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };
  const publish = async () => {
    if (!site || dirty) return;
    setBusy("publish");
    setNotice(null);
    setErrors({});
    try {
      const result = await publishAdminSiteClient(site.revision);
      accept(
        result.site,
        result.cache_invalidated
          ? "Site published and public cache refreshed."
          : "Site published. Cache invalidation is queued for retry."
      );
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  if (!site || !draft || !savedDraft) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <EditorialWorkspaceHeader
          eyebrow="Site authority"
          title="Site settings"
          description="The revisioned Site singleton owns portfolio identity, positioning, six pillars, delivery process, public navigation, contact policy and metadata defaults."
          status={
            <EditorialStatus tone="warning">Not configured</EditorialStatus>
          }
        />
        {initialSite === null ? (
          <EditorialNotice tone="warning" title="No Site singleton exists.">
            Creating one produces a neutral, non-indexable draft with the exact
            five immutable pillars. It does not invent or publish portfolio
            claims.
          </EditorialNotice>
        ) : null}
        {canEdit ? (
          <Button type="button" onClick={create} isLoading={busy === "create"}>
            Create neutral Site draft
          </Button>
        ) : (
          <EditorialNotice tone="danger" title="Read-only access">
            A Site editor or administrator must create the initial draft.
          </EditorialNotice>
        )}
      </div>
    );
  }

  const publishedRevision = site.published?.revision;
  const hasUnpublishedRevision = publishedRevision !== site.revision;
  return (
    <div className="mx-auto max-w-[100rem] space-y-6">
      <EditorialWorkspaceHeader
        eyebrow="Site authority"
        title="Site settings"
        description="One revisioned source for public identity, positioning, contact policy, process, navigation, brand media, metadata and the exact six-pillar narrative."
        status={
          <>
            <EditorialStatus>Draft r{site.revision}</EditorialStatus>
            {publishedRevision ? (
              <EditorialStatus tone="success">
                Published r{publishedRevision}
              </EditorialStatus>
            ) : (
              <EditorialStatus tone="warning">Never published</EditorialStatus>
            )}
            {dirty ? (
              <EditorialStatus tone="warning">Unsaved</EditorialStatus>
            ) : hasUnpublishedRevision ? (
              <EditorialStatus tone="warning">
                Unpublished revision
              </EditorialStatus>
            ) : (
              <EditorialStatus tone="success">Published draft</EditorialStatus>
            )}
            {!canEdit ? <EditorialStatus>Read only</EditorialStatus> : null}
          </>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={reload}
            isLoading={busy === "reload"}
          >
            <RotateCcw className="size-4" />
            Reload
          </Button>
        }
      />

      {notice ? (
        <EditorialNotice tone={notice.tone} title={notice.title}>
          {notice.detail}
        </EditorialNotice>
      ) : null}
      {conflictRevision ? (
        <EditorialNotice
          tone="warning"
          title={`A newer revision (r${conflictRevision}) exists.`}
        >
          Your local values remain visible for comparison. Reload before saving
          to avoid overwriting another editor.
        </EditorialNotice>
      ) : null}
      <EditorialErrorSummary errors={errors} />
      {!canEdit ? (
        <EditorialNotice title="Read-only Site access">
          Your current role can inspect private drafts and publication status,
          but server authority prevents mutation.
        </EditorialNotice>
      ) : null}

      <EditorialPanel
        id="site-identity"
        title="Identity & positioning"
        description="Canonical names and a consistent six-discipline positioning system used throughout the portfolio."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <TextField
            path="identity.public_name"
            label="Public name"
            value={draft.identity.public_name}
            onChange={(value) =>
              setDraft({
                ...draft,
                identity: { ...draft.identity, public_name: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="identity.short_name"
            label="Short name"
            value={draft.identity.short_name}
            onChange={(value) =>
              setDraft({
                ...draft,
                identity: { ...draft.identity, short_name: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="identity.canonical_url"
            label="Canonical origin"
            type="url"
            value={draft.identity.canonical_url}
            onChange={(value) =>
              setDraft({
                ...draft,
                identity: { ...draft.identity, canonical_url: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
            hint="Public HTTPS origin without a route path."
          />
          <TextField
            path="identity.timezone"
            label="IANA timezone"
            value={draft.identity.timezone}
            onChange={(value) =>
              setDraft({
                ...draft,
                identity: { ...draft.identity, timezone: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
            hint="For example, Asia/Dhaka."
          />
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(
            [
              "canonical",
              "compact",
              "mobile",
              "long",
              "short_bio",
              "long_bio",
              "client_promise",
            ] as const
          ).map((key) => (
            <TextareaField
              key={key}
              path={`positioning.${key}`}
              label={key.replaceAll("_", " ")}
              value={draft.positioning[key]}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  positioning: { ...draft.positioning, [key]: optional(value) },
                })
              }
              errors={errors}
              disabled={disabled}
              rows={key === "long_bio" ? 7 : 3}
            />
          ))}
        </div>
      </EditorialPanel>

      <EditorialPanel
        id="site-pillars"
        title="Exact six-pillar system"
        description="Key, label, order and fallback visual are contract-owned and intentionally immutable. Narrative, capabilities, technologies, CTA and managed File references remain editorial."
      >
        <div className="space-y-5">
          {draft.pillars.map((pillar, index) => {
            const prefix = `pillars.${index}`;
            const update = (patch: Partial<typeof pillar>) =>
              setDraft({
                ...draft,
                pillars: draft.pillars.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, ...patch } : item
                ),
              });
            return (
              <fieldset
                key={pillar.key}
                className="border-border rounded-2xl border p-5"
              >
                <legend className="px-2 text-sm font-black">
                  {index + 1}. {pillar.label}
                </legend>
                <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="bg-muted/40 rounded-xl p-3 text-xs">
                    <strong>Immutable key</strong>
                    <br />
                    {pillar.key}
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 text-xs">
                    <strong>Immutable order</strong>
                    <br />
                    {pillar.order}
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 text-xs">
                    <strong>Fallback visual</strong>
                    <br />
                    {pillar.fallback_visual_key}
                  </div>
                  <CheckField
                    path={`${prefix}.enabled`}
                    label="Publicly enabled"
                    checked={pillar.enabled}
                    onChange={(value) => update({ enabled: value })}
                    disabled={disabled}
                  />
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <TextField
                    path={`${prefix}.headline`}
                    label="Headline"
                    value={pillar.headline}
                    onChange={(value) => update({ headline: optional(value) })}
                    errors={errors}
                    disabled={disabled}
                  />
                  <TextareaField
                    path={`${prefix}.summary`}
                    label="Summary"
                    value={pillar.summary}
                    onChange={(value) => update({ summary: optional(value) })}
                    errors={errors}
                    disabled={disabled}
                  />
                  <TextareaField
                    path={`${prefix}.client_outcome`}
                    label="Client outcome"
                    value={pillar.client_outcome}
                    onChange={(value) =>
                      update({ client_outcome: optional(value) })
                    }
                    errors={errors}
                    disabled={disabled}
                  />
                  <TextareaField
                    path={`${prefix}.capabilities`}
                    label="Capabilities"
                    value={pillar.capabilities.join("\n")}
                    onChange={(value) =>
                      update({
                        capabilities: value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    errors={errors}
                    disabled={disabled}
                    hint="One unique capability per line."
                  />
                  <TextareaField
                    path={`${prefix}.technologies`}
                    label="Technologies"
                    value={pillar.technologies.join("\n")}
                    onChange={(value) =>
                      update({
                        technologies: value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    errors={errors}
                    disabled={disabled}
                    hint="One unique technology per line."
                  />
                  <TextareaField
                    path={`${prefix}.seo_summary`}
                    label="SEO summary"
                    value={pillar.seo_summary}
                    onChange={(value) =>
                      update({ seo_summary: optional(value) })
                    }
                    errors={errors}
                    disabled={disabled}
                  />
                  <SelectField
                    path={`${prefix}.icon_key`}
                    label="Icon token"
                    value={pillar.icon_key}
                    onChange={(value) =>
                      update({ icon_key: value as typeof pillar.icon_key })
                    }
                    options={PILLAR_ICON_KEYS.map((value) => ({
                      value,
                      label: value,
                    }))}
                    errors={errors}
                    disabled={disabled}
                  />
                  <SelectField
                    path={`${prefix}.accent`}
                    label="Accent token"
                    value={pillar.accent}
                    onChange={(value) =>
                      update({ accent: value as typeof pillar.accent })
                    }
                    options={PILLAR_ACCENTS.map((value) => ({
                      value,
                      label: value,
                    }))}
                    errors={errors}
                    disabled={disabled}
                  />
                  <ManagedFileReferenceField
                    path={`${prefix}.visual_file`}
                    label="Managed visual File ID"
                    value={pillar.visual_file}
                    onChange={(value) =>
                      update({
                        visual_file: value,
                        ...(!value
                          ? {
                              visual_alt_text: undefined,
                              visual_is_decorative: undefined,
                            }
                          : {}),
                      })
                    }
                    purpose="hero"
                    errors={errors}
                    disabled={disabled}
                    metadata={{
                      source: "uploaded",
                      alt_text: pillar.visual_is_decorative
                        ? undefined
                        : pillar.visual_alt_text,
                      is_decorative: pillar.visual_is_decorative,
                    }}
                  />
                  <TextField
                    path={`${prefix}.visual_alt_text`}
                    label="Visual alternative text"
                    value={pillar.visual_alt_text}
                    onChange={(value) =>
                      update({ visual_alt_text: optional(value) })
                    }
                    errors={errors}
                    disabled={disabled || Boolean(pillar.visual_is_decorative)}
                  />
                  <CheckField
                    path={`${prefix}.visual_is_decorative`}
                    label="Visual is decorative"
                    checked={Boolean(pillar.visual_is_decorative)}
                    onChange={(value) =>
                      update({
                        visual_is_decorative: value,
                        ...(value ? { visual_alt_text: undefined } : {}),
                      })
                    }
                    disabled={disabled || !pillar.visual_file}
                  />
                </div>
                <details className="mt-5">
                  <summary className="focus-visible:ring-ring cursor-pointer rounded-lg py-2 font-bold focus-visible:ring-2 focus-visible:outline-none">
                    Pillar CTA
                  </summary>
                  <div className="mt-3">
                    <LinkListEditor
                      title="Call to action"
                      path={`${prefix}.cta`}
                      links={pillar.cta ? [pillar.cta] : []}
                      maximum={1}
                      disabled={disabled}
                      errors={errors}
                      single
                      onChange={(links) => update({ cta: links[0] })}
                    />
                  </div>
                </details>
              </fieldset>
            );
          })}
        </div>
      </EditorialPanel>

      <EditorialPanel
        id="site-contact"
        title="Contact & availability"
        description="Visibility settings are fail-closed; email, phone and map details are projected publicly only when explicitly allowed."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <TextField
            path="contact.public_email"
            label="Public email"
            type="email"
            value={draft.contact.public_email}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: { ...draft.contact, public_email: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <SelectField
            path="contact.email_visibility"
            label="Email visibility"
            value={draft.contact.email_visibility}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: {
                  ...draft.contact,
                  email_visibility:
                    value as typeof draft.contact.email_visibility,
                },
              })
            }
            options={[
              { value: "hidden", label: "Hidden" },
              { value: "public", label: "Public" },
            ]}
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="contact.public_phone"
            label="Public phone"
            type="tel"
            value={draft.contact.public_phone}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: { ...draft.contact, public_phone: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
            hint="E.164 format, for example +8801…"
          />
          <SelectField
            path="contact.phone_visibility"
            label="Phone visibility"
            value={draft.contact.phone_visibility}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: {
                  ...draft.contact,
                  phone_visibility:
                    value as typeof draft.contact.phone_visibility,
                },
              })
            }
            options={[
              { value: "hidden", label: "Hidden" },
              { value: "public", label: "Public" },
            ]}
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="contact.location"
            label="Public location"
            value={draft.contact.location}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: { ...draft.contact, location: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <SelectField
            path="contact.map_policy"
            label="Map policy"
            value={draft.contact.map_policy}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: {
                  ...draft.contact,
                  map_policy: value as typeof draft.contact.map_policy,
                },
              })
            }
            options={[
              { value: "hidden", label: "Hidden" },
              { value: "city_only", label: "City only" },
            ]}
            errors={errors}
            disabled={disabled}
          />
          <SelectField
            path="contact.availability"
            label="Availability"
            value={draft.contact.availability}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: {
                  ...draft.contact,
                  availability: value as typeof draft.contact.availability,
                },
              })
            }
            options={["unknown", "available", "limited", "unavailable"].map(
              (value) => ({ value, label: value })
            )}
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="contact.availability_label"
            label="Availability label"
            value={draft.contact.availability_label}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: {
                  ...draft.contact,
                  availability_label: optional(value),
                },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="contact.availability_review_at"
            label="Review at (ISO timestamp)"
            value={draft.contact.availability_review_at}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: {
                  ...draft.contact,
                  availability_review_at: optional(value),
                },
              })
            }
            errors={errors}
            disabled={disabled}
            hint="Use an offset ISO timestamp, e.g. 2026-08-01T09:00:00+06:00."
          />
          <TextareaField
            path="contact.response_promise"
            label="Response promise"
            value={draft.contact.response_promise}
            onChange={(value) =>
              setDraft({
                ...draft,
                contact: {
                  ...draft.contact,
                  response_promise: optional(value),
                },
              })
            }
            errors={errors}
            disabled={disabled}
          />
        </div>
      </EditorialPanel>

      <EditorialPanel
        id="site-links"
        title="Navigation, social & calls to action"
        description="Every destination is validated by kind. Email, phone and resume destinations derive from their authoritative Site fields."
      >
        <div className="space-y-8">
          <LinkListEditor
            title="Header navigation"
            path="navigation.header"
            links={draft.navigation.header}
            maximum={12}
            disabled={disabled}
            errors={errors}
            onChange={(links) =>
              setDraft({
                ...draft,
                navigation: { ...draft.navigation, header: links },
              })
            }
          />
          <LinkListEditor
            title="Footer navigation"
            path="navigation.footer"
            links={draft.navigation.footer}
            maximum={16}
            disabled={disabled}
            errors={errors}
            onChange={(links) =>
              setDraft({
                ...draft,
                navigation: { ...draft.navigation, footer: links },
              })
            }
          />
          <LinkListEditor
            title="Legal navigation"
            path="navigation.legal"
            links={draft.navigation.legal}
            maximum={8}
            disabled={disabled}
            errors={errors}
            onChange={(links) =>
              setDraft({
                ...draft,
                navigation: { ...draft.navigation, legal: links },
              })
            }
          />
          <LinkListEditor
            title="Primary calls to action"
            path="primary_ctas"
            links={draft.primary_ctas}
            maximum={4}
            disabled={disabled}
            errors={errors}
            onChange={(links) => setDraft({ ...draft, primary_ctas: links })}
          />
          <SocialLinksEditor
            links={draft.social_links}
            disabled={disabled}
            errors={errors}
            onChange={(links) => setDraft({ ...draft, social_links: links })}
          />
        </div>
      </EditorialPanel>

      <EditorialPanel
        id="site-brand"
        title="Brand, media references & fallbacks"
        description="Only IDs from the managed File module are accepted. Publishing validates purpose, public access, provider URL and metadata readiness."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {(
            [
              "logo_light_file",
              "logo_dark_file",
              "favicon_file",
              "profile_file",
              "resume_file",
            ] as const
          ).map((key) => (
            <ManagedFileReferenceField
              key={key}
              path={`brand.${key}`}
              label={key.replaceAll("_", " ")}
              value={draft.brand[key]}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  brand: { ...draft.brand, [key]: value },
                })
              }
              purpose={
                key === "profile_file"
                  ? "profile"
                  : key === "resume_file"
                    ? "resume"
                    : "logo"
              }
              errors={errors}
              disabled={disabled}
            />
          ))}
          {(["project_file", "article_file", "profile_file"] as const).map(
            (key) => (
              <ManagedFileReferenceField
                key={`fallback-${key}`}
                path={`fallbacks.${key}`}
                label={`Fallback ${key.replace("_file", "")}`}
                value={draft.fallbacks[key]}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    fallbacks: { ...draft.fallbacks, [key]: value },
                  })
                }
                purpose={
                  key === "project_file"
                    ? "project"
                    : key === "article_file"
                      ? "article"
                      : "profile"
                }
                errors={errors}
                disabled={disabled}
              />
            )
          )}
          <div className="border-border/70 md:col-span-2 xl:col-span-4 border-t pt-5">
            <h3 className="font-black">Project fallbacks by pillar</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              A matching pillar asset takes priority over the legacy generic
              project fallback.
            </p>
          </div>
          {PILLAR_KEYS.map((pillar) => (
            <ManagedFileReferenceField
              key={`fallback-project-${pillar}`}
              path={`fallbacks.project_files_by_pillar.${pillar}`}
              label={`${getPillarLabel(pillar)} project fallback`}
              value={draft.fallbacks.project_files_by_pillar[pillar]}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  fallbacks: {
                    ...draft.fallbacks,
                    project_files_by_pillar: {
                      ...draft.fallbacks.project_files_by_pillar,
                      [pillar]: value,
                    },
                  },
                })
              }
              purpose="project"
              errors={errors}
              disabled={disabled}
            />
          ))}
          <div className="border-border/70 md:col-span-2 xl:col-span-4 border-t pt-5">
            <h3 className="font-black">Article fallbacks by pillar</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              A matching pillar asset takes priority over the legacy generic
              article fallback.
            </p>
          </div>
          {PILLAR_KEYS.map((pillar) => (
            <ManagedFileReferenceField
              key={`fallback-article-${pillar}`}
              path={`fallbacks.article_files_by_pillar.${pillar}`}
              label={`${getPillarLabel(pillar)} article fallback`}
              value={draft.fallbacks.article_files_by_pillar[pillar]}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  fallbacks: {
                    ...draft.fallbacks,
                    article_files_by_pillar: {
                      ...draft.fallbacks.article_files_by_pillar,
                      [pillar]: value,
                    },
                  },
                })
              }
              purpose="article"
              errors={errors}
              disabled={disabled}
            />
          ))}
        </div>
      </EditorialPanel>

      <EditorialPanel
        id="site-seo"
        title="SEO & experience defaults"
        description="Indexing remains an explicit publish-time choice. Verification values are private draft inputs and are never exposed by the public Site DTO."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <TextField
            path="seo.default_title"
            label="Default title"
            value={draft.seo.default_title}
            onChange={(value) =>
              setDraft({
                ...draft,
                seo: { ...draft.seo, default_title: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="seo.title_template"
            label="Title template"
            value={draft.seo.title_template}
            onChange={(value) =>
              setDraft({
                ...draft,
                seo: { ...draft.seo, title_template: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
            hint="Include exactly one %s placeholder."
          />
          <TextareaField
            path="seo.default_description"
            label="Default description"
            value={draft.seo.default_description}
            onChange={(value) =>
              setDraft({
                ...draft,
                seo: { ...draft.seo, default_description: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="seo.canonical_url"
            label="SEO canonical origin"
            type="url"
            value={draft.seo.canonical_url}
            onChange={(value) =>
              setDraft({
                ...draft,
                seo: { ...draft.seo, canonical_url: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <ManagedFileReferenceField
            path="seo.default_og_file"
            label="Default OG File ID"
            value={draft.seo.default_og_file}
            onChange={(value) =>
              setDraft({
                ...draft,
                seo: { ...draft.seo, default_og_file: value },
              })
            }
            purpose="social"
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="seo.verification.google"
            label="Google verification token"
            value={draft.seo.verification?.google}
            onChange={(value) =>
              setDraft({
                ...draft,
                seo: {
                  ...draft.seo,
                  verification: {
                    ...draft.seo.verification,
                    google: optional(value),
                  },
                },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="seo.verification.bing"
            label="Bing verification token"
            value={draft.seo.verification?.bing}
            onChange={(value) =>
              setDraft({
                ...draft,
                seo: {
                  ...draft.seo,
                  verification: {
                    ...draft.seo.verification,
                    bing: optional(value),
                  },
                },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <CheckField
            path="seo.allow_indexing"
            label="Allow search indexing"
            checked={draft.seo.allow_indexing}
            onChange={(value) =>
              setDraft({
                ...draft,
                seo: { ...draft.seo, allow_indexing: value },
              })
            }
            disabled={disabled}
            hint="Publication and complete metadata are still required."
          />
          <SelectField
            path="experience.theme"
            label="Default theme"
            value={draft.experience.theme}
            onChange={(value) =>
              setDraft({
                ...draft,
                experience: {
                  ...draft.experience,
                  theme: value as typeof draft.experience.theme,
                },
              })
            }
            options={["system", "light", "dark"].map((value) => ({
              value,
              label: value,
            }))}
            errors={errors}
            disabled={disabled}
          />
          <SelectField
            path="experience.motion"
            label="Default motion"
            value={draft.experience.motion}
            onChange={(value) =>
              setDraft({
                ...draft,
                experience: {
                  ...draft.experience,
                  motion: value as typeof draft.experience.motion,
                },
              })
            }
            options={["full", "reduced", "off"].map((value) => ({
              value,
              label: value,
            }))}
            errors={errors}
            disabled={disabled}
          />
          <SelectField
            path="experience.accent"
            label="Default accent"
            value={draft.experience.accent}
            onChange={(value) =>
              setDraft({
                ...draft,
                experience: {
                  ...draft.experience,
                  accent: value as typeof draft.experience.accent,
                },
              })
            }
            options={PILLAR_ACCENTS.map((value) => ({ value, label: value }))}
            errors={errors}
            disabled={disabled}
          />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <CheckField
            path="experience.feature_flags.show_availability"
            label="Show availability"
            checked={draft.experience.feature_flags.show_availability}
            onChange={(value) =>
              setDraft({
                ...draft,
                experience: {
                  ...draft.experience,
                  feature_flags: {
                    ...draft.experience.feature_flags,
                    show_availability: value,
                  },
                },
              })
            }
            disabled={disabled}
          />
          <CheckField
            path="experience.feature_flags.show_metrics"
            label="Show metrics"
            checked={draft.experience.feature_flags.show_metrics}
            onChange={(value) =>
              setDraft({
                ...draft,
                experience: {
                  ...draft.experience,
                  feature_flags: {
                    ...draft.experience.feature_flags,
                    show_metrics: value,
                  },
                },
              })
            }
            disabled={disabled}
          />
          <CheckField
            path="experience.feature_flags.show_testimonials"
            label="Show testimonials"
            checked={draft.experience.feature_flags.show_testimonials}
            onChange={(value) =>
              setDraft({
                ...draft,
                experience: {
                  ...draft.experience,
                  feature_flags: {
                    ...draft.experience.feature_flags,
                    show_testimonials: value,
                  },
                },
              })
            }
            disabled={disabled}
          />
        </div>
      </EditorialPanel>

      <EditorialPanel
        id="site-process"
        title="Embedded delivery process"
        description="Process is low-volume Site content, not a standalone CRUD domain. Stable typed steps publish with the same optimistic revision as positioning, pillars and metrics."
      >
        <ProcessEditor
          steps={draft.process}
          disabled={disabled}
          errors={errors}
          onChange={(process) => setDraft({ ...draft, process })}
        />
      </EditorialPanel>

      <EditorialPanel
        id="site-footer"
        title="Footer & evidence metrics"
        description="Metrics carry an explicit verification state; unverified claims can remain disabled until evidence is available."
      >
        <div className="mb-8 grid gap-5 md:grid-cols-3">
          <TextareaField
            path="footer.tagline"
            label="Footer tagline"
            value={draft.footer.tagline}
            onChange={(value) =>
              setDraft({
                ...draft,
                footer: { ...draft.footer, tagline: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <TextField
            path="footer.copyright_name"
            label="Copyright name"
            value={draft.footer.copyright_name}
            onChange={(value) =>
              setDraft({
                ...draft,
                footer: { ...draft.footer, copyright_name: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
          <TextareaField
            path="footer.legal_notice"
            label="Legal notice"
            value={draft.footer.legal_notice}
            onChange={(value) =>
              setDraft({
                ...draft,
                footer: { ...draft.footer, legal_notice: optional(value) },
              })
            }
            errors={errors}
            disabled={disabled}
          />
        </div>
        <MetricsEditor
          metrics={draft.metrics}
          disabled={disabled}
          errors={errors}
          onChange={(metrics) => setDraft({ ...draft, metrics })}
        />
      </EditorialPanel>

      <EditorialStickyActions
        dirty={dirty}
        busy={Boolean(busy)}
        canEdit={canEdit}
        onSave={save}
        onReset={() => {
          setDraft(cloneDraft(savedDraft));
          setErrors({});
          setNotice(null);
        }}
      >
        {canPublish ? (
          <Button
            type="button"
            variant="success"
            onClick={publish}
            disabled={
              dirty || Boolean(busy) || publishedRevision === site.revision
            }
            isLoading={busy === "publish"}
          >
            <Send className="size-4" />
            {dirty
              ? "Save before publishing"
              : publishedRevision === site.revision
                ? "Current revision published"
                : "Publish revision"}
          </Button>
        ) : null}
      </EditorialStickyActions>
    </div>
  );
}
