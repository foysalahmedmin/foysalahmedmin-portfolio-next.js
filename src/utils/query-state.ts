export type TListQueryState = {
  search: string;
  category: string;
  page: number;
};

export const DEFAULT_LIST_QUERY_STATE: Readonly<TListQueryState> = {
  search: "",
  category: "all",
  page: 1,
};

const MAX_SEARCH_LENGTH = 100;
const MAX_CATEGORY_LENGTH = 100;
const MAX_PAGE = 1_000_000;

const normalizePage = (value: unknown, fallback: number) => {
  const parsed =
    typeof value === "string" || typeof value === "number"
      ? Number(value)
      : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_PAGE);
};

const normalizeSearch = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;

  const normalized = value.slice(0, MAX_SEARCH_LENGTH);
  return normalized.trim() ? normalized : fallback;
};

const normalizeCategory = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().slice(0, MAX_CATEGORY_LENGTH);
  return normalized || fallback;
};

export const normalizeListQueryState = (
  value: Partial<TListQueryState>,
  defaults: TListQueryState = DEFAULT_LIST_QUERY_STATE
): TListQueryState => ({
  search: normalizeSearch(value.search, defaults.search),
  category: normalizeCategory(value.category, defaults.category),
  page: normalizePage(value.page, defaults.page),
});

export const parseListQueryState = (
  queryString: string,
  defaults: TListQueryState = DEFAULT_LIST_QUERY_STATE
): TListQueryState => {
  const params = new URLSearchParams(
    queryString.startsWith("?") ? queryString.slice(1) : queryString
  );

  return normalizeListQueryState(
    {
      search: params.get("search")?.trim() ?? defaults.search,
      category: params.get("category") ?? defaults.category,
      page: normalizePage(params.get("page"), defaults.page),
    },
    defaults
  );
};

export const mergeListQueryString = (
  currentQueryString: string,
  state: TListQueryState,
  defaults: TListQueryState = DEFAULT_LIST_QUERY_STATE
): string => {
  const params = new URLSearchParams(
    currentQueryString.startsWith("?")
      ? currentQueryString.slice(1)
      : currentQueryString
  );
  const normalizedState = normalizeListQueryState(state, defaults);
  const normalizedSearch = normalizedState.search.trim();

  if (normalizedSearch === defaults.search) params.delete("search");
  else params.set("search", normalizedSearch);

  if (normalizedState.category === defaults.category) {
    params.delete("category");
  } else {
    params.set("category", normalizedState.category);
  }

  if (normalizedState.page === defaults.page) params.delete("page");
  else params.set("page", String(normalizedState.page));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};
