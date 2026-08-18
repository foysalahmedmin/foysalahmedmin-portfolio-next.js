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
    title: "About the engineering practice",
    description: "Published practice details are being prepared.",
    label: "About",
  },
  projects: {
    title: "Engineering case studies",
    description:
      "Explore decisions, constraints, implementation details, and verified outcomes across the six disciplines that define my work.",
    label: "Projects",
  },
  articles: {
    title: "Engineering field notes",
    description:
      "Practical, human-written explanations of the choices, trade-offs, and patterns behind reliable digital products.",
    label: "Articles",
  },
  contact: {
    title: "Get in Touch",
    description:
      "Share the goals, constraints, and context for a potential product engineering engagement.",
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
