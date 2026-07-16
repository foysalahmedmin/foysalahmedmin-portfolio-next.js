import type {
  TPublicSiteDto,
  TPublicSiteMediaDto,
} from "@/app/api/site/site.type";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildCreativeWorkJsonLd,
  buildWebPageJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from "@/lib/metadata/json-ld";
import {
  buildCanonicalUrl,
  resolveMetadataBase,
} from "@/lib/metadata/metadata-url";
import {
  buildNoIndexMetadata,
  buildRobotsPolicy,
  getNoIndexReason,
  resolveNoIndexReason,
} from "@/lib/metadata/noindex";
import {
  buildDynamicOgInput,
  DYNAMIC_OG_IMAGE_CONTRACT,
} from "@/lib/metadata/open-graph";
import {
  buildSiteMetadata,
  buildSocialMetadata,
  FALLBACK_SITE_DESCRIPTION,
  FALLBACK_SITE_TITLE,
  formatSiteTitle,
  getSiteDefaultDescription,
  getSiteDefaultTitle,
  getSiteTitleTemplate,
} from "@/lib/metadata/site-metadata";
import { describe, expect, it } from "vitest";

const buildPublishedSite = (): TPublicSiteDto => ({
  ...createEmergencyPublicSite(),
  content_source: "published",
  published_revision: 4,
  published_at: "2026-07-15T10:00:00.000Z",
  identity: {
    public_name: "Portfolio Owner",
    short_name: "Portfolio",
    canonical_url: "https://portfolio.example.com/base/",
    locale: "en",
  },
  positioning: {
    compact: "Five connected engineering capabilities",
    short_bio: "An explicitly published portfolio biography.",
  },
  seo: {
    default_title: "Portfolio",
    title_template: "%s | Portfolio",
    default_description: "An explicitly published portfolio description.",
    canonical_url: "https://portfolio.example.com/base/",
    allow_indexing: true,
  },
});

const media = (
  id: string,
  url = `https://media.example.com/${id}.png`
): TPublicSiteMediaDto => ({
  id,
  url,
  alt_text: `${id} visual`,
  width: 1200,
  height: 630,
});

describe("metadata URL and canonical foundation", () => {
  it("derives a normalized metadata base and stable public canonicals", () => {
    const site = buildPublishedSite();

    expect(resolveMetadataBase(site)?.toString()).toBe(
      "https://portfolio.example.com/base/"
    );
    expect(buildCanonicalUrl(site, "/")).toBe(
      "https://portfolio.example.com/base"
    );
    expect(buildCanonicalUrl(site, "/projects/?sort=recent#work")).toBe(
      "https://portfolio.example.com/base/projects"
    );
  });

  it("fails closed for unpublished, private, protected, and escaped URLs", () => {
    expect(buildCanonicalUrl(createEmergencyPublicSite(), "/about")).toBe(
      undefined
    );

    const privateSite = buildPublishedSite();
    privateSite.seo.canonical_url = "https://127.0.0.1";
    privateSite.identity.canonical_url = "https://127.0.0.1";
    expect(resolveMetadataBase(privateSite)).toBeUndefined();

    const site = buildPublishedSite();
    expect(buildCanonicalUrl(site, "//attacker.example/path")).toBeUndefined();
    expect(buildCanonicalUrl(site, "/admin")).toBeUndefined();
    expect(buildCanonicalUrl(site, "/%2561dmin/settings")).toBeUndefined();
  });
});

describe("Site-derived title and description foundation", () => {
  it("uses the published title contract and formats child titles once", () => {
    const site = buildPublishedSite();

    expect(getSiteDefaultTitle(site)).toBe("Portfolio");
    expect(getSiteTitleTemplate(site)).toBe("%s | Portfolio");
    expect(formatSiteTitle(site, "Projects")).toBe("Projects | Portfolio");
    expect(formatSiteTitle(site, "Portfolio")).toBe("Portfolio");
    expect(getSiteDefaultDescription(site)).toBe(
      "An explicitly published portfolio description."
    );
  });

  it("uses neutral five-pillar fallbacks without inventing an owner", () => {
    const site = createEmergencyPublicSite();

    expect(getSiteDefaultTitle(site)).toBe(FALLBACK_SITE_TITLE);
    expect(getSiteDefaultDescription(site)).toBe(FALLBACK_SITE_DESCRIPTION);
    expect(FALLBACK_SITE_DESCRIPTION).toContain("Frontend Engineering");
    expect(buildSiteMetadata(site)).toMatchObject({
      title: {
        default: FALLBACK_SITE_TITLE,
        template: `%s | ${FALLBACK_SITE_TITLE}`,
      },
      robots: { index: false, follow: false },
    });
    expect(buildSiteMetadata(site)).not.toHaveProperty("metadataBase");
    expect(buildSiteMetadata(site)).not.toHaveProperty("alternates");
  });

  it("rejects a malformed published title template", () => {
    const site = buildPublishedSite();
    site.seo.title_template = "Portfolio without a placeholder";
    expect(getSiteTitleTemplate(site)).toBe("%s | Portfolio");
  });
});

describe("central noindex policy", () => {
  it("classifies auth, admin, preview, and error-only routes", () => {
    expect(getNoIndexReason("/admin/signin")).toBe("auth");
    expect(getNoIndexReason("/%61dmin/settings")).toBe("admin");
    expect(getNoIndexReason("/preview/project/example")).toBe("preview");
    expect(getNoIndexReason("/not-found")).toBe("error_only");
    expect(getNoIndexReason("/projects")).toBeUndefined();
  });

  it("combines route and Site publication policy", () => {
    const published = buildPublishedSite();
    expect(resolveNoIndexReason(published, "/projects")).toBeUndefined();
    expect(buildRobotsPolicy(published, "/projects")).toMatchObject({
      index: true,
      follow: true,
    });
    expect(buildRobotsPolicy(published, "/admin")).toMatchObject({
      index: false,
      follow: false,
      noarchive: true,
      noimageindex: true,
    });
    expect(resolveNoIndexReason(createEmergencyPublicSite(), "/")).toBe(
      "unpublished"
    );

    published.seo.allow_indexing = false;
    expect(resolveNoIndexReason(published, "/")).toBe("indexing_disabled");
    expect(buildNoIndexMetadata({ title: "Private" })).toMatchObject({
      title: "Private",
      robots: { index: false, follow: false, nocache: true },
    });
  });
});

describe("typed JSON-LD foundation", () => {
  it("emits only supported WebSite and WebPage properties", () => {
    const site = buildPublishedSite();
    const website = buildWebSiteJsonLd(site);
    const page = buildWebPageJsonLd(site, {
      pathname: "/about",
      title: "About",
    });

    expect(website).toMatchObject({
      "@type": "WebSite",
      url: "https://portfolio.example.com/base",
      name: "Portfolio",
    });
    expect(page).toMatchObject({
      "@type": "WebPage",
      url: "https://portfolio.example.com/base/about",
      name: "About | Portfolio",
      isPartOf: { "@id": "https://portfolio.example.com/base#website" },
    });
    expect(JSON.stringify([website, page])).not.toMatch(
      /Person|jobTitle|knowsAbout|sameAs/
    );
    expect(buildWebSiteJsonLd(createEmergencyPublicSite())).toBeNull();
  });

  it("escapes script boundaries and JavaScript separators safely", () => {
    const site = buildPublishedSite();
    const page = buildWebPageJsonLd(site, {
      pathname: "/about",
      title: "</script><script>alert(1)</script>\u2028&",
    });
    expect(page).not.toBeNull();

    const serialized = serializeJsonLd(page!);
    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(serialized).not.toContain("\u2028");
    expect(serialized).toContain("\\u003c");
    expect(serialized).toContain("\\u2028");
    expect(JSON.parse(serialized).name).toContain("</script>");
  });

  it("builds canonical Article, CreativeWork, and breadcrumb graphs", () => {
    const site = buildPublishedSite();
    const article = buildArticleJsonLd(site, {
      pathname: "/articles/safe-boundaries",
      title: "Safe boundaries",
      description: "A bounded article description.",
      published_at: "2026-07-10T00:00:00.000Z",
      updated_at: "2026-07-12T00:00:00.000Z",
      author_name: "Portfolio Owner",
      image_url: "https://media.example.com/article.png",
      keywords: ["security", "security", "backend"],
    });
    const project = buildCreativeWorkJsonLd(site, {
      pathname: "/projects/provider-storage",
      title: "Provider-neutral storage",
      created_at: "2026-06-01T00:00:00.000Z",
      keywords: ["system design"],
    });
    const breadcrumbs = buildBreadcrumbJsonLd(site, [
      { name: "Home", pathname: "/" },
      { name: "Articles", pathname: "/articles" },
      { name: "Safe boundaries", pathname: "/articles/safe-boundaries" },
    ]);

    expect(article).toMatchObject({
      "@type": "Article",
      url: "https://portfolio.example.com/base/articles/safe-boundaries",
      dateModified: "2026-07-12T00:00:00.000Z",
      author: { "@type": "Person", name: "Portfolio Owner" },
      keywords: ["security", "backend"],
    });
    expect(project).toMatchObject({
      "@type": "CreativeWork",
      dateCreated: "2026-06-01T00:00:00.000Z",
    });
    expect(breadcrumbs?.itemListElement).toHaveLength(3);
    expect(breadcrumbs?.itemListElement[2]).toMatchObject({
      position: 3,
      item: "https://portfolio.example.com/base/articles/safe-boundaries",
    });
  });

  it("fails closed when required structured-data facts are absent or unsafe", () => {
    const site = buildPublishedSite();
    expect(
      buildArticleJsonLd(site, {
        pathname: "/articles/missing-date",
        title: "Missing date",
      })
    ).toBeNull();
    expect(
      buildArticleJsonLd(createEmergencyPublicSite(), {
        pathname: "/articles/example",
        title: "Example",
        published_at: "2026-07-10T00:00:00.000Z",
      })
    ).toBeNull();
    expect(
      buildBreadcrumbJsonLd(site, [
        { name: "Home", pathname: "/" },
        { name: "Unsafe", pathname: "//attacker.example" },
      ])
    ).toBeNull();
  });
});

describe("dynamic Open Graph contract", () => {
  it("defines a deterministic 1200x630 code fallback", () => {
    const input = buildDynamicOgInput(createEmergencyPublicSite(), {
      kind: "site",
      title: "Engineering Portfolio",
      canonical_path: "/",
    });

    expect(input?.visual).toEqual({
      source: "code_fallback",
      fallback_visual_key: "abstract-grid-v1",
      alt: "Engineering Portfolio",
      width: 1200,
      height: 630,
    });
    expect(DYNAMIC_OG_IMAGE_CONTRACT).toMatchObject({
      content_type: "image/png",
      width: 1200,
      height: 630,
    });
  });

  it("uses explicit, pillar, generic, and Site media in that priority order", () => {
    const site = buildPublishedSite();
    site.seo.default_og = media("site-default");
    site.fallbacks.project = media("project-fallback");
    site.fallbacks.project_by_pillar.backend = media(
      "project-backend-fallback"
    );

    const project = buildDynamicOgInput(site, {
      kind: "project",
      title: "Project",
      canonical_path: "/projects/example",
      pillar: "backend",
    });
    expect(project?.visual).toMatchObject({
      source: "managed_media",
      media_id: "project-backend-fallback",
    });

    const genericProject = buildDynamicOgInput(site, {
      kind: "project",
      title: "Project",
      canonical_path: "/projects/example",
    });
    expect(genericProject?.visual).toMatchObject({
      source: "managed_media",
      media_id: "project-fallback",
    });

    const explicit = buildDynamicOgInput(site, {
      kind: "project",
      title: "Project",
      canonical_path: "/projects/example",
      pillar: "backend",
      image: media("explicit"),
    });
    expect(explicit?.visual).toMatchObject({
      source: "managed_media",
      media_id: "explicit",
    });
    expect(
      buildDynamicOgInput(site, {
        kind: "page",
        title: "Admin",
        canonical_path: "/admin",
      })
    ).toBeNull();
  });

  it("does not advertise a nonexistent generated image route", () => {
    const fallbackSocial = buildSocialMetadata(createEmergencyPublicSite(), {
      pathname: "/",
      kind: "site",
    });
    expect(fallbackSocial.openGraph).not.toHaveProperty("images");
    expect(fallbackSocial.twitter).toMatchObject({ card: "summary" });

    const site = buildPublishedSite();
    site.seo.default_og = media("site-default");
    const managedSocial = buildSocialMetadata(site, {
      pathname: "/",
      kind: "site",
    });
    expect(managedSocial.openGraph).toHaveProperty("images");
    expect(managedSocial.twitter).toMatchObject({
      card: "summary_large_image",
    });
  });
});
