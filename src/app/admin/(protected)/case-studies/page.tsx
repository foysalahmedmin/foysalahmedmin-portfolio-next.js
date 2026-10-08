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
  deleteCaseStudy,
  deleteCaseStudies,
  getAdminCaseStudies,
} from "@/services/case-study.service";
import type { TCaseStudy, TCaseStudyStatus } from "@/types/case-study.type";
import { PILLAR_CONTRACT, getPillarLabel } from "@/lib/content/pillars";
import { Edit, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const caseStudyStatusTone: Record<TCaseStudyStatus, TStatusBadgeTone> = {
  draft: "neutral",
  pending: "warning",
  published: "success",
  archived: "info",
};

const caseStudyFilters: readonly TDataTableFilter<TCaseStudy>[] = [
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
    id: "primary_pillar",
    label: "Role",
    allLabel: "All roles",
    options: PILLAR_CONTRACT.map((pillar) => ({
      label: pillar.label,
      value: pillar.key,
    })),
  },
  {
    id: "is_featured",
    label: "Featured",
    allLabel: "All case studies",
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

const AdminCaseStudiesPage = () => {
  const [caseStudies, setItems] = useState<TCaseStudy[]>([]);
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
        const response = await getAdminCaseStudies(
          {
            page,
            limit,
            search: search.trim() || undefined,
            sort: sort || undefined,
            status: filters.status || undefined,
            primary_pillar: filters.primary_pillar || undefined,
            is_featured: filters.is_featured || undefined,
          },
          { signal: controller.signal }
        );

        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load case studies");
        }

        setItems(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setTableStatus("success");
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, "Failed to load case studies"));
        setTableStatus("error");
      }
    };

    void loadItems();
    return () => controller.abort();
  }, [
    filters.is_featured,
    filters.primary_pillar,
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
          ? "Delete this case study? It will be moved to the deleted records."
          : `Delete ${uniqueIds.length} selected case studies? They will be moved to the deleted records.`;

      if (!window.confirm(message)) return;

      setDeletingIds(uniqueIds);
      setError(null);

      try {
        if (uniqueIds.length === 1) await deleteCaseStudy(uniqueIds[0]);
        else await deleteCaseStudies(uniqueIds);

        const deletedIdSet = new Set(uniqueIds);
        setSelectedIds((current) =>
          current.filter((id) => !deletedIdSet.has(id))
        );
        refresh();
      } catch (deleteError) {
        setError(getErrorMessage(deleteError, "Failed to delete case studies"));
      } finally {
        setDeletingIds([]);
      }
    },
    [isDeleting, refresh]
  );

  const columns = useMemo<readonly TColumn<TCaseStudy>[]>(
    () => [
      {
        id: "caseStudy",
        name: "Case study",
        accessor: (caseStudy) => caseStudy.name,
        sortKey: "name",
        isSortable: true,
        isSearchable: true,
        canHide: false,
        minWidth: "280px",
        cell: ({ row: caseStudy }) => (
          <div className="flex items-center gap-4">
            <EntityThumbnail src={caseStudy.thumbnail?.url} alt={caseStudy.name} />
            <div className="min-w-0">
              <p className="max-w-72 truncate text-sm font-bold">
                {caseStudy.name}
              </p>
              <p className="text-muted-foreground max-w-72 truncate text-xs">
                {caseStudy.description || "No summary provided"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "client",
        name: "Client",
        accessor: (caseStudy) =>
          caseStudy.client_name || caseStudy.client_industry,
        minWidth: "160px",
        cell: ({ row: caseStudy }) => (
          <span className="text-xs font-medium">
            {caseStudy.client_name ||
              caseStudy.client_industry ||
              "Not recorded"}
          </span>
        ),
      },
      {
        id: "role",
        name: "Role",
        accessor: (caseStudy) => caseStudy.primary_pillar,
        minWidth: "150px",
        cell: ({ row: caseStudy }) => (
          <span className="text-xs font-medium">
            {caseStudy.primary_pillar
              ? getPillarLabel(caseStudy.primary_pillar)
              : "Not assigned"}
          </span>
        ),
      },
      {
        id: "category",
        name: "Category",
        accessor: (caseStudy) => caseStudy.category?.name,
        minWidth: "150px",
        cell: ({ row: caseStudy }) => (
          <span className="text-xs font-medium">
            {caseStudy.category?.name || "Uncategorized"}
          </span>
        ),
      },
      {
        field: "status",
        name: "Status",
        isSortable: true,
        minWidth: "120px",
        cell: ({ row: caseStudy }) => (
          <StatusBadge tone={caseStudyStatusTone[caseStudy.status]}>
            {caseStudy.status}
          </StatusBadge>
        ),
      },
      {
        field: "published_at",
        name: "Published",
        isSortable: true,
        minWidth: "145px",
        cell: ({ row: caseStudy }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(caseStudy.published_at)}
          </span>
        ),
      },
      {
        field: "is_featured",
        name: "Featured",
        defaultVisible: false,
        minWidth: "105px",
        cell: ({ row: caseStudy }) => (
          <StatusBadge tone={caseStudy.is_featured ? "primary" : "neutral"}>
            {caseStudy.is_featured ? "Yes" : "No"}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "112px",
        cell: ({ row: caseStudy }) => (
          <div className="flex justify-end gap-1">
            <Link
              href={`/admin/case-studies/edit/${caseStudy._id}`}
              aria-label={`Edit ${caseStudy.name}`}
              title={`Edit ${caseStudy.name}`}
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
              isLoading={deletingIds.includes(caseStudy._id)}
              aria-label={`Delete ${caseStudy.name}`}
              title={`Delete ${caseStudy.name}`}
              onClick={() => void handleDelete([caseStudy._id])}
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
            Case Studies Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Tell the full story of a problem solved, from challenge to result.
          </p>
        </div>
        <Link
          href="/admin/case-studies/new"
          className={buttonVariants({
            className:
              "text-[10px] font-bold tracking-widest uppercase md:text-sm",
          })}
        >
          <Plus aria-hidden="true" className="size-4" />
          Create New Case Study
        </Link>
      </div>

      <DataTable
        data={caseStudies}
        columns={columns}
        filters={caseStudyFilters}
        getRowId={(caseStudy) => caseStudy._id}
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
          getRowLabel: (caseStudy) => caseStudy.name,
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
        caption="Case Studies Management table"
        searchPlaceholder="Search case studies by title, industry or tool…"
        emptyTitle="No case studies found"
        emptyDescription="Create a case study or adjust the current search and filters."
      />
    </div>
  );
};

export default AdminCaseStudiesPage;
