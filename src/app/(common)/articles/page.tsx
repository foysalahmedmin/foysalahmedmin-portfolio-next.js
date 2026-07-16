import * as ArticleCategoryService from "@/app/api/article-categories/article-category.service";
import * as ArticleService from "@/app/api/articles/article.service";
import ArticlesContentSection from "@/components/(common)/articles-page/articles-content-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import {
  PUBLIC_DISCOVERY_PAGE_SIZE,
  mergeArticleDiscoveryQueryString,
  parseArticleDiscoveryQuery,
  querySourceToQueryString,
  toSerializableArticleCategory,
  toSerializableArticleListItem,
} from "@/lib/discovery/public-discovery";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { readPublishedSite } from "@/lib/site/published-site";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type SearchParams = Record<
  string,
  string | string[] | number | null | undefined
>;

type ArticlesPageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await readPublishedSite();
  return buildPageMetadata(site, {
    pathname: "/articles",
    title: "Articles",
    description:
      "Practical engineering notes on frontend, backend, AI automation, system design, and full-stack delivery.",
    kind: "page",
  });
}

export default async function ArticlesPage({
  searchParams,
}: ArticlesPageProps) {
  const rawSearchParams = await searchParams;
  const query = parseArticleDiscoveryQuery(rawSearchParams);
  const currentQueryString = querySourceToQueryString(rawSearchParams);
  const [site, [articlesResult, categoriesResult, facetsResult]] =
    await Promise.all([
      readPublishedSite(),
      Promise.allSettled([
      ArticleService.getPublicArticleDiscovery(query),
      ArticleCategoryService.getPublicArticleCategories({
        limit: 50,
        sort: "sequence,name",
      }),
      ArticleService.getPublicArticleDiscoveryFacets(),
      ]),
    ]);

  const hasInitialError = articlesResult.status === "rejected";
  const result =
    articlesResult.status === "fulfilled"
      ? articlesResult.value
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
    articlesResult.status === "fulfilled" &&
    articlesResult.value.query.category !== query.category
  ) {
    redirect(
      `/articles${mergeArticleDiscoveryQueryString(
        currentQueryString,
        articlesResult.value.query
      )}`
    );
  }
  if (!hasInitialError && result.meta.total > 0 && query.page > totalPages) {
    redirect(
      `/articles${mergeArticleDiscoveryQueryString(currentQueryString, {
        ...query,
        page: totalPages,
      })}`
    );
  }

  const articles = result.data.flatMap((record) => {
    const article = toSerializableArticleListItem(record);
    return article ? [article] : [];
  });
  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.data.flatMap((record) => {
          const category = toSerializableArticleCategory(record);
          return category ? [category] : [];
        })
      : [];
  const facets =
    facetsResult.status === "fulfilled" ? facetsResult.value : { topics: [] };

  return (
    <main className="min-h-screen">
      <PageHeaderSection
        title="Engineering field notes"
        description="Practical, human-written explanations of the choices, trade-offs, and patterns behind reliable digital products."
        breadcrumbItems={[
          { index: 1, name: "Home", href: "/", icon: "house" },
          { index: 2, name: "Articles", href: "/articles" },
        ]}
      />

      <ArticlesContentSection
        initialArticles={articles}
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
