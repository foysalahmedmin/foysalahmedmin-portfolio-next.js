import { ENV } from "@/config";
import type { TUserResponse, TUsersResponse } from "@/types/user.type";

// Helper to handle fetch responses
async function handleResponse(res: Response) {
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Fetch request failed");
  }
  return res.json() as Promise<any>;
}

// GET Self
export async function fetchSelf(): Promise<TUserResponse> {
  const res = await fetch(`${ENV.url}/api/user/self`, {
    credentials: "include",
  });
  return handleResponse(res);
}

// GET All Users (Admin)
export async function fetchUsers(
  query?: Record<string, any>
): Promise<TUsersResponse> {
  const url = new URL(`${ENV.url}/api/user`);
  if (query)
    Object.entries(query).forEach(([k, v]) =>
      url.searchParams.append(k, String(v))
    );
  const res = await fetch(url.toString(), { credentials: "include" });
  return handleResponse(res);
}

// GET Single User by ID (Admin)
export async function fetchUser(id: string): Promise<TUserResponse> {
  const res = await fetch(`${ENV.url}/api/user/${id}`, {
    credentials: "include",
  });
  return handleResponse(res);
}

// PATCH Self
export async function updateSelf(
  payload: Partial<{
    image?: string | null;
    name: string;
    email: string;
  }>
): Promise<TUserResponse> {
  const res = await fetch(`${ENV.url}/api/users/self`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// PATCH Bulk Users (Admin)
export async function updateUsers(payload: {
  ids: string[];
  status?: "in-progress" | "blocked";
  role?: "editor" | "author" | "contributor" | "subscriber" | "user";
  is_verified?: boolean;
}): Promise<TUsersResponse> {
  const res = await fetch(`${ENV.url}/api/user/bulk`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// PATCH Single User (Admin)
export async function updateUser(
  id: string,
  payload: {
    image?: string | null;
    name?: string;
    email?: string;
    status?: "in-progress" | "blocked";
    role?: "editor" | "author" | "contributor" | "subscriber" | "user";
    is_verified?: boolean;
  }
): Promise<TUserResponse> {
  const res = await fetch(`${ENV.url}/api/users/${id}/admin`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// DELETE Bulk Permanent (Admin)
export async function deleteUsersPermanent(payload: {
  ids: string[];
}): Promise<TUsersResponse> {
  const res = await fetch(`${ENV.url}/api/user/bulk/permanent`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// DELETE Bulk Soft Delete (Admin)
export async function deleteUsers(payload: {
  ids: string[];
}): Promise<TUsersResponse> {
  const res = await fetch(`${ENV.url}/api/user/bulk`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// DELETE Single Permanent (Admin)
export async function deleteUserPermanent(id: string): Promise<TUserResponse> {
  const res = await fetch(`${ENV.url}/api/user/${id}/permanent`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse(res);
}

// DELETE Single Soft Delete (Admin)
export async function deleteUser(id: string): Promise<TUserResponse> {
  const res = await fetch(`${ENV.url}/api/user/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handleResponse(res);
}

// POST Bulk Restore (Admin)
export async function restoreUsers(payload: {
  ids: string[];
}): Promise<TUsersResponse> {
  const res = await fetch(`${ENV.url}/api/user/bulk/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// POST Single Restore (Admin)
export async function restoreUser(id: string): Promise<TUserResponse> {
  const res = await fetch(`${ENV.url}/api/user/${id}/restore`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(res);
}
