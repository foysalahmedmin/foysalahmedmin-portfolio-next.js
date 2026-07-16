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
  deleteArticle,
  deleteArticles,
  getAdminArticles,
} from "@/services/article.service";
import type { TArticle, TArticleStatus } from "@/types/article.type";
import { Edit, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const articleStatusTone: Record<TArticleStatus, TStatusBadgeTone> = {
  draft: "neutral",
  pending: "warning",
  published: "success",
  archived: "info",
};

const articleFilters: readonly TDataTableFilter<TArticle>[] = [
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
    id: "is_featured",
    label: "Featured",
    allLabel: "All articles",
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

const AdminArticlesPage = () => {
  const [articles, setArticles] = useState<TArticle[]>([]);
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

    const loadArticles = async () => {
      setTableStatus("loading");
      setError(null);

      try {
        const response = await getAdminArticles(
          {
            page,
            limit,
            search: search.trim() || undefined,
            sort: sort || undefined,
            status: filters.status || undefined,
            is_featured: filters.is_featured || undefined,
          },
          { signal: controller.signal }
        );

        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load articles");
        }

        setArticles(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setTableStatus("success");
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, "Failed to load articles"));
        setTableStatus("error");
      }
    };

    void loadArticles();
    return () => controller.abort();
  }, [
    filters.is_featured,
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
          ? "Delete this article? It will be moved to the deleted records."
          : `Delete ${uniqueIds.length} selected articles? They will be moved to the deleted records.`;

      if (!window.confirm(message)) return;

      setDeletingIds(uniqueIds);
      setError(null);

      try {
        if (uniqueIds.length === 1) await deleteArticle(uniqueIds[0]);
        else await deleteArticles(uniqueIds);

        const deletedIdSet = new Set(uniqueIds);
        setSelectedIds((current) =>
          current.filter((id) => !deletedIdSet.has(id))
        );
        refresh();
      } catch (deleteError) {
        setError(getErrorMessage(deleteError, "Failed to delete articles"));
      } finally {
        setDeletingIds([]);
      }
    },
    [isDeleting, refresh]
  );

  const columns = useMemo<readonly TColumn<TArticle>[]>(
    () => [
      {
        id: "article",
        name: "Article",
        accessor: (article) => article.name,
        sortKey: "name",
        isSortable: true,
        isSearchable: true,
        canHide: false,
        minWidth: "280px",
        cell: ({ row: article }) => (
          <div className="flex items-center gap-4">
            <EntityThumbnail src={article.thumbnail?.url} alt={article.name} />
            <div className="min-w-0">
              <p className="max-w-72 truncate text-sm font-bold">
                {article.name}
              </p>
              <p className="text-muted-foreground max-w-72 truncate text-xs">
                {article.description || "No summary provided"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "category",
        name: "Category",
        accessor: (article) => article.category?.name,
        minWidth: "150px",
        cell: ({ row: article }) => (
          <span className="text-xs font-medium">
            {article.category?.name || "Uncategorized"}
          </span>
        ),
      },
      {
        field: "status",
        name: "Status",
        isSortable: true,
        minWidth: "120px",
        cell: ({ row: article }) => (
          <StatusBadge tone={articleStatusTone[article.status]}>
            {article.status}
          </StatusBadge>
        ),
      },
      {
        field: "published_at",
        name: "Published",
        isSortable: true,
        minWidth: "145px",
        cell: ({ row: article }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(article.published_at)}
          </span>
        ),
      },
      {
        field: "is_featured",
        name: "Featured",
        defaultVisible: false,
        minWidth: "105px",
        cell: ({ row: article }) => (
          <StatusBadge tone={article.is_featured ? "primary" : "neutral"}>
            {article.is_featured ? "Yes" : "No"}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "112px",
        cell: ({ row: article }) => (
          <div className="flex justify-end gap-1">
            <Link
              href={`/admin/articles/edit/${article._id}`}
              aria-label={`Edit ${article.name}`}
              title={`Edit ${article.name}`}
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
              isLoading={deletingIds.includes(article._id)}
              aria-label={`Delete ${article.name}`}
              title={`Delete ${article.name}`}
              onClick={() => void handleDelete([article._id])}
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
            Articles Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Write and publish technical articles and tutorials.
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className={buttonVariants({
            className:
              "text-[10px] font-bold tracking-widest uppercase md:text-sm",
          })}
        >
          <Plus aria-hidden="true" className="size-4" />
          Create New Article
        </Link>
      </div>

      <DataTable
        data={articles}
        columns={columns}
        filters={articleFilters}
        getRowId={(article) => article._id}
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
          getRowLabel: (article) => article.name,
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
        caption="Articles management table"
        searchPlaceholder="Search articles by name or description…"
        emptyTitle="No articles found"
        emptyDescription="Create an article or adjust the current search and filters."
      />
    </div>
  );
};

export default AdminArticlesPage;
