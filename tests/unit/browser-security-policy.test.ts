import {
  buildBrowserSecurityHeaders,
  buildContentSecurityPolicy,
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
});
