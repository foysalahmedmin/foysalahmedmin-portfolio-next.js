"use client";

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
import {
  StatusBadge,
  type TStatusBadgeTone,
} from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import {
  getAdminUsers,
  permanentlyDeleteAdminUser,
  restoreAdminUser,
  softDeleteAdminUser,
  updateAdminUser,
  type AdminUser,
  type AdminUserStatus,
} from "@/services/user-admin.service";
import type { TRole } from "@/types/jsonwebtoken.type";
import { ShieldCheck, UserCog, UserRoundX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = Readonly<{
  currentUserId: string;
  actorRole: "super-admin" | "admin";
  canPermanentDelete: boolean;
}>;

type UserDraft = Readonly<{
  role: TRole;
  status: AdminUserStatus;
  is_verified: boolean;
}>;

const ROLES: readonly TRole[] = [
  "super-admin",
  "admin",
  "editor",
  "author",
  "contributor",
  "subscriber",
  "user",
];

const STATUS_OPTIONS: readonly AdminUserStatus[] = ["in-progress", "blocked"];
const PRIVILEGED_ROLES = new Set<TRole>(["super-admin", "admin"]);

const labelFor = (value: string) =>
  value
    .replaceAll("_", " ")
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const userFilters: readonly TDataTableFilter<AdminUser>[] = [
  {
    id: "role",
    label: "Role",
    allLabel: "All roles",
    options: ROLES.map((role) => ({ value: role, label: labelFor(role) })),
  },
  {
    id: "status",
    label: "Account status",
    allLabel: "All account states",
    options: STATUS_OPTIONS.map((status) => ({
      value: status,
      label: labelFor(status),
    })),
  },
  {
    id: "is_verified",
    label: "Verification",
    allLabel: "All verification states",
    options: [
      { value: "true", label: "Verified" },
      { value: "false", label: "Not verified" },
    ],
  },
  {
    id: "deleted_scope",
    label: "Lifecycle",
    allLabel: "Active accounts",
    options: [
      { value: "with_deleted", label: "Active and deleted" },
      { value: "only_deleted", label: "Deleted only" },
    ],
  },
];

const roleTone = (role: TRole): TStatusBadgeTone => {
  if (role === "super-admin") return "destructive";
  if (role === "admin") return "warning";
  if (["editor", "author"].includes(role)) return "info";
  return "neutral";
};

const formatDate = (value: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const draftFor = (user: AdminUser): UserDraft => ({
  role: user.role,
  status: user.status,
  is_verified: user.is_verified,
});

const sameDraft = (user: AdminUser, draft: UserDraft) =>
  user.role === draft.role &&
  user.status === draft.status &&
  user.is_verified === draft.is_verified;

const UserManagementWorkspace = ({
  currentUserId,
  actorRole,
  canPermanentDelete,
}: Props) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tableStatus, setTableStatus] = useState<TDataTableStatus>("loading");
  const [tableError, setTableError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setTableStatus("loading");
      setTableError(null);
      try {
        const response = await getAdminUsers(
          {
            page,
            limit,
            search: search.trim() || undefined,
            sort,
            role: filters.role as TRole | undefined,
            status: filters.status as AdminUserStatus | undefined,
            isVerified:
              filters.is_verified === "true"
                ? true
                : filters.is_verified === "false"
                  ? false
                  : undefined,
            deletedScope: filters.deleted_scope as
              | "with_deleted"
              | "only_deleted"
              | undefined,
          },
          { signal: controller.signal }
        );
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(
            response.message || "The users response was invalid."
          );
        }
        setUsers(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setTableStatus("success");
      } catch (error) {
        if (controller.signal.aborted) return;
        setTableError(errorMessage(error, "User accounts could not load."));
        setTableStatus("error");
      }
    };
    void load();
    return () => controller.abort();
  }, [
    filters.deleted_scope,
    filters.is_verified,
    filters.role,
    filters.status,
    limit,
    page,
    refreshKey,
    search,
    sort,
  ]);

  const openUser = useCallback((user: AdminUser) => {
    setSelected(user);
    setDraft(draftFor(user));
    setMutationError(null);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerChange = useCallback((open: boolean) => {
    setIsDrawerOpen(open);
    if (open) return;
    setSelected(null);
    setDraft(null);
    setMutationError(null);
    setIsMutating(false);
  }, []);

  const isSelf = selected?.id === currentUserId;
  const selectedIsPrivileged = selected
    ? PRIVILEGED_ROLES.has(selected.role)
    : false;
  const canEditSelected = Boolean(
    selected &&
      !selected.is_deleted &&
      !isSelf &&
      (actorRole === "super-admin" || !selectedIsPrivileged)
  );
  const canManageLifecycle = Boolean(
    selected &&
      !isSelf &&
      (actorRole === "super-admin" || !selectedIsPrivileged)
  );
  const assignableRoles =
    actorRole === "super-admin"
      ? ROLES
      : ROLES.filter((role) => !PRIVILEGED_ROLES.has(role));

  const save = async () => {
    if (!selected || !draft || !canEditSelected || sameDraft(selected, draft)) {
      return;
    }
    setIsMutating(true);
    setMutationError(null);
    try {
      const response = await updateAdminUser(selected.id, draft);
      const updated = response.data;
      setSelected(updated);
      setDraft(draftFor(updated));
      setUsers((current) =>
        current.map((user) => (user.id === updated.id ? updated : user))
      );
      setNotice(`${updated.name}'s account controls were updated.`);
    } catch (error) {
      setMutationError(errorMessage(error, "The account could not update."));
    } finally {
      setIsMutating(false);
    }
  };

  const runLifecycle = async (
    operation: "delete" | "restore" | "permanent-delete"
  ) => {
    if (!selected || !canManageLifecycle || isMutating) return;
    const permanent = operation === "permanent-delete";
    if (permanent && !canPermanentDelete) return;
    if (
      operation !== "restore" &&
      !window.confirm(
        permanent
          ? `Permanently delete ${selected.name}? This cannot be undone.`
          : `Deactivate and soft-delete ${selected.name}? Active sessions will be revoked.`
      )
    ) {
      return;
    }
    setIsMutating(true);
    setMutationError(null);
    try {
      if (operation === "restore") await restoreAdminUser(selected.id);
      else if (permanent) await permanentlyDeleteAdminUser(selected.id);
      else await softDeleteAdminUser(selected.id);
      setNotice(
        permanent
          ? `${selected.name}'s deleted account was permanently removed.`
          : operation === "restore"
            ? `${selected.name}'s account was restored.`
            : `${selected.name}'s account was soft-deleted and sessions were revoked.`
      );
      handleDrawerChange(false);
      refresh();
    } catch (error) {
      setMutationError(
        errorMessage(error, `The ${operation.replaceAll("-", " ")} failed.`)
      );
    } finally {
      setIsMutating(false);
    }
  };

  const columns = useMemo<readonly TColumn<AdminUser>[]>(
    () => [
      {
        id: "identity",
        name: "Account",
        accessor: (user) => user.name,
        canHide: false,
        minWidth: "240px",
        cell: ({ row: user }) => (
          <div className="min-w-0">
            <p className="truncate font-bold">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {user.email}
            </p>
          </div>
        ),
      },
      {
        field: "role",
        name: "Role",
        isSortable: true,
        cell: ({ row: user }) => (
          <StatusBadge tone={roleTone(user.role)}>
            {labelFor(user.role)}
          </StatusBadge>
        ),
      },
      {
        field: "status",
        name: "Status",
        isSortable: true,
        cell: ({ row: user }) => (
          <StatusBadge
            tone={user.status === "in-progress" ? "success" : "destructive"}
          >
            {labelFor(user.status)}
          </StatusBadge>
        ),
      },
      {
        field: "is_verified",
        name: "Verified",
        cell: ({ row: user }) => (
          <StatusBadge tone={user.is_verified ? "success" : "warning"}>
            {user.is_verified ? "Verified" : "Not verified"}
          </StatusBadge>
        ),
      },
      {
        field: "created_at",
        name: "Created",
        isSortable: true,
        cell: ({ row: user }) => formatDate(user.created_at),
        defaultVisible: false,
      },
      {
        id: "actions",
        name: "Actions",
        canHide: false,
        align: "end",
        cell: ({ row: user }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openUser(user)}
            aria-label={`Manage ${user.name}`}
          >
            <UserCog className="size-4" aria-hidden="true" />
            Manage
          </Button>
        ),
      },
    ],
    [openUser]
  );

  const tableState = useMemo<TDataTableState>(
    () => ({
      search,
      setSearch,
      sort,
      setSort,
      page,
      setPage,
      limit,
      setLimit,
      filters,
      setFilters,
      total,
    }),
    [filters, limit, page, search, sort, total]
  );

  return (
    <div className="space-y-8">
      <header className="border-border bg-card rounded-2xl border p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-primary text-xs font-black tracking-[0.18em] uppercase">
              Identity and access
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              User management
            </h1>
            <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
              Manage bounded account roles, access state, and verification. Role
              or status changes revoke active sessions on the server.
            </p>
          </div>
          <div className="border-border bg-background flex max-w-md gap-3 rounded-xl border p-4 text-sm">
            <ShieldCheck
              className="text-primary mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <p className="text-muted-foreground">
              Self-escalation, privileged-account changes, and removal of the
              last active super-admin are blocked by backend policy.
            </p>
          </div>
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          className="border-success/30 bg-success/10 rounded-xl border p-4 text-sm"
        >
          {notice}
        </div>
      ) : null}

      <DataTable
        title="Portfolio accounts"
        caption="Capability-gated portfolio user accounts"
        data={users}
        columns={columns}
        filters={userFilters}
        getRowId={(user) => user.id}
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
          pageSizeOptions: [10, 20, 50],
          skeletonRows: 6,
        }}
        searchPlaceholder="Search account name or email…"
        emptyTitle="No accounts found"
        emptyDescription="No accounts match the current search and lifecycle filters."
        rowClassName={(user) =>
          cn(user.is_deleted && "bg-destructive/[0.035] opacity-75")
        }
      />

      <Drawer
        isOpen={isDrawerOpen}
        setIsOpen={handleDrawerChange}
        asPortal
        side="end"
        size="lg"
      >
        <DrawerBackdrop>
          <DrawerContent side="end" size="lg" className="flex flex-col">
            <DrawerHeader>
              <div className="min-w-0 pr-4">
                <p className="text-primary text-xs font-black tracking-[0.18em] uppercase">
                  Account controls
                </p>
                <DrawerTitle className="mt-1 truncate">
                  {selected?.name ?? "User account"}
                </DrawerTitle>
              </div>
              <DrawerCloseTrigger aria-label="Close user management" />
            </DrawerHeader>

            <DrawerBody className="flex-1">
              {selected && draft ? (
                <div className="space-y-6">
                  <section
                    aria-labelledby="managed-user-identity"
                    className="border-border rounded-xl border p-5"
                  >
                    <h3 id="managed-user-identity" className="font-black">
                      Account identity
                    </h3>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground text-xs font-bold uppercase">
                          Email
                        </dt>
                        <dd className="mt-1 break-all">{selected.email}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs font-bold uppercase">
                          Account ID
                        </dt>
                        <dd className="mt-1 font-mono text-xs break-all">
                          {selected.id}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs font-bold uppercase">
                          Created
                        </dt>
                        <dd className="mt-1">
                          {formatDate(selected.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground text-xs font-bold uppercase">
                          Lifecycle
                        </dt>
                        <dd className="mt-1">
                          {selected.is_deleted
                            ? "Soft deleted"
                            : "Active record"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {!selected.is_deleted ? (
                    <section
                      aria-labelledby="managed-user-access"
                      className="border-border rounded-xl border p-5"
                    >
                      <h3 id="managed-user-access" className="font-black">
                        Role and access state
                      </h3>
                      <div className="mt-4 grid gap-4">
                        <label className="grid gap-2 text-sm font-bold">
                          Role
                          <select
                            value={draft.role}
                            disabled={!canEditSelected || isMutating}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                role: event.target.value as TRole,
                              })
                            }
                            className="border-input bg-background focus-visible:ring-ring min-h-11 rounded-xl border px-3 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                          >
                            {!assignableRoles.includes(draft.role) ? (
                              <option value={draft.role}>
                                {labelFor(draft.role)}
                              </option>
                            ) : null}
                            {assignableRoles.map((role) => (
                              <option key={role} value={role}>
                                {labelFor(role)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-2 text-sm font-bold">
                          Account status
                          <select
                            value={draft.status}
                            disabled={!canEditSelected || isMutating}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                status: event.target.value as AdminUserStatus,
                              })
                            }
                            className="border-input bg-background focus-visible:ring-ring min-h-11 rounded-xl border px-3 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {labelFor(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="border-input flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={draft.is_verified}
                            disabled={!canEditSelected || isMutating}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                is_verified: event.target.checked,
                              })
                            }
                            className="accent-primary size-4"
                          />
                          Identity is administratively verified
                        </label>
                      </div>

                      {!canEditSelected ? (
                        <p className="text-muted-foreground mt-4 text-sm">
                          {isSelf
                            ? "Use profile settings for your own identity; self role, status, and verification changes are blocked."
                            : "Only a super-admin can change a privileged account."}
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  {mutationError ? (
                    <div
                      role="alert"
                      className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm"
                    >
                      {mutationError}
                    </div>
                  ) : null}

                  <section
                    aria-labelledby="managed-user-lifecycle"
                    className="border-border rounded-xl border p-5"
                  >
                    <h3 id="managed-user-lifecycle" className="font-black">
                      Account lifecycle
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Backend policy re-checks actor authority, self-action,
                      privileged roles, super-admin continuity, and purge
                      dependencies.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {selected.is_deleted ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!canManageLifecycle || isMutating}
                          onClick={() => void runLifecycle("restore")}
                        >
                          Restore account
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={!canEditSelected || isMutating}
                          onClick={() => void runLifecycle("delete")}
                        >
                          <UserRoundX className="size-4" aria-hidden="true" />
                          Soft delete account
                        </Button>
                      )}
                      {selected.is_deleted && canPermanentDelete ? (
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={!canManageLifecycle || isMutating}
                          onClick={() => void runLifecycle("permanent-delete")}
                        >
                          Permanently delete
                        </Button>
                      ) : null}
                    </div>
                  </section>
                </div>
              ) : null}
            </DrawerBody>

            <DrawerFooter className="flex-wrap justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDrawerChange(false)}
              >
                Close
              </Button>
              {selected && draft && !selected.is_deleted ? (
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={
                    !canEditSelected || sameDraft(selected, draft) || isMutating
                  }
                  isLoading={isMutating}
                >
                  Save access controls
                </Button>
              ) : null}
            </DrawerFooter>
          </DrawerContent>
        </DrawerBackdrop>
      </Drawer>
    </div>
  );
};

export default UserManagementWorkspace;
