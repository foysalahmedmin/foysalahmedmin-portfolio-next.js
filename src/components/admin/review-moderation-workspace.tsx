"use client";

import { ErrorState, Skeleton } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import DataTable, {
  type TColumn,
  type TDataTableFilter,
  type TDataTableState,
  type TDataTableStatus,
} from "@/components/ui/data-table";
import {
  Drawer,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  StatusBadge,
  type TStatusBadgeTone,
} from "@/components/ui/status-badge";
import { ApiRequestError } from "@/services/api-response";
import {
  getAdminReviewDetail,
  getAdminReviews,
  REVIEW_MODERATION_STATUSES,
  REVIEW_TARGET_MODELS,
  updateAdminReviewStatus,
  type ReviewModerationItem,
  type ReviewModerationStatus,
  type ReviewTargetModel,
} from "@/services/review-admin.service";
import { Eye, RefreshCw, ShieldCheck, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const statusTone: Record<ReviewModerationStatus, TStatusBadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const labelFor = (value: string) =>
  `${value.charAt(0).toUpperCase()}${value.slice(1).replaceAll("_", " ")}`;

const formatDateTime = (value: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiRequestError && error.status === 409) {
    return "This review changed in another session. Reload it before moderating again.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
};

const moderationFilters: readonly TDataTableFilter<ReviewModerationItem>[] = [
  {
    id: "status",
    label: "Moderation status",
    allLabel: "All moderation statuses",
    options: REVIEW_MODERATION_STATUSES.map((status) => ({
      value: status,
      label: labelFor(status),
    })),
  },
  {
    id: "target_model",
    label: "Target type",
    allLabel: "All target types",
    options: REVIEW_TARGET_MODELS.map((target) => ({
      value: target,
      label: target,
    })),
  },
  {
    id: "rating",
    label: "Rating",
    allLabel: "All ratings",
    options: [5, 4, 3, 2, 1].map((rating) => ({
      value: String(rating),
      label: `${rating} star${rating === 1 ? "" : "s"}`,
    })),
  },
];

const ReviewModerationWorkspace = () => {
  const [reviews, setReviews] = useState<ReviewModerationItem[]>([]);
  const [tableStatus, setTableStatus] = useState<TDataTableStatus>("loading");
  const [tableError, setTableError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [refreshVersion, setRefreshVersion] = useState(0);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewModerationItem | null>(null);
  const [detailStatus, setDetailStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<ReviewModerationStatus | null>(
    null
  );
  const [isModerating, setIsModerating] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const moderationRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(
    () => setRefreshVersion((current) => current + 1),
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setTableStatus("loading");
      setTableError(null);
      try {
        const rating = Number(filters.rating);
        const response = await getAdminReviews(
          {
            page,
            limit,
            search: search.trim() || undefined,
            sort: sort as "created_at" | "-created_at" | "rating" | "-rating",
            status: filters.status as ReviewModerationStatus | undefined,
            target_model: filters.target_model as ReviewTargetModel | undefined,
            rating: Number.isInteger(rating) && rating > 0 ? rating : undefined,
          },
          { signal: controller.signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(
            response.message || "The moderation response was invalid."
          );
        }
        setReviews(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setTableStatus("success");
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        setTableError(
          errorMessage(error, "The review moderation queue could not load.")
        );
        setTableStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, [
    filters.rating,
    filters.status,
    filters.target_model,
    limit,
    page,
    refreshVersion,
    search,
    sort,
  ]);

  const loadDetail = useCallback(async (id: string) => {
    detailRequest.current?.abort();
    moderationRequest.current?.abort();
    moderationRequest.current = null;
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelectedId(id);
    setDetail(null);
    setDetailStatus("loading");
    setDetailError(null);
    setModerationError(null);
    setModerationNotice(null);
    setNextStatus(null);
    try {
      const response = await getAdminReviewDetail(id, {
        signal: controller.signal,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || "The review detail was invalid.");
      }
      if (detailRequest.current !== controller) return;
      setDetail(response.data);
      setNextStatus(response.data.status);
      setDetailStatus("ready");
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return;
      setDetailError(errorMessage(error, "The review detail could not load."));
      setDetailStatus("error");
    }
  }, []);

  useEffect(
    () => () => {
      detailRequest.current?.abort();
      moderationRequest.current?.abort();
    },
    []
  );

  const openDetail = useCallback(
    (id: string) => {
      setIsDetailOpen(true);
      void loadDetail(id);
    },
    [loadDetail]
  );

  const handleDetailOpenChange = useCallback((open: boolean) => {
    setIsDetailOpen(open);
    if (open) return;
    detailRequest.current?.abort();
    detailRequest.current = null;
    moderationRequest.current?.abort();
    moderationRequest.current = null;
    setSelectedId(null);
    setDetail(null);
    setDetailStatus("idle");
    setDetailError(null);
    setNextStatus(null);
    setModerationError(null);
    setModerationNotice(null);
    setIsModerating(false);
  }, []);

  const moderate = useCallback(async () => {
    if (!detail || !nextStatus || nextStatus === detail.status) return;
    moderationRequest.current?.abort();
    const controller = new AbortController();
    moderationRequest.current = controller;
    setIsModerating(true);
    setModerationError(null);
    setModerationNotice(null);
    try {
      const response = await updateAdminReviewStatus(detail.id, nextStatus, {
        signal: controller.signal,
      });
      if (
        moderationRequest.current !== controller ||
        controller.signal.aborted
      ) {
        return;
      }
      if (!response.success || !response.data) {
        throw new Error(
          response.message || "The moderation result was invalid."
        );
      }
      const updated = response.data;
      setDetail(updated);
      setNextStatus(updated.status);
      setModerationNotice(`Review moved to ${labelFor(updated.status)}.`);
      setReviews((current) =>
        current.map((review) => (review.id === updated.id ? updated : review))
      );
    } catch (error) {
      if (
        controller.signal.aborted ||
        moderationRequest.current !== controller ||
        isAbortError(error)
      ) {
        return;
      }
      setModerationError(
        errorMessage(error, "The review status could not update.")
      );
    } finally {
      if (moderationRequest.current === controller) {
        moderationRequest.current = null;
        setIsModerating(false);
      }
    }
  }, [detail, nextStatus]);

  const columns = useMemo<readonly TColumn<ReviewModerationItem>[]>(
    () => [
      {
        id: "author",
        name: "Author",
        accessor: (review) => review.author?.name,
        canHide: false,
        minWidth: "180px",
        cell: ({ row: review }) => (
          <span className="text-sm font-semibold">
            {review.author?.name ?? "Unavailable author"}
          </span>
        ),
      },
      {
        field: "review",
        name: "Review",
        minWidth: "300px",
        cell: ({ row: review }) => (
          <p className="line-clamp-2 text-sm leading-relaxed">
            {review.review}
          </p>
        ),
      },
      {
        id: "target",
        name: "Target",
        accessor: (review) => review.target?.name,
        minWidth: "190px",
        cell: ({ row: review }) => (
          <div>
            <p className="truncate text-sm font-semibold">
              {review.target?.name ?? "Unavailable target"}
            </p>
            <p className="text-muted-foreground text-xs">
              {review.target_model}
            </p>
          </div>
        ),
      },
      {
        field: "rating",
        name: "Rating",
        isSortable: true,
        minWidth: "105px",
        cell: ({ row: review }) => (
          <span
            className="inline-flex items-center gap-1 text-sm font-bold"
            aria-label={`${review.rating} out of 5 stars`}
          >
            <Star
              className="text-warning size-4 fill-current"
              aria-hidden="true"
            />
            {review.rating}/5
          </span>
        ),
      },
      {
        field: "status",
        name: "Status",
        minWidth: "125px",
        cell: ({ row: review }) => (
          <StatusBadge tone={statusTone[review.status]}>
            {labelFor(review.status)}
          </StatusBadge>
        ),
      },
      {
        field: "created_at",
        name: "Submitted",
        isSortable: true,
        minWidth: "170px",
        defaultVisible: false,
        cell: ({ row: review }) => (
          <time
            className="text-muted-foreground text-sm"
            dateTime={review.created_at ?? undefined}
          >
            {formatDateTime(review.created_at)}
          </time>
        ),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "110px",
        cell: ({ row: review }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Review moderation detail from ${review.author?.name ?? "unknown author"}`}
            onClick={() => openDetail(review.id)}
          >
            <Eye className="size-4" aria-hidden="true" />
            Review
          </Button>
        ),
      },
    ],
    [openDetail]
  );

  const tableState = useMemo<TDataTableState>(
    () => ({
      search,
      sort,
      page,
      limit,
      total,
      filters,
      setSearch,
      setSort,
      setPage,
      setLimit,
      setFilters,
    }),
    [filters, limit, page, search, sort, total]
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="type-label text-primary">Trust operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Review moderation
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Review portfolio feedback, verify its target, and publish only
            appropriate submissions.
          </p>
        </div>
        <div className="border-border bg-background flex max-w-md items-start gap-3 rounded-xl border p-4 text-sm">
          <ShieldCheck
            className="text-primary mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            Author email, role, account metadata, and private media are removed
            at the client boundary.
          </p>
        </div>
      </header>

      <DataTable
        data={reviews}
        columns={columns}
        filters={moderationFilters}
        getRowId={(review) => review.id}
        state={tableState}
        status={tableStatus}
        error={tableError}
        onRetry={refresh}
        selection={false}
        config={{
          isSearchProcessed: true,
          isSortProcessed: true,
          isFilterProcessed: true,
          isPaginationProcessed: true,
          pageSizeOptions: [25, 50, 100],
          skeletonRows: 6,
        }}
        caption="Review moderation queue"
        searchPlaceholder="Search review text…"
        emptyTitle="No reviews found"
        emptyDescription="The moderation queue is empty or no reviews match the current filters."
        rowClassName={(review) =>
          review.status === "pending" ? "bg-warning/[0.035]" : undefined
        }
      />

      <Drawer
        isOpen={isDetailOpen}
        setIsOpen={handleDetailOpenChange}
        asPortal
        side="end"
        size="xl"
      >
        <DrawerBackdrop>
          <DrawerContent side="end" size="xl" className="flex flex-col">
            <DrawerHeader>
              <div className="min-w-0 pr-4">
                <p className="type-label text-primary">Moderation detail</p>
                <DrawerTitle className="mt-1 truncate">
                  {detail?.target?.name ?? "Review detail"}
                </DrawerTitle>
              </div>
              <DrawerCloseTrigger
                aria-label="Close review detail"
                data-initial-focus
              />
            </DrawerHeader>

            <DrawerBody className="flex-1">
              {detailStatus === "loading" ? (
                <div role="status" aria-label="Loading review detail">
                  <span className="sr-only">Loading review detail…</span>
                  <div className="grid gap-4" aria-hidden="true">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-44" />
                    <Skeleton className="h-32" />
                  </div>
                </div>
              ) : detailStatus === "error" && selectedId ? (
                <ErrorState
                  title="Review detail could not be loaded"
                  description={detailError ?? undefined}
                  onRetry={() => void loadDetail(selectedId)}
                />
              ) : detail ? (
                <div className="space-y-7">
                  <section
                    className="border-border bg-surface-subtle rounded-xl border p-5"
                    aria-labelledby="review-context-heading"
                  >
                    <h3 id="review-context-heading" className="font-bold">
                      Review context
                    </h3>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="type-label text-muted-foreground">
                          Author
                        </dt>
                        <dd className="mt-1 text-sm font-semibold break-words">
                          {detail.author?.name ?? "Unavailable author"}
                        </dd>
                      </div>
                      <div>
                        <dt className="type-label text-muted-foreground">
                          Target
                        </dt>
                        <dd className="mt-1 text-sm font-semibold break-words">
                          {detail.target?.name ?? "Unavailable target"}
                          <span className="text-muted-foreground ml-1 font-normal">
                            ({detail.target_model})
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="type-label text-muted-foreground">
                          Rating
                        </dt>
                        <dd className="mt-1 text-sm font-semibold">
                          {detail.rating} out of 5 stars
                        </dd>
                      </div>
                      <div>
                        <dt className="type-label text-muted-foreground">
                          Submitted
                        </dt>
                        <dd className="mt-1 text-sm">
                          {formatDateTime(detail.created_at)}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section aria-labelledby="review-content-heading">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 id="review-content-heading" className="font-bold">
                        Submitted review
                      </h3>
                      {detail.is_edited ? (
                        <span className="text-muted-foreground text-xs">
                          Edited {formatDateTime(detail.edited_at)}
                        </span>
                      ) : null}
                    </div>
                    <p className="border-border bg-background mt-3 rounded-xl border p-5 text-sm leading-7 break-words whitespace-pre-wrap">
                      {detail.review}
                    </p>
                  </section>

                  <section
                    className="border-border rounded-xl border p-5"
                    aria-labelledby="review-moderation-heading"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3
                          id="review-moderation-heading"
                          className="font-bold"
                        >
                          Moderation status
                        </h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Approve, reject, or return this review to pending.
                        </p>
                      </div>
                      <StatusBadge tone={statusTone[detail.status]}>
                        {labelFor(detail.status)}
                      </StatusBadge>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label
                        htmlFor="review-next-status"
                        className="grid flex-1 gap-2"
                      >
                        <span className="type-label text-muted-foreground">
                          Change status
                        </span>
                        <select
                          id="review-next-status"
                          value={nextStatus ?? detail.status}
                          disabled={isModerating}
                          onChange={(event) =>
                            setNextStatus(
                              event.target.value as ReviewModerationStatus
                            )
                          }
                          className="border-border bg-background focus-visible:ring-ring h-11 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-60"
                        >
                          {REVIEW_MODERATION_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {labelFor(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        onClick={() => void moderate()}
                        disabled={!nextStatus || nextStatus === detail.status}
                        isLoading={isModerating}
                      >
                        Update status
                      </Button>
                    </div>

                    {moderationNotice ? (
                      <p
                        className="text-success mt-4 text-sm font-semibold"
                        role="status"
                      >
                        {moderationNotice}
                      </p>
                    ) : null}
                    {moderationError ? (
                      <div
                        role="alert"
                        className="border-destructive/30 bg-destructive/5 text-destructive mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                      >
                        <span>{moderationError}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void loadDetail(detail.id)}
                        >
                          <RefreshCw className="size-4" aria-hidden="true" />
                          Reload detail
                        </Button>
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : null}
            </DrawerBody>

            <DrawerFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDetailOpenChange(false)}
              >
                Close
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </DrawerBackdrop>
      </Drawer>
    </div>
  );
};

export default ReviewModerationWorkspace;
