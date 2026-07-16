import { logServerEvent } from "@/lib/observability/request-context";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4_096;
const enabled = process.env.NEXT_PUBLIC_WEB_VITALS_ENABLED === "true";

const metricSchema = z
  .object({
    name: z.enum(["CLS", "FCP", "INP", "LCP", "TTFB"]),
    value: z.number().finite().min(0).max(1_000_000_000),
    delta: z.number().finite().min(0).max(1_000_000_000),
    rating: z.enum(["good", "needs-improvement", "poor"]),
    navigation_type: z
      .enum([
        "navigate",
        "reload",
        "back-forward",
        "back-forward-cache",
        "prerender",
        "restore",
      ])
      .optional(),
    route_class: z.enum([
      "home",
      "projects-list",
      "project-detail",
      "articles-list",
      "article-detail",
      "contact",
      "admin",
      "public-other",
    ]),
    device_class: z.enum(["mobile", "desktop"]),
    release: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9._-]{1,64}$/),
  })
  .strict();

const readBoundedJson = async (request: Request): Promise<unknown> => {
  if (!request.body) throw new Error("missing_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("oversized_body");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
};

export async function POST(request: Request) {
  if (!enabled) return new NextResponse(null, { status: 404 });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isSafeInteger(declared) || declared < 0 || declared > MAX_BYTES) {
    return new NextResponse(null, { status: 413 });
  }
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim();
  if (mediaType !== "application/json") {
    return new NextResponse(null, { status: 415 });
  }
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403 });
  }
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") {
    return new NextResponse(null, { status: 403 });
  }

  try {
    const metric = metricSchema.parse(await readBoundedJson(request));
    logServerEvent("info", "web.vital.measured", {
      metric: metric.name,
      value: metric.value,
      delta: metric.delta,
      rating: metric.rating,
      navigation_type: metric.navigation_type,
      route_class: metric.route_class,
      device_class: metric.device_class,
      release: metric.release,
    });
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
