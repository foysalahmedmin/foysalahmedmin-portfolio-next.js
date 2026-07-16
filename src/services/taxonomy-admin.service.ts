import {
  TAXONOMY_CONTRACT,
  type TAdminTaxonomyCategory,
  type TTaxonomyKind,
  type TTaxonomyPayload,
  type TTaxonomyStatus,
} from "@/lib/admin/taxonomy-admin";
import type { TResponse } from "@/types/response.type";
import { readApiResponse } from "./api-response";

export type TTaxonomyListQuery = Readonly<{
  page: number;
  limit: number;
  search?: string;
  sort: string;
  status?: TTaxonomyStatus;
  deletedScope: "active" | "only_deleted";
}>;

type RequestOptions = Readonly<{ signal?: AbortSignal }>;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value ? value : undefined;

const categoryEndpoint = (kind: TTaxonomyKind, suffix = "") =>
  `/api/${TAXONOMY_CONTRACT[kind].resource}${suffix}`;

const readParent = (value: unknown) => {
  if (typeof value === "string") return { id: value };
  const record = asRecord(value);
  return {
    id: asOptionalString(record.id) ?? asOptionalString(record._id),
    name: asOptionalString(record.name),
  };
};

const normalizeCategory = (
  value: unknown,
  deletedScope: TTaxonomyListQuery["deletedScope"] = "active"
): TAdminTaxonomyCategory => {
  const record = asRecord(value);
  const id = asOptionalString(record.id) ?? asOptionalString(record._id);
  const name = asOptionalString(record.name);
  const slug = asOptionalString(record.slug);
  const sequence = Number(record.sequence);
  const status = record.status;
  if (
    !id ||
    !name ||
    !slug ||
    !Number.isFinite(sequence) ||
    (status !== "active" && status !== "inactive")
  ) {
    throw new Error("The taxonomy API returned an invalid category record.");
  }
  const parent = readParent(record.parent);

  return {
    id,
    name,
    slug,
    sequence,
    description: asOptionalString(record.description) ?? "",
    status,
    tags: Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    parentId: parent.id ?? null,
    ...(parent.name ? { parentName: parent.name } : {}),
    isDeleted: deletedScope === "only_deleted" || record.is_deleted === true,
    createdAt: asOptionalString(record.created_at),
    updatedAt: asOptionalString(record.updated_at),
  };
};

const appendListQuery = (kind: TTaxonomyKind, query: TTaxonomyListQuery) => {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort,
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.deletedScope === "only_deleted") {
    params.set("deleted_scope", "only_deleted");
  }
  return `${categoryEndpoint(kind, "/admin")}?${params.toString()}`;
};

export const getAdminTaxonomyCategories = async (
  kind: TTaxonomyKind,
  query: TTaxonomyListQuery,
  options: RequestOptions = {}
): Promise<TResponse<TAdminTaxonomyCategory[]>> => {
  const response = await fetch(appendListQuery(kind, query), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });
  const result = await readApiResponse<unknown[]>(response);
  if (!Array.isArray(result.data)) {
    throw new Error("The taxonomy API returned an invalid list response.");
  }
  return {
    ...result,
    data: result.data.map((category) =>
      normalizeCategory(category, query.deletedScope)
    ),
  };
};

const requestMutation = async <T>(
  endpoint: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<TResponse<T>> => {
  const response = await fetch(endpoint, {
    method,
    cache: "no-store",
    credentials: "include",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return await readApiResponse<T>(response);
};

export const createAdminTaxonomyCategory = async (
  kind: TTaxonomyKind,
  payload: TTaxonomyPayload
) => await requestMutation(categoryEndpoint(kind, "/admin"), "POST", payload);

export const updateAdminTaxonomyCategory = async (
  kind: TTaxonomyKind,
  id: string,
  payload: TTaxonomyPayload
) =>
  await requestMutation(
    categoryEndpoint(kind, `/${id}/admin`),
    "PATCH",
    payload
  );

export const softDeleteAdminTaxonomyCategory = async (
  kind: TTaxonomyKind,
  id: string
) =>
  await requestMutation<null>(categoryEndpoint(kind, `/${id}/admin`), "DELETE");

export const restoreAdminTaxonomyCategory = async (
  kind: TTaxonomyKind,
  id: string
) =>
  await requestMutation(categoryEndpoint(kind, `/${id}/admin/restore`), "POST");

export const permanentlyDeleteAdminTaxonomyCategory = async (
  kind: TTaxonomyKind,
  id: string
) =>
  await requestMutation<null>(
    categoryEndpoint(kind, `/${id}/admin/permanent`),
    "DELETE"
  );

export const getAdminTaxonomyParentCandidates = async (
  kind: TTaxonomyKind,
  options: RequestOptions = {}
): Promise<TAdminTaxonomyCategory[]> => {
  const candidates: TAdminTaxonomyCategory[] = [];
  const seen = new Set<string>();
  const limit = 100;

  for (let page = 1; page <= 100; page += 1) {
    const response = await getAdminTaxonomyCategories(
      kind,
      {
        page,
        limit,
        sort: "sequence",
        deletedScope: "active",
      },
      options
    );
    for (const category of response.data) {
      if (!seen.has(category.id)) {
        candidates.push(category);
        seen.add(category.id);
      }
    }
    const total = response.meta?.total ?? candidates.length;
    if (candidates.length >= total || response.data.length < limit) {
      return candidates;
    }
  }

  throw new Error(
    "Parent selection was disabled because the category graph exceeded its safe loading bound."
  );
};
