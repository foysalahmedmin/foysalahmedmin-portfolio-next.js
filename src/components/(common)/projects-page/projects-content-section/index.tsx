import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { LabSwitcher } from "@/components/content/lab-switcher";
import { LinkPagination } from "@/components/ui/link-pagination";
import { TextLink } from "@/components/ui/text-link";
import { getPillarLabel } from "@/lib/content/pillars";
import {
  DEFAULT_PROJECT_DISCOVERY_QUERY,
  hasProjectDiscoveryFilters,
  type ProjectDiscoveryCompositionFilter,
  type ProjectDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import type { TProjectCategory } from "@/types/project-category.type";
import type { TProjectListItem } from "@/types/project.type";
import { X } from "lucide-react";
import Link from "next/link";
import { formatProjectType } from "../format";
import { ProjectFilters } from "./filters";
import { PROJECTS_PATH, projectsHref } from "./query";
import { ProjectRegistry } from "./registry";

export type ProjectsContentSectionProps = {
  initialProjects: TProjectListItem[];
  /** Part of the discovery contract; the server already applied the query to `initialProjects`. */
  snapshotProjects?: TProjectListItem[];
  initialMeta: { total: number; page: number; limit: number };
  initialQuery: ProjectDiscoveryQuery;
  categories: TProjectCategory[];
  facets: { technologies: string[]; years: number[] };
  compositionFilter?: ProjectDiscoveryCompositionFilter;
  snapshotLocked?: boolean;
  initialError?: boolean;
  fallbacks?: TPublicSiteFallbacksDto;
};

const defaults = DEFAULT_PROJECT_DISCOVERY_QUERY;

/** One chip per active filter; each is a link to the same page without that one parameter. */
const activeChips = (
  query: ProjectDiscoveryQuery,
  categories: readonly TProjectCategory[]
) => {
  const chips: {
    key: string;
    label: string;
    value: string;
    href: string;
  }[] = [];
  const add = (
    key: string,
    label: string,
    value: string,
    patch: Partial<ProjectDiscoveryQuery>
  ) =>
    chips.push({
      key,
      label,
      value,
      href: projectsHref(query, { ...patch, page: 1 }),
    });
  if (query.search.trim()) {
    add("search", "Search", query.search.trim(), { search: defaults.search });
  }
  if (query.pillar !== "all") {
    add("pillar", "Role", getPillarLabel(query.pillar), {
      pillar: defaults.pillar,
    });
  }
  if (query.category !== "all") {
    const name = categories.find(({ slug }) => slug === query.category)?.name;
    add("category", "Category", name ?? query.category, {
      category: defaults.category,
    });
  }
  if (query.technology !== "all") {
    add("technology", "Technology", query.technology, {
      technology: defaults.technology,
    });
  }
  if (query.type !== "all") {
    add("type", "Type", formatProjectType(query.type), { type: defaults.type });
  }
  if (query.year !== null) {
    add("year", "Year", String(query.year), { year: defaults.year });
  }
  return chips;
};

/**
 * `/projects`, the lab registry (docs plan 4.2): a server component with no client JavaScript from its
 * own code. The filters are a plain GET form, the chips and pagination are links, and the server renders
 * the results from `searchParams` (the discovery loader already applied them to `initialProjects`).
 */
const ProjectsContentSection = ({
  initialProjects,
  initialMeta,
  initialQuery: query,
  categories,
  facets,
  initialError = false,
  fallbacks,
}: ProjectsContentSectionProps) => {
  const filtersActive = hasProjectDiscoveryFilters(query);
  const totalPages = Math.max(
    1,
    Math.ceil(initialMeta.total / initialMeta.limit)
  );
  const page = Math.min(query.page, totalPages);
  const chips = activeChips(query, categories);
  const { total } = initialMeta;

  return (
    <section aria-labelledby="lab-results-heading" className="lab-page">
      <div className="container">
        <LabSwitcher current="projects" />
        <h2 id="lab-results-heading" className="sr-only">
          Project registry
        </h2>

        <ProjectFilters
          query={query}
          categories={categories}
          technologies={facets.technologies}
          years={facets.years}
          active={filtersActive || query.sort !== defaults.sort}
        />

        {chips.length ? (
          <ul className="lab-chips" aria-label="Active filters">
            {chips.map((chip) => (
              <li key={chip.key}>
                <Link
                  href={chip.href}
                  className="lab-chip"
                  aria-label={`Remove filter ${chip.label}: ${chip.value}`}
                >
                  <span className="t-eyebrow text-fg-secondary">
                    {chip.label}
                  </span>
                  <span>{chip.value}</span>
                  <X className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div id="lab-results" className="lab-results">
          {initialError ? (
            <div className="lab-empty">
              <p className="t-eyebrow text-fg-secondary">Unavailable</p>
              <h3 className="t-h4">Projects could not be loaded</h3>
              <p className="t-measure text-fg-secondary">
                The published portfolio is temporarily unavailable. Try again in
                a moment.
              </p>
              <TextLink href={projectsHref(query)} variant="quiet">
                Try again
              </TextLink>
            </div>
          ) : initialProjects.length === 0 ? (
            <div className="lab-empty">
              <p className="t-eyebrow text-fg-secondary">
                {filtersActive ? "No match" : "Empty"}
              </p>
              <h3 className="t-h4">
                {filtersActive
                  ? "No project matches these filters"
                  : "No published projects yet"}
              </h3>
              <p className="t-measure text-fg-secondary">
                {filtersActive
                  ? "Try a broader role, technology or search phrase."
                  : "Published projects appear here when they are ready."}
              </p>
              {filtersActive ? (
                <TextLink href={PROJECTS_PATH} variant="quiet">
                  Clear filters
                </TextLink>
              ) : null}
            </div>
          ) : (
            <>
              <p className="lab-count t-eyebrow text-fg-secondary">
                {total} {total === 1 ? "project" : "projects"}
                {filtersActive ? (total === 1 ? " matches" : " match") : ""}
                {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
              </p>
              <ProjectRegistry
                projects={initialProjects}
                fallbacks={fallbacks}
              />
            </>
          )}
        </div>

        <LinkPagination
          page={page}
          totalPages={totalPages}
          hrefFor={(next) =>
            `${projectsHref(query, { page: next })}#lab-results`
          }
          ariaLabel="Project result pages"
          className="mt-12"
        />
      </div>
    </section>
  );
};

export default ProjectsContentSection;
