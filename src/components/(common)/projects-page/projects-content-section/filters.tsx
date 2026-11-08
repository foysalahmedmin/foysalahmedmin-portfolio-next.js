import { buttonVariants } from "@/components/ui/button-variants";
import { TextLink } from "@/components/ui/text-link";
import { PILLAR_RELATIONSHIP_OPTIONS } from "@/lib/content/pillars";
import { PROJECT_TYPES } from "@/lib/content/portfolio-contract";
import {
  PROJECT_DISCOVERY_SORTS,
  type ProjectDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import type { TProjectCategory } from "@/types/project-category.type";
import type { ReactNode } from "react";
import { formatProjectType } from "../format";
import { PROJECTS_PATH } from "./query";

const SORT_LABELS: Record<ProjectDiscoveryQuery["sort"], string> = {
  featured: "Featured first",
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name A–Z",
};

const Field = ({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) => (
  <label className={className ? `lab-field ${className}` : "lab-field"}>
    <span className="t-eyebrow text-fg-secondary">{label}</span>
    {children}
  </label>
);

/**
 * The lab filters as a plain GET form: the browser sends the fields, the server renders the results from
 * the query. No JavaScript. The field names are the discovery query keys, so the URL stays the contract.
 */
export function ProjectFilters({
  query,
  categories,
  technologies,
  years,
  active,
}: {
  query: ProjectDiscoveryQuery;
  categories: readonly TProjectCategory[];
  technologies: readonly string[];
  years: readonly number[];
  /** Any filter or a non-default sort is set: show Clear. */
  active: boolean;
}) {
  const hasCategory = categories.some(({ slug }) => slug === query.category);
  const technologyOptions =
    query.technology !== "all" && !technologies.includes(query.technology)
      ? [query.technology, ...technologies]
      : technologies;
  const yearOptions =
    query.year && !years.includes(query.year) ? [query.year, ...years] : years;

  return (
    <form
      method="get"
      action={PROJECTS_PATH}
      role="search"
      aria-label="Filter and sort projects"
      className="lab-filters"
    >
      <div className="lab-filters__grid">
        <Field label="Search" className="lab-field--search">
          <input
            type="search"
            name="search"
            defaultValue={query.search}
            maxLength={100}
            autoComplete="off"
            placeholder="Problem, outcome or technology"
          />
        </Field>
        <Field label="Role">
          <select name="pillar" defaultValue={query.pillar}>
            <option value="all">All roles</option>
            {PILLAR_RELATIONSHIP_OPTIONS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select name="category" defaultValue={query.category}>
            <option value="all">All categories</option>
            {query.category !== "all" && !hasCategory ? (
              <option value={query.category}>
                Unavailable category: {query.category}
              </option>
            ) : null}
            {categories.map((category) => (
              <option key={category._id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Technology">
          <select name="technology" defaultValue={query.technology}>
            <option value="all">All technologies</option>
            {technologyOptions.map((technology) => (
              <option key={technology} value={technology}>
                {technology}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Project type">
          <select name="type" defaultValue={query.type}>
            <option value="all">All project types</option>
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatProjectType(type)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <select name="year" defaultValue={query.year?.toString() ?? "all"}>
            <option value="all">All years</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sort">
          <select name="sort" defaultValue={query.sort}>
            {PROJECT_DISCOVERY_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="lab-filters__actions">
        <button
          type="submit"
          className={buttonVariants({ variant: "default" })}
        >
          Apply
        </button>
        {active ? (
          <TextLink href={PROJECTS_PATH} variant="quiet">
            Clear
          </TextLink>
        ) : null}
      </div>
    </form>
  );
}
