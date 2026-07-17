// @vitest-environment jsdom

import { PageDomainError } from "@/app/api/pages/page.policy";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  verifyPagePreviewToken: vi.fn(),
  requireAdminSession: vi.fn(),
  readDraftPreview: vi.fn(),
  readPublishedSite: vi.fn(),
  resolvePageSnapshotUncached: vi.fn(),
  loadPublicRouteDiscovery: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/app/api/pages/page.preview", () => ({
  PAGE_PREVIEW_COOKIE: "page_preview",
  verifyPagePreviewToken: mocks.verifyPagePreviewToken,
}));
vi.mock("@/lib/auth/admin-session", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));
vi.mock("@/app/api/pages/page.service", () => ({
  readDraftPreview: mocks.readDraftPreview,
}));
vi.mock("@/lib/site/published-site", () => ({
  readPublishedSite: mocks.readPublishedSite,
}));
vi.mock("@/lib/pages/published-page-resolver", () => ({
  resolvePageSnapshotUncached: mocks.resolvePageSnapshotUncached,
}));
vi.mock("@/lib/pages/public-route-discovery", () => ({
  loadPublicRouteDiscovery: mocks.loadPublicRouteDiscovery,
}));
vi.mock("@/lib/pages/page-preview-display", () => ({
  normalizePagePreviewDisplay: (input: {
    theme?: string | string[];
    motion?: string | string[];
  }) => ({
    theme: input.theme === "dark" ? "dark" : "light",
    motion: input.motion === "normal" ? "normal" : "reduced",
  }),
}));
vi.mock("@/components/admin/page-preview-runtime", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/partials/Header", () => ({
  default: () => <header>public header</header>,
}));
vi.mock("@/components/partials/footer", () => ({
  default: () => <footer>public footer</footer>,
}));
vi.mock("@/components/ui/scroll-to-top", () => ({
  default: () => null,
}));
vi.mock("@/components/pages/public-route-page", () => ({
  PublicRoutePage: () => <main>public route renderer</main>,
}));

import AdminPublicPagePreview, {
  metadata,
} from "@/app/admin/preview/pages/[routeKey]/page";

const pageProps = {
  params: Promise.resolve({ routeKey: "home" }),
  searchParams: Promise.resolve({ theme: "dark", motion: "normal" }),
};

const previewPage = {
  id: "507f1f77bcf86cd799439099",
  route_key: "home",
  route_path: "/",
  locale: "en",
  schema_version: 1,
  contract_version: 1,
  revision: 4,
  draft: {
    seo: { noindex: true },
    sections: [
      {
        key: "hero",
        kind: "site-hero",
        visible: true,
        layout: "immersive",
        source: { mode: "system" },
      },
    ],
  },
  published: null,
  updated_at: "2026-07-15T00:00:00.000Z",
};

describe("authenticated public-renderer Page preview route", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.cookieGet.mockReturnValue({ value: "scoped-preview-token" });
    mocks.verifyPagePreviewToken.mockReturnValue({
      route_key: "home",
      page_id: previewPage.id,
      revision: 4,
    });
    mocks.requireAdminSession.mockResolvedValue({
      capabilities: ["site:read"],
    });
    mocks.readDraftPreview.mockResolvedValue(previewPage);
    mocks.readPublishedSite.mockResolvedValue(createEmergencyPublicSite());
    mocks.resolvePageSnapshotUncached.mockResolvedValue({
      page: {
        route_key: "home",
        route_path: "/",
        locale: "en",
        schema_version: 1,
        contract_version: 1,
        published_revision: 4,
        published_at: previewPage.updated_at,
        seo: { noindex: true },
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
    });
    mocks.loadPublicRouteDiscovery.mockResolvedValue(null);
  });

  it("requires site-read access and renders the shared public component tree", async () => {
    render(await AdminPublicPagePreview(pageProps));

    expect(mocks.requireAdminSession).toHaveBeenCalledWith(
      "/admin/preview/pages/home",
      "site:read"
    );
    expect(mocks.verifyPagePreviewToken).toHaveBeenCalledWith(
      "scoped-preview-token",
      "home"
    );
    expect(mocks.resolvePageSnapshotUncached).toHaveBeenCalledWith(
      expect.objectContaining({
        route_key: "home",
        revision: 4,
        snapshot: previewPage.draft,
      })
    );
    expect(screen.getByText("public header")).toBeVisible();
    expect(mocks.loadPublicRouteDiscovery).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.objectContaining({ route_key: "home" }),
      }),
      { mode: "preview" }
    );
    expect(screen.getByText("public route renderer")).toBeVisible();
    expect(screen.getByText("public footer")).toBeVisible();
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      noarchive: true,
    });
  });

  it("fails closed before reading a draft when the scoped token is absent", async () => {
    mocks.verifyPagePreviewToken.mockReturnValue(null);
    render(await AdminPublicPagePreview(pageProps));

    expect(screen.getByText("PREVIEW_SESSION_REQUIRED")).toBeVisible();
    expect(mocks.readDraftPreview).not.toHaveBeenCalled();
    expect(mocks.resolvePageSnapshotUncached).not.toHaveBeenCalled();
    expect(mocks.loadPublicRouteDiscovery).not.toHaveBeenCalled();
  });

  it("shows bounded reference paths without exposing internal error details", async () => {
    mocks.readDraftPreview.mockRejectedValue(
      new PageDomainError({
        status: 422,
        code: "PAGE_REFERENCE_INVALID",
        message: "mongodb://private-user:private-password@database",
        sources: ["sections.1.source.ids"],
      })
    );
    render(await AdminPublicPagePreview(pageProps));

    expect(screen.getByText("PAGE_REFERENCE_INVALID")).toBeVisible();
    expect(screen.getByText("sections.1.source.ids")).toBeVisible();
    expect(screen.queryByText(/private-password/)).not.toBeInTheDocument();
  });
});
