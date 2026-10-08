import type { ArticlesContentSectionProps } from "@/components/(common)/articles-page/articles-content-section";
import type { CaseStudiesContentSectionProps } from "@/components/(common)/case-studies-page/case-studies-content-section";
import type { VideosContentSectionProps } from "@/components/(common)/videos-page/videos-content-section";
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
    }>
  | Readonly<{
      route_key: "case-studies";
      props: Readonly<CaseStudiesContentSectionProps>;
      redirect_to?: string;
    }>
  | Readonly<{
      route_key: "videos";
      props: Readonly<VideosContentSectionProps>;
      redirect_to?: string;
    }>;
