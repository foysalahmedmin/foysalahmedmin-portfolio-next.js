import { appendAuditEvent } from "@/app/api/audit-events/audit-event.service";
import OutboxEvent from "@/app/api/outbox-events/outbox-event.model";
import { ENV } from "@/config";
import connectDB from "@/lib/db";
import { setSoftDeleteScope } from "@/lib/db/soft-delete";
import Contact from "./contact.model";
import ContactSubmissionKey from "./contact-submission-key.model";

const MAX_RETENTION_BATCH = 100;
const MAX_SUBJECT_ANONYMIZATION_BATCH = 1_000;
export const CONTACT_ANONYMIZED_TOMBSTONE_DAYS = 30;

const getRetentionMilliseconds = (): number => {
  const days = Number(ENV.contact_retention_days);
  const boundedDays =
    Number.isInteger(days) && days >= 30 && days <= 730 ? days : 365;
  return boundedDays * 24 * 60 * 60 * 1_000;
};

const tombstonePurgeDate = (now: Date): Date =>
  new Date(
    now.getTime() + CONTACT_ANONYMIZED_TOMBSTONE_DAYS * 24 * 60 * 60 * 1_000
  );

type AnonymizationActor =
  | { type: "anonymous" | "system" }
  | {
      type: "user";
      id: string;
      role:
        | "super-admin"
        | "admin"
        | "editor"
        | "author"
        | "contributor"
        | "subscriber"
        | "user";
      session_id: string;
    };

export type ContactAnonymizationResult = {
  examined: number;
  anonymized: number;
  held: number;
  conflicts: number;
  anonymized_ids: string[];
};

export const anonymizeContacts = async (input: {
  ids: string[];
  actor: AnonymizationActor;
  source: "admin" | "api" | "job";
  reason_code: "retention_expired" | "subject_request" | "admin_request";
  now?: Date;
  expected_revision?: number;
}): Promise<ContactAnonymizationResult> => {
  await connectDB();
  const now = input.now ?? new Date();
  const uniqueIds = [...new Set(input.ids)].slice(
    0,
    MAX_SUBJECT_ANONYMIZATION_BATCH
  );
  const contacts = await setSoftDeleteScope(
    Contact.find({ _id: { $in: uniqueIds }, anonymized_at: null })
      .select("_id revision retention_hold")
      .limit(MAX_SUBJECT_ANONYMIZATION_BATCH),
    "with_deleted"
  ).lean();
  const result: ContactAnonymizationResult = {
    examined: contacts.length,
    anonymized: 0,
    held: 0,
    conflicts: 0,
    anonymized_ids: [],
  };

  for (const contact of contacts) {
    const id = String(contact._id);
    if (
      contact.retention_hold?.expires_at &&
      new Date(contact.retention_hold.expires_at).getTime() > now.getTime()
    ) {
      result.held += 1;
      continue;
    }
    if (
      input.expected_revision !== undefined &&
      (contact.revision ?? 0) !== input.expected_revision
    ) {
      result.conflicts += 1;
      continue;
    }
    const updated = await setSoftDeleteScope(
      Contact.updateOne(
        {
          _id: contact._id,
          revision: contact.revision ?? 0,
          anonymized_at: null,
          $or: [
            { retention_hold: null },
            { "retention_hold.expires_at": { $lte: now } },
          ],
        },
        {
          $set: {
            name: "[anonymized]",
            email: "redacted@invalid.example",
            subject: "[redacted]",
            message: "[redacted]",
            status: "archived",
            delivery_status: "cancelled",
            anonymized_at: now,
            purge_after: tombstonePurgeDate(now),
            retention_hold: null,
            status_changed_at: now,
            ...(input.actor.type === "user"
              ? { status_changed_by: input.actor.id }
              : { status_changed_by: null }),
          },
          $inc: { revision: 1 },
        }
      ),
      "with_deleted"
    );
    if (updated.modifiedCount !== 1) {
      result.conflicts += 1;
      continue;
    }

    await Promise.all([
      ContactSubmissionKey.deleteMany({ contact: contact._id }),
      OutboxEvent.updateMany(
        {
          aggregate_type: "contact",
          aggregate_id: contact._id,
          status: { $ne: "delivered" },
        },
        {
          $set: {
            status: "cancelled",
            last_error_code: "contact_unavailable",
          },
          $unset: {
            lock_token: 1,
            locked_at: 1,
            lock_expires_at: 1,
            dead_lettered_at: 1,
          },
        }
      ),
      appendAuditEvent({
        action: "contact.anonymized",
        actor: input.actor,
        target: {
          type: "contact",
          id,
          revision: (contact.revision ?? 0) + 1,
        },
        source: input.source,
        summary_code: "contact_anonymized",
        reason_code: input.reason_code,
        changed_fields: [
          "name",
          "email",
          "subject",
          "message",
          "status",
          "delivery_status",
          "anonymized_at",
        ],
      }),
    ]);
    result.anonymized += 1;
    result.anonymized_ids.push(id);
  }
  return result;
};

const purgeAnonymizedContacts = async (now: Date): Promise<number> => {
  const due = await setSoftDeleteScope(
    Contact.find({ anonymized_at: { $ne: null }, purge_after: { $lte: now } })
      .select("_id revision")
      .sort({ purge_after: 1, _id: 1 })
      .limit(MAX_RETENTION_BATCH),
    "with_deleted"
  ).lean();
  let purged = 0;
  for (const contact of due) {
    const deleted = await setSoftDeleteScope(
      Contact.deleteOne({
        _id: contact._id,
        anonymized_at: { $ne: null },
        purge_after: { $lte: now },
      }),
      "with_deleted"
    );
    if (deleted.deletedCount !== 1) continue;
    await Promise.all([
      ContactSubmissionKey.deleteMany({ contact: contact._id }),
      OutboxEvent.deleteMany({
        aggregate_type: "contact",
        aggregate_id: contact._id,
      }),
      appendAuditEvent({
        action: "contact.permanently_deleted",
        actor: { type: "system" },
        target: {
          type: "contact",
          id: String(contact._id),
          revision: contact.revision ?? 0,
        },
        source: "job",
        summary_code: "contact_retention_purged",
        reason_code: "retention_tombstone_expired",
      }),
    ]);
    purged += 1;
  }
  return purged;
};

export type ContactRetentionResult = {
  examined: number;
  anonymized: number;
  held: number;
  conflicts: number;
  purged: number;
};

export const anonymizeExpiredContacts = async (
  now = new Date()
): Promise<ContactRetentionResult> => {
  await connectDB();
  await setSoftDeleteScope(
    Contact.updateMany({ retention_expires_at: { $exists: false } }, [
      {
        $set: {
          retention_expires_at: {
            $add: [
              { $ifNull: ["$created_at", now] },
              getRetentionMilliseconds(),
            ],
          },
        },
      },
    ]),
    "with_deleted"
  );
  const purged = await purgeAnonymizedContacts(now);
  const expired = await setSoftDeleteScope(
    Contact.find({
      retention_expires_at: { $lte: now },
      anonymized_at: null,
      $or: [
        { retention_hold: null },
        { "retention_hold.expires_at": { $lte: now } },
      ],
    })
      .select("_id")
      .sort({ retention_expires_at: 1, _id: 1 })
      .limit(MAX_RETENTION_BATCH),
    "with_deleted"
  ).lean();
  const held = await setSoftDeleteScope(
    Contact.countDocuments({
      retention_expires_at: { $lte: now },
      anonymized_at: null,
      "retention_hold.expires_at": { $gt: now },
    }),
    "with_deleted"
  );
  const anonymized = await anonymizeContacts({
    ids: expired.map((contact) => String(contact._id)),
    actor: { type: "system" },
    source: "job",
    reason_code: "retention_expired",
    now,
  });
  return {
    examined: anonymized.examined,
    anonymized: anonymized.anonymized,
    held,
    conflicts: anonymized.conflicts,
    purged,
  };
};
