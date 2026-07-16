import OutboxEvent from "@/app/api/outbox-events/outbox-event.model";
import { getSoftDeleteFilter, setSoftDeleteScope } from "@/lib/db/soft-delete";
import type { ClientSession, FilterQuery } from "mongoose";
import Contact from "./contact.model";
import type {
  TContactAdminActor,
  TContactOperationalRecord,
} from "./contact-inbox.policy";
import ContactSubmissionKey from "./contact-submission-key.model";
import type {
  TContact,
  TContactDocument,
  TContactRetentionHoldReason,
  TContactStatus,
} from "./contact.type";
import type { TContactInboxQuery } from "./contact.validation";

const LIST_PROJECTION = [
  "name",
  "email",
  "subject",
  "status",
  "delivery_status",
  "revision",
  "status_changed_at",
  "retention_expires_at",
  "retention_hold",
  "anonymized_at",
  "purge_after",
  "+is_deleted",
  "+deleted_at",
  "created_at",
  "updated_at",
].join(" ");

const DETAIL_PROJECTION = `${LIST_PROJECTION} message`;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const findById = async (id: string): Promise<TContactDocument | null> =>
  Contact.findById(id);

export const findByIdLean = async (id: string): Promise<TContact | null> =>
  Contact.findById(id).select(DETAIL_PROJECTION).lean<TContact>();

export const findInboxDetail = async (id: string) =>
  setSoftDeleteScope(
    Contact.findById(id).select(DETAIL_PROJECTION),
    "with_deleted"
  ).lean();

export const findByIdWithDeleted = async (
  id: string
): Promise<TContactDocument | null> =>
  setSoftDeleteScope(Contact.findById(id), "with_deleted");

export const findDeletedById = async (
  id: string
): Promise<TContactDocument | null> =>
  setSoftDeleteScope(Contact.findById(id), "only_deleted");

export const findManyByIds = async (ids: string[]) =>
  Contact.find({ _id: { $in: ids } })
    .select(DETAIL_PROJECTION)
    .lean();

export const findDeletedManyByIds = async (ids: string[]) =>
  setSoftDeleteScope(
    Contact.find({ _id: { $in: ids } }).select(DETAIL_PROJECTION),
    "only_deleted"
  ).lean();

export const findInboxPage = async (
  input: TContactInboxQuery,
  now = new Date()
) => {
  const filter: FilterQuery<TContactDocument> = {};
  if (input.search) {
    const value = new RegExp(escapeRegex(input.search), "i");
    filter.$or = [{ name: value }, { email: value }, { subject: value }];
  }
  if (input.status) filter.status = input.status;
  if (input.delivery_status) filter.delivery_status = input.delivery_status;
  if (input.retention === "due") {
    filter.retention_expires_at = { $lte: now };
    filter.anonymized_at = null;
    filter.$and = [
      {
        $or: [
          { retention_hold: null },
          { "retention_hold.expires_at": { $lte: now } },
        ],
      },
    ];
  } else if (input.retention === "held") {
    filter["retention_hold.expires_at"] = { $gt: now };
  } else if (input.retention === "anonymized") {
    filter.anonymized_at = { $ne: null };
  }

  const sortDirection = input.sort.startsWith("-") ? -1 : 1;
  const sortField = input.sort.replace(/^-/, "");
  const skip = (input.page - 1) * input.limit;
  const scope = input.deleted_scope;
  const query = setSoftDeleteScope(
    Contact.find(filter).select(LIST_PROJECTION),
    scope
  );
  const countFilter = { ...filter, ...getSoftDeleteFilter(scope) };

  const [contacts, total] = await Promise.all([
    query
      .sort({ [sortField]: sortDirection, _id: sortDirection })
      .skip(skip)
      .limit(input.limit)
      .lean(),
    Contact.collection.countDocuments(countFilter),
  ]);
  return { contacts, total };
};

export const findOperationalRecords = async (
  contactIds: string[]
): Promise<Map<string, TContactOperationalRecord>> => {
  if (contactIds.length === 0) return new Map();
  const [submissionKeys, events] = await Promise.all([
    ContactSubmissionKey.find({ contact: { $in: contactIds } })
      .select("contact expires_at")
      .lean(),
    OutboxEvent.find({
      event_type: "contact.notification.requested",
      aggregate_id: { $in: contactIds },
    })
      .select(
        "aggregate_id status attempts next_attempt_at last_error_code delivered_at dead_lettered_at"
      )
      .lean(),
  ]);
  const records = new Map<string, TContactOperationalRecord>();
  for (const key of submissionKeys) {
    records.set(String(key.contact), {
      ...records.get(String(key.contact)),
      idempotency: { active: true, expires_at: key.expires_at },
    });
  }
  for (const event of events) {
    const contactId = String(event.aggregate_id);
    records.set(contactId, {
      ...records.get(contactId),
      outbox: {
        event_id: String(event._id),
        status: event.status,
        attempts: event.attempts,
        next_attempt_at: event.next_attempt_at,
        last_error_code: event.last_error_code,
        delivered_at: event.delivered_at,
        dead_lettered_at: event.dead_lettered_at,
      },
    });
  }
  return records;
};

export const getContactAggregateSnapshot = async (now = new Date()) => {
  const [snapshot] = await Contact.aggregate<{
    statuses: Array<{ _id: string; count: number }>;
    deliveries: Array<{ _id: string; count: number }>;
    totals: Array<{
      total: number;
      needs_attention: number;
      retention_due: number;
      active_holds: number;
    }>;
  }>([
    {
      $facet: {
        statuses: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        deliveries: [
          { $group: { _id: "$delivery_status", count: { $sum: 1 } } },
        ],
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              needs_attention: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$status", "new"] },
                        { $eq: ["$delivery_status", "dead_letter"] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              retention_due: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$anonymized_at", null] },
                        { $lte: ["$retention_expires_at", now] },
                        {
                          $not: [{ $gt: ["$retention_hold.expires_at", now] }],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              active_holds: {
                $sum: {
                  $cond: [{ $gt: ["$retention_hold.expires_at", now] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    },
  ]);
  return {
    statuses: snapshot?.statuses ?? [],
    deliveries: snapshot?.deliveries ?? [],
    totals: snapshot?.totals[0] ?? {
      total: 0,
      needs_attention: 0,
      retention_due: 0,
      active_holds: 0,
    },
  };
};

export const transitionStatus = async (input: {
  id: string;
  current_status: TContactStatus;
  next_status: TContactStatus;
  expected_revision: number;
  actor: TContactAdminActor;
  now: Date;
  session?: ClientSession;
}) =>
  Contact.findOneAndUpdate(
    {
      _id: input.id,
      status: input.current_status,
      revision: input.expected_revision,
      anonymized_at: null,
    },
    {
      $set: {
        status: input.next_status,
        status_changed_at: input.now,
        status_changed_by: input.actor.id,
      },
      $inc: { revision: 1 },
    },
    { new: true, session: input.session }
  ).select(DETAIL_PROJECTION);

export const cancelPendingDelivery = async (
  contactId: string,
  now = new Date(),
  session?: ClientSession
) => {
  const event = await OutboxEvent.findOneAndUpdate(
    {
      event_type: "contact.notification.requested",
      aggregate_id: contactId,
      status: { $in: ["pending", "processing", "dead_letter"] },
    },
    {
      $set: {
        status: "cancelled",
        last_error_code: "contact_unavailable",
        next_attempt_at: now,
      },
      $unset: {
        lock_token: 1,
        locked_at: 1,
        lock_expires_at: 1,
        dead_lettered_at: 1,
      },
    },
    { new: true, session }
  );
  await Contact.updateOne(
    { _id: contactId },
    { $set: { delivery_status: "cancelled" } },
    { session }
  );
  return event;
};

export const retryDelivery = async (input: {
  contactId: string;
  expectedRevision: number;
  now: Date;
  session?: ClientSession;
}) => {
  const contact = await Contact.findOne({
    _id: input.contactId,
    revision: input.expectedRevision,
    anonymized_at: null,
    status: { $nin: ["spam", "archived"] },
    retention_expires_at: { $gt: input.now },
  }).session(input.session ?? null);
  if (!contact) return null;

  const event = await OutboxEvent.findOneAndUpdate(
    {
      event_type: "contact.notification.requested",
      aggregate_id: input.contactId,
      status: { $in: ["dead_letter", "cancelled"] },
    },
    {
      $set: {
        status: "pending",
        attempts: 0,
        next_attempt_at: input.now,
        last_error_code: null,
      },
      $unset: {
        lock_token: 1,
        locked_at: 1,
        lock_expires_at: 1,
        dead_lettered_at: 1,
        delivered_at: 1,
      },
    },
    { new: true, session: input.session }
  );
  if (!event) return null;
  contact.delivery_status = "queued";
  contact.revision = (contact.revision ?? 0) + 1;
  await contact.save({ session: input.session });
  return contact;
};

export const setRetentionHold = async (input: {
  id: string;
  expectedRevision: number;
  reasonCode: TContactRetentionHoldReason;
  expiresAt: Date;
  actorId: string;
  now: Date;
  session?: ClientSession;
}) =>
  setSoftDeleteScope(
    Contact.findOneAndUpdate(
      { _id: input.id, revision: input.expectedRevision, anonymized_at: null },
      {
        $set: {
          retention_hold: {
            reason_code: input.reasonCode,
            expires_at: input.expiresAt,
            placed_at: input.now,
            placed_by: input.actorId,
          },
        },
        $inc: { revision: 1 },
      },
      { new: true, session: input.session }
    ).select(DETAIL_PROJECTION),
    "with_deleted"
  );

export const releaseRetentionHold = async (input: {
  id: string;
  expectedRevision: number;
  session?: ClientSession;
}) =>
  setSoftDeleteScope(
    Contact.findOneAndUpdate(
      {
        _id: input.id,
        revision: input.expectedRevision,
        retention_hold: { $ne: null },
      },
      { $set: { retention_hold: null }, $inc: { revision: 1 } },
      { new: true, session: input.session }
    ).select(DETAIL_PROJECTION),
    "with_deleted"
  );

export const findPrivacyContactsByEmail = async (
  normalizedEmail: string,
  limit = 1_001
) =>
  setSoftDeleteScope(
    Contact.find({ email: normalizedEmail, anonymized_at: null })
      .select(DETAIL_PROJECTION)
      .sort({ created_at: 1, _id: 1 })
      .limit(limit),
    "with_deleted"
  ).lean();

export const updateMany = async (ids: string[], payload: Partial<TContact>) =>
  Contact.updateMany({ _id: { $in: ids } }, { ...payload });

export const softDeleteById = async (id: string) =>
  Contact.findByIdAndUpdate(
    id,
    {
      $set: { is_deleted: true, deleted_at: new Date() },
      $inc: { revision: 1 },
    },
    { new: true }
  );

export const softDeleteMany = async (ids: string[]) =>
  Contact.updateMany(
    { _id: { $in: ids } },
    {
      $set: { is_deleted: true, deleted_at: new Date() },
      $inc: { revision: 1 },
    }
  );

export const restoreById = async (id: string) =>
  setSoftDeleteScope(
    Contact.findByIdAndUpdate(
      id,
      {
        $set: { is_deleted: false, deleted_at: null },
        $inc: { revision: 1 },
      },
      { new: true }
    ),
    "only_deleted"
  );

export const restoreMany = async (ids: string[]) =>
  setSoftDeleteScope(
    Contact.updateMany(
      { _id: { $in: ids } },
      {
        $set: { is_deleted: false, deleted_at: null },
        $inc: { revision: 1 },
      }
    ),
    "only_deleted"
  );

export const hardDeleteById = async (id: string) =>
  setSoftDeleteScope(Contact.findByIdAndDelete(id), "only_deleted");

export const hardDeleteMany = async (ids: string[]) =>
  setSoftDeleteScope(Contact.deleteMany({ _id: { $in: ids } }), "only_deleted");

export const deleteOperationalData = async (ids: string[]) => {
  if (ids.length === 0) return;
  await Promise.all([
    ContactSubmissionKey.deleteMany({ contact: { $in: ids } }),
    OutboxEvent.deleteMany({
      aggregate_type: "contact",
      aggregate_id: { $in: ids },
    }),
  ]);
};
