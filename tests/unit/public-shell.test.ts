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
    ).toEqual(["/", "/about", "/projects", "/articles", "/contact"]);
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
    expect(getPublicShellLinks(site, "header")).toEqual([
      { key: "safe", label: "Safe", href: "/safe", external: false },
    ]);
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
