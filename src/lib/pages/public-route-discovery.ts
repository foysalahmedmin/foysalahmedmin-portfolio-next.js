import "server-only";

import * as ArticleCategoryService from "@/app/api/article-categories/article-category.service";
import * as ArticleService from "@/app/api/articles/article.service";
import * as CaseStudyCategoryService from "@/app/api/case-study-categories/case-study-category.service";
import * as CaseStudyService from "@/app/api/case-studies/case-study.service";
import type { TResolvedPublishedPagePayload } from "@/app/api/pages/page-resolver.type";
import * as ProjectCategoryService from "@/app/api/project-categories/project-category.service";
import * as ProjectService from "@/app/api/projects/project.service";
import * as VideoCategoryService from "@/app/api/video-categories/video-category.service";
import * as VideoService from "@/app/api/videos/video.service";
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
import {
  DEFAULT_CASE_STUDY_DISCOVERY_QUERY,
  caseStudyDiscoveryCompositionQuery,
  mergeCaseStudyDiscoveryQueryString,
  normalizeCaseStudyDiscoveryCompositionFilter,
  parseCaseStudyDiscoveryQuery,
  toSerializableCaseStudyCategory,
  toSerializableCaseStudyListItem,
} from "@/lib/discovery/case-study-discovery";
import {
  DEFAULT_VIDEO_DISCOVERY_QUERY,
  VIDEO_LANE_PAGE_SIZE,
  mergeVideoDiscoveryQueryString,
  normalizeVideoDiscoveryCompositionFilter,
  parseVideoDiscoveryQuery,
  toSerializableVideoCategory,
  toSerializableVideoListItem,
  videoDiscoveryCompositionQuery,
  type VideoDiscoveryQuery,
} from "@/lib/discovery/video-discovery";
import type { VideoAspectRatio } from "@/lib/content/video-contract";
import type { TVideosLane } from "@/components/(common)/videos-page/videos-content-section";
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

type TCollectionKind =
  | "project-collection"
  | "article-collection"
  | "case-study-collection"
  | "video-collection";

const sectionOf = (
  payload: TResolvedPublishedPagePayload,
  kind: TCollectionKind
) => payload.sections.find((section) => section.kind === kind);

const loadCaseStudyDiscovery = async (
  payload: TResolvedPublishedPagePayload,
  searchParams: TPublicRouteSearchParams,
  mode: "live" | "preview"
): Promise<TPublicRouteDiscoveryData> => {
  const query =
    mode === "preview"
      ? { ...DEFAULT_CASE_STUDY_DISCOVERY_QUERY }
      : parseCaseStudyDiscoveryQuery(searchParams);
  const section = sectionOf(payload, "case-study-collection");
  const composition = normalizeCaseStudyDiscoveryCompositionFilter(
    section?.source_filter ?? {}
  );
  const [result, categories, facets] = await Promise.allSettled([
    CaseStudyService.getPublicCaseStudyDiscovery({
      ...query,
      ...caseStudyDiscoveryCompositionQuery(composition),
    }),
    CaseStudyCategoryService.getPublicCaseStudyCategories({
      limit: 50,
      sort: "sequence,name",
    }),
    CaseStudyService.getPublicCaseStudyDiscoveryFacets(),
  ]);
  const discovery = result.status === "fulfilled" ? result.value : null;
  const snapshot = (section?.items ?? []).flatMap((record) => {
    const item = toSerializableCaseStudyListItem(record);
    return item ? [item] : [];
  });
  const items = discovery
    ? discovery.data.flatMap((record) => {
        const item = toSerializableCaseStudyListItem(record);
        return item ? [item] : [];
      })
    : snapshot;
  const meta = discovery?.meta ?? {
    total: items.length,
    page: 1,
    limit: Math.max(1, items.length),
  };
  let redirectTo: string | undefined;
  if (mode === "live" && discovery) {
    const currentQueryString = querySourceToQueryString(searchParams);
    const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
    if (discovery.query.category !== query.category) {
      redirectTo = `/case-studies${mergeCaseStudyDiscoveryQueryString(
        currentQueryString,
        discovery.query as typeof query
      )}`;
    } else if (meta.total > 0 && query.page > totalPages) {
      redirectTo = `/case-studies${mergeCaseStudyDiscoveryQueryString(
        currentQueryString,
        { ...query, page: totalPages }
      )}`;
    }
  }

  return {
    route_key: "case-studies",
    props: {
      items,
      meta,
      query,
      categories:
        categories.status === "fulfilled"
          ? categories.value.data.flatMap((record) => {
              const category = toSerializableCaseStudyCategory(record);
              return category ? [category] : [];
            })
          : [],
      facets: facets.status === "fulfilled" ? facets.value : { technologies: [] },
      fallbacks: payload.site.fallbacks,
      initialError: !discovery && !snapshot.length,
    },
    ...(redirectTo ? { redirect_to: redirectTo } : {}),
  };
};

const EMPTY_LANE = (limit: number): TVideosLane => ({
  items: [],
  meta: { total: 0, page: 1, limit },
});

const loadVideoLane = async (
  query: VideoDiscoveryQuery,
  lane: VideoAspectRatio,
  composition: Readonly<Record<string, string | boolean>>
) => {
  const limit = VIDEO_LANE_PAGE_SIZE[query.show][lane];
  const result = await VideoService.getPublicVideoDiscovery({
    search: query.search,
    category: query.category,
    sort: query.sort,
    aspect_ratio: lane,
    page: lane === "landscape" ? query.landscape_page : query.reel_page,
    limit,
    ...composition,
  });
  const lanePage: TVideosLane = {
    items: result.data.flatMap((record) => {
      const item = toSerializableVideoListItem(record);
      return item ? [item] : [];
    }),
    meta: {
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit || limit,
    },
  };
  return { lane: lanePage, category: result.query.category };
};

const loadVideoDiscovery = async (
  payload: TResolvedPublishedPagePayload,
  searchParams: TPublicRouteSearchParams,
  mode: "live" | "preview"
): Promise<TPublicRouteDiscoveryData> => {
  const query =
    mode === "preview"
      ? { ...DEFAULT_VIDEO_DISCOVERY_QUERY }
      : parseVideoDiscoveryQuery(searchParams);
  const section = sectionOf(payload, "video-collection");
  const composition = videoDiscoveryCompositionQuery(
    normalizeVideoDiscoveryCompositionFilter(section?.source_filter ?? {})
  );
  const [landscape, reel, categories] = await Promise.allSettled([
    query.show === "reel"
      ? Promise.resolve(null)
      : loadVideoLane(query, "landscape", composition),
    query.show === "landscape"
      ? Promise.resolve(null)
      : loadVideoLane(query, "reel", composition),
    VideoCategoryService.getPublicVideoCategories({
      limit: 50,
      sort: "sequence,name",
    }),
  ]);
  const landscapeResult =
    landscape.status === "fulfilled" ? landscape.value : null;
  const reelResult = reel.status === "fulfilled" ? reel.value : null;
  const failed =
    (query.show !== "reel" && landscape.status === "rejected") ||
    (query.show !== "landscape" && reel.status === "rejected");

  let redirectTo: string | undefined;
  if (mode === "live") {
    const currentQueryString = querySourceToQueryString(searchParams);
    const canonicalCategory =
      landscapeResult?.category ?? reelResult?.category ?? query.category;
    const clamp = (
      data: TVideosLane | undefined,
      current: number
    ): number | null => {
      if (!data || data.meta.total === 0) return null;
      const totalPages = Math.max(1, Math.ceil(data.meta.total / data.meta.limit));
      return current > totalPages ? totalPages : null;
    };
    const landscapePage = clamp(landscapeResult?.lane, query.landscape_page);
    const reelPage = clamp(reelResult?.lane, query.reel_page);
    if (
      canonicalCategory !== query.category ||
      landscapePage !== null ||
      reelPage !== null
    ) {
      redirectTo = `/videos${mergeVideoDiscoveryQueryString(currentQueryString, {
        ...query,
        category: canonicalCategory,
        landscape_page: landscapePage ?? query.landscape_page,
        reel_page: reelPage ?? query.reel_page,
      })}`;
    }
  }

  return {
    route_key: "videos",
    props: {
      landscape:
        landscapeResult?.lane ?? EMPTY_LANE(VIDEO_LANE_PAGE_SIZE[query.show].landscape),
      reel: reelResult?.lane ?? EMPTY_LANE(VIDEO_LANE_PAGE_SIZE[query.show].reel),
      query,
      categories:
        categories.status === "fulfilled"
          ? categories.value.data.flatMap((record) => {
              const category = toSerializableVideoCategory(record);
              return category ? [category] : [];
            })
          : [],
      initialError: failed,
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
  if (payload.page.route_key === "case-studies") {
    return await loadCaseStudyDiscovery(payload, searchParams, input.mode);
  }
  if (payload.page.route_key === "videos") {
    return await loadVideoDiscovery(payload, searchParams, input.mode);
  }
  return null;
};
