"use client";

import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "./button";

type TPaginationItem = number | "ellipsis-start" | "ellipsis-end";

export type TPaginationProps = {
  page: number;
  limit: number;
  total: number;
  setPage: (page: number) => void;
  setLimit?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
  siblingCount?: number;
  disabled?: boolean;
  showPageSize?: boolean;
  showSummary?: boolean;
  className?: string;
};

const createRange = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(0, end - start + 1) }, (_, index) =>
    Math.max(1, start + index)
  );

const createPaginationItems = (
  currentPage: number,
  totalPages: number,
  siblingCount: number
): TPaginationItem[] => {
  const visiblePageCount = siblingCount * 2 + 5;
  if (totalPages <= visiblePageCount) return createRange(1, totalPages);

  const leftSibling = Math.max(2, currentPage - siblingCount);
  const rightSibling = Math.min(totalPages - 1, currentPage + siblingCount);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  return [
    1,
    ...(showLeftEllipsis
      ? (["ellipsis-start"] as const)
      : createRange(2, leftSibling - 1)),
    ...createRange(leftSibling, rightSibling),
    ...(showRightEllipsis
      ? (["ellipsis-end"] as const)
      : createRange(rightSibling + 1, totalPages - 1)),
    totalPages,
  ];
};

export const Pagination = ({
  page,
  limit,
  total,
  setPage,
  setLimit,
  pageSizeOptions = [10, 20, 50, 100],
  siblingCount = 1,
  disabled = false,
  showPageSize = true,
  showSummary = true,
  className,
}: TPaginationProps) => {
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const safeSiblingCount =
    Number.isFinite(siblingCount) && siblingCount > 0
      ? Math.floor(siblingCount)
      : 0;
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));
  const requestedPage =
    Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const currentPage = Math.min(requestedPage, totalPages);
  const firstRow = safeTotal === 0 ? 0 : (currentPage - 1) * safeLimit + 1;
  const lastRow = Math.min(currentPage * safeLimit, safeTotal);

  const normalizedPageSizeOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...pageSizeOptions
            .filter((option) => Number.isFinite(option) && option > 0)
            .map((option) => Math.floor(option)),
          safeLimit,
        ])
      ).sort((left, right) => left - right),
    [pageSizeOptions, safeLimit]
  );

  const items = useMemo(
    () => createPaginationItems(currentPage, totalPages, safeSiblingCount),
    [currentPage, safeSiblingCount, totalPages]
  );

  if (safeTotal <= 0) return null;

  const goToPage = (nextPage: number) => {
    if (disabled) return;
    const normalizedPage =
      Number.isFinite(nextPage) && nextPage > 0 ? Math.floor(nextPage) : 1;
    setPage(Math.min(normalizedPage, totalPages));
  };

  return (
    <nav
      aria-label="Table pagination"
      className={cn(
        "border-border flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
        {showSummary && (
          <span aria-live="polite">
            Showing {firstRow}–{lastRow} of {safeTotal}
          </span>
        )}

        {showPageSize && setLimit && (
          <label className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              aria-label="Rows per page"
              value={safeLimit}
              disabled={disabled}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="border-input bg-background text-foreground focus-visible:ring-ring h-8 rounded-md border px-2 text-xs outline-none focus-visible:ring-2"
            >
              {normalizedPageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="icon"
          aria-label="Go to first page"
          title="First page"
          disabled={disabled || currentPage <= 1}
          onClick={() => goToPage(1)}
        >
          <ChevronsLeft aria-hidden="true" className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="icon"
          aria-label="Go to previous page"
          title="Previous page"
          disabled={disabled || currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>

        <div className="hidden items-center gap-1 sm:flex">
          {items.map((item) =>
            typeof item === "number" ? (
              <Button
                key={item}
                type="button"
                variant={item === currentPage ? "default" : "ghost"}
                size="sm"
                shape="icon"
                aria-label={`Go to page ${item}`}
                aria-current={item === currentPage ? "page" : undefined}
                disabled={disabled}
                onClick={() => goToPage(item)}
              >
                {item}
              </Button>
            ) : (
              <span
                key={item}
                aria-hidden="true"
                className="text-muted-foreground inline-flex size-8 items-center justify-center"
              >
                …
              </span>
            )
          )}
        </div>

        <span className="text-muted-foreground min-w-24 text-center text-xs sm:hidden">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="icon"
          aria-label="Go to next page"
          title="Next page"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="icon"
          aria-label="Go to last page"
          title="Last page"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => goToPage(totalPages)}
        >
          <ChevronsRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
};
