import type {
  TAuditAction,
  TAuditActorType,
  TAuditEventView,
  TAuditOutcome,
  TAuditSource,
  TAuditTargetType,
} from "@/app/api/audit-events/audit-event.type";
import type { TResponse } from "@/types/response.type";
import { readApiResponse } from "./api-response";

export type AdminAuditEvent = Omit<
  TAuditEventView,
  "created_at" | "retain_until"
> & {
  created_at: string;
  retain_until: string;
};

export type AdminAuditQuery = Readonly<{
  page: number;
  limit: number;
  from: string;
  to: string;
  action?: TAuditAction;
  actorType?: TAuditActorType;
  targetType?: TAuditTargetType;
  outcome?: TAuditOutcome;
  source?: TAuditSource;
  targetId?: string;
  correlationId?: string;
}>;

type RequestOptions = Readonly<{ signal?: AbortSignal }>;

const addOptional = (
  params: URLSearchParams,
  key: string,
  value: string | undefined
) => {
  if (value?.trim()) params.set(key, value.trim());
};

export const buildAdminAuditQuery = (query: AdminAuditQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    from: query.from,
    to: query.to,
  });
  addOptional(params, "action", query.action);
  addOptional(params, "actor_type", query.actorType);
  addOptional(params, "target_type", query.targetType);
  addOptional(params, "outcome", query.outcome);
  addOptional(params, "source", query.source);
  addOptional(params, "target_id", query.targetId);
  addOptional(params, "correlation_id", query.correlationId);
  return params.toString();
};

export const getAdminAuditEvents = async (
  query: AdminAuditQuery,
  options: RequestOptions = {}
): Promise<TResponse<AdminAuditEvent[]>> => {
  const response = await fetch(
    `/api/audit-events?${buildAdminAuditQuery(query)}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: options.signal,
    }
  );
  return await readApiResponse<AdminAuditEvent[]>(response);
};
