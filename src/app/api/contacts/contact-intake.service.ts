import { randomBytes } from "node:crypto";
import AuditEvent, {
  deleteCompensatedContactAuditEvents,
} from "@/app/api/audit-events/audit-event.model";
import OutboxEvent from "@/app/api/outbox-events/outbox-event.model";
import { ENV } from "@/config";
import connectDB from "@/lib/db";
import { setSoftDeleteScope } from "@/lib/db/soft-delete";
import mongoose, { type ClientSession, type Types } from "mongoose";
import Contact from "./contact.model";
import type { ContactSubmission } from "./contact-public.contract";
import {
  ContactSecurityError,
  hmacContactValue,
  safeHashEquals,
} from "./contact-security";
import ContactSubmissionKey from "./contact-submission-key.model";

export type ContactIntakeReceipt = {
  receipt: string;
  duplicate: boolean;
};

type ContactIntakeContext = {
  idempotencyKey: string;
  request: Request;
};

type PersistedSubmission = {
  contactId: Types.ObjectId;
  receipt: string;
};

const parseRetentionDays = (): number => {
  const configured = Number(ENV.contact_retention_days);
  return Number.isInteger(configured) && configured >= 30 && configured <= 730
    ? configured
    : 365;
};

const shouldRequireTransactions = (): boolean =>
  ENV.environment === "production" &&
  ENV.contact_require_transactions?.trim().toLowerCase() !== "false";

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

const isDuplicateKeyError = (error: unknown): boolean =>
  (error as { code?: number })?.code === 11000;

const createReceipt = (): string =>
  `MIN-${randomBytes(8).toString("hex").toUpperCase()}`;

const createStoredRecords = async (
  submission: ContactSubmission,
  {
    correlationHash,
    expiresAt,
    keyHash,
    payloadHash,
    receipt,
  }: {
    correlationHash: string;
    expiresAt: Date;
    keyHash: string;
    payloadHash: string;
    receipt: string;
  },
  session?: ClientSession
): Promise<PersistedSubmission> => {
  const options = session ? { session } : undefined;
  const [contact] = await Contact.create(
    [
      {
        name: submission.name,
        email: submission.email,
        subject: submission.subject,
        message: submission.message,
        status: "new",
        delivery_status: "queued",
        retention_expires_at: expiresAt,
      },
    ],
    options
  );

  await ContactSubmissionKey.create(
    [
      {
        key_hash: keyHash,
        payload_hash: payloadHash,
        contact: contact._id,
        public_receipt: receipt,
        expires_at: expiresAt,
      },
    ],
    options
  );

  await AuditEvent.create(
    [
      {
        action: "contact.submitted",
        entity_type: "contact",
        entity_id: contact._id,
        actor_type: "anonymous",
        correlation_hash: correlationHash,
      },
    ],
    options
  );

  await OutboxEvent.create(
    [
      {
        event_type: "contact.notification.requested",
        aggregate_type: "contact",
        aggregate_id: contact._id,
        status: "pending",
        attempts: 0,
        next_attempt_at: new Date(),
      },
    ],
    options
  );

  return { contactId: contact._id, receipt };
};

const compensatePartialSubmission = async (
  contactId: Types.ObjectId | null,
  keyHash: string
): Promise<void> => {
  if (!contactId) return;

  await Promise.allSettled([
    ContactSubmissionKey.deleteOne({ key_hash: keyHash, contact: contactId }),
    deleteCompensatedContactAuditEvents({ contact_id: contactId }),
    OutboxEvent.deleteMany({
      aggregate_type: "contact",
      aggregate_id: contactId,
    }),
    setSoftDeleteScope(Contact.deleteOne({ _id: contactId }), "with_deleted"),
  ]);
};

const persistWithCompensation = async (
  submission: ContactSubmission,
  values: Parameters<typeof createStoredRecords>[1]
): Promise<PersistedSubmission> => {
  let createdContactId: Types.ObjectId | null = null;

  try {
    const contact = await Contact.create({
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      message: submission.message,
      status: "new",
      delivery_status: "queued",
      retention_expires_at: values.expiresAt,
    });
    createdContactId = contact._id;
    await ContactSubmissionKey.create({
      key_hash: values.keyHash,
      payload_hash: values.payloadHash,
      contact: contact._id,
      public_receipt: values.receipt,
      expires_at: values.expiresAt,
    });
    await AuditEvent.create({
      action: "contact.submitted",
      entity_type: "contact",
      entity_id: contact._id,
      actor_type: "anonymous",
      correlation_hash: values.correlationHash,
    });
    await OutboxEvent.create({
      event_type: "contact.notification.requested",
      aggregate_type: "contact",
      aggregate_id: contact._id,
      status: "pending",
      attempts: 0,
      next_attempt_at: new Date(),
    });
    return { contactId: contact._id, receipt: values.receipt };
  } catch (error) {
    if (createdContactId) {
      await compensatePartialSubmission(createdContactId, values.keyHash);
    }
    throw error;
  }
};

const findExistingReceipt = async (
  keyHash: string,
  payloadHash: string
): Promise<ContactIntakeReceipt | null> => {
  const existing = await ContactSubmissionKey.findOne({ key_hash: keyHash })
    .select("payload_hash public_receipt")
    .lean();
  if (!existing) return null;

  if (!safeHashEquals(existing.payload_hash, payloadHash)) {
    throw new ContactSecurityError(
      409,
      "invalid_request",
      "This submission key has already been used."
    );
  }

  return {
    receipt: existing.public_receipt,
    duplicate: true,
  };
};

export const submitContact = async (
  submission: ContactSubmission,
  { idempotencyKey, request }: ContactIntakeContext
): Promise<ContactIntakeReceipt> => {
  await connectDB();

  const keyHash = hmacContactValue("contact-idempotency", idempotencyKey);
  const payloadHash = hmacContactValue(
    "contact-payload",
    JSON.stringify({
      name: submission.name,
      email: submission.email,
      subject: submission.subject,
      message: submission.message,
    })
  );
  const existing = await findExistingReceipt(keyHash, payloadHash);
  if (existing) return existing;

  const receipt = createReceipt();
  const expiresAt = new Date(
    Date.now() + parseRetentionDays() * 24 * 60 * 60 * 1_000
  );
  const correlationSource =
    request.headers.get("x-request-id")?.slice(0, 128) || idempotencyKey;
  const values = {
    correlationHash: hmacContactValue("contact-correlation", correlationSource),
    expiresAt,
    keyHash,
    payloadHash,
    receipt,
  };

  const session = await mongoose.startSession();
  try {
    let persisted: PersistedSubmission | undefined;
    try {
      await session.withTransaction(async () => {
        const duplicate = await ContactSubmissionKey.findOne({
          key_hash: keyHash,
        })
          .session(session)
          .select("payload_hash public_receipt")
          .lean();
        if (duplicate) return;
        persisted = await createStoredRecords(submission, values, session);
      });

      if (!persisted) {
        const duplicate = await findExistingReceipt(keyHash, payloadHash);
        if (duplicate) return duplicate;
        throw new Error("contact_transaction_completed_without_result");
      }
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const duplicate = await findExistingReceipt(keyHash, payloadHash);
        if (duplicate) return duplicate;
      }

      if (!isTransactionUnsupported(error) || shouldRequireTransactions()) {
        throw error;
      }
      persisted = await persistWithCompensation(submission, values);
    }

    return {
      receipt: persisted.receipt,
      duplicate: false,
    };
  } catch (error) {
    if (error instanceof ContactSecurityError) throw error;
    if (isDuplicateKeyError(error)) {
      const duplicate = await findExistingReceipt(keyHash, payloadHash);
      if (duplicate) return duplicate;
    }
    throw new ContactSecurityError(
      503,
      "temporarily_unavailable",
      "The contact service is temporarily unavailable. Please try again."
    );
  } finally {
    await session.endSession();
  }
};
