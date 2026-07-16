import {
  getCorrelationId,
  logServerEvent,
} from "@/lib/observability/request-context";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REPORT_BYTES = 16_384;

const safeToken = (value: unknown, maximum = 160): string | undefined =>
  typeof value === "string"
    ? value.replace(/[\r\n\t]/g, " ").slice(0, maximum)
    : undefined;

const safeOrigin = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
};

const readBoundedText = async (request: Request): Promise<string | null> => {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REPORT_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request);
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (
    !Number.isSafeInteger(declared) ||
    declared < 0 ||
    declared > MAX_REPORT_BYTES
  ) {
    return new NextResponse(null, { status: 413 });
  }

  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim();
  if (
    !mediaType ||
    ![
      "application/csp-report",
      "application/reports+json",
      "application/json",
    ].includes(mediaType)
  ) {
    return new NextResponse(null, { status: 415 });
  }

  const text = await readBoundedText(request);
  if (text === null) {
    return new NextResponse(null, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const nested = record["csp-report"];
  const report =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : record;

  logServerEvent("warn", "browser.csp.violation", {
    correlation_id: correlationId,
    document_origin: safeOrigin(report["document-uri"] ?? report.url),
    blocked_origin: safeOrigin(report["blocked-uri"]),
    directive: safeToken(
      report["effective-directive"] ?? report["violated-directive"],
      80
    ),
    disposition: safeToken(report.disposition, 24),
  });

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "X-Correlation-Id": correlationId,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
