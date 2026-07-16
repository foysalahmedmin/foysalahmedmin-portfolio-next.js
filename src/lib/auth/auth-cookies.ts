import type { AuthTokenPair } from "./session-manager";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge?: number;
  expires?: Date;
};

type MutableCookieStore = {
  set(name: string, value: string, options: CookieOptions): unknown;
};

const baseCookieOptions = (): Omit<CookieOptions, "maxAge" | "expires"> => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

const maxAgeUntil = (expiry: Date, now = Date.now()): number =>
  Math.max(0, Math.floor((expiry.getTime() - now) / 1_000));

export const setAuthCookies = (
  cookieStore: MutableCookieStore,
  tokens: AuthTokenPair
): void => {
  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...baseCookieOptions(),
    maxAge: maxAgeUntil(tokens.access_expires_at),
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
    ...baseCookieOptions(),
    maxAge: maxAgeUntil(tokens.refresh_expires_at),
  });
};

export const clearAuthCookies = (cookieStore: MutableCookieStore): void => {
  const expired = { ...baseCookieOptions(), maxAge: 0, expires: new Date(0) };
  cookieStore.set(ACCESS_TOKEN_COOKIE, "", expired);
  cookieStore.set(REFRESH_TOKEN_COOKIE, "", expired);
};
