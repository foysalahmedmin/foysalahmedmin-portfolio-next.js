"use client";

import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/async-state";
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
import { resolveMediaAlt } from "@/lib/media/presentation";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import { PROJECT_TYPES } from "@/lib/content/portfolio-contract";
import {
  DEFAULT_PROJECT_DISCOVERY_QUERY,
  PUBLIC_DISCOVERY_PAGE_SIZE,
  getProjectDiscoveryRequestKey,
  hasProjectDiscoveryFilters,
  projectDiscoveryCompositionQuery,
  type ProjectDiscoveryQuery,
  type ProjectDiscoveryCompositionFilter,
} from "@/lib/discovery/public-discovery";
import { filterAndSortCuratedProjects } from "@/lib/discovery/curated-discovery";
import { cn } from "@/lib/utils";
import { getProjects } from "@/services/project.service";
import type { TProjectCategory } from "@/types/project-category.type";
import type { TProjectListItem } from "@/types/project.type";
import {
  ArrowRight,
  CheckCircle2,
  FilterX,
  LayoutGrid,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type ProjectDiscoveryMeta = {
  total: number;
  page: number;
  limit: number;
};
export type ProjectDiscoveryFacets = {
  technologies: string[];
  years: number[];
};
type RequestPhase = "ready" | "loading" | "refreshing" | "error" | "stale";
const EMPTY_PROJECT_COMPOSITION_FILTER = {} as const;

export type ProjectsContentSectionProps = {
  initialProjects: TProjectListItem[];
  snapshotProjects?: TProjectListItem[];
  initialMeta: ProjectDiscoveryMeta;
  initialQuery: ProjectDiscoveryQuery;
  categories: TProjectCategory[];
  facets: ProjectDiscoveryFacets;
  compositionFilter?: ProjectDiscoveryCompositionFilter;
  snapshotLocked?: boolean;
  initialError?: boolean;
  fallbacks?: TPublicSiteFallbacksDto;
};

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatProjectType = (value: string) =>
  value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

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

type UpdateProjectQuery = (
  patch: Partial<ProjectDiscoveryQuery>,
  history?: "push" | "replace"
) => void;

const getActiveFilterCount = (query: ProjectDiscoveryQuery) =>
  [
    Boolean(query.search.trim()),
    query.pillar !== "all",
    query.category !== "all",
    query.technology !== "all",
    query.type !== "all",
    query.year !== null,
  ].filter(Boolean).length;

const ProjectFilterFields = ({
  query,
  categories,
  technologyOptions,
  yearOptions,
  hasSelectedCategory,
  updateQuery,
  presentation,
}: {
  query: ProjectDiscoveryQuery;
  categories: TProjectCategory[];
  technologyOptions: string[];
  yearOptions: number[];
  hasSelectedCategory: boolean;
  updateQuery: UpdateProjectQuery;
  presentation: "desktop" | "drawer";
}) => {
  const idFor = (field: string) =>
    presentation === "desktop" ? field : `mobile-${field}`;

  return (
    <fieldset
      className={cn(
        "gap-4",
        presentation === "desktop"
          ? "hidden lg:grid lg:grid-cols-4"
          : "grid grid-cols-1"
      )}
    >
      <legend className="sr-only">Filter and sort projects</legend>
      <label
        htmlFor={idFor("project-search")}
        className={cn(
          "grid gap-2",
          presentation === "desktop" && "lg:col-span-2"
        )}
      >
        <span className="type-label text-muted-foreground">Search</span>
        <span className="relative block">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id={idFor("project-search")}
            type="search"
            autoComplete="off"
            maxLength={100}
            value={query.search}
            onChange={(event) =>
              updateQuery({ search: event.target.value, page: 1 }, "replace")
            }
            placeholder="Search problem, outcome, or technology"
            className="border-border bg-background focus-visible:ring-ring h-11 w-full rounded-md border pr-3 pl-10 text-sm outline-none focus-visible:ring-2"
            aria-controls="project-results"
            data-initial-focus={presentation === "drawer" ? "true" : undefined}
          />
        </span>
      </label>
      <FilterSelect
        id={idFor("project-pillar")}
        label="Discipline"
        value={query.pillar}
        onChange={(pillar) =>
          updateQuery({
            pillar: pillar as ProjectDiscoveryQuery["pillar"],
            page: 1,
          })
        }
      >
        <option value="all">All disciplines</option>
        {PILLAR_RELATIONSHIP_OPTIONS.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id={idFor("project-category")}
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
        id={idFor("project-technology")}
        label="Technology"
        value={query.technology}
        onChange={(technology) => updateQuery({ technology, page: 1 })}
      >
        <option value="all">All technologies</option>
        {technologyOptions.map((technology) => (
          <option key={technology} value={technology}>
            {technology}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id={idFor("project-type")}
        label="Project type"
        value={query.type}
        onChange={(type) =>
          updateQuery({
            type: type as ProjectDiscoveryQuery["type"],
            page: 1,
          })
        }
      >
        <option value="all">All project types</option>
        {PROJECT_TYPES.map((type) => (
          <option key={type} value={type}>
            {formatProjectType(type)}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id={idFor("project-year")}
        label="Year"
        value={query.year?.toString() ?? "all"}
        onChange={(year) =>
          updateQuery({
            year: year === "all" ? null : Number(year),
            page: 1,
          })
        }
      >
        <option value="all">All years</option>
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        id={idFor("project-sort")}
        label="Sort"
        value={query.sort}
        onChange={(sort) =>
          updateQuery({
            sort: sort as ProjectDiscoveryQuery["sort"],
            page: 1,
          })
        }
      >
        <option value="featured">Featured first</option>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="name">Name A–Z</option>
      </FilterSelect>
    </fieldset>
  );
};

const ProjectsContentSection = ({
  initialProjects,
  snapshotProjects = initialProjects,
  initialMeta,
  initialQuery,
  categories,
  facets,
  compositionFilter = EMPTY_PROJECT_COMPOSITION_FILTER,
  snapshotLocked = false,
  initialError = false,
  fallbacks,
}: ProjectsContentSectionProps) => {
  const [projects, setProjects] = useState(initialProjects);
  const [meta, setMeta] = useState(initialMeta);
  const [phase, setPhase] = useState<RequestPhase>(
    initialError ? "error" : "ready"
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const { isReady, query, setQuery } = useUrlListQueryState(
    "projects",
    initialQuery
  );
  const debouncedSearch = useDebounce(query.search.trim(), 350);
  const { abort, isCurrent, start } = useLatestRequest();
  const firstRequest = useRef(true);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const requestQuery = useMemo(
    () => ({
      search: debouncedSearch,
      pillar: query.pillar,
      category: query.category,
      technology: query.technology,
      type: query.type,
      year: query.year,
      sort: query.sort,
      page: query.page,
    }),
    [
      debouncedSearch,
      query.category,
      query.page,
      query.pillar,
      query.sort,
      query.technology,
      query.type,
      query.year,
    ]
  );
  const isSearchPending = query.search.trim() !== debouncedSearch;
  const isUpdating =
    phase === "loading" || phase === "refreshing" || isSearchPending;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const filtersActive = hasProjectDiscoveryFilters(query);
  const activeFilterCount = getActiveFilterCount(query);

  const updateQuery = (
    patch: Partial<ProjectDiscoveryQuery>,
    history: "push" | "replace" = "push"
  ) => {
    abort();
    setQuery(patch, { history });
  };

  useEffect(() => {
    if (!isReady) return;
    const requestKey = getProjectDiscoveryRequestKey(requestQuery);
    if (firstRequest.current) {
      firstRequest.current = false;
      if (
        !snapshotLocked &&
        requestKey === getProjectDiscoveryRequestKey(initialQuery)
      )
        return;
    }
    if (snapshotLocked) {
      const nextProjects = filterAndSortCuratedProjects(
        snapshotProjects,
        requestQuery
      );
      setProjects(nextProjects);
      setMeta({
        total: nextProjects.length,
        page: 1,
        limit: Math.max(1, nextProjects.length),
      });
      setPhase("ready");
      return;
    }

    const fetchProjects = async () => {
      const signal = start();
      setPhase(projectsRef.current.length ? "refreshing" : "loading");
      try {
        const response = await getProjects(
          {
            ...projectDiscoveryCompositionQuery(compositionFilter),
            page: requestQuery.page,
            search: requestQuery.search.trim() || undefined,
            pillar:
              requestQuery.pillar === "all" ? undefined : requestQuery.pillar,
            category:
              requestQuery.category === "all"
                ? undefined
                : requestQuery.category,
            technology:
              requestQuery.technology === "all"
                ? undefined
                : requestQuery.technology,
            type: requestQuery.type === "all" ? undefined : requestQuery.type,
            year: requestQuery.year ?? undefined,
            sort: requestQuery.sort,
          },
          { signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error("The project response was incomplete.");
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
        setProjects(response.data);
        setMeta(nextMeta);
        setPhase("ready");
      } catch (error) {
        if (isAbortedRequest(error, signal)) return;
        setPhase(projectsRef.current.length ? "stale" : "error");
      }
    };

    void fetchProjects();
  }, [
    abort,
    compositionFilter,
    initialQuery,
    isCurrent,
    isReady,
    requestQuery,
    retryVersion,
    setQuery,
    snapshotProjects,
    start,
    snapshotLocked,
  ]);

  const retry = () => setRetryVersion((current) => current + 1);
  const clearFilters = () =>
    updateQuery({ ...DEFAULT_PROJECT_DISCOVERY_QUERY }, "push");

  const technologyOptions =
    query.technology !== "all" &&
    !facets.technologies.includes(query.technology)
      ? [query.technology, ...facets.technologies]
      : facets.technologies;
  const hasSelectedCategory = categories.some(
    (category) => category.slug === query.category
  );
  const yearOptions =
    query.year && !facets.years.includes(query.year)
      ? [query.year, ...facets.years]
      : facets.years;

  return (
    <section
      aria-labelledby="project-results-heading"
      className="py-16 lg:py-24"
    >
      <div className="container">
        <div className="border-border bg-surface-subtle rounded-[var(--radius-xl-token)] border p-5 lg:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="type-label text-primary">Project explorer</p>
              <h2
                id="project-results-heading"
                className="mt-2 text-2xl font-bold"
              >
                Find the work relevant to your challenge
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

          <div className="lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              aria-label={`Open project filters${
                activeFilterCount ? `, ${activeFilterCount} active` : ""
              }`}
              aria-haspopup="dialog"
              aria-expanded={isFilterDrawerOpen}
              aria-controls="project-filter-drawer"
              onClick={() => setIsFilterDrawerOpen(true)}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filters and sort
              </span>
              {activeFilterCount ? (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>

          <ProjectFilterFields
            query={query}
            categories={categories}
            technologyOptions={technologyOptions}
            yearOptions={yearOptions}
            hasSelectedCategory={hasSelectedCategory}
            updateQuery={updateQuery}
            presentation="desktop"
          />

          <Drawer
            isOpen={isFilterDrawerOpen}
            setIsOpen={setIsFilterDrawerOpen}
            asPortal
            side="end"
            size="base"
            className="lg:hidden"
          >
            <DrawerBackdrop>
              <DrawerContent
                id="project-filter-drawer"
                side="end"
                size="base"
                className="flex flex-col"
              >
                <DrawerHeader>
                  <div>
                    <DrawerTitle>Filter projects</DrawerTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Results update without losing your place or URL state.
                    </p>
                  </div>
                  <DrawerCloseTrigger aria-label="Close project filters" />
                </DrawerHeader>
                <DrawerBody>
                  <ProjectFilterFields
                    query={query}
                    categories={categories}
                    technologyOptions={technologyOptions}
                    yearOptions={yearOptions}
                    hasSelectedCategory={hasSelectedCategory}
                    updateQuery={updateQuery}
                    presentation="drawer"
                  />
                </DrawerBody>
                <DrawerFooter className="justify-between">
                  {filtersActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearFilters}
                    >
                      <FilterX className="size-4" aria-hidden="true" />
                      Clear filters
                    </Button>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  <Button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(false)}
                  >
                    View {meta.total} {meta.total === 1 ? "result" : "results"}
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </DrawerBackdrop>
          </Drawer>
        </div>

        <div className="mt-8 flex min-h-6 flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            {meta.total} {meta.total === 1 ? "case study" : "case studies"}
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
              Showing the last available results because the refresh failed.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              <RefreshCw className="size-4" aria-hidden="true" /> Refresh
            </Button>
          </div>
        ) : null}

        <div
          id="project-results"
          className="mt-8"
          aria-busy={isUpdating || undefined}
        >
          {phase === "loading" ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-[4/3] rounded-[var(--radius-xl-token)]"
                />
              ))}
            </div>
          ) : phase === "error" ? (
            <ErrorState
              title="Projects could not be loaded"
              description="The published portfolio is temporarily unavailable. Retry without losing your filters."
              onRetry={retry}
            />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<LayoutGrid className="size-5" aria-hidden="true" />}
              title={
                filtersActive
                  ? "No matching projects"
                  : "No published projects yet"
              }
              description={
                filtersActive
                  ? "Try a broader discipline, technology, or search phrase."
                  : "Published case studies will appear here when they are ready."
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
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => {
                const href = `/projects/${project.slug ?? project._id}`;
                const date = formatDate(project.started_at);
                const outcomes = (project.outcomes ?? []).slice(0, 2);
                const managedFallback = fallbacks
                  ? resolvePublicContentFallback({
                      kind: "project",
                      pillar: project.primary_pillar,
                      fallbacks,
                    })
                  : undefined;
                const cover = project.thumbnail?.url
                  ? project.thumbnail
                  : managedFallback;
                return (
                  <article
                    key={project._id}
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
                        src={cover?.url}
                        alt={resolveMediaAlt(
                          cover,
                          `${project.name} project visual`
                        )}
                        fallback="project"
                        pillar={project.primary_pillar}
                        focalPoint={cover?.focal_point}
                        dominantColor={cover?.dominant_color}
                        blurDataUrl={cover?.blur_data_url}
                        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                        className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.04]"
                      />
                      {project.is_featured ? (
                        <span className="bg-background/90 text-foreground absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur">
                          Featured
                        </span>
                      ) : null}
                    </Link>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold tracking-wide uppercase">
                        <span className="text-primary">
                          {project.primary_pillar
                            ? getPillarLabel(project.primary_pillar)
                            : project.category?.name || "Case study"}
                        </span>
                        {project.project_type ? (
                          <span>{formatProjectType(project.project_type)}</span>
                        ) : null}
                        {date ? (
                          <time dateTime={project.started_at}>{date}</time>
                        ) : null}
                      </div>
                      <h3 className="mt-4 text-2xl leading-tight font-bold">
                        <Link
                          href={href}
                          className="hover:text-primary focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
                        >
                          {project.name}
                        </Link>
                      </h3>
                      {project.role ? (
                        <p className="text-foreground mt-3 line-clamp-2 text-sm leading-relaxed">
                          <span className="text-muted-foreground font-semibold">
                            Role:
                          </span>{" "}
                          {project.role}
                        </p>
                      ) : null}
                      {project.description ? (
                        <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
                          {project.description}
                        </p>
                      ) : null}
                      {outcomes.length ? (
                        <ul
                          className="border-border mt-5 grid gap-2 border-t pt-4"
                          aria-label="Verified outcomes"
                        >
                          {outcomes.map((outcome) => (
                            <li
                              key={`${outcome.label}-${outcome.value}`}
                              className="flex items-start gap-2 text-sm"
                            >
                              <CheckCircle2
                                className="text-success mt-0.5 size-4 shrink-0"
                                aria-hidden="true"
                              />
                              <span>
                                <span className="font-semibold">
                                  {outcome.value}
                                </span>{" "}
                                <span className="text-muted-foreground">
                                  {outcome.label}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {project.tags?.length ? (
                        <ul
                          className="mt-5 flex flex-wrap gap-2"
                          aria-label="Technologies"
                        >
                          {project.tags.slice(0, 4).map((tag) => (
                            <li
                              key={tag}
                              className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs"
                            >
                              {tag}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <Link
                        href={href}
                        className="text-primary focus-visible:ring-ring mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6 text-sm font-bold outline-none focus-visible:ring-2"
                        aria-label={`Read ${project.name} case study`}
                      >
                        Explore the case study
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

        {phase !== "loading" && projects.length > 0 ? (
          <Pagination
            ariaLabel="Project result pages"
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

export default ProjectsContentSection;
