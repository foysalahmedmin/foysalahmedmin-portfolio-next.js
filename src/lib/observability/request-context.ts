import { randomUUID } from "node:crypto";

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export const getCorrelationId = (request?: Request): string => {
  const supplied = request?.headers.get("x-correlation-id")?.trim();
  return supplied && CORRELATION_ID_PATTERN.test(supplied)
    ? supplied
    : randomUUID();
};

type SafeLogValue = string | number | boolean | null | undefined;

const normalizeLogValue = (value: SafeLogValue): SafeLogValue => {
  if (typeof value === "string")
    return value.replace(/[\r\n\t]/g, " ").slice(0, 200);
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  return value;
};

export const logServerEvent = (
  level: "info" | "warn" | "error",
  event: string,
  metadata: Readonly<Record<string, SafeLogValue>> = {}
): void => {
  const safeEvent = /^[a-z][a-z0-9_.-]{2,63}$/.test(event)
    ? event
    : "server.event";
  const safeMetadata = Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => /^[a-z][a-z0-9_]{0,63}$/.test(key))
      .slice(0, 24)
      .map(([key, value]) => [key, normalizeLogValue(value)])
      .filter((entry) => entry[1] !== undefined)
  );
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: safeEvent,
    ...safeMetadata,
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
};

export const getSafeRequestPath = (request?: Request): string | undefined => {
  if (!request) return undefined;
  try {
    return new URL(request.url).pathname.slice(0, 200);
  } catch {
    return undefined;
  }
};
