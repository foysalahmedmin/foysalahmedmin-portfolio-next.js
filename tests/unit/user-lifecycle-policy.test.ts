import {
  getUserLifecyclePolicyViolation,
  getUserUpdatePolicyViolation,
  wouldDeleteLastActiveSuperAdmin,
} from "@/app/api/users/user.service";
import type { TRole } from "@/types/jsonwebtoken.type";
import { describe, expect, it } from "vitest";

const actor = (role: TRole, id = "actor-id") => ({ _id: id, role });
const target = (role: TRole, id = "target-id") => ({ _id: id, role });

describe("user lifecycle authorization policy", () => {
  it("lets an admin manage a lower-privilege account", () => {
    expect(
      getUserLifecyclePolicyViolation(
        actor("admin"),
        target("editor"),
        "delete"
      )
    ).toBeNull();
  });

  it.each(["admin", "super-admin"] as const)(
    "requires a super-admin for the privileged %s role",
    (role) => {
      expect(
        getUserLifecyclePolicyViolation(actor("admin"), target(role), "restore")
      ).toContain("Only a super-admin");
    }
  );

  it("lets a super-admin manage another super-admin", () => {
    expect(
      getUserLifecyclePolicyViolation(
        actor("super-admin"),
        target("super-admin"),
        "permanent-delete"
      )
    ).toBeNull();
  });

  it.each(["delete", "permanent-delete", "restore"] as const)(
    "forbids the %s operation against the actor's own account",
    (operation) => {
      expect(
        getUserLifecyclePolicyViolation(
          actor("super-admin", "same-id"),
          target("super-admin", "same-id"),
          operation
        )
      ).toContain("own account");
    }
  );

  it("rejects a caller without a user-management role", () => {
    expect(
      getUserLifecyclePolicyViolation(actor("editor"), target("user"), "delete")
    ).toContain("cannot delete users");
  });

  it("detects removal of the final active super-admin", () => {
    expect(
      wouldDeleteLastActiveSuperAdmin(2, [
        target("super-admin", "one"),
        target("super-admin", "two"),
      ])
    ).toBe(true);
    expect(
      wouldDeleteLastActiveSuperAdmin(3, [
        target("super-admin", "one"),
        target("admin", "two"),
      ])
    ).toBe(false);
  });
});

describe("user administrative update policy", () => {
  it("allows an admin to update a lower-privilege account", () => {
    expect(
      getUserUpdatePolicyViolation(actor("admin"), target("editor"), {
        status: "blocked",
      })
    ).toBeNull();
  });

  it("allows profile-only updates to the actor's own account", () => {
    expect(
      getUserUpdatePolicyViolation(
        actor("admin", "same-id"),
        target("admin", "same-id"),
        { name: "Updated admin" }
      )
    ).toBeNull();
  });

  it.each([
    { role: "editor" as const },
    { status: "blocked" as const },
    { is_verified: false },
  ])("rejects a sensitive self-update %#", (payload) => {
    expect(
      getUserUpdatePolicyViolation(
        actor("super-admin", "same-id"),
        target("super-admin", "same-id"),
        payload
      )
    ).toContain("your own role, status, or verification state");
  });

  it("prevents an admin from updating a privileged target", () => {
    expect(
      getUserUpdatePolicyViolation(actor("admin"), target("admin"), {
        name: "Changed",
      })
    ).toContain("Only a super-admin");
  });

  it("prevents an admin from assigning a privileged role", () => {
    expect(
      getUserUpdatePolicyViolation(actor("admin"), target("editor"), {
        role: "admin",
      })
    ).toContain("assign a privileged role");
  });

  it("allows a super-admin to update another privileged target", () => {
    expect(
      getUserUpdatePolicyViolation(actor("super-admin"), target("admin"), {
        status: "blocked",
      })
    ).toBeNull();
  });
});
