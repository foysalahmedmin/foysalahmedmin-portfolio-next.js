"use client";

import ThemeSwitcher from "@/components/ui/theme-switcher";
import { useDialogFocus } from "@/hooks/ui/use-dialog-focus";
import type { Capability } from "@/lib/auth/capabilities";
import { cn } from "@/lib/utils";
import { refreshToken, signOut } from "@/services/auth.service";
import {
  BookOpenText,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Component,
  FileStack,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type NavLink = Readonly<{
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  capability: Capability;
}>;

const adminNavGroups: ReadonlyArray<
  Readonly<{ label: string; links: readonly NavLink[] }>
> = [
  {
    label: "Overview",
    links: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        capability: "admin:access",
      },
    ],
  },
  {
    label: "Experience",
    links: [
      {
        name: "Site settings",
        href: "/admin/site",
        icon: Globe2,
        capability: "site:read",
      },
      {
        name: "Pages",
        href: "/admin/pages",
        icon: FileStack,
        capability: "site:read",
      },
    ],
  },
  {
    label: "Content",
    links: [
      {
        name: "Projects",
        href: "/admin/projects",
        icon: BriefcaseBusiness,
        capability: "content:read",
      },
      {
        name: "Articles",
        href: "/admin/articles",
        icon: BookOpenText,
        capability: "content:read",
      },
    ],
  },
  {
    label: "System",
    links: [
      {
        name: "Profile settings",
        href: "/admin/settings",
        icon: Settings,
        capability: "admin:access",
      },
      {
        name: "Design system",
        href: "/admin/design-system",
        icon: Component,
        capability: "site:read",
      },
    ],
  },
] as const;

const routeLabels: Readonly<Record<string, string>> = {
  admin: "Dashboard",
  articles: "Articles",
  projects: "Projects",
  site: "Site settings",
  pages: "Pages",
  settings: "Profile settings",
  "design-system": "Design system",
  new: "New record",
  edit: "Edit record",
};

type AdminShellProps = {
  children: ReactNode;
  environment: string;
  siteState: {
    configured: boolean;
    published: boolean;
    draftRevision?: number;
    publishedRevision?: number;
  };
  user: {
    id: string;
    name: string;
    role: "super-admin" | "admin" | "editor" | "author" | "contributor";
    image?: string;
    is_verified: boolean;
    capabilities: readonly Capability[];
    access_expires_at: string;
  };
};

const isActivePath = (pathname: string, href: string) =>
  href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

const environmentLabel = (environment: string) => {
  const normalized = environment.trim().toLowerCase();
  if (normalized === "production") return "Production";
  if (normalized === "preview") return "Preview";
  if (normalized === "test") return "Test";
  return "Development";
};

const navigationFor = (capabilities: readonly Capability[]) =>
  adminNavGroups.flatMap((group) => {
    const links = group.links.filter((link) =>
      capabilities.includes(link.capability)
    );
    return links.length ? [{ ...group, links }] : [];
  });

const AdminNavigation = ({
  collapsed,
  groups,
  pathname,
  onNavigate,
  label,
}: {
  collapsed?: boolean;
  groups: ReturnType<typeof navigationFor>;
  pathname: string;
  onNavigate?: () => void;
  label: string;
}) => (
  <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label={label}>
    {groups.map((group) => (
      <div key={group.label} className="mb-6 last:mb-0">
        <p
          className={cn(
            "text-muted-foreground mb-2 px-3 text-[0.68rem] font-bold tracking-[0.18em] uppercase",
            collapsed && "sr-only"
          )}
        >
          {group.label}
        </p>
        <ul className="space-y-1">
          {group.links.map((link) => {
            const Icon = link.icon;
            const active = isActivePath(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? link.name : undefined}
                  title={collapsed ? link.name : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-[color,background-color,box-shadow] focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className={cn(collapsed && "sr-only")}>
                    {link.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>
);

const AdminShell = ({
  children,
  environment,
  siteState,
  user,
}: AdminShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const mobileDialogRef = useRef<HTMLElement>(null);
  const navGroups = useMemo(
    () => navigationFor(user.capabilities),
    [user.capabilities]
  );
  const pathSegments = pathname.split("/").filter(Boolean);
  const currentTitle =
    [...pathSegments]
      .reverse()
      .map((segment) => routeLabels[segment])
      .find(Boolean) ?? "Administration";

  useDialogFocus({
    active: isMobileOpen,
    containerRef: mobileDialogRef,
    onEscape: () => setIsMobileOpen(false),
  });

  useEffect(() => {
    try {
      setIsSidebarCollapsed(
        window.localStorage.getItem("portfolio:admin-sidebar") === "collapsed"
      );
    } catch {
      // The expanded navigation remains the safe default.
    }
  }, []);

  useEffect(() => setIsMobileOpen(false), [pathname]);

  useEffect(() => {
    const refreshAt =
      new Date(user.access_expires_at).getTime() - Date.now() - 60_000;
    const timer = window.setTimeout(
      async () => {
        try {
          await refreshToken();
          router.refresh();
        } catch {
          router.replace(
            `/admin/signin?returnTo=${encodeURIComponent(pathname)}`
          );
          router.refresh();
        }
      },
      Math.max(0, refreshAt)
    );
    return () => window.clearTimeout(timer);
  }, [pathname, router, user.access_expires_at]);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("portfolio-auth");
    channel.addEventListener("message", (event) => {
      if (event.data?.type === "signout") {
        router.replace("/admin/signin");
        router.refresh();
      }
    });
    return () => channel.close();
  }, [router]);

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const toggleSidebar = () => {
    setIsSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage.setItem(
          "portfolio:admin-sidebar",
          next ? "collapsed" : "expanded"
        );
      } catch {
        // Persistence is optional; the control still works for this session.
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
      router.replace("/admin/signin");
      router.refresh();
    } catch {
      setSignOutError("Sign out failed. No session change was reported.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const signOutControl = (collapsed = false) => (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      aria-label={collapsed ? "Sign out" : undefined}
      title={collapsed ? "Sign out" : undefined}
      className={cn(
        "text-destructive hover:bg-destructive/10 focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60",
        collapsed && "justify-center"
      )}
    >
      {isSigningOut ? (
        <LoaderCircle
          className="size-5 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <LogOut className="size-5 shrink-0" aria-hidden="true" />
      )}
      <span className={cn(collapsed && "sr-only")}>
        {isSigningOut ? "Signing out…" : "Sign out"}
      </span>
    </button>
  );

  return (
    <div className="bg-surface-subtle flex min-h-dvh">
      <a
        href="#admin-main"
        className="bg-background text-foreground focus-visible:ring-ring fixed top-3 left-3 z-[calc(var(--z-modal)+1)] -translate-y-24 rounded-lg px-4 py-3 font-semibold shadow-[var(--shadow-lg)] transition-transform focus-visible:translate-y-0 focus-visible:ring-2"
      >
        Skip to admin content
      </a>

      <aside
        className={cn(
          "bg-card border-border sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] duration-[var(--motion-standard)] lg:flex",
          isSidebarCollapsed ? "w-20" : "w-72"
        )}
      >
        <div className="border-border flex min-h-16 items-center justify-between gap-2 border-b px-4">
          <Link
            href="/admin"
            aria-label={
              isSidebarCollapsed ? "Portfolio administration" : undefined
            }
            className="focus-visible:ring-ring min-w-0 rounded-md focus-visible:ring-2 focus-visible:outline-none"
          >
            <span
              className={cn(
                "block truncate text-sm font-black tracking-[0.14em] uppercase",
                isSidebarCollapsed && "sr-only"
              )}
            >
              Portfolio OS
            </span>
            <span
              className={cn(
                "text-muted-foreground block truncate text-[0.68rem]",
                isSidebarCollapsed && "sr-only"
              )}
            >
              Content &amp; operations
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hover:bg-muted focus-visible:ring-ring grid size-11 shrink-0 place-items-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
            aria-label={
              isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!isSidebarCollapsed}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="size-5" aria-hidden="true" />
            ) : (
              <ChevronLeft className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <AdminNavigation
          collapsed={isSidebarCollapsed}
          groups={navGroups}
          pathname={pathname}
          label="Administration"
        />

        <div className="border-border border-t p-3">
          {signOutError && !isSidebarCollapsed ? (
            <p className="text-destructive mb-2 px-2 text-xs" role="alert">
              {signOutError}
            </p>
          ) : null}
          {signOutControl(isSidebarCollapsed)}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-card/95 sticky top-0 z-[var(--z-sticky)] flex min-h-16 items-center gap-3 border-b px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="hover:bg-muted focus-visible:ring-ring grid size-11 place-items-center rounded-xl focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            aria-label="Open admin navigation"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-admin-navigation"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1">
            <nav aria-label="Breadcrumb" className="hidden sm:block">
              <ol className="text-muted-foreground flex items-center gap-2 text-xs">
                <li>
                  <Link href="/admin" className="hover:text-foreground">
                    Admin
                  </Link>
                </li>
                {pathname !== "/admin" ? (
                  <li aria-current="page" className="truncate">
                    <span aria-hidden="true">/ </span>
                    {currentTitle}
                  </li>
                ) : null}
              </ol>
            </nav>
            <p className="truncate text-sm font-bold sm:mt-0.5">
              {currentTitle}
            </p>
          </div>

          <div className="hidden items-center gap-2 xl:flex">
            <span className="border-border bg-background rounded-full border px-3 py-1 text-[0.68rem] font-bold tracking-wider uppercase">
              {environmentLabel(environment)}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[0.68rem] font-bold tracking-wider uppercase",
                siteState.published
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning"
              )}
            >
              {siteState.published
                ? `Published r${siteState.publishedRevision}`
                : siteState.configured
                  ? `Draft r${siteState.draftRevision}`
                  : "Site not configured"}
            </span>
          </div>

          <ThemeSwitcher />
          <div className="border-border flex items-center gap-3 border-l pl-3">
            <div className="hidden max-w-44 text-right md:block">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs capitalize">
                {user.role.replace("-", " ")}
                {!user.is_verified ? " · unverified" : ""}
              </p>
            </div>
            <div
              className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl text-sm font-black"
              aria-hidden="true"
            >
              {initials || "A"}
            </div>
          </div>
        </header>

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-10"
        >
          {children}
        </main>
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-[var(--z-modal)] lg:hidden">
          <div
            aria-hidden="true"
            className="bg-overlay absolute inset-0 backdrop-blur-sm"
            onMouseDown={() => setIsMobileOpen(false)}
          />
          <aside
            ref={mobileDialogRef}
            id="mobile-admin-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-admin-navigation-title"
            tabIndex={-1}
            className="bg-card border-border relative flex h-dvh w-[min(88vw,20rem)] flex-col border-r shadow-[var(--shadow-lg)]"
          >
            <div className="border-border flex min-h-16 items-center justify-between border-b px-4">
              <div>
                <h2
                  id="mobile-admin-navigation-title"
                  className="text-sm font-black tracking-[0.14em] uppercase"
                >
                  Portfolio OS
                </h2>
                <p className="text-muted-foreground text-xs">
                  {environmentLabel(environment)}
                </p>
              </div>
              <button
                type="button"
                data-initial-focus
                onClick={() => setIsMobileOpen(false)}
                className="hover:bg-muted focus-visible:ring-ring grid size-11 place-items-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Close admin navigation"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <AdminNavigation
              groups={navGroups}
              pathname={pathname}
              onNavigate={() => setIsMobileOpen(false)}
              label="Mobile administration"
            />
            <div className="border-border border-t p-3">
              {signOutError ? (
                <p className="text-destructive mb-2 px-2 text-xs" role="alert">
                  {signOutError}
                </p>
              ) : null}
              {signOutControl()}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default AdminShell;
