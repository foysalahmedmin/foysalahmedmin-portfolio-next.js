import { JsonLdScript } from "@/components/content/json-ld-script";
import { PublicRoutePage } from "@/components/pages/public-route-page";
import { buildFaqJsonLd, buildWebPageJsonLd } from "@/lib/metadata/json-ld";
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
  const faqs = payload.sections
    .filter((section) => section.kind === "faq-list")
    .flatMap((section) => section.items)
    .flatMap((item) =>
      typeof item.question === "string" && typeof item.answer === "string"
        ? [{ question: item.question, answer: item.answer }]
        : []
    );
  return (
    <>
      <JsonLdScript data={buildFaqJsonLd(payload.site, faqs)} />
      <JsonLdScript
        data={buildWebPageJsonLd(payload.site, {
          pathname: "/",
          title: payload.page.seo.title,
          description: payload.page.seo.description,
        })}
      />
      <PublicRoutePage payload={payload} />
    </>
  );
}
