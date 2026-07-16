import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ default: vi.fn() }));
vi.mock("@/app/api/dashboard/dashboard.repository", () => ({
  getDashboardRawSnapshot: vi.fn(),
}));

import { normalizeDashboardSnapshot } from "@/app/api/dashboard/dashboard.service";

describe("dashboard aggregate", () => {
  it("normalizes only measured counts and derives bounded health state", () => {
    const result = normalizeDashboardSnapshot(
      {
        site: {
          revision: 7,
          published: {
            revision: 6,
            published_at: new Date("2026-07-14T12:00:00.000Z"),
          },
          updated_at: new Date("2026-07-15T10:00:00.000Z"),
        },
        article_statuses: [
          { _id: "draft", count: 2 },
          { _id: "published", count: 4 },
        ],
        project_statuses: [{ _id: "published", count: 3 }],
        article_pillars: [
          { _id: "frontend", count: 2 },
          { _id: "backend", count: 2 },
        ],
        project_pillars: [{ _id: "frontend", count: 1 }],
        article_health: {
          incomplete: 1,
          stale_drafts: 1,
          missing_media: 0,
          broken_links: 0,
        },
        project_health: {
          incomplete: 2,
          stale_drafts: 1,
          missing_media: 1,
          broken_links: 1,
        },
        inbox: {
          statuses: [{ _id: "new", count: 5 }],
          deliveries: [{ _id: "dead_letter", count: 1 }],
          totals: {
            total: 5,
            needs_attention: 5,
            retention_due: 1,
            active_holds: 2,
          },
        },
        media_providers: [{ _id: "cloudinary", count: 8 }],
        media_lifecycle: [
          { _id: "ready", count: 7 },
          { _id: "error", count: 1 },
        ],
        media_metadata: [
          { _id: "complete", count: 6 },
          { _id: "incomplete", count: 2 },
        ],
        outbox_statuses: [
          { _id: "pending", count: 2 },
          { _id: "dead_letter", count: 1 },
        ],
        outbox_oldest_due_at: new Date("2026-07-15T09:00:00.000Z"),
        audit_recent_24h: 12,
        audit_latest_at: new Date("2026-07-15T11:00:00.000Z"),
        recent_inquiries: [
          {
            id: "507f1f77bcf86cd799439011",
            status: "new",
            delivery_status: "queued",
            created_at: new Date("2026-07-15T10:30:00.000Z"),
          },
        ],
        publish_activity: [
          {
            action: "content.published",
            target_type: "project",
            summary_code: "project_published",
            created_at: new Date("2026-07-15T10:00:00.000Z"),
          },
        ],
      },
      new Date("2026-07-15T12:00:00.000Z")
    );

    expect(result.content.articles).toMatchObject({
      total: 6,
      by_status: { draft: 2, published: 4, pending: 0, archived: 0 },
    });
    expect(result.inbox).toMatchObject({
      total: 5,
      needs_attention: 5,
      active_holds: 2,
    });
    expect(result.media).toMatchObject({ total: 8, operational_errors: 1 });
    expect(result.system.outbox.state).toBe("attention_required");
    expect(result.system.audit.events_last_24h).toBe(12);
    expect(result.content.pillar_coverage.frontend).toEqual({
      articles: 2,
      projects: 1,
      total: 3,
    });
    expect(result.content.pillar_coverage.ai_automation.total).toBe(0);
    expect(result.content.health).toMatchObject({
      incomplete: 3,
      stale_drafts: 2,
      missing_media: 1,
      broken_links: 1,
    });
    expect(result.inbox.recent[0]).toMatchObject({ status: "new" });
    expect(result.system.audit.publish_activity[0]).toMatchObject({
      target_type: "project",
    });
    expect(JSON.stringify(result)).not.toContain("email");
    expect(JSON.stringify(result)).not.toContain("message");
  });

  it("reports real zeroes for an empty database snapshot", () => {
    const result = normalizeDashboardSnapshot({
      site: null,
      article_statuses: [],
      project_statuses: [],
      article_pillars: [],
      project_pillars: [],
      article_health: {
        incomplete: 0,
        stale_drafts: 0,
        missing_media: 0,
        broken_links: 0,
      },
      project_health: {
        incomplete: 0,
        stale_drafts: 0,
        missing_media: 0,
        broken_links: 0,
      },
      inbox: {
        statuses: [],
        deliveries: [],
        totals: {
          total: 0,
          needs_attention: 0,
          retention_due: 0,
          active_holds: 0,
        },
      },
      media_providers: [],
      media_lifecycle: [],
      media_metadata: [],
      outbox_statuses: [],
      outbox_oldest_due_at: null,
      audit_recent_24h: 0,
      audit_latest_at: null,
      recent_inquiries: [],
      publish_activity: [],
    });
    expect(result.content.site.configured).toBe(false);
    expect(result.content.articles.total).toBe(0);
    expect(result.system.outbox.state).toBe("clear");
    expect(result.content.pillar_coverage.full_stack.total).toBe(0);
  });
});
