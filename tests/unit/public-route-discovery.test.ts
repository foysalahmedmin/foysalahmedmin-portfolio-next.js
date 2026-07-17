import type { TResolvedPublishedPagePayload } from "@/app/api/pages/page-resolver.type";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicProjectDiscovery: vi.fn(),
  getPublicProjectDiscoveryFacets: vi.fn(),
  getPublicProjectCategories: vi.fn(),
  getPublicArticleDiscovery: vi.fn(),
  getPublicArticleDiscoveryFacets: vi.fn(),
  getPublicArticleCategories: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/app/api/projects/project.service", () => ({
  getPublicProjectDiscovery: mocks.getPublicProjectDiscovery,
  getPublicProjectDiscoveryFacets: mocks.getPublicProjectDiscoveryFacets,
}));
vi.mock("@/app/api/project-categories/project-category.service", () => ({
  getPublicProjectCategories: mocks.getPublicProjectCategories,
}));
vi.mock("@/app/api/articles/article.service", () => ({
  getPublicArticleDiscovery: mocks.getPublicArticleDiscovery,
  getPublicArticleDiscoveryFacets: mocks.getPublicArticleDiscoveryFacets,
}));
vi.mock("@/app/api/article-categories/article-category.service", () => ({
  getPublicArticleCategories: mocks.getPublicArticleCategories,
}));

import { loadPublicRouteDiscovery } from "@/lib/pages/public-route-discovery";

const payload = (
  routeKey: "projects" | "articles",
  item:
    | Readonly<Record<string, unknown>>
    | readonly Readonly<Record<string, unknown>>[],
  source: Readonly<{
    mode: "automatic" | "curated";
    filter?: Readonly<Record<string, string | boolean>>;
  }> = { mode: "automatic" }
): TResolvedPublishedPagePayload => ({
  page: {
    route_key: routeKey,
    route_path: `/${routeKey}`,
    locale: "en",
    schema_version: 1,
    contract_version: 1,
    published_revision: 4,
    published_at: "2026-07-17T00:00:00.000Z",
    seo: { noindex: false },
  },
  site: createEmergencyPublicSite(),
  sections: [
    {
      key: routeKey,
      kind:
        routeKey === "projects" ? "project-collection" : "article-collection",
      layout: "grid",
      source_mode: source.mode,
      ...(source.filter ? { source_filter: source.filter } : {}),
      items: Array.isArray(item) ? item : [item],
      health: {
        status: "healthy",
        requested_records: Array.isArray(item) ? item.length : 1,
        resolved_records: Array.isArray(item) ? item.length : 1,
        omitted_records: 0,
        reason_codes: [],
      },
    },
  ],
  health: {
    status: "healthy",
    total_sections: 1,
    healthy_sections: 1,
    degraded_sections: 0,
    resolved_records: 1,
    omitted_records: 0,
  },
});

describe("public route discovery bridge", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getPublicProjectCategories.mockResolvedValue({ data: [] });
    mocks.getPublicProjectDiscoveryFacets.mockResolvedValue({
      technologies: [],
      years: [],
    });
    mocks.getPublicArticleCategories.mockResolvedValue({ data: [] });
    mocks.getPublicArticleDiscoveryFacets.mockResolvedValue({ topics: [] });
  });

  it("keeps automatic discovery paginated beyond item_limit with identical live/preview scope", async () => {
    mocks.getPublicProjectDiscovery.mockResolvedValue({
      data: [
        {
          _id: "507f1f77bcf86cd799439022",
          name: "Scoped discovery result",
          status: "completed",
          is_featured: true,
          is_premium: false,
        },
      ],
      meta: { total: 37, page: 1, limit: 9 },
      query: {
        search: "",
        pillar: "all",
        category: "all",
        technology: "all",
        type: "all",
        year: null,
        sort: "featured",
        page: 1,
      },
    });
    const pagePayload = payload(
      "projects",
      {
        _id: "507f1f77bcf86cd799439011",
        name: "Bounded resolver fallback",
        status: "completed",
        is_featured: true,
        is_premium: false,
      },
      {
        mode: "automatic",
        filter: {
          featured: true,
          pillar: "backend",
          project_type: "lab",
        },
      }
    );
    const [previewDiscovery, publishedDiscovery] = await Promise.all([
      loadPublicRouteDiscovery(pagePayload, { mode: "preview" }),
      loadPublicRouteDiscovery(pagePayload, {
        mode: "live",
        search_params: {},
      }),
    ]);

    expect(mocks.getPublicProjectDiscovery).toHaveBeenCalledTimes(2);
    expect(mocks.getPublicProjectDiscovery).toHaveBeenCalledWith(
      expect.objectContaining({
        composition_featured: true,
        composition_pillar: "backend",
        composition_project_type: "lab",
      })
    );
    expect(previewDiscovery).toMatchObject({
      route_key: "projects",
      props: {
        initialProjects: [{ name: "Scoped discovery result" }],
        initialMeta: { total: 37, page: 1, limit: 9 },
        compositionFilter: {
          featured: true,
          pillar: "backend",
          project_type: "lab",
        },
        initialError: false,
      },
    });
    expect(publishedDiscovery).toEqual(previewDiscovery);
  });

  it("preserves live canonical discovery redirects while Page composition owns placement", async () => {
    mocks.getPublicProjectDiscovery.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 9 },
      query: {
        search: "",
        pillar: "all",
        category: "canonical-category",
        technology: "all",
        type: "all",
        year: null,
        sort: "featured",
        page: 1,
      },
    });
    const discovery = await loadPublicRouteDiscovery(
      payload("projects", {
        _id: "507f1f77bcf86cd799439011",
        name: "Fallback project",
        status: "completed",
        is_featured: false,
        is_premium: false,
      }),
      {
        mode: "live",
        search_params: { category: "legacy-category" },
      }
    );

    expect(discovery?.redirect_to).toBe(
      "/projects?category=canonical-category"
    );
  });

  it("uses bounded resolved items for curated snapshots", async () => {
    const discovery = await loadPublicRouteDiscovery(
      payload(
        "articles",
        {
          _id: "607f1f77bcf86cd799439011",
          name: "Draft-only field note",
          is_featured: false,
          is_premium: false,
        },
        { mode: "curated" }
      ),
      { mode: "preview" }
    );

    expect(mocks.getPublicArticleDiscovery).not.toHaveBeenCalled();
    expect(discovery).toMatchObject({
      route_key: "articles",
      props: {
        initialArticles: [{ name: "Draft-only field note" }],
        initialMeta: { total: 1, page: 1, limit: 1 },
        snapshotLocked: true,
      },
    });
  });

  it("filters curated Projects during SSR and canonicalizes them to one page", async () => {
    const discovery = await loadPublicRouteDiscovery(
      payload(
        "projects",
        [
          {
            _id: "507f1f77bcf86cd799439031",
            name: "Queue platform",
            description: "Reliable queue processing",
            status: "completed",
            is_featured: false,
            is_premium: false,
          },
          {
            _id: "507f1f77bcf86cd799439032",
            name: "Design system",
            description: "Interface foundations",
            status: "completed",
            is_featured: true,
            is_premium: false,
          },
        ],
        { mode: "curated" }
      ),
      {
        mode: "live",
        search_params: { search: "queue", sort: "name", page: "4" },
      }
    );

    expect(discovery).toMatchObject({
      redirect_to: "/projects?search=queue&sort=name",
      props: {
        initialProjects: [{ name: "Queue platform" }],
        snapshotProjects: [
          { name: "Queue platform" },
          { name: "Design system" },
        ],
        initialMeta: { total: 1, page: 1, limit: 1 },
        initialQuery: { search: "queue", sort: "name", page: 1 },
        snapshotLocked: true,
      },
    });
    expect(mocks.getPublicProjectDiscovery).not.toHaveBeenCalled();
  });

  it("filters curated Articles during SSR and canonicalizes them to one page", async () => {
    const discovery = await loadPublicRouteDiscovery(
      payload(
        "articles",
        [
          {
            _id: "607f1f77bcf86cd799439031",
            name: "Threat boundaries",
            topics: ["Security"],
            is_featured: false,
            is_premium: false,
          },
          {
            _id: "607f1f77bcf86cd799439032",
            name: "Frontend state",
            topics: ["React"],
            is_featured: true,
            is_premium: false,
          },
        ],
        { mode: "curated" }
      ),
      {
        mode: "live",
        search_params: { topic: "Security", sort: "name", page: "3" },
      }
    );

    expect(discovery).toMatchObject({
      redirect_to: "/articles?topic=Security&sort=name",
      props: {
        initialArticles: [{ name: "Threat boundaries" }],
        snapshotArticles: [
          { name: "Threat boundaries" },
          { name: "Frontend state" },
        ],
        initialMeta: { total: 1, page: 1, limit: 1 },
        initialQuery: { topic: "Security", sort: "name", page: 1 },
        snapshotLocked: true,
      },
    });
    expect(mocks.getPublicArticleDiscovery).not.toHaveBeenCalled();
  });
});
