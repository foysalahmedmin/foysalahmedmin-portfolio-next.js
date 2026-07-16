"use client";

import ProjectResourceEditor from "@/components/admin/project-resource-editor";
import { Button } from "@/components/ui/button";
import DataTable, {
  type TColumn,
  type TDataTableState,
  type TDataTableStatus,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRepeatableAdminQueryState } from "@/hooks/ui/use-repeatable-admin-query-state";
import {
  createAdminProjectResource,
  getAdminProjectResources,
  permanentlyDeleteAdminProjectResources,
  restoreAdminProjectResources,
  softDeleteAdminProjectResources,
  updateAdminProjectResource,
  updateAdminProjectResourcePrivacy,
  type ProjectResourceAdminRecord,
  type ProjectResourceBulkResult,
  type ProjectResourceCreateInput,
  type ProjectResourceType,
} from "@/services/project-resource-admin.service";
import {
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = Readonly<{
  canEdit: boolean;
  canPermanentDelete: boolean;
}>;

type Notice = Readonly<{
  tone: "success" | "warning" | "error";
  message: string;
  failures?: readonly string[];
}>;

type BulkAction =
  | "make_public"
  | "make_private"
  | "soft_delete"
  | "restore"
  | "permanent_delete";

type EditorState =
  | Readonly<{ mode: "create" }>
  | Readonly<{ mode: "edit"; resource: ProjectResourceAdminRecord }>;

const FILTERS = [
  {
    id: "type",
    label: "Resource type",
    allLabel: "All resource types",
    options: [
      { value: "repository", label: "Repository" },
      { value: "design", label: "Design" },
      { value: "documentation", label: "Documentation" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "is_private",
    label: "Visibility",
    allLabel: "Public and private",
    options: [
      { value: "false", label: "Public" },
      { value: "true", label: "Private" },
    ],
  },
  {
    id: "deleted_scope",
    label: "Lifecycle",
    allLabel: "Active resources",
    options: [
      { value: "with_deleted", label: "Active and deleted" },
      { value: "only_deleted", label: "Deleted resources" },
    ],
  },
] as const;

const QUERY_CONTRACT = {
  defaultSort: "sequence",
  allowedSortKeys: ["sequence", "title"],
  filters: FILTERS,
} as const;

const noticeClassNames: Record<Notice["tone"], string> = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatDate = (value: string | undefined) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : dateFormatter.format(date);
};

const getProjectName = (resource: ProjectResourceAdminRecord): string => {
  if (!resource.project) return "Unavailable project";
  return typeof resource.project === "string"
    ? resource.project
    : resource.project.name;
};

const isEligible = (
  action: BulkAction,
  resource: ProjectResourceAdminRecord
): boolean => {
  if (action === "restore" || action === "permanent_delete") {
    return Boolean(resource.is_deleted);
  }
  if (resource.is_deleted) return false;
  if (action === "make_public") return resource.is_private;
  if (action === "make_private") return !resource.is_private;
  return true;
};

const actionLabel: Record<BulkAction, string> = {
  make_public: "made public",
  make_private: "made private",
  soft_delete: "moved to deleted resources",
  restore: "restored",
  permanent_delete: "permanently deleted",
};

const ProjectResourceWorkspace = ({ canEdit, canPermanentDelete }: Props) => {
  const { isReady, state, patchState } =
    useRepeatableAdminQueryState(QUERY_CONTRACT);
  const [records, setRecords] = useState<ProjectResourceAdminRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<TDataTableStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  const closeEditor = useCallback(() => setEditor(null), []);

  useEffect(() => {
    if (!isReady) return;
    const controller = new AbortController();
    const load = async () => {
      setStatus("loading");
      setLoadError(null);
      try {
        const response = await getAdminProjectResources(
          {
            search: state.search,
            sort: state.sort,
            page: state.page,
            limit: state.limit,
            type: state.filters.type as ProjectResourceType | undefined,
            is_private: state.filters.is_private as
              | "true"
              | "false"
              | undefined,
            deleted_scope: state.filters.deleted_scope as
              | "active"
              | "with_deleted"
              | "only_deleted"
              | undefined,
          },
          { signal: controller.signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load resources.");
        }
        setRecords(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setStatus("success");
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setLoadError(
          error instanceof Error && error.message
            ? error.message
            : "Failed to load project resources."
        );
      }
    };
    void load();
    return () => controller.abort();
  }, [isReady, refreshKey, state]);

  const saveEditor = useCallback(
    async (input: ProjectResourceCreateInput) => {
      if (!editor) return;
      if (editor.mode === "create") {
        await createAdminProjectResource(input);
        setNotice({ tone: "success", message: "Project resource created." });
      } else {
        const { project: _project, ...update } = input;
        await updateAdminProjectResource(editor.resource._id, update);
        setNotice({ tone: "success", message: "Project resource updated." });
      }
      setEditor(null);
      refresh();
    },
    [editor, refresh]
  );

  const completeBulk = useCallback(
    (
      action: BulkAction,
      candidates: readonly ProjectResourceAdminRecord[],
      skipped: number,
      result: ProjectResourceBulkResult
    ) => {
      const failures = [
        ...new Set([
          ...result.not_found_ids,
          ...(result.not_restorable_ids ?? []),
        ]),
      ];
      const failed = new Set(failures);
      const succeeded = new Set(
        candidates
          .filter((resource) => !failed.has(resource._id))
          .map((resource) => resource._id)
      );
      setSelectedIds((current) => current.filter((id) => !succeeded.has(id)));
      setNotice({
        tone: failures.length || skipped ? "warning" : "success",
        message: `${result.count} resource${result.count === 1 ? "" : "s"} ${actionLabel[action]}${skipped ? `; ${skipped} ineligible selection${skipped === 1 ? " was" : "s were"} skipped` : ""}${failures.length ? `; ${failures.length} could not be completed` : ""}.`,
        failures,
      });
      refresh();
    },
    [refresh]
  );

  const applyBulk = useCallback(
    async (
      action: BulkAction,
      requested: readonly ProjectResourceAdminRecord[]
    ) => {
      if (!canEdit || busy) return;
      if (action === "permanent_delete" && !canPermanentDelete) return;
      const candidates = requested.filter((resource) =>
        isEligible(action, resource)
      );
      const skipped = requested.length - candidates.length;
      if (!candidates.length) {
        setNotice({
          tone: "warning",
          message: "No selected resources are eligible for this operation.",
        });
        return;
      }
      if (
        action === "soft_delete" &&
        !window.confirm(
          `Move ${candidates.length} project resource${candidates.length === 1 ? "" : "s"} to deleted resources?`
        )
      ) {
        return;
      }
      if (
        action === "permanent_delete" &&
        !window.confirm(
          `Permanently delete ${candidates.length} already-deleted project resource${candidates.length === 1 ? "" : "s"}? This cannot be undone.`
        )
      ) {
        return;
      }

      setBusy(true);
      setNotice(null);
      try {
        const ids = candidates.map((resource) => resource._id);
        const response =
          action === "make_public"
            ? await updateAdminProjectResourcePrivacy(ids, false)
            : action === "make_private"
              ? await updateAdminProjectResourcePrivacy(ids, true)
              : action === "soft_delete"
                ? await softDeleteAdminProjectResources(ids)
                : action === "restore"
                  ? await restoreAdminProjectResources(ids)
                  : await permanentlyDeleteAdminProjectResources(ids);
        completeBulk(action, candidates, skipped, response.data);
      } catch (error) {
        setNotice({
          tone: "error",
          message:
            error instanceof Error && error.message
              ? error.message
              : "The project-resource operation failed safely.",
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, canEdit, canPermanentDelete, completeBulk]
  );

  const columns = useMemo<readonly TColumn<ProjectResourceAdminRecord>[]>(
    () => [
      {
        id: "title",
        name: "Resource",
        sortKey: "title",
        isSortable: true,
        canHide: false,
        minWidth: "260px",
        accessor: (resource) => resource.title,
        cell: ({ row }) => (
          <div className="max-w-80">
            <p className="font-bold">{row.title}</p>
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {getProjectName(row)}
            </p>
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary mt-2 inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
            >
              Review destination
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          </div>
        ),
      },
      {
        id: "type",
        name: "Type",
        accessor: (resource) => resource.type,
        minWidth: "140px",
        cell: ({ row }) => <StatusBadge tone="info">{row.type}</StatusBadge>,
      },
      {
        id: "visibility",
        name: "Visibility",
        accessor: (resource) => resource.is_private,
        minWidth: "130px",
        cell: ({ row }) => (
          <StatusBadge tone={row.is_private ? "warning" : "success"}>
            {row.is_private ? "Private" : "Public"}
          </StatusBadge>
        ),
      },
      {
        id: "lifecycle",
        name: "Lifecycle",
        accessor: (resource) => resource.is_deleted,
        minWidth: "135px",
        cell: ({ row }) => (
          <div>
            <StatusBadge tone={row.is_deleted ? "destructive" : "success"}>
              {row.is_deleted ? "Deleted" : "Active"}
            </StatusBadge>
            {row.is_deleted ? (
              <p className="text-muted-foreground mt-1 text-xs">
                {formatDate(row.deleted_at ?? undefined)}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "sequence",
        name: "Sequence",
        field: "sequence",
        sortKey: "sequence",
        isSortable: true,
        align: "center",
        minWidth: "110px",
      },
      {
        id: "updated_at",
        name: "Updated",
        accessor: (resource) => resource.updated_at,
        minWidth: "130px",
        cell: ({ row }) => formatDate(row.updated_at),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "270px",
        cell: ({ row }) =>
          canEdit ? (
            <div className="flex flex-wrap justify-end gap-1">
              {!row.is_deleted ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setEditor({ mode: "edit", resource: row })}
                  >
                    <Edit3 aria-hidden="true" className="size-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void applyBulk(
                        row.is_private ? "make_public" : "make_private",
                        [row]
                      )
                    }
                  >
                    {row.is_private ? (
                      <Eye aria-hidden="true" className="size-4" />
                    ) : (
                      <EyeOff aria-hidden="true" className="size-4" />
                    )}
                    {row.is_private ? "Make public" : "Make private"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() => void applyBulk("soft_delete", [row])}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void applyBulk("restore", [row])}
                  >
                    <Undo2 aria-hidden="true" className="size-4" />
                    Restore
                  </Button>
                  {canPermanentDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => void applyBulk("permanent_delete", [row])}
                    >
                      Permanently delete
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">Read only</span>
          ),
      },
    ],
    [applyBulk, busy, canEdit, canPermanentDelete]
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
      setSort: (sort) => patchState({ sort: sort || "sequence" }, true),
      setPage: (page) => patchState({ page }),
      setLimit: (limit) => patchState({ limit }, true),
      setFilters: (filters) => patchState({ filters }, true),
    }),
    [patchState, state, total]
  );

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
            Project proof controls
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Project resources
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Manage repository, design and documentation links with explicit
            visibility. Public project surfaces receive only active, public
            resources attached to a public project.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={refresh}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Refresh
          </Button>
          {canEdit ? (
            <Button type="button" onClick={() => setEditor({ mode: "create" })}>
              <Plus aria-hidden="true" className="size-4" />
              New resource
            </Button>
          ) : null}
        </div>
      </header>

      {!canEdit ? (
        <p className="border-border bg-muted/30 rounded-xl border p-4 text-sm">
          Read-only access: resource content, private destinations and lifecycle
          state are visible, but mutation controls are unavailable.
        </p>
      ) : null}

      {notice ? (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`rounded-xl border p-4 text-sm ${noticeClassNames[notice.tone]}`}
        >
          <div className="flex min-h-11 items-center justify-between gap-3">
            <p>{notice.message}</p>
            <Button
              type="button"
              size="sm"
              shape="icon"
              variant="ghost"
              aria-label="Dismiss operation report"
              onClick={() => setNotice(null)}
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {notice.failures?.length ? (
            <ul
              className="mt-2 space-y-1 font-mono text-xs"
              aria-label="Failed resource IDs"
            >
              {notice.failures.map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <DataTable
        data={records}
        columns={columns}
        filters={FILTERS}
        getRowId={(resource) => resource._id}
        state={tableState}
        status={!isReady ? "loading" : status}
        error={loadError}
        onRetry={refresh}
        config={{
          isSearchProcessed: true,
          isSortProcessed: true,
          isFilterProcessed: true,
          isPaginationProcessed: true,
          pageSizeOptions: [10, 20, 50],
        }}
        selection={
          canEdit
            ? {
                mode: "multiple",
                selectedIds,
                onChange: ({ selectedIds: ids }) => setSelectedIds(ids),
                isRowSelectable: () => !busy,
                preserveAcrossPages: true,
                preserveAcrossQueries: false,
                getRowLabel: (resource) => resource.title,
              }
            : false
        }
        bulkActions={
          canEdit
            ? ({ selectedRows }) => {
                const active = selectedRows.filter(
                  (resource) => !resource.is_deleted
                );
                const deleted = selectedRows.filter(
                  (resource) => resource.is_deleted
                );
                return (
                  <div className="flex flex-wrap gap-2">
                    {active.some((resource) => resource.is_private) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void applyBulk("make_public", active)}
                      >
                        Make public
                      </Button>
                    ) : null}
                    {active.some((resource) => !resource.is_private) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void applyBulk("make_private", active)}
                      >
                        Make private
                      </Button>
                    ) : null}
                    {active.length ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive"
                        disabled={busy}
                        onClick={() => void applyBulk("soft_delete", active)}
                      >
                        Move to deleted
                      </Button>
                    ) : null}
                    {deleted.length ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void applyBulk("restore", deleted)}
                      >
                        Restore selected
                      </Button>
                    ) : null}
                    {canPermanentDelete && deleted.length ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                          void applyBulk("permanent_delete", deleted)
                        }
                      >
                        Permanently delete
                      </Button>
                    ) : null}
                  </div>
                );
              }
            : undefined
        }
        caption="Project resource administration table"
        searchPlaceholder="Search resource title, URL or description"
        emptyTitle="No project resources found"
        emptyDescription={
          canEdit
            ? "Create a resource or adjust the URL-backed search and filters."
            : "Adjust the URL-backed search and filters."
        }
      />

      {editor ? (
        <ProjectResourceEditor
          resource={editor.mode === "edit" ? editor.resource : null}
          onClose={closeEditor}
          onSave={saveEditor}
        />
      ) : null}
    </div>
  );
};

export default ProjectResourceWorkspace;
