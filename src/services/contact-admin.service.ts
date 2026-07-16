import type {
  TContactDeliveryStatus,
  TContactStatus,
} from "@/app/api/contacts/contact.type";
import type { TResponse } from "@/types/response.type";
import { readApiResponse } from "./api-response";

export type ContactInboxRetentionView = {
  expires_at: string | null;
  anonymized_at: string | null;
  purge_after: string | null;
  hold:
    | { active: false }
    | {
        active: true;
        reason_code: string;
        expires_at: string;
        placed_at: string | null;
      };
};

export type ContactInboxOperationsView = {
  idempotency: { active: boolean; expires_at?: string };
  delivery: null | {
    event_id: string;
    status:
      | "pending"
      | "processing"
      | "delivered"
      | "dead_letter"
      | "cancelled";
    attempts: number;
    next_attempt_at: string;
    last_error_code: string | null;
    delivered_at: string | null;
    dead_lettered_at: string | null;
    retryable: boolean;
  };
};

export type ContactInboxListItem = {
  id: string;
  name: string;
  subject: string;
  email_masked: string;
  status: TContactStatus;
  delivery_status: TContactDeliveryStatus;
  revision: number;
  status_changed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted: boolean;
  deleted_at: string | null;
  retention: ContactInboxRetentionView;
  operations: ContactInboxOperationsView;
};

export type ContactInboxDetail = Omit<ContactInboxListItem, "email_masked"> & {
  email: string;
  message: string;
  allowed_statuses: TContactStatus[];
};

export type ContactInboxQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: TContactStatus;
  delivery_status?: TContactDeliveryStatus;
  retention?: "all" | "due" | "held" | "anonymized";
  sort?:
    | "created_at"
    | "-created_at"
    | "updated_at"
    | "-updated_at"
    | "status"
    | "-status";
};

export type ContactInboxPageResponse = Omit<
  TResponse<ContactInboxListItem[]>,
  "meta"
> & {
  meta?: {
    total: number;
    page: number;
    limit: number;
    total_pages?: number;
  };
};

const buildContactInboxSearchParams = (query: ContactInboxQuery) => {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort ?? "-created_at",
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status) params.set("status", query.status);
  if (query.delivery_status) {
    params.set("delivery_status", query.delivery_status);
  }
  if (query.retention && query.retention !== "all") {
    params.set("retention", query.retention);
  }
  return params;
};

const toContactInboxListItem = (
  item: ContactInboxListItem
): ContactInboxListItem => ({
  id: item.id,
  name: item.name,
  subject: item.subject,
  email_masked: item.email_masked,
  status: item.status,
  delivery_status: item.delivery_status,
  revision: item.revision,
  status_changed_at: item.status_changed_at,
  created_at: item.created_at,
  updated_at: item.updated_at,
  deleted: item.deleted,
  deleted_at: item.deleted_at,
  retention: {
    expires_at: item.retention.expires_at,
    anonymized_at: item.retention.anonymized_at,
    purge_after: item.retention.purge_after,
    hold: item.retention.hold.active
      ? {
          active: true,
          reason_code: item.retention.hold.reason_code,
          expires_at: item.retention.hold.expires_at,
          placed_at: item.retention.hold.placed_at,
        }
      : { active: false },
  },
  operations: {
    idempotency: item.operations.idempotency.active
      ? {
          active: true,
          ...(item.operations.idempotency.expires_at
            ? { expires_at: item.operations.idempotency.expires_at }
            : {}),
        }
      : { active: false },
    delivery: item.operations.delivery
      ? {
          event_id: item.operations.delivery.event_id,
          status: item.operations.delivery.status,
          attempts: item.operations.delivery.attempts,
          next_attempt_at: item.operations.delivery.next_attempt_at,
          last_error_code: item.operations.delivery.last_error_code,
          delivered_at: item.operations.delivery.delivered_at,
          dead_lettered_at: item.operations.delivery.dead_lettered_at,
          retryable: item.operations.delivery.retryable,
        }
      : null,
  },
});

export const getAdminContacts = async (
  query: ContactInboxQuery,
  options: { signal?: AbortSignal } = {}
): Promise<ContactInboxPageResponse> => {
  const params = buildContactInboxSearchParams(query);
  const response = await fetch(`/api/contacts/admin?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    signal: options.signal,
  });
  const result = (await readApiResponse<ContactInboxListItem[]>(
    response
  )) as ContactInboxPageResponse;
  return { ...result, data: result.data.map(toContactInboxListItem) };
};

export const getAdminContactDetail = async (
  id: string,
  options: { signal?: AbortSignal } = {}
) => {
  const response = await fetch(
    `/api/contacts/${encodeURIComponent(id)}/admin`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: options.signal,
    }
  );
  return readApiResponse<ContactInboxDetail>(response);
};

export const updateAdminContactStatus = async (
  id: string,
  input: { status: TContactStatus; expected_revision: number },
  options: { signal?: AbortSignal } = {}
) => {
  const response = await fetch(
    `/api/contacts/${encodeURIComponent(id)}/admin`,
    {
      method: "PATCH",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: options.signal,
    }
  );
  return readApiResponse<ContactInboxDetail>(response);
};
