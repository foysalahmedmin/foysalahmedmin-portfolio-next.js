import { JsonLdScript } from "@/components/content/json-ld-script";
import { PublicPageSections } from "@/components/pages/public-page-sections";
import { buildWebPageJsonLd } from "@/lib/metadata/json-ld";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { getHomePagePayloadOrFallback } from "@/lib/pages/public-page-fallback";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getHomePagePayloadOrFallback();
  const metadata = buildPageMetadata(payload.site, {
    pathname: "/",
    title: payload.page.seo.title,
    description: payload.page.seo.description,
    kind: "site",
  });
  return payload.page.seo.noindex
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function HomePage() {
  const payload = await getHomePagePayloadOrFallback();
  return (
    <main data-page-revision={payload.page.published_revision || undefined}>
      <JsonLdScript
        data={buildWebPageJsonLd(payload.site, {
          pathname: "/",
          title: payload.page.seo.title,
          description: payload.page.seo.description,
        })}
      />
      <PublicPageSections payload={payload} />
    </main>
  );
}
