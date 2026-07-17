import { PublicRoutePage } from "@/components/pages/public-route-page";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { getPublicPagePayloadOrFallback } from "@/lib/pages/public-page-fallback";
import {
  loadPublicRouteDiscovery,
  type TPublicRouteSearchParams,
} from "@/lib/pages/public-route-discovery";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type ArticlesPageProps = {
  searchParams: Promise<TPublicRouteSearchParams>;
};

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPublicPagePayloadOrFallback("articles");
  const metadata = buildPageMetadata(payload.site, {
    pathname: "/articles",
    title: payload.page.seo.title || "Articles",
    description:
      payload.page.seo.description ||
      "Practical engineering notes on frontend, backend, AI automation, system design, and full-stack delivery.",
    kind: "page",
  });
  return payload.page.seo.noindex
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function ArticlesPage({
  searchParams,
}: ArticlesPageProps) {
  const [payload, rawSearchParams] = await Promise.all([
    getPublicPagePayloadOrFallback("articles"),
    searchParams,
  ]);
  const discovery = await loadPublicRouteDiscovery(payload, {
    mode: "live",
    search_params: rawSearchParams,
  });
  if (discovery?.redirect_to) redirect(discovery.redirect_to);

  return <PublicRoutePage payload={payload} discovery={discovery} />;
}
