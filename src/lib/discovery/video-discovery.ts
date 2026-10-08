import {
  VIDEO_ASPECT_RATIOS,
  type VideoAspectRatio,
} from "@/lib/content/video-contract";
import type { TVideoCategory } from "@/types/video-category.type";
import type { TVideoListItem } from "@/types/video.type";
import {
  finishQueryString,
  normalizeCategory,
  normalizeEnum,
  normalizePage,
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

export const VIDEO_DISCOVERY_SORTS = [
  "newest",
  "oldest",
  "featured",
  "name",
] as const;
export type VideoDiscoverySort = (typeof VIDEO_DISCOVERY_SORTS)[number];
export type VideoDiscoveryShow = "all" | VideoAspectRatio;
export const VIDEO_DISCOVERY_SHOW_OPTIONS = [
  "all",
  ...VIDEO_ASPECT_RATIOS,
] as const;

/**
 * Landscape videos and reels are never mixed in one grid: each shape has its
 * own lane with its own page size and its own page counter.
 */
export type VideoDiscoveryQuery = {
  search: string;
  category: string;
  show: VideoDiscoveryShow;
  sort: VideoDiscoverySort;
  landscape_page: number;
  reel_page: number;
};

export const DEFAULT_VIDEO_DISCOVERY_QUERY: Readonly<VideoDiscoveryQuery> = {
  search: "",
  category: "all",
  show: "all",
  sort: "newest",
  landscape_page: 1,
  reel_page: 1,
};

/** Page size per lane; a focused lane (`show=landscape|reel`) shows more. */
export const VIDEO_LANE_PAGE_SIZE: Readonly<
  Record<VideoDiscoveryShow, Readonly<Record<VideoAspectRatio, number>>>
> = {
  all: { landscape: 6, reel: 8 },
  landscape: { landscape: 12, reel: 8 },
  reel: { landscape: 6, reel: 16 },
};

export const VIDEO_SORT_FIELDS: Readonly<Record<VideoDiscoverySort, string>> = {
  newest: "-published_at,name,_id",
  oldest: "published_at,name,_id",
  featured: "-is_featured,-published_at,name,_id",
  name: "name,_id",
};

export const normalizeVideoDiscoveryQuery = (
  value: Partial<VideoDiscoveryQuery>,
  defaults: VideoDiscoveryQuery = DEFAULT_VIDEO_DISCOVERY_QUERY
): VideoDiscoveryQuery => ({
  search: normalizeSearch(value.search, defaults.search),
  category: normalizeCategory(value.category, defaults.category),
  show: normalizeEnum(value.show, VIDEO_DISCOVERY_SHOW_OPTIONS, defaults.show),
  sort: normalizeEnum(value.sort, VIDEO_DISCOVERY_SORTS, defaults.sort),
  landscape_page: normalizePage(value.landscape_page, defaults.landscape_page),
  reel_page: normalizePage(value.reel_page, defaults.reel_page),
});

export const parseVideoDiscoveryQuery = (
  source: QuerySource,
  defaults: VideoDiscoveryQuery = DEFAULT_VIDEO_DISCOVERY_QUERY
): VideoDiscoveryQuery => {
  const search = readValue(source, "search");
  return normalizeVideoDiscoveryQuery(
    {
      search: typeof search === "string" ? search.trim() : undefined,
      category: readValue(source, "category") as string | undefined,
      show: readValue(source, "show") as VideoDiscoveryShow | undefined,
      sort: readValue(source, "sort") as VideoDiscoverySort | undefined,
      landscape_page: readValue(source, "landscape_page") as number | undefined,
      reel_page: readValue(source, "reel_page") as number | undefined,
    },
    defaults
  );
};

export const mergeVideoDiscoveryQueryString = (
  currentQueryString: string,
  state: VideoDiscoveryQuery,
  defaults: VideoDiscoveryQuery = DEFAULT_VIDEO_DISCOVERY_QUERY
): string => {
  const params = new URLSearchParams(
    currentQueryString.startsWith("?")
      ? currentQueryString.slice(1)
      : currentQueryString
  );
  const query = normalizeVideoDiscoveryQuery(state, defaults);
  setWhenNotDefault(params, "search", query.search, defaults.search);
  setWhenNotDefault(params, "category", query.category, defaults.category);
  setWhenNotDefault(params, "show", query.show, defaults.show);
  setWhenNotDefault(params, "sort", query.sort, defaults.sort);
  setWhenNotDefault(
    params,
    "landscape_page",
    query.landscape_page,
    defaults.landscape_page
  );
  setWhenNotDefault(params, "reel_page", query.reel_page, defaults.reel_page);
  return finishQueryString(params);
};

export const hasVideoDiscoveryFilters = (query: VideoDiscoveryQuery) =>
  Boolean(query.search.trim()) ||
  query.category !== "all" ||
  query.show !== "all";

/** Repository query for one lane of the Videos page. */
export const buildVideoLaneRepositoryQuery = (
  query: VideoDiscoveryQuery,
  lane: VideoAspectRatio,
  categoryId?: string
): Record<string, string> => ({
  page: String(lane === "landscape" ? query.landscape_page : query.reel_page),
  limit: String(VIDEO_LANE_PAGE_SIZE[query.show][lane]),
  sort: VIDEO_SORT_FIELDS[query.sort],
  aspect_ratio: lane,
  ...(query.search.trim() ? { search: query.search.trim() } : {}),
  ...(query.category !== "all" && categoryId ? { category: categoryId } : {}),
  ...(query.category !== "all" && !categoryId
    ? { category: "000000000000000000000000" }
    : {}),
});

/** Query for the generic public API: one list, optionally one shape. */
export type VideoApiQuery = {
  search: string;
  category: string;
  aspect_ratio: VideoDiscoveryShow;
  sort: VideoDiscoverySort;
  page: number;
  limit: number;
};

export const parseVideoApiQuery = (source: QuerySource): VideoApiQuery => {
  const base = parseVideoDiscoveryQuery(source);
  const limit = Number(readValue(source, "limit"));
  return {
    search: base.search,
    category: base.category,
    aspect_ratio: normalizeEnum(
      readValue(source, "aspect_ratio"),
      VIDEO_DISCOVERY_SHOW_OPTIONS,
      "all"
    ),
    sort: base.sort,
    page: normalizePage(readValue(source, "page"), 1),
    limit:
      Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 24) : 12,
  };
};

/** Scope a Page section applies to the library (e.g. featured only). */
export type VideoDiscoveryCompositionFilter = Readonly<{ featured?: boolean }>;

export const normalizeVideoDiscoveryCompositionFilter = (
  value: Readonly<Record<string, unknown>>
): VideoDiscoveryCompositionFilter => {
  const featured = value.composition_featured ?? value.featured;
  if (featured === true || featured === "true") return { featured: true };
  if (featured === false || featured === "false") return { featured: false };
  return {};
};

export const videoDiscoveryCompositionQuery = (
  filter: VideoDiscoveryCompositionFilter
): Readonly<Record<string, string | boolean>> =>
  filter.featured === undefined ? {} : { composition_featured: filter.featured };

export const buildVideoApiRepositoryQuery = (
  query: VideoApiQuery,
  categoryId?: string,
  composition: VideoDiscoveryCompositionFilter = {}
): Record<string, string> => ({
  ...(composition.featured === undefined
    ? {}
    : { is_featured: String(composition.featured) }),
  page: String(query.page),
  limit: String(query.limit),
  sort: VIDEO_SORT_FIELDS[query.sort],
  ...(query.aspect_ratio !== "all" ? { aspect_ratio: query.aspect_ratio } : {}),
  ...(query.search.trim() ? { search: query.search.trim() } : {}),
  ...(query.category !== "all" && categoryId ? { category: categoryId } : {}),
  ...(query.category !== "all" && !categoryId
    ? { category: "000000000000000000000000" }
    : {}),
});

const toPublicVideoFile = (value: unknown) => {
  const media = toPublicMedia(value);
  return media as TVideoListItem["video_file"];
};

/** Maps a lean repository record to the plain object the UI may receive. */
export const toSerializableVideoListItem = (
  value: unknown
): TVideoListItem | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const id = toStringValue(source._id);
  if (!id || typeof source.name !== "string") return null;
  const aspect = VIDEO_ASPECT_RATIOS.includes(
    source.aspect_ratio as VideoAspectRatio
  )
    ? (source.aspect_ratio as VideoAspectRatio)
    : null;
  const sourceType =
    source.source_type === "youtube" || source.source_type === "upload"
      ? source.source_type
      : null;
  if (!aspect || !sourceType) return null;
  const duration = Number(source.duration_seconds);
  const videoFile = toPublicVideoFile(source.video_file);
  const youtubeId =
    typeof source.youtube_id === "string" ? source.youtube_id : undefined;
  if (sourceType === "youtube" ? !youtubeId : !videoFile) return null;
  return {
    _id: id,
    name: source.name,
    aspect_ratio: aspect,
    source_type: sourceType,
    is_featured: source.is_featured === true,
    ...(typeof source.slug === "string" ? { slug: source.slug } : {}),
    ...(typeof source.description === "string"
      ? { description: source.description }
      : {}),
    keywords: toStringArray(source.keywords),
    ...(toPublicMedia(source.thumbnail)
      ? { thumbnail: toPublicMedia(source.thumbnail) as never }
      : {}),
    ...(toPublicCategory(source.category)
      ? { category: toPublicCategory(source.category) }
      : {}),
    ...(videoFile ? { video_file: videoFile } : {}),
    ...(typeof source.youtube_url === "string"
      ? { youtube_url: source.youtube_url }
      : {}),
    ...(youtubeId ? { youtube_id: youtubeId } : {}),
    ...(Number.isFinite(duration) && duration > 0
      ? { duration_seconds: duration }
      : {}),
    ...(toIsoDate(source.published_at)
      ? { published_at: toIsoDate(source.published_at) }
      : {}),
    ...(toIsoDate(source.updated_at)
      ? { updated_at: toIsoDate(source.updated_at) }
      : {}),
  };
};

export const toSerializableVideoCategory = (
  value: unknown
): TVideoCategory | null => {
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
