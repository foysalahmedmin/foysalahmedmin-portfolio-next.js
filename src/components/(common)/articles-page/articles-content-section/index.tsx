import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { LabSwitcher } from "@/components/content/lab-switcher";
import {
  getPillarLabel,
  PILLAR_RELATIONSHIP_OPTIONS,
} from "@/lib/content/pillars";
import {
  DEFAULT_ARTICLE_DISCOVERY_QUERY,
  hasArticleDiscoveryFilters,
  mergeArticleDiscoveryQueryString,
  type ArticleDiscoveryCompositionFilter,
  type ArticleDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import type { TArticleCategory } from "@/types/article-category.type";
import type { TArticleListItem } from "@/types/article.type";
import { ArticleRow } from "../article-row";
import {
  IndexCount,
  IndexFilterChips,
  IndexFilterForm,
  IndexNotice,
  IndexPager,
  type TIndexChip,
} from "../editorial-index";

export type ArticleDiscoveryMeta = {
  total: number;
  page: number;
  limit: number;
};
export type ArticleDiscoveryFacets = { topics: string[] };

export type ArticlesContentSectionProps = {
  initialArticles: TArticleListItem[];
  snapshotArticles?: TArticleListItem[];
  initialMeta: ArticleDiscoveryMeta;
  initialQuery: ArticleDiscoveryQuery;
  categories: TArticleCategory[];
  facets: ArticleDiscoveryFacets;
  compositionFilter?: ArticleDiscoveryCompositionFilter;
  snapshotLocked?: boolean;
  initialError?: boolean;
  fallbacks?: TPublicSiteFallbacksDto;
};

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "featured", label: "Featured first" },
  { value: "name", label: "Title A–Z" },
] as const;

const hrefFor = (state: ArticleDiscoveryQuery) =>
  `/articles${mergeArticleDiscoveryQueryString("", state)}`;

/**
 * The editorial index (Phase 6): the lab switcher, a GET filter form, removable filter chips, a Mono
 * count, hairline rows and plain pagination links. A server component with no client JavaScript: the
 * server already filtered and paged `initialArticles` from the URL, and every control is a form field or
 * a link back to this page.
 */
const ArticlesContentSection = ({
  initialArticles,
  initialMeta,
  initialQuery: query,
  categories,
  facets,
  initialError = false,
}: ArticlesContentSectionProps) => {
  const filtersActive = hasArticleDiscoveryFilters(query);
  const totalPages = Math.max(
    1,
    Math.ceil(initialMeta.total / initialMeta.limit)
  );
  const without = (patch: Partial<ArticleDiscoveryQuery>) =>
    hrefFor({ ...query, ...patch, page: 1 });
  const categoryName = categories.find(
    (category) => category.slug === query.category
  )?.name;

  const chips: TIndexChip[] = [
    ...(query.search.trim()
      ? [
          {
            key: "search",
            label: "Search",
            value: query.search.trim(),
            href: without({ search: "" }),
          },
        ]
      : []),
    ...(query.pillar !== "all"
      ? [
          {
            key: "pillar",
            label: "Role",
            value: getPillarLabel(query.pillar),
            href: without({ pillar: "all" }),
          },
        ]
      : []),
    ...(query.category !== "all"
      ? [
          {
            key: "category",
            label: "Category",
            value: categoryName ?? query.category,
            href: without({ category: "all" }),
          },
        ]
      : []),
    ...(query.topic !== "all"
      ? [
          {
            key: "topic",
            label: "Topic",
            value: query.topic,
            href: without({ topic: "all" }),
          },
        ]
      : []),
  ];

  const topics =
    query.topic !== "all" && !facets.topics.includes(query.topic)
      ? [query.topic, ...facets.topics]
      : facets.topics;

  return (
    <section aria-labelledby="article-results-heading" className="ed-index">
      <div className="container">
        <LabSwitcher current="articles" />
        <h2 id="article-results-heading" className="sr-only">
          Article results
        </h2>

        <IndexFilterForm
          action="/articles"
          legend="Filter and sort articles"
          search={{
            name: "search",
            label: "Search",
            value: query.search,
            placeholder: "Search a topic, pattern, or decision",
          }}
          selects={[
            {
              name: "pillar",
              label: "Role",
              value: query.pillar,
              options: [
                { value: "all", label: "All roles" },
                ...PILLAR_RELATIONSHIP_OPTIONS.map(({ key, label }) => ({
                  value: key,
                  label,
                })),
              ],
            },
            {
              name: "category",
              label: "Category",
              value: query.category,
              options: [
                { value: "all", label: "All categories" },
                ...(query.category !== "all" && !categoryName
                  ? [
                      {
                        value: query.category,
                        label: `Unavailable category: ${query.category}`,
                      },
                    ]
                  : []),
                ...categories.map((category) => ({
                  value: category.slug,
                  label: category.name,
                })),
              ],
            },
            {
              name: "topic",
              label: "Topic",
              value: query.topic,
              options: [
                { value: "all", label: "All topics" },
                ...topics.map((topic) => ({ value: topic, label: topic })),
              ],
            },
            {
              name: "sort",
              label: "Sort",
              value: query.sort,
              options: SORTS,
            },
          ]}
          active={filtersActive}
          clearHref={hrefFor({ ...DEFAULT_ARTICLE_DISCOVERY_QUERY })}
        />
        <IndexFilterChips chips={chips} />

        {initialError ? (
          <IndexNotice
            tone="error"
            title="Articles could not be loaded"
            description="The published knowledge base is temporarily unavailable. Try again in a moment."
            action={{ href: hrefFor(query), label: "Try again" }}
          />
        ) : (
          <>
            <IndexCount
              total={initialMeta.total}
              noun="article"
              filtered={filtersActive}
            />
            {initialArticles.length === 0 ? (
              <IndexNotice
                tone="empty"
                title={
                  filtersActive
                    ? "No matching articles"
                    : "No published articles yet"
                }
                description={
                  filtersActive
                    ? "Try a broader role, category, topic, or search phrase."
                    : "Published engineering notes will appear here when they are ready."
                }
                action={
                  filtersActive
                    ? {
                        href: hrefFor({ ...DEFAULT_ARTICLE_DISCOVERY_QUERY }),
                        label: "Clear filters",
                      }
                    : undefined
                }
              />
            ) : (
              <ol className="ed-rows" id="article-results" role="list">
                {initialArticles.map((article) => (
                  <ArticleRow key={article._id} article={article} />
                ))}
              </ol>
            )}
            <IndexPager
              page={Math.min(query.page, totalPages)}
              totalPages={totalPages}
              hrefFor={(page) =>
                `${hrefFor({ ...query, page })}#article-results`
              }
              ariaLabel="Article result pages"
            />
          </>
        )}
      </div>
    </section>
  );
};

export default ArticlesContentSection;
