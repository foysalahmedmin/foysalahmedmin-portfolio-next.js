import type { TPublicSiteDto } from "@/app/api/site/site.type";
import {
  formatSiteTitle,
  getSiteDefaultDescription,
  getSiteDefaultTitle,
} from "./site-metadata";
import { buildCanonicalUrl, normalizeMetadataMediaUrl } from "./metadata-url";

export type TWebSiteJsonLd = Readonly<{
  "@context": "https://schema.org";
  "@type": "WebSite";
  "@id": string;
  url: string;
  name: string;
  description: string;
  inLanguage: "en";
}>;

export type TWebPageJsonLd = Readonly<{
  "@context": "https://schema.org";
  "@type": "WebPage";
  "@id": string;
  url: string;
  name: string;
  description: string;
  inLanguage: "en";
  isPartOf: Readonly<{ "@id": string }>;
}>;

export type TBreadcrumbJsonLd = Readonly<{
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: readonly Readonly<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>[];
}>;

export type TArticleJsonLd = Readonly<{
  "@context": "https://schema.org";
  "@type": "Article";
  "@id": string;
  url: string;
  headline: string;
  description: string;
  inLanguage: "en";
  datePublished: string;
  dateModified: string;
  mainEntityOfPage: Readonly<{ "@id": string }>;
  author?: Readonly<{ "@type": "Person"; name: string }>;
  image?: string;
  keywords?: readonly string[];
}>;

export type TCreativeWorkJsonLd = Readonly<{
  "@context": "https://schema.org";
  "@type": "CreativeWork";
  "@id": string;
  url: string;
  name: string;
  description: string;
  inLanguage: "en";
  mainEntityOfPage: Readonly<{ "@id": string }>;
  creator?: Readonly<{ "@type": "Person"; name: string }>;
  dateCreated?: string;
  image?: string;
  keywords?: readonly string[];
}>;

export type TJsonLdNode =
  | TWebSiteJsonLd
  | TWebPageJsonLd
  | TBreadcrumbJsonLd
  | TArticleJsonLd
  | TCreativeWorkJsonLd;

export type TJsonLdPayload = TJsonLdNode | readonly TJsonLdNode[];

const cleanJsonLdText = (
  value: string | undefined,
  maximum: number
): string | undefined => {
  const text = value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return text ? text.slice(0, maximum) : undefined;
};

export const buildWebSiteJsonLd = (
  site: TPublicSiteDto
): TWebSiteJsonLd | null => {
  if (site.content_source !== "published") return null;
  const canonical = buildCanonicalUrl(site, "/");
  if (!canonical) return null;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${canonical}#website`,
    url: canonical,
    name: getSiteDefaultTitle(site),
    description: getSiteDefaultDescription(site),
    inLanguage: site.identity.locale,
  };
};

export const buildWebPageJsonLd = (
  site: TPublicSiteDto,
  input: { pathname: string; title?: string; description?: string }
): TWebPageJsonLd | null => {
  if (site.content_source !== "published") return null;
  const canonical = buildCanonicalUrl(site, input.pathname);
  const websiteCanonical = buildCanonicalUrl(site, "/");
  if (!canonical || !websiteCanonical) return null;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: cleanJsonLdText(input.title, 120)
      ? formatSiteTitle(site, input.title)
      : getSiteDefaultTitle(site),
    description:
      cleanJsonLdText(input.description, 320) ??
      getSiteDefaultDescription(site),
    inLanguage: site.identity.locale,
    isPartOf: { "@id": `${websiteCanonical}#website` },
  };
};

const cleanIsoDate = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
};

const cleanKeywords = (values: readonly string[] | undefined): string[] =>
  [...new Set(values ?? [])]
    .map((value) => cleanJsonLdText(value, 80))
    .filter((value): value is string => Boolean(value))
    .slice(0, 30);

const publicPerson = (name: string | undefined) => {
  const safeName = cleanJsonLdText(name, 120);
  return safeName
    ? ({ "@type": "Person", name: safeName } as const)
    : undefined;
};

const publicImage = (url: string | undefined): string | undefined =>
  url ? normalizeMetadataMediaUrl(url) : undefined;

export const buildBreadcrumbJsonLd = (
  site: TPublicSiteDto,
  items: readonly Readonly<{ name: string; pathname: string }>[]
): TBreadcrumbJsonLd | null => {
  if (site.content_source !== "published") return null;
  const resolved = items.flatMap((item, index) => {
    const name = cleanJsonLdText(item.name, 120);
    const url = buildCanonicalUrl(site, item.pathname);
    return name && url
      ? [{ "@type": "ListItem" as const, position: index + 1, name, item: url }]
      : [];
  });
  if (resolved.length !== items.length || resolved.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: resolved,
  };
};

export const buildArticleJsonLd = (
  site: TPublicSiteDto,
  input: Readonly<{
    pathname: string;
    title: string;
    description?: string;
    published_at?: string;
    updated_at?: string;
    author_name?: string;
    image_url?: string;
    keywords?: readonly string[];
  }>
): TArticleJsonLd | null => {
  if (site.content_source !== "published") return null;
  const canonical = buildCanonicalUrl(site, input.pathname);
  const title = cleanJsonLdText(input.title, 120);
  const publishedAt = cleanIsoDate(input.published_at);
  if (!canonical || !title || !publishedAt) return null;
  const description =
    cleanJsonLdText(input.description, 320) ?? getSiteDefaultDescription(site);
  const updatedAt = cleanIsoDate(input.updated_at) ?? publishedAt;
  const author = publicPerson(
    input.author_name || site.identity.public_name || site.identity.short_name
  );
  const image = publicImage(input.image_url);
  const keywords = cleanKeywords(input.keywords);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    url: canonical,
    headline: title,
    description,
    inLanguage: site.identity.locale,
    datePublished: publishedAt,
    dateModified: updatedAt,
    mainEntityOfPage: { "@id": `${canonical}#webpage` },
    ...(author ? { author } : {}),
    ...(image ? { image } : {}),
    ...(keywords.length ? { keywords } : {}),
  };
};

export const buildCreativeWorkJsonLd = (
  site: TPublicSiteDto,
  input: Readonly<{
    pathname: string;
    title: string;
    description?: string;
    created_at?: string;
    creator_name?: string;
    image_url?: string;
    keywords?: readonly string[];
  }>
): TCreativeWorkJsonLd | null => {
  if (site.content_source !== "published") return null;
  const canonical = buildCanonicalUrl(site, input.pathname);
  const title = cleanJsonLdText(input.title, 120);
  if (!canonical || !title) return null;
  const description =
    cleanJsonLdText(input.description, 320) ?? getSiteDefaultDescription(site);
  const creator = publicPerson(
    input.creator_name || site.identity.public_name || site.identity.short_name
  );
  const image = publicImage(input.image_url);
  const createdAt = cleanIsoDate(input.created_at);
  const keywords = cleanKeywords(input.keywords);

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${canonical}#creative-work`,
    url: canonical,
    name: title,
    description,
    inLanguage: site.identity.locale,
    mainEntityOfPage: { "@id": `${canonical}#webpage` },
    ...(creator ? { creator } : {}),
    ...(createdAt ? { dateCreated: createdAt } : {}),
    ...(image ? { image } : {}),
    ...(keywords.length ? { keywords } : {}),
  };
};

const JSON_LD_ESCAPE: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export const serializeJsonLd = (payload: TJsonLdPayload): string =>
  JSON.stringify(payload).replace(
    /[<>&\u2028\u2029]/g,
    (character) => JSON_LD_ESCAPE[character]!
  );
