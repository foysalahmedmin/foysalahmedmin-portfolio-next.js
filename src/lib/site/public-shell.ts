import type {
  TPublicSiteDto,
  TSiteLink,
  TSiteSocialLink,
} from "@/app/api/site/site.type";

export type TPublicShellLink = Readonly<{
  key: string;
  label: string;
  href: string;
  external: boolean;
}>;

const emergencyNavigation: readonly TPublicShellLink[] = [
  { key: "home", label: "Home", href: "/", external: false },
  { key: "about", label: "About", href: "/about", external: false },
  {
    key: "projects",
    label: "Projects",
    href: "/projects",
    external: false,
  },
  {
    key: "case-studies",
    label: "Case studies",
    href: "/case-studies",
    external: false,
  },
  {
    key: "articles",
    label: "Articles",
    href: "/articles",
    external: false,
  },
  { key: "videos", label: "Videos", href: "/videos", external: false },
  { key: "contact", label: "Contact", href: "/contact", external: false },
];

const isSafeInternalHref = (value: string): boolean =>
  (value.startsWith("/") && !value.startsWith("//")) ||
  /^#[a-z][a-z0-9_-]*$/i.test(value);

const isSafeExternalHref = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
};

export const resolvePublicSiteLink = (
  link: TSiteLink,
  site: TPublicSiteDto
): TPublicShellLink | null => {
  if (!link.enabled || !link.label.trim()) return null;

  let href = link.href?.trim();
  if (link.kind === "email" && site.contact.public_email) {
    href = `mailto:${site.contact.public_email}`;
  } else if (link.kind === "phone" && site.contact.public_phone) {
    href = `tel:${site.contact.public_phone}`;
  } else if (link.kind === "resume") {
    href = site.brand.resume?.url;
  }
  if (!href) return null;

  const isCommunication = href.startsWith("mailto:") || href.startsWith("tel:");
  const internal = isSafeInternalHref(href);
  const external = isSafeExternalHref(href) || isCommunication;
  if (!internal && !external) return null;

  return {
    key: link.key,
    label: link.label,
    href,
    external: !internal,
  };
};

const uniqueLinks = (links: readonly TPublicShellLink[]) => {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
};

/**
 * The library pages the site always has. A Site document written before they existed does not list them,
 * which left Videos and Case studies unreachable from the header. They are added after the page they
 * belong beside, unless the document already names them (a link the owner turned off stays off).
 */
const CORE_MODULE_LINKS = [
  {
    key: "case-studies",
    label: "Case studies",
    href: "/case-studies",
    after: "/projects",
  },
  { key: "videos", label: "Videos", href: "/videos", after: "/articles" },
] as const;

const withCoreModuleLinks = (
  links: readonly TPublicShellLink[],
  declared: readonly { key: string; href?: string }[]
): readonly TPublicShellLink[] => {
  const next = [...links];
  for (const core of CORE_MODULE_LINKS) {
    if (
      declared.some(
        (entry) => entry.key === core.key || entry.href === core.href
      )
    ) {
      continue;
    }
    const index = next.findIndex((link) => link.href === core.after);
    next.splice(index === -1 ? next.length : index + 1, 0, {
      key: core.key,
      label: core.label,
      href: core.href,
      external: false,
    });
  }
  return next;
};

export const getPublicShellLinks = (
  site: TPublicSiteDto,
  location: "header" | "footer" | "legal"
): readonly TPublicShellLink[] => {
  const declared = site.navigation[location];
  const links = uniqueLinks(
    declared
      .map((link) => resolvePublicSiteLink(link, site))
      .filter((link): link is TPublicShellLink => Boolean(link))
  );
  if (links.length || site.content_source === "published") {
    return location === "legal" || links.length === 0
      ? links
      : withCoreModuleLinks(links, declared);
  }
  if (location === "legal") {
    return [
      { key: "privacy", label: "Privacy", href: "/privacy", external: false },
      { key: "terms", label: "Terms", href: "/terms", external: false },
    ];
  }
  return emergencyNavigation;
};

export const getPrimaryPublicCta = (
  site: TPublicSiteDto
): TPublicShellLink | null => {
  const resolved = site.primary_ctas
    .map((link) => resolvePublicSiteLink(link, site))
    .find((link): link is TPublicShellLink => Boolean(link));
  if (resolved) return resolved;
  return site.content_source === "emergency"
    ? {
        key: "contact",
        label: "Start a conversation",
        href: "/contact",
        external: false,
      }
    : null;
};

export const getPublicSocialLinks = (
  links: readonly TSiteSocialLink[]
): readonly TPublicShellLink[] =>
  uniqueLinks(
    links
      .filter((link) => link.enabled && isSafeExternalHref(link.url))
      .map((link) => ({
        key: link.key,
        label: link.label,
        href: link.url,
        external: true,
      }))
  );
