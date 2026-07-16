"use client";

import {
  CONTACT_DELIVERY_STATUSES,
  CONTACT_STATUSES,
  type TContactDeliveryStatus,
  type TContactStatus,
} from "@/app/api/contacts/contact.type";
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
import { ErrorState, Skeleton } from "@/components/ui/async-state";
import {
  StatusBadge,
  type TStatusBadgeTone,
} from "@/components/ui/status-badge";
import {
  getAdminContactDetail,
  getAdminContacts,
  updateAdminContactStatus,
  type ContactInboxDetail,
  type ContactInboxListItem,
} from "@/services/contact-admin.service";
import { ApiRequestError } from "@/services/api-response";
import { Eye, Inbox, LockKeyhole, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const statusTone: Record<TContactStatus, TStatusBadgeTone> = {
  new: "primary",
  read: "info",
  replied: "success",
  qualified: "success",
  spam: "destructive",
  archived: "neutral",
};

const deliveryTone: Record<TContactDeliveryStatus, TStatusBadgeTone> = {
  queued: "neutral",
  processing: "info",
  delivered: "success",
  retrying: "warning",
  dead_letter: "destructive",
  cancelled: "neutral",
};

const labelFor = (value: string) =>
  value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const formatDateTime = (value: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiRequestError && error.status === 409) {
    return "This inquiry changed in another session. Reload its detail before trying again.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const inboxFilters: readonly TDataTableFilter<ContactInboxListItem>[] = [
  {
    id: "status",
    label: "Inbox status",
    allLabel: "All inbox statuses",
    options: CONTACT_STATUSES.map((status) => ({
      label: labelFor(status),
      value: status,
    })),
  },
  {
    id: "delivery_status",
    label: "Delivery status",
    allLabel: "All delivery statuses",
    options: CONTACT_DELIVERY_STATUSES.map((status) => ({
      label: labelFor(status),
      value: status,
    })),
  },
  {
    id: "retention",
    label: "Privacy lifecycle",
    allLabel: "All active records",
    options: [
      { label: "Retention due", value: "due" },
      { label: "On retention hold", value: "held" },
      { label: "Anonymized", value: "anonymized" },
    ],
  },
];

const ContactInboxWorkspace = () => {
  const [contacts, setContacts] = useState<ContactInboxListItem[]>([]);
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
  const [detail, setDetail] = useState<ContactInboxDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<TContactStatus | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const statusRequest = useRef<AbortController | null>(null);

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
        const response = await getAdminContacts(
          {
            page,
            limit,
            search: search.trim() || undefined,
            sort: sort as
              | "created_at"
              | "-created_at"
              | "updated_at"
              | "-updated_at"
              | "status"
              | "-status",
            status: filters.status as TContactStatus | undefined,
            delivery_status: filters.delivery_status as
              | TContactDeliveryStatus
              | undefined,
            retention: filters.retention as
              | "all"
              | "due"
              | "held"
              | "anonymized"
              | undefined,
          },
          { signal: controller.signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(
            response.message || "The inbox response was invalid."
          );
        }
        setContacts(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setTableStatus("success");
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        setTableError(errorMessage(error, "The contact inbox could not load."));
        setTableStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, [
    filters.delivery_status,
    filters.retention,
    filters.status,
    limit,
    page,
    refreshVersion,
    search,
    sort,
  ]);

  const loadDetail = useCallback(async (id: string) => {
    detailRequest.current?.abort();
    statusRequest.current?.abort();
    statusRequest.current = null;
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelectedId(id);
    setDetail(null);
    setDetailStatus("loading");
    setDetailError(null);
    setStatusError(null);
    setNextStatus(null);
    try {
      const response = await getAdminContactDetail(id, {
        signal: controller.signal,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || "The inquiry detail was invalid.");
      }
      if (detailRequest.current !== controller) return;
      setDetail(response.data);
      setNextStatus(response.data.status);
      setDetailStatus("ready");
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return;
      setDetailError(errorMessage(error, "The inquiry detail could not load."));
      setDetailStatus("error");
    }
  }, []);

  useEffect(
    () => () => {
      detailRequest.current?.abort();
      statusRequest.current?.abort();
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
    statusRequest.current?.abort();
    statusRequest.current = null;
    setSelectedId(null);
    setDetail(null);
    setDetailStatus("idle");
    setDetailError(null);
    setStatusError(null);
    setNextStatus(null);
    setIsUpdatingStatus(false);
  }, []);

  const updateStatus = useCallback(async () => {
    if (!detail || !nextStatus || nextStatus === detail.status) return;
    statusRequest.current?.abort();
    const controller = new AbortController();
    statusRequest.current = controller;
    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      const response = await updateAdminContactStatus(
        detail.id,
        {
          status: nextStatus,
          expected_revision: detail.revision,
        },
        {
          signal: controller.signal,
        }
      );
      if (statusRequest.current !== controller || controller.signal.aborted) {
        return;
      }
      if (!response.success || !response.data) {
        throw new Error(response.message || "The status response was invalid.");
      }
      const updated = response.data;
      setDetail(updated);
      setNextStatus(updated.status);
      setContacts((current) =>
        current.map((contact) =>
          contact.id === updated.id
            ? {
                ...contact,
                status: updated.status,
                delivery_status: updated.delivery_status,
                revision: updated.revision,
                status_changed_at: updated.status_changed_at,
                updated_at: updated.updated_at,
                retention: updated.retention,
                operations: updated.operations,
              }
            : contact
        )
      );
    } catch (error) {
      if (
        controller.signal.aborted ||
        statusRequest.current !== controller ||
        isAbortError(error)
      ) {
        return;
      }
      setStatusError(errorMessage(error, "The inbox status could not update."));
    } finally {
      if (statusRequest.current === controller) {
        statusRequest.current = null;
        setIsUpdatingStatus(false);
      }
    }
  }, [detail, nextStatus]);

  const columns = useMemo<readonly TColumn<ContactInboxListItem>[]>(
    () => [
      {
        id: "sender",
        name: "Sender",
        accessor: (contact) => contact.name,
        isSearchable: true,
        canHide: false,
        minWidth: "210px",
        cell: ({ row: contact }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{contact.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {contact.email_masked}
            </p>
          </div>
        ),
      },
      {
        field: "subject",
        name: "Subject",
        isSearchable: true,
        minWidth: "260px",
        cell: ({ row: contact }) => (
          <span className="line-clamp-2 text-sm">{contact.subject}</span>
        ),
      },
      {
        field: "status",
        name: "Inbox status",
        isSortable: true,
        minWidth: "130px",
        cell: ({ row: contact }) => (
          <StatusBadge tone={statusTone[contact.status]}>
            {labelFor(contact.status)}
          </StatusBadge>
        ),
      },
      {
        field: "delivery_status",
        name: "Delivery",
        minWidth: "130px",
        cell: ({ row: contact }) => (
          <StatusBadge tone={deliveryTone[contact.delivery_status]}>
            {labelFor(contact.delivery_status)}
          </StatusBadge>
        ),
      },
      {
        field: "created_at",
        name: "Received",
        isSortable: true,
        minWidth: "170px",
        cell: ({ row: contact }) => (
          <time
            className="text-muted-foreground text-sm"
            dateTime={contact.created_at ?? undefined}
          >
            {formatDateTime(contact.created_at)}
          </time>
        ),
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        minWidth: "96px",
        cell: ({ row: contact }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`View inquiry from ${contact.name}`}
            onClick={() => openDetail(contact.id)}
          >
            <Eye className="size-4" aria-hidden="true" />
            View
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

  const statusOptions = detail
    ? Array.from(new Set([detail.status, ...detail.allowed_statuses]))
    : [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="type-label text-primary">Secure operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Contact inbox
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Triage portfolio inquiries without exposing message content or raw
            email addresses in the list view.
          </p>
        </div>
        <div className="border-border bg-background flex max-w-md items-start gap-3 rounded-xl border p-4 text-sm">
          <LockKeyhole
            className="text-primary mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            Full personal data is fetched only when an authorized operator opens
            one inquiry.
          </p>
        </div>
      </header>

      <DataTable
        data={contacts}
        columns={columns}
        filters={inboxFilters}
        getRowId={(contact) => contact.id}
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
        caption="Authorized contact inbox"
        searchPlaceholder="Search sender, masked email source, or subject…"
        emptyTitle="No inquiries found"
        emptyDescription="The inbox is empty or no inquiries match the current filters."
        rowClassName={(contact) =>
          contact.status === "new" ? "bg-primary/[0.035]" : undefined
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
          <DrawerContent
            id="contact-inquiry-detail"
            side="end"
            size="xl"
            className="flex flex-col"
          >
            <DrawerHeader>
              <div className="min-w-0 pr-4">
                <p className="type-label text-primary">Authorized detail</p>
                <DrawerTitle className="mt-1 truncate">
                  {detail?.subject ?? "Inquiry detail"}
                </DrawerTitle>
              </div>
              <DrawerCloseTrigger
                aria-label="Close inquiry detail"
                data-initial-focus
              />
            </DrawerHeader>

            <DrawerBody className="flex-1">
              {detailStatus === "loading" ? (
                <div aria-label="Loading inquiry detail" role="status">
                  <span className="sr-only">Loading inquiry detail…</span>
                  <div className="grid gap-4" aria-hidden="true">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-40" />
                    <Skeleton className="h-28" />
                  </div>
                </div>
              ) : detailStatus === "error" && selectedId ? (
                <ErrorState
                  title="Inquiry detail could not be loaded"
                  description={detailError ?? undefined}
                  onRetry={() => void loadDetail(selectedId)}
                />
              ) : detail ? (
                <div className="space-y-7">
                  <section
                    className="border-border bg-surface-subtle rounded-xl border p-5"
                    aria-labelledby="contact-sender-heading"
                  >
                    <h3 id="contact-sender-heading" className="font-bold">
                      Sender
                    </h3>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="type-label text-muted-foreground">
                          Name
                        </dt>
                        <dd className="mt-1 text-sm font-semibold break-words">
                          {detail.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="type-label text-muted-foreground">
                          Email
                        </dt>
                        <dd className="mt-1 text-sm font-semibold break-all">
                          {detail.email}
                        </dd>
                      </div>
                      <div>
                        <dt className="type-label text-muted-foreground">
                          Received
                        </dt>
                        <dd className="mt-1 text-sm">
                          {formatDateTime(detail.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="type-label text-muted-foreground">
                          Delivery
                        </dt>
                        <dd className="mt-1">
                          <StatusBadge
                            tone={deliveryTone[detail.delivery_status]}
                          >
                            {labelFor(detail.delivery_status)}
                          </StatusBadge>
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section aria-labelledby="contact-message-heading">
                    <h3 id="contact-message-heading" className="font-bold">
                      Message
                    </h3>
                    <p className="border-border bg-background mt-3 rounded-xl border p-5 text-sm leading-7 break-words whitespace-pre-wrap">
                      {detail.message}
                    </p>
                  </section>

                  <section
                    className="border-border rounded-xl border p-5"
                    aria-labelledby="contact-status-heading"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 id="contact-status-heading" className="font-bold">
                          Inbox status
                        </h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Only policy-authorized transitions are available.
                        </p>
                      </div>
                      <StatusBadge tone={statusTone[detail.status]}>
                        {labelFor(detail.status)}
                      </StatusBadge>
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label
                        className="grid flex-1 gap-2"
                        htmlFor="contact-next-status"
                      >
                        <span className="type-label text-muted-foreground">
                          Change status
                        </span>
                        <select
                          id="contact-next-status"
                          value={nextStatus ?? detail.status}
                          onChange={(event) =>
                            setNextStatus(event.target.value as TContactStatus)
                          }
                          disabled={
                            isUpdatingStatus ||
                            Boolean(detail.retention.anonymized_at)
                          }
                          className="border-border bg-background focus-visible:ring-ring h-11 rounded-md border px-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-60"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {labelFor(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        onClick={() => void updateStatus()}
                        disabled={
                          !nextStatus ||
                          nextStatus === detail.status ||
                          Boolean(detail.retention.anonymized_at)
                        }
                        isLoading={isUpdatingStatus}
                      >
                        Update status
                      </Button>
                    </div>
                    {detail.retention.anonymized_at ? (
                      <p className="text-muted-foreground mt-3 text-sm">
                        This anonymized record is immutable.
                      </p>
                    ) : null}
                    {statusError ? (
                      <div
                        role="alert"
                        className="border-destructive/30 bg-destructive/5 text-destructive mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                      >
                        <span>{statusError}</span>
                        {detail ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void loadDetail(detail.id)}
                          >
                            <RefreshCw className="size-4" aria-hidden="true" />
                            Reload detail
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                </div>
              ) : (
                <div className="text-muted-foreground flex min-h-56 flex-col items-center justify-center text-center">
                  <Inbox className="mb-3 size-6" aria-hidden="true" />
                  <p>No inquiry selected.</p>
                </div>
              )}
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

export default ContactInboxWorkspace;
