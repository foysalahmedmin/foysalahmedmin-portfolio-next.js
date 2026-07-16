import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import type { TRole } from "@/types/jsonwebtoken.type";
import httpStatus from "http-status";
import type { ClientSession, FilterQuery } from "mongoose";
import type { TAuditEventDocument } from "./audit-event.model";
import {
  assertAuditActionTarget,
  assertSafeAuditCode,
  assertSafeAuditTargetId,
  getAuditRetentionDate,
  hashAuditIdentifier,
  normalizeAuditHash,
  sanitizeAuditMetadata,
  sanitizeChangedFields,
} from "./audit-event.policy";
import * as AuditEventRepository from "./audit-event.repository";
import {
  AUDIT_SCHEMA_VERSION,
  type TAppendAuditEventInput,
  type TAuditEventQuery,
  type TAuditEventView,
} from "./audit-event.type";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/;

const assertSafeActor = (input: TAppendAuditEventInput["actor"]): void => {
  if (input.type === "user") {
    if (!input.id || !OBJECT_ID_PATTERN.test(input.id) || !input.role) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "User audit actors require a safe ID and role snapshot"
      );
    }
    return;
  }

  if (input.id || input.role || input.session_id) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Non-user audit actors cannot include user identity fields"
    );
  }
};

const assertRevision = (revision: number | undefined): void => {
  if (
    revision !== undefined &&
    (!Number.isSafeInteger(revision) ||
      revision < 0 ||
      revision > 1_000_000_000)
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid audit target revision");
  }
};

const toAuditView = (
  event: Pick<
    TAuditEventDocument,
    | "event_id"
    | "schema_version"
    | "action"
    | "actor_type"
    | "actor_id"
    | "actor_role"
    | "target_type"
    | "target_id"
    | "target_revision"
    | "outcome"
    | "source"
    | "summary_code"
    | "changed_fields"
    | "reason_code"
    | "metadata"
    | "correlation_hash"
    | "created_at"
    | "retain_until"
  >
): TAuditEventView => ({
  event_id: event.event_id,
  schema_version: event.schema_version,
  action: event.action,
  actor: {
    type: event.actor_type,
    ...(event.actor_id ? { id: event.actor_id } : {}),
    ...(event.actor_role ? { role: event.actor_role as TRole } : {}),
  },
  target: {
    type: event.target_type,
    id: event.target_id,
    ...(event.target_revision !== undefined
      ? { revision: event.target_revision }
      : {}),
  },
  outcome: event.outcome,
  source: event.source,
  summary_code: event.summary_code,
  changed_fields: [...(event.changed_fields || [])],
  ...(event.reason_code ? { reason_code: event.reason_code } : {}),
  metadata: sanitizeAuditMetadata(event.metadata),
  ...(event.correlation_hash
    ? { correlation_hash: event.correlation_hash }
    : {}),
  created_at: event.created_at,
  retain_until: event.retain_until,
});

export const appendAuditEvent = async (
  input: TAppendAuditEventInput,
  options: { session?: ClientSession; now?: Date } = {}
): Promise<TAuditEventView> => {
  await connectDB();
  assertSafeActor(input.actor);
  assertAuditActionTarget(input.action, input.target.type);
  assertRevision(input.target.revision);

  const targetId = assertSafeAuditTargetId(input.target.id);
  const summaryCode = assertSafeAuditCode(input.summary_code, "audit summary");
  const reasonCode = input.reason_code
    ? assertSafeAuditCode(input.reason_code, "audit reason")
    : undefined;
  if (
    input.correlation_id !== undefined &&
    input.correlation_hash !== undefined
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Provide one audit correlation identifier"
    );
  }

  const event = await AuditEventRepository.append(
    {
      schema_version: AUDIT_SCHEMA_VERSION,
      action: input.action,
      actor_type: input.actor.type,
      actor_id: input.actor.id?.toLowerCase(),
      actor_role: input.actor.role,
      session_hash: input.actor.session_id
        ? hashAuditIdentifier("session", input.actor.session_id)
        : undefined,
      target_type: input.target.type,
      target_id: targetId,
      target_revision: input.target.revision,
      outcome: input.outcome ?? "success",
      source: input.source,
      summary_code: summaryCode,
      changed_fields: sanitizeChangedFields(input.changed_fields),
      reason_code: reasonCode,
      metadata: sanitizeAuditMetadata(input.metadata),
      correlation_hash: input.correlation_id
        ? hashAuditIdentifier("correlation", input.correlation_id)
        : normalizeAuditHash(input.correlation_hash),
      retain_until: getAuditRetentionDate(options.now),
    },
    options.session
  );

  return toAuditView(event);
};

export const queryAuditEvents = async (query: TAuditEventQuery) => {
  await connectDB();
  const filter: FilterQuery<TAuditEventDocument> = {
    created_at: { $gte: query.from, $lte: query.to },
  };
  if (query.action) filter.action = query.action;
  if (query.actor_type) filter.actor_type = query.actor_type;
  if (query.actor_id) filter.actor_id = query.actor_id;
  if (query.target_type) filter.target_type = query.target_type;
  if (query.target_id) filter.target_id = query.target_id;
  if (query.outcome) filter.outcome = query.outcome;
  if (query.source) filter.source = query.source;
  if (query.correlation_id) {
    filter.correlation_hash = hashAuditIdentifier(
      "correlation",
      query.correlation_id
    );
  }

  const result = await AuditEventRepository.findBounded({
    filter,
    page: query.page,
    limit: query.limit,
  });

  return {
    data: result.events.map((event) => toAuditView(event)),
    meta: {
      total: result.total,
      page: query.page,
      limit: query.limit,
    },
  };
};
