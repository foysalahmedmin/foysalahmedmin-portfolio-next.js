"use client";

import { useQueryState } from "@/hooks/ui/use-query-state";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { Dropdown, DropdownContent, DropdownTrigger } from "./dropdown";
import { Pagination } from "./pagination";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export type TDataTableStatus = "idle" | "loading" | "error" | "success";
export type TDataTableSelectionMode = "none" | "single" | "multiple";
export type TDataTableSelectionSource =
  | "row"
  | "page"
  | "clear"
  | "data"
  | "query";

export type TColumn<T extends object> = {
  id?: string;
  name: string;
  field?: keyof T;
  accessor?: (row: T) => unknown;
  sortKey?: string;
  isSortable?: boolean;
  isSearchable?: boolean;
  defaultVisible?: boolean;
  canHide?: boolean;
  head?: (info: { head: TColumn<T> }) => React.ReactNode;
  cell?: (info: { cell: unknown; row: T; index: number }) => React.ReactNode;
  sortComparator?: (a: unknown, b: unknown, rowA: T, rowB: T) => number;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: "start" | "center" | "end";
  style?: React.CSSProperties;
  headClassName?: string;
  cellClassName?: string;
};

export type TDataTableFilterOption = {
  label: string;
  value: string;
};

export type TDataTableFilter<T extends object> = {
  id: string;
  label: string;
  allLabel?: string;
  options: readonly TDataTableFilterOption[];
  accessor?: (row: T) => unknown;
  predicate?: (row: T, value: string) => boolean;
};

type TSearchControl =
  | { search?: never; setSearch?: never }
  | { search: string; setSearch: (search: string) => void };

type TSortControl =
  | { sort?: never; setSort?: never }
  | { sort: string; setSort: (sort: string) => void };

type TPageControl =
  | { page?: never; setPage?: never }
  | { page: number; setPage: (page: number) => void };

type TLimitControl =
  | { limit?: never; setLimit?: never }
  | { limit: number; setLimit: (limit: number) => void };

type TFilterControl =
  | { filters?: never; setFilters?: never }
  | {
      filters: Record<string, string>;
      setFilters: (filters: Record<string, string>) => void;
    };

type TColumnVisibilityControl =
  | { visibleColumnIds?: never; setVisibleColumnIds?: never }
  | {
      visibleColumnIds: readonly string[];
      setVisibleColumnIds: (ids: string[]) => void;
    };

export type TDataTableState = TSearchControl &
  TSortControl &
  TPageControl &
  TLimitControl &
  TFilterControl &
  TColumnVisibilityControl & {
    total?: number;
  };

export type TDataTableConfig = {
  isSearchProcessed?: boolean;
  isSortProcessed?: boolean;
  isFilterProcessed?: boolean;
  isPaginationProcessed?: boolean;
  isViewSearch?: boolean;
  isViewSort?: boolean;
  isViewFilters?: boolean;
  isViewPagination?: boolean;
  isViewColumnVisibility?: boolean;
  isMultiSort?: boolean;
  searchDebounceMs?: number;
  pageSizeOptions?: readonly number[];
  skeletonRows?: number;
};

export type TDataTableSelectionChange<T extends object> = {
  selectedIds: string[];
  selectedRows: T[];
  visibleSelectedRows: T[];
  source: TDataTableSelectionSource;
};

export type TDataTableSelectionConfig<T extends object> = {
  mode: TDataTableSelectionMode;
  selectedIds?: readonly string[];
  defaultSelectedIds?: readonly string[];
  onChange?: (selection: TDataTableSelectionChange<T>) => void;
  isRowSelectable?: (row: T) => boolean;
  enableSelectAll?: boolean;
  preserveAcrossPages?: boolean;
  preserveAcrossQueries?: boolean;
  getRowLabel?: (row: T) => string;
};

export type TDataTableBulkActionContext<T extends object> =
  TDataTableSelectionChange<T> & {
    clearSelection: () => void;
  };

export type TDataTableProps<T extends object> = {
  title?: string;
  slot?: React.ReactNode;
  columns: readonly TColumn<T>[];
  data: readonly T[];
  getRowId: (row: T) => string;
  filters?: readonly TDataTableFilter<T>[];
  config?: TDataTableConfig;
  state?: TDataTableState;
  status?: TDataTableStatus;
  error?: string | null;
  onRetry?: () => void;
  selection?: TDataTableSelectionConfig<T> | false;
  bulkActions?: (context: TDataTableBulkActionContext<T>) => React.ReactNode;
  rowClassName?: (row: T) => string | undefined;
  caption?: string;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  tableClassName?: string;
  tableContainerClassName?: string;
};

type TRowEntry<T extends object> = {
  id: string;
  row: T;
};

type TSortEntry = {
  key: string;
  descending: boolean;
};

const alignClassNames = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const;

const EMPTY_FILTERS: Record<string, string> = {};

const uniqueIds = (ids: readonly string[]): string[] =>
  Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

const arraysEqual = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((item, index) => item === right[index]);

const assertControlPair = (name: string, value: unknown, setter: unknown) => {
  const hasValue = value !== undefined;
  const hasSetter = typeof setter === "function";
  if (hasValue !== hasSetter) {
    throw new Error(
      `DataTable state.${name} and its setter must be provided together`
    );
  }
};

const parseSort = (sort: string): TSortEntry[] =>
  sort
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({
      key: item.startsWith("-") ? item.slice(1) : item,
      descending: item.startsWith("-"),
    }))
    .filter((item) => item.key.length > 0);

const serializeSort = (entries: readonly TSortEntry[]): string =>
  entries
    .map((entry) => `${entry.descending ? "-" : ""}${entry.key}`)
    .join(",");

const getColumnId = <T extends object>(column: TColumn<T>): string => {
  const id =
    column.id || (typeof column.field === "string" ? column.field : "");
  if (!id) {
    throw new Error(
      `DataTable column "${column.name}" requires an id or string field`
    );
  }
  return id;
};

const getColumnValue = <T extends object>(
  row: T,
  column: TColumn<T>
): unknown => {
  if (column.accessor) return column.accessor(row);
  return column.field ? row[column.field] : undefined;
};

const toSearchableText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(toSearchableText).join(" ");
  return "";
};

const compareValues = (left: unknown, right: unknown): number => {
  if (left === null || left === undefined) return right == null ? 0 : 1;
  if (right === null || right === undefined) return -1;
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const toPositiveInteger = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && Number(value) > 0
    ? Math.floor(Number(value))
    : fallback;

const IndeterminateCheckbox = ({
  indeterminate,
  className,
  ...props
}: React.ComponentProps<"input"> & { indeterminate?: boolean }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      aria-checked={indeterminate ? "mixed" : props.checked}
      className={cn(
        "border-input accent-primary focus-visible:ring-ring size-4 cursor-pointer rounded focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
};

const SortIcon = ({ direction }: { direction?: "asc" | "desc" }) => (
  <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
    <ArrowUpDown
      aria-hidden="true"
      className={cn(
        "absolute size-4 transition-all duration-200",
        direction ? "scale-0 opacity-0" : "scale-100 opacity-40"
      )}
    />
    <ArrowUp
      aria-hidden="true"
      className={cn(
        "text-primary absolute size-4 transition-all duration-200",
        direction === "asc" ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}
    />
    <ArrowDown
      aria-hidden="true"
      className={cn(
        "text-primary absolute size-4 transition-all duration-200",
        direction === "desc" ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}
    />
  </span>
);

export const CellContent = ({ value }: { value: unknown }) => {
  if (React.isValidElement(value)) return value;
  if (value === null || value === undefined) return null;
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.map(toSearchableText).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const DataTable = <T extends object>({
  title,
  slot,
  columns,
  data,
  getRowId,
  filters = [],
  config,
  state,
  status = "success",
  error,
  onRetry,
  selection = false,
  bulkActions,
  rowClassName,
  caption = "Data table",
  searchPlaceholder = "Search…",
  emptyTitle = "No data found",
  emptyDescription = "Try adjusting your search or filters.",
  className,
  tableClassName,
  tableContainerClassName,
}: TDataTableProps<T>) => {
  const {
    isSearchProcessed = false,
    isSortProcessed = false,
    isFilterProcessed = false,
    isPaginationProcessed = false,
    isViewSearch = true,
    isViewSort = true,
    isViewFilters = filters.length > 0,
    isViewPagination = true,
    isViewColumnVisibility = true,
    isMultiSort = false,
    searchDebounceMs = 350,
    pageSizeOptions = [10, 20, 50, 100],
    skeletonRows = 5,
  } = config || {};

  if (state) {
    assertControlPair("search", state.search, state.setSearch);
    assertControlPair("sort", state.sort, state.setSort);
    assertControlPair("page", state.page, state.setPage);
    assertControlPair("limit", state.limit, state.setLimit);
    assertControlPair("filters", state.filters, state.setFilters);
    assertControlPair(
      "visibleColumnIds",
      state.visibleColumnIds,
      state.setVisibleColumnIds
    );
  }

  if (
    isPaginationProcessed &&
    (!Number.isFinite(state?.total) || Number(state?.total) < 0)
  ) {
    throw new Error(
      "Server-side DataTable pagination requires a finite, non-negative state.total"
    );
  }

  const initialQuery = useMemo(
    () => ({
      search: state?.search,
      sort: state?.sort,
      page: state?.page,
      limit: state?.limit,
    }),
    [state?.limit, state?.page, state?.search, state?.sort]
  );
  const {
    query: internalQuery,
    onSearchChange: setInternalSearch,
    onSortChange: setInternalSort,
    onPageChange: setInternalPage,
    onLimitChange: setInternalLimit,
  } = useQueryState(initialQuery);
  const setSearchProp = state?.setSearch;
  const setSortProp = state?.setSort;
  const setPageProp = state?.setPage;
  const setLimitProp = state?.setLimit;
  const setFiltersProp = state?.setFilters;
  const setVisibleColumnIdsProp = state?.setVisibleColumnIds;

  const currentSearch = setSearchProp
    ? (state.search ?? "")
    : (internalQuery.search ?? "");
  const currentSort = setSortProp
    ? (state.sort ?? "")
    : (internalQuery.sort ?? "");
  const currentPage = toPositiveInteger(
    setPageProp ? state?.page : internalQuery.page,
    1
  );
  const currentLimit = toPositiveInteger(
    setLimitProp ? state?.limit : internalQuery.limit,
    10
  );

  const setPage = useCallback(
    (value: number) => {
      if (setPageProp) setPageProp(value);
      else setInternalPage(value);
    },
    [setInternalPage, setPageProp]
  );
  const setSearch = useCallback(
    (value: string) => {
      if (setSearchProp) setSearchProp(value);
      else setInternalSearch(value);
      setPage(1);
    },
    [setInternalSearch, setPage, setSearchProp]
  );
  const setSort = useCallback(
    (value: string) => {
      if (setSortProp) setSortProp(value);
      else setInternalSort(value);
      setPage(1);
    },
    [setInternalSort, setPage, setSortProp]
  );
  const setLimit = useCallback(
    (value: number) => {
      if (setLimitProp) setLimitProp(value);
      else setInternalLimit(value);
      setPage(1);
    },
    [setInternalLimit, setLimitProp, setPage]
  );

  const [searchInput, setSearchInput] = useState(currentSearch);
  useEffect(() => setSearchInput(currentSearch), [currentSearch]);
  useEffect(() => {
    if (searchInput === currentSearch) return;
    const timeout = setTimeout(() => setSearch(searchInput), searchDebounceMs);
    return () => clearTimeout(timeout);
  }, [currentSearch, searchDebounceMs, searchInput, setSearch]);

  const [internalFilters, setInternalFilters] = useState<
    Record<string, string>
  >(() => state?.filters ?? {});
  const currentFilters = useMemo(
    () =>
      setFiltersProp ? (state?.filters ?? EMPTY_FILTERS) : internalFilters,
    [internalFilters, setFiltersProp, state?.filters]
  );
  const updateFilters = useCallback(
    (nextFilters: Record<string, string>) => {
      if (setFiltersProp) setFiltersProp(nextFilters);
      else setInternalFilters(nextFilters);
      setPage(1);
    },
    [setFiltersProp, setPage]
  );

  const columnDefinitions = useMemo(() => {
    if (!columns.length) {
      throw new Error("DataTable requires at least one column");
    }
    const seen = new Set<string>();
    return columns.map((column) => {
      const id = getColumnId(column);
      if (seen.has(id)) throw new Error(`Duplicate DataTable column id: ${id}`);
      seen.add(id);
      return { ...column, id };
    });
  }, [columns]);
  const allColumnIds = useMemo(
    () => columnDefinitions.map((column) => column.id),
    [columnDefinitions]
  );
  const defaultVisibleColumnIds = useMemo(() => {
    const visibleIds = columnDefinitions
      .filter(
        (column) => column.defaultVisible !== false || column.canHide === false
      )
      .map((column) => column.id);
    return visibleIds.length ? visibleIds : [columnDefinitions[0].id];
  }, [columnDefinitions]);
  const requiredColumnIds = useMemo(
    () =>
      columnDefinitions
        .filter((column) => column.canHide === false)
        .map((column) => column.id),
    [columnDefinitions]
  );
  const [internalVisibleColumnIds, setInternalVisibleColumnIds] = useState<
    string[]
  >(() => defaultVisibleColumnIds);
  const visibleColumnIds = useMemo(() => {
    const requestedIds = setVisibleColumnIdsProp
      ? uniqueIds(state?.visibleColumnIds ?? defaultVisibleColumnIds)
      : internalVisibleColumnIds;
    const requestedSet = new Set([...requestedIds, ...requiredColumnIds]);
    const normalized = allColumnIds.filter((id) => requestedSet.has(id));
    return normalized.length ? normalized : defaultVisibleColumnIds;
  }, [
    allColumnIds,
    defaultVisibleColumnIds,
    internalVisibleColumnIds,
    requiredColumnIds,
    setVisibleColumnIdsProp,
    state?.visibleColumnIds,
  ]);
  const knownColumnIdsRef = useRef(allColumnIds);

  useEffect(() => {
    const previouslyKnownIds = knownColumnIdsRef.current;

    if (!setVisibleColumnIdsProp) {
      setInternalVisibleColumnIds((previous) => {
        const selectedIds = new Set(
          previous.filter((id) => allColumnIds.includes(id))
        );
        defaultVisibleColumnIds.forEach((id) => {
          if (!previouslyKnownIds.includes(id)) selectedIds.add(id);
        });
        requiredColumnIds.forEach((id) => selectedIds.add(id));
        const next = allColumnIds.filter((id) => selectedIds.has(id));
        const normalized = next.length ? next : defaultVisibleColumnIds;
        return arraysEqual(previous, normalized) ? previous : normalized;
      });
    }

    knownColumnIdsRef.current = allColumnIds;
  }, [
    allColumnIds,
    defaultVisibleColumnIds,
    requiredColumnIds,
    setVisibleColumnIdsProp,
  ]);

  const processedColumns = useMemo(
    () =>
      columnDefinitions.filter((column) =>
        visibleColumnIds.includes(column.id)
      ),
    [columnDefinitions, visibleColumnIds]
  );

  const setVisibleColumns = useCallback(
    (ids: string[]) => {
      const requestedSet = new Set([...ids, ...requiredColumnIds]);
      const requested = allColumnIds.filter((id) => requestedSet.has(id));
      const normalized = requested.length ? requested : defaultVisibleColumnIds;
      if (setVisibleColumnIdsProp) setVisibleColumnIdsProp(normalized);
      else setInternalVisibleColumnIds(normalized);
    },
    [
      allColumnIds,
      defaultVisibleColumnIds,
      requiredColumnIds,
      setVisibleColumnIdsProp,
    ]
  );

  const toggleColumn = useCallback(
    (columnId: string) => {
      const column = columnDefinitions.find((item) => item.id === columnId);
      if (!column || column.canHide === false) return;
      const isHiding = visibleColumnIds.includes(columnId);
      const next = isHiding
        ? visibleColumnIds.filter((id) => id !== columnId)
        : allColumnIds.filter(
            (id) => visibleColumnIds.includes(id) || id === columnId
          );

      if (isHiding) {
        const sortKey = column.sortKey || column.id;
        const sortWithoutHiddenColumn = parseSort(currentSort).filter(
          (entry) => entry.key !== sortKey
        );
        const nextSort = serializeSort(sortWithoutHiddenColumn);
        if (nextSort !== currentSort) setSort(nextSort);
      }

      setVisibleColumns(next);
    },
    [
      allColumnIds,
      columnDefinitions,
      currentSort,
      setSort,
      setVisibleColumns,
      visibleColumnIds,
    ]
  );

  const rowEntries = useMemo<TRowEntry<T>[]>(() => {
    const seen = new Set<string>();
    return data.map((row) => {
      const id = getRowId(row).trim();
      if (!id) throw new Error("DataTable getRowId returned an empty id");
      if (seen.has(id)) throw new Error(`Duplicate DataTable row id: ${id}`);
      seen.add(id);
      return { id, row };
    });
  }, [data, getRowId]);
  const rowMap = useMemo(
    () => new Map(rowEntries.map((entry) => [entry.id, entry.row])),
    [rowEntries]
  );

  const selectionMode = selection ? selection.mode : "none";
  const selectionControlled = Boolean(
    selection && selection.selectedIds !== undefined
  );
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(
    () => (selection ? uniqueIds(selection.defaultSelectedIds ?? []) : [])
  );
  const selectedIds = useMemo(() => {
    if (!selection || selectionMode === "none") return [];
    const ids = selectionControlled
      ? uniqueIds(selection.selectedIds ?? [])
      : internalSelectedIds;
    return selectionMode === "single" ? ids.slice(0, 1) : ids;
  }, [internalSelectedIds, selection, selectionControlled, selectionMode]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedRowCache = useRef(new Map<string, T>());

  useEffect(() => {
    rowEntries.forEach(({ id, row }) => {
      if (selectedSet.has(id)) selectedRowCache.current.set(id, row);
    });
    Array.from(selectedRowCache.current.keys()).forEach((id) => {
      if (!selectedSet.has(id)) selectedRowCache.current.delete(id);
    });
  }, [rowEntries, selectedSet]);

  const buildSelectionChange = useCallback(
    (ids: string[], source: TDataTableSelectionSource) => {
      const visibleSelectedRows = ids
        .map((id) => rowMap.get(id))
        .filter((row): row is T => Boolean(row));
      const selectedRows = ids
        .map((id) => rowMap.get(id) || selectedRowCache.current.get(id))
        .filter((row): row is T => Boolean(row));
      return { selectedIds: ids, selectedRows, visibleSelectedRows, source };
    },
    [rowMap]
  );

  const updateSelection = useCallback(
    (nextIds: readonly string[], source: TDataTableSelectionSource) => {
      if (!selection || selectionMode === "none") return;
      let normalized = uniqueIds(nextIds).filter((id) => {
        const row = rowMap.get(id);
        return (
          !row || !selection.isRowSelectable || selection.isRowSelectable(row)
        );
      });
      if (selectionMode === "single") normalized = normalized.slice(-1);
      if (!selectionControlled) setInternalSelectedIds(normalized);
      selection.onChange?.(buildSelectionChange(normalized, source));
    },
    [
      buildSelectionChange,
      rowMap,
      selection,
      selectionControlled,
      selectionMode,
    ]
  );

  const clearSelection = useCallback(
    () => updateSelection([], "clear"),
    [updateSelection]
  );

  useEffect(() => {
    if (
      !selection ||
      selection.preserveAcrossPages !== false ||
      selectedIds.length === 0
    ) {
      return;
    }
    const visibleIds = new Set(rowEntries.map((entry) => entry.id));
    const next = selectedIds.filter((id) => visibleIds.has(id));
    if (!arraysEqual(next, selectedIds)) updateSelection(next, "data");
  }, [rowEntries, selectedIds, selection, updateSelection]);

  const selectionQueryKey = useMemo(
    () =>
      JSON.stringify([
        currentSearch,
        Object.entries(currentFilters)
          .filter(([, value]) => Boolean(value))
          .sort(([left], [right]) => left.localeCompare(right)),
      ]),
    [currentFilters, currentSearch]
  );
  const previousSelectionQueryKeyRef = useRef(selectionQueryKey);

  useEffect(() => {
    if (previousSelectionQueryKeyRef.current === selectionQueryKey) return;
    previousSelectionQueryKeyRef.current = selectionQueryKey;

    if (
      selection &&
      selection.preserveAcrossQueries !== true &&
      selectedIds.length > 0
    ) {
      updateSelection([], "query");
    }
  }, [selectedIds.length, selection, selectionQueryKey, updateSelection]);

  const searchedEntries = useMemo(() => {
    if (isSearchProcessed || !currentSearch.trim()) return rowEntries;
    const searchableColumns = columnDefinitions.filter(
      (column) => column.isSearchable
    );
    if (!searchableColumns.length) return rowEntries;
    const query = currentSearch.trim().toLocaleLowerCase();
    return rowEntries.filter(({ row }) =>
      searchableColumns.some((column) =>
        toSearchableText(getColumnValue(row, column))
          .toLocaleLowerCase()
          .includes(query)
      )
    );
  }, [columnDefinitions, currentSearch, isSearchProcessed, rowEntries]);

  const filteredEntries = useMemo(() => {
    if (isFilterProcessed) return searchedEntries;
    const activeFilters = filters.filter((filter) => currentFilters[filter.id]);
    if (!activeFilters.length) return searchedEntries;

    const invalidFilter = activeFilters.find(
      (filter) => !filter.predicate && !filter.accessor
    );
    if (invalidFilter) {
      throw new Error(
        `Client-side DataTable filter "${invalidFilter.id}" requires an accessor or predicate`
      );
    }

    return searchedEntries.filter(({ row }) =>
      activeFilters.every((filter) => {
        const value = currentFilters[filter.id];
        if (!value) return true;
        if (filter.predicate) return filter.predicate(row, value);
        return String(filter.accessor?.(row) ?? "") === value;
      })
    );
  }, [currentFilters, filters, isFilterProcessed, searchedEntries]);

  const sortEntries = useMemo(() => parseSort(currentSort), [currentSort]);
  const sortedEntries = useMemo(() => {
    if (isSortProcessed || !sortEntries.length) return filteredEntries;
    return filteredEntries
      .map((entry, index) => ({ ...entry, originalIndex: index }))
      .sort((left, right) => {
        for (const sortEntry of sortEntries) {
          const column = columnDefinitions.find(
            (item) => (item.sortKey || item.id) === sortEntry.key
          );
          if (!column) continue;
          const leftValue = getColumnValue(left.row, column);
          const rightValue = getColumnValue(right.row, column);
          const result = column.sortComparator
            ? column.sortComparator(leftValue, rightValue, left.row, right.row)
            : compareValues(leftValue, rightValue);
          if (result !== 0) return sortEntry.descending ? -result : result;
        }
        return left.originalIndex - right.originalIndex;
      });
  }, [columnDefinitions, filteredEntries, isSortProcessed, sortEntries]);

  const totalCount = isPaginationProcessed
    ? Math.floor(Number(state?.total))
    : sortedEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / currentLimit));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setPage(totalPages);
  }, [currentPage, setPage, totalPages]);

  const paginatedEntries = useMemo(() => {
    if (isPaginationProcessed) return sortedEntries;
    const startIndex = (safePage - 1) * currentLimit;
    return sortedEntries.slice(startIndex, startIndex + currentLimit);
  }, [currentLimit, isPaginationProcessed, safePage, sortedEntries]);

  const selectablePageIds = useMemo(
    () =>
      paginatedEntries
        .filter(
          ({ row }) =>
            !selection ||
            !selection.isRowSelectable ||
            selection.isRowSelectable(row)
        )
        .map((entry) => entry.id),
    [paginatedEntries, selection]
  );
  const allPageSelected =
    selectablePageIds.length > 0 &&
    selectablePageIds.every((id) => selectedSet.has(id));
  const somePageSelected =
    !allPageSelected && selectablePageIds.some((id) => selectedSet.has(id));

  const handleSelectAllPage = () => {
    if (status === "loading" || !selection || selectionMode !== "multiple") {
      return;
    }
    const next = new Set(selectedIds);
    selectablePageIds.forEach((id) =>
      allPageSelected ? next.delete(id) : next.add(id)
    );
    updateSelection(Array.from(next), "page");
  };

  const handleSelectRow = (entry: TRowEntry<T>) => {
    if (status === "loading" || !selection || selectionMode === "none") return;
    if (selection.isRowSelectable && !selection.isRowSelectable(entry.row))
      return;
    if (selectionMode === "single") {
      updateSelection([entry.id], "row");
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(entry.id)) next.delete(entry.id);
    else next.add(entry.id);
    updateSelection(Array.from(next), "row");
  };

  const handleSort = (
    column: (typeof columnDefinitions)[number],
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    const key = column.sortKey || column.id;
    const existing = sortEntries.find((entry) => entry.key === key);
    const keepExisting = isMultiSort && event.shiftKey;
    let next = keepExisting
      ? sortEntries.filter((entry) => entry.key !== key)
      : [];

    if (!existing) next = [...next, { key, descending: false }];
    else if (!existing.descending) next = [...next, { key, descending: true }];

    setSort(serializeSort(next));
  };

  const activeFilterCount =
    Object.values(currentFilters).filter(Boolean).length;
  const hasActiveControls = Boolean(currentSearch || activeFilterCount);
  const clearControls = () => {
    setSearchInput("");
    setSearch("");
    updateFilters({});
  };

  const selectionChange = buildSelectionChange(selectedIds, "row");
  const hasSelection = Boolean(selection && selectionMode !== "none");
  const showSelectAll = Boolean(
    selection &&
      selectionMode === "multiple" &&
      selection.enableSelectAll !== false
  );
  const columnCount = processedColumns.length + (hasSelection ? 1 : 0);
  const isInitialLoading = status === "loading" && rowEntries.length === 0;
  const hasError = status === "error" || Boolean(error);
  const radioGroupName = useId();

  return (
    <section
      className={cn(
        "border-border bg-card overflow-hidden rounded-3xl border shadow-sm",
        className
      )}
      aria-busy={status === "loading"}
    >
      <div className="border-border flex flex-col gap-4 border-b p-4 sm:p-6">
        {(title || slot) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {title && <h2 className="text-xl font-bold">{title}</h2>}
            {slot && <div className="flex items-center gap-2">{slot}</div>}
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {isViewSearch && (
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search table</span>
              <Search
                aria-hidden="true"
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <input
                type="search"
                value={searchInput}
                placeholder={searchPlaceholder}
                onChange={(event) => setSearchInput(event.target.value)}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 h-10 w-full rounded-xl border py-2 pr-10 pl-10 text-sm transition-colors outline-none focus-visible:ring-2"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                  }}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </label>
          )}

          {isViewFilters &&
            filters.map((filter) => (
              <label key={filter.id} className="min-w-36">
                <span className="sr-only">{filter.label}</span>
                <select
                  aria-label={filter.label}
                  value={currentFilters[filter.id] ?? ""}
                  onChange={(event) =>
                    updateFilters({
                      ...currentFilters,
                      [filter.id]: event.target.value,
                    })
                  }
                  className="border-input bg-background text-foreground focus-visible:border-primary focus-visible:ring-primary/20 h-10 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2"
                >
                  <option value="">
                    {filter.allLabel || `All ${filter.label}`}
                  </option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}

          {hasActiveControls && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearControls}
              className="shrink-0"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset
            </Button>
          )}

          {isViewColumnVisibility && columnDefinitions.length > 1 && (
            <Dropdown side="bottom">
              <DropdownTrigger
                type="button"
                variant="outline"
                size="sm"
                className="h-10 shrink-0"
                aria-label="Choose visible columns"
                aria-haspopup="dialog"
              >
                <Columns3 aria-hidden="true" className="size-4" />
                Columns
              </DropdownTrigger>
              <DropdownContent
                role="dialog"
                aria-label="Choose visible table columns"
                className="top-full right-0 left-auto mt-1 min-w-52 p-2"
              >
                <p className="text-muted-foreground px-2 pb-2 text-xs font-semibold tracking-wider uppercase">
                  Visible columns
                </p>
                <div className="space-y-1">
                  {columnDefinitions.map((column) => {
                    const checked = visibleColumnIds.includes(column.id);
                    const disabled =
                      column.canHide === false ||
                      (checked && visibleColumnIds.length === 1);
                    return (
                      <label
                        key={column.id}
                        className={cn(
                          "hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                          disabled && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleColumn(column.id)}
                          className="accent-primary size-4"
                        />
                        <span>{column.name}</span>
                      </label>
                    );
                  })}
                </div>
              </DropdownContent>
            </Dropdown>
          )}
        </div>

        {status === "loading" && (
          <p
            className={cn(
              "text-muted-foreground text-xs",
              rowEntries.length === 0 && "sr-only"
            )}
            role="status"
            aria-live="polite"
          >
            {rowEntries.length === 0 ? "Loading table…" : "Updating table…"}
          </p>
        )}
        {hasError && rowEntries.length > 0 && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error || "Failed to refresh table data."}</span>
            {onRetry && (
              <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        )}
      </div>

      {hasSelection && selectedIds.length > 0 && (
        <div className="border-primary/20 bg-primary/5 flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
          <span className="text-primary text-sm font-medium" aria-live="polite">
            {selectedIds.length} row{selectedIds.length === 1 ? "" : "s"}{" "}
            selected
          </span>
          {bulkActions && (
            <div className="flex flex-wrap items-center gap-2">
              {bulkActions({
                ...selectionChange,
                source: "row",
                clearSelection,
              })}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="sm:ml-auto"
          >
            Clear selection
          </Button>
        </div>
      )}

      <Table
        className={cn("min-w-[720px]", tableClassName)}
        containerClassName={tableContainerClassName}
      >
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow className="bg-muted/50 text-muted-foreground hover:bg-muted/50 text-[10px] font-bold tracking-widest uppercase">
            {hasSelection && (
              <TableHead className="w-12 px-4" scope="col">
                {showSelectAll && (
                  <IndeterminateCheckbox
                    aria-label="Select all selectable rows on this page"
                    checked={allPageSelected}
                    indeterminate={somePageSelected}
                    disabled={
                      status === "loading" || selectablePageIds.length === 0
                    }
                    onChange={handleSelectAllPage}
                  />
                )}
                {selectionMode === "single" && (
                  <span className="sr-only">Select one row</span>
                )}
              </TableHead>
            )}
            {processedColumns.map((column) => {
              const sortKey = column.sortKey || column.id;
              const sortIndex = sortEntries.findIndex(
                (entry) => entry.key === sortKey
              );
              const activeSort =
                sortIndex >= 0 ? sortEntries[sortIndex] : undefined;
              const direction = activeSort
                ? activeSort.descending
                  ? "desc"
                  : "asc"
                : undefined;
              const nextSortAction = !direction
                ? "Sort ascending"
                : direction === "asc"
                  ? "Sort descending"
                  : "Clear sorting";
              const sortStateLabel = direction
                ? `${column.name}, sorted ${direction === "asc" ? "ascending" : "descending"}${sortIndex > 0 ? `, priority ${sortIndex + 1}` : ""}`
                : column.name;
              return (
                <TableHead
                  key={column.id}
                  scope="col"
                  aria-sort={
                    sortIndex === 0 && direction === "asc"
                      ? "ascending"
                      : sortIndex === 0 && direction === "desc"
                        ? "descending"
                        : undefined
                  }
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    ...column.style,
                  }}
                  className={cn(
                    "px-6 py-4",
                    alignClassNames[column.align || "start"],
                    column.headClassName
                  )}
                >
                  {column.isSortable && isViewSort ? (
                    <button
                      type="button"
                      disabled={status === "loading"}
                      aria-label={`${sortStateLabel}. ${nextSortAction}${isMultiSort ? ". Hold Shift to keep existing sorts" : ""}`}
                      onClick={(event) => handleSort(column, event)}
                      className={cn(
                        "focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm font-bold focus-visible:ring-2 focus-visible:outline-none",
                        column.align === "end" && "ml-auto",
                        column.align === "center" && "mx-auto"
                      )}
                      title={
                        isMultiSort
                          ? "Shift-click to sort multiple columns"
                          : undefined
                      }
                    >
                      {column.head?.({ head: column }) ?? column.name}
                      <SortIcon direction={direction} />
                    </button>
                  ) : (
                    (column.head?.({ head: column }) ?? column.name)
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>

        <TableBody className="divide-border divide-y">
          {isInitialLoading ? (
            Array.from({ length: Math.max(1, skeletonRows) }, (_, rowIndex) => (
              <TableRow
                key={`skeleton-${rowIndex}`}
                aria-hidden="true"
                className="animate-pulse"
              >
                {Array.from(
                  { length: Math.max(1, columnCount) },
                  (_, cellIndex) => (
                    <TableCell
                      key={`skeleton-${rowIndex}-${cellIndex}`}
                      className="px-6 py-5"
                    >
                      <div className="bg-muted h-4 w-full rounded" />
                    </TableCell>
                  )
                )}
              </TableRow>
            ))
          ) : hasError && rowEntries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="px-6 py-16 text-center"
              >
                <div role="alert" className="flex flex-col items-center gap-3">
                  <span className="text-destructive font-medium">
                    {error || "Failed to load data."}
                  </span>
                  {onRetry && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onRetry}
                    >
                      Try again
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : paginatedEntries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="px-6 py-16 text-center"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium">{emptyTitle}</span>
                  <span className="text-muted-foreground text-sm">
                    {emptyDescription}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            paginatedEntries.map((entry, rowIndex) => {
              const isSelected = selectedSet.has(entry.id);
              const isSelectable =
                status !== "loading" &&
                (!selection ||
                  !selection.isRowSelectable ||
                  selection.isRowSelectable(entry.row));
              const visibleIndex =
                (isPaginationProcessed ? currentPage - 1 : safePage - 1) *
                  currentLimit +
                rowIndex;

              return (
                <TableRow
                  key={entry.id}
                  data-state={isSelected ? "selected" : undefined}
                  aria-selected={hasSelection ? isSelected : undefined}
                  className={cn("hover:bg-muted/30", rowClassName?.(entry.row))}
                >
                  {hasSelection && (
                    <TableCell className="w-12 px-4">
                      {selectionMode === "single" ? (
                        <input
                          type="radio"
                          name={radioGroupName}
                          checked={isSelected}
                          disabled={!isSelectable}
                          aria-label={`Select ${(selection && selection.getRowLabel?.(entry.row)) || `row ${visibleIndex + 1}`}`}
                          onChange={() => handleSelectRow(entry)}
                          className="accent-primary focus-visible:ring-ring size-4 cursor-pointer focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      ) : (
                        <IndeterminateCheckbox
                          checked={isSelected}
                          disabled={!isSelectable}
                          aria-label={`Select ${(selection && selection.getRowLabel?.(entry.row)) || `row ${visibleIndex + 1}`}`}
                          onChange={() => handleSelectRow(entry)}
                        />
                      )}
                    </TableCell>
                  )}

                  {processedColumns.map((column) => {
                    const cell = getColumnValue(entry.row, column);
                    return (
                      <TableCell
                        key={column.id}
                        style={{
                          width: column.width,
                          minWidth: column.minWidth,
                          maxWidth: column.maxWidth,
                          ...column.style,
                        }}
                        className={cn(
                          "px-6 py-4",
                          alignClassNames[column.align || "start"],
                          column.cellClassName
                        )}
                      >
                        {column.cell ? (
                          column.cell({
                            cell,
                            row: entry.row,
                            index: visibleIndex,
                          })
                        ) : (
                          <CellContent value={cell} />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {isViewPagination && totalCount > 0 && (
        <Pagination
          total={totalCount}
          limit={currentLimit}
          page={safePage}
          setLimit={setLimit}
          setPage={setPage}
          pageSizeOptions={pageSizeOptions}
          disabled={status === "loading"}
        />
      )}
    </section>
  );
};

export default DataTable;
