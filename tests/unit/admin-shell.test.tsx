// @vitest-environment jsdom

import AdminShell from "@/components/admin/admin-shell";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/admin",
  refresh: vi.fn(),
  replace: vi.fn(),
  refreshToken: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}));

vi.mock("@/services/auth.service", () => ({
  refreshToken: mocks.refreshToken,
  signOut: mocks.signOut,
}));

vi.mock("@/components/ui/theme-switcher", () => ({
  default: () => <button type="button">Theme</button>,
}));

const user = {
  id: "507f1f77bcf86cd799439011",
  name: "Admin Operator",
  role: "admin" as const,
  is_verified: true,
  capabilities: [
    "admin:access",
    "dashboard:read",
    "site:read",
    "content:read",
  ] as const,
  access_expires_at: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
};

const renderShell = () =>
  render(
    <AdminShell
      user={user}
      environment="preview"
      siteState={{
        configured: true,
        published: true,
        draftRevision: 4,
        publishedRevision: 3,
      }}
    >
      <h1>Dashboard content</h1>
    </AdminShell>
  );

describe("AdminShell", () => {
  beforeEach(() => {
    mocks.pathname = "/admin";
    mocks.refresh.mockReset();
    mocks.replace.mockReset();
    window.localStorage.clear();
  });

  afterEach(cleanup);

  it("renders only working capability-authorized navigation and context", () => {
    renderShell();

    expect(
      screen.getAllByRole("link", { name: "Projects" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Articles" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Site settings" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Pages" }).length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Preview")).toBeVisible();
    expect(screen.getByText("Published r3")).toBeVisible();
    expect(screen.getByRole("main")).toHaveTextContent("Dashboard content");
    expect(
      screen.queryByRole("link", { name: "Contact inbox" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Audit log" })
    ).not.toBeInTheDocument();
  });

  it("registers the contact inbox only for inbox operators", () => {
    render(
      <AdminShell
        user={{
          ...user,
          capabilities: [...user.capabilities, "inbox:manage"],
        }}
        environment="preview"
        siteState={{ configured: true, published: false }}
      >
        <h1>Inbox content</h1>
      </AdminShell>
    );

    expect(
      screen.getAllByRole("link", { name: "Contact inbox" })
    ).not.toHaveLength(0);
  });

  it("registers the audit log only for audit readers", () => {
    render(
      <AdminShell
        user={{
          ...user,
          capabilities: [...user.capabilities, "audit:read"],
        }}
        environment="preview"
        siteState={{ configured: true, published: false }}
      >
        <h1>Audit content</h1>
      </AdminShell>
    );

    expect(screen.getAllByRole("link", { name: "Audit log" })).not.toHaveLength(
      0
    );
  });

  it("persists the desktop sidebar preference", async () => {
    const userEventApi = userEvent.setup();
    renderShell();

    await userEventApi.click(
      screen.getByRole("button", { name: "Collapse sidebar" })
    );
    expect(window.localStorage.getItem("portfolio:admin-sidebar")).toBe(
      "collapsed"
    );
    expect(
      screen.getByRole("button", { name: "Expand sidebar" })
    ).toBeVisible();
  });

  it("traps the mobile navigation lifecycle and restores trigger focus", async () => {
    const userEventApi = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole("button", {
      name: "Open admin navigation",
    });
    trigger.focus();
    await userEventApi.keyboard("{Enter}");

    expect(screen.getByRole("dialog", { name: "Portfolio OS" })).toBeVisible();
    await userEventApi.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
