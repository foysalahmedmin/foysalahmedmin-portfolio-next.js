import ProjectsContentSection from "@/components/(common)/projects-page/projects-content-section";
import { canonicalProjectsPath } from "@/components/(common)/projects-page/projects-content-section/query";
import { PublicRoutePage } from "@/components/pages/public-route-page";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { getPublicPagePayloadOrFallback } from "@/lib/pages/public-page-fallback";
import {
  loadPublicRouteDiscovery,
  type TPublicRouteSearchParams,
} from "@/lib/pages/public-route-discovery";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type ProjectsPageProps = {
  searchParams: Promise<TPublicRouteSearchParams>;
};

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPublicPagePayloadOrFallback("projects");
  const metadata = buildPageMetadata(payload.site, {
    pathname: "/projects",
    title: payload.page.seo.title || "Projects",
    description:
      payload.page.seo.description ||
      "Working projects and experiments: the problem each one solves, my role and the stack behind it.",
    kind: "page",
  });
  return payload.page.seo.noindex
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const [payload, rawSearchParams] = await Promise.all([
    getPublicPagePayloadOrFallback("projects"),
    searchParams,
  ]);
  const discovery = await loadPublicRouteDiscovery(payload, {
    mode: "live",
    search_params: rawSearchParams,
  });
  if (discovery?.redirect_to) redirect(discovery.redirect_to);
  // The filter form is a plain GET form and sends every field (`?pillar=all`); keep the URL clean.
  const cleanPath =
    discovery?.route_key === "projects"
      ? canonicalProjectsPath(rawSearchParams, discovery.props.initialQuery)
      : null;
  if (cleanPath) redirect(cleanPath);

  return (
    <PublicRoutePage
      payload={payload}
      discovery={discovery}
      discoveryRenderers={{ projects: ProjectsContentSection }}
    />
  );
}
