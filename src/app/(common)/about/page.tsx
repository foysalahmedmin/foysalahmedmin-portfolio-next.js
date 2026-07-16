import { JsonLdScript } from "@/components/content/json-ld-script";
import { PublicPageSections } from "@/components/pages/public-page-sections";
import PageHeaderSection from "@/components/sections/page-header-section";
import {
  buildBreadcrumbJsonLd,
  buildWebPageJsonLd,
} from "@/lib/metadata/json-ld";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { getPublicPagePayloadOrFallback } from "@/lib/pages/public-page-fallback";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPublicPagePayloadOrFallback("about");
  const metadata = buildPageMetadata(payload.site, {
    pathname: "/about",
    title: payload.page.seo.title || "About the Engineering Practice",
    description:
      payload.page.seo.description || payload.site.positioning.short_bio,
  });
  return payload.page.seo.noindex
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function AboutPage() {
  const payload = await getPublicPagePayloadOrFallback("about");
  const title = payload.page.seo.title || "About the engineering practice";
  const description =
    payload.page.seo.description ||
    payload.site.positioning.short_bio ||
    payload.site.positioning.canonical ||
    "Published practice details are being prepared.";

  return (
    <main
      className="min-h-screen"
      data-page-revision={payload.page.published_revision || undefined}
    >
      <JsonLdScript
        data={[
          buildWebPageJsonLd(payload.site, {
            pathname: "/about",
            title,
            description,
          }),
          buildBreadcrumbJsonLd(payload.site, [
            { name: "Home", pathname: "/" },
            { name: "About", pathname: "/about" },
          ]),
        ].filter((item) => item !== null)}
      />
      <PageHeaderSection
        title={title}
        description={description}
        breadcrumbItems={[
          { index: 1, name: "Home", href: "/", icon: "house" },
          { index: 2, name: "About", href: "/about" },
        ]}
      />
      <PublicPageSections payload={payload} />
    </main>
  );
}
