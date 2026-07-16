import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { ENV } from "@/config";
import type { ContactSubmission } from "./contact-public.contract";

const DEFAULT_MAX_BODY_BYTES = 16_384;
const DEFAULT_MIN_FILL_TIME_MS = 1_500;
const DEFAULT_MAX_FILL_TIME_MS = 7_200_000;
const DEFAULT_RATE_LIMIT = 5;
const DEFAULT_RATE_WINDOW_SECONDS = 600;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{20,128}$/;
const SESSION_KEY_PATTERN = /^[A-Za-z0-9._:-]{20,128}$/;

type ContactSecurityCode =
  | "invalid_request"
  | "invalid_submission"
  | "origin_rejected"
  | "rate_limited"
  | "temporarily_unavailable";

export class ContactSecurityError extends Error {
  readonly status: number;
  readonly code: ContactSecurityCode;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: ContactSecurityCode,
    message: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "ContactSecurityError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const boundedInteger = (
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
};

export const getContactSecurityConfig = () => ({
  maxBodyBytes: boundedInteger(
    ENV.contact_max_body_bytes,
    DEFAULT_MAX_BODY_BYTES,
    1_024,
    64_000
  ),
  minFillTimeMs: boundedInteger(
    ENV.contact_min_fill_time_ms,
    DEFAULT_MIN_FILL_TIME_MS,
    0,
    30_000
  ),
  maxFillTimeMs: boundedInteger(
    ENV.contact_max_fill_time_ms,
    DEFAULT_MAX_FILL_TIME_MS,
    60_000,
    86_400_000
  ),
  rateLimit: boundedInteger(ENV.contact_rate_limit, DEFAULT_RATE_LIMIT, 1, 100),
  rateWindowSeconds: boundedInteger(
    ENV.contact_rate_window_seconds,
    DEFAULT_RATE_WINDOW_SECONDS,
    60,
    86_400
  ),
  trustedProxyHops: boundedInteger(ENV.contact_trusted_proxy_hops, 0, 0, 10),
});

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const getAllowedContactOrigins = (requestUrl: string): Set<string> => {
  const configured = [
    ENV.url,
    ...(ENV.contact_allowed_origins ?? "").split(","),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value));

  if (ENV.environment !== "production") {
    const requestOrigin = normalizeOrigin(requestUrl);
    if (requestOrigin) configured.push(requestOrigin);
  }

  return new Set(configured);
};

export const assertTrustedContactRequest = (request: Request): void => {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const mediaType = contentType.split(";", 1)[0]?.trim();
  if (mediaType !== "application/json") {
    throw new ContactSecurityError(
      415,
      "invalid_request",
      "Submit the form as JSON."
    );
  }

  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedContactOrigins(request.url);
  if (!origin || !allowedOrigins.has(normalizeOrigin(origin) ?? "")) {
    throw new ContactSecurityError(
      403,
      "origin_rejected",
      "This submission origin is not allowed."
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") {
    throw new ContactSecurityError(
      403,
      "origin_rejected",
      "This submission origin is not allowed."
    );
  }

  const fetchMode = request.headers.get("sec-fetch-mode")?.toLowerCase();
  if (fetchMode && !["cors", "same-origin"].includes(fetchMode)) {
    throw new ContactSecurityError(
      403,
      "origin_rejected",
      "This request mode is not allowed."
    );
  }
};

export const readContactJsonBody = async (
  request: Request
): Promise<unknown> => {
  const { maxBodyBytes } = getContactSecurityConfig();
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (!Number.isFinite(declaredLength) || declaredLength > maxBodyBytes) {
      throw new ContactSecurityError(
        413,
        "invalid_request",
        "The submission is too large."
      );
    }
  }

  if (!request.body) {
    throw new ContactSecurityError(
      400,
      "invalid_request",
      "The request body is not valid JSON."
    );
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBodyBytes) {
      await reader.cancel();
      throw new ContactSecurityError(
        413,
        "invalid_request",
        "The submission is too large."
      );
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ContactSecurityError(
      400,
      "invalid_request",
      "The request body is not valid JSON."
    );
  }
};

export const assertContactTimingAndHoneypot = (
  submission: ContactSubmission,
  now = Date.now()
): void => {
  const { minFillTimeMs, maxFillTimeMs } = getContactSecurityConfig();
  const elapsed = now - submission.form_started_at;

  if (
    submission.company_website ||
    elapsed < minFillTimeMs ||
    elapsed > maxFillTimeMs
  ) {
    throw new ContactSecurityError(
      422,
      "invalid_submission",
      "The submission could not be accepted. Please refresh and try again."
    );
  }
};

export const getIdempotencyKey = (request: Request): string => {
  const key = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw new ContactSecurityError(
      400,
      "invalid_request",
      "A valid submission key is required."
    );
  }
  return key;
};

export const getContactSessionKey = (request: Request): string => {
  const sessionKey = request.headers.get("x-contact-session")?.trim() ?? "";
  return SESSION_KEY_PATTERN.test(sessionKey) ? sessionKey : "anonymous";
};

const getAbuseSecret = (): string => {
  const secret =
    ENV.contact_abuse_secret?.trim() ||
    (ENV.environment === "production" ? "" : ENV.session_secret?.trim());
  if (!secret || (ENV.environment === "production" && secret.length < 32)) {
    throw new ContactSecurityError(
      503,
      "temporarily_unavailable",
      "The contact service is temporarily unavailable."
    );
  }
  return secret;
};

export const hmacContactValue = (namespace: string, value: string): string =>
  createHmac("sha256", getAbuseSecret())
    .update(`${namespace}\0${value}`, "utf8")
    .digest("hex");

export const safeHashEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const parseForwardedIp = (
  value: string | null,
  trustedProxyHops: number
): string | null => {
  if (!value) return null;
  const addresses = value
    .split(",")
    .map((entry) => entry.trim().replace(/^\[|\]$/g, ""))
    .filter(Boolean);
  const selected = addresses[addresses.length - 1 - trustedProxyHops];
  return selected && isIP(selected) ? selected : null;
};

export const getTrustedClientIp = (request: Request): string => {
  const { trustedProxyHops } = getContactSecurityConfig();
  const configuredHeader = ENV.contact_client_ip_header?.trim().toLowerCase();
  const headerName = configuredHeader || "x-forwarded-for";
  const rawValue = request.headers.get(headerName);

  const ip =
    headerName === "x-forwarded-for"
      ? parseForwardedIp(rawValue, trustedProxyHops)
      : rawValue && isIP(rawValue.trim())
        ? rawValue.trim()
        : null;

  return ip ?? "unknown";
};

type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

type LocalBucket = { count: number; resetAt: number };
const localRateBuckets = new Map<string, LocalBucket>();

export const clearLocalContactRateLimitsForTests = (): void => {
  if (ENV.environment === "production") return;
  localRateBuckets.clear();
};

const consumeLocalBucket = (
  key: string,
  limit: number,
  windowSeconds: number,
  now = Date.now()
): RateLimitResult => {
  const existing = localRateBuckets.get(key);
  const resetAt = now + windowSeconds * 1_000;
  const bucket =
    !existing || existing.resetAt <= now ? { count: 0, resetAt } : existing;
  bucket.count += 1;
  localRateBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
};

const consumeUpstashBucket = async (
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> => {
  const url = ENV.upstash_redis_rest_url?.replace(/\/$/, "");
  const token = ENV.upstash_redis_rest_token;
  if (!url || !token) {
    throw new ContactSecurityError(
      503,
      "temporarily_unavailable",
      "The contact service is temporarily unavailable."
    );
  }

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSeconds, "NX"],
        ["TTL", key],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) throw new Error("rate_limit_provider_failed");

    const result = (await response.json()) as Array<{
      result?: number;
      error?: string;
    }>;
    if (result.some((entry) => entry.error)) {
      throw new Error("rate_limit_provider_failed");
    }

    const count = Number(result[0]?.result);
    const ttl = Number(result[2]?.result);
    if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
      throw new Error("rate_limit_provider_failed");
    }

    return {
      allowed: count <= limit,
      retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : windowSeconds),
    };
  } catch (error) {
    if (error instanceof ContactSecurityError) throw error;
    throw new ContactSecurityError(
      503,
      "temporarily_unavailable",
      "The contact service is temporarily unavailable."
    );
  }
};

export const enforceContactRateLimit = async (
  request: Request
): Promise<void> => {
  const { rateLimit, rateWindowSeconds } = getContactSecurityConfig();
  const clientIp = getTrustedClientIp(request);
  if (ENV.environment === "production" && clientIp === "unknown") {
    throw new ContactSecurityError(
      503,
      "temporarily_unavailable",
      "The contact service is temporarily unavailable."
    );
  }
  const suppliedSessionKey = getContactSessionKey(request);
  const sessionKey =
    suppliedSessionKey === "anonymous"
      ? `missing-session:${clientIp}`
      : suppliedSessionKey;
  const bucketKeys = [
    `contact:ip:${hmacContactValue("contact-ip", clientIp)}`,
    `contact:session:${hmacContactValue("contact-session", sessionKey)}`,
  ];
  const useDistributedStore = ENV.environment === "production";
  const results = await Promise.all(
    bucketKeys.map((key) =>
      useDistributedStore
        ? consumeUpstashBucket(key, rateLimit, rateWindowSeconds)
        : Promise.resolve(consumeLocalBucket(key, rateLimit, rateWindowSeconds))
    )
  );

  const blocked = results.find((result) => !result.allowed);
  if (blocked) {
    throw new ContactSecurityError(
      429,
      "rate_limited",
      "Too many submissions. Please wait before trying again.",
      blocked.retryAfterSeconds
    );
  }
};

export const enforceContactPrivacyRateLimit = async (
  request: Request,
  phase: "request" | "confirm",
  discriminator: string
): Promise<void> => {
  const clientIp = getTrustedClientIp(request);
  if (ENV.environment === "production" && clientIp === "unknown") {
    throw new ContactSecurityError(
      503,
      "temporarily_unavailable",
      "The contact privacy service is temporarily unavailable."
    );
  }
  const windowSeconds = phase === "request" ? 60 * 60 : 15 * 60;
  const pairLimit = phase === "request" ? 3 : 8;
  const ipLimit = phase === "request" ? 15 : 30;
  const ipHash = hmacContactValue("contact-privacy-ip", clientIp);
  const subjectHash = hmacContactValue(
    `contact-privacy-${phase}`,
    discriminator
  );
  const bucketInputs = [
    {
      key: `contact:privacy:${phase}:pair:${ipHash}:${subjectHash}`,
      limit: pairLimit,
    },
    { key: `contact:privacy:${phase}:ip:${ipHash}`, limit: ipLimit },
  ];
  const results = await Promise.all(
    bucketInputs.map(({ key, limit }) =>
      ENV.environment === "production"
        ? consumeUpstashBucket(key, limit, windowSeconds)
        : Promise.resolve(consumeLocalBucket(key, limit, windowSeconds))
    )
  );
  const blocked = results.find((result) => !result.allowed);
  if (blocked) {
    throw new ContactSecurityError(
      429,
      "rate_limited",
      "Too many privacy requests. Please wait before trying again.",
      blocked.retryAfterSeconds
    );
  }
};
