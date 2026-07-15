"use client";

import ThemeSwitcher from "@/components/ui/theme-switcher";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/auth.service";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText,
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
import { useState } from "react";

const adminNavLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Projects", href: "/admin/projects", icon: Briefcase },
  { name: "Articles", href: "/admin/articles", icon: FileText },
  { name: "Settings", href: "/admin/settings", icon: Settings },
] as const;

type AdminShellProps = {
  children: ReactNode;
  user: TJwtPayload & { role: "super-admin" | "admin" };
};

const isActivePath = (pathname: string, href: string) =>
  href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

const AdminShell = ({ children, user }: AdminShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setSignOutError("");

    try {
      await signOut();
      router.replace("/admin/signin");
      router.refresh();
    } catch {
      setSignOutError("Sign out failed. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="bg-muted/30 flex min-h-screen">
      <aside
        className={cn(
          "bg-card border-border hidden flex-col border-r transition-[width] duration-300 lg:flex",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="border-border flex h-16 items-center justify-between border-b px-6">
          <span
            className={cn(
              "text-xl font-bold tracking-tight transition-opacity",
              !isSidebarOpen && "sr-only"
            )}
          >
            Admin<span className="text-primary">Panel</span>
          </span>
          <button
            type="button"
            onClick={() => setIsSidebarOpen((open) => !open)}
            className="hover:bg-muted rounded-lg p-1 transition-colors"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="size-5" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-2 p-4" aria-label="Admin navigation">
          {adminNavLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.name}
                href={link.href}
                aria-current={
                  isActivePath(pathname, link.href) ? "page" : undefined
                }
                title={!isSidebarOpen ? link.name : undefined}
                className={cn(
                  "flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActivePath(pathname, link.href)
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className={cn(!isSidebarOpen && "sr-only")}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-border border-t p-4">
          {signOutError && (
            <p className="text-destructive mb-2 text-xs" role="alert">
              {signOutError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60"
            title={!isSidebarOpen ? "Sign out" : undefined}
          >
            {isSigningOut ? (
              <LoaderCircle
                className="size-5 shrink-0 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <LogOut className="size-5 shrink-0" aria-hidden="true" />
            )}
            <span className={cn(!isSidebarOpen && "sr-only")}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-border bg-card flex h-16 items-center justify-between border-b px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="hover:bg-muted rounded-lg p-2 lg:hidden"
            aria-label="Open admin navigation"
            aria-expanded={isMobileOpen}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <div className="flex-1 px-4 lg:px-0" />

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <div className="border-border flex items-center gap-3 border-l pl-4">
              <div className="hidden max-w-48 text-right sm:block">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="text-muted-foreground text-xs">{user.role}</p>
              </div>
              <div
                className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl text-sm font-bold"
                aria-hidden="true"
              >
                {initials || "A"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="bg-card border-border relative flex h-full w-64 flex-col border-r p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-xl font-bold">
                Admin<span className="text-primary">Panel</span>
              </span>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close admin navigation"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            <nav
              className="flex-1 space-y-2"
              aria-label="Mobile admin navigation"
            >
              {adminNavLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    aria-current={
                      isActivePath(pathname, link.href) ? "page" : undefined
                    }
                    className={cn(
                      "flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium",
                      isActivePath(pathname, link.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
            {signOutError && (
              <p className="text-destructive mb-2 text-xs" role="alert">
                {signOutError}
              </p>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-destructive hover:bg-destructive/10 mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60"
            >
              {isSigningOut ? (
                <LoaderCircle
                  className="size-5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <LogOut className="size-5" aria-hidden="true" />
              )}
              Sign out
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminShell;
