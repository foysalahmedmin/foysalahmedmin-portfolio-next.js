import {
  buildBrowserSecurityHeaders,
  buildContentSecurityPolicy,
  resolveBrowserPublicOrigin,
} from "@/lib/security/browser-policy";
import { describe, expect, it } from "vitest";

describe("browser security policy", () => {
  it("enforces a closed frame/object/base policy and scopes configured media hosts", () => {
    const policy = buildContentSecurityPolicy({
      production: true,
      cloudinaryEnabled: true,
      gcpEnabled: false,
    });
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("https://res.cloudinary.com");
    expect(policy).not.toContain("https://storage.googleapis.com");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("adds HSTS only to the production header set", () => {
    const production = buildBrowserSecurityHeaders({
      production: true,
      cloudinaryEnabled: false,
      gcpEnabled: false,
    });
    const development = buildBrowserSecurityHeaders({
      production: false,
      cloudinaryEnabled: false,
      gcpEnabled: false,
    });
    expect(
      production.some((header) => header.key === "Strict-Transport-Security")
    ).toBe(true);
    expect(
      development.some((header) => header.key === "Strict-Transport-Security")
    ).toBe(false);
  });

  it("opens only the minimum same-origin frame direction for Page preview", () => {
    const input = {
      production: true,
      cloudinaryEnabled: false,
      gcpEnabled: false,
    };
    const parent = buildContentSecurityPolicy({
      ...input,
      framePolicy: "preview-parent",
    });
    const preview = buildContentSecurityPolicy({
      ...input,
      framePolicy: "preview-document",
      publicOrigin: "https://portfolio.example",
    });

    expect(parent).toContain("frame-src 'self'");
    expect(parent).toContain("frame-ancestors 'none'");
    expect(preview).toContain("frame-src 'none'");
    expect(preview).toContain("frame-ancestors 'self'");
    expect(preview).toContain(
      "script-src 'self' 'unsafe-inline' https://portfolio.example/_next/static/"
    );
    expect(preview).toContain(
      "img-src 'self' data: blob: https://portfolio.example/_next/static/ https://portfolio.example/_next/image https://portfolio.example/images/"
    );
    expect(preview).toContain(
      "connect-src 'self' https://portfolio.example/api/projects https://portfolio.example/api/articles"
    );
    expect(preview).toContain("default-src 'none'");
    expect(preview).toContain("form-action 'none'");
    expect(
      buildBrowserSecurityHeaders({
        ...input,
        framePolicy: "preview-document",
        publicOrigin: "https://portfolio.example",
      })
    ).toContainEqual({ key: "X-Frame-Options", value: "SAMEORIGIN" });
  });

  it("fails closed when an opaque preview has no trusted absolute asset origin", () => {
    expect(() =>
      buildContentSecurityPolicy({
        production: true,
        cloudinaryEnabled: false,
        gcpEnabled: false,
        framePolicy: "preview-document",
        publicOrigin: "https://portfolio.example/not-an-origin",
      })
    ).toThrow(/valid NEXT_PUBLIC_URL origin/);
  });

  it("requires an explicit valid NEXT_PUBLIC_URL in production", () => {
    expect(() => resolveBrowserPublicOrigin({ production: true })).toThrow(
      /Production requires NEXT_PUBLIC_URL/
    );
    expect(() =>
      resolveBrowserPublicOrigin({
        production: true,
        configured: "https://portfolio.example/path",
      })
    ).toThrow(/Production requires NEXT_PUBLIC_URL/);
    expect(
      resolveBrowserPublicOrigin({
        production: true,
        configured: "https://portfolio.example",
      })
    ).toBe("https://portfolio.example");
  });

  it("uses a localhost origin fallback only outside production", () => {
    expect(
      resolveBrowserPublicOrigin({
        production: false,
        configured: "",
        port: "4100",
      })
    ).toBe("http://localhost:4100");
  });
});
