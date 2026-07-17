import { ENV } from "@/config";
import { MFA_CHALLENGE_TTL_SECONDS } from "./mfa-security";

export const MFA_CHALLENGE_COOKIE = "admin_mfa_challenge";

type MfaCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  path: "/api/auth/mfa";
  maxAge: number;
  expires?: Date;
};

type MutableCookieStore = {
  set(name: string, value: string, options: MfaCookieOptions): unknown;
};

const baseOptions = (): Omit<MfaCookieOptions, "maxAge" | "expires"> => ({
  httpOnly: true,
  secure: ENV.environment === "production",
  sameSite: "strict",
  path: "/api/auth/mfa",
});

export const setMfaChallengeCookie = (
  cookieStore: MutableCookieStore,
  token: string,
  expiresAt: Date,
  now = Date.now()
): void => {
  const remaining = Math.max(
    0,
    Math.min(
      MFA_CHALLENGE_TTL_SECONDS,
      Math.floor((expiresAt.getTime() - now) / 1_000)
    )
  );
  cookieStore.set(MFA_CHALLENGE_COOKIE, token, {
    ...baseOptions(),
    maxAge: remaining,
  });
};

export const clearMfaChallengeCookie = (
  cookieStore: MutableCookieStore
): void => {
  cookieStore.set(MFA_CHALLENGE_COOKIE, "", {
    ...baseOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
};
