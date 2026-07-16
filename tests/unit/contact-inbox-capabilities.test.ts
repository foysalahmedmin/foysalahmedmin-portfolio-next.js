import { getAdminApiAuthority, hasCapability } from "@/lib/auth/capabilities";
import { describe, expect, it } from "vitest";

describe("contact inbox and dashboard capabilities", () => {
  it("keeps sensitive inbox operations behind explicit capabilities", () => {
    expect(
      getAdminApiAuthority(
        "/api/contacts/507f1f77bcf86cd799439011/admin/retention-hold",
        "POST"
      )
    ).toEqual({ kind: "capability", capability: "inbox:retention-manage" });
    expect(
      getAdminApiAuthority(
        "/api/contacts/507f1f77bcf86cd799439011/admin/anonymize",
        "POST"
      )
    ).toEqual({ kind: "capability", capability: "inbox:permanent-delete" });
    expect(hasCapability("admin", "inbox:retention-manage")).toBe(false);
    expect(hasCapability("super-admin", "inbox:retention-manage")).toBe(true);
  });

  it("allows dashboard reads for administrators and rejects mutations", () => {
    expect(getAdminApiAuthority("/api/dashboard/admin", "GET")).toEqual({
      kind: "capability",
      capability: "dashboard:read",
    });
    expect(getAdminApiAuthority("/api/dashboard/admin", "POST")).toEqual({
      kind: "unmapped-admin-api",
    });
    expect(hasCapability("admin", "dashboard:read")).toBe(true);
    expect(hasCapability("editor", "dashboard:read")).toBe(false);
  });
});
