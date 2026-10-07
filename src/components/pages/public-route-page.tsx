import type { TResolvedPublishedPagePayload } from "@/app/api/pages/page-resolver.type";
import ArticlesContentSection from "@/components/(common)/articles-page/articles-content-section";
import ProjectsContentSection from "@/components/(common)/projects-page/projects-content-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import type { TBreadcrumbs } from "@/components/ui/breadcrumb";
import type { TPublicRouteDiscoveryData } from "@/lib/pages/public-route-renderer.type";
import { PublicPageSections } from "./public-page-sections";

type TRouteHeader = Readonly<{
  title: string;
  description: string;
  breadcrumbs: TBreadcrumbs;
}>;

const ROUTE_HEADER_FALLBACKS = {
  about: {
    title: "About how I solve problems",
    description: "Published practice details are being prepared.",
    label: "About",
  },
  projects: {
    title: "Problems solved",
    description:
      "Case studies that start with the business problem, then walk through the approach, the solution, and what changed as a result.",
    label: "Projects",
  },
  articles: {
    title: "Notes on solving real problems",
    description:
      "Practical, human-written notes on the decisions and trade-offs behind solutions that hold up in real use.",
    label: "Articles",
  },
  contact: {
    title: "Tell me about the problem",
    description:
      "Share what you are trying to achieve and what is getting in the way. I will reply with how I would approach it.",
    label: "Contact",
  },
} as const;

export const getPublicRouteHeader = (
  payload: TResolvedPublishedPagePayload
): TRouteHeader | null => {
  const routeKey = payload.page.route_key;
  if (routeKey === "home" || routeKey === "privacy" || routeKey === "terms") {
    return null;
  }
  const fallback = ROUTE_HEADER_FALLBACKS[routeKey];
  const siteDescription =
    routeKey === "contact"
      ? payload.site.positioning.client_promise
      : routeKey === "about"
        ? payload.site.positioning.short_bio ||
          payload.site.positioning.canonical
        : "";
  return {
    title: payload.page.seo.title?.trim() || fallback.title,
    description:
      payload.page.seo.description?.trim() ||
      siteDescription ||
      fallback.description,
    breadcrumbs: [
      { index: 1, name: "Home", href: "/", icon: "house" },
      {
        index: 2,
        name: fallback.label,
        href: payload.page.route_path,
      },
    ],
  };
};

export const PublicRoutePage = ({
  payload,
  discovery,
}: Readonly<{
  payload: TResolvedPublishedPagePayload;
  discovery?: TPublicRouteDiscoveryData | null;
}>) => {
  const header = getPublicRouteHeader(payload);
  const sectionOverrides =
    discovery?.route_key === "projects" && payload.page.route_key === "projects"
      ? {
          "project-collection": () => (
            <ProjectsContentSection {...discovery.props} />
          ),
        }
      : discovery?.route_key === "articles" &&
          payload.page.route_key === "articles"
        ? {
            "article-collection": () => (
              <ArticlesContentSection {...discovery.props} />
            ),
          }
        : undefined;
  const isLegal =
    payload.page.route_key === "privacy" || payload.page.route_key === "terms";
  const content = (
    <>
      {header ? (
        <PageHeaderSection
          title={header.title}
          description={header.description}
          breadcrumbItems={header.breadcrumbs}
        />
      ) : null}
      <PublicPageSections
        payload={payload}
        sectionOverrides={sectionOverrides}
      />
    </>
  );
  const revision = payload.page.published_revision || undefined;

  return isLegal ? (
    <div
      data-public-route={payload.page.route_key}
      data-page-revision={revision}
    >
      {content}
    </div>
  ) : (
    <main
      className={
        payload.page.route_key === "projects"
          ? "min-h-screen pb-20"
          : "min-h-screen"
      }
      data-public-route={payload.page.route_key}
      data-page-revision={revision}
    >
      {content}
    </main>
  );
};
