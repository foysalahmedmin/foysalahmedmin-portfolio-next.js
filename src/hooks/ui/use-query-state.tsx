import { useEffect, useState } from "react";

export type TQuery = {
  sort?: string;
  page?: number;
  limit?: number;
};

export type TQueryState = {
  query: TQuery;
  onSortChange: (sort?: string) => void;
  onPageChange: (page?: number) => void;
  onLimitChange: (limit?: number) => void;
  onStateChange: (query: Partial<TQuery>) => void;
};

export const useQueryState = (
  initialQuery?: Partial<TQuery>,
  setQueryProp?: (query: Partial<TQuery>) => void,
): TQueryState => {
  const [query, setQuery] = useState<TQuery>({
    sort: initialQuery?.sort ?? "",
    page: initialQuery?.page ?? 1,
    limit: initialQuery?.limit ?? 10,
  });

  const onSortChange = (sort?: string) => {
    setQuery((prev) => {
      const newQuery = { ...prev, sort };
      setQueryProp?.(newQuery);
      return newQuery;
    });
  };

  const onPageChange = (page?: number) => {
    setQuery((prev) => {
      const newQuery = { ...prev, page };
      setQueryProp?.(newQuery);
      return newQuery;
    });
  };

  const onLimitChange = (limit?: number) => {
    setQuery((prev) => {
      const newQuery = { ...prev, limit };
      setQueryProp?.(newQuery);
      return newQuery;
    });
  };

  const onStateChange = (newQuery: Partial<TQuery>) => {
    setQuery((prev) => {
      const updatedQuery = { ...prev, ...newQuery };
      setQueryProp?.(updatedQuery);
      return updatedQuery;
    });
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery((prev) => ({ ...prev, ...initialQuery }));
    }
  }, [initialQuery]);

  return {
    query,
    onSortChange,
    onPageChange,
    onLimitChange,
    onStateChange,
  };
};
