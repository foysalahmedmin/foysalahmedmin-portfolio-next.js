import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import {
  DiscoveryFilters,
  type TDiscoveryFilterField,
} from "@/components/content/discovery-filters";
import { CaseStudyCard } from "@/components/content/case-study-card";
import { EmptyState } from "@/components/ui/async-state";
import { LinkPagination } from "@/components/ui/link-pagination";
import { PILLAR_RELATIONSHIP_OPTIONS } from "@/lib/content/pillars";
import {
  CASE_STUDY_DISCOVERY_SORTS,
  DEFAULT_CASE_STUDY_DISCOVERY_QUERY,
  hasCaseStudyDiscoveryFilters,
  mergeCaseStudyDiscoveryQueryString,
  type CaseStudyDiscoveryQuery,
} from "@/lib/discovery/case-study-discovery";
import type { TCaseStudyCategory } from "@/types/case-study-category.type";
import type { TCaseStudyListItem } from "@/types/case-study.type";
import { BookOpenCheck } from "lucide-react";
import { Suspense } from "react";

export type CaseStudiesContentSectionProps = Readonly<{
  items: readonly TCaseStudyListItem[];
  meta: Readonly<{ total: number; page: number; limit: number }>;
  categories: readonly TCaseStudyCategory[];
  facets: Readonly<{ technologies: readonly string[] }>;
  query: CaseStudyDiscoveryQuery;
  fallbacks?: TPublicSiteFallbacksDto;
  initialError?: boolean;
}>;

const SORT_LABELS: Record<(typeof CASE_STUDY_DISCOVERY_SORTS)[number], string> =
  {
    newest: "Newest first",
    oldest: "Oldest first",
    featured: "Featured first",
    name: "Title A–Z",
  };

const CaseStudiesContentSection = ({
  items,
  meta,
  categories,
  facets,
  query,
  fallbacks,
  initialError = false,
}: CaseStudiesContentSectionProps) => {
  const filtersActive = hasCaseStudyDiscoveryFilters(query);
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const hasSelectedCategory = categories.some(
    (category) => category.slug === query.category
  );
  const technologies =
    query.technology !== "all" && !facets.technologies.includes(query.technology)
      ? [query.technology, ...facets.technologies]
      : facets.technologies;
  const defaults = DEFAULT_CASE_STUDY_DISCOVERY_QUERY;

  const fields: TDiscoveryFilterField[] = [
    {
      type: "search",
      key: "search",
      label: "Search",
      value: query.search,
      placeholder: "Search by problem, industry or tool",
    },
    {
      type: "select",
      key: "pillar",
      label: "Role",
      value: query.pillar,
      defaultValue: defaults.pillar,
      options: [
        { value: "all", label: "All roles" },
        ...PILLAR_RELATIONSHIP_OPTIONS.map(({ key, label }) => ({
          value: key,
          label,
        })),
      ],
    },
    {
      type: "select",
      key: "category",
      label: "Category",
      value: query.category,
      defaultValue: defaults.category,
      options: [
        { value: "all", label: "All categories" },
        ...(query.category !== "all" && !hasSelectedCategory
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
      type: "select",
      key: "technology",
      label: "Tool",
      value: query.technology,
      defaultValue: defaults.technology,
      options: [
        { value: "all", label: "All tools" },
        ...technologies.map((technology) => ({
          value: technology,
          label: technology,
        })),
      ],
    },
    {
      type: "select",
      key: "sort",
      label: "Sort",
      value: query.sort,
      defaultValue: defaults.sort,
      options: CASE_STUDY_DISCOVERY_SORTS.map((sort) => ({
        value: sort,
        label: SORT_LABELS[sort],
      })),
    },
  ];

  return (
    <section
      aria-labelledby="case-study-results-heading"
      className="py-16 lg:py-24"
    >
      <div className="container">
        <div className="border-border bg-surface-subtle rounded-[var(--radius-xl-token)] border p-5 lg:p-7">
          <p className="type-label text-primary">Case study explorer</p>
          <h2
            id="case-study-results-heading"
            className="mt-2 mb-5 text-2xl font-bold"
          >
            Find a problem like yours
          </h2>
          <Suspense fallback={null}>
            <DiscoveryFilters
              legend="Filter and sort case studies"
              fields={fields}
              resetKeys={["page"]}
              clearHref="/case-studies"
              className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            />
          </Suspense>
        </div>

        <p className="text-muted-foreground mt-8 text-sm" aria-live="polite">
          {meta.total} {meta.total === 1 ? "case study" : "case studies"}
          {filtersActive ? " match the current filters" : " available"}.
        </p>

        <div id="case-study-results" className="mt-8">
          {initialError ? (
            <EmptyState
              title="Case studies could not be loaded"
              description="The published library is temporarily unavailable. Please try again in a moment."
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<BookOpenCheck className="size-5" aria-hidden="true" />}
              title={
                filtersActive
                  ? "No matching case studies"
                  : "No published case studies yet"
              }
              description={
                filtersActive
                  ? "Try a broader role, category, tool or search phrase."
                  : "Published case studies will appear here when they are ready."
              }
            />
          ) : (
            <ul className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {items.map((caseStudy) => (
                <li key={caseStudy._id} className="min-w-0">
                  <CaseStudyCard caseStudy={caseStudy} fallbacks={fallbacks} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <LinkPagination
          page={Math.min(query.page, totalPages)}
          totalPages={totalPages}
          hrefFor={(page) =>
            `/case-studies${mergeCaseStudyDiscoveryQueryString("", {
              ...query,
              page,
            })}`
          }
          ariaLabel="Case study result pages"
          className="mt-12"
        />
      </div>
    </section>
  );
};

export default CaseStudiesContentSection;
