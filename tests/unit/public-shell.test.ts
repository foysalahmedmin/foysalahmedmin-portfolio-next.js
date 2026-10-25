import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import {
  getPrimaryPublicCta,
  getPublicShellLinks,
  getPublicSocialLinks,
} from "@/lib/site/public-shell";
import { describe, expect, it } from "vitest";

describe("public shell projection", () => {
  it("provides only code-owned route fallbacks for an emergency Site", () => {
    const site = createEmergencyPublicSite();
    expect(
      getPublicShellLinks(site, "header").map((link) => link.href)
    ).toEqual([
      "/",
      "/about",
      "/projects",
      "/case-studies",
      "/articles",
      "/videos",
      "/contact",
    ]);
    expect(getPrimaryPublicCta(site)?.href).toBe("/contact");
  });

  it("honors an intentionally empty published navigation", () => {
    const site = {
      ...createEmergencyPublicSite(),
      content_source: "published" as const,
    };
    expect(getPublicShellLinks(site, "header")).toEqual([]);
    expect(getPrimaryPublicCta(site)).toBeNull();
  });

  it("drops unsafe, disabled, duplicate, and unresolvable links", () => {
    const site = {
      ...createEmergencyPublicSite(),
      content_source: "published" as const,
      navigation: {
        header: [
          {
            key: "safe",
            label: "Safe",
            kind: "internal" as const,
            href: "/safe",
            enabled: true,
          },
          {
            key: "dup",
            label: "Duplicate",
            kind: "internal" as const,
            href: "/safe",
            enabled: true,
          },
          {
            key: "bad",
            label: "Bad",
            kind: "external" as const,
            href: "javascript:alert(1)",
            enabled: true,
          },
          {
            key: "off",
            label: "Off",
            kind: "internal" as const,
            href: "/off",
            enabled: false,
          },
          {
            key: "email",
            label: "Email",
            kind: "email" as const,
            enabled: true,
          },
        ],
        footer: [],
        legal: [],
      },
    };
    expect(
      getPublicShellLinks(site, "header").map((link) => link.href)
    ).toEqual(["/safe", "/case-studies", "/videos"]);
  });

  it("adds the library pages beside the pages they belong to, unless the Site document names them", () => {
    const site = createEmergencyPublicSite();
    const link = (
      key: string,
      label: string,
      href: string,
      enabled = true
    ) => ({
      key,
      label,
      kind: "internal" as const,
      href,
      enabled,
    });
    const withNavigation = (header: ReturnType<typeof link>[]) => ({
      ...site,
      content_source: "published" as const,
      navigation: { header, footer: [], legal: [] },
    });

    const hrefs = (header: ReturnType<typeof link>[]) =>
      getPublicShellLinks(withNavigation(header), "header").map((l) => l.href);

    // A document from before the libraries existed
    expect(
      hrefs([
        link("home", "Home", "/"),
        link("projects", "Projects", "/projects"),
        link("articles", "Articles", "/articles"),
        link("contact", "Contact", "/contact"),
      ])
    ).toEqual([
      "/",
      "/projects",
      "/case-studies",
      "/articles",
      "/videos",
      "/contact",
    ]);

    // A link the owner turned off stays off, and one that is already there is not repeated
    expect(
      hrefs([
        link("projects", "Projects", "/projects"),
        link("videos", "Videos", "/videos", false),
        link("cs", "Case studies", "/case-studies"),
      ])
    ).toEqual(["/projects", "/case-studies"]);

    // Legal links never get them
    expect(
      getPublicShellLinks(
        {
          ...withNavigation([]),
          navigation: {
            header: [],
            footer: [],
            legal: [link("p", "Privacy", "/privacy")],
          },
        },
        "legal"
      ).map((l) => l.href)
    ).toEqual(["/privacy"]);
  });

  it("allows only credential-free public HTTPS social URLs", () => {
    expect(
      getPublicSocialLinks([
        {
          key: "good",
          platform: "github",
          label: "GitHub",
          url: "https://github.com/example",
          enabled: true,
        },
        {
          key: "credential",
          platform: "other",
          label: "Bad",
          url: "https://user:pass@example.com",
          enabled: true,
        },
        {
          key: "http",
          platform: "other",
          label: "HTTP",
          url: "http://example.com",
          enabled: true,
        },
      ])
    ).toHaveLength(1);
  });
});
