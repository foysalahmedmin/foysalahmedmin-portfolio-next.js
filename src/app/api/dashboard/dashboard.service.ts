import connectDB from "@/lib/db";
import { getDashboardRawSnapshot } from "./dashboard.repository";
import type {
  TDashboardCountRow,
  TDashboardRawSnapshot,
} from "./dashboard.type";
import { PILLAR_KEYS } from "@/lib/content/pillars";

const countMap = (rows: TDashboardCountRow[]): Record<string, number> => {
  const output: Record<string, number> = {};
  for (const row of rows) {
    const key =
      typeof row._id === "string" && row._id ? row._id : "unclassified";
    const count = Number(row.count);
    output[key] = Number.isSafeInteger(count) && count >= 0 ? count : 0;
  }
  return output;
};

const exactCounts = (
  rows: TDashboardCountRow[],
  keys: readonly string[]
): Record<string, number> => {
  const observed = countMap(rows);
  const output: Record<string, number> = {};
  for (const key of keys) output[key] = observed[key] ?? 0;
  output.unclassified = Object.entries(observed)
    .filter(([key]) => !keys.includes(key))
    .reduce((sum, [, value]) => sum + value, 0);
  return output;
};

const sumCounts = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((sum, value) => sum + value, 0);

const isoOrNull = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const normalizeDashboardSnapshot = (
  raw: TDashboardRawSnapshot,
  generatedAt = new Date()
) => {
  const articles = exactCounts(raw.article_statuses, [
    "draft",
    "pending",
    "published",
    "archived",
  ]);
  const projects = exactCounts(raw.project_statuses, [
    "draft",
    "published",
    "archived",
  ]);
  const articlePillars = exactCounts(raw.article_pillars, PILLAR_KEYS);
  const projectPillars = exactCounts(raw.project_pillars, PILLAR_KEYS);
  const inboxStatuses = exactCounts(raw.inbox.statuses, [
    "new",
    "read",
    "replied",
    "qualified",
    "spam",
    "archived",
  ]);
  const inboxDelivery = exactCounts(raw.inbox.deliveries, [
    "queued",
    "processing",
    "delivered",
    "retrying",
    "dead_letter",
    "cancelled",
  ]);
  const providers = exactCounts(raw.media_providers, [
    "cloudinary",
    "gcs",
    "local",
  ]);
  const lifecycle = exactCounts(raw.media_lifecycle, [
    "uploading",
    "ready",
    "orphaned",
    "deleting",
    "error",
    "delete_failed",
  ]);
  const metadata = exactCounts(raw.media_metadata, ["complete", "incomplete"]);
  const outbox = exactCounts(raw.outbox_statuses, [
    "pending",
    "processing",
    "delivered",
    "dead_letter",
    "cancelled",
  ]);
  const outboxState =
    outbox.dead_letter > 0
      ? "attention_required"
      : outbox.pending > 0 || outbox.processing > 0
        ? "work_pending"
        : "clear";

  return {
    generated_at: generatedAt.toISOString(),
    content: {
      site: {
        configured: Boolean(raw.site),
        draft_revision: raw.site?.revision ?? null,
        published: Boolean(raw.site?.published?.revision),
        published_revision: raw.site?.published?.revision ?? null,
        published_at: isoOrNull(raw.site?.published?.published_at),
        updated_at: isoOrNull(raw.site?.updated_at),
      },
      articles: { total: sumCounts(articles), by_status: articles },
      projects: { total: sumCounts(projects), by_status: projects },
      pillar_coverage: Object.fromEntries(
        PILLAR_KEYS.map((key) => [
          key,
          {
            articles: articlePillars[key] ?? 0,
            projects: projectPillars[key] ?? 0,
            total: (articlePillars[key] ?? 0) + (projectPillars[key] ?? 0),
          },
        ])
      ),
      health: {
        incomplete:
          raw.article_health.incomplete + raw.project_health.incomplete,
        stale_drafts:
          raw.article_health.stale_drafts + raw.project_health.stale_drafts,
        missing_media:
          raw.article_health.missing_media + raw.project_health.missing_media,
        broken_links:
          raw.article_health.broken_links + raw.project_health.broken_links,
        by_type: {
          articles: raw.article_health,
          projects: raw.project_health,
        },
      },
    },
    inbox: {
      total: raw.inbox.totals.total,
      by_status: inboxStatuses,
      by_delivery: inboxDelivery,
      needs_attention: raw.inbox.totals.needs_attention,
      retention_due: raw.inbox.totals.retention_due,
      active_holds: raw.inbox.totals.active_holds,
      recent: raw.recent_inquiries.map((item) => ({
        id: item.id,
        status: item.status,
        delivery_status: item.delivery_status,
        created_at: isoOrNull(item.created_at),
      })),
    },
    media: {
      total: sumCounts(providers),
      by_provider: providers,
      by_lifecycle: lifecycle,
      metadata,
      operational_errors:
        (lifecycle.error ?? 0) + (lifecycle.delete_failed ?? 0),
    },
    system: {
      outbox: {
        state: outboxState,
        by_status: outbox,
        oldest_due_at: isoOrNull(raw.outbox_oldest_due_at),
      },
      audit: {
        events_last_24h: raw.audit_recent_24h,
        latest_event_at: isoOrNull(raw.audit_latest_at),
        publish_activity: raw.publish_activity.map((item) => ({
          action: item.action,
          target_type: item.target_type,
          summary_code: item.summary_code,
          created_at: isoOrNull(item.created_at),
        })),
      },
    },
  };
};

export const getDashboardSnapshot = async () => {
  await connectDB();
  const generatedAt = new Date();
  return normalizeDashboardSnapshot(
    await getDashboardRawSnapshot(generatedAt),
    generatedAt
  );
};
