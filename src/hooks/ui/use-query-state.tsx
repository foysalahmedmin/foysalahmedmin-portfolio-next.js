import { useCallback, useEffect, useRef, useState } from "react";

export type TQuery = {
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export type TQueryState = {
  query: TQuery;
  onSearchChange: (search?: string) => void;
  onSortChange: (sort?: string) => void;
  onPageChange: (page?: number) => void;
  onLimitChange: (limit?: number) => void;
  onStateChange: (query: Partial<TQuery>) => void;
};

export const useQueryState = (
  initialQuery?: Partial<TQuery>,
  setQueryProp?: (query: Partial<TQuery>) => void
): TQueryState => {
  const hasInitialQuery = initialQuery !== undefined;
  const initialSearch = initialQuery?.search;
  const initialSort = initialQuery?.sort;
  const initialPage = initialQuery?.page;
  const initialLimit = initialQuery?.limit;
  const [query, setQuery] = useState<TQuery>({
    search: initialSearch ?? "",
    sort: initialSort ?? "",
    page: initialPage ?? 1,
    limit: initialLimit ?? 10,
  });
  const isInitialRender = useRef(true);
  const setQueryPropRef = useRef(setQueryProp);

  useEffect(() => {
    setQueryPropRef.current = setQueryProp;
  }, [setQueryProp]);

  const onStateChange = useCallback((newQuery: Partial<TQuery>) => {
    setQuery((previous) => ({ ...previous, ...newQuery }));
  }, []);

  const onSearchChange = useCallback(
    (search?: string) => onStateChange({ search, page: 1 }),
    [onStateChange]
  );

  const onSortChange = useCallback(
    (sort?: string) => onStateChange({ sort, page: 1 }),
    [onStateChange]
  );

  const onPageChange = useCallback(
    (page?: number) => onStateChange({ page }),
    [onStateChange]
  );

  const onLimitChange = useCallback(
    (limit?: number) => onStateChange({ limit, page: 1 }),
    [onStateChange]
  );

  useEffect(() => {
    if (!hasInitialQuery) return;

    setQuery((previous) => {
      const next = {
        ...previous,
        ...(initialSearch !== undefined && {
          search: initialSearch,
        }),
        ...(initialSort !== undefined && { sort: initialSort }),
        ...(initialPage !== undefined && { page: initialPage }),
        ...(initialLimit !== undefined && { limit: initialLimit }),
      };

      return previous.search === next.search &&
        previous.sort === next.sort &&
        previous.page === next.page &&
        previous.limit === next.limit
        ? previous
        : next;
    });
  }, [hasInitialQuery, initialLimit, initialPage, initialSearch, initialSort]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    setQueryPropRef.current?.(query);
  }, [query]);

  return {
    query,
    onSearchChange,
    onSortChange,
    onPageChange,
    onLimitChange,
    onStateChange,
  };
};
