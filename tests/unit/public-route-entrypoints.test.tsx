// @vitest-environment jsdom

import type { TResolvedPublishedPagePayload } from "@/app/api/pages/page-resolver.type";
import type { TPageRouteKey } from "@/app/api/pages/page.type";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const routePayload = (routeKey: TPageRouteKey) =>
  ({
    page: {
      route_key: routeKey,
      route_path: routeKey === "home" ? "/" : `/${routeKey}`,
      locale: "en",
      schema_version: 1,
      contract_version: 1,
      published_revision: 2,
      published_at: "2026-07-17T00:00:00.000Z",
      seo: { noindex: false },
    },
    site: createEmergencyPublicSite(),
    sections: [],
    health: {
      status: "degraded",
      total_sections: 0,
      healthy_sections: 0,
      degraded_sections: 0,
      resolved_records: 0,
      omitted_records: 0,
    },
  }) as TResolvedPublishedPagePayload;

vi.mock("@/lib/pages/public-page-fallback", () => ({
  getHomePagePayloadOrFallback: () => routePayload("home"),
  getPublicPagePayloadOrFallback: (routeKey: TPageRouteKey) =>
    routePayload(routeKey),
}));
vi.mock("@/lib/pages/public-route-discovery", () => ({
  loadPublicRouteDiscovery: () => null,
}));
vi.mock("@/components/pages/public-route-page", () => ({
  getPublicRouteHeader: (payload: TResolvedPublishedPagePayload) => ({
    title: payload.page.route_key,
    description: `${payload.page.route_key} description`,
    breadcrumbs: [],
  }),
  PublicRoutePage: ({
    payload,
  }: {
    payload: TResolvedPublishedPagePayload;
  }) => <main>shared renderer:{payload.page.route_key}</main>,
}));
vi.mock("@/components/content/json-ld-script", () => ({
  JsonLdScript: () => null,
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("fixed public route entrypoints", () => {
  afterEach(cleanup);

  it.each([
    [
      "home",
      async () => {
        const Page = (await import("@/app/(common)/(home)/page")).default;
        return await Page();
      },
    ],
    [
      "about",
      async () => {
        const Page = (await import("@/app/(common)/about/page")).default;
        return await Page();
      },
    ],
    [
      "projects",
      async () => {
        const Page = (await import("@/app/(common)/projects/page")).default;
        return await Page({ searchParams: Promise.resolve({}) });
      },
    ],
    [
      "articles",
      async () => {
        const Page = (await import("@/app/(common)/articles/page")).default;
        return await Page({ searchParams: Promise.resolve({}) });
      },
    ],
    [
      "contact",
      async () => {
        const Page = (await import("@/app/(common)/contact/page")).default;
        return await Page();
      },
    ],
    [
      "privacy",
      async () => {
        const Page = (await import("@/app/(common)/privacy/page")).default;
        return await Page();
      },
    ],
    [
      "terms",
      async () => {
        const Page = (await import("@/app/(common)/terms/page")).default;
        return await Page();
      },
    ],
  ] as const)(
    "routes %s through the shared public renderer",
    async (routeKey, load) => {
      render(await load());
      expect(
        screen.getByText(`shared renderer:${routeKey}`)
      ).toBeInTheDocument();
    }
  );
});
