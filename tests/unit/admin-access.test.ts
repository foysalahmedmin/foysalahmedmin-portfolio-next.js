import {
  decideAdminAccess,
  getAdminSignInPath,
  getSafeAdminReturnPath,
  type AdminSessionClaims,
  type AdminSessionUser,
} from "@/lib/auth/admin-access";
import { describe, expect, it } from "vitest";

const USER_ID = "507f1f77bcf86cd799439011";
const ISSUED_AT = 1_700_000_000;

const claims = (
  overrides: Partial<AdminSessionClaims> = {}
): AdminSessionClaims => ({
  _id: USER_ID,
  role: "admin",
  iat: ISSUED_AT,
  ...overrides,
});

const user = (overrides: Partial<AdminSessionUser> = {}): AdminSessionUser => ({
  _id: USER_ID,
  name: "Admin",
  email: "admin@example.test",
  role: "admin",
  status: "in-progress",
  is_deleted: false,
  ...overrides,
});

describe("getSafeAdminReturnPath", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/projects", "/admin/projects"],
    [
      "/admin/articles?status=draft#results",
      "/admin/articles?status=draft#results",
    ],
  ])("accepts the local admin path %s", (value, expected) => {
    expect(getSafeAdminReturnPath(value)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    "",
    "admin/projects",
    "/projects",
    "/administrator",
    "/admin-signin",
    "/admin/signin",
    "/admin/signin/again",
    "//evil.example/admin",
    "https://evil.example/admin",
    "/admin\\@evil.example",
    "/admin%2f%2fevil.example",
    "/admin%5cevil.example",
    "/admin\u0000/projects",
  ])("rejects the unsafe return destination %s", (value) => {
    expect(getSafeAdminReturnPath(value)).toBe("/admin");
  });

  it("encodes a validated return path in the sign-in URL", () => {
    expect(getAdminSignInPath("/admin/projects?status=draft")).toBe(
      "/admin/signin?returnTo=%2Fadmin%2Fprojects%3Fstatus%3Ddraft"
    );
  });
});

describe("decideAdminAccess", () => {
  it.each(["admin", "super-admin"] as const)(
    "allows an active %s session",
    (role) => {
      expect(decideAdminAccess(claims({ role }), user({ role }))).toEqual({
        allowed: true,
        role,
      });
    }
  );

  it("rejects malformed token identity claims before consulting a user", () => {
    expect(
      decideAdminAccess(claims({ _id: "not-an-object-id" }), user())
    ).toEqual({ allowed: false, reason: "invalid-token-claims" });
  });

  it("rejects a non-admin token even when the user is now an admin", () => {
    expect(decideAdminAccess(claims({ role: "editor" }), user())).toEqual({
      allowed: false,
      reason: "token-role-not-allowed",
    });
  });

  it("rejects a missing user", () => {
    expect(decideAdminAccess(claims(), null)).toEqual({
      allowed: false,
      reason: "user-not-found",
    });
  });

  it("rejects a token issued for a different user", () => {
    expect(
      decideAdminAccess(claims(), user({ _id: "507f191e810c19729de860ea" }))
    ).toEqual({ allowed: false, reason: "user-mismatch" });
  });

  it.each([
    [user({ is_deleted: true }), "user-deleted"],
    [user({ status: "blocked" }), "user-blocked"],
    [user({ role: "editor" }), "user-role-not-allowed"],
  ] as const)("rejects an ineligible persisted user", (record, reason) => {
    expect(decideAdminAccess(claims(), record)).toEqual({
      allowed: false,
      reason,
    });
  });

  it("rejects access tokens issued before the latest password change", () => {
    expect(
      decideAdminAccess(
        claims(),
        user({ password_changed_at: new Date((ISSUED_AT + 1) * 1000) })
      )
    ).toEqual({ allowed: false, reason: "stale-token" });
  });

  it("allows a token issued after the latest password change", () => {
    expect(
      decideAdminAccess(
        claims(),
        user({ password_changed_at: new Date((ISSUED_AT - 1) * 1000) })
      )
    ).toEqual({ allowed: true, role: "admin" });
  });

  it("allows a password timestamp from the same JWT second", () => {
    expect(
      decideAdminAccess(
        claims(),
        user({ password_changed_at: new Date(ISSUED_AT * 1000 + 999) })
      )
    ).toEqual({ allowed: true, role: "admin" });
  });

  it("fails closed for an invalid password-change timestamp", () => {
    expect(
      decideAdminAccess(claims(), user({ password_changed_at: "invalid" }))
    ).toEqual({ allowed: false, reason: "invalid-password-change-date" });
  });
});
