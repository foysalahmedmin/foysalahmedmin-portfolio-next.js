import {
  mergeProjectDiscoveryQueryString,
  querySourceToQueryString,
  type ProjectDiscoveryQuery,
  type QuerySource,
} from "@/lib/discovery/public-discovery";

export const PROJECTS_PATH = "/projects";

/** `/projects` plus the query for `query` (with `patch` applied); every default value is left out. */
export const projectsHref = (
  query: ProjectDiscoveryQuery,
  patch: Partial<ProjectDiscoveryQuery> = {}
) =>
  `${PROJECTS_PATH}${mergeProjectDiscoveryQueryString("", { ...query, ...patch })}`;

const comparable = (queryString: string) =>
  [...new URLSearchParams(queryString)]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("&");

/**
 * A GET form sends every field, defaults included (`?pillar=all&year=all`). This returns the clean URL to
 * redirect to, or null when the URL already is clean. Unrelated parameters are kept.
 */
export const canonicalProjectsPath = (
  raw: QuerySource,
  query: ProjectDiscoveryQuery
): string | null => {
  const current = querySourceToQueryString(raw);
  const clean = mergeProjectDiscoveryQueryString(current, query);
  return comparable(current) === comparable(clean)
    ? null
    : `${PROJECTS_PATH}${clean}`;
};
