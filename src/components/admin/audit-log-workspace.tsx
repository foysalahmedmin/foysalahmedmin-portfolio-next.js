"use client";

import {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_TYPES,
  AUDIT_OUTCOMES,
  AUDIT_SOURCES,
  AUDIT_TARGET_TYPES,
  type TAuditAction,
  type TAuditActorType,
  type TAuditOutcome,
  type TAuditSource,
  type TAuditTargetType,
} from "@/app/api/audit-events/audit-event.type";
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
import {
  getAdminAuditEvents,
  type AdminAuditEvent,
} from "@/services/audit-admin.service";
import { useCallback, useEffect, useMemo, useState } from "react";

const MAX_RANGE_DAYS = 90;
const DEFAULT_RANGE_DAYS = 30;

const humanize = (value: string) =>
  value.replaceAll(".", " ").replaceAll("_", " ").replaceAll("-", " ");

const option = (value: string) => ({
  value,
  label: humanize(value).replace(/\b\w/g, (letter) => letter.toUpperCase()),
});

const AUDIT_FILTERS = [
  {
    id: "action",
    label: "Action",
    allLabel: "All actions",
    options: AUDIT_ACTIONS.map(option),
  },
  {
    id: "outcome",
    label: "Outcome",
    allLabel: "All outcomes",
    options: AUDIT_OUTCOMES.map(option),
  },
  {
    id: "source",
    label: "Source",
    allLabel: "All sources",
    options: AUDIT_SOURCES.map(option),
  },
  {
    id: "actor_type",
    label: "Actor",
    allLabel: "All actor types",
    options: AUDIT_ACTOR_TYPES.map(option),
  },
  {
    id: "target_type",
    label: "Target",
    allLabel: "All target types",
    options: AUDIT_TARGET_TYPES.map(option),
  },
] as const satisfies readonly TDataTableFilter<AdminAuditEvent>[];

const QUERY_CONTRACT = {
  defaultSort: "-created_at",
  filters: AUDIT_FILTERS,
  allowedSortKeys: ["created_at"],
} as const;

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const getDefaultRange = (now = new Date()) => {
  const to = new Date(now);
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - DEFAULT_RANGE_DAYS);
  return { from: toDateInput(from), to: toDateInput(to) };
};

export const validateAuditDateRange = (from: string, to: string) => {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  if (
    !from ||
    !to ||
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime())
  ) {
    return "Choose a valid start and end date.";
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return "The start date must not be after the end date.";
  }
  if (toDate.getTime() - fromDate.getTime() > MAX_RANGE_DAYS * 86_400_000) {
    return "Audit queries are limited to a 90-day window.";
  }
  return null;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

const compactIdentifier = (value: string | undefined) => {
  if (!value) return "Not recorded";
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
};

const outcomeTone = (outcome: TAuditOutcome): TStatusBadgeTone => {
  if (outcome === "success") return "success";
  if (outcome === "failure") return "warning";
  return "destructive";
};

const columns: readonly TColumn<AdminAuditEvent>[] = [
  {
    id: "created_at",
    name: "Occurred",
    accessor: (event) => event.created_at,
    cell: ({ row }) => formatDateTime(row.created_at),
    defaultVisible: true,
  },
  {
    id: "action",
    name: "Action",
    field: "action",
    cell: ({ row }) => (
      <span className="font-semibold">{humanize(row.action)}</span>
    ),
    defaultVisible: true,
  },
  {
    id: "outcome",
    name: "Outcome",
    field: "outcome",
    cell: ({ row }) => (
      <StatusBadge tone={outcomeTone(row.outcome)}>{row.outcome}</StatusBadge>
    ),
    defaultVisible: true,
  },
  {
    id: "actor",
    name: "Actor",
    accessor: (event) => event.actor.type,
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium">{humanize(row.actor.type)}</p>
        <p className="text-muted-foreground text-xs">
          {row.actor.role ? `${humanize(row.actor.role)} · ` : ""}
          {compactIdentifier(row.actor.id)}
        </p>
      </div>
    ),
    defaultVisible: true,
  },
  {
    id: "target",
    name: "Target",
    accessor: (event) => event.target.type,
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium">{humanize(row.target.type)}</p>
        <p className="text-muted-foreground font-mono text-xs">
          {compactIdentifier(row.target.id)}
        </p>
      </div>
    ),
    defaultVisible: true,
  },
  {
    id: "summary_code",
    name: "Summary",
    field: "summary_code",
    cell: ({ row }) => (
      <div className="max-w-72 space-y-1">
        <p>{humanize(row.summary_code)}</p>
        {row.changed_fields.length ? (
          <p className="text-muted-foreground text-xs">
            Changed: {row.changed_fields.join(", ")}
          </p>
        ) : null}
      </div>
    ),
    defaultVisible: true,
  },
  {
    id: "source",
    name: "Source",
    field: "source",
    cell: ({ row }) => <StatusBadge>{row.source}</StatusBadge>,
    defaultVisible: false,
  },
  {
    id: "event_id",
    name: "Event ID",
    field: "event_id",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {compactIdentifier(row.event_id)}
      </span>
    ),
    defaultVisible: false,
  },
];

const AuditLogWorkspace = () => {
  const { isReady, state, patchState } =
    useRepeatableAdminQueryState(QUERY_CONTRACT);
  const defaults = useMemo(() => getDefaultRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<TDataTableStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const rangeError = validateAuditDateRange(from, to);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!isReady || rangeError) return;
    const controller = new AbortController();
    const load = async () => {
      setStatus("loading");
      setError(null);
      try {
        const response = await getAdminAuditEvents(
          {
            page: state.page,
            limit: state.limit,
            from: `${from}T00:00:00.000Z`,
            to: `${to}T23:59:59.999Z`,
            action: state.filters.action as TAuditAction | undefined,
            outcome: state.filters.outcome as TAuditOutcome | undefined,
            source: state.filters.source as TAuditSource | undefined,
            actorType: state.filters.actor_type as TAuditActorType | undefined,
            targetType: state.filters.target_type as
              | TAuditTargetType
              | undefined,
          },
          { signal: controller.signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load the audit log");
        }
        setEvents(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setStatus("success");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(
          loadError instanceof Error && loadError.message
            ? loadError.message
            : "Failed to load the audit log"
        );
      }
    };
    void load();
    return () => controller.abort();
  }, [
    from,
    isReady,
    rangeError,
    refreshKey,
    state.filters,
    state.limit,
    state.page,
    to,
  ]);

  const tableState: TDataTableState = {
    page: state.page,
    setPage: (page) => patchState({ page }),
    limit: state.limit,
    setLimit: (limit) => patchState({ limit }, true),
    filters: { ...state.filters },
    setFilters: (filters) => patchState({ filters }, true),
    total,
  };

  const updateRange = (side: "from" | "to", value: string) => {
    if (side === "from") setFrom(value);
    else setTo(value);
    patchState({ page: 1 });
  };

  return (
    <div className="space-y-6">
      <header className="border-border bg-card rounded-2xl border p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <p className="text-primary text-xs font-black tracking-[0.18em] uppercase">
          Governance
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Audit log
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
          Review bounded, privacy-safe administrative events. Session tokens,
          contact contents, secrets, and raw correlation identifiers are never
          returned by this view.
        </p>
      </header>

      <section
        aria-labelledby="audit-range-title"
        className="border-border bg-card rounded-2xl border p-5 shadow-[var(--shadow-sm)]"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 id="audit-range-title" className="text-lg font-black">
              Bounded date window
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Select up to 90 days. Newest events appear first.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              From
              <input
                type="date"
                value={from}
                max={to}
                onChange={(event) => updateRange("from", event.target.value)}
                className="border-input bg-background focus-visible:ring-ring mt-1 block min-h-11 rounded-xl border px-3 focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>
            <label className="text-sm font-semibold">
              To
              <input
                type="date"
                value={to}
                min={from}
                onChange={(event) => updateRange("to", event.target.value)}
                className="border-input bg-background focus-visible:ring-ring mt-1 block min-h-11 rounded-xl border px-3 focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>
          </div>
        </div>
        {rangeError ? (
          <p className="text-destructive mt-3 text-sm" role="alert">
            {rangeError}
          </p>
        ) : null}
      </section>

      <DataTable
        title="Administrative events"
        caption="Privacy-safe administrative audit events"
        columns={columns}
        data={rangeError ? [] : events}
        getRowId={(event) => event.event_id}
        filters={AUDIT_FILTERS}
        state={tableState}
        status={rangeError ? "idle" : status}
        error={error}
        onRetry={refresh}
        selection={false}
        config={{
          isSearchProcessed: true,
          isSortProcessed: true,
          isFilterProcessed: true,
          isPaginationProcessed: true,
          isViewSearch: false,
          isViewSort: false,
          isViewFilters: true,
          isViewPagination: true,
          isViewColumnVisibility: true,
          pageSizeOptions: [10, 20, 50],
        }}
        emptyTitle="No audit events in this window"
        emptyDescription="Adjust the date window or filters to review another bounded event set."
      />
    </div>
  );
};

export default AuditLogWorkspace;
