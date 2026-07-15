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
  deleteProject,
  deleteProjects,
  getAdminProjects,
} from "@/services/project.service";
import type { TProject, TProjectStatus } from "@/types/project.type";
import { Edit, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const projectStatusTone: Record<TProjectStatus, TStatusBadgeTone> = {
  planned: "neutral",
  in_progress: "info",
  on_hold: "warning",
  completed: "success",
  cancelled: "destructive",
};

const projectFilters: readonly TDataTableFilter<TProject>[] = [
  {
    id: "status",
    label: "Status",
    allLabel: "All statuses",
    options: [
      { label: "Planned", value: "planned" },
      { label: "In progress", value: "in_progress" },
      { label: "On hold", value: "on_hold" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  {
    id: "is_featured",
    label: "Featured",
    allLabel: "All projects",
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
  if (!value) return "Not started";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : dateFormatter.format(date);
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const AdminProjectsPage = () => {
  const [projects, setProjects] = useState<TProject[]>([]);
  const [tableStatus, setTableStatus] = useState<TDataTableStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("-started_at");
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

    const loadProjects = async () => {
      setTableStatus("loading");
      setError(null);

      try {
        const response = await getAdminProjects(
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
          throw new Error(response.message || "Failed to load projects");
        }

        setProjects(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setTableStatus("success");
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(requestError, "Failed to load projects"));
        setTableStatus("error");
      }
    };

    void loadProjects();
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
          ? "Delete this project? It will be moved to the deleted records."
          : `Delete ${uniqueIds.length} selected projects? They will be moved to the deleted records.`;

      if (!window.confirm(message)) return;

      setDeletingIds(uniqueIds);
      setError(null);

      try {
        if (uniqueIds.length === 1) await deleteProject(uniqueIds[0]);
        else await deleteProjects(uniqueIds);

        const deletedIdSet = new Set(uniqueIds);
        setSelectedIds((current) =>
          current.filter((id) => !deletedIdSet.has(id))
        );
        refresh();
      } catch (deleteError) {
        setError(getErrorMessage(deleteError, "Failed to delete projects"));
      } finally {
        setDeletingIds([]);
      }
    },
    [isDeleting, refresh]
  );

  const columns = useMemo<readonly TColumn<TProject>[]>(
    () => [
      {
        id: "project",
        name: "Project",
        accessor: (project) => project.name,
        sortKey: "name",
        isSortable: true,
        isSearchable: true,
        canHide: false,
        minWidth: "280px",
        cell: ({ row: project }) => (
          <div className="flex items-center gap-4">
            <EntityThumbnail src={project.thumbnail?.url} alt={project.name} />
            <div className="min-w-0">
              <p className="max-w-72 truncate text-sm font-bold">
                {project.name}
              </p>
              <p className="text-muted-foreground max-w-72 truncate text-xs">
                {project.slug}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "category",
        name: "Category",
        accessor: (project) => project.category?.name,
        minWidth: "150px",
        cell: ({ row: project }) => (
          <span className="text-xs font-medium">
            {project.category?.name || "Uncategorized"}
          </span>
        ),
      },
      {
        field: "status",
        name: "Status",
        isSortable: true,
        minWidth: "130px",
        cell: ({ row: project }) => (
          <StatusBadge tone={projectStatusTone[project.status]}>
            {project.status.replaceAll("_", " ")}
          </StatusBadge>
        ),
      },
      {
        field: "started_at",
        name: "Started",
        isSortable: true,
        defaultVisible: false,
        minWidth: "135px",
        cell: ({ row: project }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(project.started_at)}
          </span>
        ),
      },
      {
        field: "is_featured",
        name: "Featured",
        minWidth: "105px",
        cell: ({ row: project }) => (
          <StatusBadge tone={project.is_featured ? "primary" : "neutral"}>
            {project.is_featured ? "Yes" : "No"}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "112px",
        cell: ({ row: project }) => (
          <div className="flex justify-end gap-1">
            <Link
              href={`/admin/projects/edit/${project._id}`}
              aria-label={`Edit ${project.name}`}
              title={`Edit ${project.name}`}
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
              isLoading={deletingIds.includes(project._id)}
              aria-label={`Delete ${project.name}`}
              title={`Delete ${project.name}`}
              onClick={() => void handleDelete([project._id])}
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
            Projects Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your portfolio projects and case studies.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className={buttonVariants({
            className:
              "text-[10px] font-bold tracking-widest uppercase md:text-sm",
          })}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add New Project
        </Link>
      </div>

      <DataTable
        data={projects}
        columns={columns}
        filters={projectFilters}
        getRowId={(project) => project._id}
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
          getRowLabel: (project) => project.name,
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
        caption="Projects management table"
        searchPlaceholder="Search projects by name or description…"
        emptyTitle="No projects found"
        emptyDescription="Create a project or adjust the current search and filters."
      />
    </div>
  );
};

export default AdminProjectsPage;
