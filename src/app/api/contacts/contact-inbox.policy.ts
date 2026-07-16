import type { AuthUser } from "@/middleware/auth.middleware";
import type { Types } from "mongoose";
import type {
  TContactDeliveryStatus,
  TContactRetentionHold,
  TContactStatus,
} from "./contact.type";

export const CONTACT_STATUS_TRANSITIONS = {
  new: ["read", "qualified", "spam", "archived"],
  read: ["replied", "qualified", "spam", "archived"],
  replied: ["read", "qualified", "spam", "archived"],
  qualified: ["read", "replied", "spam", "archived"],
  spam: ["new", "archived"],
  archived: ["new", "read"],
} as const satisfies Readonly<
  Record<TContactStatus, readonly TContactStatus[]>
>;

export const CONTACT_TERMINAL_INBOX_STATUSES = ["spam", "archived"] as const;

export type TContactAdminActor = Pick<AuthUser, "id" | "role" | "session_id">;

export type TContactOperationalRecord = Readonly<{
  idempotency?: {
    active: boolean;
    expires_at: Date;
  };
  outbox?: {
    event_id: string;
    status:
      | "pending"
      | "processing"
      | "delivered"
      | "dead_letter"
      | "cancelled";
    attempts: number;
    next_attempt_at: Date;
    last_error_code?: "provider_failure" | "contact_unavailable" | null;
    delivered_at?: Date | null;
    dead_lettered_at?: Date | null;
  };
}>;

type ContactDtoSource = Readonly<{
  _id?: Types.ObjectId | string;
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status?: TContactStatus;
  delivery_status?: TContactDeliveryStatus;
  revision?: number;
  status_changed_at?: Date | string;
  retention_expires_at?: Date | string;
  retention_hold?: TContactRetentionHold | null;
  anonymized_at?: Date | string | null;
  purge_after?: Date | string | null;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}>;

const toIso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const isContactStatusTransitionAllowed = (
  current: TContactStatus,
  next: TContactStatus
): boolean =>
  current === next ||
  (CONTACT_STATUS_TRANSITIONS[current] as readonly TContactStatus[]).includes(
    next
  );

export const shouldCancelContactDelivery = (status: TContactStatus): boolean =>
  CONTACT_TERMINAL_INBOX_STATUSES.includes(status as "spam" | "archived");

export const maskContactEmail = (email: string): string => {
  const [local = "", domain = ""] = email.toLowerCase().split("@", 2);
  if (!local || !domain) return "redacted";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, Math.min(8, local.length - visible.length)))}@${domain}`;
};

const retentionView = (contact: ContactDtoSource, now: Date) => {
  const hold = contact.retention_hold;
  const holdExpiresAt = toIso(hold?.expires_at);
  const holdActive = Boolean(
    holdExpiresAt && new Date(holdExpiresAt).getTime() > now.getTime()
  );
  return {
    expires_at: toIso(contact.retention_expires_at),
    anonymized_at: toIso(contact.anonymized_at),
    purge_after: toIso(contact.purge_after),
    hold: holdActive
      ? {
          active: true as const,
          reason_code: hold!.reason_code,
          expires_at: holdExpiresAt!,
          placed_at: toIso(hold!.placed_at),
        }
      : { active: false as const },
  };
};

const operationalView = (
  operational: TContactOperationalRecord | undefined,
  now: Date
) => ({
  idempotency: operational?.idempotency
    ? {
        active: operational.idempotency.expires_at.getTime() > now.getTime(),
        expires_at: operational.idempotency.expires_at.toISOString(),
      }
    : { active: false },
  delivery: operational?.outbox
    ? {
        event_id: operational.outbox.event_id,
        status: operational.outbox.status,
        attempts: operational.outbox.attempts,
        next_attempt_at: operational.outbox.next_attempt_at.toISOString(),
        last_error_code: operational.outbox.last_error_code ?? null,
        delivered_at: toIso(operational.outbox.delivered_at),
        dead_lettered_at: toIso(operational.outbox.dead_lettered_at),
        retryable: ["dead_letter", "cancelled"].includes(
          operational.outbox.status
        ),
      }
    : null,
});

const baseContactView = (contact: ContactDtoSource) => ({
  id: String(contact._id ?? contact.id ?? ""),
  name: contact.name,
  subject: contact.subject,
  status: contact.status ?? "new",
  delivery_status: contact.delivery_status ?? "queued",
  revision: contact.revision ?? 0,
  status_changed_at: toIso(contact.status_changed_at),
  created_at: toIso(contact.created_at),
  updated_at: toIso(contact.updated_at),
  deleted: Boolean(contact.is_deleted),
  deleted_at: toIso(contact.deleted_at),
});

/**
 * Inbox rows intentionally omit the message and raw email. The full message is
 * only available from the separately-authorized detail endpoint.
 */
export const toContactInboxListDto = (
  contact: ContactDtoSource,
  operational?: TContactOperationalRecord,
  now = new Date()
) => ({
  ...baseContactView(contact),
  email_masked: maskContactEmail(contact.email),
  retention: retentionView(contact, now),
  operations: operationalView(operational, now),
});

export const toContactInboxDetailDto = (
  contact: ContactDtoSource,
  operational?: TContactOperationalRecord,
  now = new Date()
) => ({
  ...baseContactView(contact),
  email: contact.email,
  message: contact.message,
  retention: retentionView(contact, now),
  operations: operationalView(operational, now),
  allowed_statuses: CONTACT_STATUS_TRANSITIONS[contact.status ?? "new"],
});
