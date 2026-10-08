import { PublicRoutePage } from "@/components/pages/public-route-page";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { getPublicPagePayloadOrFallback } from "@/lib/pages/public-page-fallback";
import {
  loadPublicRouteDiscovery,
  type TPublicRouteSearchParams,
} from "@/lib/pages/public-route-discovery";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type CaseStudiesPageProps = {
  searchParams: Promise<TPublicRouteSearchParams>;
};

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPublicPagePayloadOrFallback("case-studies");
  const metadata = buildPageMetadata(payload.site, {
    pathname: "/case-studies",
    title: payload.page.seo.title || "Case studies",
    description:
      payload.page.seo.description ||
      "In-depth case studies that start with a business problem and show the approach, the solution, and the result.",
    kind: "page",
  });
  return payload.page.seo.noindex
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function CaseStudiesPage({
  searchParams,
}: CaseStudiesPageProps) {
  const [payload, rawSearchParams] = await Promise.all([
    getPublicPagePayloadOrFallback("case-studies"),
    searchParams,
  ]);
  const discovery = await loadPublicRouteDiscovery(payload, {
    mode: "live",
    search_params: rawSearchParams,
  });
  if (discovery?.redirect_to) redirect(discovery.redirect_to);

  return <PublicRoutePage payload={payload} discovery={discovery} />;
}
