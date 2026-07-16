import { ENV } from "@/config";
import {
  assertBucketsAllowed,
  consumeAbuseBucket,
  getTrustedAuthClientIp,
  hashAbuseIdentifier,
} from "@/lib/security/abuse-control";
import AppError from "@/builder/app-error";

const MAX_AUTH_BODY_BYTES = 16_384;

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const assertTrustedAuthRequest = (request: Request): void => {
  const origin = request.headers.get("origin");
  const configuredOrigin = normalizeOrigin(ENV.url || request.url);
  const requestOrigin = normalizeOrigin(request.url);
  const allowed = new Set(
    [
      configuredOrigin,
      ENV.environment !== "production" ? requestOrigin : null,
    ].filter((value): value is string => Boolean(value))
  );
  if (!origin || !allowed.has(normalizeOrigin(origin) ?? "")) {
    throw new AppError(403, "This authentication request is not allowed.");
  }
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") {
    throw new AppError(403, "This authentication request is not allowed.");
  }
};

export const readTrustedAuthJson = async (
  request: Request
): Promise<unknown> => {
  assertTrustedAuthRequest(request);
  const mediaType =
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() ?? "";
  if (mediaType !== "application/json") {
    throw new AppError(415, "Submit authentication requests as JSON.");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      throw new AppError(400, "Invalid authentication request size.");
    }
    if (declared > MAX_AUTH_BODY_BYTES) {
      throw new AppError(413, "Authentication request is too large.");
    }
  }
  if (!request.body) {
    throw new AppError(400, "A JSON request body is required.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_AUTH_BODY_BYTES) {
      await reader.cancel();
      throw new AppError(413, "Authentication request is too large.");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new AppError(400, "The authentication request is not valid JSON.");
  }
};

export const prepareTrustedAuthJsonRequest = async <T extends Request>(
  request: T
): Promise<T & { parsedBody: unknown }> =>
  Object.assign(request, { parsedBody: await readTrustedAuthJson(request) });

const consume = async (
  entries: Array<{ key: string; limit: number; windowSeconds: number }>
): Promise<void> => {
  const results = await Promise.all(entries.map(consumeAbuseBucket));
  assertBucketsAllowed(results);
};

export const enforceSignInRateLimit = async (
  request: Request,
  normalizedEmail: string
): Promise<void> => {
  const ip = getTrustedAuthClientIp(request);
  const ipHash = hashAbuseIdentifier("auth-ip", ip);
  const accountHash = hashAbuseIdentifier("auth-account", normalizedEmail);
  await consume([
    {
      key: `auth:signin:pair:${ipHash}:${accountHash}`,
      limit: 5,
      windowSeconds: 10 * 60,
    },
    {
      key: `auth:signin:ip:${ipHash}`,
      limit: 30,
      windowSeconds: 60 * 60,
    },
  ]);
};

export const enforceRefreshRateLimit = async (
  request: Request,
  familyId: string
): Promise<void> => {
  const ip = getTrustedAuthClientIp(request);
  const ipHash = hashAbuseIdentifier("auth-ip", ip);
  const familyHash = hashAbuseIdentifier("auth-family", familyId);
  await consume([
    {
      key: `auth:refresh:family:${familyHash}`,
      limit: 20,
      windowSeconds: 60,
    },
    {
      key: `auth:refresh:ip:${ipHash}`,
      limit: 60,
      windowSeconds: 10 * 60,
    },
  ]);
};

export const enforceRecoveryRateLimit = async (
  request: Request,
  discriminator: string
): Promise<void> => {
  const ip = getTrustedAuthClientIp(request);
  const ipHash = hashAbuseIdentifier("auth-ip", ip);
  const discriminatorHash = hashAbuseIdentifier("auth-recovery", discriminator);
  await consume([
    {
      key: `auth:recovery:pair:${ipHash}:${discriminatorHash}`,
      limit: 3,
      windowSeconds: 60 * 60,
    },
    {
      key: `auth:recovery:ip:${ipHash}`,
      limit: 15,
      windowSeconds: 60 * 60,
    },
  ]);
};
