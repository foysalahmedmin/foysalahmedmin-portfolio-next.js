import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { readPublishedSite } from "@/lib/site/published-site";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/site/published-site", () => ({
  readPublishedSite: vi.fn(),
}));

describe("contact page metadata", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the shared metadata foundation instead of static route metadata", async () => {
    const site = createEmergencyPublicSite();
    site.positioning.client_promise =
      "Bring the goal and constraints; I will shape the engineering path.";
    vi.mocked(readPublishedSite).mockResolvedValue(site);

    const { generateMetadata } = await import("@/app/(common)/contact/page");
    const metadata = await generateMetadata();

    expect(metadata).toMatchObject({
      title: "Contact",
      description:
        "Bring the goal and constraints; I will shape the engineering path.",
      robots: { index: false, follow: false },
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
