import { appendAuditEvent } from "@/app/api/audit-events/audit-event.service";
import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import connectDB from "@/lib/db";
import httpStatus from "http-status";
import mongoose, { type ClientSession } from "mongoose";
import {
  isContactStatusTransitionAllowed,
  shouldCancelContactDelivery,
  toContactInboxDetailDto,
  toContactInboxListDto,
  type TContactAdminActor,
} from "./contact-inbox.policy";
import * as ContactRepository from "./contact.repository";
import { anonymizeContacts } from "./contact-retention.service";
import type {
  TContactRetentionHoldReason,
  TContactStatus,
} from "./contact.type";
import type { TContactInboxQuery } from "./contact.validation";

const isTransactionUnsupported = (error: unknown): boolean => {
  const candidate = error as { code?: number; message?: string };
  const message = candidate.message?.toLowerCase() ?? "";
  return (
    candidate.code === 20 ||
    message.includes("transaction numbers are only allowed") ||
    message.includes("replica set") ||
    message.includes("mongos")
  );
};

const withContactTransaction = async <T>(
  operation: (session?: ClientSession) => Promise<T>
): Promise<T> => {
  const session = await mongoose.startSession();
  try {
    let value: T | undefined;
    try {
      await session.withTransaction(async () => {
        value = await operation(session);
      });
      if (value === undefined) throw new Error("contact_transaction_empty");
      return value;
    } catch (error) {
      if (
        ENV.environment === "production" ||
        !isTransactionUnsupported(error)
      ) {
        throw error;
      }
      return await operation();
    }
  } finally {
    await session.endSession();
  }
};

const operationalFor = async (id: string) =>
  (await ContactRepository.findOperationalRecords([id])).get(id);

const auditActor = (actor: TContactAdminActor) => ({
  type: "user" as const,
  id: actor.id,
  role: actor.role,
  session_id: actor.session_id,
});

export const getContacts = async (query: TContactInboxQuery) => {
  await connectDB();
  const now = new Date();
  const result = await ContactRepository.findInboxPage(query, now);
  const ids = result.contacts.map((contact) => String(contact._id));
  const operational = await ContactRepository.findOperationalRecords(ids);
  return {
    data: result.contacts.map((contact) =>
      toContactInboxListDto(contact, operational.get(String(contact._id)), now)
    ),
    meta: {
      total: result.total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(result.total / query.limit),
    },
  };
};

export const getContactById = async (id: string) => {
  await connectDB();
  const contact = await ContactRepository.findInboxDetail(id);
  if (!contact) throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  return toContactInboxDetailDto(contact, await operationalFor(id));
};

export const exportContactById = async (
  id: string,
  actor: TContactAdminActor
) => {
  await connectDB();
  const contact = await ContactRepository.findInboxDetail(id);
  if (!contact) throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  await appendAuditEvent({
    action: "contact.exported",
    actor: auditActor(actor),
    target: {
      type: "contact",
      id,
      revision: contact.revision ?? 0,
    },
    source: "admin",
    summary_code: "contact_exported",
    metadata: { result_count: 1, request_channel: "browser" },
  });
  return {
    schema_version: 1 as const,
    exported_at: new Date().toISOString(),
    contact: {
      id,
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      status: contact.status ?? "new",
      created_at: contact.created_at
        ? new Date(contact.created_at).toISOString()
        : null,
    },
  };
};

export const updateContactById = async (
  id: string,
  payload: { status: TContactStatus; expected_revision: number },
  actor: TContactAdminActor
) => {
  await connectDB();
  const current = await ContactRepository.findById(id);
  if (!current) throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  const currentRevision = current.revision ?? 0;
  if (currentRevision !== payload.expected_revision) {
    throw new AppError(httpStatus.CONFLICT, "Contact revision changed");
  }
  if (current.anonymized_at) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Anonymized contacts are immutable"
    );
  }
  const currentStatus = current.status ?? "new";
  if (!isContactStatusTransitionAllowed(currentStatus, payload.status)) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `Contact cannot transition from ${currentStatus} to ${payload.status}`
    );
  }
  if (currentStatus === payload.status) {
    return toContactInboxDetailDto(
      current.toObject(),
      await operationalFor(id)
    );
  }

  const now = new Date();
  const updated = await withContactTransaction(async (session) => {
    const changed = await ContactRepository.transitionStatus({
      id,
      current_status: currentStatus,
      next_status: payload.status,
      expected_revision: payload.expected_revision,
      actor,
      now,
      session,
    });
    if (!changed) {
      throw new AppError(httpStatus.CONFLICT, "Contact revision changed");
    }
    if (shouldCancelContactDelivery(payload.status)) {
      await ContactRepository.cancelPendingDelivery(id, now, session);
      changed.delivery_status = "cancelled";
    }
    await appendAuditEvent(
      {
        action: "contact.status.changed",
        actor: auditActor(actor),
        target: {
          type: "contact",
          id,
          revision: payload.expected_revision + 1,
        },
        source: "admin",
        summary_code: "contact_status_changed",
        changed_fields: ["status"],
        metadata: {
          previous_state: currentStatus,
          next_state: payload.status,
          transactional: Boolean(session),
        },
      },
      { session, now }
    );
    return changed;
  });
  return toContactInboxDetailDto(updated.toObject(), await operationalFor(id));
};

export const updateContacts = async (
  ids: string[],
  status: TContactStatus,
  actor: TContactAdminActor
): Promise<{
  updated_ids: string[];
  unchanged_ids: string[];
  rejected: Array<{ id: string; reason: string }>;
}> => {
  await connectDB();
  const updatedIds: string[] = [];
  const unchangedIds: string[] = [];
  const rejected: Array<{ id: string; reason: string }> = [];
  for (const id of ids) {
    const contact = await ContactRepository.findById(id);
    if (!contact) {
      rejected.push({ id, reason: "not_found" });
      continue;
    }
    if ((contact.status ?? "new") === status) {
      unchangedIds.push(id);
      continue;
    }
    try {
      await updateContactById(
        id,
        { status, expected_revision: contact.revision ?? 0 },
        actor
      );
      updatedIds.push(id);
    } catch (error) {
      if (
        !(error instanceof AppError) ||
        (error.status !== httpStatus.CONFLICT &&
          error.status !== httpStatus.UNPROCESSABLE_ENTITY &&
          error.status !== httpStatus.NOT_FOUND)
      ) {
        throw error;
      }
      rejected.push({
        id,
        reason:
          error instanceof AppError && error.status === httpStatus.CONFLICT
            ? "conflict"
            : "transition_not_allowed",
      });
    }
  }
  return {
    updated_ids: updatedIds,
    unchanged_ids: unchangedIds,
    rejected,
  };
};

export const retryContactDelivery = async (
  id: string,
  expectedRevision: number,
  actor: TContactAdminActor
) => {
  await connectDB();
  const now = new Date();
  const contact = await withContactTransaction(async (session) => {
    const retried = await ContactRepository.retryDelivery({
      contactId: id,
      expectedRevision,
      now,
      session,
    });
    if (!retried) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Delivery is not eligible for retry or the contact revision changed"
      );
    }
    await appendAuditEvent(
      {
        action: "contact.delivery.retried",
        actor: auditActor(actor),
        target: { type: "contact", id, revision: expectedRevision + 1 },
        source: "admin",
        summary_code: "contact_delivery_retried",
        changed_fields: ["delivery_status"],
        metadata: { previous_state: "failed", next_state: "queued" },
      },
      { session, now }
    );
    return retried;
  });
  return toContactInboxDetailDto(contact.toObject(), await operationalFor(id));
};

export const placeContactRetentionHold = async (
  id: string,
  input: {
    reason_code: TContactRetentionHoldReason;
    expires_at: string;
    expected_revision: number;
  },
  actor: TContactAdminActor
) => {
  await connectDB();
  const now = new Date();
  const expiresAt = new Date(input.expires_at);
  const maximum = now.getTime() + 365 * 24 * 60 * 60 * 1_000;
  if (
    expiresAt.getTime() <= now.getTime() + 60 * 60 * 1_000 ||
    expiresAt.getTime() > maximum
  ) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Retention hold expiry must be between one hour and one year"
    );
  }
  const contact = await withContactTransaction(async (session) => {
    const changed = await ContactRepository.setRetentionHold({
      id,
      expectedRevision: input.expected_revision,
      reasonCode: input.reason_code,
      expiresAt,
      actorId: actor.id,
      now,
      session,
    });
    if (!changed)
      throw new AppError(httpStatus.CONFLICT, "Contact revision changed");
    await appendAuditEvent(
      {
        action: "contact.retention_hold.changed",
        actor: auditActor(actor),
        target: {
          type: "contact",
          id,
          revision: input.expected_revision + 1,
        },
        source: "admin",
        summary_code: "contact_retention_hold_placed",
        changed_fields: ["retention_hold"],
        reason_code: input.reason_code,
        metadata: { next_state: "active" },
      },
      { session, now }
    );
    return changed;
  });
  return toContactInboxDetailDto(contact.toObject(), await operationalFor(id));
};

export const releaseContactRetentionHold = async (
  id: string,
  expectedRevision: number,
  actor: TContactAdminActor
) => {
  await connectDB();
  const now = new Date();
  const contact = await withContactTransaction(async (session) => {
    const changed = await ContactRepository.releaseRetentionHold({
      id,
      expectedRevision,
      session,
    });
    if (!changed)
      throw new AppError(httpStatus.CONFLICT, "Contact revision changed");
    await appendAuditEvent(
      {
        action: "contact.retention_hold.changed",
        actor: auditActor(actor),
        target: { type: "contact", id, revision: expectedRevision + 1 },
        source: "admin",
        summary_code: "contact_retention_hold_released",
        changed_fields: ["retention_hold"],
        metadata: { next_state: "released" },
      },
      { session, now }
    );
    return changed;
  });
  return toContactInboxDetailDto(contact.toObject(), await operationalFor(id));
};

export const anonymizeContactById = async (
  id: string,
  expectedRevision: number,
  actor: TContactAdminActor
) => {
  const result = await anonymizeContacts({
    ids: [id],
    actor: {
      type: "user",
      id: actor.id,
      role: actor.role,
      session_id: actor.session_id,
    },
    source: "admin",
    reason_code: "admin_request",
    expected_revision: expectedRevision,
  });
  if (result.held > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Contact is protected by an active retention hold"
    );
  }
  if (result.anonymized !== 1) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Contact revision changed or contact is already anonymized"
    );
  }
  return await getContactById(id);
};

export const deleteContactById = async (
  id: string,
  actor: TContactAdminActor
) => {
  await connectDB();
  const contact = await ContactRepository.softDeleteById(id);
  if (!contact) throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  await appendAuditEvent({
    action: "contact.deleted",
    actor: auditActor(actor),
    target: { type: "contact", id, revision: contact.revision ?? 0 },
    source: "admin",
    summary_code: "contact_deleted",
    changed_fields: ["is_deleted"],
  });
};

export const deleteContactPermanentById = async (
  id: string,
  actor: TContactAdminActor
): Promise<void> => {
  await connectDB();
  const contact = await ContactRepository.findDeletedById(id);
  if (!contact) throw new AppError(httpStatus.NOT_FOUND, "Contact not found");
  const deleted = await ContactRepository.hardDeleteById(id);
  if (!deleted)
    throw new AppError(httpStatus.CONFLICT, "Contact state changed");
  await ContactRepository.deleteOperationalData([id]);
  await appendAuditEvent({
    action: "contact.permanently_deleted",
    actor: auditActor(actor),
    target: { type: "contact", id, revision: contact.revision ?? 0 },
    source: "admin",
    summary_code: "contact_permanently_deleted",
  });
};

export const deleteContacts = async (
  ids: string[],
  actor: TContactAdminActor
) => {
  await connectDB();
  const contacts = await ContactRepository.findManyByIds(ids);
  const foundIds = contacts.map((contact) => String(contact._id));
  const result = await ContactRepository.softDeleteMany(foundIds);
  await Promise.all(
    foundIds.map((id) =>
      appendAuditEvent({
        action: "contact.deleted",
        actor: auditActor(actor),
        target: { type: "contact", id },
        source: "admin",
        summary_code: "contact_deleted",
        changed_fields: ["is_deleted"],
      })
    )
  );
  return {
    count: result.modifiedCount,
    not_found_ids: ids.filter((id) => !foundIds.includes(id)),
  };
};

export const deleteContactsPermanent = async (
  ids: string[],
  actor: TContactAdminActor
) => {
  await connectDB();
  const contacts = await ContactRepository.findDeletedManyByIds(ids);
  const foundIds = contacts.map((contact) => String(contact._id));
  const result = await ContactRepository.hardDeleteMany(foundIds);
  await ContactRepository.deleteOperationalData(foundIds);
  await Promise.all(
    foundIds.map((id) =>
      appendAuditEvent({
        action: "contact.permanently_deleted",
        actor: auditActor(actor),
        target: { type: "contact", id },
        source: "admin",
        summary_code: "contact_permanently_deleted",
      })
    )
  );
  return {
    count: result.deletedCount,
    not_found_ids: ids.filter((id) => !foundIds.includes(id)),
  };
};

export const restoreContactById = async (
  id: string,
  actor: TContactAdminActor
) => {
  await connectDB();
  const contact = await ContactRepository.restoreById(id);
  if (!contact) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Contact not found or not deleted"
    );
  }
  await appendAuditEvent({
    action: "contact.restored",
    actor: auditActor(actor),
    target: { type: "contact", id, revision: contact.revision ?? 0 },
    source: "admin",
    summary_code: "contact_restored",
    changed_fields: ["is_deleted"],
  });
  return toContactInboxDetailDto(contact.toObject(), await operationalFor(id));
};

export const restoreContacts = async (
  ids: string[],
  actor: TContactAdminActor
) => {
  await connectDB();
  const contacts = await ContactRepository.findDeletedManyByIds(ids);
  const foundIds = contacts.map((contact) => String(contact._id));
  const result = await ContactRepository.restoreMany(foundIds);
  await Promise.all(
    foundIds.map((id) =>
      appendAuditEvent({
        action: "contact.restored",
        actor: auditActor(actor),
        target: { type: "contact", id },
        source: "admin",
        summary_code: "contact_restored",
        changed_fields: ["is_deleted"],
      })
    )
  );
  return {
    count: result.modifiedCount,
    not_found_ids: ids.filter((id) => !foundIds.includes(id)),
  };
};
