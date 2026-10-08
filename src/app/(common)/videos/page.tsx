import { PublicRoutePage } from "@/components/pages/public-route-page";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { getPublicPagePayloadOrFallback } from "@/lib/pages/public-page-fallback";
import {
  loadPublicRouteDiscovery,
  type TPublicRouteSearchParams,
} from "@/lib/pages/public-route-discovery";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type VideosPageProps = {
  searchParams: Promise<TPublicRouteSearchParams>;
};

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPublicPagePayloadOrFallback("videos");
  const metadata = buildPageMetadata(payload.site, {
    pathname: "/videos",
    title: payload.page.seo.title || "Videos",
    description:
      payload.page.seo.description ||
      "Walkthroughs and short reels that show the thinking and the tools behind the work.",
    kind: "page",
  });
  return payload.page.seo.noindex
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function VideosPage({
  searchParams,
}: VideosPageProps) {
  const [payload, rawSearchParams] = await Promise.all([
    getPublicPagePayloadOrFallback("videos"),
    searchParams,
  ]);
  const discovery = await loadPublicRouteDiscovery(payload, {
    mode: "live",
    search_params: rawSearchParams,
  });
  if (discovery?.redirect_to) redirect(discovery.redirect_to);

  return <PublicRoutePage payload={payload} discovery={discovery} />;
}
