import AppError from "@/builder/app-error";
import httpStatus from "http-status";
import { z } from "zod";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_TYPES,
  AUDIT_OUTCOMES,
  AUDIT_SOURCES,
  AUDIT_TARGET_TYPES,
  type TAuditEventQuery,
} from "./audit-event.type";

const MAX_AUDIT_QUERY_WINDOW_MS = 90 * 24 * 60 * 60 * 1_000;
const DEFAULT_AUDIT_QUERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;

const optionalDate = z.string().datetime({ offset: true }).optional();

export const auditEventQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    from: optionalDate,
    to: optionalDate,
    action: z.enum(AUDIT_ACTIONS).optional(),
    actor_type: z.enum(AUDIT_ACTOR_TYPES).optional(),
    actor_id: z
      .string()
      .regex(/^[0-9a-f]{24}$/)
      .optional(),
    target_type: z.enum(AUDIT_TARGET_TYPES).optional(),
    target_id: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/)
      .optional(),
    outcome: z.enum(AUDIT_OUTCOMES).optional(),
    source: z.enum(AUDIT_SOURCES).optional(),
    correlation_id: z.string().trim().min(8).max(128).optional(),
  })
  .strict();

export const parseAuditEventQuery = (
  input: Record<string, unknown>,
  now = new Date()
): TAuditEventQuery => {
  const parsed = auditEventQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid audit query");
  }

  const to = parsed.data.to ? new Date(parsed.data.to) : now;
  const from = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(to.getTime() - DEFAULT_AUDIT_QUERY_WINDOW_MS);
  if (
    from.getTime() > to.getTime() ||
    to.getTime() - from.getTime() > MAX_AUDIT_QUERY_WINDOW_MS
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Audit query window must be between zero and 90 days"
    );
  }

  return {
    page: parsed.data.page,
    limit: parsed.data.limit,
    from,
    to,
    action: parsed.data.action,
    actor_type: parsed.data.actor_type,
    actor_id: parsed.data.actor_id,
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    outcome: parsed.data.outcome,
    source: parsed.data.source,
    correlation_id: parsed.data.correlation_id,
  };
};
