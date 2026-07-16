"use client";

import {
  EditorialStatus,
  EditorialWorkspaceHeader,
} from "@/components/admin/editorial-editor-primitives";
import TaxonomyEditorDialog from "@/components/admin/taxonomy-editor-dialog";
import { Button } from "@/components/ui/button";
import DataTable, {
  type TColumn,
  type TDataTableFilter,
  type TDataTableState,
  type TDataTableStatus,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Tabs,
  TabsContent,
  TabsItem,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTaxonomyAdminQueryState } from "@/hooks/ui/use-taxonomy-admin-query-state";
import {
  TAXONOMY_CONTRACT,
  TAXONOMY_KINDS,
  getSafeTaxonomyParents,
  type TAdminTaxonomyCategory,
  type TTaxonomyKind,
  type TTaxonomyStatus,
} from "@/lib/admin/taxonomy-admin";
import {
  getAdminTaxonomyCategories,
  getAdminTaxonomyParentCandidates,
  permanentlyDeleteAdminTaxonomyCategory,
  restoreAdminTaxonomyCategory,
  softDeleteAdminTaxonomyCategory,
} from "@/services/taxonomy-admin.service";
import { Edit3, Plus, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = Readonly<{
  canEdit: boolean;
  canPermanentDelete: boolean;
}>;

type TNotice = Readonly<{
  tone: "success" | "error";
  message: string;
}>;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value?: string) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : dateFormatter.format(date);
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const FILTERS: readonly TDataTableFilter<TAdminTaxonomyCategory>[] = [
  {
    id: "status",
    label: "Category status",
    allLabel: "All active/inactive states",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  {
    id: "deleted_scope",
    label: "Category lifecycle",
    allLabel: "Active records",
    options: [{ value: "only_deleted", label: "Deleted records" }],
  },
];

const TaxonomyAdminWorkspace = ({ canEdit, canPermanentDelete }: Props) => {
  const { state, isReady, patchState } = useTaxonomyAdminQueryState();
  const contract = TAXONOMY_CONTRACT[state.kind];
  const [records, setRecords] = useState<TAdminTaxonomyCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<TDataTableStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parents, setParents] = useState<TAdminTaxonomyCategory[]>([]);
  const [parentStatus, setParentStatus] = useState<TDataTableStatus>("loading");
  const [parentError, setParentError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<TNotice | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorCategory, setEditorCategory] =
    useState<TAdminTaxonomyCategory | null>(null);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    setRecords([]);
    setTotal(0);
    setNotice(null);
    setEditorOpen(false);
    setEditorCategory(null);
  }, [state.kind]);

  useEffect(() => {
    if (!isReady) return;
    const controller = new AbortController();
    const load = async () => {
      setStatus("loading");
      setLoadError(null);
      try {
        const response = await getAdminTaxonomyCategories(
          state.kind,
          {
            page: state.page,
            limit: state.limit,
            search: state.search || undefined,
            sort: state.sort,
            status: state.status || undefined,
            deletedScope: state.deletedScope,
          },
          { signal: controller.signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(
            response.message || `Failed to load ${contract.label}`
          );
        }
        setRecords(response.data);
        const nextTotal = response.meta?.total ?? response.data.length;
        setTotal(nextTotal);
        setStatus("success");
        const lastPage = Math.max(1, Math.ceil(nextTotal / state.limit));
        if (state.page > lastPage) patchState({ page: lastPage });
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          getErrorMessage(error, `Failed to load ${contract.label}.`)
        );
        setStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, [
    contract.label,
    isReady,
    patchState,
    refreshKey,
    state.deletedScope,
    state.kind,
    state.limit,
    state.page,
    state.search,
    state.sort,
    state.status,
  ]);

  useEffect(() => {
    if (!isReady) return;
    const controller = new AbortController();
    const load = async () => {
      setParentStatus("loading");
      setParentError("");
      try {
        setParents(
          await getAdminTaxonomyParentCandidates(state.kind, {
            signal: controller.signal,
          })
        );
        setParentStatus("success");
      } catch (error) {
        if (controller.signal.aborted) return;
        setParents([]);
        setParentError(
          getErrorMessage(error, "Safe parent choices could not be loaded.")
        );
        setParentStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, [isReady, refreshKey, state.kind]);

  const safeParents = useMemo(
    () => getSafeTaxonomyParents(parents, editorCategory?.id),
    [editorCategory?.id, parents]
  );
  const parentNames = useMemo(
    () => new Map(parents.map((parent) => [parent.id, parent.name])),
    [parents]
  );

  const completeOperation = useCallback(
    async (
      category: TAdminTaxonomyCategory,
      operation: "delete" | "restore" | "permanent"
    ) => {
      if (busyId) return;
      if (
        operation === "delete" &&
        !window.confirm(
          `Move “${category.name}” to deleted ${contract.label.toLowerCase()}?`
        )
      ) {
        return;
      }
      if (
        operation === "permanent" &&
        !window.confirm(
          `Permanently delete “${category.name}”? Existing child or content references will block this operation.`
        )
      ) {
        return;
      }

      setBusyId(category.id);
      setNotice(null);
      try {
        if (operation === "delete") {
          await softDeleteAdminTaxonomyCategory(state.kind, category.id);
        } else if (operation === "restore") {
          await restoreAdminTaxonomyCategory(state.kind, category.id);
        } else {
          await permanentlyDeleteAdminTaxonomyCategory(state.kind, category.id);
        }
        setNotice({
          tone: "success",
          message:
            operation === "delete"
              ? `Moved “${category.name}” to deleted records.`
              : operation === "restore"
                ? `Restored “${category.name}” after backend identity and parent checks.`
                : `Permanently deleted “${category.name}”.`,
        });
        refresh();
      } catch (error) {
        setNotice({
          tone: "error",
          message: getErrorMessage(
            error,
            `The ${operation} operation could not be completed.`
          ),
        });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, contract.label, refresh, state.kind]
  );

  const columns = useMemo<readonly TColumn<TAdminTaxonomyCategory>[]>(
    () => [
      {
        id: "name",
        name: "Category",
        accessor: (category) => category.name,
        isSortable: true,
        isSearchable: true,
        canHide: false,
        minWidth: "250px",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="max-w-72 truncate text-sm font-bold">{row.name}</p>
            <p className="text-muted-foreground max-w-72 truncate font-mono text-xs">
              {row.slug}
            </p>
          </div>
        ),
      },
      {
        id: "parent",
        name: "Parent",
        accessor: (category) => category.parentId,
        minWidth: "180px",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.parentName ||
              (row.parentId
                ? parentNames.get(row.parentId)
                : "Root category") ||
              "Unavailable parent"}
          </span>
        ),
      },
      {
        id: "status",
        name: "Status",
        accessor: (category) => category.status,
        minWidth: "110px",
        cell: ({ row }) => (
          <StatusBadge tone={row.status === "active" ? "success" : "warning"}>
            {row.status}
          </StatusBadge>
        ),
      },
      {
        id: "sequence",
        name: "Order",
        accessor: (category) => category.sequence,
        isSortable: true,
        minWidth: "90px",
      },
      {
        id: "lifecycle",
        name: "Lifecycle",
        accessor: (category) => (category.isDeleted ? "deleted" : "available"),
        minWidth: "110px",
        cell: ({ row }) => (
          <StatusBadge tone={row.isDeleted ? "destructive" : "success"}>
            {row.isDeleted ? "Deleted" : "Available"}
          </StatusBadge>
        ),
      },
      {
        id: "updated_at",
        name: "Updated",
        accessor: (category) => category.updatedAt,
        defaultVisible: false,
        minWidth: "130px",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(row.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "180px",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {canEdit && !row.isDeleted ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                aria-label={`Edit ${row.name}`}
                title={`Edit ${row.name}`}
                disabled={Boolean(busyId) || parentStatus !== "success"}
                onClick={() => {
                  setEditorCategory(row);
                  setEditorOpen(true);
                }}
              >
                <Edit3 aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            {canEdit && !row.isDeleted ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                aria-label={`Move ${row.name} to deleted records`}
                title={`Move ${row.name} to deleted records`}
                disabled={Boolean(busyId)}
                isLoading={busyId === row.id}
                className="text-destructive hover:bg-destructive/10"
                onClick={() => void completeOperation(row, "delete")}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            {canEdit && row.isDeleted ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                aria-label={`Restore ${row.name}`}
                title={`Restore ${row.name}`}
                disabled={Boolean(busyId)}
                isLoading={busyId === row.id}
                onClick={() => void completeOperation(row, "restore")}
              >
                <Undo2 aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
            {canPermanentDelete && row.isDeleted ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                shape="icon"
                aria-label={`Permanently delete ${row.name}`}
                title={`Permanently delete ${row.name}`}
                disabled={Boolean(busyId)}
                isLoading={busyId === row.id}
                className="text-destructive hover:bg-destructive/10"
                onClick={() => void completeOperation(row, "permanent")}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [
      busyId,
      canEdit,
      canPermanentDelete,
      completeOperation,
      parentNames,
      parentStatus,
    ]
  );

  const tableState = useMemo<TDataTableState>(
    () => ({
      search: state.search,
      sort: state.sort,
      page: state.page,
      limit: state.limit,
      total,
      filters: {
        ...(state.status ? { status: state.status } : {}),
        ...(state.deletedScope === "only_deleted"
          ? { deleted_scope: "only_deleted" }
          : {}),
      },
      setSearch: (search) => patchState({ search }, { resetPage: true }),
      setSort: (sort) =>
        patchState({ sort: sort || "sequence" }, { resetPage: true }),
      setPage: (page) => patchState({ page }),
      setLimit: (limit) => patchState({ limit }, { resetPage: true }),
      setFilters: (filters) =>
        patchState(
          {
            status:
              filters.status === "active" || filters.status === "inactive"
                ? (filters.status as TTaxonomyStatus)
                : "",
            deletedScope:
              filters.deleted_scope === "only_deleted"
                ? "only_deleted"
                : "active",
          },
          { resetPage: true }
        ),
    }),
    [patchState, state, total]
  );

  const table = (
    <DataTable
      key={state.kind}
      title={contract.label}
      data={records}
      columns={columns}
      filters={FILTERS}
      getRowId={(category) => category.id}
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
      selection={false}
      caption={`${contract.label} administration table`}
      searchPlaceholder={`Search ${contract.label.toLowerCase()}…`}
      emptyTitle={`No ${contract.label.toLowerCase()} found`}
      emptyDescription={
        canEdit
          ? "Create a category or adjust the remote search and filters."
          : "Adjust the remote search and filters."
      }
    />
  );

  return (
    <div className="mx-auto max-w-[100rem] space-y-7">
      <EditorialWorkspaceHeader
        eyebrow="Content taxonomy"
        title="Article and project categories"
        description="Manage separate category identities, active visibility, hierarchy, and deletion lifecycle through the existing category APIs."
        status={
          <>
            <EditorialStatus tone="success">Article taxonomy</EditorialStatus>
            <EditorialStatus tone="success">Project taxonomy</EditorialStatus>
            {!canEdit ? <EditorialStatus>Read only</EditorialStatus> : null}
          </>
        }
        actions={
          canEdit ? (
            <Button
              type="button"
              disabled={parentStatus !== "success" || Boolean(busyId)}
              onClick={() => {
                setEditorCategory(null);
                setEditorOpen(true);
              }}
            >
              <Plus aria-hidden="true" className="size-4" />
              New {contract.singular}
            </Button>
          ) : undefined
        }
      />

      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm"
              : "border-success/30 bg-success/10 text-success rounded-xl border p-4 text-sm"
          }
        >
          <div className="flex items-center justify-between gap-3">
            <p>{notice.message}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              shape="icon"
              aria-label="Dismiss taxonomy operation report"
              onClick={() => setNotice(null)}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {parentError ? (
        <div
          role="alert"
          className="border-warning/30 bg-warning/10 rounded-xl border p-4 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              {parentError} Create and edit controls are paused to protect the
              hierarchy; list and lifecycle controls remain available.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Retry parent graph
            </Button>
          </div>
        </div>
      ) : null}

      <Tabs
        value={state.kind}
        onValueChange={(value) => {
          if (TAXONOMY_KINDS.includes(value as TTaxonomyKind)) {
            patchState({ kind: value as TTaxonomyKind }, { resetPage: true });
          }
        }}
      >
        <TabsList
          aria-label="Taxonomy type"
          className="border-border bg-muted/40 inline-flex rounded-xl border p-1"
        >
          <TabsTrigger
            value="article"
            className="data-[state=active]:bg-card rounded-lg px-5 before:hidden data-[state=active]:shadow-sm"
          >
            Article categories
          </TabsTrigger>
          <TabsTrigger
            value="project"
            className="data-[state=active]:bg-card rounded-lg px-5 before:hidden data-[state=active]:shadow-sm"
          >
            Project categories
          </TabsTrigger>
        </TabsList>
        <TabsContent className="mt-5">
          <TabsItem value="article">
            {state.kind === "article" ? table : null}
          </TabsItem>
          <TabsItem value="project">
            {state.kind === "project" ? table : null}
          </TabsItem>
        </TabsContent>
      </Tabs>

      <TaxonomyEditorDialog
        isOpen={editorOpen}
        setIsOpen={setEditorOpen}
        kind={state.kind}
        category={editorCategory}
        safeParents={safeParents}
        onSaved={(message) => {
          setNotice({ tone: "success", message });
          refresh();
        }}
      />
    </div>
  );
};

export default TaxonomyAdminWorkspace;
