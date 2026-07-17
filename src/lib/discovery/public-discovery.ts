import { PILLAR_KEYS, type PillarKey } from "@/lib/content/pillars";
import {
  PROJECT_TYPES,
  type ProjectType,
} from "@/lib/content/portfolio-contract";
import { normalizeSlugIdentifier } from "@/lib/content/slug";
import type { TArticleCategory } from "@/types/article-category.type";
import type { TArticleListItem } from "@/types/article.type";
import type { TProjectCategory } from "@/types/project-category.type";
import type { TProjectListItem } from "@/types/project.type";

export const PUBLIC_DISCOVERY_PAGE_SIZE = 9;
export const PUBLIC_DISCOVERY_MAX_PAGE = 10_000;

export const PROJECT_DISCOVERY_SORTS = [
  "featured",
  "newest",
  "oldest",
  "name",
] as const;
export type ProjectDiscoverySort = (typeof PROJECT_DISCOVERY_SORTS)[number];

export const ARTICLE_DISCOVERY_SORTS = [
  "newest",
  "oldest",
  "featured",
  "name",
] as const;
export type ArticleDiscoverySort = (typeof ARTICLE_DISCOVERY_SORTS)[number];

export type ProjectDiscoveryQuery = {
  search: string;
  pillar: PillarKey | "all";
  category: string;
  technology: string;
  type: ProjectType | "all";
  year: number | null;
  sort: ProjectDiscoverySort;
  page: number;
};

export type ArticleDiscoveryQuery = {
  search: string;
  pillar: PillarKey | "all";
  category: string;
  topic: string;
  sort: ArticleDiscoverySort;
  page: number;
};

export type ProjectDiscoveryCompositionFilter = Readonly<{
  featured?: boolean;
  pillar?: PillarKey;
  project_type?: ProjectType;
}>;

export type ArticleDiscoveryCompositionFilter = Readonly<{
  featured?: boolean;
  pillar?: PillarKey;
}>;

export type DiscoveryKind = "projects" | "articles";
export type DiscoveryQueryFor<TKind extends DiscoveryKind> =
  TKind extends "projects" ? ProjectDiscoveryQuery : ArticleDiscoveryQuery;

export const DEFAULT_PROJECT_DISCOVERY_QUERY: Readonly<ProjectDiscoveryQuery> =
  {
    search: "",
    pillar: "all",
    category: "all",
    technology: "all",
    type: "all",
    year: null,
    sort: "featured",
    page: 1,
  };

export const DEFAULT_ARTICLE_DISCOVERY_QUERY: Readonly<ArticleDiscoveryQuery> =
  {
    search: "",
    pillar: "all",
    category: "all",
    topic: "all",
    sort: "newest",
    page: 1,
  };

type QuerySource =
  | URLSearchParams
  | Readonly<Record<string, string | string[] | number | null | undefined>>;

export const querySourceToQueryString = (source: QuerySource): string => {
  if (source instanceof URLSearchParams) {
    const value = source.toString();
    return value ? `?${value}` : "";
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  }
  const value = params.toString();
  return value ? `?${value}` : "";
};

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MAX_SEARCH_LENGTH = 100;
const MAX_FILTER_LENGTH = 96;
const MIN_PORTFOLIO_YEAR = 1990;

const readValue = (source: QuerySource, key: string): unknown => {
  if (source instanceof URLSearchParams) return source.get(key);
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
};

const normalizeSearch = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) {
    return fallback;
  }
  const bounded = value.slice(0, MAX_SEARCH_LENGTH);
  return bounded.trim() ? bounded : fallback;
};

const normalizeFilterToken = (value: unknown, fallback = "all"): string => {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) {
    return fallback;
  }
  const bounded = value.trim().slice(0, MAX_FILTER_LENGTH);
  return bounded || fallback;
};

const normalizeCategory = (value: unknown, fallback = "all"): string => {
  if (typeof value === "string" && /[$[\]{}]/.test(value)) return fallback;
  const token = normalizeFilterToken(value, fallback);
  if (token === "all") return token;
  return normalizeSlugIdentifier(token) ?? fallback;
};

const normalizePage = (value: unknown, fallback = 1): number => {
  const parsed =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, PUBLIC_DISCOVERY_MAX_PAGE)
    : fallback;
};

const normalizeYear = (value: unknown, fallback: number | null = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  const maximum = new Date().getUTCFullYear() + 1;
  return Number.isSafeInteger(parsed) &&
    parsed >= MIN_PORTFOLIO_YEAR &&
    parsed <= maximum
    ? parsed
    : fallback;
};

const isPillar = (value: string): value is PillarKey =>
  PILLAR_KEYS.includes(value as PillarKey);

const readBoolean = (value: unknown): boolean | undefined =>
  value === true || value === "true"
    ? true
    : value === false || value === "false"
      ? false
      : undefined;

export const normalizeProjectDiscoveryCompositionFilter = (
  value: Readonly<Record<string, unknown>>
): ProjectDiscoveryCompositionFilter => {
  const featured = readBoolean(value.composition_featured ?? value.featured);
  const pillarValue = value.composition_pillar ?? value.pillar;
  const projectTypeValue = value.composition_project_type ?? value.project_type;
  return {
    ...(featured === undefined ? {} : { featured }),
    ...(typeof pillarValue === "string" && isPillar(pillarValue)
      ? { pillar: pillarValue }
      : {}),
    ...(typeof projectTypeValue === "string" &&
    PROJECT_TYPES.includes(projectTypeValue as ProjectType)
      ? { project_type: projectTypeValue as ProjectType }
      : {}),
  };
};

export const normalizeArticleDiscoveryCompositionFilter = (
  value: Readonly<Record<string, unknown>>
): ArticleDiscoveryCompositionFilter => {
  const featured = readBoolean(value.composition_featured ?? value.featured);
  const pillarValue = value.composition_pillar ?? value.pillar;
  return {
    ...(featured === undefined ? {} : { featured }),
    ...(typeof pillarValue === "string" && isPillar(pillarValue)
      ? { pillar: pillarValue }
      : {}),
  };
};

export const projectDiscoveryCompositionQuery = (
  filter: ProjectDiscoveryCompositionFilter
): Readonly<Record<string, string | boolean>> => ({
  ...(filter.featured === undefined
    ? {}
    : { composition_featured: filter.featured }),
  ...(filter.pillar ? { composition_pillar: filter.pillar } : {}),
  ...(filter.project_type
    ? { composition_project_type: filter.project_type }
    : {}),
});

export const articleDiscoveryCompositionQuery = (
  filter: ArticleDiscoveryCompositionFilter
): Readonly<Record<string, string | boolean>> => ({
  ...(filter.featured === undefined
    ? {}
    : { composition_featured: filter.featured }),
  ...(filter.pillar ? { composition_pillar: filter.pillar } : {}),
});

const normalizePillar = (
  value: unknown,
  fallback: PillarKey | "all" = "all"
): PillarKey | "all" => {
  const token = normalizeFilterToken(value, fallback);
  return token === "all" || isPillar(token) ? token : fallback;
};

const normalizeEnum = <TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  fallback: TValue
): TValue => {
  const token = normalizeFilterToken(value, fallback);
  return allowed.includes(token as TValue) ? (token as TValue) : fallback;
};

export const normalizeProjectDiscoveryQuery = (
  value: Partial<ProjectDiscoveryQuery>,
  defaults: ProjectDiscoveryQuery = DEFAULT_PROJECT_DISCOVERY_QUERY
): ProjectDiscoveryQuery => ({
  search: normalizeSearch(value.search, defaults.search),
  pillar: normalizePillar(value.pillar, defaults.pillar),
  category: normalizeCategory(value.category, defaults.category),
  technology: normalizeFilterToken(value.technology, defaults.technology),
  type:
    value.type === "all"
      ? "all"
      : normalizeEnum(value.type, PROJECT_TYPES, defaults.type),
  year: normalizeYear(value.year, defaults.year),
  sort: normalizeEnum(value.sort, PROJECT_DISCOVERY_SORTS, defaults.sort),
  page: normalizePage(value.page, defaults.page),
});

export const normalizeArticleDiscoveryQuery = (
  value: Partial<ArticleDiscoveryQuery>,
  defaults: ArticleDiscoveryQuery = DEFAULT_ARTICLE_DISCOVERY_QUERY
): ArticleDiscoveryQuery => ({
  search: normalizeSearch(value.search, defaults.search),
  pillar: normalizePillar(value.pillar, defaults.pillar),
  category: normalizeCategory(value.category, defaults.category),
  topic: normalizeFilterToken(value.topic, defaults.topic),
  sort: normalizeEnum(value.sort, ARTICLE_DISCOVERY_SORTS, defaults.sort),
  page: normalizePage(value.page, defaults.page),
});

export const parseProjectDiscoveryQuery = (
  source: QuerySource,
  defaults: ProjectDiscoveryQuery = DEFAULT_PROJECT_DISCOVERY_QUERY
): ProjectDiscoveryQuery =>
  normalizeProjectDiscoveryQuery(
    {
      search:
        typeof readValue(source, "search") === "string"
          ? String(readValue(source, "search")).trim()
          : undefined,
      pillar: readValue(source, "pillar") as PillarKey | "all" | undefined,
      category: readValue(source, "category") as string | undefined,
      technology: readValue(source, "technology") as string | undefined,
      type: readValue(source, "type") as ProjectType | "all" | undefined,
      year: readValue(source, "year") as number | null | undefined,
      sort: readValue(source, "sort") as ProjectDiscoverySort | undefined,
      page: readValue(source, "page") as number | undefined,
    },
    defaults
  );

export const parseArticleDiscoveryQuery = (
  source: QuerySource,
  defaults: ArticleDiscoveryQuery = DEFAULT_ARTICLE_DISCOVERY_QUERY
): ArticleDiscoveryQuery =>
  normalizeArticleDiscoveryQuery(
    {
      search:
        typeof readValue(source, "search") === "string"
          ? String(readValue(source, "search")).trim()
          : undefined,
      pillar: readValue(source, "pillar") as PillarKey | "all" | undefined,
      category: readValue(source, "category") as string | undefined,
      topic: readValue(source, "topic") as string | undefined,
      sort: readValue(source, "sort") as ArticleDiscoverySort | undefined,
      page: readValue(source, "page") as number | undefined,
    },
    defaults
  );

const setWhenNotDefault = (
  params: URLSearchParams,
  key: string,
  value: string | number | null,
  defaultValue: string | number | null
) => {
  if (value === defaultValue || value === null) params.delete(key);
  else params.set(key, String(value).trim());
};

const finishQueryString = (params: URLSearchParams) => {
  const value = params.toString();
  return value ? `?${value}` : "";
};

export const mergeProjectDiscoveryQueryString = (
  currentQueryString: string,
  state: ProjectDiscoveryQuery,
  defaults: ProjectDiscoveryQuery = DEFAULT_PROJECT_DISCOVERY_QUERY
): string => {
  const params = new URLSearchParams(
    currentQueryString.startsWith("?")
      ? currentQueryString.slice(1)
      : currentQueryString
  );
  const query = normalizeProjectDiscoveryQuery(state, defaults);
  for (const key of [
    "search",
    "pillar",
    "category",
    "technology",
    "type",
    "year",
    "sort",
    "page",
  ]) {
    params.delete(key);
  }
  setWhenNotDefault(params, "search", query.search.trim(), defaults.search);
  setWhenNotDefault(params, "pillar", query.pillar, defaults.pillar);
  setWhenNotDefault(params, "category", query.category, defaults.category);
  setWhenNotDefault(
    params,
    "technology",
    query.technology,
    defaults.technology
  );
  setWhenNotDefault(params, "type", query.type, defaults.type);
  setWhenNotDefault(params, "year", query.year, defaults.year);
  setWhenNotDefault(params, "sort", query.sort, defaults.sort);
  setWhenNotDefault(params, "page", query.page, defaults.page);
  return finishQueryString(params);
};

export const mergeArticleDiscoveryQueryString = (
  currentQueryString: string,
  state: ArticleDiscoveryQuery,
  defaults: ArticleDiscoveryQuery = DEFAULT_ARTICLE_DISCOVERY_QUERY
): string => {
  const params = new URLSearchParams(
    currentQueryString.startsWith("?")
      ? currentQueryString.slice(1)
      : currentQueryString
  );
  const query = normalizeArticleDiscoveryQuery(state, defaults);
  for (const key of ["search", "pillar", "category", "topic", "sort", "page"]) {
    params.delete(key);
  }
  setWhenNotDefault(params, "search", query.search.trim(), defaults.search);
  setWhenNotDefault(params, "pillar", query.pillar, defaults.pillar);
  setWhenNotDefault(params, "category", query.category, defaults.category);
  setWhenNotDefault(params, "topic", query.topic, defaults.topic);
  setWhenNotDefault(params, "sort", query.sort, defaults.sort);
  setWhenNotDefault(params, "page", query.page, defaults.page);
  return finishQueryString(params);
};

const PROJECT_SORT_FIELDS: Record<ProjectDiscoverySort, string> = {
  featured: "-is_featured,-started_at,name,_id",
  newest: "-started_at,name,_id",
  oldest: "started_at,name,_id",
  name: "name,_id",
};

const ARTICLE_SORT_FIELDS: Record<ArticleDiscoverySort, string> = {
  newest: "-published_at,name,_id",
  oldest: "published_at,name,_id",
  featured: "-is_featured,-published_at,name,_id",
  name: "name,_id",
};

export const buildProjectDiscoveryRepositoryQuery = (
  query: ProjectDiscoveryQuery,
  categoryId?: string,
  composition: ProjectDiscoveryCompositionFilter = {}
): Record<string, string> => {
  const pillar =
    query.pillar !== "all" &&
    composition.pillar &&
    query.pillar !== composition.pillar
      ? "__page_scope_mismatch__"
      : query.pillar !== "all"
        ? query.pillar
        : composition.pillar;
  const projectType =
    query.type !== "all" &&
    composition.project_type &&
    query.type !== composition.project_type
      ? "__page_scope_mismatch__"
      : query.type !== "all"
        ? query.type
        : composition.project_type;
  return {
    page: String(query.page),
    limit: String(PUBLIC_DISCOVERY_PAGE_SIZE),
    sort: PROJECT_SORT_FIELDS[query.sort],
    ...(query.search.trim() ? { search: query.search.trim() } : {}),
    ...(pillar ? { primary_pillar: pillar } : {}),
    ...(query.category !== "all" && categoryId ? { category: categoryId } : {}),
    ...(query.category !== "all" && !categoryId
      ? { category: "000000000000000000000000" }
      : {}),
    ...(query.technology !== "all" ? { tags: query.technology } : {}),
    ...(projectType ? { project_type: projectType } : {}),
    ...(composition.featured === undefined
      ? {}
      : { is_featured: String(composition.featured) }),
    ...(query.year ? { year: String(query.year) } : {}),
  };
};

export const buildArticleDiscoveryRepositoryQuery = (
  query: ArticleDiscoveryQuery,
  categoryId?: string,
  composition: ArticleDiscoveryCompositionFilter = {}
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
    sort: ARTICLE_SORT_FIELDS[query.sort],
    ...(query.search.trim() ? { search: query.search.trim() } : {}),
    ...(pillar ? { primary_pillar: pillar } : {}),
    ...(query.category !== "all" && categoryId ? { category: categoryId } : {}),
    ...(query.category !== "all" && !categoryId
      ? { category: "000000000000000000000000" }
      : {}),
    ...(query.topic !== "all" ? { topics: query.topic } : {}),
    ...(composition.featured === undefined
      ? {}
      : { is_featured: String(composition.featured) }),
  };
};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const normalized = value.toString();
    return normalized && normalized !== "[object Object]"
      ? normalized
      : undefined;
  }
  return undefined;
};

const toIsoDate = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];

const PUBLIC_CARD_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]+/g;

const toPublicCardText = (value: unknown, maximumLength: number) => {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(PUBLIC_CARD_CONTROL_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength)
    .trim();
  return normalized || undefined;
};

const toPublicMedia = (value: unknown) => {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const id = toStringValue(source._id);
  const url = typeof source.url === "string" ? source.url : undefined;
  if (!id || !url) return undefined;
  return {
    _id: id,
    url,
    ...(typeof source.mimetype === "string"
      ? { mimetype: source.mimetype }
      : {}),
    ...(typeof source.alt_text === "string"
      ? { alt_text: source.alt_text }
      : {}),
    ...(typeof source.caption === "string" ? { caption: source.caption } : {}),
    ...(typeof source.dominant_color === "string"
      ? { dominant_color: source.dominant_color }
      : {}),
    ...(typeof source.blur_data_url === "string"
      ? { blur_data_url: source.blur_data_url }
      : {}),
    ...(source.metadata && typeof source.metadata === "object"
      ? { metadata: { ...(source.metadata as Record<string, unknown>) } }
      : {}),
  };
};

const toPublicCategory = (value: unknown) => {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const id = toStringValue(source._id);
  if (
    !id ||
    typeof source.name !== "string" ||
    typeof source.slug !== "string"
  ) {
    return undefined;
  }
  return { _id: id, name: source.name, slug: source.slug };
};

export const toSerializableProjectListItem = (
  value: unknown
): TProjectListItem | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = toStringValue(source._id);
  if (!id || typeof source.name !== "string") return null;
  const status = [
    "planned",
    "in_progress",
    "on_hold",
    "completed",
    "cancelled",
  ].includes(String(source.status))
    ? source.status
    : null;
  if (!status) return null;
  const role = toPublicCardText(source.role, 1_000);
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
            verification_state: outcome.verification_state,
          },
        ];
      })
    : [];
  return {
    _id: id,
    name: source.name,
    status: status as TProjectListItem["status"],
    is_featured: source.is_featured === true,
    is_premium: source.is_premium === true,
    ...(typeof source.slug === "string" ? { slug: source.slug } : {}),
    ...(typeof source.description === "string"
      ? { description: source.description }
      : {}),
    ...(role ? { role } : {}),
    ...(toPublicMedia(source.thumbnail)
      ? { thumbnail: toPublicMedia(source.thumbnail) as never }
      : {}),
    ...(toPublicCategory(source.category)
      ? { category: toPublicCategory(source.category) }
      : {}),
    tags: toStringArray(source.tags),
    outcomes: outcomes as TProjectListItem["outcomes"],
    ...(isPillar(String(source.primary_pillar))
      ? { primary_pillar: source.primary_pillar as PillarKey }
      : {}),
    secondary_pillars: toStringArray(source.secondary_pillars).filter(isPillar),
    ...(PROJECT_TYPES.includes(source.project_type as ProjectType)
      ? { project_type: source.project_type as ProjectType }
      : {}),
    ...(["planned", "active", "completed"].includes(
      String(source.delivery_status)
    )
      ? {
          delivery_status:
            source.delivery_status as TProjectListItem["delivery_status"],
        }
      : {}),
    ...(toIsoDate(source.started_at)
      ? { started_at: toIsoDate(source.started_at) }
      : {}),
  };
};

export const toSerializableArticleListItem = (
  value: unknown
): TArticleListItem | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = toStringValue(source._id);
  if (!id || typeof source.name !== "string") return null;
  const author =
    source.author && typeof source.author === "object"
      ? (source.author as Record<string, unknown>)
      : undefined;
  const authorId = author ? toStringValue(author._id) : undefined;
  const readingTime = Number(source.reading_time_minutes);
  return {
    _id: id,
    name: source.name,
    is_featured: source.is_featured === true,
    is_premium: source.is_premium === true,
    ...(typeof source.slug === "string" ? { slug: source.slug } : {}),
    ...(typeof source.description === "string"
      ? { description: source.description }
      : {}),
    ...(typeof source.excerpt === "string" ? { excerpt: source.excerpt } : {}),
    ...(toPublicMedia(source.thumbnail)
      ? { thumbnail: toPublicMedia(source.thumbnail) as never }
      : {}),
    ...(toPublicCategory(source.category)
      ? { category: toPublicCategory(source.category) }
      : {}),
    ...(author && authorId && typeof author.name === "string"
      ? {
          author: {
            _id: authorId,
            name: author.name,
            ...(toPublicMedia(author.image)
              ? { image: toPublicMedia(author.image) as never }
              : {}),
          },
        }
      : {}),
    tags: toStringArray(source.tags),
    topics: toStringArray(source.topics),
    ...(isPillar(String(source.primary_pillar))
      ? { primary_pillar: source.primary_pillar as PillarKey }
      : {}),
    secondary_pillars: toStringArray(source.secondary_pillars).filter(isPillar),
    ...(Number.isSafeInteger(readingTime) && readingTime > 0
      ? { reading_time_minutes: readingTime }
      : {}),
    ...(source.reading_time_source === "manual" ||
    source.reading_time_source === "derived"
      ? { reading_time_source: source.reading_time_source }
      : {}),
    ...(toIsoDate(source.published_at)
      ? { published_at: toIsoDate(source.published_at) }
      : {}),
    ...(toIsoDate(source.updated_at)
      ? { updated_at: toIsoDate(source.updated_at) }
      : {}),
  };
};

const toSerializableCategory = <
  TCategory extends TProjectCategory | TArticleCategory,
>(
  value: unknown
): TCategory | null => {
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
  } as TCategory;
};

export const toSerializableProjectCategory = (value: unknown) =>
  toSerializableCategory<TProjectCategory>(value);

export const toSerializableArticleCategory = (value: unknown) =>
  toSerializableCategory<TArticleCategory>(value);

export const hasProjectDiscoveryFilters = (query: ProjectDiscoveryQuery) =>
  Boolean(query.search.trim()) ||
  query.pillar !== "all" ||
  query.category !== "all" ||
  query.technology !== "all" ||
  query.type !== "all" ||
  query.year !== null;

export const hasArticleDiscoveryFilters = (query: ArticleDiscoveryQuery) =>
  Boolean(query.search.trim()) ||
  query.pillar !== "all" ||
  query.category !== "all" ||
  query.topic !== "all";

export const getProjectDiscoveryRequestKey = (query: ProjectDiscoveryQuery) =>
  mergeProjectDiscoveryQueryString("", query);

export const getArticleDiscoveryRequestKey = (query: ArticleDiscoveryQuery) =>
  mergeArticleDiscoveryQueryString("", query);
