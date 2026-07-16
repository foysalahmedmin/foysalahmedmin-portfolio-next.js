import { canonicalSlugSchema } from "@/lib/content/slug";
import {
  PILLAR_KEYS,
  normalizePillarRelationships,
  pillarKeySchema,
} from "@/lib/content/pillars";
import { SOFT_DELETE_SCOPES } from "@/lib/db/soft-delete";
import { z } from "zod";
import {
  CLAIM_VERIFICATION_STATES,
  REPEATABLE_CONTENT_STATUSES,
  type TRepeatableDefinition,
  type TRepeatableListQuery,
} from "./record.type";
import { ContentRecordError } from "./record.error";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, "Invalid ID format");
export const expectedVersionSchema = z.number().int().min(1).max(1_000_000_000);
export const localeSchema = z.literal("en");
export const safeUrlSchema = z
  .url()
  .max(2_048)
  .refine((value) => {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash
    );
  }, "Use a public HTTPS URL without credentials or fragments");

const safeText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const commonCreateFields = {
  slug: canonicalSlugSchema.optional(),
  locale: localeSchema.default("en"),
  title: safeText(160),
  summary: safeText(600).optional(),
  primary_pillar: pillarKeySchema.optional(),
  secondary_pillars: z.array(pillarKeySchema).max(4).default([]),
  sequence: z.number().int().min(0).max(1_000_000).default(0),
  status: z.enum(REPEATABLE_CONTENT_STATUSES).default("draft"),
  is_featured: z.boolean().default(false),
  enabled: z.boolean().default(true),
  claim_verification: z
    .enum(CLAIM_VERIFICATION_STATES)
    .default("not_applicable"),
};

export const commonUpdateFields = {
  expected_version: expectedVersionSchema,
  slug: canonicalSlugSchema.optional(),
  locale: localeSchema.optional(),
  title: safeText(160).optional(),
  summary: safeText(600).nullable().optional(),
  primary_pillar: pillarKeySchema.nullable().optional(),
  secondary_pillars: z.array(pillarKeySchema).max(4).optional(),
  sequence: z.number().int().min(0).max(1_000_000).optional(),
  status: z.enum(REPEATABLE_CONTENT_STATUSES).optional(),
  is_featured: z.boolean().optional(),
  enabled: z.boolean().optional(),
  claim_verification: z.enum(CLAIM_VERIFICATION_STATES).optional(),
};

export const recordOperationSchema = z
  .object({ expected_version: expectedVersionSchema })
  .strict();

export const reorderRecordsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: objectIdSchema,
            expected_version: expectedVersionSchema,
            sequence: z.number().int().min(0).max(1_000_000),
          })
          .strict()
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.items.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Reorder items must use unique record IDs",
      });
    }
  });

export const bulkRecordsSchema = z
  .object({
    operation: z.enum([
      "publish",
      "archive",
      "soft_delete",
      "restore",
      "feature",
      "unfeature",
    ]),
    items: z
      .array(
        z
          .object({
            id: objectIdSchema,
            expected_version: expectedVersionSchema,
          })
          .strict()
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.items.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Bulk items must use unique record IDs",
      });
    }
  });

export const normalizeCommonInput = (
  input: Record<string, unknown>
): Record<string, unknown> => {
  const primary =
    typeof input.primary_pillar === "string" &&
    PILLAR_KEYS.includes(input.primary_pillar as (typeof PILLAR_KEYS)[number])
      ? (input.primary_pillar as (typeof PILLAR_KEYS)[number])
      : undefined;
  const secondary = Array.isArray(input.secondary_pillars)
    ? (input.secondary_pillars as (typeof PILLAR_KEYS)[number][])
    : undefined;
  return {
    ...input,
    ...(secondary
      ? { secondary_pillars: normalizePillarRelationships(primary, secondary) }
      : {}),
  };
};

const parseInteger = (
  value: string | undefined,
  fallback: number,
  maximum: number
): number => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) {
    throw new ContentRecordError({
      status: 400,
      code: "INVALID_QUERY",
      message: "Pagination values must be positive integers.",
    });
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new ContentRecordError({
      status: 400,
      code: "INVALID_QUERY",
      message: "Pagination is outside the supported query budget.",
    });
  }
  return parsed;
};

const parseBoolean = (value: string): boolean => {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new ContentRecordError({
    status: 400,
    code: "INVALID_QUERY",
    message: "A boolean filter is invalid.",
  });
};

const normalizeSearch = (value: string): string => {
  const words = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9_]/g, ""))
    .filter(Boolean)
    .slice(0, 8);
  if (!words.length) {
    throw new ContentRecordError({
      status: 400,
      code: "INVALID_QUERY",
      message: "Search contains no supported terms.",
    });
  }
  return words.join(" ").slice(0, 80);
};

export const parseRecordListQuery = (
  input: URLSearchParams,
  definition: Pick<TRepeatableDefinition, "filter_rules" | "sort_fields">,
  mode: "public" | "admin"
): TRepeatableListQuery => {
  const visibleFilterRules = Object.fromEntries(
    Object.entries(definition.filter_rules).filter(
      ([, rule]) => mode === "admin" || rule.public !== false
    )
  );
  const allowedKeys = new Set([
    "page",
    "limit",
    "search",
    "sort",
    ...Object.keys(visibleFilterRules),
    ...(mode === "admin" ? ["deleted_scope"] : []),
  ]);
  for (const key of input.keys()) {
    if (!allowedKeys.has(key) || input.getAll(key).length !== 1) {
      throw new ContentRecordError({
        status: 400,
        code: "INVALID_QUERY",
        message: "The query contains an unsupported or repeated field.",
      });
    }
  }

  const page = parseInteger(input.get("page") ?? undefined, 1, 200);
  const limit = parseInteger(input.get("limit") ?? undefined, 20, 50);
  if ((page - 1) * limit > 10_000) {
    throw new ContentRecordError({
      status: 400,
      code: "QUERY_BUDGET_EXCEEDED",
      message: "This page is outside the supported query budget.",
    });
  }

  const rawSort = input.get("sort") ?? "sequence";
  const direction = rawSort.startsWith("-") ? -1 : 1;
  const sort = direction === -1 ? rawSort.slice(1) : rawSort;
  if (!definition.sort_fields.includes(sort)) {
    throw new ContentRecordError({
      status: 400,
      code: "INVALID_QUERY",
      message: "The requested sort is not supported.",
    });
  }

  const filters: Record<string, string | boolean> = {};
  for (const [key, rule] of Object.entries(visibleFilterRules)) {
    const raw = input.get(key);
    if (raw === null) continue;
    if (rule.kind === "boolean") {
      filters[key] = parseBoolean(raw);
    } else if (rule.kind === "object_id") {
      filters[key] = objectIdSchema.parse(raw);
    } else {
      if (!rule.values?.includes(raw)) {
        throw new ContentRecordError({
          status: 400,
          code: "INVALID_QUERY",
          message: "A query filter is invalid.",
        });
      }
      filters[key] = raw;
    }
  }

  const deletedScope = input.get("deleted_scope") ?? "active";
  if (!SOFT_DELETE_SCOPES.includes(deletedScope as never)) {
    throw new ContentRecordError({
      status: 400,
      code: "INVALID_QUERY",
      message: "The deletion scope is invalid.",
    });
  }

  const search = input.get("search");
  return {
    page,
    limit,
    sort,
    direction,
    filters,
    deleted_scope: mode === "admin" ? (deletedScope as never) : "active",
    ...(search ? { search: normalizeSearch(search) } : {}),
  };
};

export const assertObjectId = (value: string): string =>
  objectIdSchema.parse(value);

export const assertCanonicalSlug = (value: string): string =>
  canonicalSlugSchema.parse(value);
