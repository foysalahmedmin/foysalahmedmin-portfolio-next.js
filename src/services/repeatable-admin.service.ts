import type {
  TClaimVerificationState,
  TRepeatableBulkOperation,
  TRepeatableContentStatus,
} from "@/app/api/repeatable-content/record.type";
import type { PillarKey } from "@/lib/content/pillars";
import type { TResponse } from "@/types/response.type";
import { readApiResponse } from "./api-response";

export type AdminRepeatableRecord = Record<string, unknown> & {
  id: string;
  slug: string;
  locale: "en";
  title: string;
  summary?: string;
  primary_pillar?: PillarKey;
  secondary_pillars: PillarKey[];
  sequence: number;
  status: TRepeatableContentStatus;
  enabled: boolean;
  is_featured: boolean;
  claim_verification: TClaimVerificationState;
  version: number;
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
};

export type AdminRepeatableListQuery = Readonly<{
  page: number;
  limit: number;
  search?: string;
  sort: string;
  filters?: Readonly<Record<string, string>>;
}>;

export type AdminRepeatableBulkResult = Readonly<{
  operation: TRepeatableBulkOperation;
  succeeded: ReadonlyArray<{ id: string; version?: number }>;
  failed: ReadonlyArray<{ id: string; code: string }>;
}>;

export type AdminRepeatableReferenceOption = Readonly<{
  id: string;
  title: string;
  status: TRepeatableContentStatus;
  is_deleted: boolean;
  attributes: Readonly<Record<string, string>>;
}>;

type RequestOptions = Readonly<{ signal?: AbortSignal }>;

const appendQuery = (
  endpoint: string,
  query: AdminRepeatableListQuery
): string => {
  const [pathname, existingQuery = ""] = endpoint.split("?", 2);
  const params = new URLSearchParams(existingQuery);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  params.set("sort", query.sort);
  if (query.search?.trim()) params.set("search", query.search.trim());
  else params.delete("search");
  Object.entries(query.filters ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  return `${pathname}?${params.toString()}`;
};

const jsonRequest = async <T>(
  endpoint: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown
): Promise<TResponse<T>> => {
  const response = await fetch(endpoint, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await readApiResponse<T>(response);
};

export const getAdminRepeatableRecords = async (
  apiPath: string,
  query: AdminRepeatableListQuery,
  options: RequestOptions = {}
): Promise<TResponse<AdminRepeatableRecord[]>> => {
  const response = await fetch(appendQuery(`/api/${apiPath}/admin`, query), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });
  return await readApiResponse<AdminRepeatableRecord[]>(response);
};

export const getAdminRepeatableRecord = async (
  apiPath: string,
  id: string,
  options: RequestOptions = {}
): Promise<TResponse<AdminRepeatableRecord>> => {
  const response = await fetch(`/api/${apiPath}/${id}/admin`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });
  return await readApiResponse<AdminRepeatableRecord>(response);
};

export const createAdminRepeatableRecord = async (
  apiPath: string,
  payload: Readonly<Record<string, unknown>>
) =>
  await jsonRequest<AdminRepeatableRecord>(
    `/api/${apiPath}/admin`,
    "POST",
    payload
  );

export const updateAdminRepeatableRecord = async (
  apiPath: string,
  id: string,
  payload: Readonly<Record<string, unknown>>
) =>
  await jsonRequest<AdminRepeatableRecord>(
    `/api/${apiPath}/${id}/admin`,
    "PATCH",
    payload
  );

export const softDeleteAdminRepeatableRecord = async (
  apiPath: string,
  id: string,
  expectedVersion: number
) =>
  await jsonRequest<{ id: string; version: number }>(
    `/api/${apiPath}/${id}/admin`,
    "DELETE",
    { expected_version: expectedVersion }
  );

export const restoreAdminRepeatableRecord = async (
  apiPath: string,
  id: string,
  expectedVersion: number
) =>
  await jsonRequest<AdminRepeatableRecord>(
    `/api/${apiPath}/${id}/admin/restore`,
    "PATCH",
    { expected_version: expectedVersion }
  );

export const permanentlyDeleteAdminRepeatableRecord = async (
  apiPath: string,
  id: string,
  expectedVersion: number
) =>
  await jsonRequest<{ id: string }>(
    `/api/${apiPath}/${id}/admin/permanent`,
    "DELETE",
    { expected_version: expectedVersion }
  );

export const bulkMutateAdminRepeatableRecords = async (
  apiPath: string,
  operation: TRepeatableBulkOperation,
  records: readonly Pick<AdminRepeatableRecord, "id" | "version">[]
) =>
  await jsonRequest<AdminRepeatableBulkResult>(
    `/api/${apiPath}/admin/bulk`,
    "PATCH",
    {
      operation,
      items: records.map(({ id, version }) => ({
        id,
        expected_version: version,
      })),
    }
  );

export const getAdminRepeatableReferenceOptions = async (
  endpoint: string,
  options: RequestOptions = {}
): Promise<AdminRepeatableReferenceOption[]> => {
  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });
  const result = await readApiResponse<AdminRepeatableRecord[]>(response);
  return result.data.map((record) => ({
    id: record.id,
    title: record.title,
    status: record.status,
    is_deleted: record.is_deleted,
    attributes: Object.fromEntries(
      ["primary_pillar", "type", "document_version"].flatMap((key) =>
        typeof record[key] === "string" ? [[key, record[key]]] : []
      )
    ),
  }));
};
