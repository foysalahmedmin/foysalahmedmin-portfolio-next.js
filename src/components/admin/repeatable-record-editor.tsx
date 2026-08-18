"use client";

import {
  EditorialCompletenessPanel,
  EditorialPanel,
  EditorialPublishBar,
  EditorialSlugEditor,
  EditorialStatus,
  EditorialWorkspaceHeader,
  toEditorialSlug,
  type TEditorialCompletenessItem,
} from "@/components/admin/editorial-editor-primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/async-state";
import {
  FormControl,
  FormControlError,
  FormControlHelper,
  FormControlLabel,
} from "@/components/ui/form-control";
import {
  buildRepeatableFormValues,
  buildRepeatablePayload,
  validateRepeatableForm,
  type LegalSectionDraft,
  type RepeatableFormValue,
  type RepeatableFormValues,
} from "@/lib/admin/repeatable-form";
import type {
  RepeatableAdminField,
  RepeatableAdminWorkspace,
} from "@/lib/admin/repeatable-workspaces";
import { PILLAR_OPTIONS } from "@/lib/admin/repeatable-workspaces";
import {
  createAdminRepeatableRecord,
  getAdminRepeatableRecord,
  getAdminRepeatableReferenceOptions,
  updateAdminRepeatableRecord,
  type AdminRepeatableRecord,
  type AdminRepeatableReferenceOption,
} from "@/services/repeatable-admin.service";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type Props = Readonly<{
  workspace: RepeatableAdminWorkspace;
  recordId?: string;
  actor: Readonly<{ id: string; name: string }>;
  canPublish: boolean;
}>;

type ReferenceState = Readonly<
  Record<string, AdminRepeatableReferenceOption[]>
>;

const inputClassName =
  "border-input bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/25 min-h-11 w-full rounded-xl border px-4 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60";
const textareaClassName = `${inputClassName} py-3 leading-6`;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const stringArray = (value: RepeatableFormValue | undefined): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const EditSkeleton = () => (
  <div aria-busy="true" aria-label="Loading record" className="space-y-6">
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </div>
    <Skeleton className="h-80 w-full rounded-3xl" />
    <Skeleton className="h-64 w-full rounded-3xl" />
    <span className="sr-only" role="status">
      Loading content record…
    </span>
  </div>
);

const FieldFrame = ({
  id,
  label,
  help,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) => (
  <div>
    <FormControlLabel htmlFor={id}>
      {label}
      {required ? <span aria-hidden="true"> *</span> : null}
    </FormControlLabel>
    {children}
    {help ? (
      <FormControlHelper id={`${id}-help`}>{help}</FormControlHelper>
    ) : null}
    {error ? (
      <FormControlError id={`${id}-error`}>{error}</FormControlError>
    ) : null}
  </div>
);

const RepeatableRecordEditor = ({
  workspace,
  recordId,
  actor,
  canPublish,
}: Props) => {
  const router = useRouter();
  const mode = recordId ? "edit" : "create";
  const [record, setRecord] = useState<AdminRepeatableRecord | null>(null);
  const [values, setValues] = useState<RepeatableFormValues>(() =>
    buildRepeatableFormValues(workspace)
  );
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [loadStatus, setLoadStatus] = useState<"loading" | "success" | "error">(
    recordId ? "loading" : "success"
  );
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [referenceKey, setReferenceKey] = useState(0);
  const [referenceOptions, setReferenceOptions] = useState<ReferenceState>({});
  const [referenceError, setReferenceError] = useState("");
  const [referencesLoading, setReferencesLoading] = useState(false);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!recordId) return;
    const controller = new AbortController();
    const load = async () => {
      setLoadStatus("loading");
      setLoadError("");
      try {
        const response = await getAdminRepeatableRecord(
          workspace.apiPath,
          recordId,
          { signal: controller.signal }
        );
        if (!response.success || !response.data) {
          throw new Error(
            response.message || "Failed to load the content record"
          );
        }
        setRecord(response.data);
        setValues(buildRepeatableFormValues(workspace, response.data));
        setLoadStatus("success");
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          getErrorMessage(error, "Failed to load the content record")
        );
        setLoadStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, [recordId, refreshKey, workspace]);

  const referenceFields = useMemo(
    () => workspace.fields.filter((field) => field.type === "reference"),
    [workspace.fields]
  );

  useEffect(() => {
    if (!referenceFields.length) return;
    const controller = new AbortController();
    const load = async () => {
      setReferencesLoading(true);
      setReferenceError("");
      try {
        const entries = await Promise.all(
          referenceFields.map(
            async (field) =>
              [
                field.name,
                await getAdminRepeatableReferenceOptions(field.endpoint, {
                  signal: controller.signal,
                }),
              ] as const
          )
        );
        if (!controller.signal.aborted)
          setReferenceOptions(Object.fromEntries(entries));
      } catch (error) {
        if (!controller.signal.aborted) {
          setReferenceError(
            getErrorMessage(error, "Related records could not be loaded.")
          );
        }
      } finally {
        if (!controller.signal.aborted) setReferencesLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [referenceFields, referenceKey]);

  const setValue = useCallback((name: string, value: RepeatableFormValue) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setSubmitError("");
  }, []);

  const completenessItems = useMemo(() => {
    const validation = validateRepeatableForm(workspace, values, canPublish);
    const title = String(values.title ?? "").trim();
    const explicitSlug = String(values.slug ?? "").trim();
    const requiredDomainFields = workspace.fields.filter(
      (field) => field.required
    );
    const domainFieldsComplete = requiredDomainFields.every(
      (field) => !validation[field.name]
    );
    const editorValid = Object.keys(validation).length === 0;

    return [
      {
        id: "title",
        label: workspace.singular === "FAQ" ? "Question" : "Title",
        complete: Boolean(title) && !validation.title,
        detail: "Required for stable editorial identity.",
      },
      {
        id: "slug",
        label: "Canonical identity",
        complete:
          Boolean(explicitSlug || toEditorialSlug(title)) && !validation.slug,
        detail: explicitSlug
          ? "An explicit canonical slug is set."
          : "A valid slug will be derived from the title on create.",
      },
      {
        id: "domain-fields",
        label: "Required domain fields",
        complete: domainFieldsComplete,
        detail: `${requiredDomainFields.length} domain-specific requirement${requiredDomainFields.length === 1 ? "" : "s"} checked.`,
      },
      {
        id: "editor-validation",
        label: "Editor validation",
        complete: editorValid,
        detail:
          "Server-side relationship, consent, evidence, and concurrency checks still run on save.",
      },
      {
        id: "summary",
        label: "Editorial summary",
        complete: Boolean(String(values.summary ?? "").trim()),
        detail:
          "Optional here, but useful for cards and metadata where supported.",
        required: false,
      },
    ] satisfies readonly TEditorialCompletenessItem[];
  }, [canPublish, values, workspace]);

  const fieldId = (name: string) => `repeatable-${workspace.key}-${name}`;
  const describedBy = (field: RepeatableAdminField) =>
    [
      field.help ? `${fieldId(field.name)}-help` : "",
      errors[field.name] ? `${fieldId(field.name)}-error` : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const setMatchedField = (name: string, nextValue: string) => {
    setValue(name, nextValue);
    workspace.fields
      .filter(
        (field) => field.type === "reference" && field.matchField === name
      )
      .forEach((field) => {
        const currentReference = String(values[field.name] ?? "");
        const currentOption = (referenceOptions[field.name] ?? []).find(
          (option) => option.id === currentReference
        );
        if (
          currentReference &&
          nextValue &&
          currentOption?.attributes[name] !== nextValue
        ) {
          setValue(field.name, "");
        }
      });
  };

  const renderField = (field: RepeatableAdminField) => {
    const id = fieldId(field.name);
    const value = values[field.name];
    const error = errors[field.name];
    const frame = (control: ReactNode) => (
      <FieldFrame
        key={field.name}
        id={id}
        label={field.label}
        help={field.help}
        required={field.required}
        error={error}
      >
        {control}
      </FieldFrame>
    );

    if (field.type === "textarea" || field.type === "list") {
      return frame(
        <textarea
          id={id}
          name={field.name}
          value={typeof value === "string" ? value : ""}
          rows={field.type === "textarea" ? (field.rows ?? 5) : 6}
          maxLength={field.type === "textarea" ? field.maxLength : undefined}
          placeholder={field.placeholder}
          required={field.required}
          disabled={submitting}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(field)}
          onChange={(event) => setValue(field.name, event.target.value)}
          className={textareaClassName}
        />
      );
    }

    if (field.type === "select") {
      return frame(
        <select
          id={id}
          name={field.name}
          value={typeof value === "string" ? value : ""}
          required={field.required}
          disabled={submitting}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(field)}
          onChange={(event) => setMatchedField(field.name, event.target.value)}
          className={inputClassName}
        >
          {!field.required ? <option value="">Not recorded</option> : null}
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "reference") {
      const currentValue = typeof value === "string" ? value : "";
      const matchValue = field.matchField
        ? String(values[field.matchField] ?? "")
        : "";
      const options = (referenceOptions[field.name] ?? []).filter(
        (option) =>
          option.id !== recordId &&
          (!field.matchField ||
            !matchValue ||
            option.attributes[field.matchField] === matchValue)
      );
      const hasCurrent = options.some((option) => option.id === currentValue);
      return frame(
        <select
          id={id}
          name={field.name}
          value={currentValue}
          required={field.required}
          disabled={submitting || referencesLoading || Boolean(referenceError)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(field)}
          onChange={(event) => setValue(field.name, event.target.value)}
          className={inputClassName}
        >
          <option value="">
            {referencesLoading ? "Loading related records…" : field.emptyLabel}
          </option>
          {currentValue && !hasCurrent ? (
            <option value={currentValue}>
              Current reference ({currentValue})
            </option>
          ) : null}
          {options.map((option) => (
            <option
              key={option.id}
              value={option.id}
              disabled={option.is_deleted}
            >
              {option.title}
              {option.attributes.document_version
                ? ` · v${option.attributes.document_version}`
                : ""}{" "}
              · {option.is_deleted ? "deleted" : option.status}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "multi-select") {
      const selected = stringArray(value);
      return (
        <fieldset
          key={field.name}
          id={id}
          tabIndex={-1}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(field)}
          className="space-y-2"
        >
          <legend className="text-sm font-medium">
            {field.label}
            {field.required ? <span aria-hidden="true"> *</span> : null}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {field.options.map((option) => (
              <label
                key={option.value}
                className="border-input bg-card hover:bg-muted flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  disabled={submitting}
                  onChange={(event) =>
                    setValue(
                      field.name,
                      event.target.checked
                        ? [...selected, option.value]
                        : selected.filter((item) => item !== option.value)
                    )
                  }
                  className="accent-primary size-4"
                />
                {option.label}
              </label>
            ))}
          </div>
          {field.help ? (
            <FormControlHelper id={`${id}-help`}>
              {field.help}
            </FormControlHelper>
          ) : null}
          {error ? (
            <FormControlError id={`${id}-error`}>{error}</FormControlError>
          ) : null}
        </fieldset>
      );
    }

    if (field.type === "boolean") {
      return (
        <label
          key={field.name}
          className="border-input bg-card hover:bg-muted flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm"
        >
          <input
            id={id}
            name={field.name}
            type="checkbox"
            checked={Boolean(value)}
            disabled={submitting}
            onChange={(event) => setValue(field.name, event.target.checked)}
            className="accent-primary size-4"
          />
          <span>
            <span className="block font-medium">{field.label}</span>
            {field.help ? (
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {field.help}
              </span>
            ) : null}
          </span>
        </label>
      );
    }

    if (field.type === "actor") {
      const reviewer = typeof value === "string" ? value : "";
      return (
        <div key={field.name}>
          <label className="border-input bg-card hover:bg-muted flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm">
            <input
              id={id}
              name={field.name}
              type="checkbox"
              checked={reviewer === actor.id}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? `${id}-error` : field.help ? `${id}-help` : undefined
              }
              onChange={(event) =>
                setValue(field.name, event.target.checked ? actor.id : "")
              }
              className="accent-primary size-4"
            />
            <span>
              <span className="block font-medium">
                {field.label}: {actor.name}
              </span>
              <span
                id={`${id}-help`}
                className="text-muted-foreground mt-0.5 block text-xs"
              >
                {reviewer && reviewer !== actor.id
                  ? `Another reviewer is already recorded (${reviewer}). Selecting this replaces that reviewer.`
                  : field.help}
              </span>
            </span>
          </label>
          {error ? (
            <FormControlError id={`${id}-error`}>{error}</FormControlError>
          ) : null}
        </div>
      );
    }

    if (field.type === "legal-sections") {
      const sections = Array.isArray(value)
        ? (value as LegalSectionDraft[])
        : [];
      const updateSection = (
        index: number,
        patch: Partial<LegalSectionDraft>
      ) =>
        setValue(
          field.name,
          sections.map((section, sectionIndex) =>
            sectionIndex === index ? { ...section, ...patch } : section
          )
        );
      return (
        <fieldset
          key={field.name}
          id={id}
          tabIndex={-1}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="space-y-4"
        >
          <legend className="text-sm font-medium">{field.label} *</legend>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting || sections.length >= 50}
              onClick={() =>
                setValue(field.name, [
                  ...sections,
                  { key: "", heading: "", body: "" },
                ])
              }
            >
              <Plus aria-hidden="true" className="size-4" />
              Add section
            </Button>
          </div>
          {sections.map((section, index) => (
            <div
              key={`${index}-${section.key}`}
              className="border-border bg-surface-subtle space-y-4 rounded-2xl border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">Section {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  shape="icon"
                  disabled={submitting || sections.length === 1}
                  aria-label={`Remove legal section ${index + 1}`}
                  onClick={() =>
                    setValue(
                      field.name,
                      sections.filter(
                        (_, sectionIndex) => sectionIndex !== index
                      )
                    )
                  }
                  className="text-destructive"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">
                  Section key
                  <input
                    value={section.key}
                    required
                    maxLength={64}
                    disabled={submitting}
                    placeholder="data-retention"
                    onChange={(event) =>
                      updateSection(index, { key: event.target.value })
                    }
                    className={`${inputClassName} mt-1`}
                  />
                </label>
                <label className="text-sm font-medium">
                  Heading
                  <input
                    value={section.heading}
                    required
                    maxLength={180}
                    disabled={submitting}
                    onChange={(event) =>
                      updateSection(index, { heading: event.target.value })
                    }
                    className={`${inputClassName} mt-1`}
                  />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Body
                <textarea
                  value={section.body}
                  required
                  rows={8}
                  maxLength={10_000}
                  disabled={submitting}
                  onChange={(event) =>
                    updateSection(index, { body: event.target.value })
                  }
                  className={`${textareaClassName} mt-1`}
                />
              </label>
            </div>
          ))}
          {error ? (
            <FormControlError id={`${id}-error`}>{error}</FormControlError>
          ) : null}
        </fieldset>
      );
    }

    const inputType =
      field.type === "url"
        ? "url"
        : field.type === "number"
          ? "number"
          : field.type === "datetime"
            ? "datetime-local"
            : "text";
    return frame(
      <FormControl
        id={id}
        name={field.name}
        type={inputType}
        value={typeof value === "string" ? value : ""}
        required={field.required}
        disabled={submitting}
        min={field.type === "number" ? field.min : undefined}
        max={field.type === "number" ? field.max : undefined}
        step={field.type === "number" ? field.step : undefined}
        maxLength={
          field.type === "text" ||
          field.type === "url" ||
          field.type === "object-id"
            ? field.maxLength
            : undefined
        }
        placeholder={
          field.type === "text" ||
          field.type === "url" ||
          field.type === "object-id"
            ? field.placeholder
            : undefined
        }
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(field)}
        onChange={(event) => setValue(field.name, event.target.value)}
        className="rounded-xl"
      />
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const validationErrors = validateRepeatableForm(
      workspace,
      values,
      canPublish
    );
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      const first = Object.keys(validationErrors)[0];
      window.setTimeout(
        () => document.getElementById(fieldId(first))?.focus(),
        0
      );
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = buildRepeatablePayload(
        workspace,
        values,
        mode,
        record?.version
      );
      if (mode === "edit" && recordId) {
        await updateAdminRepeatableRecord(workspace.apiPath, recordId, payload);
      } else {
        await createAdminRepeatableRecord(workspace.apiPath, payload);
      }
      router.push(`/admin/${workspace.key}`);
      router.refresh();
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          `The ${workspace.singular} could not be ${mode === "edit" ? "updated" : "created"}.`
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadStatus === "loading") return <EditSkeleton />;
  if (loadStatus === "error") {
    return (
      <ErrorState
        title="Content record unavailable"
        description={loadError}
        onRetry={refresh}
      />
    );
  }
  if (record?.is_deleted) {
    return (
      <ErrorState
        title="Restore this record before editing"
        description="Deleted repeatable content is read-only until it is restored from its workspace."
        onRetry={() =>
          router.push(`/admin/${workspace.key}?deleted_scope=only_deleted`)
        }
        retryLabel="Open deleted records"
      />
    );
  }

  return (
    <div className="space-y-7">
      <EditorialWorkspaceHeader
        eyebrow={
          mode === "edit" ? "Edit repeatable content" : "New repeatable content"
        }
        title={
          mode === "edit"
            ? `Edit ${workspace.singular}`
            : `Create ${workspace.singular}`
        }
        description="Required fields are marked with an asterisk. Publication remains subject to backend evidence and integrity checks."
        status={
          <>
            <EditorialStatus
              tone={values.status === "published" ? "success" : "neutral"}
            >
              {String(values.status)}
            </EditorialStatus>
            <EditorialStatus tone={mode === "edit" ? "neutral" : "warning"}>
              {mode === "edit"
                ? `Revision ${record?.version ?? "—"}`
                : "Unsaved"}
            </EditorialStatus>
          </>
        }
        actions={
          <Link
            href={`/admin/${workspace.key}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to {workspace.label.toLowerCase()}
          </Link>
        }
      />

      {referenceError ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-2xl border p-4 text-sm"
        >
          <p>{referenceError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setReferenceKey((value) => value + 1)}
          >
            Retry related records
          </Button>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate className="space-y-6">
        {submitError ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-2xl border p-4 text-sm"
          >
            {submitError}
          </div>
        ) : null}

        <EditorialPanel
          id="content-identity-heading"
          title="Content identity"
          description="Stable identity, summary, and six-discipline relationships."
        >
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <FieldFrame
                id={fieldId("title")}
                label={workspace.singular === "FAQ" ? "Question" : "Title"}
                required
                error={errors.title}
              >
                <FormControl
                  id={fieldId("title")}
                  value={String(values.title ?? "")}
                  required
                  maxLength={160}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={
                    errors.title ? `${fieldId("title")}-error` : undefined
                  }
                  onChange={(event) => setValue("title", event.target.value)}
                  className="rounded-xl"
                />
              </FieldFrame>
              <EditorialSlugEditor
                id={fieldId("slug")}
                value={String(values.slug ?? "")}
                sourceValue={String(values.title ?? "")}
                onChange={(value) => setValue("slug", value)}
                disabled={submitting}
                error={errors.slug}
                help="Leave blank when creating to derive it from the title, or set an explicit canonical slug."
              />
            </div>
            <FieldFrame
              id={fieldId("summary")}
              label="Summary"
              help="Keep it concise and evidence-safe; some domains require this before publication."
              error={errors.summary}
            >
              <textarea
                id={fieldId("summary")}
                value={String(values.summary ?? "")}
                rows={4}
                maxLength={600}
                disabled={submitting}
                aria-invalid={Boolean(errors.summary)}
                aria-describedby={`${fieldId("summary")}-help${errors.summary ? ` ${fieldId("summary")}-error` : ""}`}
                onChange={(event) => setValue("summary", event.target.value)}
                className={textareaClassName}
              />
            </FieldFrame>
            {workspace.supportsPillars ? (
              <div className="grid gap-5 md:grid-cols-2">
                <FieldFrame
                  id={fieldId("primary_pillar")}
                  label="Primary discipline"
                  error={errors.primary_pillar}
                >
                  <select
                    id={fieldId("primary_pillar")}
                    value={String(values.primary_pillar ?? "")}
                    disabled={submitting}
                    onChange={(event) => {
                      const primary = event.target.value;
                      setMatchedField("primary_pillar", primary);
                      setValue(
                        "secondary_pillars",
                        stringArray(values.secondary_pillars).filter(
                          (item) => item !== primary
                        )
                      );
                    }}
                    className={inputClassName}
                  >
                    <option value="">Not assigned</option>
                    {PILLAR_OPTIONS.map((pillar) => (
                      <option key={pillar.value} value={pillar.value}>
                        {pillar.label}
                      </option>
                    ))}
                  </select>
                </FieldFrame>
                <fieldset
                  id={fieldId("secondary_pillars")}
                  tabIndex={-1}
                  aria-invalid={Boolean(errors.secondary_pillars)}
                  aria-describedby={
                    errors.secondary_pillars
                      ? `${fieldId("secondary_pillars")}-error`
                      : undefined
                  }
                >
                  <legend className="mb-1 text-sm font-medium">
                    Secondary disciplines
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PILLAR_OPTIONS.map((pillar) => {
                      const selected = stringArray(values.secondary_pillars);
                      const disabled = values.primary_pillar === pillar.value;
                      return (
                        <label
                          key={pillar.value}
                          className="border-input bg-card flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(pillar.value)}
                            disabled={submitting || disabled}
                            onChange={(event) =>
                              setValue(
                                "secondary_pillars",
                                event.target.checked
                                  ? [...selected, pillar.value]
                                  : selected.filter(
                                      (item) => item !== pillar.value
                                    )
                              )
                            }
                            className="accent-primary size-4"
                          />
                          {pillar.label}
                        </label>
                      );
                    })}
                  </div>
                  {errors.secondary_pillars ? (
                    <FormControlError
                      id={`${fieldId("secondary_pillars")}-error`}
                    >
                      {errors.secondary_pillars}
                    </FormControlError>
                  ) : null}
                </fieldset>
              </div>
            ) : null}
          </div>
        </EditorialPanel>

        <EditorialPanel
          id="domain-fields-heading"
          title={`${workspace.label} fields`}
          description="Domain-specific content, relationships, evidence, and consent controls."
        >
          <div className="grid gap-5 md:grid-cols-2">
            {workspace.fields.map((field) => (
              <div
                key={field.name}
                className={
                  field.type === "textarea" ||
                  field.type === "list" ||
                  field.type === "multi-select" ||
                  field.type === "legal-sections"
                    ? "md:col-span-2"
                    : undefined
                }
              >
                {renderField(field)}
              </div>
            ))}
          </div>
        </EditorialPanel>

        <EditorialCompletenessPanel items={completenessItems} />

        <EditorialPanel
          id="publication-heading"
          title="Publication and lifecycle"
          description="Publishing invokes backend completeness, evidence, and relationship checks."
        >
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
              <FieldFrame
                id={fieldId("status")}
                label="Publication status"
                required
                error={errors.status}
              >
                <select
                  id={fieldId("status")}
                  value={String(values.status)}
                  disabled={submitting}
                  onChange={(event) => setValue("status", event.target.value)}
                  className={inputClassName}
                >
                  <option value="draft">Draft</option>
                  <option value="published" disabled={!canPublish}>
                    Published
                  </option>
                  <option value="archived">Archived</option>
                </select>
              </FieldFrame>
              <FieldFrame
                id={fieldId("claim_verification")}
                label="Claim verification"
                required
              >
                <select
                  id={fieldId("claim_verification")}
                  value={String(values.claim_verification)}
                  disabled={submitting}
                  onChange={(event) =>
                    setValue("claim_verification", event.target.value)
                  }
                  className={inputClassName}
                >
                  {workspace.claimVerificationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FieldFrame>
              <FieldFrame
                id={fieldId("sequence")}
                label="Display order"
                required
                error={errors.sequence}
              >
                <FormControl
                  id={fieldId("sequence")}
                  type="number"
                  min={0}
                  max={1_000_000}
                  step={1}
                  value={String(values.sequence)}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.sequence)}
                  onChange={(event) => setValue("sequence", event.target.value)}
                  className="rounded-xl"
                />
              </FieldFrame>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="border-input bg-card flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(values.enabled)}
                  disabled={submitting}
                  onChange={(event) =>
                    setValue("enabled", event.target.checked)
                  }
                  className="accent-primary size-4"
                />
                <span>
                  <span className="block font-medium">Enabled</span>
                  <span className="text-muted-foreground text-xs">
                    Disabled records cannot be projected publicly.
                  </span>
                </span>
              </label>
              <label className="border-input bg-card flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(values.is_featured)}
                  disabled={submitting}
                  onChange={(event) =>
                    setValue("is_featured", event.target.checked)
                  }
                  className="accent-primary size-4"
                />
                <span>
                  <span className="block font-medium">Featured</span>
                  <span className="text-muted-foreground text-xs">
                    Featured is an editorial signal, not a verification claim.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </EditorialPanel>

        <EditorialPublishBar
          busy={submitting}
          message={
            submitting
              ? "Saving and running editorial checks…"
              : values.status === "published"
                ? "Saving requests publication; backend evidence checks remain authoritative."
                : "Save this record without changing its current publication state."
          }
        >
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/${workspace.key}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={submitting || Boolean(referenceError)}
              isLoading={submitting}
            >
              <Save aria-hidden="true" className="size-4" />
              {submitting
                ? "Saving…"
                : mode === "edit"
                  ? "Save changes"
                  : `Create ${workspace.singular}`}
            </Button>
          </div>
        </EditorialPublishBar>
      </form>
    </div>
  );
};

export default RepeatableRecordEditor;
