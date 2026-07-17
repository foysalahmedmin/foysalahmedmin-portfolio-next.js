import "server-only";

import * as ArticleCategoryService from "@/app/api/article-categories/article-category.service";
import * as ArticleService from "@/app/api/articles/article.service";
import type { TResolvedPublishedPagePayload } from "@/app/api/pages/page-resolver.type";
import * as ProjectCategoryService from "@/app/api/project-categories/project-category.service";
import * as ProjectService from "@/app/api/projects/project.service";
import {
  filterAndSortCuratedArticles,
  filterAndSortCuratedProjects,
} from "@/lib/discovery/curated-discovery";
import {
  DEFAULT_ARTICLE_DISCOVERY_QUERY,
  DEFAULT_PROJECT_DISCOVERY_QUERY,
  PUBLIC_DISCOVERY_PAGE_SIZE,
  articleDiscoveryCompositionQuery,
  mergeArticleDiscoveryQueryString,
  mergeProjectDiscoveryQueryString,
  normalizeArticleDiscoveryCompositionFilter,
  normalizeProjectDiscoveryCompositionFilter,
  parseArticleDiscoveryQuery,
  parseProjectDiscoveryQuery,
  projectDiscoveryCompositionQuery,
  querySourceToQueryString,
  toSerializableArticleCategory,
  toSerializableArticleListItem,
  toSerializableProjectCategory,
  toSerializableProjectListItem,
} from "@/lib/discovery/public-discovery";
import type { TPublicRouteDiscoveryData } from "./public-route-renderer.type";

export type TPublicRouteSearchParams = Readonly<
  Record<string, string | string[] | number | null | undefined>
>;

const compositionItems = (
  payload: TResolvedPublishedPagePayload,
  kind: "project-collection" | "article-collection"
) => payload.sections.find((section) => section.kind === kind)?.items ?? [];

const compositionSection = (
  payload: TResolvedPublishedPagePayload,
  kind: "project-collection" | "article-collection"
) => payload.sections.find((section) => section.kind === kind);

const projectCompositionItems = (payload: TResolvedPublishedPagePayload) =>
  compositionItems(payload, "project-collection").flatMap((record) => {
    const project = toSerializableProjectListItem(record);
    return project ? [project] : [];
  });

const articleCompositionItems = (payload: TResolvedPublishedPagePayload) =>
  compositionItems(payload, "article-collection").flatMap((record) => {
    const article = toSerializableArticleListItem(record);
    return article ? [article] : [];
  });

const compositionMeta = (length: number) => ({
  total: length,
  page: 1,
  limit: Math.max(1, length),
});

const loadProjectDiscovery = async (
  payload: TResolvedPublishedPagePayload,
  searchParams: TPublicRouteSearchParams,
  mode: "live" | "preview"
): Promise<TPublicRouteDiscoveryData> => {
  const query =
    mode === "preview"
      ? { ...DEFAULT_PROJECT_DISCOVERY_QUERY }
      : parseProjectDiscoveryQuery(searchParams);
  const section = compositionSection(payload, "project-collection");
  const compositionFilter = normalizeProjectDiscoveryCompositionFilter(
    section?.source_filter ?? {}
  );
  const isAutomatic = section?.source_mode === "automatic";
  const normalizedQuery = isAutomatic ? query : { ...query, page: 1 };
  const [projectsResult, categoriesResult, facetsResult] =
    await Promise.allSettled([
      isAutomatic
        ? ProjectService.getPublicProjectDiscovery({
            ...query,
            ...projectDiscoveryCompositionQuery(compositionFilter),
          })
        : Promise.resolve(null),
      ProjectCategoryService.getPublicProjectCategories({
        limit: 50,
        sort: "sequence,name",
      }),
      ProjectService.getPublicProjectDiscoveryFacets(),
    ]);
  const fallbackItems = projectCompositionItems(payload);
  const snapshotItems = filterAndSortCuratedProjects(
    fallbackItems,
    normalizedQuery
  );
  const hasDiscoveryResult =
    projectsResult.status === "fulfilled" && projectsResult.value !== null;
  const discoveryResult = hasDiscoveryResult ? projectsResult.value : null;
  const projects = !discoveryResult
    ? snapshotItems
    : discoveryResult.data.flatMap((record) => {
        const project = toSerializableProjectListItem(record);
        return project ? [project] : [];
      });
  const meta = discoveryResult?.meta ?? compositionMeta(projects.length);
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
  let redirectTo: string | undefined;

  if (mode === "live" && !isAutomatic && query.page !== 1) {
    redirectTo = `/projects${mergeProjectDiscoveryQueryString(
      querySourceToQueryString(searchParams),
      normalizedQuery
    )}`;
  } else if (mode === "live" && discoveryResult) {
    const currentQueryString = querySourceToQueryString(searchParams);
    const totalPages = Math.max(
      1,
      Math.ceil(discoveryResult.meta.total / discoveryResult.meta.limit)
    );
    if (discoveryResult.query.category !== query.category) {
      redirectTo = `/projects${mergeProjectDiscoveryQueryString(
        currentQueryString,
        discoveryResult.query
      )}`;
    } else if (discoveryResult.meta.total > 0 && query.page > totalPages) {
      redirectTo = `/projects${mergeProjectDiscoveryQueryString(
        currentQueryString,
        { ...query, page: totalPages }
      )}`;
    }
  }

  return {
    route_key: "projects",
    props: {
      initialProjects: projects,
      ...(!isAutomatic ? { snapshotProjects: fallbackItems } : {}),
      initialMeta: {
        total: meta.total,
        page: meta.page,
        limit: meta.limit || PUBLIC_DISCOVERY_PAGE_SIZE,
      },
      initialQuery: normalizedQuery,
      categories,
      facets,
      compositionFilter,
      snapshotLocked: !isAutomatic,
      fallbacks: payload.site.fallbacks,
      initialError: isAutomatic && !discoveryResult && !fallbackItems.length,
    },
    ...(redirectTo ? { redirect_to: redirectTo } : {}),
  };
};

const loadArticleDiscovery = async (
  payload: TResolvedPublishedPagePayload,
  searchParams: TPublicRouteSearchParams,
  mode: "live" | "preview"
): Promise<TPublicRouteDiscoveryData> => {
  const query =
    mode === "preview"
      ? { ...DEFAULT_ARTICLE_DISCOVERY_QUERY }
      : parseArticleDiscoveryQuery(searchParams);
  const section = compositionSection(payload, "article-collection");
  const compositionFilter = normalizeArticleDiscoveryCompositionFilter(
    section?.source_filter ?? {}
  );
  const isAutomatic = section?.source_mode === "automatic";
  const normalizedQuery = isAutomatic ? query : { ...query, page: 1 };
  const [articlesResult, categoriesResult, facetsResult] =
    await Promise.allSettled([
      isAutomatic
        ? ArticleService.getPublicArticleDiscovery({
            ...query,
            ...articleDiscoveryCompositionQuery(compositionFilter),
          })
        : Promise.resolve(null),
      ArticleCategoryService.getPublicArticleCategories({
        limit: 50,
        sort: "sequence,name",
      }),
      ArticleService.getPublicArticleDiscoveryFacets(),
    ]);
  const fallbackItems = articleCompositionItems(payload);
  const snapshotItems = filterAndSortCuratedArticles(
    fallbackItems,
    normalizedQuery
  );
  const hasDiscoveryResult =
    articlesResult.status === "fulfilled" && articlesResult.value !== null;
  const discoveryResult = hasDiscoveryResult ? articlesResult.value : null;
  const articles = !discoveryResult
    ? snapshotItems
    : discoveryResult.data.flatMap((record) => {
        const article = toSerializableArticleListItem(record);
        return article ? [article] : [];
      });
  const meta = discoveryResult?.meta ?? compositionMeta(articles.length);
  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.data.flatMap((record) => {
          const category = toSerializableArticleCategory(record);
          return category ? [category] : [];
        })
      : [];
  const facets =
    facetsResult.status === "fulfilled" ? facetsResult.value : { topics: [] };
  let redirectTo: string | undefined;

  if (mode === "live" && !isAutomatic && query.page !== 1) {
    redirectTo = `/articles${mergeArticleDiscoveryQueryString(
      querySourceToQueryString(searchParams),
      normalizedQuery
    )}`;
  } else if (mode === "live" && discoveryResult) {
    const currentQueryString = querySourceToQueryString(searchParams);
    const totalPages = Math.max(
      1,
      Math.ceil(discoveryResult.meta.total / discoveryResult.meta.limit)
    );
    if (discoveryResult.query.category !== query.category) {
      redirectTo = `/articles${mergeArticleDiscoveryQueryString(
        currentQueryString,
        discoveryResult.query
      )}`;
    } else if (discoveryResult.meta.total > 0 && query.page > totalPages) {
      redirectTo = `/articles${mergeArticleDiscoveryQueryString(
        currentQueryString,
        { ...query, page: totalPages }
      )}`;
    }
  }

  return {
    route_key: "articles",
    props: {
      initialArticles: articles,
      ...(!isAutomatic ? { snapshotArticles: fallbackItems } : {}),
      initialMeta: {
        total: meta.total,
        page: meta.page,
        limit: meta.limit || PUBLIC_DISCOVERY_PAGE_SIZE,
      },
      initialQuery: normalizedQuery,
      categories,
      facets,
      compositionFilter,
      snapshotLocked: !isAutomatic,
      fallbacks: payload.site.fallbacks,
      initialError: isAutomatic && !discoveryResult && !fallbackItems.length,
    },
    ...(redirectTo ? { redirect_to: redirectTo } : {}),
  };
};

export const loadPublicRouteDiscovery = async (
  payload: TResolvedPublishedPagePayload,
  input: Readonly<{
    search_params?: TPublicRouteSearchParams;
    mode: "live" | "preview";
  }>
): Promise<TPublicRouteDiscoveryData | null> => {
  const searchParams = input.search_params ?? {};
  if (payload.page.route_key === "projects") {
    return await loadProjectDiscovery(payload, searchParams, input.mode);
  }
  if (payload.page.route_key === "articles") {
    return await loadArticleDiscovery(payload, searchParams, input.mode);
  }
  return null;
};
