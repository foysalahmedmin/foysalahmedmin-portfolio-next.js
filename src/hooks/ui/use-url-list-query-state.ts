"use client";

import {
  DEFAULT_ARTICLE_DISCOVERY_QUERY,
  DEFAULT_PROJECT_DISCOVERY_QUERY,
  mergeArticleDiscoveryQueryString,
  mergeProjectDiscoveryQueryString,
  normalizeArticleDiscoveryQuery,
  normalizeProjectDiscoveryQuery,
  parseArticleDiscoveryQuery,
  parseProjectDiscoveryQuery,
  type DiscoveryKind,
  type DiscoveryQueryFor,
} from "@/lib/discovery/public-discovery";
import { useCallback, useEffect, useRef, useState } from "react";

export type UrlQueryHistoryMode = "push" | "replace";

type SetQueryOptions = {
  history?: UrlQueryHistoryMode;
};

type TUrlListQueryState<TKind extends DiscoveryKind> = {
  isReady: boolean;
  query: DiscoveryQueryFor<TKind>;
  setQuery: (
    patch: Partial<DiscoveryQueryFor<TKind>>,
    options?: SetQueryOptions
  ) => void;
};

const normalizeForKind = <TKind extends DiscoveryKind>(
  kind: TKind,
  value: Partial<DiscoveryQueryFor<TKind>>,
  defaults: DiscoveryQueryFor<TKind>
): DiscoveryQueryFor<TKind> =>
  (kind === "projects"
    ? normalizeProjectDiscoveryQuery(
        value as Partial<DiscoveryQueryFor<"projects">>,
        defaults as DiscoveryQueryFor<"projects">
      )
    : normalizeArticleDiscoveryQuery(
        value as Partial<DiscoveryQueryFor<"articles">>,
        defaults as DiscoveryQueryFor<"articles">
      )) as DiscoveryQueryFor<TKind>;

const parseForKind = <TKind extends DiscoveryKind>(
  kind: TKind,
  search: string,
  defaults: DiscoveryQueryFor<TKind>
): DiscoveryQueryFor<TKind> =>
  (kind === "projects"
    ? parseProjectDiscoveryQuery(
        new URLSearchParams(search),
        defaults as DiscoveryQueryFor<"projects">
      )
    : parseArticleDiscoveryQuery(
        new URLSearchParams(search),
        defaults as DiscoveryQueryFor<"articles">
      )) as DiscoveryQueryFor<TKind>;

const mergeForKind = <TKind extends DiscoveryKind>(
  kind: TKind,
  currentSearch: string,
  query: DiscoveryQueryFor<TKind>,
  defaults: DiscoveryQueryFor<TKind>
) =>
  kind === "projects"
    ? mergeProjectDiscoveryQueryString(
        currentSearch,
        query as DiscoveryQueryFor<"projects">,
        defaults as DiscoveryQueryFor<"projects">
      )
    : mergeArticleDiscoveryQueryString(
        currentSearch,
        query as DiscoveryQueryFor<"articles">,
        defaults as DiscoveryQueryFor<"articles">
      );

export const useUrlListQueryState = <TKind extends DiscoveryKind>(
  kind: TKind,
  initialState?: DiscoveryQueryFor<TKind>
): TUrlListQueryState<TKind> => {
  const [defaults] = useState<DiscoveryQueryFor<TKind>>(
    () =>
      (kind === "projects"
        ? DEFAULT_PROJECT_DISCOVERY_QUERY
        : DEFAULT_ARTICLE_DISCOVERY_QUERY) as DiscoveryQueryFor<TKind>
  );
  const [query, setQueryState] = useState<DiscoveryQueryFor<TKind>>(() =>
    normalizeForKind(kind, initialState ?? defaults, defaults)
  );
  const queryRef = useRef(query);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const readLocation = () => {
      const nextQuery = parseForKind(kind, window.location.search, defaults);
      queryRef.current = nextQuery;
      setQueryState(nextQuery);
      setIsReady(true);
    };

    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, [defaults, kind]);

  const setQuery = useCallback(
    (
      patch: Partial<DiscoveryQueryFor<TKind>>,
      { history = "push" }: SetQueryOptions = {}
    ) => {
      const nextQuery = normalizeForKind(
        kind,
        { ...queryRef.current, ...patch },
        defaults
      );
      queryRef.current = nextQuery;
      const nextSearch = mergeForKind(
        kind,
        window.location.search,
        nextQuery,
        defaults
      );
      const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl !== currentUrl) {
        if (history === "replace") {
          window.history.replaceState(window.history.state, "", nextUrl);
        } else {
          window.history.pushState(window.history.state, "", nextUrl);
        }
      }
      setQueryState(nextQuery);
    },
    [defaults, kind]
  );

  return { isReady, query, setQuery };
};
