import nextConfig, { resolveNextPublicOrigin } from "../../next.config";
import { describe, expect, it } from "vitest";

describe("Page preview response headers", () => {
  it("fails the production config closed without an explicit valid public origin", () => {
    expect(() => resolveNextPublicOrigin({ NODE_ENV: "production" })).toThrow(
      /NEXT_PUBLIC_URL/
    );
    expect(() =>
      resolveNextPublicOrigin({
        NODE_ENV: "production",
        NEXT_PUBLIC_URL: "https://portfolio.example/invalid-path",
      })
    ).toThrow(/NEXT_PUBLIC_URL/);
    expect(
      resolveNextPublicOrigin({
        NODE_ENV: "development",
        PORT: "3200",
      })
    ).toBe("http://localhost:3200");
  });

  it("allows only the Page editor to embed the same-origin preview", async () => {
    const rules = await nextConfig.headers?.();
    const parent = rules?.find((rule) => rule.source === "/admin/pages/:path*");
    const preview = rules?.find(
      (rule) => rule.source === "/admin/preview/:path*"
    );
    const staticAssets = rules?.find(
      (rule) => rule.source === "/_next/static/:path*"
    );
    const optimizedImages = rules?.find(
      (rule) => rule.source === "/_next/image"
    );
    const publicImages = rules?.find(
      (rule) => rule.source === "/images/:path*"
    );
    const publicProjects = rules?.find(
      (rule) => rule.source === "/api/projects"
    );
    const publicArticles = rules?.find(
      (rule) => rule.source === "/api/articles"
    );
    expect(parent?.headers).toEqual(
      expect.arrayContaining([
        {
          key: "Content-Security-Policy",
          value: expect.stringMatching(
            /frame-ancestors 'none'.*frame-src 'self'/
          ),
        },
        { key: "X-Frame-Options", value: "DENY" },
      ])
    );
    expect(preview?.headers).toEqual(
      expect.arrayContaining([
        {
          key: "Content-Security-Policy",
          value: expect.stringMatching(
            /https?:\/\/[^ ]+\/_next\/static\/.*frame-ancestors 'self'.*frame-src 'none'/
          ),
        },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        {
          key: "Cache-Control",
          value: "private, no-store, max-age=0",
        },
        {
          key: "X-Robots-Tag",
          value: expect.stringContaining("noindex"),
        },
        { key: "Referrer-Policy", value: "no-referrer" },
      ])
    );
    for (const resource of [staticAssets, optimizedImages, publicImages]) {
      expect(resource?.headers).toEqual(
        expect.arrayContaining([
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ])
      );
    }
    for (const resource of [publicProjects, publicArticles]) {
      expect(resource?.headers).toEqual(
        expect.arrayContaining([
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD" },
        ])
      );
    }
  });
});
