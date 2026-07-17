import type { ArticlesContentSectionProps } from "@/components/(common)/articles-page/articles-content-section";
import type { ProjectsContentSectionProps } from "@/components/(common)/projects-page/projects-content-section";

export type TPublicRouteDiscoveryData =
  | Readonly<{
      route_key: "projects";
      props: Readonly<ProjectsContentSectionProps>;
      redirect_to?: string;
    }>
  | Readonly<{
      route_key: "articles";
      props: Readonly<ArticlesContentSectionProps>;
      redirect_to?: string;
    }>;
