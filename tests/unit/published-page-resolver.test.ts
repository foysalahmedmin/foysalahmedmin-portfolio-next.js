import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findPublishedPage: vi.fn(),
  readPublishedSite: vi.fn(),
  readPageCompositionItems: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("@/app/api/pages/page.repository", () => ({
  findPublishedPage: mocks.findPublishedPage,
}));
vi.mock("@/lib/site/published-site", () => ({
  readPublishedSite: mocks.readPublishedSite,
}));
vi.mock("@/app/api/pages/page-resolver.registry", () => ({
  readPageCompositionItems: mocks.readPageCompositionItems,
}));

import {
  PAGE_RESOLVER_MAX_RECORDS,
  PAGE_RESOLVER_MAX_SECTION_READS,
  PAGE_RESOLVER_SECTION_CONCURRENCY,
} from "@/app/api/pages/page-resolver.type";
import { resolvePublishedPageUncached } from "@/lib/pages/published-page-resolver";
import type { PublishedPageResolverError } from "@/lib/pages/published-page-resolver";

const id = (suffix: string) => `507f1f77bcf86cd7994390${suffix}`;

const publishedSite = (
  contentSource: "published" | "emergency" = "published"
) =>
  ({
    content_source: contentSource,
    site_key: "primary",
    schema_version: 1,
    contract_version: 1,
    identity: { locale: "en" },
  }) as never;

const pageRecord = (
  sections: readonly Record<string, unknown>[],
  input: { published?: boolean } = {}
) => ({
  route_key: "home",
  locale: "en",
  schema_version: 1,
  contract_version: 1,
  draft: {
    seo: { title: "PRIVATE UNPUBLISHED TITLE", noindex: true },
    sections: [],
  },
  created_by: id("11"),
  updated_by: id("12"),
  published:
    input.published === false
      ? null
      : {
          seo: { title: "Published portfolio", noindex: false },
          sections,
          revision: 7,
          published_at: new Date("2026-07-15T05:00:00.000Z"),
          published_by: id("13"),
        },
});

describe("published Page resolver", () => {
  beforeEach(() => {
    mocks.connectDB.mockReset();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.findPublishedPage.mockReset();
    mocks.readPublishedSite.mockReset();
    mocks.readPublishedSite.mockResolvedValue(publishedSite());
    mocks.readPageCompositionItems.mockReset();
  });

  it("preserves section order, omits unavailable curated records, and redacts failures", async () => {
    const projectIds = [id("21"), id("22")];
    mocks.findPublishedPage.mockResolvedValue(
      pageRecord([
        {
          key: "hero",
          kind: "site-hero",
          visible: true,
          layout: "immersive",
          source: { mode: "system" },
        },
        {
          key: "projects",
          kind: "project-collection",
          visible: true,
          heading: "Selected work",
          layout: "featured",
          item_limit: 2,
          source: { mode: "curated", ids: projectIds },
        },
        {
          key: "articles",
          kind: "article-collection",
          visible: true,
          layout: "grid",
          item_limit: 3,
          source: { mode: "automatic", filter: { featured: true } },
        },
        {
          key: "hidden-services",
          kind: "service-collection",
          visible: false,
          layout: "grid",
          item_limit: 4,
          source: { mode: "automatic", filter: {} },
        },
      ])
    );
    mocks.readPageCompositionItems.mockImplementation(async (kind: string) => {
      if (kind === "project-collection") {
        return [{ slug: "public-project", title: "Public project" }];
      }
      throw new Error("database-password-and-private-draft");
    });

    const result = await resolvePublishedPageUncached("home");

    expect(result.sections.map(({ key }) => key)).toEqual([
      "hero",
      "projects",
      "articles",
    ]);
    expect(mocks.readPageCompositionItems).toHaveBeenCalledTimes(2);
    expect(mocks.readPageCompositionItems).toHaveBeenCalledWith(
      "project-collection",
      { ids: projectIds, limit: 2, filters: {} }
    );
    expect(result.sections[1]).toMatchObject({
      items: [{ slug: "public-project", title: "Public project" }],
      health: {
        status: "partial",
        requested_records: 2,
        resolved_records: 1,
        omitted_records: 1,
        reason_codes: ["curated_reference_omitted"],
      },
    });
    expect(result.sections[2]).toMatchObject({
      items: [],
      health: {
        status: "unavailable",
        requested_records: 3,
        resolved_records: 0,
        omitted_records: 0,
        reason_codes: ["source_unavailable"],
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("PRIVATE UNPUBLISHED TITLE");
    expect(serialized).not.toContain("database-password");
    expect(serialized).not.toContain(projectIds[0]!);
    expect(serialized).not.toContain("published_by");
    expect(result.health).toMatchObject({
      status: "degraded",
      total_sections: 3,
      healthy_sections: 1,
      degraded_sections: 2,
      resolved_records: 1,
      omitted_records: 1,
    });
  });

  it("enforces section concurrency and record caps even if a reader over-returns", async () => {
    const sections = Array.from(
      { length: PAGE_RESOLVER_MAX_SECTION_READS },
      (_, index) => ({
        key: `articles-${index + 1}`,
        kind: "article-collection",
        visible: true,
        layout: "grid",
        item_limit: 24,
        source: { mode: "automatic", filter: {} },
      })
    );
    mocks.findPublishedPage.mockResolvedValue(pageRecord(sections));
    let active = 0;
    let maxActive = 0;
    mocks.readPageCompositionItems.mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      active -= 1;
      return Array.from({ length: 30 }, (_, index) => ({
        slug: `article-${index + 1}`,
      }));
    });

    const result = await resolvePublishedPageUncached("home");

    expect(maxActive).toBe(PAGE_RESOLVER_SECTION_CONCURRENCY);
    expect(mocks.readPageCompositionItems).toHaveBeenCalledTimes(
      PAGE_RESOLVER_MAX_SECTION_READS
    );
    expect(result.sections.map(({ key }) => key)).toEqual(
      sections.map(({ key }) => key)
    );
    expect(result.sections.every(({ items }) => items.length === 24)).toBe(
      true
    );
    expect(result.health.resolved_records).toBe(PAGE_RESOLVER_MAX_RECORDS);
  });

  it("marks system sections partial when Site uses its emergency fallback", async () => {
    mocks.findPublishedPage.mockResolvedValue(
      pageRecord([
        {
          key: "hero",
          kind: "site-hero",
          visible: true,
          layout: "default",
          source: { mode: "system" },
        },
      ])
    );
    mocks.readPublishedSite.mockResolvedValue(publishedSite("emergency"));

    const result = await resolvePublishedPageUncached("home");

    expect(result.sections[0]?.health).toMatchObject({
      status: "partial",
      reason_codes: ["site_emergency_fallback"],
    });
    expect(result.health.status).toBe("degraded");
  });

  it("fails closed when the fixed route has no published snapshot", async () => {
    mocks.findPublishedPage.mockResolvedValue(
      pageRecord([], { published: false })
    );

    await expect(resolvePublishedPageUncached("home")).rejects.toEqual(
      expect.objectContaining<Partial<PublishedPageResolverError>>({
        code: "PAGE_NOT_PUBLISHED",
      })
    );
    expect(mocks.readPageCompositionItems).not.toHaveBeenCalled();
  });
});
