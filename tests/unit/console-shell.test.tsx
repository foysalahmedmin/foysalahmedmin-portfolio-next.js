// @vitest-environment jsdom

import AdminShell from "@/components/admin/admin-shell";
import {
  EnvironmentChip,
  environmentLabel,
  publishChipView,
} from "@/components/admin/shell/chips";
import { getCapabilitiesForRole } from "@/lib/auth/capabilities";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/admin",
  refresh: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  prefetch: vi.fn(),
  refreshToken: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    refresh: mocks.refresh,
    replace: mocks.replace,
    push: mocks.push,
    prefetch: mocks.prefetch,
  }),
}));
vi.mock("@/services/auth.service", () => ({
  refreshToken: mocks.refreshToken,
  signOut: mocks.signOut,
}));
vi.mock("@/components/ui/theme-switcher", () => ({
  default: () => <button type="button">Theme</button>,
}));
vi.mock("@/providers/motion-provider", () => ({
  useMotion: () => ({ setPreference: vi.fn() }),
}));

const base = {
  id: "507f1f77bcf86cd799439011",
  name: "Admin Operator",
  role: "admin" as const,
  is_verified: true,
  capabilities: getCapabilitiesForRole("admin"),
  access_expires_at: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
};

type ShellOverrides = Partial<Parameters<typeof AdminShell>[0]>;

const renderShell = (overrides: ShellOverrides = {}) =>
  render(
    <AdminShell
      user={base}
      environment="preview"
      siteState={{
        configured: true,
        published: true,
        draftRevision: 13,
        publishedRevision: 12,
      }}
      {...overrides}
    >
      <h1>Workspace</h1>
    </AdminShell>
  );

const rail = () => screen.getByRole("navigation", { name: "Administration" });

beforeEach(() => {
  mocks.pathname = "/admin";
  mocks.refreshToken.mockResolvedValue(undefined);
  mocks.signOut.mockResolvedValue(undefined);
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.style.overflow = "";
});

describe("environment chip", () => {
  it("names production, preview and development, defaulting to development", () => {
    expect(environmentLabel("production")).toBe("Production");
    expect(environmentLabel(" Preview ")).toBe("Preview");
    expect(environmentLabel("development")).toBe("Development");
    expect(environmentLabel("test")).toBe("Development");
  });

  it("gives production its own shape: a filled mark and the word, never colour alone", () => {
    const glyph = (environment: string) => {
      const { container } = render(
        <EnvironmentChip environment={environment} />
      );
      const mark = container.querySelector(".status-mark");
      const result = [
        container.querySelector(".cs-chip")?.getAttribute("data-env"),
        mark?.getAttribute("data-glyph"),
        mark?.textContent,
      ];
      cleanup();
      return result;
    };
    expect(glyph("production")).toEqual([
      "production",
      "published",
      "Production",
    ]);
    expect(glyph("preview")).toEqual(["preview", "pending", "Preview"]);
    expect(glyph("development")).toEqual([
      "development",
      "draft",
      "Development",
    ]);
  });
});

describe("publish-state chip", () => {
  it("says review and publish, linked to the Site, when the draft is ahead", () => {
    renderShell();
    const link = screen.getByRole("link", {
      name: "Published r12, draft r13: review and publish",
    });
    expect(link).toHaveAttribute("href", "/admin/site");
    expect(link).toHaveAttribute("data-publish", "ahead");
  });

  it("says only the published revision when draft and published are level", () => {
    renderShell({
      siteState: {
        configured: true,
        published: true,
        draftRevision: 12,
        publishedRevision: 12,
      },
    });
    const chip = screen.getByTestId("publish-chip");
    expect(chip).toHaveAttribute("data-publish", "level");
    expect(chip).toHaveTextContent("Published r12");
    expect(chip).not.toHaveTextContent("draft");
    expect(within(chip).queryByRole("link")).toBeNull();
  });

  it("says Not published when the Site has never been published", () => {
    renderShell({
      siteState: { configured: true, published: false, draftRevision: 1 },
    });
    expect(screen.getByTestId("publish-chip")).toHaveTextContent(
      "Not published"
    );
  });

  it("is hidden when the Site is not configured, absent, or the user cannot read it", () => {
    renderShell({ siteState: { configured: false, published: false } });
    expect(screen.queryByTestId("publish-chip")).toBeNull();
    cleanup();
    renderShell({ siteState: undefined });
    expect(screen.queryByTestId("publish-chip")).toBeNull();
    cleanup();
    renderShell({
      user: { ...base, capabilities: getCapabilitiesForRole("author") },
    });
    expect(screen.queryByTestId("publish-chip")).toBeNull();
  });

  it("derives every variant from the site state alone", () => {
    expect(publishChipView(undefined, true)).toBeNull();
    expect(
      publishChipView({ configured: true, published: false }, false)
    ).toBeNull();
    expect(
      publishChipView({ configured: true, published: false }, true)?.variant
    ).toBe("none");
  });
});

describe("rail", () => {
  it("filters the groups by capability exactly as before", () => {
    renderShell({
      user: { ...base, capabilities: getCapabilitiesForRole("editor") },
    });
    const nav = within(rail());
    expect(nav.getByRole("link", { name: "Case studies" })).toBeInTheDocument();
    expect(
      nav.getByRole("link", { name: "Site settings" })
    ).toBeInTheDocument();
    for (const name of ["Users", "Audit log", "Contact inbox"]) {
      expect(nav.queryByRole("link", { name })).toBeNull();
    }
    expect(nav.queryByText("Inbox")).toBeNull();
  });

  it("marks the current workspace with aria-current, including nested routes", () => {
    mocks.pathname = "/admin/case-studies/edit/507f1f77bcf86cd799439011";
    renderShell();
    const nav = within(rail());
    expect(nav.getByRole("link", { name: "Case studies" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(nav.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current"
    );
    expect(nav.getByRole("link", { name: "Articles" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("collapses and expands from a labelled button, and persists the choice", async () => {
    const ui = userEvent.setup();
    renderShell();
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const aside = rail().closest("aside")!;
    expect(aside).toHaveAttribute("data-collapsed", "false");

    await ui.click(toggle);
    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(aside).toHaveAttribute("data-collapsed", "true");
    expect(window.localStorage.getItem("portfolio:admin-sidebar")).toBe(
      "collapsed"
    );

    await ui.click(expand);
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem("portfolio:admin-sidebar")).toBe(
      "expanded"
    );
  });

  it("restores the stored collapsed state after mount", () => {
    window.localStorage.setItem("portfolio:admin-sidebar", "collapsed");
    renderShell();
    expect(rail().closest("aside")).toHaveAttribute("data-collapsed", "true");
    expect(
      screen.getByRole("button", { name: "Expand sidebar" })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps names, titles and the current page for assistive technology while collapsed", () => {
    window.localStorage.setItem("portfolio:admin-sidebar", "collapsed");
    mocks.pathname = "/admin/articles";
    renderShell();
    const link = within(rail()).getByRole("link", { name: "Articles" });
    expect(link).toHaveAttribute("title", "Articles");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveTextContent("Articles");
  });

  it("works when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const ui = userEvent.setup();
    renderShell();
    await ui.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
      screen.getByRole("button", { name: "Expand sidebar" })
    ).toBeInTheDocument();
  });
});

describe("top bar and landmarks", () => {
  it("keeps the banner, the named navigation and a main target with a skip link", () => {
    renderShell();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(rail()).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(
      screen.getByRole("link", { name: "Skip to admin content" })
    ).toHaveAttribute("href", "#main-content");
    expect(main).toHaveTextContent("Workspace");
  });

  it("shows the route as a Mono system path with the last item current", () => {
    mocks.pathname = "/admin/case-studies/edit/507f1f77bcf86cd799439011";
    renderShell();
    const path = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(path).toHaveTextContent("/admin/case-studies/edit/:id");
    expect(within(path).getByRole("link", { name: "admin" })).toHaveAttribute(
      "href",
      "/admin"
    );
    expect(
      within(path).getByRole("link", { name: "case-studies" })
    ).toHaveAttribute("href", "/admin/case-studies");
    expect(within(path).getByText(":id")).toHaveAttribute(
      "aria-current",
      "page"
    );
    // `edit` is not a route of its own, so it is text, not a dead link
    expect(within(path).queryByRole("link", { name: "edit" })).toBeNull();
  });

  it("opens the public site in a new tab without giving the opener away", () => {
    renderShell();
    const link = screen.getByRole("link", { name: /View site/ });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("puts the account, profile settings and sign out in a user menu", async () => {
    const ui = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole("button", {
      name: "Account menu for Admin Operator",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await ui.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls")!
    )!;
    expect(panel).toBeVisible();
    expect(panel).toHaveTextContent("Admin Operator");
    expect(panel).toHaveTextContent("admin");
    expect(
      within(panel).getByRole("link", { name: "Profile settings" })
    ).toHaveAttribute("href", "/admin/settings");
    expect(
      within(panel).getByRole("button", { name: "Sign out" })
    ).toBeVisible();

    await ui.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});

describe("sign out", () => {
  it("signs out through the existing service and returns to the sign-in page", async () => {
    const ui = userEvent.setup();
    renderShell();
    await ui.click(
      screen.getByRole("button", { name: "Account menu for Admin Operator" })
    );
    await ui.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith("/admin/signin");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("reports a failure without changing the session or the route", async () => {
    mocks.signOut.mockRejectedValue(new Error("network"));
    const ui = userEvent.setup();
    renderShell();
    await ui.click(
      screen.getByRole("button", { name: "Account menu for Admin Operator" })
    );
    await ui.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign out failed. No session change was reported."
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

describe("session", () => {
  const expiresIn = (ms: number) => ({
    user: {
      ...base,
      access_expires_at: new Date(Date.now() + ms).toISOString(),
    },
  });

  it("refreshes the token one minute before expiry and refreshes the route", async () => {
    vi.useFakeTimers();
    renderShell(expiresIn(5 * 60_000));
    await vi.advanceTimersByTimeAsync(4 * 60_000 - 1);
    expect(mocks.refreshToken).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(mocks.refreshToken).toHaveBeenCalledOnce();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("sends the user to sign-in with a return path when the refresh fails", async () => {
    vi.useFakeTimers();
    mocks.pathname = "/admin/articles";
    mocks.refreshToken.mockRejectedValue(new Error("expired"));
    renderShell(expiresIn(30_000));
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.replace).toHaveBeenCalledWith(
      "/admin/signin?returnTo=%2Fadmin%2Farticles"
    );
  });

  it("follows a sign-out from another tab", () => {
    const channels: Array<{ post: (data: unknown) => void }> = [];
    class FakeChannel {
      private listeners: Array<(event: { data: unknown }) => void> = [];
      constructor() {
        channels.push({
          post: (data) => this.listeners.forEach((fn) => fn({ data })),
        });
      }
      addEventListener(_: string, fn: (event: { data: unknown }) => void) {
        this.listeners.push(fn);
      }
      close() {}
    }
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    try {
      renderShell();
      channels[0]!.post({ type: "signout" });
      expect(mocks.replace).toHaveBeenCalledWith("/admin/signin");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("command palette", () => {
  const openWithShortcut = () =>
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

  it("loads only when first asked for, then opens on Ctrl+K with the console set", async () => {
    renderShell();
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => void openWithShortcut());
    const dialog = await screen.findByRole("dialog", {
      name: "Command palette",
    });
    expect(
      within(dialog).getByRole("combobox", {
        name: "Search workspaces and actions",
      })
    ).toBeInTheDocument();
    const options = within(dialog)
      .getAllByRole("option")
      .map((option) => option.textContent ?? "");
    expect(options.some((text) => text.startsWith("New article"))).toBe(true);
    expect(
      options.some((text) => text.startsWith("Review and publish site"))
    ).toBe(true);
    expect(options.some((text) => text.startsWith("Toggle theme"))).toBe(true);
    // the public-site preferences are not offered in the console
    expect(options.some((text) => text.startsWith("3D scene"))).toBe(false);
    expect(options.some((text) => text.startsWith("Motion"))).toBe(false);
  });

  it("opens from the Search button", async () => {
    const ui = userEvent.setup();
    renderShell();
    await ui.click(screen.getByRole("button", { name: /^Search/ }));
    expect(
      await screen.findByRole("dialog", { name: "Command palette" })
    ).toBeInTheDocument();
  });

  it("hides Review and publish and the create actions from users without the capability", async () => {
    renderShell({
      user: { ...base, capabilities: ["admin:access"] },
    });
    act(() => void openWithShortcut());
    const dialog = await screen.findByRole("dialog", {
      name: "Command palette",
    });
    const text = within(dialog)
      .getAllByRole("option")
      .map((option) => option.textContent ?? "");
    expect(text.some((entry) => entry.startsWith("Review and publish"))).toBe(
      false
    );
    expect(text.some((entry) => entry.startsWith("New "))).toBe(false);
    expect(text.some((entry) => entry.startsWith("Sign out"))).toBe(true);
  });

  it("runs sign out through the shell", async () => {
    renderShell();
    act(() => void openWithShortcut());
    const dialog = await screen.findByRole("dialog", {
      name: "Command palette",
    });
    const input = within(dialog).getByRole("combobox");
    fireEvent.change(input, { target: { value: "sign out" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await vi.waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
  });

  it("navigates to a create route", async () => {
    renderShell();
    act(() => void openWithShortcut());
    const dialog = await screen.findByRole("dialog", {
      name: "Command palette",
    });
    const input = within(dialog).getByRole("combobox");
    fireEvent.change(input, { target: { value: "new case study" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mocks.push).toHaveBeenCalledWith("/admin/case-studies/new");
  });
});

describe("mobile sheet", () => {
  it("opens the navigation as a labelled dialog and closes it on a link", async () => {
    const ui = userEvent.setup();
    renderShell();
    await ui.click(
      screen.getByRole("button", { name: "Open admin navigation" })
    );
    const dialog = screen.getByRole("dialog", { name: "Portfolio OS" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      within(dialog).getByRole("navigation", { name: "Mobile administration" })
    ).toBeInTheDocument();
    await ui.click(within(dialog).getByRole("link", { name: "Projects" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
