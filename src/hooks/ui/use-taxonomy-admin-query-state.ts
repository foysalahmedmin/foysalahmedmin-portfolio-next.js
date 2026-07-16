"use client";

import {
  TAXONOMY_KINDS,
  type TTaxonomyKind,
  type TTaxonomyStatus,
} from "@/lib/admin/taxonomy-admin";
import { useCallback, useEffect, useState } from "react";

export type TTaxonomyAdminQueryState = Readonly<{
  kind: TTaxonomyKind;
  search: string;
  sort: string;
  page: number;
  limit: number;
  status: TTaxonomyStatus | "";
  deletedScope: "active" | "only_deleted";
}>;

const DEFAULT_STATE: TTaxonomyAdminQueryState = {
  kind: "article",
  search: "",
  sort: "sequence",
  page: 1,
  limit: 10,
  status: "",
  deletedScope: "active",
};

const PAGE_SIZES = [10, 20, 50] as const;
const SORT_KEYS = ["sequence", "name"] as const;

const boundedInteger = (
  value: string | null,
  fallback: number,
  maximum: number
) => {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : fallback;
};

export const parseTaxonomyAdminQuery = (
  queryString: string
): TTaxonomyAdminQueryState => {
  const params = new URLSearchParams(
    queryString.startsWith("?") ? queryString.slice(1) : queryString
  );
  const requestedKind = params.get("type");
  const kind = TAXONOMY_KINDS.includes(requestedKind as TTaxonomyKind)
    ? (requestedKind as TTaxonomyKind)
    : DEFAULT_STATE.kind;
  const requestedSort = params.get("sort") ?? "";
  const sortKey = requestedSort.startsWith("-")
    ? requestedSort.slice(1)
    : requestedSort;
  const sort = SORT_KEYS.includes(sortKey as (typeof SORT_KEYS)[number])
    ? requestedSort
    : DEFAULT_STATE.sort;
  const requestedLimit = boundedInteger(params.get("limit"), 10, 50);
  const status = params.get("status");

  return {
    kind,
    search: (params.get("search") ?? "").slice(0, 80),
    sort,
    page: boundedInteger(params.get("page"), 1, 500),
    limit: PAGE_SIZES.includes(requestedLimit as never) ? requestedLimit : 10,
    status: status === "active" || status === "inactive" ? status : "",
    deletedScope:
      params.get("deleted_scope") === "only_deleted"
        ? "only_deleted"
        : "active",
  };
};

export const mergeTaxonomyAdminQuery = (
  currentQueryString: string,
  state: TTaxonomyAdminQueryState
) => {
  const params = new URLSearchParams(
    currentQueryString.startsWith("?")
      ? currentQueryString.slice(1)
      : currentQueryString
  );
  [
    "type",
    "search",
    "sort",
    "page",
    "limit",
    "status",
    "deleted_scope",
  ].forEach((key) => params.delete(key));

  if (state.kind !== DEFAULT_STATE.kind) params.set("type", state.kind);
  if (state.search.trim())
    params.set("search", state.search.trim().slice(0, 80));
  if (state.sort !== DEFAULT_STATE.sort) params.set("sort", state.sort);
  if (state.page !== 1) params.set("page", String(state.page));
  if (state.limit !== 10) params.set("limit", String(state.limit));
  if (state.status) params.set("status", state.status);
  if (state.deletedScope === "only_deleted") {
    params.set("deleted_scope", "only_deleted");
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

export const useTaxonomyAdminQueryState = () => {
  const [state, setState] = useState<TTaxonomyAdminQueryState>(DEFAULT_STATE);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const readLocation = () => {
      setState(parseTaxonomyAdminQuery(window.location.search));
      setIsReady(true);
    };
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const query = mergeTaxonomyAdminQuery(window.location.search, state);
    const next = `${window.location.pathname}${query}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [isReady, state]);

  const patchState = useCallback(
    (
      patch: Partial<TTaxonomyAdminQueryState>,
      options: Readonly<{ resetPage?: boolean }> = {}
    ) => {
      setState((current) => ({
        ...current,
        ...patch,
        ...(options.resetPage ? { page: 1 } : {}),
      }));
    },
    []
  );

  return { state, isReady, patchState };
};
