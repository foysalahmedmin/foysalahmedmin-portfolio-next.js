import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ENV } from "@/config";
import type { NextRequest, NextResponse } from "next/server";
import type { TPageRouteKey } from "./page.type";

export const PAGE_PREVIEW_COOKIE = "page_preview" as const;

type TPreviewPayload = Readonly<{
  v: 1;
  route_key: TPageRouteKey;
  page_id: string;
  revision: number;
  exp: number;
  nonce: string;
}>;

const secret = (): string => {
  const configured = ENV.page_preview_secret?.trim();
  const fallback =
    ENV.environment === "production" ? "" : ENV.session_secret?.trim();
  const value = configured || fallback;
  if (!value || value.length < 32)
    throw new Error("PAGE_PREVIEW_SECRET_UNAVAILABLE");
  return value;
};

export const getPagePreviewTtlSeconds = (): number => {
  const parsed = Number(ENV.page_preview_ttl_seconds ?? 600);
  return Number.isSafeInteger(parsed) && parsed >= 60 && parsed <= 900
    ? parsed
    : 600;
};

const encode = (payload: TPreviewPayload): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const signature = (encoded: string): string =>
  createHmac("sha256", secret())
    .update(`page-preview:v1\0${encoded}`)
    .digest("base64url");

const previewCookiePath = (routeKey: TPageRouteKey): string =>
  `/api/pages/${routeKey}/preview`;

export const setPagePreviewCookie = (
  response: NextResponse,
  input: { route_key: TPageRouteKey; page_id: string; revision: number },
  now = new Date()
): void => {
  const ttl = getPagePreviewTtlSeconds();
  const encoded = encode({
    v: 1,
    ...input,
    exp: Math.floor(now.getTime() / 1_000) + ttl,
    nonce: randomBytes(16).toString("base64url"),
  });
  response.cookies.set(
    PAGE_PREVIEW_COOKIE,
    `${encoded}.${signature(encoded)}`,
    {
      httpOnly: true,
      secure: ENV.environment === "production",
      sameSite: "strict",
      path: previewCookiePath(input.route_key),
      maxAge: ttl,
    }
  );
};

export const clearPagePreviewCookie = (
  response: NextResponse,
  routeKey: TPageRouteKey
): void => {
  response.cookies.set(PAGE_PREVIEW_COOKIE, "", {
    httpOnly: true,
    secure: ENV.environment === "production",
    sameSite: "strict",
    path: previewCookiePath(routeKey),
    maxAge: 0,
  });
};

export const verifyPagePreviewCookie = (
  request: NextRequest,
  routeKey: TPageRouteKey,
  now = new Date()
): TPreviewPayload | null => {
  const token = request.cookies.get(PAGE_PREVIEW_COOKIE)?.value;
  if (!token || token.length > 2_048) return null;
  const [encoded, supplied, ...extra] = token.split(".");
  if (!encoded || !supplied || extra.length) return null;
  let expected: string;
  try {
    expected = signature(encoded);
  } catch {
    return null;
  }
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<TPreviewPayload>;
    if (
      payload.v !== 1 ||
      payload.route_key !== routeKey ||
      !/^[a-f0-9]{24}$/i.test(payload.page_id ?? "") ||
      !Number.isSafeInteger(payload.revision) ||
      Number(payload.revision) < 1 ||
      !Number.isSafeInteger(payload.exp) ||
      Number(payload.exp) <= Math.floor(now.getTime() / 1_000) ||
      Number(payload.exp) > Math.floor(now.getTime() / 1_000) + 900 ||
      typeof payload.nonce !== "string" ||
      !/^[A-Za-z0-9_-]{16,64}$/.test(payload.nonce)
    )
      return null;
    return payload as TPreviewPayload;
  } catch {
    return null;
  }
};
