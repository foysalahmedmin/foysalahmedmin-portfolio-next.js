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
    key: "articles",
    label: "Articles",
    href: "/articles",
    external: false,
  },
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

export const getPublicShellLinks = (
  site: TPublicSiteDto,
  location: "header" | "footer" | "legal"
): readonly TPublicShellLink[] => {
  const links = uniqueLinks(
    site.navigation[location]
      .map((link) => resolvePublicSiteLink(link, site))
      .filter((link): link is TPublicShellLink => Boolean(link))
  );
  if (links.length || site.content_source === "published") return links;
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
