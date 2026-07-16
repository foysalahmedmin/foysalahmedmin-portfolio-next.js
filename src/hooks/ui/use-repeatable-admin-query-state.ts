"use client";

import type { RepeatableAdminFilter } from "@/lib/admin/repeatable-workspaces";
import { useCallback, useEffect, useMemo, useState } from "react";

export type RepeatableAdminQueryState = Readonly<{
  search: string;
  sort: string;
  page: number;
  limit: number;
  filters: Readonly<Record<string, string>>;
}>;

type QueryContract = Readonly<{
  defaultSort: string;
  filters: readonly RepeatableAdminFilter[];
  allowedSortKeys: readonly string[];
}>;

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const positiveInteger = (
  value: string | null,
  fallback: number,
  max: number
) => {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max
    ? parsed
    : fallback;
};

const normalizeSort = (value: string | null, contract: QueryContract) => {
  if (!value) return contract.defaultSort;
  const key = value.startsWith("-") ? value.slice(1) : value;
  return contract.allowedSortKeys.includes(key) ? value : contract.defaultSort;
};

export const parseRepeatableAdminQuery = (
  queryString: string,
  contract: QueryContract
): RepeatableAdminQueryState => {
  const params = new URLSearchParams(
    queryString.startsWith("?") ? queryString.slice(1) : queryString
  );
  const filters = Object.fromEntries(
    contract.filters.flatMap((filter) => {
      const value = params.get(filter.id) ?? "";
      return value && filter.options.some((option) => option.value === value)
        ? [[filter.id, value]]
        : [];
    })
  );
  const requestedLimit = positiveInteger(params.get("limit"), 10, 50);
  const limit = PAGE_SIZE_OPTIONS.includes(requestedLimit as never)
    ? requestedLimit
    : 10;
  return {
    search: (params.get("search") ?? "").slice(0, 80),
    sort: normalizeSort(params.get("sort"), contract),
    page: positiveInteger(params.get("page"), 1, 200),
    limit,
    filters,
  };
};

export const mergeRepeatableAdminQuery = (
  currentQueryString: string,
  state: RepeatableAdminQueryState,
  contract: QueryContract
): string => {
  const params = new URLSearchParams(
    currentQueryString.startsWith("?")
      ? currentQueryString.slice(1)
      : currentQueryString
  );
  [
    "search",
    "sort",
    "page",
    "limit",
    ...contract.filters.map(({ id }) => id),
  ].forEach((key) => params.delete(key));

  const search = state.search.trim().slice(0, 80);
  if (search) params.set("search", search);
  if (state.sort !== contract.defaultSort) params.set("sort", state.sort);
  if (state.page !== 1) params.set("page", String(state.page));
  if (state.limit !== 10) params.set("limit", String(state.limit));
  Object.entries(state.filters).forEach(([key, value]) => {
    const filter = contract.filters.find((item) => item.id === key);
    if (value && filter?.options.some((option) => option.value === value)) {
      params.set(key, value);
    }
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export const useRepeatableAdminQueryState = (contract: QueryContract) => {
  const stableContract = useMemo(() => contract, [contract]);
  const [state, setState] = useState<RepeatableAdminQueryState>(() => ({
    search: "",
    sort: stableContract.defaultSort,
    page: 1,
    limit: 10,
    filters: {},
  }));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const readLocation = () => {
      setState(
        parseRepeatableAdminQuery(window.location.search, stableContract)
      );
      setIsReady(true);
    };
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, [stableContract]);

  useEffect(() => {
    if (!isReady) return;
    const queryString = mergeRepeatableAdminQuery(
      window.location.search,
      state,
      stableContract
    );
    const next = `${window.location.pathname}${queryString}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current)
      window.history.replaceState(window.history.state, "", next);
  }, [isReady, stableContract, state]);

  const patchState = useCallback(
    (patch: Partial<RepeatableAdminQueryState>, resetPage = false) => {
      setState((current) => ({
        ...current,
        ...patch,
        ...(resetPage ? { page: 1 } : {}),
      }));
    },
    []
  );

  return { isReady, state, patchState };
};
