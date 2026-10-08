"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import DataTable, {
  type TColumn,
  type TDataTableFilter,
  type TDataTableState,
  type TDataTableStatus,
} from "@/components/ui/data-table";
import { EntityThumbnail } from "@/components/ui/entity-thumbnail";
import {
  StatusBadge,
  type TStatusBadgeTone,
} from "@/components/ui/status-badge";
import {
  deleteVideo,
  deleteVideos,
  getAdminVideos,
} from "@/services/video.service";
import type { TVideo, TVideoStatus } from "@/types/video.type";
import { toYouTubeThumbnailUrl } from "@/lib/content/video-contract";
import { Edit, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const videoStatusTone: Record<TVideoStatus, TStatusBadgeTone> = {
  draft: "neutral",
  pending: "warning",
  published: "success",
  archived: "info",
};

const videoFilters: readonly TDataTableFilter<TVideo>[] = [
  {
    id: "status",
    label: "Status",
    allLabel: "All statuses",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Pending", value: "pending" },
      { label: "Published", value: "published" },
      { label: "Archived", value: "archived" },
    ],
  },
  {
    id: "aspect_ratio",
    label: "Shape",
    allLabel: "All shapes",
    options: [
      { label: "Landscape", value: "landscape" },
      { label: "Reel", value: "reel" },
    ],
  },
  {
    id: "source_type",
    label: "Source",
    allLabel: "All sources",
    options: [
      { label: "YouTube", value: "youtube" },
      { label: "Uploaded file", value: "upload" },
    ],
  },
  {
    id: "is_featured",
    label: "Featured",
    allLabel: "All videos",
    options: [
      { label: "Featured", value: "true" },
      { label: "Not featured", value: "false" },
    ],
  },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value?: string) => {
  if (!value) return "Not published";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : dateFormatter.format(date);
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const AdminVideosPage = () => {
  const [videos, setItems] = useState<TVideo[]>([]);
  const [tableStatus, setTableStatus] = useState<TDataTableStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("-published_at");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    const loadItems = async () => {
      setTableStatus("loading");
      setError(null);

      try {
        const response = await getAdminVideos(
          {
            page,
            limit,
            search: search.trim() || undefined,
            sort: sort || undefined,
            status: filters.status || undefined,
            aspect_ratio: filters.aspect_ratio || undefined,
            source_type: filters.source_type || undefined,
            is_featured: filters.is_featured || undefined,
          },
          { signal: controller.signal }
        );

        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load videos");
        }

        setItems(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setTableStatus("success");
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, "Failed to load videos"));
        setTableStatus("error");
      }
    };

    void loadItems();
    return () => controller.abort();
  }, [
    filters.aspect_ratio,
    filters.is_featured,
    filters.source_type,
    filters.status,
    limit,
    page,
    refreshKey,
    search,
    sort,
  ]);

  const isDeleting = deletingIds.length > 0;
  const isTableBusy = tableStatus === "loading" || isDeleting;

  const handleDelete = useCallback(
    async (ids: readonly string[]) => {
      const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
      if (!uniqueIds.length || isDeleting) return;

      const message =
        uniqueIds.length === 1
          ? "Delete this video? It will be moved to the deleted records."
          : `Delete ${uniqueIds.length} selected videos? They will be moved to the deleted records.`;

      if (!window.confirm(message)) return;

      setDeletingIds(uniqueIds);
      setError(null);

      try {
        if (uniqueIds.length === 1) await deleteVideo(uniqueIds[0]);
        else await deleteVideos(uniqueIds);

        const deletedIdSet = new Set(uniqueIds);
        setSelectedIds((current) =>
          current.filter((id) => !deletedIdSet.has(id))
        );
        refresh();
      } catch (deleteError) {
        setError(getErrorMessage(deleteError, "Failed to delete videos"));
      } finally {
        setDeletingIds([]);
      }
    },
    [isDeleting, refresh]
  );

  const columns = useMemo<readonly TColumn<TVideo>[]>(
    () => [
      {
        id: "video",
        name: "Video",
        accessor: (video) => video.name,
        sortKey: "name",
        isSortable: true,
        isSearchable: true,
        canHide: false,
        minWidth: "280px",
        cell: ({ row: video }) => (
          <div className="flex items-center gap-4">
            <EntityThumbnail
              src={
                video.thumbnail?.url ??
                (video.youtube_id
                  ? toYouTubeThumbnailUrl(video.youtube_id)
                  : undefined)
              }
              alt={video.name}
            />
            <div className="min-w-0">
              <p className="max-w-72 truncate text-sm font-bold">
                {video.name}
              </p>
              <p className="text-muted-foreground max-w-72 truncate text-xs">
                {video.description || "No description provided"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "shape",
        name: "Shape",
        accessor: (video) => video.aspect_ratio,
        minWidth: "120px",
        cell: ({ row: video }) => (
          <StatusBadge tone={video.aspect_ratio === "reel" ? "primary" : "info"}>
            {video.aspect_ratio === "reel" ? "Reel" : "Landscape"}
          </StatusBadge>
        ),
      },
      {
        id: "source",
        name: "Source",
        accessor: (video) => video.source_type,
        minWidth: "120px",
        cell: ({ row: video }) => (
          <span className="text-xs font-medium">
            {video.source_type === "youtube" ? "YouTube" : "Uploaded file"}
          </span>
        ),
      },
      {
        id: "category",
        name: "Category",
        accessor: (video) => video.category?.name,
        minWidth: "150px",
        cell: ({ row: video }) => (
          <span className="text-xs font-medium">
            {video.category?.name || "Uncategorized"}
          </span>
        ),
      },
      {
        field: "status",
        name: "Status",
        isSortable: true,
        minWidth: "120px",
        cell: ({ row: video }) => (
          <StatusBadge tone={videoStatusTone[video.status]}>
            {video.status}
          </StatusBadge>
        ),
      },
      {
        field: "published_at",
        name: "Published",
        isSortable: true,
        minWidth: "145px",
        cell: ({ row: video }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(video.published_at)}
          </span>
        ),
      },
      {
        field: "is_featured",
        name: "Featured",
        defaultVisible: false,
        minWidth: "105px",
        cell: ({ row: video }) => (
          <StatusBadge tone={video.is_featured ? "primary" : "neutral"}>
            {video.is_featured ? "Yes" : "No"}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "112px",
        cell: ({ row: video }) => (
          <div className="flex justify-end gap-1">
            <Link
              href={`/admin/videos/edit/${video._id}`}
              aria-label={`Edit ${video.name}`}
              title={`Edit ${video.name}`}
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                shape: "icon",
              })}
            >
              <Edit aria-hidden="true" className="size-4" />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              shape="icon"
              disabled={isTableBusy}
              isLoading={deletingIds.includes(video._id)}
              aria-label={`Delete ${video.name}`}
              title={`Delete ${video.name}`}
              onClick={() => void handleDelete([video._id])}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [deletingIds, handleDelete, isTableBusy]
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
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Videos Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Add landscape videos and reels from YouTube or an uploaded file.
          </p>
        </div>
        <Link
          href="/admin/videos/new"
          className={buttonVariants({
            className:
              "text-[10px] font-bold tracking-widest uppercase md:text-sm",
          })}
        >
          <Plus aria-hidden="true" className="size-4" />
          Create New Video
        </Link>
      </div>

      <DataTable
        data={videos}
        columns={columns}
        filters={videoFilters}
        getRowId={(video) => video._id}
        state={tableState}
        status={tableStatus}
        error={error}
        onRetry={refresh}
        config={{
          isSearchProcessed: true,
          isSortProcessed: true,
          isFilterProcessed: true,
          isPaginationProcessed: true,
          isMultiSort: true,
          pageSizeOptions: [10, 20, 50],
        }}
        selection={{
          mode: "multiple",
          selectedIds,
          onChange: ({ selectedIds: nextSelectedIds }) =>
            setSelectedIds(nextSelectedIds),
          isRowSelectable: () => !isTableBusy,
          preserveAcrossPages: true,
          preserveAcrossQueries: false,
          getRowLabel: (video) => video.name,
        }}
        bulkActions={({ selectedIds: ids }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isTableBusy}
            isLoading={isDeleting}
            onClick={() => void handleDelete(ids)}
            className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete selected
          </Button>
        )}
        caption="Videos Management table"
        searchPlaceholder="Search videos by title, description or keyword…"
        emptyTitle="No videos found"
        emptyDescription="Create a video or adjust the current search and filters."
      />
    </div>
  );
};

export default AdminVideosPage;
