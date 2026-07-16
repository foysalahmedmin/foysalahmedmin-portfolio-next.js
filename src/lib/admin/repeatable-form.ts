import type {
  RepeatableAdminField,
  RepeatableAdminWorkspace,
} from "./repeatable-workspaces";
import { getDefaultClaimVerification } from "./repeatable-workspaces";
import type { AdminRepeatableRecord } from "@/services/repeatable-admin.service";

export type LegalSectionDraft = Readonly<{
  key: string;
  heading: string;
  body: string;
}>;

export type RepeatableFormValue =
  | string
  | boolean
  | string[]
  | LegalSectionDraft[];
export type RepeatableFormValues = Record<string, RepeatableFormValue>;
export type RepeatableFormErrors = Readonly<Record<string, string>>;

const toDatetimeLocal = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const fieldInitialValue = (
  field: RepeatableAdminField,
  record?: AdminRepeatableRecord
): RepeatableFormValue => {
  const current = record?.[field.name];
  if (field.type === "boolean") return Boolean(current);
  if (field.type === "list") {
    return Array.isArray(current) ? current.map(String).join("\n") : "";
  }
  if (field.type === "multi-select") {
    return Array.isArray(current) ? current.map(String) : [];
  }
  if (field.type === "legal-sections") {
    if (Array.isArray(current) && current.length) {
      return current.map((section) => {
        const item = section as Record<string, unknown>;
        return {
          key: String(item.key ?? ""),
          heading: String(item.heading ?? ""),
          body: String(item.body ?? ""),
        };
      });
    }
    return [{ key: "", heading: "", body: "" }];
  }
  if (field.type === "datetime") return toDatetimeLocal(current);
  if (current !== undefined && current !== null) return String(current);
  if (field.type === "select" && field.required) {
    return field.options[0]?.value ?? "";
  }
  return "";
};

export const buildRepeatableFormValues = (
  workspace: RepeatableAdminWorkspace,
  record?: AdminRepeatableRecord
): RepeatableFormValues => ({
  title: record?.title ?? "",
  slug: record?.slug ?? "",
  summary: record?.summary ?? "",
  primary_pillar: record?.primary_pillar ?? "",
  secondary_pillars: record?.secondary_pillars ?? [],
  sequence: String(record?.sequence ?? 0),
  status: record?.status ?? "draft",
  enabled: record?.enabled ?? true,
  is_featured: record?.is_featured ?? false,
  claim_verification:
    record?.claim_verification ?? getDefaultClaimVerification(workspace),
  ...Object.fromEntries(
    workspace.fields.map((field) => [
      field.name,
      fieldInitialValue(field, record),
    ])
  ),
});

const asString = (value: RepeatableFormValue | undefined) =>
  typeof value === "string" ? value.trim() : "";

const asStringArray = (value: RepeatableFormValue | undefined): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const isValidHttpsUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash
    );
  } catch {
    return false;
  }
};

export const validateRepeatableForm = (
  workspace: RepeatableAdminWorkspace,
  values: RepeatableFormValues,
  canPublish: boolean
): RepeatableFormErrors => {
  const errors: Record<string, string> = {};
  if (!asString(values.title)) errors.title = "Enter a title.";
  if (asString(values.title).length > 160)
    errors.title = "Use 160 characters or fewer.";
  const slug = asString(values.slug);
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.slug = "Use lowercase letters, numbers, and single hyphens.";
  }
  if (asString(values.summary).length > 600) {
    errors.summary = "Use 600 characters or fewer.";
  }
  if (values.status === "published" && !canPublish) {
    errors.status = "Your current role cannot publish content.";
  }
  const sequence = Number(values.sequence);
  if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence > 1_000_000) {
    errors.sequence = "Use a whole number from 0 to 1,000,000.";
  }
  const secondary = asStringArray(values.secondary_pillars);
  if (secondary.length > 4)
    errors.secondary_pillars = "Choose at most four disciplines.";
  if (secondary.includes(asString(values.primary_pillar))) {
    errors.secondary_pillars =
      "The primary discipline cannot also be secondary.";
  }

  for (const field of workspace.fields) {
    const value = values[field.name];
    if (field.required) {
      const missing =
        typeof value === "string"
          ? !value.trim()
          : Array.isArray(value)
            ? value.length === 0
            : value === undefined;
      if (missing) errors[field.name] = `${field.label} is required.`;
    }
    if (
      (field.type === "text" ||
        field.type === "textarea" ||
        field.type === "url" ||
        field.type === "object-id") &&
      field.maxLength &&
      asString(value).length > field.maxLength
    ) {
      errors[field.name] = `Use ${field.maxLength} characters or fewer.`;
    }
    if (
      field.type === "url" &&
      asString(value) &&
      !isValidHttpsUrl(asString(value))
    ) {
      errors[field.name] =
        "Use a public HTTPS URL without credentials or a fragment.";
    }
    if (
      (field.type === "object-id" ||
        field.type === "reference" ||
        field.type === "actor") &&
      asString(value) &&
      !/^[0-9a-f]{24}$/i.test(asString(value))
    ) {
      errors[field.name] = "The selected record ID is invalid.";
    }
    if (field.type === "number" && asString(value)) {
      const number = Number(value);
      if (
        !Number.isFinite(number) ||
        (field.min !== undefined && number < field.min) ||
        (field.max !== undefined && number > field.max)
      ) {
        errors[field.name] =
          `Enter a number${field.min !== undefined ? ` of at least ${field.min}` : ""}${field.max !== undefined ? ` and at most ${field.max}` : ""}.`;
      }
    }
    if (field.type === "datetime" && asString(value)) {
      if (Number.isNaN(new Date(asString(value)).getTime())) {
        errors[field.name] = "Enter a valid date and time.";
      }
    }
    if (field.type === "select" && asString(value)) {
      if (!field.options.some((option) => option.value === asString(value))) {
        errors[field.name] = "Choose a supported option.";
      }
    }
    if (field.type === "list") {
      const items = asString(value)
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length > (field.maxItems ?? 30)) {
        errors[field.name] = `Use at most ${field.maxItems ?? 30} items.`;
      } else if (items.some((item) => item.length > 160)) {
        errors[field.name] = "Use 160 characters or fewer per item.";
      }
    }
    if (field.type === "multi-select") {
      const selected = asStringArray(value);
      if (
        selected.some(
          (item) => !field.options.some((option) => option.value === item)
        )
      ) {
        errors[field.name] = "Choose only supported options.";
      }
    }
    if (field.type === "legal-sections") {
      const sections = Array.isArray(value)
        ? (value as LegalSectionDraft[])
        : [];
      if (!sections.length)
        errors[field.name] = "Add at least one legal section.";
      else if (sections.length > 50)
        errors[field.name] = "Use at most 50 legal sections.";
      else if (
        sections.some(
          ({ key, heading, body }) =>
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key.trim()) ||
            !heading.trim() ||
            !body.trim() ||
            key.trim().length > 64 ||
            heading.trim().length > 180 ||
            body.trim().length > 10_000
        )
      ) {
        errors[field.name] =
          "Every section needs a kebab-case key, heading, and body.";
      } else if (
        new Set(sections.map(({ key }) => key.trim())).size !== sections.length
      ) {
        errors[field.name] = "Legal section keys must be unique.";
      }
    }
  }

  if (workspace.key === "timeline") {
    const started = asString(values.started_at);
    const ended = asString(values.ended_at);
    if (values.is_current === true && ended) {
      errors.ended_at = "A current entry cannot have an end date.";
    } else if (started && ended && new Date(started) > new Date(ended)) {
      errors.ended_at = "The end date cannot precede the start date.";
    }
  }
  if (
    workspace.key === "skills" &&
    ["derived", "verified"].includes(asString(values.claim_verification))
  ) {
    if (!asString(values.evidence_source)) {
      errors.evidence_source = "Evidence-backed proficiency requires a source.";
    }
    if (!asString(values.evidence_reference)) {
      errors.evidence_reference =
        "Evidence-backed proficiency requires a bounded reference.";
    }
    if (values.claim_verification === "verified") {
      if (!asString(values.verified_at)) {
        errors.verified_at = "Verified proficiency requires its review time.";
      }
      if (!asString(values.verified_by)) {
        errors.verified_by = "Verified proficiency requires a reviewer.";
      }
    }
  }
  if (workspace.key === "credentials") {
    const issued = asString(values.issued_at);
    const expires = asString(values.expires_at);
    if (issued && expires && new Date(issued) >= new Date(expires)) {
      errors.expires_at = "Credential expiry must follow the issue date.";
    }
  }
  if (workspace.key === "testimonials" && values.consent_status === "granted") {
    if (!asString(values.consented_at)) {
      errors.consented_at = "Granted consent requires its confirmation time.";
    }
    const scopes = asStringArray(values.consent_scopes);
    if (!scopes.includes("public_site")) {
      errors.consent_scopes =
        "Granted public consent must include the public-site scope.";
    }
  }
  if (
    workspace.key === "legal-documents" &&
    !/^\d{1,4}\.\d{1,4}(?:\.\d{1,4})?$/.test(asString(values.document_version))
  ) {
    errors.document_version = "Use a numeric version such as 1.0 or 2.1.0.";
  }

  return errors;
};

const assignOptional = (
  payload: Record<string, unknown>,
  key: string,
  value: string,
  mode: "create" | "edit",
  nullable = true
) => {
  if (value) payload[key] = value;
  else if (mode === "edit" && nullable) payload[key] = null;
};

export const buildRepeatablePayload = (
  workspace: RepeatableAdminWorkspace,
  values: RepeatableFormValues,
  mode: "create" | "edit",
  expectedVersion?: number
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    locale: "en",
    title: asString(values.title),
    secondary_pillars: asStringArray(values.secondary_pillars),
    sequence: Number(values.sequence),
    status: asString(values.status),
    is_featured: Boolean(values.is_featured),
    enabled: Boolean(values.enabled),
    claim_verification: asString(values.claim_verification),
    ...(mode === "edit" ? { expected_version: expectedVersion } : {}),
  };
  assignOptional(payload, "slug", asString(values.slug), mode, false);
  assignOptional(payload, "summary", asString(values.summary), mode);
  if (workspace.supportsPillars) {
    assignOptional(
      payload,
      "primary_pillar",
      asString(values.primary_pillar),
      mode
    );
  }

  for (const field of workspace.fields) {
    const value = values[field.name];
    if (field.type === "boolean") {
      payload[field.name] = Boolean(value);
    } else if (field.type === "list") {
      payload[field.name] = asString(value)
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, field.maxItems ?? 30);
    } else if (field.type === "multi-select") {
      payload[field.name] = asStringArray(value);
    } else if (field.type === "legal-sections") {
      payload[field.name] = (
        Array.isArray(value) ? (value as LegalSectionDraft[]) : []
      ).map(({ key, heading, body }) => ({
        key: key.trim(),
        heading: heading.trim(),
        body: body.trim(),
      }));
    } else if (field.type === "number") {
      const text = asString(value);
      if (text) payload[field.name] = Number(text);
      else if (mode === "edit") payload[field.name] = null;
    } else if (field.type === "datetime") {
      const text = asString(value);
      if (text) payload[field.name] = new Date(text).toISOString();
      else if (mode === "edit") payload[field.name] = null;
    } else {
      assignOptional(payload, field.name, asString(value), mode);
    }
  }

  return payload;
};
