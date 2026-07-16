import { getAdminApiAuthority } from "@/lib/auth/capabilities";
import { describe, expect, it } from "vitest";

describe("Page API authority", () => {
  it("separates read, edit, publish and preview-session capabilities", () => {
    expect(getAdminApiAuthority("/api/pages/home/admin", "GET")).toEqual({
      kind: "capability",
      capability: "site:read",
    });
    expect(getAdminApiAuthority("/api/pages/home/admin", "PATCH")).toEqual({
      kind: "capability",
      capability: "site:edit",
    });
    expect(
      getAdminApiAuthority("/api/pages/home/admin/publish", "POST")
    ).toEqual({ kind: "capability", capability: "site:publish" });
    expect(
      getAdminApiAuthority("/api/pages/home/admin/preview-session", "POST")
    ).toEqual({ kind: "capability", capability: "site:read" });
  });
});
