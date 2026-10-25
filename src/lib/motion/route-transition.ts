/**
 * Which clicks the route shutter (M18) takes over. Only a plain left-click on an internal link to a
 * different page qualifies: modified clicks, new-tab links, downloads, files, the admin, the API and
 * same-page links (query or hash changes) are left to the browser and Next.js untouched.
 */
export type TransitionCandidate = Readonly<{
  event: Readonly<{
    button: number;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    defaultPrevented: boolean;
  }>;
  anchor: Readonly<{
    href: string;
    target: string;
    download: boolean;
    rel: string;
    optOut: boolean;
  }>;
  location: Readonly<{ href: string }>;
}>;

const EXCLUDED_PREFIXES = ["/admin", "/api", "/_next"] as const;

export function resolveTransitionTarget({
  event,
  anchor,
  location,
}: TransitionCandidate): string | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.optOut ||
    anchor.download ||
    (anchor.target && anchor.target !== "_self") ||
    /\bexternal\b/.test(anchor.rel)
  ) {
    return null;
  }

  let url: URL;
  let current: URL;
  try {
    current = new URL(location.href);
    url = new URL(anchor.href, current);
  } catch {
    return null;
  }

  if (url.origin !== current.origin || url.pathname === current.pathname) {
    return null;
  }
  if (
    EXCLUDED_PREFIXES.some(
      (prefix) =>
        url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }
  // A dot in the last segment is a file (sitemap.xml, a PDF), not a page
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}
