import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { scanDesignRules } from "../helpers/source-scan";

vi.mock("@/lib/db", () => ({ default: vi.fn() }));
vi.mock("@/app/api/dashboard/dashboard.repository", () => ({
  getDashboardRawSnapshot: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import {
  normalizeDashboardSnapshot,
  type TDashboardSnapshot,
} from "@/app/api/dashboard/dashboard.service";
import type { TDashboardRawSnapshot } from "@/app/api/dashboard/dashboard.type";
import { DashboardView } from "@/components/admin/dashboard/dashboard-view";
import {
  deriveNeedsAttention,
  HONOURED_FILTERS,
} from "@/components/admin/dashboard/needs-attention";
import { buildPipeline } from "@/components/admin/dashboard/pipeline";
import {
  DashboardUnavailable,
  WorkspaceDirectory,
} from "@/components/admin/dashboard/dashboard-fallbacks";

const NOW = new Date("2026-11-08T04:42:00.000Z"); // 10:42 in Asia/Dhaka

const health = (partial: Partial<Record<string, number>> = {}) => ({
  incomplete: 0,
  stale_drafts: 0,
  missing_media: 0,
  broken_links: 0,
  ...partial,
});

const rawSnapshot = (
  overrides: Partial<TDashboardRawSnapshot> = {}
): TDashboardRawSnapshot => ({
  site: {
    revision: 13,
    published: { revision: 12, published_at: "2026-11-01T04:00:00.000Z" },
    updated_at: "2026-11-07T04:00:00.000Z",
  },
  article_statuses: [],
  project_statuses: [],
  article_pillars: [],
  project_pillars: [],
  article_health: health(),
  project_health: health(),
  inbox: {
    statuses: [],
    deliveries: [],
    totals: { total: 0, needs_attention: 0, retention_due: 0, active_holds: 0 },
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
  case_study_statuses: [],
  case_study_health: health(),
  video_statuses: [],
  video_health: health(),
  ...overrides,
});

const snapshotOf = (overrides: Partial<TDashboardRawSnapshot> = {}) =>
  normalizeDashboardSnapshot(rawSnapshot(overrides), NOW);

const busy = () =>
  snapshotOf({
    case_study_statuses: [
      { _id: "draft", count: 2 },
      { _id: "pending", count: 1 },
      { _id: "published", count: 4 },
    ],
    case_study_health: health({ incomplete: 3, stale_drafts: 1 }),
    article_statuses: [
      { _id: "draft", count: 5 },
      { _id: "published", count: 9 },
      { _id: "archived", count: 2 },
    ],
    article_health: health({ stale_drafts: 2, missing_media: 1 }),
    project_statuses: [
      { _id: "draft", count: 1 },
      { _id: "published", count: 6 },
    ],
    project_health: health({ broken_links: 1 }),
    video_statuses: [{ _id: "published", count: 3 }],
    inbox: {
      statuses: [
        { _id: "new", count: 2 },
        { _id: "qualified", count: 1 },
      ],
      deliveries: [{ _id: "dead_letter", count: 1 }],
      totals: {
        total: 3,
        needs_attention: 3,
        retention_due: 0,
        active_holds: 0,
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
      { _id: "pending", count: 1 },
      { _id: "dead_letter", count: 1 },
    ],
    outbox_oldest_due_at: "2026-11-08T02:42:00.000Z",
    audit_recent_24h: 12,
    recent_inquiries: [
      {
        id: "507f1f77bcf86cd799439011",
        status: "new",
        delivery_status: "queued",
        created_at: "2026-11-08T02:42:00.000Z",
      },
    ],
    publish_activity: [
      {
        action: "content.published",
        target_type: "project",
        summary_code: "project_published",
        created_at: "2026-11-08T01:00:00.000Z",
      },
    ],
  });

const ALL = [
  "admin:access",
  "dashboard:read",
  "site:read",
  "content:read",
  "media:manage",
  "inbox:manage",
  "audit:read",
] as const;

const render = (
  snapshot: TDashboardSnapshot,
  capabilities: readonly string[] = ALL,
  unpublishedChanges: number | null = 3
) =>
  renderToStaticMarkup(
    <DashboardView
      snapshot={snapshot}
      capabilities={capabilities}
      environment="production"
      unpublishedChanges={unpublishedChanges}
    />
  );

describe("dashboard aggregate additions", () => {
  it("measures case studies and videos next to the existing fields", () => {
    const snapshot = busy();
    expect(snapshot.content.case_studies).toMatchObject({
      total: 7,
      by_status: { draft: 2, pending: 1, published: 4, archived: 0 },
    });
    expect(snapshot.content.videos.total).toBe(3);
    expect(snapshot.content.health.by_type.case_studies.incomplete).toBe(3);
    // Existing fields keep their names, and the totals now include every type.
    expect(snapshot.content.articles.total).toBe(16);
    expect(snapshot.content.health).toMatchObject({
      incomplete: 3,
      stale_drafts: 3,
      missing_media: 1,
      broken_links: 1,
    });
    expect(snapshot.inbox.recent[0]).not.toHaveProperty("topic");
  });

  it("reads a snapshot without the new facets as zeroes", () => {
    const { case_study_statuses, case_study_health, ...old } = rawSnapshot();
    void case_study_statuses;
    void case_study_health;
    const snapshot = normalizeDashboardSnapshot(old, NOW);
    expect(snapshot.content.case_studies.total).toBe(0);
    expect(snapshot.content.health.by_type.case_studies.incomplete).toBe(0);
  });
});

describe("needs attention derivation", () => {
  it("ranks high before medium, then by count, and lists only measured problems", () => {
    const items = deriveNeedsAttention(busy(), ALL);
    expect(items.map((item) => item.id)).toEqual([
      "inquiries-new", // high, 2
      "outbox-dead-letter", // high, 1
      "media-errors", // high, 1
      "broken-links-projects", // high, 1
      "incomplete-case_studies", // medium, 3
      "stale-drafts-articles", // medium, 2
      "media-metadata", // medium, 2
      "stale-drafts-case_studies", // medium, 1
      "missing-thumbnail-articles", // medium, 1
    ]);
    const high = items.filter((item) => item.severity === "high");
    expect(items.slice(0, high.length)).toEqual(high);
    expect(items[0]).toMatchObject({
      count: 2,
      fact: "new inquiries",
      action: "Open inbox",
    });
    expect(
      items.find((item) => item.id === "incomplete-case_studies")
    ).toMatchObject({
      count: 3,
      fact: "incomplete case studies",
      href: "/admin/case-studies",
    });
  });

  it("is empty when nothing is measured", () => {
    expect(deriveNeedsAttention(snapshotOf(), ALL)).toEqual([]);
  });

  it("links to the workspace, and carries a filter only when the workspace honours it", () => {
    // Only the inbox and the media library read their filters from the URL; the content workspaces do not yet
    expect(HONOURED_FILTERS).toEqual({
      "/admin/contacts": ["status", "delivery_status"],
      "/admin/media": ["metadata_status"],
    });
    // With nothing honoured (a workspace that ignores the URL) no link may pretend to be filtered
    const bare = deriveNeedsAttention(busy(), ALL, {});
    expect(bare.every((item) => !item.href.includes("?"))).toBe(true);
    expect(bare.every((item) => !item.filtered)).toBe(true);

    const honoured = {
      "/admin/contacts": ["status", "delivery_status"],
      "/admin/media": ["metadata_status"],
    };
    const items = deriveNeedsAttention(busy(), ALL, honoured);
    const href = (id: string) => items.find((item) => item.id === id)?.href;
    expect(href("inquiries-new")).toBe("/admin/contacts?status=new");
    expect(href("outbox-dead-letter")).toBe(
      "/admin/contacts?delivery_status=dead_letter"
    );
    expect(href("media-metadata")).toBe(
      "/admin/media?metadata_status=incomplete"
    );
    // A filter the workspace does not list is dropped, not guessed.
    expect(href("media-errors")).toBe("/admin/media");
    expect(href("incomplete-case_studies")).toBe("/admin/case-studies");
    expect(items.find((item) => item.id === "inquiries-new")?.filtered).toBe(
      true
    );
  });

  it("keeps the fact but drops the link when the viewer cannot open the workspace", () => {
    const items = deriveNeedsAttention(busy(), ["dashboard:read"]);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => !item.linkable)).toBe(true);
    const html = render(busy(), ["dashboard:read"]);
    expect(html).toContain("new inquiries");
    expect(html).not.toContain("Open inbox");
  });
});

describe("dashboard view", () => {
  it("shows severity as a glyph plus the word, and the measured fact with one link", () => {
    const html = render(busy());
    expect(html).toContain('data-severity="high"');
    expect(html).toContain('data-severity="medium"');
    expect(html).toContain(">High<");
    expect(html).toContain(">Medium<");
    expect(html).toContain("Needs attention");
    expect(html).toContain("(9)");
    expect(html).toContain('href="/admin/contacts"');
  });

  it("shows the zero state with the last-checked time instead of a banner", () => {
    const html = render(snapshotOf());
    expect(html).toContain("Nothing needs attention");
    expect(html).toContain("10:42");
    expect(html).toContain("(0)");
    expect(html).not.toContain('data-severity="high"');
  });

  it("puts environment, Site revisions, unpublished changes and a review link in the status line", () => {
    const html = render(busy());
    expect(html).toContain("Production");
    expect(html).toContain("Site published r12, draft r13");
    expect(html).toContain("3 unpublished changes");
    expect(html).toContain('href="/admin/site/review"');
    expect(html).toContain("Review and publish");
    expect(html).toContain("refreshed");
    expect(html).toContain(">Refresh<");
  });

  it("says less, not more, when the Site is not published or was not measured", () => {
    const none = render(
      snapshotOf({ site: { revision: 2, published: null } }),
      ALL,
      0
    );
    expect(none).toContain("Site not published, draft r2");
    const unknown = render(busy(), ALL, null);
    expect(unknown).toContain("(unpublished changes");
    const same = render(
      snapshotOf({
        site: { revision: 12, published: { revision: 12 } },
      }),
      ALL,
      0
    );
    expect(same).toContain("Site published r12, draft r12");
    expect(same).not.toContain("unpublished");
    const unconfigured = render(snapshotOf({ site: null }), ALL, null);
    expect(unconfigured).toContain("Site not configured");
  });

  it("describes the latest inquiry by state and age, never by its content", () => {
    const html = render(busy());
    expect(html).toContain("2</span> new");
    expect(html).toContain("1</span> qualified");
    expect(html).toContain("Latest: new,");
    expect(html).toContain("2h ago");
    expect(html).toContain("Open inbox");
    expect(html).not.toContain("507f1f77bcf86cd799439011");
  });

  it("lists the last publish activity with Mono timestamps", () => {
    const html = render(busy());
    expect(html).toContain("Recent activity");
    expect(html).toContain("Project Published");
    expect(html).toMatch(/08 Nov,? 07:00/);
    expect(html).toContain("12 audit events in 24 h");
  });

  it("summarises the outbox and media from the snapshot, with a mark and a label", () => {
    const html = render(busy());
    expect(html).toContain("Attention required");
    expect(html).toContain("1 pending · 0 processing · 1 dead letter");
    expect(html).toContain("oldest due 2h ago");
    expect(html).toContain("8 files · 2 missing metadata · 1 lifecycle error");
    expect(html).not.toMatch(/migration/i);
  });

  it("does not build the Enquiries panel (the observability endpoint stores no enquiry events)", () => {
    expect(render(busy())).not.toMatch(/enquir/i);
  });
});

describe("capability gating", () => {
  it("hides the Inbox card without inbox:manage and the activity feed without audit:read", () => {
    const html = render(busy(), ["dashboard:read", "content:read"]);
    expect(html).not.toContain('data-testid="cd-inbox"');
    expect(html).not.toContain('data-testid="cd-activity"');
    expect(html).not.toContain("Open audit log");
    expect(html).toContain('data-testid="cd-pipeline"');
    expect(html).toContain('data-testid="cd-system"');
  });

  it("shows both with the capabilities that open them", () => {
    const html = render(busy());
    expect(html).toContain('data-testid="cd-inbox"');
    expect(html).toContain('data-testid="cd-activity"');
  });

  it("does not link the status line to the review view without site:read", () => {
    const html = render(busy(), ["dashboard:read", "content:read"], null);
    expect(html).toContain("Site published r12, draft r13");
    expect(html).not.toContain("/admin/site/review");
    expect(html).not.toContain("Review and publish");
  });

  it("links the pipeline rows only with content:read", () => {
    const withLinks = render(busy());
    const without = render(busy(), ["dashboard:read"]);
    expect(withLinks).toContain('href="/admin/case-studies"');
    expect(without).not.toContain('href="/admin/case-studies"');
    expect(without).toContain("Case studies");
  });
});

describe("publishing pipeline", () => {
  it("has one row per content type with exact counts per status", () => {
    const rows = buildPipeline(busy());
    expect(rows.map((row) => row.key)).toEqual([
      "case_studies",
      "articles",
      "projects",
      "videos",
    ]);
    expect(rows[0]).toMatchObject({ total: 7 });
    expect(rows[0]!.segments.map((s) => [s.status, s.count])).toEqual([
      ["draft", 2],
      ["pending", 1],
      ["published", 4],
    ]);
    // Archived appears only when something is archived; projects have no pending step.
    expect(rows[1]!.segments.map((s) => s.status)).toEqual([
      "draft",
      "pending",
      "published",
      "archived",
    ]);
    expect(rows[2]!.segments.map((s) => s.status)).toEqual([
      "draft",
      "published",
    ]);
  });

  it("encodes status by pattern with direct count labels, never by colour", () => {
    const html = render(busy());
    const pipe = html.slice(html.indexOf('data-testid="cd-pipeline"'));
    for (const pattern of ["solid", "hatch", "outline", "dots"]) {
      expect(pipe).toContain(`data-pattern="${pattern}"`);
    }
    expect(pipe).toContain("2</span> draft");
    expect(pipe).toContain("1</span> pending");
    expect(pipe).toContain("4</span> published");
    expect(pipe).toContain("flex-grow:4");
    // The bar itself is decoration; the labelled counts are the information.
    expect(pipe).toContain('class="cd-bar" aria-hidden="true"');
  });

  it("marks an empty type instead of drawing a bar for nothing", () => {
    const html = render(snapshotOf());
    expect(html).toContain('data-empty="true"');
    expect(html).toContain("0</span> published");
  });
});

describe("no colour in the output", () => {
  it("renders no palette utility, colour literal or state-coloured class", () => {
    const outputs = [
      render(busy()),
      render(snapshotOf()),
      renderToStaticMarkup(<WorkspaceDirectory capabilities={ALL} />),
      renderToStaticMarkup(<DashboardUnavailable />),
    ];
    for (const html of outputs) {
      expect(scanDesignRules(html)).toEqual({});
      expect(html).not.toMatch(
        /\b(?:bg|text|border|ring|fill|stroke)-(?:primary|success|warning|destructive|info|muted|accent)\b/
      );
      expect(html).not.toMatch(/rounded-(?:2xl|3xl)|backdrop-blur|blur-/);
    }
  });
});

describe("fallbacks", () => {
  it("shows only the workspaces the role can open", () => {
    const html = renderToStaticMarkup(
      <WorkspaceDirectory capabilities={["admin:access", "content:read"]} />
    );
    expect(html).toContain("Portfolio administration");
    expect(html).toContain('href="/admin/articles"');
    expect(html).toContain('href="/admin/settings"');
    const minimal = renderToStaticMarkup(
      <WorkspaceDirectory capabilities={["admin:access"]} />
    );
    expect(minimal).not.toContain('href="/admin/articles"');
    expect(minimal).toContain('href="/admin/settings"');
  });

  it("offers a retry when the snapshot cannot be read", () => {
    const html = renderToStaticMarkup(<DashboardUnavailable />);
    expect(html).toContain("Dashboard data is unavailable");
    expect(html).toContain('href="/admin"');
    expect(html).toContain('role="alert"');
  });
});
