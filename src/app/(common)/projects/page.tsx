import * as ProjectCategoryService from "@/app/api/project-categories/project-category.service";
import * as ProjectService from "@/app/api/projects/project.service";
import ProjectsContentSection from "@/components/(common)/projects-page/projects-content-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import {
  PUBLIC_DISCOVERY_PAGE_SIZE,
  mergeProjectDiscoveryQueryString,
  parseProjectDiscoveryQuery,
  querySourceToQueryString,
  toSerializableProjectCategory,
  toSerializableProjectListItem,
} from "@/lib/discovery/public-discovery";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { readPublishedSite } from "@/lib/site/published-site";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type SearchParams = Record<
  string,
  string | string[] | number | null | undefined
>;

type ProjectsPageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await readPublishedSite();
  return buildPageMetadata(site, {
    pathname: "/projects",
    title: "Projects",
    description:
      "Evidence-led case studies across frontend, backend, AI automation, system design, and full-stack engineering.",
    kind: "page",
  });
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const rawSearchParams = await searchParams;
  const query = parseProjectDiscoveryQuery(rawSearchParams);
  const currentQueryString = querySourceToQueryString(rawSearchParams);
  const [site, [projectsResult, categoriesResult, facetsResult]] =
    await Promise.all([
      readPublishedSite(),
      Promise.allSettled([
      ProjectService.getPublicProjectDiscovery(query),
      ProjectCategoryService.getPublicProjectCategories({
        limit: 50,
        sort: "sequence,name",
      }),
      ProjectService.getPublicProjectDiscoveryFacets(),
      ]),
    ]);

  const hasInitialError = projectsResult.status === "rejected";
  const result =
    projectsResult.status === "fulfilled"
      ? projectsResult.value
      : {
          data: [],
          meta: {
            total: 0,
            page: query.page,
            limit: PUBLIC_DISCOVERY_PAGE_SIZE,
          },
        };
  const totalPages = Math.max(
    1,
    Math.ceil(result.meta.total / result.meta.limit)
  );
  if (
    projectsResult.status === "fulfilled" &&
    projectsResult.value.query.category !== query.category
  ) {
    redirect(
      `/projects${mergeProjectDiscoveryQueryString(
        currentQueryString,
        projectsResult.value.query
      )}`
    );
  }
  if (!hasInitialError && result.meta.total > 0 && query.page > totalPages) {
    redirect(
      `/projects${mergeProjectDiscoveryQueryString(currentQueryString, {
        ...query,
        page: totalPages,
      })}`
    );
  }

  const projects = result.data.flatMap((record) => {
    const project = toSerializableProjectListItem(record);
    return project ? [project] : [];
  });
  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.data.flatMap((record) => {
          const category = toSerializableProjectCategory(record);
          return category ? [category] : [];
        })
      : [];
  const facets =
    facetsResult.status === "fulfilled"
      ? facetsResult.value
      : { technologies: [], years: [] };

  return (
    <main className="min-h-screen pb-20">
      <PageHeaderSection
        title="Engineering case studies"
        description="Explore decisions, constraints, implementation details, and verified outcomes across the five disciplines that define my work."
        breadcrumbItems={[
          { index: 1, name: "Home", href: "/", icon: "house" },
          { index: 2, name: "Projects", href: "/projects" },
        ]}
      />

      <ProjectsContentSection
        initialProjects={projects}
        initialMeta={{
          total: result.meta.total,
          page: result.meta.page,
          limit: result.meta.limit,
        }}
        initialQuery={query}
        categories={categories}
        facets={facets}
        fallbacks={site.fallbacks}
        initialError={hasInitialError}
      />
    </main>
  );
}
