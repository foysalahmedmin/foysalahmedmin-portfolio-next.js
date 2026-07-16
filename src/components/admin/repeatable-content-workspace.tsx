"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import DataTable, {
  type TColumn,
  type TDataTableFilter,
  type TDataTableState,
  type TDataTableStatus,
} from "@/components/ui/data-table";
import {
  StatusBadge,
  type TStatusBadgeTone,
} from "@/components/ui/status-badge";
import { useRepeatableAdminQueryState } from "@/hooks/ui/use-repeatable-admin-query-state";
import type { RepeatableAdminWorkspace } from "@/lib/admin/repeatable-workspaces";
import {
  bulkMutateAdminRepeatableRecords,
  getAdminRepeatableRecords,
  permanentlyDeleteAdminRepeatableRecord,
  type AdminRepeatableRecord,
} from "@/services/repeatable-admin.service";
import type { TRepeatableBulkOperation } from "@/app/api/repeatable-content/record.type";
import { Archive, Edit3, Plus, Send, Trash2, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = Readonly<{
  workspace: RepeatableAdminWorkspace;
  canEdit: boolean;
  canPublish: boolean;
  canPermanentDelete: boolean;
}>;

type OperationNotice = Readonly<{
  tone: "success" | "warning" | "error";
  message: string;
  failures?: ReadonlyArray<{ id: string; code: string }>;
}>;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : dateFormatter.format(date);
};

const humanize = (value: unknown) =>
  typeof value === "string" && value
    ? value.replaceAll("_", " ").replaceAll("-", " ")
    : "Not recorded";

const truncate = (value: unknown, length = 80) => {
  const text = typeof value === "string" ? value : "";
  return text.length > length
    ? `${text.slice(0, length - 1)}…`
    : text || "Not recorded";
};

const toneForStatus = (value: unknown): TStatusBadgeTone => {
  if (["published", "verified", "granted", "active"].includes(String(value))) {
    return "success";
  }
  if (["draft", "pending", "derived", "working"].includes(String(value))) {
    return "warning";
  }
  if (["revoked", "unverified", "deleted"].includes(String(value))) {
    return "destructive";
  }
  if (
    ["advanced", "expert", "experience", "education"].includes(String(value))
  ) {
    return "info";
  }
  return "neutral";
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const noticeClassNames: Record<OperationNotice["tone"], string> = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

const RepeatableContentWorkspace = ({
  workspace,
  canEdit,
  canPublish,
  canPermanentDelete,
}: Props) => {
  const allowedSortKeys = useMemo(
    () => [
      "sequence",
      "title",
      "updated_at",
      workspace.defaultSort.replace(/^-/, ""),
    ],
    [workspace.defaultSort]
  );
  const queryContract = useMemo(
    () => ({
      defaultSort: workspace.defaultSort,
      filters: workspace.filters,
      allowedSortKeys,
    }),
    [allowedSortKeys, workspace.defaultSort, workspace.filters]
  );
  const { isReady, state, patchState } =
    useRepeatableAdminQueryState(queryContract);
  const [records, setRecords] = useState<AdminRepeatableRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<TDataTableStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<OperationNotice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!isReady) return;
    const controller = new AbortController();
    const load = async () => {
      setStatus("loading");
      setLoadError(null);
      try {
        const response = await getAdminRepeatableRecords(
          workspace.apiPath,
          {
            page: state.page,
            limit: state.limit,
            sort: state.sort,
            search: state.search || undefined,
            filters: state.filters,
          },
          { signal: controller.signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(
            response.message ||
              `Failed to load ${workspace.label.toLowerCase()}`
          );
        }
        setRecords(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setStatus("success");
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          getErrorMessage(
            error,
            `Failed to load ${workspace.label.toLowerCase()}`
          )
        );
        setStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, [
    isReady,
    refreshKey,
    state.filters,
    state.limit,
    state.page,
    state.search,
    state.sort,
    workspace.apiPath,
    workspace.label,
  ]);

  const applyBulk = useCallback(
    async (
      operation: TRepeatableBulkOperation,
      candidateRecords: readonly AdminRepeatableRecord[]
    ) => {
      const uniqueRecords = Array.from(
        new Map(candidateRecords.map((record) => [record.id, record])).values()
      );
      if (!uniqueRecords.length || busyIds.length) return;
      const operationLabel = operation.replaceAll("_", " ");
      if (
        ["soft_delete"].includes(operation) &&
        !window.confirm(
          `Move ${uniqueRecords.length} selected ${workspace.singular}${uniqueRecords.length === 1 ? "" : "s"} to deleted records?`
        )
      ) {
        return;
      }
      setBusyIds(uniqueRecords.map(({ id }) => id));
      setNotice(null);
      try {
        const response = await bulkMutateAdminRepeatableRecords(
          workspace.apiPath,
          operation,
          uniqueRecords
        );
        const result = response.data;
        const succeededIds = new Set(result.succeeded.map(({ id }) => id));
        setSelectedIds((current) =>
          current.filter((id) => !succeededIds.has(id))
        );
        const failures = result.failed;
        setNotice({
          tone: failures.length ? "warning" : "success",
          message: failures.length
            ? `${result.succeeded.length} ${operationLabel} operation${result.succeeded.length === 1 ? "" : "s"} succeeded; ${failures.length} failed. Failed records remain selected for review.`
            : `${result.succeeded.length} ${operationLabel} operation${result.succeeded.length === 1 ? "" : "s"} completed.`,
          ...(failures.length ? { failures } : {}),
        });
        refresh();
      } catch (error) {
        setNotice({
          tone: "error",
          message: getErrorMessage(
            error,
            `The ${operationLabel} operation failed.`
          ),
        });
      } finally {
        setBusyIds([]);
      }
    },
    [busyIds.length, refresh, workspace.apiPath, workspace.singular]
  );

  const permanentlyDelete = useCallback(
    async (record: AdminRepeatableRecord) => {
      if (busyIds.length || !record.is_deleted) return;
      if (
        !window.confirm(
          `Permanently delete “${record.title}”? This cannot be undone.`
        )
      ) {
        return;
      }
      setBusyIds([record.id]);
      setNotice(null);
      try {
        await permanentlyDeleteAdminRepeatableRecord(
          workspace.apiPath,
          record.id,
          record.version
        );
        setSelectedIds((current) => current.filter((id) => id !== record.id));
        setNotice({
          tone: "success",
          message: "The deleted record was permanently removed.",
        });
        refresh();
      } catch (error) {
        setNotice({
          tone: "error",
          message: getErrorMessage(error, "Permanent deletion failed."),
        });
      } finally {
        setBusyIds([]);
      }
    },
    [busyIds.length, refresh, workspace.apiPath]
  );

  const isBusy = busyIds.length > 0;

  const columns = useMemo<readonly TColumn<AdminRepeatableRecord>[]>(() => {
    const detailColumns: TColumn<AdminRepeatableRecord>[] =
      workspace.detailColumns.map((column) => ({
        id: column.key,
        name: column.label,
        accessor: (record) => record[column.key],
        isSortable: allowedSortKeys.includes(column.key),
        defaultVisible: column.defaultVisible,
        minWidth: column.kind === "date" ? "135px" : "150px",
        cell: ({ row }) =>
          column.kind === "status" ? (
            <StatusBadge tone={toneForStatus(row[column.key])}>
              {humanize(row[column.key])}
            </StatusBadge>
          ) : column.kind === "date" ? (
            <span className="text-muted-foreground text-sm">
              {formatDate(row[column.key])}
            </span>
          ) : (
            <span className="block max-w-64 truncate text-sm">
              {truncate(row[column.key])}
            </span>
          ),
      }));

    return [
      {
        id: "title",
        name: workspace.singular === "FAQ" ? "Question" : "Title",
        accessor: (record) => record.title,
        isSortable: true,
        isSearchable: true,
        canHide: false,
        minWidth: "260px",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="max-w-80 truncate text-sm font-bold">{row.title}</p>
            <p className="text-muted-foreground max-w-80 truncate text-xs">
              {row.summary || row.slug}
            </p>
          </div>
        ),
      },
      ...detailColumns,
      ...(workspace.supportsPillars
        ? ([
            {
              id: "primary_pillar",
              name: "Discipline",
              accessor: (record: AdminRepeatableRecord) =>
                record.primary_pillar,
              minWidth: "150px",
              cell: ({ row }: { row: AdminRepeatableRecord }) => (
                <span className="text-sm">{humanize(row.primary_pillar)}</span>
              ),
            },
          ] satisfies TColumn<AdminRepeatableRecord>[])
        : []),
      {
        id: "status",
        name: "Publication",
        accessor: (record) => record.status,
        minWidth: "125px",
        cell: ({ row }) => (
          <StatusBadge tone={toneForStatus(row.status)}>
            {humanize(row.status)}
          </StatusBadge>
        ),
      },
      {
        id: "lifecycle",
        name: "Lifecycle",
        accessor: (record) => (record.is_deleted ? "deleted" : "active"),
        minWidth: "110px",
        cell: ({ row }) => (
          <StatusBadge tone={row.is_deleted ? "destructive" : "success"}>
            {row.is_deleted ? "Deleted" : "Active"}
          </StatusBadge>
        ),
      },
      {
        id: "sequence",
        name: "Order",
        accessor: (record) => record.sequence,
        isSortable: true,
        defaultVisible: false,
        minWidth: "90px",
      },
      {
        id: "updated_at",
        name: "Updated",
        accessor: (record) => record.updated_at,
        isSortable: true,
        defaultVisible: false,
        minWidth: "135px",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(row.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "220px",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {canEdit && !row.is_deleted && (
              <Link
                href={`/admin/${workspace.key}/edit/${row.id}`}
                aria-label={`Edit ${row.title}`}
                title={`Edit ${row.title}`}
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  shape: "icon",
                })}
              >
                <Edit3 aria-hidden="true" className="size-4" />
              </Link>
            )}
            {canPublish && !row.is_deleted && row.status !== "published" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                disabled={isBusy}
                isLoading={busyIds.includes(row.id)}
                aria-label={`Publish ${row.title}`}
                title={`Publish ${row.title}`}
                onClick={() => void applyBulk("publish", [row])}
              >
                <Send aria-hidden="true" className="size-4" />
              </Button>
            )}
            {canEdit && !row.is_deleted && row.status !== "archived" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                disabled={isBusy}
                isLoading={busyIds.includes(row.id)}
                aria-label={`Archive ${row.title}`}
                title={`Archive ${row.title}`}
                onClick={() => void applyBulk("archive", [row])}
              >
                <Archive aria-hidden="true" className="size-4" />
              </Button>
            )}
            {canEdit && !row.is_deleted && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                disabled={isBusy}
                isLoading={busyIds.includes(row.id)}
                aria-label={`Move ${row.title} to deleted records`}
                title={`Move ${row.title} to deleted records`}
                onClick={() => void applyBulk("soft_delete", [row])}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            )}
            {canEdit && row.is_deleted && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                disabled={isBusy}
                isLoading={busyIds.includes(row.id)}
                aria-label={`Restore ${row.title}`}
                title={`Restore ${row.title}`}
                onClick={() => void applyBulk("restore", [row])}
              >
                <Undo2 aria-hidden="true" className="size-4" />
              </Button>
            )}
            {canPermanentDelete && row.is_deleted && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                disabled={isBusy}
                isLoading={busyIds.includes(row.id)}
                aria-label={`Permanently delete ${row.title}`}
                title={`Permanently delete ${row.title}`}
                onClick={() => void permanentlyDelete(row)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ];
  }, [
    allowedSortKeys,
    applyBulk,
    busyIds,
    canEdit,
    canPermanentDelete,
    canPublish,
    isBusy,
    permanentlyDelete,
    workspace,
  ]);

  const filters = useMemo<readonly TDataTableFilter<AdminRepeatableRecord>[]>(
    () => workspace.filters,
    [workspace.filters]
  );

  const tableState = useMemo<TDataTableState>(
    () => ({
      search: state.search,
      sort: state.sort,
      page: state.page,
      limit: state.limit,
      total,
      filters: { ...state.filters },
      setSearch: (search) => patchState({ search }, true),
      setSort: (sort) =>
        patchState({ sort: sort || workspace.defaultSort }, true),
      setPage: (page) => patchState({ page }),
      setLimit: (limit) => patchState({ limit }, true),
      setFilters: (nextFilters) => patchState({ filters: nextFilters }, true),
    }),
    [patchState, state, total, workspace.defaultSort]
  );

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
            Repeatable content
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {workspace.label}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {workspace.description}
          </p>
        </div>
        {canEdit && (
          <Link
            href={`/admin/${workspace.key}/new`}
            className={buttonVariants({ className: "shrink-0" })}
          >
            <Plus aria-hidden="true" className="size-4" />
            New {workspace.singular}
          </Link>
        )}
      </header>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`rounded-2xl border px-4 py-3 text-sm ${noticeClassNames[notice.tone]}`}
        >
          <div className="flex min-h-11 items-center justify-between gap-3">
            <p>{notice.message}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              shape="icon"
              aria-label="Dismiss operation report"
              onClick={() => setNotice(null)}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {notice.failures?.length ? (
            <ul className="mt-2 space-y-1 text-xs" aria-label="Failed records">
              {notice.failures.map((failure) => (
                <li key={failure.id}>
                  <span className="font-mono">{failure.id}</span>:{" "}
                  {failure.code}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <DataTable
        data={records}
        columns={columns}
        filters={filters}
        getRowId={(record) => record.id}
        state={tableState}
        status={!isReady ? "loading" : status}
        error={loadError}
        onRetry={refresh}
        config={{
          isSearchProcessed: true,
          isSortProcessed: true,
          isFilterProcessed: true,
          isPaginationProcessed: true,
          isMultiSort: false,
          pageSizeOptions: [10, 20, 50],
        }}
        selection={
          canEdit
            ? {
                mode: "multiple",
                selectedIds,
                onChange: ({ selectedIds: next }) => setSelectedIds(next),
                isRowSelectable: () => !isBusy,
                preserveAcrossPages: true,
                preserveAcrossQueries: false,
                getRowLabel: (record) => record.title,
              }
            : false
        }
        bulkActions={
          canEdit
            ? ({ selectedRows }) => {
                const active = selectedRows.filter(
                  (record) => !record.is_deleted
                );
                const deleted = selectedRows.filter(
                  (record) => record.is_deleted
                );
                return (
                  <div className="flex flex-wrap gap-2">
                    {canPublish &&
                      active.some(
                        (record) => record.status !== "published"
                      ) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() =>
                            void applyBulk(
                              "publish",
                              active.filter(
                                (record) => record.status !== "published"
                              )
                            )
                          }
                        >
                          <Send aria-hidden="true" className="size-4" />
                          Publish eligible
                        </Button>
                      )}
                    {active.some((record) => record.status !== "archived") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() =>
                          void applyBulk(
                            "archive",
                            active.filter(
                              (record) => record.status !== "archived"
                            )
                          )
                        }
                      >
                        <Archive aria-hidden="true" className="size-4" />
                        Archive selected
                      </Button>
                    )}
                    {active.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void applyBulk("soft_delete", active)}
                        className="border-destructive/40 text-destructive"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        Move to deleted
                      </Button>
                    )}
                    {deleted.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void applyBulk("restore", deleted)}
                      >
                        <Undo2 aria-hidden="true" className="size-4" />
                        Restore selected
                      </Button>
                    )}
                  </div>
                );
              }
            : undefined
        }
        caption={`${workspace.label} administration table`}
        searchPlaceholder={workspace.searchPlaceholder}
        emptyTitle={`No ${workspace.label.toLowerCase()} found`}
        emptyDescription={
          canEdit
            ? `Create a ${workspace.singular} or adjust the URL-backed search and filters.`
            : "Adjust the URL-backed search and filters."
        }
      />
    </div>
  );
};

export default RepeatableContentWorkspace;
