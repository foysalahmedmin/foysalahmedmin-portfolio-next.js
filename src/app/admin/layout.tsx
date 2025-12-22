"use client";

import ThemeSwitcher from "@/components/ui/theme-switcher";
import { cn } from "@/lib/utils";
import {
  Bell,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";

const adminNavLinks = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="size-5" />,
  },
  {
    name: "Projects",
    href: "/admin/projects",
    icon: <Briefcase className="size-5" />,
  },
  {
    name: "Articles",
    href: "/admin/articles",
    icon: <FileText className="size-5" />,
  },
  { name: "Users", href: "/admin/users", icon: <Users className="size-5" /> },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: <Settings className="size-5" />,
  },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (pathname === "/admin/signin") return <>{children}</>;

  return (
    <div className="bg-muted/30 flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "bg-card border-border hidden flex-col border-r transition-all duration-300 lg:flex",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="border-border flex h-16 items-center justify-between border-b px-6">
          <span
            className={cn(
              "text-xl font-bold tracking-tight transition-all",
              !isSidebarOpen && "hidden"
            )}
          >
            Admin<span className="text-primary">Panel</span>
          </span>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hover:bg-muted rounded-lg p-1 transition-colors"
          >
            {isSidebarOpen ? (
              <ChevronLeft className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {adminNavLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                pathname === link.href
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex-shrink-0">{link.icon}</div>
              <span
                className={cn("transition-all", !isSidebarOpen && "hidden")}
              >
                {link.name}
              </span>
            </Link>
          ))}
        </nav>

        <div className="border-border border-t p-4">
          <button className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all">
            <LogOut className="size-5" />
            <span className={cn(!isSidebarOpen && "hidden")}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-border bg-card flex h-16 items-center justify-between border-b px-6 lg:px-8">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="hover:bg-muted rounded-lg p-2 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex-1 px-4 lg:px-0">
            {/* Search or breadcrumbs could go here */}
          </div>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <button className="hover:bg-muted relative rounded-full p-2 transition-all">
              <Bell className="text-muted-foreground size-5" />
              <span className="bg-primary absolute top-2 right-2 size-2 rounded-full" />
            </button>
            <div className="border-border flex items-center gap-3 border-l pl-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold">Admin User</p>
                <p className="text-muted-foreground text-xs">super-admin</p>
              </div>
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl font-bold">
                <User className="size-5" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">{children}</main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        >
          <aside
            className="bg-card border-border h-full w-64 border-r p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <span className="text-xl font-bold">
                Admin<span className="text-primary">Panel</span>
              </span>
              <button onClick={() => setIsMobileOpen(false)}>
                <X className="size-6" />
              </button>
            </div>
            <nav className="space-y-2">
              {adminNavLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium",
                    pathname === link.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  {link.icon}
                  <span>{link.name}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
