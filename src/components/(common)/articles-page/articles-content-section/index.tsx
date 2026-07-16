"use client";

import { EmptyState, ErrorState, Skeleton } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import OptimizedMedia from "@/components/ui/optimized-media";
import { Pagination } from "@/components/ui/pagination";
import { useUrlListQueryState } from "@/hooks/ui/use-url-list-query-state";
import { useDebounce } from "@/hooks/utils/use-debounce";
import {
  isAbortedRequest,
  useLatestRequest,
} from "@/hooks/utils/use-latest-request";
import {
  getPillarLabel,
  PILLAR_RELATIONSHIP_OPTIONS,
} from "@/lib/content/pillars";
import {
  DEFAULT_ARTICLE_DISCOVERY_QUERY,
  PUBLIC_DISCOVERY_PAGE_SIZE,
  getArticleDiscoveryRequestKey,
  hasArticleDiscoveryFilters,
  type ArticleDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import { cn } from "@/lib/utils";
import { getArticles } from "@/services/article.service";
import type { TArticleCategory } from "@/types/article-category.type";
import type { TArticleListItem } from "@/types/article.type";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  FilterX,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type DiscoveryMeta = { total: number; page: number; limit: number };
type ArticleFacets = { topics: string[] };
type RequestPhase = "ready" | "loading" | "refreshing" | "error" | "stale";

type ArticlesContentSectionProps = {
  initialArticles: TArticleListItem[];
  initialMeta: DiscoveryMeta;
  initialQuery: ArticleDiscoveryQuery;
  categories: TArticleCategory[];
  facets: ArticleFacets;
  initialError?: boolean;
};

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const isMeaningfullyUpdated = (published?: string, updated?: string) => {
  if (!published || !updated) return false;
  const publishedTime = new Date(published).valueOf();
  const updatedTime = new Date(updated).valueOf();
  return (
    Number.isFinite(publishedTime) &&
    Number.isFinite(updatedTime) &&
    updatedTime - publishedTime >= 24 * 60 * 60 * 1000
  );
};

const FilterSelect = ({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) => (
  <label htmlFor={id} className="grid gap-2">
    <span className="type-label text-muted-foreground">{label}</span>
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border-border bg-background focus-visible:ring-ring h-11 min-w-0 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
    >
      {children}
    </select>
  </label>
);

const ArticlesContentSection = ({
  initialArticles,
  initialMeta,
  initialQuery,
  categories,
  facets,
  initialError = false,
}: ArticlesContentSectionProps) => {
  const [articles, setArticles] = useState(initialArticles);
  const [meta, setMeta] = useState(initialMeta);
  const [phase, setPhase] = useState<RequestPhase>(
    initialError ? "error" : "ready"
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const { isReady, query, setQuery } = useUrlListQueryState(
    "articles",
    initialQuery
  );
  const debouncedSearch = useDebounce(query.search.trim(), 350);
  const { abort, isCurrent, start } = useLatestRequest();
  const firstRequest = useRef(true);
  const articlesRef = useRef(articles);
  articlesRef.current = articles;
  const requestQuery = useMemo(
    () => ({
      search: debouncedSearch,
      pillar: query.pillar,
      category: query.category,
      topic: query.topic,
      sort: query.sort,
      page: query.page,
    }),
    [
      debouncedSearch,
      query.category,
      query.page,
      query.pillar,
      query.sort,
      query.topic,
    ]
  );
  const isSearchPending = query.search.trim() !== debouncedSearch;
  const isUpdating =
    phase === "loading" || phase === "refreshing" || isSearchPending;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const filtersActive = hasArticleDiscoveryFilters(query);

  const updateQuery = (
    patch: Partial<ArticleDiscoveryQuery>,
    history: "push" | "replace" = "push"
  ) => {
    abort();
    setQuery(patch, { history });
  };

  useEffect(() => {
    if (!isReady) return;
    const requestKey = getArticleDiscoveryRequestKey(requestQuery);
    if (firstRequest.current) {
      firstRequest.current = false;
      if (requestKey === getArticleDiscoveryRequestKey(initialQuery)) return;
    }

    const fetchArticles = async () => {
      const signal = start();
      setPhase(articlesRef.current.length ? "refreshing" : "loading");
      try {
        const response = await getArticles(
          {
            page: requestQuery.page,
            search: requestQuery.search.trim() || undefined,
            pillar:
              requestQuery.pillar === "all" ? undefined : requestQuery.pillar,
            category:
              requestQuery.category === "all"
                ? undefined
                : requestQuery.category,
            topic:
              requestQuery.topic === "all" ? undefined : requestQuery.topic,
            sort: requestQuery.sort,
          },
          { signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error("The article response was incomplete.");
        }
        if (!isCurrent(signal)) return;
        const responseMeta = response.meta;
        const nextMeta = {
          total:
            responseMeta &&
            Number.isSafeInteger(responseMeta.total) &&
            responseMeta.total >= 0
              ? responseMeta.total
              : response.data.length,
          page:
            responseMeta &&
            Number.isSafeInteger(responseMeta.page) &&
            responseMeta.page > 0
              ? responseMeta.page
              : requestQuery.page,
          limit:
            responseMeta &&
            Number.isSafeInteger(responseMeta.limit) &&
            responseMeta.limit > 0 &&
            responseMeta.limit <= 50
              ? responseMeta.limit
              : PUBLIC_DISCOVERY_PAGE_SIZE,
        };
        const nextTotalPages = Math.max(
          1,
          Math.ceil(nextMeta.total / nextMeta.limit)
        );
        if (nextMeta.total > 0 && requestQuery.page > nextTotalPages) {
          abort();
          setQuery({ page: nextTotalPages }, { history: "replace" });
          return;
        }
        setArticles(response.data);
        setMeta(nextMeta);
        setPhase("ready");
      } catch (error) {
        if (isAbortedRequest(error, signal)) return;
        setPhase(articlesRef.current.length ? "stale" : "error");
      }
    };

    void fetchArticles();
  }, [
    abort,
    initialQuery,
    isCurrent,
    isReady,
    requestQuery,
    retryVersion,
    setQuery,
    start,
  ]);

  const retry = () => setRetryVersion((current) => current + 1);
  const clearFilters = () => {
    abort();
    setQuery({ ...DEFAULT_ARTICLE_DISCOVERY_QUERY }, { history: "push" });
  };
  const topicOptions =
    query.topic !== "all" && !facets.topics.includes(query.topic)
      ? [query.topic, ...facets.topics]
      : facets.topics;
  const hasSelectedCategory = categories.some(
    (category) => category.slug === query.category
  );

  return (
    <section
      aria-labelledby="article-results-heading"
      className="py-16 lg:py-24"
    >
      <div className="container">
        <div className="border-border bg-surface-subtle rounded-[var(--radius-xl-token)] border p-5 lg:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="type-label text-primary">Knowledge explorer</p>
              <h2
                id="article-results-heading"
                className="mt-2 text-2xl font-bold"
              >
                Follow the engineering decisions
              </h2>
            </div>
            {filtersActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <FilterX className="size-4" aria-hidden="true" />
                Clear filters
              </Button>
            ) : null}
          </div>

          <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <legend className="sr-only">Filter and sort articles</legend>
            <label
              htmlFor="article-search"
              className="grid gap-2 sm:col-span-2"
            >
              <span className="type-label text-muted-foreground">Search</span>
              <span className="relative block">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="article-search"
                  type="search"
                  autoComplete="off"
                  maxLength={100}
                  value={query.search}
                  onChange={(event) => {
                    abort();
                    setQuery(
                      { search: event.target.value, page: 1 },
                      { history: "replace" }
                    );
                  }}
                  placeholder="Search a topic, pattern, or decision"
                  className="border-border bg-background focus-visible:ring-ring h-11 w-full rounded-md border pr-3 pl-10 text-sm outline-none focus-visible:ring-2"
                  aria-controls="article-results"
                />
              </span>
            </label>
            <FilterSelect
              id="article-pillar"
              label="Discipline"
              value={query.pillar}
              onChange={(pillar) =>
                updateQuery({
                  pillar: pillar as ArticleDiscoveryQuery["pillar"],
                  page: 1,
                })
              }
            >
              <option value="all">All five disciplines</option>
              {PILLAR_RELATIONSHIP_OPTIONS.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              id="article-category"
              label="Category"
              value={query.category}
              onChange={(category) => updateQuery({ category, page: 1 })}
            >
              <option value="all">All categories</option>
              {query.category !== "all" && !hasSelectedCategory ? (
                <option value={query.category}>
                  Unavailable category: {query.category}
                </option>
              ) : null}
              {categories.map((category) => (
                <option key={category._id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              id="article-topic"
              label="Topic"
              value={query.topic}
              onChange={(topic) => updateQuery({ topic, page: 1 })}
            >
              <option value="all">All topics</option>
              {topicOptions.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              id="article-sort"
              label="Sort"
              value={query.sort}
              onChange={(sort) =>
                updateQuery({
                  sort: sort as ArticleDiscoveryQuery["sort"],
                  page: 1,
                })
              }
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="featured">Featured first</option>
              <option value="name">Title A–Z</option>
            </FilterSelect>
          </fieldset>
        </div>

        <div className="mt-8 flex min-h-6 flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            {meta.total} {meta.total === 1 ? "article" : "articles"}
            {filtersActive ? " match the current filters" : " available"}.
          </p>
          {isUpdating ? (
            <p
              className="text-primary inline-flex items-center gap-2"
              role="status"
            >
              <RefreshCw
                className="size-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
              Updating results…
            </p>
          ) : null}
        </div>

        {phase === "stale" ? (
          <div
            className="border-warning/40 bg-warning/10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
            role="status"
          >
            <p>
              Showing the last available articles because the refresh failed.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              <RefreshCw className="size-4" aria-hidden="true" /> Refresh
            </Button>
          </div>
        ) : null}

        <div
          id="article-results"
          className="mt-8"
          aria-busy={isUpdating || undefined}
        >
          {phase === "loading" ? (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-[16/10] rounded-[var(--radius-xl-token)]"
                />
              ))}
            </div>
          ) : phase === "error" ? (
            <ErrorState
              title="Articles could not be loaded"
              description="The published knowledge base is temporarily unavailable. Retry without losing your filters."
              onRetry={retry}
            />
          ) : articles.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="size-5" aria-hidden="true" />}
              title={
                filtersActive
                  ? "No matching articles"
                  : "No published articles yet"
              }
              description={
                filtersActive
                  ? "Try a broader discipline, category, topic, or search phrase."
                  : "Published engineering notes will appear here when they are ready."
              }
              action={
                filtersActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                  >
                    <FilterX className="size-4" aria-hidden="true" /> Clear
                    filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((article) => {
                const href = `/articles/${article.slug ?? article._id}`;
                const publishedDate = formatDate(article.published_at);
                const updatedDate = isMeaningfullyUpdated(
                  article.published_at,
                  article.updated_at
                )
                  ? formatDate(article.updated_at)
                  : null;
                return (
                  <article
                    key={article._id}
                    className={cn(
                      "group border-border bg-card flex min-h-full flex-col overflow-hidden rounded-[var(--radius-xl-token)] border shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] duration-[var(--motion-standard)]",
                      "hover:border-primary/40 hover:shadow-[var(--shadow-lg)] motion-safe:hover:-translate-y-1"
                    )}
                  >
                    <Link
                      href={href}
                      className="focus-visible:ring-ring relative block aspect-[16/10] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset"
                    >
                      <OptimizedMedia
                        src={article.thumbnail?.url}
                        alt={
                          article.thumbnail?.alt_text ||
                          `${article.name} article visual`
                        }
                        fallback="article"
                        pillar={article.primary_pillar}
                        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                        className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.04]"
                      />
                      {article.is_featured ? (
                        <span className="bg-background/90 text-foreground absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur">
                          Featured
                        </span>
                      ) : null}
                    </Link>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                        <span className="text-primary">
                          {article.primary_pillar
                            ? getPillarLabel(article.primary_pillar)
                            : article.category?.name || "Engineering"}
                        </span>
                        {article.category?.name && article.primary_pillar ? (
                          <span className="text-muted-foreground">
                            {article.category.name}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-2xl leading-tight font-bold">
                        <Link
                          href={href}
                          className="hover:text-primary focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
                        >
                          {article.name}
                        </Link>
                      </h3>
                      {article.excerpt || article.description ? (
                        <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
                          {article.excerpt || article.description}
                        </p>
                      ) : null}
                      <dl className="border-border text-muted-foreground mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs">
                        {article.author?.name ? (
                          <div className="inline-flex items-center gap-1.5">
                            <UserRound
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            <dt className="sr-only">Author</dt>
                            <dd>{article.author.name}</dd>
                          </div>
                        ) : null}
                        {article.reading_time_minutes ? (
                          <div className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            <dt className="sr-only">Reading time</dt>
                            <dd>{article.reading_time_minutes} min read</dd>
                          </div>
                        ) : null}
                        {publishedDate ? (
                          <div className="inline-flex items-center gap-1.5">
                            <CalendarDays
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            <dt className="sr-only">Published</dt>
                            <dd>
                              <time dateTime={article.published_at}>
                                {publishedDate}
                              </time>
                            </dd>
                          </div>
                        ) : null}
                        {updatedDate ? (
                          <div>
                            <dt className="sr-only">Updated</dt>
                            <dd>
                              Updated{" "}
                              <time dateTime={article.updated_at}>
                                {updatedDate}
                              </time>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                      {article.topics?.length ? (
                        <ul
                          className="mt-5 flex flex-wrap gap-2"
                          aria-label="Article topics"
                        >
                          {article.topics.slice(0, 4).map((topic) => (
                            <li
                              key={topic}
                              className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs"
                            >
                              {topic}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <Link
                        href={href}
                        className="text-primary focus-visible:ring-ring mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6 text-sm font-bold outline-none focus-visible:ring-2"
                        aria-label={`Read ${article.name}`}
                      >
                        Read the article
                        <ArrowRight
                          className="size-4 transition-transform motion-safe:group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {phase !== "loading" && articles.length > 0 ? (
          <Pagination
            ariaLabel="Article result pages"
            page={Math.min(query.page, totalPages)}
            limit={meta.limit}
            total={meta.total}
            setPage={(page) => updateQuery({ page })}
            disabled={isUpdating}
            showPageSize={false}
            className="mt-12"
          />
        ) : null}
      </div>
    </section>
  );
};

export default ArticlesContentSection;
