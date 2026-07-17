import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signin: vi.fn(),
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
  setMfaChallengeCookie: vi.fn(),
  clearMfaChallengeCookie: vi.fn(),
  assertTrustedAuthRequest: vi.fn(),
  enforceSignInRateLimit: vi.fn(),
  cookieStore: { get: vi.fn(), set: vi.fn() },
}));

vi.mock("next/headers", () => ({
  cookies: async () => mocks.cookieStore,
}));
vi.mock("@/app/api/auth/auth.service", () => ({
  signin: mocks.signin,
  toSafeSessionDTO: vi.fn(),
}));
vi.mock("@/app/api/auth/mfa.service", () => ({
  completeEnrollment: vi.fn(),
  verifyChallenge: vi.fn(),
}));
vi.mock("@/lib/auth/auth-cookies", () => ({
  ACCESS_TOKEN_COOKIE: "access_token",
  REFRESH_TOKEN_COOKIE: "refresh_token",
  setAuthCookies: mocks.setAuthCookies,
  clearAuthCookies: mocks.clearAuthCookies,
}));
vi.mock("@/lib/auth/mfa-cookies", () => ({
  MFA_CHALLENGE_COOKIE: "admin_mfa_challenge",
  setMfaChallengeCookie: mocks.setMfaChallengeCookie,
  clearMfaChallengeCookie: mocks.clearMfaChallengeCookie,
}));
vi.mock("@/lib/auth/auth-request-security", () => ({
  assertTrustedAuthRequest: mocks.assertTrustedAuthRequest,
  enforceSignInRateLimit: mocks.enforceSignInRateLimit,
  enforceMfaRateLimit: vi.fn(),
  enforceRefreshRateLimit: vi.fn(),
  enforceRecoveryRateLimit: vi.fn(),
}));
vi.mock("@/lib/auth/session-manager", () => ({
  revokeTokenSession: vi.fn(),
}));

import { signin } from "@/app/api/auth/auth.controller";

describe("password-authenticated MFA boundary", () => {
  beforeEach(() => {
    mocks.signin.mockResolvedValue({
      kind: "mfa-challenge",
      challenge_token: "opaque-cookie-only-value",
      expires_at: new Date("2026-07-17T12:05:00.000Z"),
      prompt: {
        required: true,
        stage: "verify",
        expires_at: "2026-07-17T12:05:00.000Z",
      },
    });
  });

  it("returns 202 and never mints auth cookies before the second factor", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/signin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.test",
        password: "not-logged-or-returned",
      }),
    });
    const response = await signin(request);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(mocks.setAuthCookies).not.toHaveBeenCalled();
    expect(mocks.clearAuthCookies).toHaveBeenCalledWith(mocks.cookieStore);
    expect(mocks.clearMfaChallengeCookie).toHaveBeenCalledWith(
      mocks.cookieStore
    );
    expect(mocks.setMfaChallengeCookie).toHaveBeenCalledWith(
      mocks.cookieStore,
      "opaque-cookie-only-value",
      new Date("2026-07-17T12:05:00.000Z")
    );
    expect(JSON.stringify(payload)).not.toContain("opaque-cookie-only-value");
    expect(JSON.stringify(payload)).not.toContain("not-logged-or-returned");
  });
});
