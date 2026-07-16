import type { TRole } from "@/types/jsonwebtoken.type";
import type { TMeta, TResponse } from "@/types/response.type";
import { readApiResponse } from "./api-response";

export type AdminUserStatus = "in-progress" | "blocked";

export type AdminUser = Readonly<{
  id: string;
  name: string;
  email: string;
  role: TRole;
  status: AdminUserStatus;
  is_verified: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}>;

export type AdminUserQuery = Readonly<{
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  role?: TRole;
  status?: AdminUserStatus;
  isVerified?: boolean;
  deletedScope?: "with_deleted" | "only_deleted";
}>;

export type AdminUserUpdate = Readonly<{
  role?: TRole;
  status?: AdminUserStatus;
  is_verified?: boolean;
}>;

type RequestOptions = Readonly<{ signal?: AbortSignal }>;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The user response was invalid.");
  }
  return value as Record<string, unknown>;
};

const requiredString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("The user response was invalid.");
  }
  return value;
};

const optionalDate = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

export const toAdminUser = (value: unknown): AdminUser => {
  const record = asRecord(value);
  const idValue = record.id ?? record._id;
  const role = requiredString(record, "role") as TRole;
  const status = requiredString(record, "status") as AdminUserStatus;
  if (
    typeof idValue !== "string" ||
    !/^[0-9a-f]{24}$/i.test(idValue) ||
    ![
      "super-admin",
      "admin",
      "editor",
      "author",
      "contributor",
      "subscriber",
      "user",
    ].includes(role) ||
    !["in-progress", "blocked"].includes(status)
  ) {
    throw new Error("The user response was invalid.");
  }

  return {
    id: idValue,
    name: requiredString(record, "name"),
    email: requiredString(record, "email"),
    role,
    status,
    is_verified: record.is_verified === true,
    is_deleted: record.is_deleted === true,
    deleted_at: optionalDate(record.deleted_at),
    created_at: optionalDate(record.created_at),
    updated_at: optionalDate(record.updated_at),
  };
};

const mapUserResponse = (
  response: TResponse<unknown>,
  fallbackStatus = 200
): TResponse<AdminUser> => ({
  status: response.status ?? fallbackStatus,
  success: response.success,
  message: response.message,
  data: toAdminUser(response.data),
});

const buildQuery = (query: AdminUserQuery) => {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort || "name",
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  if (query.isVerified !== undefined) {
    params.set("is_verified", String(query.isVerified));
  }
  if (query.deletedScope) params.set("deleted_scope", query.deletedScope);
  return params.toString();
};

export const getAdminUsers = async (
  query: AdminUserQuery,
  options: RequestOptions = {}
): Promise<TResponse<AdminUser[]>> => {
  const response = await fetch(`/api/users/admin?${buildQuery(query)}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });
  const result = await readApiResponse<unknown[]>(response);
  return {
    ...result,
    data: result.data.map(toAdminUser),
    meta: result.meta as TMeta | undefined,
  };
};

const mutate = async (
  id: string,
  method: "PATCH" | "POST" | "DELETE",
  suffix = "",
  body?: AdminUserUpdate
) => {
  const response = await fetch(
    `/api/users/${encodeURIComponent(id)}/admin${suffix}`,
    {
      method,
      cache: "no-store",
      credentials: "include",
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    }
  );
  return await readApiResponse<unknown>(response);
};

export const updateAdminUser = async (id: string, input: AdminUserUpdate) =>
  mapUserResponse(await mutate(id, "PATCH", "", input));

export const softDeleteAdminUser = async (id: string) =>
  await mutate(id, "DELETE");

export const restoreAdminUser = async (id: string) =>
  mapUserResponse(await mutate(id, "POST", "/restore"));

export const permanentlyDeleteAdminUser = async (id: string) =>
  await mutate(id, "DELETE", "/permanent");
