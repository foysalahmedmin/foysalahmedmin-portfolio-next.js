import { JsonLdScript } from "@/components/content/json-ld-script";
import {
  getPublicRouteHeader,
  PublicRoutePage,
} from "@/components/pages/public-route-page";
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
  const presentation = getPublicRouteHeader(payload);
  const title = presentation?.title || "About the engineering practice";
  const description =
    presentation?.description ||
    "Published practice details are being prepared.";

  return (
    <>
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
      <PublicRoutePage payload={payload} />
    </>
  );
}
