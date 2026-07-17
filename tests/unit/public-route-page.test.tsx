// @vitest-environment jsdom

import type { TResolvedPublishedPagePayload } from "@/app/api/pages/page-resolver.type";
import type { TPageRouteKey } from "@/app/api/pages/page.type";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import {
  getPublicRouteHeader,
  PublicRoutePage,
} from "@/components/pages/public-route-page";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/sections/page-header-section", () => ({
  default: ({ title, description }: { title: string; description: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));

vi.mock("@/components/(common)/projects-page/projects-content-section", () => ({
  default: () => <section>interactive project discovery</section>,
}));

vi.mock("@/components/(common)/articles-page/articles-content-section", () => ({
  default: () => <section>interactive article discovery</section>,
}));

vi.mock("@/components/pages/public-page-sections", () => ({
  PublicPageSections: ({
    payload,
    sectionOverrides,
  }: {
    payload: TResolvedPublishedPagePayload;
    sectionOverrides?: Record<
      string,
      (input: {
        payload: TResolvedPublishedPagePayload;
        section: TResolvedPublishedPagePayload["sections"][number];
      }) => ReactNode
    >;
  }) => (
    <div data-testid="composition">
      {payload.sections.map((section) => (
        <div key={section.key} data-section-key={section.key}>
          {sectionOverrides?.[section.kind]?.({ payload, section }) ??
            section.kind}
        </div>
      ))}
    </div>
  ),
}));

const payload = (
  routeKey: TPageRouteKey,
  kinds: TResolvedPublishedPagePayload["sections"][number]["kind"][] = [],
  seo: TResolvedPublishedPagePayload["page"]["seo"] = { noindex: false }
): TResolvedPublishedPagePayload => ({
  page: {
    route_key: routeKey,
    route_path: routeKey === "home" ? "/" : `/${routeKey}`,
    locale: "en",
    schema_version: 1,
    contract_version: 1,
    published_revision: 8,
    published_at: "2026-07-17T00:00:00.000Z",
    seo,
  },
  site: createEmergencyPublicSite(),
  sections: kinds.map((kind, index) => ({
    key: `${kind}-${index}`,
    kind,
    layout: "default",
    source_mode: "system",
    items: [],
    health: {
      status: "empty",
      requested_records: 0,
      resolved_records: 0,
      omitted_records: 0,
      reason_codes: ["source_empty"],
    },
  })),
  health: {
    status: "degraded",
    total_sections: kinds.length,
    healthy_sections: 0,
    degraded_sections: kinds.length,
    resolved_records: 0,
    omitted_records: 0,
  },
});

describe("shared public route renderer", () => {
  afterEach(cleanup);

  it.each([
    ["home", ["site-hero"]],
    ["about", ["site-introduction"]],
    ["projects", ["project-collection", "contact-cta"]],
    ["articles", ["article-collection", "contact-cta"]],
    ["contact", ["contact-form", "faq-list"]],
    ["privacy", ["legal-document"]],
    ["terms", ["legal-document"]],
  ] as const)(
    "renders the %s Page composition through the shared route boundary",
    (routeKey, kinds) => {
      const routePayload = payload(routeKey, [...kinds]);
      render(
        <PublicRoutePage
          payload={routePayload}
          discovery={
            routeKey === "projects"
              ? {
                  route_key: "projects",
                  props: {
                    initialProjects: [],
                    initialMeta: { total: 0, page: 1, limit: 9 },
                    initialQuery: {
                      search: "",
                      pillar: "all",
                      category: "all",
                      technology: "all",
                      type: "all",
                      year: null,
                      sort: "featured",
                      page: 1,
                    },
                    categories: [],
                    facets: { technologies: [], years: [] },
                  },
                }
              : routeKey === "articles"
                ? {
                    route_key: "articles",
                    props: {
                      initialArticles: [],
                      initialMeta: { total: 0, page: 1, limit: 9 },
                      initialQuery: {
                        search: "",
                        pillar: "all",
                        category: "all",
                        topic: "all",
                        sort: "newest",
                        page: 1,
                      },
                      categories: [],
                      facets: { topics: [] },
                    },
                  }
                : null
          }
        />
      );

      expect(
        document.querySelector(`[data-public-route="${routeKey}"]`)
      ).toHaveAttribute("data-page-revision", "8");
      expect(
        [...screen.getByTestId("composition").children].map((node) =>
          node.getAttribute("data-section-key")
        )
      ).toEqual(kinds.map((kind, index) => `${kind}-${index}`));
    }
  );

  it("uses the interactive discovery renderers only at their Page-controlled collection positions", () => {
    const projects = payload("projects", ["contact-cta", "project-collection"]);
    const articles = payload("articles", ["contact-cta", "article-collection"]);
    const projectResult = render(
      <PublicRoutePage
        payload={projects}
        discovery={{
          route_key: "projects",
          props: {
            initialProjects: [],
            initialMeta: { total: 0, page: 1, limit: 9 },
            initialQuery: {
              search: "",
              pillar: "all",
              category: "all",
              technology: "all",
              type: "all",
              year: null,
              sort: "featured",
              page: 1,
            },
            categories: [],
            facets: { technologies: [], years: [] },
          },
        }}
      />
    );
    expect(projectResult.getByTestId("composition").textContent).toBe(
      "contact-ctainteractive project discovery"
    );
    projectResult.unmount();

    const articleResult = render(
      <PublicRoutePage
        payload={articles}
        discovery={{
          route_key: "articles",
          props: {
            initialArticles: [],
            initialMeta: { total: 0, page: 1, limit: 9 },
            initialQuery: {
              search: "",
              pillar: "all",
              category: "all",
              topic: "all",
              sort: "newest",
              page: 1,
            },
            categories: [],
            facets: { topics: [] },
          },
        }}
      />
    );
    expect(articleResult.getByTestId("composition").textContent).toBe(
      "contact-ctainteractive article discovery"
    );
  });

  it("keeps route headers identical for live and preview callers", () => {
    const about = payload("about", [], {
      noindex: false,
      title: "One shared heading",
      description: "One shared description",
    });
    expect(getPublicRouteHeader(about)).toMatchObject({
      title: "One shared heading",
      description: "One shared description",
    });
    expect(getPublicRouteHeader(payload("home"))).toBeNull();
    expect(getPublicRouteHeader(payload("privacy"))).toBeNull();
  });
});
