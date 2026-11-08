"use client";

import ThemeSwitcher from "@/components/ui/theme-switcher";
import { useDialogFocus } from "@/hooks/ui/use-dialog-focus";
import type { Capability } from "@/lib/auth/capabilities";
import {
  buildConsoleCommands,
  CONSOLE_PREFERENCES,
} from "@/lib/palette/console-commands";
import type { PaletteAction } from "@/lib/palette/commands";
import { PALETTE_EVENT, isPaletteShortcut } from "@/lib/palette/shortcut";
import { refreshToken, signOut } from "@/services/auth.service";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EnvironmentChip,
  PublishChip,
  environmentLabel,
  type SiteState,
} from "./shell/chips";
import { isActivePath, navigationFor, type NavGroup } from "./shell/nav";
import { ConsolePath } from "./shell/path";
import { UserMenu } from "./shell/user-menu";

// The palette is the public one; it loads on the first request (or on intent), not with the shell.
const CommandPalette = dynamic(
  () => import("@/components/motion/command-palette"),
  { ssr: false }
);
const preloadPalette = () => void import("@/components/motion/command-palette");

const SIDEBAR_KEY = "portfolio:admin-sidebar";

type AdminShellProps = {
  children: ReactNode;
  environment: string;
  /** Absent when the Site is not configured or the user lacks `site:read`: the publish chip is hidden. */
  siteState?: SiteState;
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

const RailNav = ({
  collapsed,
  groups,
  pathname,
  onNavigate,
  label,
  id,
}: {
  collapsed?: boolean;
  groups: readonly NavGroup[];
  pathname: string;
  onNavigate?: () => void;
  label: string;
  id?: string;
}) => (
  <nav id={id} className="cs-nav" aria-label={label}>
    {groups.map((group) => (
      <div key={group.label} className="cs-nav__group">
        <p className="cs-nav__heading t-eyebrow">{group.label}</p>
        <ul>
          {group.links.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={
                    isActivePath(pathname, link.href) ? "page" : undefined
                  }
                  title={collapsed ? link.name : undefined}
                  onClick={onNavigate}
                  className="cs-nav__link"
                >
                  <Icon className="cs-nav__icon" aria-hidden="true" />
                  <span className="cs-nav__text">{link.name}</span>
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
  const [paletteRequests, setPaletteRequests] = useState(0);
  const [shortcut, setShortcut] = useState("Ctrl K");
  const mobileDialogRef = useRef<HTMLElement>(null);
  const navGroups = useMemo(
    () => navigationFor(user.capabilities),
    [user.capabilities]
  );
  const commands = useMemo(
    () => buildConsoleCommands(user.capabilities),
    [user.capabilities]
  );

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  useDialogFocus({
    active: isMobileOpen,
    containerRef: mobileDialogRef,
    onEscape: closeMobile,
  });

  useEffect(() => {
    try {
      setIsSidebarCollapsed(
        window.localStorage.getItem(SIDEBAR_KEY) === "collapsed"
      );
    } catch {
      // The expanded navigation remains the safe default.
    }
  }, []);

  useEffect(() => closeMobile(), [pathname, closeMobile]);

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

  // Command palette: Cmd/Ctrl+K (and the Search button) ask for it; each request toggles it.
  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.userAgent)) setShortcut("⌘K");
    const request = () => {
      closeMobile();
      setPaletteRequests((count) => count + 1);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      request();
    };
    window.addEventListener(PALETTE_EVENT, request);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(PALETTE_EVENT, request);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMobile]);

  const toggleSidebar = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "expanded");
    } catch {
      // Persistence is optional; the control still works for this session.
    }
  };

  const handleSignOut = useCallback(async () => {
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
  }, [isSigningOut, router]);

  const handlePaletteAction = useCallback(
    (action: PaletteAction) => {
      if (action === "session:signout") void handleSignOut();
    },
    [handleSignOut]
  );

  return (
    <div className="cs-shell">
      <a href="#main-content" className="cs-skip">
        Skip to admin content
      </a>

      <aside className="cs-rail" data-collapsed={isSidebarCollapsed}>
        <div className="cs-rail__head">
          <Link href="/admin" className="cs-brand">
            Portfolio OS
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="cs-iconbtn"
            aria-label={
              isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!isSidebarCollapsed}
            aria-controls="admin-rail-nav"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="cs-icon" aria-hidden="true" />
            ) : (
              <ChevronLeft className="cs-icon" aria-hidden="true" />
            )}
          </button>
        </div>
        <RailNav
          id="admin-rail-nav"
          collapsed={isSidebarCollapsed}
          groups={navGroups}
          pathname={pathname}
          label="Administration"
        />
      </aside>

      <div className="cs-column">
        <header className="cs-topbar">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="cs-iconbtn cs-menu-button"
            aria-label="Open admin navigation"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-admin-navigation"
          >
            <Menu className="cs-icon" aria-hidden="true" />
          </button>

          <ConsolePath pathname={pathname} />

          <div className="cs-topbar__end">
            <EnvironmentChip environment={environment} />
            <PublishChip
              siteState={siteState}
              canReadSite={user.capabilities.includes("site:read")}
            />
            <button
              type="button"
              className="cs-btn"
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
              onClick={() => setPaletteRequests((count) => count + 1)}
              onPointerEnter={preloadPalette}
              onFocus={preloadPalette}
            >
              <Search className="cs-icon" aria-hidden="true" />
              <span className="cs-btn__label">Search</span>
              <kbd className="cs-kbd" aria-hidden="true">
                {shortcut}
              </kbd>
            </button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="cs-btn cs-view-site"
            >
              <span className="cs-btn__label">View site</span>
              <ArrowUpRight className="cs-icon" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <span className="cs-slot">
              <ThemeSwitcher />
            </span>
            <UserMenu
              name={user.name}
              role={user.role}
              verified={user.is_verified}
              signingOut={isSigningOut}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        {signOutError ? (
          <p role="alert" className="cs-alert">
            {signOutError}
          </p>
        ) : null}

        <main id="main-content" tabIndex={-1} className="cs-main">
          {children}
        </main>
      </div>

      {paletteRequests > 0 ? (
        <CommandPalette
          commands={commands}
          requests={paletteRequests}
          preferences={CONSOLE_PREFERENCES}
          onAction={handlePaletteAction}
          label="Search workspaces and actions"
        />
      ) : null}

      {isMobileOpen ? (
        <div className="cs-sheet">
          <div
            aria-hidden="true"
            className="cs-sheet__scrim"
            onMouseDown={closeMobile}
          />
          <aside
            ref={mobileDialogRef}
            id="mobile-admin-navigation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-admin-navigation-title"
            tabIndex={-1}
            className="cs-sheet__panel"
          >
            <div className="cs-rail__head">
              <div>
                <h2
                  id="mobile-admin-navigation-title"
                  className="cs-brand cs-brand--title"
                >
                  Portfolio OS
                </h2>
                <p className="cs-sheet__env t-eyebrow">
                  {environmentLabel(environment)}
                </p>
              </div>
              <button
                type="button"
                data-initial-focus
                onClick={closeMobile}
                className="cs-iconbtn"
                aria-label="Close admin navigation"
              >
                <X className="cs-icon" aria-hidden="true" />
              </button>
            </div>
            <RailNav
              groups={navGroups}
              pathname={pathname}
              onNavigate={closeMobile}
              label="Mobile administration"
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default AdminShell;
