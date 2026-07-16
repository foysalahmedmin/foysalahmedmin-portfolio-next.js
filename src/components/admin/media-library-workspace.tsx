"use client";

import MediaMetadataEditor from "@/components/admin/media-metadata-editor";
import MediaUploadDialog from "@/components/admin/media-upload-dialog";
import { Button } from "@/components/ui/button";
import DataTable, {
  type TColumn,
  type TDataTableBulkActionContext,
  type TDataTableState,
  type TDataTableStatus,
} from "@/components/ui/data-table";
import { FormControl } from "@/components/ui/form-control";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import OptimizedMedia from "@/components/ui/optimized-media";
import { Pagination } from "@/components/ui/pagination";
import {
  StatusBadge,
  type TStatusBadgeTone,
} from "@/components/ui/status-badge";
import {
  DEFAULT_MEDIA_LIBRARY_QUERY,
  getMediaReferenceCount,
  isMediaPermanentlyDeletable,
  isMediaRestorable,
  isMediaSoftDeletable,
  MEDIA_LIBRARY_PAGE_SIZES,
  MEDIA_LIBRARY_SORT_OPTIONS,
  MEDIA_METADATA_ISSUES,
  MEDIA_PURPOSE_OPTIONS,
  normalizeMediaLibraryQuery,
  type MediaLibraryFilterKey,
  type MediaLibraryQuery,
} from "@/lib/admin/media-library";
import { cn } from "@/lib/utils";
import {
  getAdminMedia,
  permanentlyDeleteAdminMedia,
  restoreAdminMedia,
  softDeleteAdminMedia,
  updateAdminMediaStatus,
  type MediaBulkMutationResult,
} from "@/services/media-admin.service";
import type { TFilePopulated } from "@/types/file.type";
import {
  Archive,
  CheckCircle2,
  Edit3,
  FileText,
  Grid3X3,
  ImageIcon,
  List,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = Readonly<{ canPermanentDelete: boolean }>;
type ViewMode = "table" | "grid";
type Notice = Readonly<{
  tone: "success" | "warning" | "error";
  message: string;
}>;

const noticeClassNames: Record<Notice["tone"], string> = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

const FILTERS: readonly Readonly<{
  id: MediaLibraryFilterKey;
  label: string;
  allLabel: string;
  options: readonly { value: string; label: string }[];
}>[] = [
  {
    id: "provider",
    label: "Provider",
    allLabel: "All providers",
    options: [
      { value: "cloudinary", label: "Cloudinary" },
      { value: "gcs", label: "Google Cloud" },
      { value: "local", label: "Legacy local" },
    ],
  },
  {
    id: "purpose",
    label: "Purpose",
    allLabel: "All purposes",
    options: MEDIA_PURPOSE_OPTIONS,
  },
  {
    id: "access",
    label: "Access",
    allLabel: "All access",
    options: [
      { value: "public", label: "Public" },
      { value: "private", label: "Private" },
    ],
  },
  {
    id: "lifecycle_state",
    label: "Lifecycle",
    allLabel: "All lifecycle states",
    options: [
      { value: "ready", label: "Ready" },
      { value: "uploading", label: "Uploading" },
      { value: "orphaned", label: "Orphaned" },
      { value: "deleting", label: "Deleting" },
      { value: "error", label: "Error" },
      { value: "delete_failed", label: "Legacy delete failed" },
    ],
  },
  {
    id: "metadata_status",
    label: "Metadata health",
    allLabel: "All metadata health",
    options: [
      { value: "complete", label: "Complete" },
      { value: "incomplete", label: "Incomplete" },
    ],
  },
  {
    id: "metadata_missing",
    label: "Missing field",
    allLabel: "Any metadata issue",
    options: MEDIA_METADATA_ISSUES.map((issue) => ({
      value: issue,
      label: issue.replaceAll("_", " "),
    })),
  },
  {
    id: "deleted_scope",
    label: "Deleted records",
    allLabel: "Active records only",
    options: [
      { value: "with_deleted", label: "Include deleted" },
      { value: "only_deleted", label: "Deleted only" },
    ],
  },
] as const;

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

const humanize = (value: string | undefined, fallback = "Not recorded") =>
  value ? value.replaceAll("_", " ").replaceAll("-", " ") : fallback;

const getLifecycleTone = (file: TFilePopulated): TStatusBadgeTone => {
  if (file.is_deleted) return "destructive";
  if (file.lifecycle_state === "ready") return "success";
  if (file.lifecycle_state === "uploading") return "info";
  if (
    ["orphaned", "error", "delete_failed"].includes(file.lifecycle_state || "")
  ) {
    return "warning";
  }
  return "neutral";
};

const MediaPreview = ({ file }: { file: TFilePopulated }) => {
  const image =
    file.metadata?.file_type === "image" || file.mimetype.startsWith("image/");
  const canDeliverInline =
    image && file.access === "public" && Boolean(file.url);

  return (
    <div
      className="bg-muted relative grid aspect-video w-full place-items-center overflow-hidden rounded-xl"
      style={
        file.dominant_color
          ? { backgroundColor: file.dominant_color }
          : undefined
      }
    >
      {canDeliverInline ? (
        <OptimizedMedia
          src={file.url}
          alt={file.is_decorative ? "" : file.alt_text || file.name || ""}
          fallback="project"
          className="object-cover"
          style={
            file.focal_point
              ? {
                  objectPosition: `${file.focal_point.x * 100}% ${file.focal_point.y * 100}%`,
                }
              : undefined
          }
        />
      ) : image ? (
        <ImageIcon
          aria-hidden="true"
          className="text-muted-foreground size-8"
        />
      ) : (
        <FileText aria-hidden="true" className="text-muted-foreground size-8" />
      )}
      {file.access === "private" && (
        <span className="bg-background/90 text-foreground absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase">
          <LockKeyhole aria-hidden="true" className="size-3" />
          Private
        </span>
      )}
    </div>
  );
};

const MediaLibraryWorkspace = ({ canPermanentDelete }: Props) => {
  const [query, setQuery] = useState<MediaLibraryQuery>(
    DEFAULT_MEDIA_LIBRARY_QUERY
  );
  const [searchInput, setSearchInput] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [files, setFiles] = useState<TFilePopulated[]>([]);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<TDataTableStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedFileCache = useRef(new Map<string, TFilePopulated>());
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<TFilePopulated | null>(null);
  const [permanentCandidates, setPermanentCandidates] = useState<
    TFilePopulated[]
  >([]);
  const [permanentConfirmation, setPermanentConfirmation] = useState("");

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    selectedFileCache.current.clear();
  }, []);

  const updateQuery = useCallback(
    (patch: Partial<MediaLibraryQuery>) => {
      setQuery((current) =>
        normalizeMediaLibraryQuery({ ...current, ...patch })
      );
      clearSelection();
    },
    [clearSelection]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const search = searchInput.trim().slice(0, 100);
      if (search !== query.search) updateQuery({ search, page: 1 });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query.search, searchInput, updateQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setStatus("loading");
      setLoadError(null);
      try {
        const response = await getAdminMedia(query, {
          signal: controller.signal,
        });
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load managed media.");
        }
        setFiles(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setStatistics(response.meta?.statistics ?? {});
        setStatus("success");
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error && error.message
            ? error.message
            : "Failed to load managed media."
        );
        setStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, [query, refreshKey]);

  const setSelection = useCallback(
    (ids: readonly string[], visibleRows: readonly TFilePopulated[] = []) => {
      const normalized = Array.from(new Set(ids));
      visibleRows.forEach((file) =>
        selectedFileCache.current.set(file._id, file)
      );
      Array.from(selectedFileCache.current.keys()).forEach((id) => {
        if (!normalized.includes(id)) selectedFileCache.current.delete(id);
      });
      setSelectedIds(normalized);
    },
    []
  );

  const selectedFiles = useCallback(
    () =>
      selectedIds
        .map(
          (id) =>
            files.find((file) => file._id === id) ||
            selectedFileCache.current.get(id)
        )
        .filter((file): file is TFilePopulated => Boolean(file)),
    [files, selectedIds]
  );

  const dropSucceededSelection = useCallback(
    (
      candidates: readonly TFilePopulated[],
      result: MediaBulkMutationResult
    ) => {
      const retained = new Set([
        ...result.not_found_ids,
        ...(result.failed_ids ?? []),
      ]);
      const succeeded = new Set(
        candidates
          .filter((file) => !retained.has(file._id))
          .map((file) => file._id)
      );
      setSelection(selectedIds.filter((id) => !succeeded.has(id)));
    },
    [selectedIds, setSelection]
  );

  const completeBulkMutation = useCallback(
    (input: {
      label: string;
      candidates: readonly TFilePopulated[];
      skipped: number;
      result: MediaBulkMutationResult;
    }) => {
      dropSucceededSelection(input.candidates, input.result);
      const failed =
        input.result.not_found_ids.length +
        (input.result.failed_ids?.length ?? 0);
      setNotice({
        tone: failed || input.skipped ? "warning" : "success",
        message: `${input.result.count} ${input.label}${input.result.count === 1 ? "" : "s"} completed${input.skipped ? `; ${input.skipped} ineligible selection${input.skipped === 1 ? " was" : "s were"} skipped` : ""}${failed ? `; ${failed} could not be completed and remain selected` : ""}.`,
      });
      refresh();
    },
    [dropSucceededSelection, refresh]
  );

  const applyStatus = useCallback(
    async (nextStatus: "active" | "inactive" | "archived") => {
      const selected = selectedFiles();
      const candidates = selected.filter((file) => !file.is_deleted);
      if (!candidates.length || busyIds.length) return;
      setBusyIds(candidates.map(({ _id }) => _id));
      setNotice(null);
      try {
        const response = await updateAdminMediaStatus(
          candidates.map(({ _id }) => _id),
          nextStatus
        );
        completeBulkMutation({
          label: `${nextStatus} status update`,
          candidates,
          skipped: selected.length - candidates.length,
          result: response.data,
        });
      } catch (error) {
        setNotice({
          tone: "error",
          message:
            error instanceof Error && error.message
              ? error.message
              : "Bulk status update failed.",
        });
      } finally {
        setBusyIds([]);
      }
    },
    [busyIds.length, completeBulkMutation, selectedFiles]
  );

  const softDelete = useCallback(
    async (requested?: readonly TFilePopulated[]) => {
      const selected = requested ? [...requested] : selectedFiles();
      const candidates = selected.filter(isMediaSoftDeletable);
      if (!candidates.length || busyIds.length) return;
      const skipped = selected.length - candidates.length;
      if (
        !window.confirm(
          `Move ${candidates.length} unreferenced media record${candidates.length === 1 ? "" : "s"} to deleted records?${skipped ? ` ${skipped} referenced or non-ready selection${skipped === 1 ? " will" : "s will"} be skipped.` : ""}`
        )
      ) {
        return;
      }
      setBusyIds(candidates.map(({ _id }) => _id));
      setNotice(null);
      try {
        const response = await softDeleteAdminMedia(
          candidates.map(({ _id }) => _id)
        );
        completeBulkMutation({
          label: "soft delete",
          candidates,
          skipped,
          result: response.data,
        });
      } catch (error) {
        setNotice({
          tone: "error",
          message:
            error instanceof Error && error.message
              ? error.message
              : "Soft deletion failed. The assets remain available.",
        });
      } finally {
        setBusyIds([]);
      }
    },
    [busyIds.length, completeBulkMutation, selectedFiles]
  );

  const restore = useCallback(
    async (requested?: readonly TFilePopulated[]) => {
      const selected = requested ? [...requested] : selectedFiles();
      const candidates = selected.filter(isMediaRestorable);
      if (!candidates.length || busyIds.length) return;
      setBusyIds(candidates.map(({ _id }) => _id));
      setNotice(null);
      try {
        const response = await restoreAdminMedia(
          candidates.map(({ _id }) => _id)
        );
        completeBulkMutation({
          label: "restore",
          candidates,
          skipped: selected.length - candidates.length,
          result: response.data,
        });
      } catch (error) {
        setNotice({
          tone: "error",
          message:
            error instanceof Error && error.message
              ? error.message
              : "Restore failed.",
        });
      } finally {
        setBusyIds([]);
      }
    },
    [busyIds.length, completeBulkMutation, selectedFiles]
  );

  const requestPermanentDelete = useCallback(
    (requested?: readonly TFilePopulated[]) => {
      if (!canPermanentDelete || busyIds.length) return;
      const candidates = (requested ? [...requested] : selectedFiles()).filter(
        isMediaPermanentlyDeletable
      );
      if (!candidates.length) return;
      setPermanentCandidates(candidates);
      setPermanentConfirmation("");
    },
    [busyIds.length, canPermanentDelete, selectedFiles]
  );

  const permanentlyDelete = async () => {
    if (
      !canPermanentDelete ||
      !permanentCandidates.length ||
      permanentConfirmation !== "DELETE" ||
      busyIds.length
    ) {
      return;
    }
    const candidates = [...permanentCandidates];
    setBusyIds(candidates.map(({ _id }) => _id));
    setNotice(null);
    try {
      const response = await permanentlyDeleteAdminMedia(
        candidates.map(({ _id }) => _id)
      );
      completeBulkMutation({
        label: "permanent deletion",
        candidates,
        skipped: 0,
        result: response.data,
      });
      setPermanentCandidates([]);
      setPermanentConfirmation("");
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Permanent deletion failed. Retry only after reviewing storage state.",
      });
    } finally {
      setBusyIds([]);
    }
  };

  const isBusy = busyIds.length > 0;

  const renderBulkActions = useCallback(
    (selection: readonly TFilePopulated[]) => {
      const hasActive = selection.some((file) => !file.is_deleted);
      const hasDeletable = selection.some(isMediaSoftDeletable);
      const hasRestorable = selection.some(isMediaRestorable);
      const hasPermanent = selection.some(isMediaPermanentlyDeletable);
      return (
        <>
          {hasActive && (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isBusy}
                onClick={() => void applyStatus("active")}
              >
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Activate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isBusy}
                onClick={() => void applyStatus("inactive")}
              >
                Mark inactive
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isBusy}
                onClick={() => void applyStatus("archived")}
              >
                <Archive aria-hidden="true" className="size-4" />
                Archive
              </Button>
            </>
          )}
          {hasDeletable && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isBusy}
              onClick={() => void softDelete()}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Soft delete
            </Button>
          )}
          {hasRestorable && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => void restore()}
            >
              <Undo2 aria-hidden="true" className="size-4" />
              Restore
            </Button>
          )}
          {canPermanentDelete && hasPermanent && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isBusy}
              onClick={() => requestPermanentDelete()}
            >
              Permanently delete
            </Button>
          )}
        </>
      );
    },
    [
      applyStatus,
      canPermanentDelete,
      isBusy,
      requestPermanentDelete,
      restore,
      softDelete,
    ]
  );

  const RowActions = useCallback(
    ({ file }: { file: TFilePopulated }) => {
      const busy = busyIds.includes(file._id);
      return (
        <div className="flex justify-end gap-1">
          {!file.is_deleted && (
            <Button
              type="button"
              size="sm"
              shape="icon"
              variant="ghost"
              disabled={busy || isBusy}
              aria-label={`Edit metadata for ${file.name || file.filename}`}
              onClick={() => setEditingFile(file)}
            >
              <Edit3 aria-hidden="true" className="size-4" />
            </Button>
          )}
          {!file.is_deleted ? (
            <Button
              type="button"
              size="sm"
              shape="icon"
              variant="ghost"
              disabled={busy || isBusy || !isMediaSoftDeletable(file)}
              aria-label={`Soft delete ${file.name || file.filename}`}
              title={
                getMediaReferenceCount(file)
                  ? `Used by ${getMediaReferenceCount(file)} content reference${getMediaReferenceCount(file) === 1 ? "" : "s"}`
                  : file.lifecycle_state !== "ready"
                    ? "Only ready media can be soft deleted"
                    : "Soft delete"
              }
              onClick={() => void softDelete([file])}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                shape="icon"
                variant="ghost"
                disabled={busy || isBusy || !isMediaRestorable(file)}
                aria-label={`Restore ${file.name || file.filename}`}
                onClick={() => void restore([file])}
              >
                <Undo2 aria-hidden="true" className="size-4" />
              </Button>
              {canPermanentDelete && (
                <Button
                  type="button"
                  size="sm"
                  shape="icon"
                  variant="destructive"
                  disabled={
                    busy || isBusy || !isMediaPermanentlyDeletable(file)
                  }
                  aria-label={`Permanently delete ${file.name || file.filename}`}
                  onClick={() => requestPermanentDelete([file])}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              )}
            </>
          )}
        </div>
      );
    },
    [
      busyIds,
      canPermanentDelete,
      isBusy,
      requestPermanentDelete,
      restore,
      softDelete,
    ]
  );

  const columns = useMemo<readonly TColumn<TFilePopulated>[]>(
    () => [
      {
        id: "asset",
        name: "Asset",
        canHide: false,
        minWidth: "300px",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-24 shrink-0">
              <MediaPreview file={row} />
            </div>
            <div className="min-w-0">
              <p className="max-w-64 truncate text-sm font-bold">
                {row.name || row.filename}
              </p>
              <p className="text-muted-foreground max-w-64 truncate text-xs">
                {row.originalname || row.filename}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {formatBytes(row.size)}
                {row.metadata?.width && row.metadata?.height
                  ? ` · ${row.metadata.width}×${row.metadata.height}`
                  : ""}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "provider",
        name: "Provider",
        accessor: (file) => file.provider,
        minWidth: "120px",
        cell: ({ row }) => (
          <StatusBadge tone="info">{row.provider}</StatusBadge>
        ),
      },
      {
        id: "purpose",
        name: "Purpose",
        accessor: (file) => file.purpose,
        minWidth: "145px",
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge tone="primary">
              {humanize(row.purpose, "Missing")}
            </StatusBadge>
            <p className="text-muted-foreground text-xs">
              {humanize(row.access, "Access missing")}
            </p>
          </div>
        ),
      },
      {
        id: "metadata",
        name: "Metadata",
        accessor: (file) => file.metadata_status,
        minWidth: "165px",
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge
              tone={row.metadata_status === "complete" ? "success" : "warning"}
            >
              {row.metadata_status || "not assessed"}
            </StatusBadge>
            <p className="text-muted-foreground text-xs">
              {row.metadata_missing?.length
                ? `${row.metadata_missing.length} missing field${row.metadata_missing.length === 1 ? "" : "s"}`
                : "No issues reported"}
            </p>
          </div>
        ),
      },
      {
        id: "usage",
        name: "Usage",
        accessor: getMediaReferenceCount,
        minWidth: "125px",
        cell: ({ row }) => {
          const count = getMediaReferenceCount(row);
          return (
            <StatusBadge tone={count ? "info" : "neutral"}>
              {count ? `${count} reference${count === 1 ? "" : "s"}` : "Unused"}
            </StatusBadge>
          );
        },
      },
      {
        id: "lifecycle",
        name: "Lifecycle",
        accessor: (file) => file.lifecycle_state,
        minWidth: "135px",
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge tone={getLifecycleTone(row)}>
              {row.is_deleted
                ? "deleted"
                : humanize(row.lifecycle_state, "legacy ready")}
            </StatusBadge>
            <p className="text-muted-foreground text-xs">
              {humanize(row.status, "Status missing")}
            </p>
          </div>
        ),
      },
      {
        id: "updated_at",
        name: "Updated",
        accessor: (file) => file.updated_at,
        defaultVisible: false,
        minWidth: "130px",
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
        minWidth: "135px",
        cell: ({ row }) => <RowActions file={row} />,
      },
    ],
    [RowActions]
  );

  const tableState: TDataTableState = {
    search: query.search,
    setSearch: (search) => {
      setSearchInput(search);
      updateQuery({ search, page: 1 });
    },
    sort: query.sort,
    setSort: (sort) => updateQuery({ sort, page: 1 }),
    page: query.page,
    setPage: (page) => updateQuery({ page }),
    limit: query.limit,
    setLimit: (limit) => updateQuery({ limit, page: 1 }),
    filters: query.filters,
    setFilters: (filters) =>
      updateQuery({
        filters: filters as MediaLibraryQuery["filters"],
        page: 1,
      }),
    total,
  };

  const pageIds = files.map(({ _id }) => _id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const currentSelectedFiles = selectedFiles();

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
            Managed media
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Media library
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm sm:text-base">
            Provider-neutral uploads, editorial metadata health, usage tracking
            and reference-safe lifecycle operations in one bounded workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={status === "loading"}
            onClick={refresh}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Refresh
          </Button>
          <Button type="button" onClick={() => setUploadOpen(true)}>
            <UploadCloud aria-hidden="true" className="size-4" />
            Upload media
          </Button>
        </div>
      </header>

      <section
        aria-label="Media health summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          { label: "Matching records", value: total, tone: "text-primary" },
          {
            label: "Ready",
            value: statistics.ready ?? 0,
            tone: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Metadata incomplete",
            value: statistics.metadata_incomplete ?? 0,
            tone: "text-amber-700 dark:text-amber-300",
          },
          {
            label: "Referenced",
            value: statistics.referenced ?? 0,
            tone: "text-sky-700 dark:text-sky-300",
          },
        ].map((item) => (
          <article
            key={item.label}
            className="border-border bg-card rounded-2xl border p-4"
          >
            <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {item.label}
            </p>
            <p className={cn("mt-2 text-3xl font-black", item.tone)}>
              {item.value}
            </p>
          </article>
        ))}
      </section>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            noticeClassNames[notice.tone]
          )}
        >
          {notice.message}
        </div>
      )}

      <section
        aria-label="Media library controls"
        className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-5"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_14rem_auto]">
          <label className="relative">
            <span className="sr-only">Search media</span>
            <Search
              aria-hidden="true"
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              type="search"
              value={searchInput}
              maxLength={100}
              placeholder="Search name, filename or description…"
              onChange={(event) => setSearchInput(event.target.value)}
              className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 h-11 w-full rounded-xl border py-2 pr-10 pl-10 text-sm outline-none focus-visible:ring-2"
            />
          </label>
          <label>
            <span className="sr-only">Sort media</span>
            <FormControl
              as="select"
              aria-label="Sort media"
              value={query.sort}
              onChange={(event) =>
                updateQuery({ sort: event.target.value, page: 1 })
              }
            >
              {MEDIA_LIBRARY_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormControl>
          </label>
          <div
            className="border-border flex h-11 rounded-xl border p-1"
            role="group"
            aria-label="Media view"
          >
            <Button
              type="button"
              size="sm"
              variant={view === "table" ? "default" : "ghost"}
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <List aria-hidden="true" className="size-4" />
              Table
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "grid" ? "default" : "ghost"}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <Grid3X3 aria-hidden="true" className="size-4" />
              Grid
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {FILTERS.map((filter) => (
            <label key={filter.id}>
              <span className="sr-only">{filter.label}</span>
              <FormControl
                as="select"
                aria-label={filter.label}
                value={query.filters[filter.id] ?? ""}
                onChange={(event) =>
                  updateQuery({
                    filters: {
                      ...query.filters,
                      [filter.id]: event.target.value || undefined,
                    },
                    page: 1,
                  })
                }
              >
                <option value="">{filter.allLabel}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormControl>
            </label>
          ))}
        </div>

        {(query.search || Object.values(query.filters).some(Boolean)) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setQuery(DEFAULT_MEDIA_LIBRARY_QUERY);
              clearSelection();
            }}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset search and filters
          </Button>
        )}
      </section>

      {view === "table" ? (
        <DataTable
          title="Media records"
          columns={columns}
          data={files}
          getRowId={(file) => file._id}
          state={tableState}
          status={status}
          error={loadError}
          onRetry={refresh}
          config={{
            isSearchProcessed: true,
            isSortProcessed: true,
            isFilterProcessed: true,
            isPaginationProcessed: true,
            isViewSearch: false,
            isViewFilters: false,
            isViewSort: false,
            pageSizeOptions: MEDIA_LIBRARY_PAGE_SIZES,
          }}
          selection={{
            mode: "multiple",
            selectedIds,
            onChange: ({ selectedIds: ids, selectedRows }) =>
              setSelection(ids, selectedRows),
            preserveAcrossPages: true,
            preserveAcrossQueries: false,
            getRowLabel: (file) => file.name || file.filename,
          }}
          bulkActions={({
            selectedRows,
          }: TDataTableBulkActionContext<TFilePopulated>) =>
            renderBulkActions(selectedRows)
          }
          rowClassName={(file) => (file.is_deleted ? "opacity-70" : undefined)}
          caption="Managed media records with metadata and reference health"
          emptyTitle="No media matches this view"
          emptyDescription="Adjust the filters or upload a managed asset."
          tableContainerClassName="max-h-[70dvh]"
        />
      ) : (
        <section
          className="border-border bg-card overflow-hidden rounded-3xl border"
          aria-busy={status === "loading"}
        >
          <div className="border-border flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Media grid</h2>
              <p className="text-muted-foreground text-sm">
                {total} matching records
              </p>
            </div>
            {files.length > 0 && (
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() => {
                    const next = new Set(selectedIds);
                    pageIds.forEach((id) =>
                      allPageSelected ? next.delete(id) : next.add(id)
                    );
                    setSelection(Array.from(next), files);
                  }}
                  className="accent-primary size-4"
                />
                Select this page
              </label>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="border-primary/20 bg-primary/5 flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
              <span
                className="text-primary text-sm font-medium"
                aria-live="polite"
              >
                {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}{" "}
                selected
              </span>
              <div className="flex flex-wrap gap-2">
                {renderBulkActions(currentSelectedFiles)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="sm:ml-auto"
                onClick={clearSelection}
              >
                Clear selection
              </Button>
            </div>
          )}

          {status === "loading" && files.length === 0 ? (
            <div
              className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
              aria-label="Loading media"
            >
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="bg-muted h-64 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : loadError && files.length === 0 ? (
            <div className="p-8 text-center" role="alert">
              <p className="text-destructive">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={refresh}
              >
                Try again
              </Button>
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-bold">No media matches this view</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Adjust the filters or upload a managed asset.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {files.map((file) => {
                const selected = selectedIds.includes(file._id);
                return (
                  <article
                    key={file._id}
                    className={cn(
                      "border-border overflow-hidden rounded-2xl border",
                      selected && "border-primary ring-primary/20 ring-2",
                      file.is_deleted && "opacity-70"
                    )}
                  >
                    <div className="relative">
                      <MediaPreview file={file} />
                      <label className="bg-background/90 absolute top-2 left-2 grid size-11 place-items-center rounded-lg shadow-sm">
                        <span className="sr-only">
                          Select {file.name || file.filename}
                        </span>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const next = new Set(selectedIds);
                            if (selected) next.delete(file._id);
                            else next.add(file._id);
                            setSelection(Array.from(next), [file]);
                          }}
                          className="accent-primary size-4"
                        />
                      </label>
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <h3 className="truncate font-bold">
                          {file.name || file.filename}
                        </h3>
                        <p className="text-muted-foreground truncate text-xs">
                          {file.originalname || file.filename}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge tone="info">{file.provider}</StatusBadge>
                        <StatusBadge tone="primary">
                          {humanize(file.purpose, "missing purpose")}
                        </StatusBadge>
                        <StatusBadge
                          tone={
                            file.metadata_status === "complete"
                              ? "success"
                              : "warning"
                          }
                        >
                          {file.metadata_status || "not assessed"}
                        </StatusBadge>
                      </div>
                      <div className="text-muted-foreground flex items-center justify-between text-xs">
                        <span>{formatBytes(file.size)}</span>
                        <span>
                          {getMediaReferenceCount(file)} reference
                          {getMediaReferenceCount(file) === 1 ? "" : "s"}
                        </span>
                      </div>
                      <RowActions file={file} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            page={query.page}
            limit={query.limit}
            total={total}
            setPage={(page) => updateQuery({ page })}
            setLimit={(limit) => updateQuery({ limit, page: 1 })}
            pageSizeOptions={MEDIA_LIBRARY_PAGE_SIZES}
            disabled={status === "loading"}
          />
        </section>
      )}

      <MediaUploadDialog
        isOpen={uploadOpen}
        setIsOpen={setUploadOpen}
        onUploaded={(uploaded) => {
          setNotice({
            tone: "success",
            message: `${uploaded.length} managed upload${uploaded.length === 1 ? "" : "s"} completed. Review metadata health before attaching assets.`,
          });
          refresh();
        }}
      />

      <MediaMetadataEditor
        file={editingFile}
        setFile={setEditingFile}
        onSaved={(saved) => {
          setFiles((current) =>
            current.map((file) => (file._id === saved._id ? saved : file))
          );
          setNotice({ tone: "success", message: "Media metadata saved." });
          refresh();
        }}
      />

      <Modal
        isOpen={permanentCandidates.length > 0}
        setIsOpen={(open) => {
          if (!open && !isBusy) {
            setPermanentCandidates([]);
            setPermanentConfirmation("");
          }
        }}
        size="sm"
      >
        <ModalBackdrop className="grid p-4">
          <ModalContent>
            <ModalHeader>
              <div>
                <ModalTitle>Permanently delete media</ModalTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  This removes File records and provider objects.
                </p>
              </div>
              <ModalCloseTrigger disabled={isBusy} />
            </ModalHeader>
            <ModalBody className="space-y-4">
              <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm">
                {permanentCandidates.length} already soft-deleted, unreferenced
                asset{permanentCandidates.length === 1 ? "" : "s"} will be
                removed. This cannot be undone.
              </div>
              <label>
                <span className="mb-1 block text-sm font-medium">
                  Type DELETE to confirm
                </span>
                <FormControl
                  value={permanentConfirmation}
                  autoComplete="off"
                  disabled={isBusy}
                  onChange={(event) =>
                    setPermanentConfirmation(event.target.value)
                  }
                />
              </label>
            </ModalBody>
            <ModalFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isBusy}
                onClick={() => {
                  setPermanentCandidates([]);
                  setPermanentConfirmation("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                isLoading={isBusy}
                disabled={permanentConfirmation !== "DELETE"}
                onClick={() => void permanentlyDelete()}
              >
                Permanently delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalBackdrop>
      </Modal>
    </div>
  );
};

export default MediaLibraryWorkspace;
