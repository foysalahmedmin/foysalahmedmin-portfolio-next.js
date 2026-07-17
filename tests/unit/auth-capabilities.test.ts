import {
  ADMIN_MUTATION_MATRIX,
  getAdminApiAuthority,
  getCapabilitiesForRole,
  hasCapability,
} from "@/lib/auth/capabilities";
import {
  getAdminMfaGate,
  isPublicSignupEnabled,
} from "@/app/api/auth/auth.service";
import { describe, expect, it } from "vitest";

describe("role capabilities", () => {
  it.each([
    ["user", false],
    ["subscriber", false],
    ["contributor", true],
    ["author", true],
    ["editor", true],
    ["admin", true],
    ["super-admin", true],
  ] as const)("resolves admin access for %s", (role, expected) => {
    expect(hasCapability(role, "admin:access")).toBe(expected);
  });

  it("keeps permanent deletion and session administration super-admin-only", () => {
    for (const role of [
      "user",
      "subscriber",
      "contributor",
      "author",
      "editor",
      "admin",
    ] as const) {
      expect(hasCapability(role, "content:permanent-delete")).toBe(false);
      expect(hasCapability(role, "sessions:manage")).toBe(false);
    }
    expect(hasCapability("super-admin", "content:permanent-delete")).toBe(true);
    expect(hasCapability("super-admin", "sessions:manage")).toBe(true);
  });

  it("returns immutable code-owned capability lists", () => {
    expect(getCapabilitiesForRole("editor")).toContain("content:edit");
    expect(getCapabilitiesForRole("editor")).not.toContain("users:manage");
  });
});

describe("admin mutation authority", () => {
  it("maps every declared admin resource and rejects unknown admin APIs", () => {
    const resources = ADMIN_MUTATION_MATRIX.map((rule) => rule.resource);
    expect(new Set(resources).size).toBe(resources.length);
    expect(resources).toEqual(
      expect.arrayContaining([
        "articles",
        "contacts",
        "dashboard",
        "files",
        "projects",
        "site",
        "users",
      ])
    );
    for (const rule of ADMIN_MUTATION_MATRIX) {
      if (rule.resource === "dashboard") {
        expect(getAdminApiAuthority("/api/dashboard/admin", "PATCH")).toEqual({
          kind: "unmapped-admin-api",
        });
        continue;
      }
      if (rule.resource === "site") {
        expect(getAdminApiAuthority("/api/site/admin", "PATCH")).toEqual({
          kind: "capability",
          capability: "site:edit",
        });
        expect(getAdminApiAuthority("/api/site/admin/publish", "POST")).toEqual(
          { kind: "capability", capability: "site:publish" }
        );
        continue;
      }
      expect(
        getAdminApiAuthority(`/api/${rule.resource}/admin`, "PATCH")
      ).toEqual({ kind: "capability", capability: rule.ordinary });
      expect(
        getAdminApiAuthority(`/api/${rule.resource}/admin/permanent`, "DELETE")
      ).toEqual({ kind: "capability", capability: rule.permanent });
    }
    expect(getAdminApiAuthority("/api/secrets/admin", "GET")).toEqual({
      kind: "unmapped-admin-api",
    });
  });

  it("lets editors edit content but not inbox, users, or permanent data", () => {
    expect(hasCapability("editor", "content:edit")).toBe(true);
    expect(hasCapability("editor", "inbox:manage")).toBe(false);
    expect(hasCapability("editor", "users:manage")).toBe(false);
    expect(hasCapability("editor", "content:permanent-delete")).toBe(false);
  });

  it("does not expose global draft reads to own-content roles", () => {
    expect(hasCapability("author", "content:read")).toBe(false);
    expect(hasCapability("author", "content:read-own")).toBe(true);
    expect(hasCapability("contributor", "content:read")).toBe(false);
  });
});

describe("signup and MFA launch gates", () => {
  it("keeps public signup disabled unless explicitly enabled", () => {
    expect(isPublicSignupEnabled("false")).toBe(false);
    expect(isPublicSignupEnabled("true")).toBe(true);
  });

  it("fails privileged production sign-in closed until MFA is ready", () => {
    expect(getAdminMfaGate("admin", "production", "required")).toBe("required");
    expect(getAdminMfaGate("editor", "production", "")).toBe("required");
    expect(getAdminMfaGate("author", "production", "required")).toBe(
      "required"
    );
    expect(getAdminMfaGate("contributor", "production", "required")).toBe(
      "required"
    );
    expect(getAdminMfaGate("user", "production", "required")).toBe(
      "not-required"
    );
    expect(getAdminMfaGate("admin", "development", "required")).toBe(
      "required"
    );
    expect(getAdminMfaGate("admin", "development", "disabled")).toBe(
      "not-required"
    );
  });
});
