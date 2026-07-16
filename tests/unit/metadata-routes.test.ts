import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import {
  buildManifestRoute,
  buildRobotsRoute,
  getSitemapBase,
} from "@/lib/metadata/metadata-routes";
import { describe, expect, it } from "vitest";

describe("metadata routes", () => {
  it("fails closed for an emergency or non-indexable Site", () => {
    const site = createEmergencyPublicSite();
    expect(buildRobotsRoute(site)).toEqual({
      rules: [{ userAgent: "*", disallow: "/" }],
    });
    expect(getSitemapBase(site)).toBeNull();
    expect(buildManifestRoute(site).name).toBe("Engineering Portfolio");
  });

  it("publishes canonical robots and sitemap locations only for an approved Site", () => {
    const site = createEmergencyPublicSite();
    site.content_source = "published";
    site.identity.canonical_url = "https://portfolio.example";
    site.identity.public_name = "Verified Portfolio";
    site.seo.canonical_url = "https://portfolio.example";
    site.seo.allow_indexing = true;
    const route = buildRobotsRoute(site);
    expect(route.sitemap).toBe("https://portfolio.example/sitemap.xml");
    expect(route.host).toBe("https://portfolio.example");
    expect(getSitemapBase(site)?.origin).toBe("https://portfolio.example");
    expect(buildManifestRoute(site).name).toBe("Verified Portfolio");
  });
});
