import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicPagePayloadOrFallback: vi.fn(),
}));

vi.mock("@/lib/pages/public-page-fallback", () => ({
  getPublicPagePayloadOrFallback: mocks.getPublicPagePayloadOrFallback,
}));

describe("contact page metadata", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the shared Page payload and metadata foundation", async () => {
    const site = createEmergencyPublicSite();
    site.positioning.client_promise =
      "Bring the goal and constraints; I will shape the engineering path.";
    mocks.getPublicPagePayloadOrFallback.mockResolvedValue({
      page: {
        route_key: "contact",
        route_path: "/contact",
        locale: "en",
        schema_version: 1,
        contract_version: 1,
        published_revision: 0,
        published_at: "1970-01-01T00:00:00.000Z",
        seo: { noindex: true },
      },
      site,
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

    const { generateMetadata } = await import("@/app/(common)/contact/page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "Contact",
      description:
        "Bring the goal and constraints; I will shape the engineering path.",
      robots: { index: false, follow: true },
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Contact | Engineering Portfolio",
      description:
        "Bring the goal and constraints; I will shape the engineering path.",
    });
    expect(metadata.twitter).toMatchObject({
      title: "Contact | Engineering Portfolio",
      description:
        "Bring the goal and constraints; I will shape the engineering path.",
    });
  });
});
