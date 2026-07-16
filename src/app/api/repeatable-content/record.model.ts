import { CONTENT_SLUG_PATTERN } from "@/lib/content/slug";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { applySoftDeletePlugin } from "@/lib/db/soft-delete";
import { Schema, type IndexDefinition, type IndexOptions } from "mongoose";
import {
  CLAIM_VERIFICATION_STATES,
  REPEATABLE_CONTENT_STATUSES,
} from "./record.type";

export const commonRecordFields = {
  contract_version: {
    type: Number,
    enum: [1] as const,
    default: 1 as const,
    required: true,
    immutable: true,
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 96,
    match: CONTENT_SLUG_PATTERN,
  },
  locale: {
    type: String,
    enum: ["en"] as const,
    default: "en" as const,
    required: true,
    immutable: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  summary: { type: String, trim: true, maxlength: 600 },
  primary_pillar: { type: String, enum: PILLAR_KEYS },
  secondary_pillars: { type: [String], enum: PILLAR_KEYS, default: () => [] },
  sequence: { type: Number, min: 0, max: 1_000_000, default: 0 },
  status: {
    type: String,
    enum: REPEATABLE_CONTENT_STATUSES,
    default: "draft" as const,
    required: true,
  },
  published_at: { type: Date, default: null },
  // This field is not accepted by the public/admin schemas. The service is the
  // only writer and uses it to lock the canonical slug after first publish.
  first_published_at: { type: Date, default: null },
  is_featured: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  claim_verification: {
    type: String,
    enum: CLAIM_VERIFICATION_STATES,
    default: "not_applicable" as const,
    required: true,
  },
  version: { type: Number, min: 1, max: 1_000_000_000, default: 1 },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    immutable: true,
  },
  updated_by: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  search_text: {
    type: String,
    required: true,
    select: false,
    maxlength: 1_024,
  },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
};

const normalizeSearchText = (value: unknown): string =>
  typeof value === "string"
    ? value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1_024)
    : "";

const readSearchValues = (
  value: unknown,
  segments: readonly string[]
): unknown[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => readSearchValues(item, segments));
  }
  if (!segments.length) return [value];
  if (!value || typeof value !== "object") return [];
  const [head, ...tail] = segments;
  return readSearchValues(
    (value as Readonly<Record<string, unknown>>)[head!],
    tail
  );
};

export const buildRepeatableSearchText = (
  record: Readonly<Record<string, unknown>>,
  fields: readonly string[]
): string =>
  normalizeSearchText(
    fields
      .flatMap((field) => readSearchValues(record, field.split(".")))
      .filter(
        (value): value is string | number =>
          typeof value === "string" || typeof value === "number"
      )
      .join(" ")
  );

export const configureRepeatableRecordSchema = (
  schema: Schema,
  input: {
    index_prefix: string;
    search_fields: readonly string[];
    additional_indexes?: ReadonlyArray<
      readonly [IndexDefinition, IndexOptions]
    >;
  }
): void => {
  schema.set("timestamps", {
    createdAt: "created_at",
    updatedAt: "updated_at",
  });
  schema.set("versionKey", false);
  schema.set("strict", "throw");

  schema.pre("validate", function normalizeRecord() {
    const record = this as unknown as Record<string, unknown>;
    const primary = record.primary_pillar;
    if (Array.isArray(record.secondary_pillars)) {
      record.secondary_pillars = [
        ...new Set(
          record.secondary_pillars.filter((pillar) => pillar !== primary)
        ),
      ];
    }
    record.search_text = buildRepeatableSearchText(record, input.search_fields);
    if (
      record.status === "published" &&
      record.claim_verification === "unverified"
    ) {
      throw new Error("Unverified claims cannot be published");
    }
  });

  const prefix = input.index_prefix;
  schema.index(
    { locale: 1, slug: 1 },
    {
      unique: true,
      partialFilterExpression: { is_deleted: false },
      name: `${prefix}_active_locale_slug_unique`,
    }
  );
  schema.index(
    { locale: 1, status: 1, enabled: 1, sequence: 1, _id: 1 },
    {
      partialFilterExpression: { is_deleted: false },
      name: `${prefix}_public_sequence`,
    }
  );
  schema.index(
    { locale: 1, status: 1, primary_pillar: 1, sequence: 1, _id: 1 },
    {
      partialFilterExpression: { is_deleted: false },
      name: `${prefix}_public_pillar_sequence`,
    }
  );
  schema.index(
    { is_deleted: 1, updated_at: -1, _id: 1 },
    { name: `${prefix}_admin_updated` }
  );
  schema.index(
    { search_text: "text" },
    {
      name: `${prefix}_search_text`,
      weights: { search_text: 1 },
      default_language: "none",
    }
  );
  for (const [keys, options] of input.additional_indexes ?? []) {
    schema.index(keys, options);
  }
  applySoftDeletePlugin(schema);
};
