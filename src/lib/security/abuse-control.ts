import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import AppError from "@/builder/app-error";
import { ENV } from "@/config";

export class AbuseControlError extends AppError {
  readonly code: "RATE_LIMITED" | "ABUSE_CONTROL_UNAVAILABLE";
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: "RATE_LIMITED" | "ABUSE_CONTROL_UNAVAILABLE",
    message: string,
    retryAfterSeconds?: number
  ) {
    super(status, message);
    this.name = "AbuseControlError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type BucketResult = { allowed: boolean; retryAfterSeconds: number };
type LocalBucket = { count: number; resetAt: number };
const localBuckets = new Map<string, LocalBucket>();

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

const getSecret = (): string => {
  const secret =
    ENV.auth_abuse_secret?.trim() ||
    (ENV.environment === "production" ? "" : ENV.session_secret?.trim());
  if (!secret || (ENV.environment === "production" && secret.length < 32)) {
    throw new AbuseControlError(
      503,
      "ABUSE_CONTROL_UNAVAILABLE",
      "Authentication is temporarily unavailable. Please try again later."
    );
  }
  return secret;
};

export const hashAbuseIdentifier = (namespace: string, value: string): string =>
  createHmac("sha256", getSecret())
    .update(`${namespace}\0${value}`, "utf8")
    .digest("hex");

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

export const getTrustedAuthClientIp = (request: Request): string => {
  const trustedProxyHops = boundedInteger(
    ENV.auth_trusted_proxy_hops,
    0,
    0,
    10
  );
  const headerName =
    ENV.auth_client_ip_header?.trim().toLowerCase() || "x-forwarded-for";
  const rawValue = request.headers.get(headerName);
  const ip =
    headerName === "x-forwarded-for"
      ? parseForwardedIp(rawValue, trustedProxyHops)
      : rawValue && isIP(rawValue.trim())
        ? rawValue.trim()
        : null;

  if (!ip && ENV.environment === "production") {
    throw new AbuseControlError(
      503,
      "ABUSE_CONTROL_UNAVAILABLE",
      "Authentication is temporarily unavailable. Please try again later."
    );
  }
  return ip ?? "unknown";
};

const consumeLocal = (
  key: string,
  limit: number,
  windowSeconds: number,
  now = Date.now()
): BucketResult => {
  const existing = localBuckets.get(key);
  const bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowSeconds * 1_000 }
      : existing;
  bucket.count += 1;
  localBuckets.set(key, bucket);
  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
};

const hasDistributedStore = (): boolean =>
  Boolean(
    ENV.upstash_redis_rest_url?.trim() && ENV.upstash_redis_rest_token?.trim()
  );

const consumeDistributed = async (
  key: string,
  limit: number,
  windowSeconds: number
): Promise<BucketResult> => {
  const url = ENV.upstash_redis_rest_url?.replace(/\/$/, "");
  const token = ENV.upstash_redis_rest_token;
  if (!url || !token) {
    throw new AbuseControlError(
      503,
      "ABUSE_CONTROL_UNAVAILABLE",
      "Authentication is temporarily unavailable. Please try again later."
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
    if (!response.ok) throw new Error("provider_failed");
    const result = (await response.json()) as Array<{
      result?: number;
      error?: string;
    }>;
    if (result.some(({ error }) => error)) throw new Error("provider_failed");
    const count = Number(result[0]?.result);
    const ttl = Number(result[2]?.result);
    if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
      throw new Error("provider_failed");
    }
    return {
      allowed: count <= limit,
      retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : windowSeconds),
    };
  } catch (error) {
    if (error instanceof AbuseControlError) throw error;
    throw new AbuseControlError(
      503,
      "ABUSE_CONTROL_UNAVAILABLE",
      "Authentication is temporarily unavailable. Please try again later."
    );
  }
};

// The distributed store is the authority whenever it is configured. Without it,
// or when it is unreachable, limits degrade to this process rather than taking
// authentication offline; a single instance still bounds credential stuffing.
export const consumeAbuseBucket = async (input: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<BucketResult> => {
  if (!hasDistributedStore()) {
    return consumeLocal(input.key, input.limit, input.windowSeconds);
  }
  try {
    return await consumeDistributed(
      input.key,
      input.limit,
      input.windowSeconds
    );
  } catch {
    return consumeLocal(input.key, input.limit, input.windowSeconds);
  }
};

export const clearLocalAbuseBucketsForTests = (): void => {
  if (ENV.environment !== "production") localBuckets.clear();
};

export const assertBucketsAllowed = (results: BucketResult[]): void => {
  const blocked = results.find(({ allowed }) => !allowed);
  if (blocked) {
    throw new AbuseControlError(
      429,
      "RATE_LIMITED",
      "Too many attempts. Please wait before trying again.",
      blocked.retryAfterSeconds
    );
  }
};
