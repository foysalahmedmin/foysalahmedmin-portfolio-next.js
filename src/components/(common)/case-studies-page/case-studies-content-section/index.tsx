import {
  CASE_STUDY_ENGAGEMENT_LABELS,
  CASE_STUDY_ENGAGEMENT_TYPES,
} from "@/lib/content/case-study-contract";
import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { CaseFileRow } from "@/components/(common)/home-page/case-studies-section/files";
import { buttonVariants } from "@/components/ui/button-variants";
import { LinkPagination } from "@/components/ui/link-pagination";
import {
  PILLAR_RELATIONSHIP_OPTIONS,
  getPillarLabel,
} from "@/lib/content/pillars";
import {
  CASE_STUDY_DISCOVERY_SORTS,
  DEFAULT_CASE_STUDY_DISCOVERY_QUERY,
  hasCaseStudyDiscoveryFilters,
  mergeCaseStudyDiscoveryQueryString,
  type CaseStudyDiscoveryQuery,
} from "@/lib/discovery/case-study-discovery";
import type { TCaseStudyCategory } from "@/types/case-study-category.type";
import type { TCaseStudyListItem } from "@/types/case-study.type";
import { X } from "lucide-react";
import Link from "next/link";
import { Topology } from "./topology";

export type CaseStudiesContentSectionProps = Readonly<{
  items: readonly TCaseStudyListItem[];
  meta: Readonly<{ total: number; page: number; limit: number }>;
  categories: readonly TCaseStudyCategory[];
  facets: Readonly<{ technologies: readonly string[] }>;
  query: CaseStudyDiscoveryQuery;
  fallbacks?: TPublicSiteFallbacksDto;
  initialError?: boolean;
}>;

const BASE_PATH = "/case-studies";
const defaults = DEFAULT_CASE_STUDY_DISCOVERY_QUERY;

const SORT_LABELS: Record<(typeof CASE_STUDY_DISCOVERY_SORTS)[number], string> =
  {
    newest: "Newest first",
    oldest: "Oldest first",
    featured: "Featured first",
    name: "Title A–Z",
  };

const hrefFor = (query: CaseStudyDiscoveryQuery) =>
  `${BASE_PATH}${mergeCaseStudyDiscoveryQueryString("", query)}`;

type TFilterKey =
  | "search"
  | "pillar"
  | "category"
  | "technology"
  | "engagement";

/**
 * The case files index (docs plan 4.2): the Ch.4 case-file rows as a full list, with URL-backed
 * discovery. It is a server component with no client JavaScript: the filters are a plain GET form
 * (the server renders the results from `searchParams`), active filters and pagination are links.
 */
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
  const dirty = filtersActive || query.sort !== defaults.sort;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const page = Math.min(query.page, totalPages);
  const selectedCategory = categories.find(
    (category) => category.slug === query.category
  );
  const technologies =
    query.technology !== "all" &&
    !facets.technologies.includes(query.technology)
      ? [query.technology, ...facets.technologies]
      : facets.technologies;

  // One link per active filter that drops just that param (and the page counter, which no longer applies).
  const chips: { key: TFilterKey; label: string; value: string }[] = [
    ...(query.search.trim()
      ? [
          {
            key: "search" as const,
            label: "Search",
            value: `“${query.search}”`,
          },
        ]
      : []),
    ...(query.pillar !== "all"
      ? [
          {
            key: "pillar" as const,
            label: "Role",
            value: getPillarLabel(query.pillar),
          },
        ]
      : []),
    ...(query.category !== "all"
      ? [
          {
            key: "category" as const,
            label: "Category",
            value: selectedCategory?.name ?? query.category,
          },
        ]
      : []),
    ...(query.technology !== "all"
      ? [{ key: "technology" as const, label: "Tool", value: query.technology }]
      : []),
    ...(query.engagement !== "all"
      ? [
          {
            key: "engagement" as const,
            label: "Type",
            value: CASE_STUDY_ENGAGEMENT_LABELS[query.engagement],
          },
        ]
      : []),
  ];

  return (
    <section aria-labelledby="cfx-heading" className="cfx">
      <div className="container">
        <h2 id="cfx-heading" className="sr-only">
          Case files
        </h2>

        <div className="cfx-top">
          <form
            className="cfx-filters"
            method="get"
            action={BASE_PATH}
            role="search"
            aria-label="Filter and sort case files"
          >
            <div className="cfx-field cfx-field--search">
              <label htmlFor="cfx-search" className="cfx-label t-eyebrow">
                Search
              </label>
              <input
                id="cfx-search"
                name="search"
                type="search"
                autoComplete="off"
                maxLength={100}
                defaultValue={query.search}
                placeholder="Search by problem, industry or tool"
                className="cfx-control"
              />
            </div>

            <div className="cfx-field">
              <label htmlFor="cfx-pillar" className="cfx-label t-eyebrow">
                Role
              </label>
              <select
                id="cfx-pillar"
                name="pillar"
                defaultValue={query.pillar}
                className="cfx-control"
              >
                <option value="all">All roles</option>
                {PILLAR_RELATIONSHIP_OPTIONS.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="cfx-field">
              <label htmlFor="cfx-category" className="cfx-label t-eyebrow">
                Category
              </label>
              <select
                id="cfx-category"
                name="category"
                defaultValue={query.category}
                className="cfx-control"
              >
                <option value="all">All categories</option>
                {query.category !== "all" && !selectedCategory ? (
                  <option value={query.category}>
                    Unavailable category: {query.category}
                  </option>
                ) : null}
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cfx-field">
              <label htmlFor="cfx-technology" className="cfx-label t-eyebrow">
                Tool
              </label>
              <select
                id="cfx-technology"
                name="technology"
                defaultValue={query.technology}
                className="cfx-control"
              >
                <option value="all">All tools</option>
                {technologies.map((technology) => (
                  <option key={technology} value={technology}>
                    {technology}
                  </option>
                ))}
              </select>
            </div>

            <div className="cfx-field">
              <label htmlFor="cfx-engagement" className="cfx-label t-eyebrow">
                Type
              </label>
              <select
                id="cfx-engagement"
                name="engagement"
                defaultValue={query.engagement}
                className="cfx-control"
              >
                <option value="all">All types</option>
                {CASE_STUDY_ENGAGEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CASE_STUDY_ENGAGEMENT_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="cfx-field">
              <label htmlFor="cfx-sort" className="cfx-label t-eyebrow">
                Sort
              </label>
              <select
                id="cfx-sort"
                name="sort"
                defaultValue={query.sort}
                className="cfx-control"
              >
                {CASE_STUDY_DISCOVERY_SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {SORT_LABELS[sort]}
                  </option>
                ))}
              </select>
            </div>

            <div className="cfx-actions">
              <button
                type="submit"
                className={buttonVariants({ variant: "default" })}
              >
                Apply
              </button>
              {dirty ? (
                <Link href={BASE_PATH} className="cfx-clear link-draw">
                  Clear filters
                </Link>
              ) : null}
            </div>
          </form>

          <Topology />
        </div>

        {chips.length ? (
          <ul className="cfx-chips" aria-label="Active filters">
            {chips.map((chip) => (
              <li key={chip.key}>
                <Link
                  className="cfx-chip"
                  href={hrefFor({
                    ...query,
                    [chip.key]: defaults[chip.key],
                    page: 1,
                  })}
                  aria-label={`Remove filter ${chip.label}: ${chip.value}`}
                >
                  <span className="t-eyebrow cfx-chip__key">{chip.label}</span>
                  <span>{chip.value}</span>
                  <X className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {initialError ? null : (
          <p className="cfx-count t-mono">
            <span>
              <strong>{meta.total}</strong> case{" "}
              {meta.total === 1 ? "file" : "files"}
              {filtersActive ? " match" : ""}
            </span>
            {totalPages > 1 ? (
              <span className="cfx-count__page">
                Page {page} of {totalPages}
              </span>
            ) : null}
          </p>
        )}

        {initialError ? (
          <div className="cfx-empty">
            <h3 className="cfx-empty__title">
              Case studies could not be loaded
            </h3>
            <p className="cfx-empty__body">
              The published library is temporarily unavailable. Please try again
              in a moment.
            </p>
            <Link href={hrefFor(query)} className="cfx-clear link-draw">
              Try again
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="cfx-empty">
            <h3 className="cfx-empty__title">
              {filtersActive
                ? "No matching case studies"
                : "No published case studies yet"}
            </h3>
            <p className="cfx-empty__body">
              {filtersActive
                ? "Try a broader role, category, tool or search phrase."
                : "Published case studies will appear here when they are ready."}
            </p>
            {dirty ? (
              <Link href={BASE_PATH} className="cfx-clear link-draw">
                Clear filters
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="case-files" aria-label="Case files">
            {items.map((caseStudy, index) => (
              <CaseFileRow
                key={caseStudy._id}
                caseStudy={caseStudy}
                fallbacks={fallbacks}
                index={index}
                count={items.length}
              />
            ))}
          </ul>
        )}

        <LinkPagination
          page={page}
          totalPages={totalPages}
          hrefFor={(target) => hrefFor({ ...query, page: target })}
          ariaLabel="Case study result pages"
          className="mt-12"
        />
      </div>
    </section>
  );
};

export default CaseStudiesContentSection;
