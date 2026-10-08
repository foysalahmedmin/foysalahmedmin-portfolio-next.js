import { PILLAR_KEYS, type PillarKey } from "@/lib/content/pillars";
import type { TCaseStudyCategory } from "@/types/case-study-category.type";
import type { TCaseStudyListItem } from "@/types/case-study.type";
import {
  PUBLIC_DISCOVERY_PAGE_SIZE,
  finishQueryString,
  isPillar,
  normalizeCategory,
  normalizeEnum,
  normalizeFilterToken,
  normalizePage,
  normalizePillar,
  normalizeSearch,
  readValue,
  setWhenNotDefault,
  toIsoDate,
  toPublicCategory,
  toPublicMedia,
  toStringArray,
  toStringValue,
  type QuerySource,
} from "./public-discovery";
import { CASE_STUDY_ENGAGEMENT_TYPES } from "@/lib/content/case-study-contract";
import type { ProjectType } from "@/lib/content/portfolio-contract";

export const CASE_STUDY_DISCOVERY_SORTS = [
  "newest",
  "oldest",
  "featured",
  "name",
] as const;
export type CaseStudyDiscoverySort =
  (typeof CASE_STUDY_DISCOVERY_SORTS)[number];

export type CaseStudyDiscoveryQuery = {
  search: string;
  pillar: PillarKey | "all";
  category: string;
  technology: string;
  sort: CaseStudyDiscoverySort;
  page: number;
};

export type CaseStudyDiscoveryCompositionFilter = Readonly<{
  featured?: boolean;
  pillar?: PillarKey;
}>;

export const DEFAULT_CASE_STUDY_DISCOVERY_QUERY: Readonly<CaseStudyDiscoveryQuery> =
  {
    search: "",
    pillar: "all",
    category: "all",
    technology: "all",
    sort: "newest",
    page: 1,
  };

export const CASE_STUDY_SORT_FIELDS: Readonly<
  Record<CaseStudyDiscoverySort, string>
> = {
  newest: "-published_at,name,_id",
  oldest: "published_at,name,_id",
  featured: "-is_featured,-published_at,name,_id",
  name: "name,_id",
};

export const normalizeCaseStudyDiscoveryQuery = (
  value: Partial<CaseStudyDiscoveryQuery>,
  defaults: CaseStudyDiscoveryQuery = DEFAULT_CASE_STUDY_DISCOVERY_QUERY
): CaseStudyDiscoveryQuery => ({
  search: normalizeSearch(value.search, defaults.search),
  pillar: normalizePillar(value.pillar, defaults.pillar),
  category: normalizeCategory(value.category, defaults.category),
  technology: normalizeFilterToken(value.technology, defaults.technology),
  sort: normalizeEnum(value.sort, CASE_STUDY_DISCOVERY_SORTS, defaults.sort),
  page: normalizePage(value.page, defaults.page),
});

export const parseCaseStudyDiscoveryQuery = (
  source: QuerySource,
  defaults: CaseStudyDiscoveryQuery = DEFAULT_CASE_STUDY_DISCOVERY_QUERY
): CaseStudyDiscoveryQuery => {
  const search = readValue(source, "search");
  return normalizeCaseStudyDiscoveryQuery(
    {
      search: typeof search === "string" ? search.trim() : undefined,
      pillar: readValue(source, "pillar") as PillarKey | "all" | undefined,
      category: readValue(source, "category") as string | undefined,
      technology: readValue(source, "technology") as string | undefined,
      sort: readValue(source, "sort") as CaseStudyDiscoverySort | undefined,
      page: readValue(source, "page") as number | undefined,
    },
    defaults
  );
};

export const mergeCaseStudyDiscoveryQueryString = (
  currentQueryString: string,
  state: CaseStudyDiscoveryQuery,
  defaults: CaseStudyDiscoveryQuery = DEFAULT_CASE_STUDY_DISCOVERY_QUERY
): string => {
  const params = new URLSearchParams(
    currentQueryString.startsWith("?")
      ? currentQueryString.slice(1)
      : currentQueryString
  );
  const query = normalizeCaseStudyDiscoveryQuery(state, defaults);
  setWhenNotDefault(params, "search", query.search, defaults.search);
  setWhenNotDefault(params, "pillar", query.pillar, defaults.pillar);
  setWhenNotDefault(params, "category", query.category, defaults.category);
  setWhenNotDefault(params, "technology", query.technology, defaults.technology);
  setWhenNotDefault(params, "sort", query.sort, defaults.sort);
  setWhenNotDefault(params, "page", query.page, defaults.page);
  return finishQueryString(params);
};

export const hasCaseStudyDiscoveryFilters = (query: CaseStudyDiscoveryQuery) =>
  Boolean(query.search.trim()) ||
  query.pillar !== "all" ||
  query.category !== "all" ||
  query.technology !== "all";

export const normalizeCaseStudyDiscoveryCompositionFilter = (
  value: Readonly<Record<string, unknown>>
): CaseStudyDiscoveryCompositionFilter => {
  const featuredValue = value.composition_featured ?? value.featured;
  const featured =
    featuredValue === true || featuredValue === "true"
      ? true
      : featuredValue === false || featuredValue === "false"
        ? false
        : undefined;
  const pillarValue = value.composition_pillar ?? value.pillar;
  return {
    ...(featured === undefined ? {} : { featured }),
    ...(typeof pillarValue === "string" && isPillar(pillarValue)
      ? { pillar: pillarValue }
      : {}),
  };
};

export const caseStudyDiscoveryCompositionQuery = (
  filter: CaseStudyDiscoveryCompositionFilter
): Readonly<Record<string, string | boolean>> => ({
  ...(filter.featured === undefined
    ? {}
    : { composition_featured: filter.featured }),
  ...(filter.pillar ? { composition_pillar: filter.pillar } : {}),
});

export const buildCaseStudyDiscoveryRepositoryQuery = (
  query: CaseStudyDiscoveryQuery,
  categoryId?: string,
  composition: CaseStudyDiscoveryCompositionFilter = {}
): Record<string, string> => {
  const pillar =
    query.pillar !== "all" &&
    composition.pillar &&
    query.pillar !== composition.pillar
      ? "__page_scope_mismatch__"
      : query.pillar !== "all"
        ? query.pillar
        : composition.pillar;
  return {
    page: String(query.page),
    limit: String(PUBLIC_DISCOVERY_PAGE_SIZE),
    sort: CASE_STUDY_SORT_FIELDS[query.sort],
    ...(query.search.trim() ? { search: query.search.trim() } : {}),
    ...(pillar ? { primary_pillar: pillar } : {}),
    ...(query.category !== "all" && categoryId ? { category: categoryId } : {}),
    ...(query.category !== "all" && !categoryId
      ? { category: "000000000000000000000000" }
      : {}),
    ...(query.technology !== "all" ? { tech_stack: query.technology } : {}),
    ...(composition.featured === undefined
      ? {}
      : { is_featured: String(composition.featured) }),
  };
};

const toCardText = (value: unknown, maximum: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const text = value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum)
    .trim();
  return text || undefined;
};

/** Maps a lean repository record to the plain object the UI may receive. */
export const toSerializableCaseStudyListItem = (
  value: unknown
): TCaseStudyListItem | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = toStringValue(source._id);
  if (!id || typeof source.name !== "string") return null;
  const outcomes = Array.isArray(source.outcomes)
    ? source.outcomes.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const outcome = entry as Record<string, unknown>;
        if (
          typeof outcome.label !== "string" ||
          typeof outcome.value !== "string" ||
          !["derived", "verified"].includes(String(outcome.verification_state))
        ) {
          return [];
        }
        return [
          {
            label: outcome.label,
            value: outcome.value,
            ...(typeof outcome.description === "string"
              ? { description: outcome.description }
              : {}),
            verification_state: outcome.verification_state,
          },
        ];
      })
    : [];
  const clientName = toCardText(source.client_name, 120);
  const clientIndustry = toCardText(source.client_industry, 120);
  const role = toCardText(source.role, 500);
  const duration = toCardText(source.duration_label, 80);
  return {
    _id: id,
    name: source.name,
    is_featured: source.is_featured === true,
    ...(typeof source.slug === "string" ? { slug: source.slug } : {}),
    ...(typeof source.description === "string"
      ? { description: source.description }
      : {}),
    ...(toPublicMedia(source.thumbnail)
      ? { thumbnail: toPublicMedia(source.thumbnail) as never }
      : {}),
    ...(toPublicCategory(source.category)
      ? { category: toPublicCategory(source.category) }
      : {}),
    ...(clientName ? { client_name: clientName } : {}),
    ...(clientIndustry ? { client_industry: clientIndustry } : {}),
    ...(CASE_STUDY_ENGAGEMENT_TYPES.includes(source.engagement_type as ProjectType)
      ? { engagement_type: source.engagement_type as ProjectType }
      : {}),
    ...(PILLAR_KEYS.includes(source.primary_pillar as PillarKey)
      ? { primary_pillar: source.primary_pillar as PillarKey }
      : {}),
    secondary_pillars: toStringArray(source.secondary_pillars).filter(isPillar),
    ...(role ? { role } : {}),
    ...(duration ? { duration_label: duration } : {}),
    tech_stack: toStringArray(source.tech_stack),
    outcomes: outcomes as TCaseStudyListItem["outcomes"],
    ...(toIsoDate(source.published_at)
      ? { published_at: toIsoDate(source.published_at) }
      : {}),
    ...(toIsoDate(source.updated_at)
      ? { updated_at: toIsoDate(source.updated_at) }
      : {}),
  };
};

export const toSerializableCaseStudyCategory = (
  value: unknown
): TCaseStudyCategory | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = toStringValue(source._id);
  if (
    !id ||
    typeof source.name !== "string" ||
    typeof source.slug !== "string"
  ) {
    return null;
  }
  return {
    _id: id,
    name: source.name,
    slug: source.slug,
    sequence: Number.isFinite(Number(source.sequence))
      ? Number(source.sequence)
      : 0,
    tags: toStringArray(source.tags),
    ...(typeof source.description === "string"
      ? { description: source.description }
      : {}),
  };
};
