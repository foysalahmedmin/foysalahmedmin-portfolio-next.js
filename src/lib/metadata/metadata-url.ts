import type { TPublicSiteDto } from "@/app/api/site/site.type";

const METADATA_PATH_ORIGIN = "https://metadata.invalid";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const BLOCKED_PUBLIC_ROUTE = /^\/(?:admin|api|auth|preview|_next)(?:\/|$)/i;

const isPrivateIpv4 = (hostname: string): boolean => {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second !== undefined && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

const isPrivateIpv6 = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!normalized.includes(":")) return false;

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:0:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
};

export const parsePublicHttpsUrl = (value: string): URL | null => {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      isPrivateIpv4(hostname) ||
      isPrivateIpv6(hostname)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};

const decodePath = (value: string): string | null => {
  let decoded = value;
  try {
    for (let pass = 0; pass < 3; pass += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    return decoded;
  } catch {
    return null;
  }
};

export const normalizePublicRoutePath = (value: string): string | null => {
  const raw = value.trim();
  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    CONTROL_CHARACTERS.test(raw)
  ) {
    return null;
  }

  const decoded = decodePath(raw);
  if (
    !decoded ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    CONTROL_CHARACTERS.test(decoded)
  ) {
    return null;
  }

  try {
    const parsed = new URL(decoded, METADATA_PATH_ORIGIN);
    if (parsed.origin !== METADATA_PATH_ORIGIN) return null;

    const pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    if (BLOCKED_PUBLIC_ROUTE.test(pathname)) return null;
    return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
};

const normalizeBasePath = (pathname: string): string => {
  const normalized = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
};

export const resolveMetadataBase = (site: TPublicSiteDto): URL | undefined => {
  if (site.content_source !== "published") return undefined;

  const candidate = site.seo.canonical_url ?? site.identity.canonical_url;
  if (!candidate) return undefined;

  const url = parsePublicHttpsUrl(candidate);
  if (!url) return undefined;

  url.hash = "";
  url.search = "";
  const basePath = normalizeBasePath(url.pathname);
  url.pathname = basePath === "/" ? "/" : `${basePath}/`;
  return url;
};

export const buildCanonicalUrl = (
  site: TPublicSiteDto,
  routePath: string
): string | undefined => {
  const metadataBase = resolveMetadataBase(site);
  const normalizedRoute = normalizePublicRoutePath(routePath);
  if (!metadataBase || !normalizedRoute) return undefined;

  const canonical = new URL(metadataBase.toString());
  const basePath = canonical.pathname.replace(/\/+$/, "");
  canonical.pathname =
    normalizedRoute === "/" ? basePath || "/" : `${basePath}${normalizedRoute}`;
  canonical.search = "";
  canonical.hash = "";
  return canonical.toString();
};

export const normalizeMetadataMediaUrl = (
  value: string
): string | undefined => {
  const raw = value.trim();
  if (!raw || raw.includes("\\") || CONTROL_CHARACTERS.test(raw)) {
    return undefined;
  }

  if (raw.startsWith("/")) {
    if (raw.startsWith("//")) return undefined;
    const decoded = decodePath(raw);
    if (
      !decoded ||
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      CONTROL_CHARACTERS.test(decoded)
    ) {
      return undefined;
    }
    return raw;
  }

  const url = parsePublicHttpsUrl(raw);
  if (!url) return undefined;
  url.hash = "";
  return url.toString();
};
