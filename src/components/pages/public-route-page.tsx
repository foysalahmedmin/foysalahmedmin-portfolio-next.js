import type { TResolvedPublishedPagePayload } from "@/app/api/pages/page-resolver.type";
import {
  ChapterPage,
  ConversationLayout,
  DocumentLayout,
  IndexLayout,
  NarrativePage,
} from "@/components/templates";
import type { PageTemplateProps } from "@/components/templates";
import type { TBreadcrumbs } from "@/components/ui/breadcrumb";
import type { ComponentType, ReactElement } from "react";
import type { TPublicRouteDiscoveryData } from "@/lib/pages/public-route-renderer.type";
import type { TPageSectionKind } from "@/app/api/pages/page.type";
import {
  PublicPageSections,
  type TPublicPageSectionOverrides,
} from "./public-page-sections";

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
  "case-studies": {
    title: "Problems solved, in depth",
    description:
      "Full stories that start with the business problem, then walk through the approach, the solution, and the result.",
    label: "Case studies",
  },
  articles: {
    title: "Notes on solving real problems",
    description:
      "Practical, human-written notes on the decisions and trade-offs behind solutions that hold up in real use.",
    label: "Articles",
  },
  videos: {
    title: "Watch how problems get solved",
    description:
      "Walkthroughs and short reels that show the thinking and the tools behind the work.",
    label: "Videos",
  },
  contact: {
    title: "Tell me about the problem",
    description:
      "Share what you are trying to achieve and what is getting in the way. I will reply with how I would approach it.",
    label: "Contact",
  },
} as const;

// Every route belongs to exactly one archetype (docs plan 3.12); the template owns the page anatomy.
const TEMPLATE_BY_ROUTE: Record<
  TResolvedPublishedPagePayload["page"]["route_key"],
  (props: PageTemplateProps) => ReactElement
> = {
  home: ChapterPage,
  about: NarrativePage,
  contact: ConversationLayout,
  privacy: DocumentLayout,
  terms: DocumentLayout,
  projects: IndexLayout,
  "case-studies": IndexLayout,
  articles: IndexLayout,
  videos: IndexLayout,
};

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

type DiscoveryKey = TPublicRouteDiscoveryData["route_key"];

/**
 * The interactive discovery sections (filters, search, pagination) are client components. A route
 * passes only its own renderer, so the other public routes do not load that client code: a static
 * import here would put every discovery section into the initial JavaScript of every page.
 */
export type DiscoveryRenderers = Readonly<{
  [K in DiscoveryKey]?: ComponentType<
    Extract<TPublicRouteDiscoveryData, { route_key: K }>["props"]
  >;
}>;

const DISCOVERY_SECTION_KIND = {
  projects: "project-collection",
  articles: "article-collection",
  "case-studies": "case-study-collection",
  videos: "video-collection",
} as const satisfies Record<DiscoveryKey, TPageSectionKind>;

const discoveryOverrides = (
  routeKey: string,
  discovery: TPublicRouteDiscoveryData | null | undefined,
  renderers: DiscoveryRenderers | undefined
): TPublicPageSectionOverrides | undefined => {
  if (!discovery || discovery.route_key !== routeKey) return undefined;
  const Render = renderers?.[discovery.route_key] as
    | ComponentType<typeof discovery.props>
    | undefined;
  if (!Render) return undefined;
  return {
    [DISCOVERY_SECTION_KIND[discovery.route_key]]: () => (
      <Render {...discovery.props} />
    ),
  };
};

export const PublicRoutePage = ({
  payload,
  discovery,
  discoveryRenderers,
}: Readonly<{
  payload: TResolvedPublishedPagePayload;
  discovery?: TPublicRouteDiscoveryData | null;
  discoveryRenderers?: DiscoveryRenderers;
}>) => {
  const header = getPublicRouteHeader(payload);
  const sectionOverrides = discoveryOverrides(
    payload.page.route_key,
    discovery,
    discoveryRenderers
  );
  const Template = TEMPLATE_BY_ROUTE[payload.page.route_key];
  // A page whose composition already ends in a contact-cta section must not get a second band.
  const hasCtaSection = payload.sections.some(
    (section) => section.kind === "contact-cta"
  );

  return (
    <Template
      route={payload.page.route_key}
      revision={payload.page.published_revision || undefined}
      site={payload.site}
      cta={hasCtaSection ? false : undefined}
      header={
        header
          ? {
              title: header.title,
              lede: header.description,
              path: header.breadcrumbs,
            }
          : null
      }
    >
      <PublicPageSections
        payload={payload}
        sectionOverrides={sectionOverrides}
      />
    </Template>
  );
};
