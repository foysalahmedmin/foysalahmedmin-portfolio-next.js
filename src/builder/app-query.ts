import AppError from "@/builder/app-error";
import {
  parseSoftDeleteScope,
  setSoftDeleteScope,
  SOFT_DELETE_SCOPES,
  type SoftDeleteScope,
} from "@/lib/db/soft-delete";
import httpStatus from "http-status";
import type { Document, FilterQuery, Model, Query } from "mongoose";
import { z } from "zod";

type QueryScalar = string | number | boolean;

interface QueryParams {
  search?: string;
  sort?: string;
  page?: string | number;
  limit?: string | number;
  fields?: string;
  is_count_only?: string | boolean;
  [key: string]: QueryScalar | undefined;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_PAGE = 1_000_000;
const MAX_LIMIT = 100;
const MAX_QUERY_KEY_LENGTH = 100;
const MAX_QUERY_VALUE_LENGTH = 500;
const MAX_SORT_OR_FIELD_ENTRIES = 20;
const SAFE_FIELD_PATTERN = /^-?[A-Za-z_][A-Za-z0-9_.]*$/;
const BLOCKED_QUERY_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const parseQueryBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
};

export const normalizePositiveInteger = (
  value: unknown,
  fallback: number,
  maximum: number
): number => {
  const parsed =
    typeof value === "string" || typeof value === "number"
      ? Number(value)
      : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
};

const isSafeQueryKey = (key: string) =>
  key.length > 0 &&
  key.length <= MAX_QUERY_KEY_LENGTH &&
  !BLOCKED_QUERY_KEYS.has(key) &&
  !key.includes("$") &&
  !key.includes("[") &&
  !key.includes("]") &&
  !key.includes("\0");

const queryParamsSchema = z
  .record(
    z
      .string()
      .min(1)
      .max(MAX_QUERY_KEY_LENGTH)
      .refine(isSafeQueryKey),
    z.union([
      z.string().max(MAX_QUERY_VALUE_LENGTH),
      z.boolean(),
      z.number().finite(),
    ])
  )
  .superRefine((params, context) => {
    for (const key of ["page", "limit"] as const) {
      const value = params[key];
      if (
        value !== undefined &&
        !(
          (typeof value === "number" &&
            Number.isSafeInteger(value) &&
            value > 0) ||
          (typeof value === "string" &&
            /^\d+$/.test(value) &&
            Number.isSafeInteger(Number(value)) &&
            Number(value) > 0)
        )
      ) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} must be a positive integer`,
        });
      }
    }

    const countOnly = params.is_count_only;
    if (
      countOnly !== undefined &&
      typeof countOnly !== "boolean" &&
      (typeof countOnly !== "string" ||
        !["true", "false", "1", "0"].includes(countOnly.toLowerCase()))
    ) {
      context.addIssue({
        code: "custom",
        path: ["is_count_only"],
        message: "is_count_only must be a boolean",
      });
    }

    const deletedScope = params.deleted_scope;
    if (
      deletedScope !== undefined &&
      (typeof deletedScope !== "string" ||
        !SOFT_DELETE_SCOPES.includes(deletedScope as SoftDeleteScope))
    ) {
      context.addIssue({
        code: "custom",
        path: ["deleted_scope"],
        message: "deleted_scope is invalid",
      });
    }

    for (const key of ["sort", "fields"] as const) {
      const value = params[key];
      if (value === undefined) continue;

      const entries =
        typeof value === "string"
          ? value
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean)
          : [];
      if (
        typeof value !== "string" ||
        entries.length > MAX_SORT_OR_FIELD_ENTRIES ||
        entries.some((entry) => !SAFE_FIELD_PATTERN.test(entry))
      ) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} contains an invalid field`,
        });
      }
    }
  });

export const sanitizeQueryParams = (
  queryParams: Record<string, unknown>
): QueryParams => {
  const parsed = queryParamsSchema.safeParse(queryParams);
  if (!parsed.success) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid query parameters");
  }

  return parsed.data;
};

const getSafeFieldList = (value: unknown): string[] => {
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((field) => field.trim())
    .filter((field) => SAFE_FIELD_PATTERN.test(field))
    .slice(0, MAX_SORT_OR_FIELD_ENTRIES);
};

// Internal type to extend the result type with Document properties
type DocumentType<T> = T & Document;

export const combineQueryFilters = (
  current: Record<string, unknown>,
  next: Record<string, unknown>
): Record<string, unknown> => {
  if (Object.keys(current).length === 0) return { ...next };
  if (Object.keys(next).length === 0) return { ...current };
  return { $and: [current, next] };
};

class AppQuery<T = any> {
  public query: Query<DocumentType<T>[], DocumentType<T>>;
  public query_params: QueryParams;
  public query_filter: FilterQuery<DocumentType<T>>;
  private page = 1;
  private limit = 0;
  private readonly softDeleteScope: SoftDeleteScope;

  constructor(
    query: Query<DocumentType<T>[], DocumentType<T>>,
    query_params: Record<string, unknown>
  ) {
    this.query = query;
    this.query_params = sanitizeQueryParams(query_params);
    this.softDeleteScope = parseSoftDeleteScope(
      (query.getOptions() as Record<string, unknown>).softDeleteScope
    );
    this.query_filter = { ...query.getFilter() } as FilterQuery<
      DocumentType<T>
    >;
  }

  private addFilter(filter: FilterQuery<DocumentType<T>>): void {
    this.query_filter = combineQueryFilters(
      this.query_filter as Record<string, unknown>,
      filter as Record<string, unknown>
    ) as FilterQuery<DocumentType<T>>;
    this.query.setQuery(this.query_filter);
  }

  search(applicableFields: (keyof T)[]): this {
    const searchValue = this.query_params.search;
    if (typeof searchValue === "string" && searchValue.trim()) {
      const escapedSearch = searchValue
        .trim()
        .slice(0, 100)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchConditions: FilterQuery<DocumentType<T>> = {
        $or: applicableFields.map((field) => ({
          [field]: { $regex: escapedSearch, $options: "i" },
        })) as FilterQuery<DocumentType<T>>[],
      };
      this.addFilter(searchConditions);
    }
    return this;
  }

  filter(applicableFields?: Array<keyof T | string>): this {
    const queryObj = { ...this.query_params };
    const excludedFields = [
      "search",
      "sort",
      "limit",
      "page",
      "fields",
      "is_count_only",
      "deleted_scope",
    ];
    excludedFields.forEach((field) => delete queryObj[field]);

    // Normal filter
    if (applicableFields?.length) {
      Object.keys(queryObj).forEach((key) => {
        if (!applicableFields.includes(key)) {
          delete queryObj[key];
        }
      });
    }

    const mongoFilter: Record<string, any> = {};

    for (const [key, value] of Object.entries(queryObj)) {
      if (key.includes(".") && !applicableFields?.includes(key)) {
        continue;
      }
      mongoFilter[key] = value;
    }

    // Apply to query
    this.addFilter(mongoFilter);

    return this;
  }

  sort(applicableFields?: (keyof T)[]): this {
    let fields = getSafeFieldList(this.query_params.sort);

    if (applicableFields?.length) {
      fields = fields.filter((field) => {
        const fieldName = field.startsWith("-") ? field.slice(1) : field;
        return applicableFields.includes(fieldName as keyof T);
      });
    }

    const sortOrder = fields.length > 0 ? fields.join(" ") : "-created_at";
    this.query = this.query.sort(sortOrder);
    return this;
  }

  paginate(): this {
    const { page, limit } = this.query_params;
    this.page = normalizePositiveInteger(page, DEFAULT_PAGE, MAX_PAGE);
    this.limit = normalizePositiveInteger(limit, DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (this.page - 1) * this.limit;
    this.query = this.query.skip(skip).limit(this.limit);

    return this;
  }

  fields(applicableFields?: (keyof T)[]): this {
    let selectedFields = getSafeFieldList(this.query_params.fields);

    if (applicableFields?.length) {
      selectedFields = selectedFields.filter((field) => {
        const fieldName = field.startsWith("-") ? field.slice(1) : field;
        return applicableFields.includes(fieldName as keyof T);
      });
    }

    const fieldSelection =
      selectedFields.length > 0
        ? selectedFields.join(" ")
        : (applicableFields?.join(" ") ?? "-__v");

    this.query = this.query.select(fieldSelection);
    return this;
  }

  tap(
    callback: (
      query: Query<DocumentType<T>[], DocumentType<T>>
    ) => Query<any, DocumentType<T>>
  ): this {
    this.query = callback(this.query) as Query<
      DocumentType<T>[],
      DocumentType<T>
    >;
    return this;
  }

  async execute(
    statisticsQueries?: { key: string; filter: Record<string, any> }[]
  ): Promise<{
    data: T[];
    meta: {
      total: number;
      page: number;
      limit: number;
      statistics?: Record<string, number>;
    };
  }> {
    const model = this.query.model as Model<DocumentType<T>>;
    const totalQuery = setSoftDeleteScope(
      model.countDocuments(this.query_filter),
      this.softDeleteScope
    );

    const [total, stats] = await Promise.all([
      totalQuery,
      statisticsQueries
        ? Promise.all(
            statisticsQueries.map(async (stat) => {
              const count = await setSoftDeleteScope(
                model.countDocuments(
                  combineQueryFilters(
                    this.query_filter as Record<string, unknown>,
                    stat.filter
                  )
                ),
                this.softDeleteScope
              );
              return { key: stat.key, count };
            })
          )
        : Promise.resolve([]),
    ]);

    const statistics =
      stats?.reduce(
        (acc, curr) => {
          acc[curr.key] = curr.count;
          return acc;
        },
        {} as Record<string, number>
      ) || undefined;

    if (parseQueryBoolean(this.query_params.is_count_only)) {
      return {
        data: [],
        meta: {
          total,
          page: this.page,
          limit: this.limit,
          statistics,
        },
      };
    }

    if (this.softDeleteScope !== "active") {
      this.query = this.query.select("+is_deleted +deleted_at");
    }

    const data = (await this.query) as unknown as T[];

    return {
      data,
      meta: { total, page: this.page, limit: this.limit, statistics },
    };
  }
}

export default AppQuery;
