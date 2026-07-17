import {
  clearMfaChallengeCookie,
  MFA_CHALLENGE_COOKIE,
  setMfaChallengeCookie,
} from "@/lib/auth/mfa-cookies";
import { describe, expect, it, vi } from "vitest";

describe("MFA challenge cookie", () => {
  it("is opaque, HttpOnly, strict-site, short-lived, and endpoint-scoped", () => {
    const set = vi.fn();
    const now = Date.parse("2026-07-17T12:00:00.000Z");
    setMfaChallengeCookie(
      { set },
      "opaque-pre-auth-token",
      new Date(now + 5 * 60_000),
      now
    );

    expect(set).toHaveBeenCalledWith(
      MFA_CHALLENGE_COOKIE,
      "opaque-pre-auth-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/api/auth/mfa",
        maxAge: 300,
      })
    );
  });

  it("clears with the exact same cookie scope", () => {
    const set = vi.fn();
    clearMfaChallengeCookie({ set });
    expect(set).toHaveBeenCalledWith(
      MFA_CHALLENGE_COOKIE,
      "",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "strict",
        path: "/api/auth/mfa",
        maxAge: 0,
        expires: new Date(0),
      })
    );
  });
});
