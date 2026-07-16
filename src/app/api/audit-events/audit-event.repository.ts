import type { ClientSession, FilterQuery } from "mongoose";
import AuditEvent, { type TAuditEventDocument } from "./audit-event.model";

export type TAuditEventCreate = Pick<
  TAuditEventDocument,
  | "schema_version"
  | "action"
  | "actor_type"
  | "target_type"
  | "target_id"
  | "outcome"
  | "source"
  | "summary_code"
  | "changed_fields"
  | "metadata"
  | "retain_until"
> &
  Partial<
    Pick<
      TAuditEventDocument,
      | "actor_id"
      | "actor_role"
      | "session_hash"
      | "target_revision"
      | "reason_code"
      | "correlation_hash"
    >
  >;

const SAFE_AUDIT_PROJECTION = [
  "event_id",
  "schema_version",
  "action",
  "actor_type",
  "actor_id",
  "actor_role",
  "target_type",
  "target_id",
  "target_revision",
  "outcome",
  "source",
  "summary_code",
  "changed_fields",
  "reason_code",
  "metadata",
  "correlation_hash",
  "created_at",
  "retain_until",
].join(" ");

export const append = async (
  input: TAuditEventCreate,
  session?: ClientSession
): Promise<TAuditEventDocument> => {
  const [event] = await AuditEvent.create([input], session ? { session } : {});
  return event;
};

export const findBounded = async (input: {
  filter: FilterQuery<TAuditEventDocument>;
  page: number;
  limit: number;
}) => {
  const skip = (input.page - 1) * input.limit;
  const [events, total] = await Promise.all([
    AuditEvent.find(input.filter)
      .select(SAFE_AUDIT_PROJECTION)
      .sort({ created_at: -1, _id: -1 })
      .skip(skip)
      .limit(input.limit)
      .lean(),
    AuditEvent.countDocuments(input.filter),
  ]);

  return { events, total };
};
