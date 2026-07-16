import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheCalls: [] as Array<{
    key: readonly string[];
    options: { tags?: readonly string[]; revalidate?: number };
  }>,
  unstableCache: vi.fn(),
  resolvePublishedPageUncached: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));
vi.mock("@/app/api/pages/page.cache", () => ({
  PAGE_CACHE_TAG: "portfolio:v1:pages",
  pageCacheTag: (routeKey: string) => `portfolio:v1:pages:${routeKey}`,
}));
vi.mock("@/app/api/site/site.cache", () => ({
  SITE_CACHE_TAG: "portfolio:v1:site",
}));
vi.mock("@/app/api/services/service.definition", () => ({
  serviceDefinition: { cache_tag: "portfolio:v1:services" },
}));
vi.mock("@/app/api/skill-groups/skill-group.definition", () => ({
  skillGroupDefinition: { cache_tag: "portfolio:v1:skill-groups" },
}));
vi.mock("@/app/api/skills/skill.definition", () => ({
  skillDefinition: { cache_tag: "portfolio:v1:skills" },
}));
vi.mock("@/app/api/timeline/timeline-entry.definition", () => ({
  timelineEntryDefinition: { cache_tag: "portfolio:v1:timeline" },
}));
vi.mock("@/app/api/credentials/credential.definition", () => ({
  credentialDefinition: { cache_tag: "portfolio:v1:credentials" },
}));
vi.mock("@/app/api/faqs/faq.definition", () => ({
  faqDefinition: { cache_tag: "portfolio:v1:faqs" },
}));
vi.mock("@/app/api/testimonials/testimonial.definition", () => ({
  testimonialDefinition: { cache_tag: "portfolio:v1:testimonials" },
}));
vi.mock("@/app/api/legal-documents/legal-document.definition", () => ({
  legalDocumentDefinition: { cache_tag: "portfolio:v1:legal-documents" },
}));
vi.mock("@/lib/pages/published-page-resolver", () => ({
  resolvePublishedPageUncached: mocks.resolvePublishedPageUncached,
}));

import {
  PUBLISHED_PAGE_RESOLVER_TAGS,
  PUBLISHED_PAGE_RESOLVER_TTL_SECONDS,
  getHomePagePayload,
  getPublishedPagePayload,
} from "@/lib/pages/published-page";

describe("published Page payload cache", () => {
  beforeEach(() => {
    mocks.cacheCalls.length = 0;
    mocks.unstableCache.mockReset();
    mocks.unstableCache.mockImplementation(
      (
        callback: () => Promise<unknown>,
        key: readonly string[],
        options: { tags?: readonly string[]; revalidate?: number }
      ) => {
        mocks.cacheCalls.push({ key, options });
        return callback;
      }
    );
    mocks.resolvePublishedPageUncached.mockReset();
    mocks.resolvePublishedPageUncached.mockImplementation(
      async (routeKey: string) => ({ page: { route_key: routeKey } })
    );
  });

  it("uses bounded Page, Site, Article, Project, and repeatable-domain tags", async () => {
    await getPublishedPagePayload("about");

    expect(mocks.cacheCalls).toHaveLength(1);
    expect(mocks.cacheCalls[0]).toEqual({
      key: ["portfolio", "published-page-resolver", "about"],
      options: {
        tags: [...PUBLISHED_PAGE_RESOLVER_TAGS, "portfolio:v1:pages:about"],
        revalidate: PUBLISHED_PAGE_RESOLVER_TTL_SECONDS,
      },
    });
    const tags = mocks.cacheCalls[0]!.options.tags!;
    expect(tags).toEqual(
      expect.arrayContaining([
        "portfolio:v1:published-page-resolver",
        "portfolio:v1:pages",
        "portfolio:v1:site",
        "portfolio:v1:articles",
        "portfolio:v1:projects",
        "portfolio:v1:services",
        "portfolio:v1:skills",
        "portfolio:v1:legal-documents",
      ])
    );
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags.length).toBeLessThanOrEqual(16);
    expect(tags.join(" ")).not.toMatch(/admin|draft|preview/);
    expect(mocks.resolvePublishedPageUncached).toHaveBeenCalledWith("about");
  });

  it("exposes a typed Home facade over the same fixed-route resolver", async () => {
    const result = await getHomePagePayload();

    expect(result.page.route_key).toBe("home");
    expect(mocks.resolvePublishedPageUncached).toHaveBeenCalledWith("home");
    expect(mocks.cacheCalls[0]?.options.revalidate).toBe(60 * 60);
  });
});
