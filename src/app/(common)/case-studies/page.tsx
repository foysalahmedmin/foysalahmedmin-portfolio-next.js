import CaseStudiesContentSection from "@/components/(common)/case-studies-page/case-studies-content-section";
import { PublicRoutePage } from "@/components/pages/public-route-page";
import { mergeCaseStudyDiscoveryQueryString } from "@/lib/discovery/case-study-discovery";
import { querySourceToQueryString } from "@/lib/discovery/public-discovery";
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
  if (discovery?.route_key === "case-studies") {
    // The filter form is a GET form and submits every field; fold defaults and empty values back out so
    // the shared URL matches what the chip and pagination links produce.
    const current = querySourceToQueryString(rawSearchParams);
    const canonical = mergeCaseStudyDiscoveryQueryString(
      current,
      discovery.props.query
    );
    if (canonical !== current) redirect(`/case-studies${canonical}`);
  }

  return (
    <PublicRoutePage
      payload={payload}
      discovery={discovery}
      discoveryRenderers={{ "case-studies": CaseStudiesContentSection }}
    />
  );
}
