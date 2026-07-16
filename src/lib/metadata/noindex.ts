import type { TPublicSiteDto } from "@/app/api/site/site.type";
import type { Metadata } from "next";

export type TNoIndexReason =
  | "admin"
  | "auth"
  | "preview"
  | "error_only"
  | "indexing_disabled"
  | "unpublished";

export const NOINDEX_ROBOTS_CONTENT =
  "noindex, nofollow, noarchive, noimageindex, nosnippet";

const noIndexRobots = (): NonNullable<Metadata["robots"]> => ({
  index: false,
  follow: false,
  nocache: true,
  noarchive: true,
  noimageindex: true,
  nosnippet: true,
  googleBot: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    noimageindex: true,
    nosnippet: true,
  },
});

const indexRobots = (): NonNullable<Metadata["robots"]> => ({
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
});

const normalizePolicyPath = (value: string): string => {
  let pathname = value.trim().split(/[?#]/, 1)[0] ?? "/";
  try {
    for (let pass = 0; pass < 3; pass += 1) {
      const decoded = decodeURIComponent(pathname);
      if (decoded === pathname) break;
      pathname = decoded;
    }
  } catch {
    return "/error";
  }

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  pathname = pathname.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
};

export const getNoIndexReason = (
  routePath: string
): TNoIndexReason | undefined => {
  const pathname = normalizePolicyPath(routePath).toLowerCase();
  if (
    /^\/admin\/(?:signin|forgot-password|reset-password)(?:\/|$)/.test(
      pathname
    ) ||
    /^\/(?:auth|signin|login|forgot-password|reset-password)(?:\/|$)/.test(
      pathname
    )
  ) {
    return "auth";
  }
  if (/^\/admin(?:\/|$)/.test(pathname)) return "admin";
  if (/^\/(?:api\/)?preview(?:\/|$)/.test(pathname)) return "preview";
  if (/^\/(?:_?error|_?not-found|404|500)(?:\/|$)/.test(pathname)) {
    return "error_only";
  }
  return undefined;
};

export const resolveNoIndexReason = (
  site: TPublicSiteDto,
  routePath: string
): TNoIndexReason | undefined => {
  const routeReason = getNoIndexReason(routePath);
  if (routeReason) return routeReason;
  if (site.content_source !== "published") return "unpublished";
  if (!site.seo.allow_indexing) return "indexing_disabled";
  return undefined;
};

export const buildRobotsPolicy = (
  site: TPublicSiteDto,
  routePath: string
): NonNullable<Metadata["robots"]> =>
  resolveNoIndexReason(site, routePath) ? noIndexRobots() : indexRobots();

export const buildNoIndexMetadata = (
  metadata: Omit<Metadata, "robots"> = {}
): Metadata => ({
  ...metadata,
  robots: noIndexRobots(),
});
