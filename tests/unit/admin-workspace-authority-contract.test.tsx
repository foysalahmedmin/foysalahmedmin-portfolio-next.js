// @vitest-environment jsdom

import AdminAuditPage from "@/app/admin/(protected)/audit/page";
import ContactInboxPage from "@/app/admin/(protected)/contacts/page";
import ProjectResourcesPage from "@/app/admin/(protected)/project-resources/page";
import ReviewModerationPage from "@/app/admin/(protected)/reviews/page";
import AdminTaxonomyPage from "@/app/admin/(protected)/taxonomy/page";
import AdminUsersPage from "@/app/admin/(protected)/users/page";
import AdminShell from "@/components/admin/admin-shell";
import { requireAdminSession } from "@/lib/auth/admin-session";
import {
  getAdminApiAuthority,
  getAdminPageCapability,
  getCapabilitiesForRole,
  hasCapability,
  type Capability,
} from "@/lib/auth/capabilities";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/admin",
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({
    refresh: navigationMocks.refresh,
    replace: navigationMocks.replace,
  }),
}));

vi.mock("@/lib/auth/admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/services/auth.service", () => ({
  refreshToken: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/ui/theme-switcher", () => ({
  default: () => <button type="button">Theme</button>,
}));

vi.mock("@/components/admin/contact-inbox-workspace", () => ({
  default: () => <div>Contact inbox workspace</div>,
}));

vi.mock("@/components/admin/review-moderation-workspace", () => ({
  default: () => <div>Review moderation workspace</div>,
}));

vi.mock("@/components/admin/audit-log-workspace", () => ({
  default: () => <div>Audit log workspace</div>,
}));

vi.mock("@/components/admin/user-management-workspace", () => ({
  default: () => <div>User management workspace</div>,
}));

vi.mock("@/components/admin/project-resource-workspace", () => ({
  default: () => <div>Project resource workspace</div>,
}));

vi.mock("@/components/admin/taxonomy-admin-workspace", () => ({
  default: () => <div>Taxonomy workspace</div>,
}));

const session = {
  id: "507f1f77bcf86cd799439011",
  name: "Root Operator",
  role: "super-admin" as const,
  is_verified: true,
  capabilities: getCapabilitiesForRole("super-admin"),
  access_expires_at: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
};

const PAGE_CONTRACTS = [
  {
    name: "Contact inbox",
    path: "/admin/contacts",
    capability: "inbox:manage",
    renderPage: ContactInboxPage,
  },
  {
    name: "Review moderation",
    path: "/admin/reviews",
    capability: "inbox:manage",
    renderPage: ReviewModerationPage,
  },
  {
    name: "Audit log",
    path: "/admin/audit",
    capability: "audit:read",
    renderPage: AdminAuditPage,
  },
  {
    name: "Users",
    path: "/admin/users",
    capability: "users:manage",
    renderPage: AdminUsersPage,
  },
  {
    name: "Project resources",
    path: "/admin/project-resources",
    capability: "content:read",
    renderPage: ProjectResourcesPage,
  },
  {
    name: "Taxonomy",
    path: "/admin/taxonomy",
    capability: "content:read",
    renderPage: AdminTaxonomyPage,
  },
] as const satisfies ReadonlyArray<{
  name: string;
  path: string;
  capability: Capability;
  renderPage: () => Promise<unknown>;
}>;

const SENSITIVE_NAVIGATION = PAGE_CONTRACTS.map(({ name }) => name);

const renderShell = (
  role: "admin" | "editor" | "author",
  capabilities = getCapabilitiesForRole(role)
) =>
  render(
    <AdminShell
      user={{
        id: session.id,
        name: `${role} operator`,
        role,
        is_verified: true,
        capabilities,
        access_expires_at: session.access_expires_at,
      }}
      environment="test"
      siteState={{ configured: true, published: false }}
    >
      <h1>Authorized workspace</h1>
    </AdminShell>
  );

describe("admin workspace page authority contracts", () => {
  beforeEach(() => {
    navigationMocks.pathname = "/admin";
    navigationMocks.refresh.mockReset();
    navigationMocks.replace.mockReset();
    vi.mocked(requireAdminSession).mockReset();
    vi.mocked(requireAdminSession).mockResolvedValue(session);
  });

  afterEach(cleanup);

  it.each(PAGE_CONTRACTS)(
    "$name requires $capability on the server",
    async ({ path, capability, renderPage }) => {
      await renderPage();

      expect(requireAdminSession).toHaveBeenCalledOnce();
      expect(requireAdminSession).toHaveBeenCalledWith(path, capability);
    }
  );

  it.each(PAGE_CONTRACTS)(
    "$name route mapping matches its server gate",
    ({ path, capability }) => {
      expect(getAdminPageCapability(path)).toBe(capability);
      expect(getAdminPageCapability(`${path}/nested-record`)).toBe(capability);
    }
  );

  it("does not expose global workspaces to an own-content author", () => {
    renderShell("author");

    for (const name of SENSITIVE_NAVIGATION) {
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    }
    expect(hasCapability("author", "content:read")).toBe(false);
    expect(hasCapability("author", "inbox:manage")).toBe(false);
    expect(hasCapability("author", "users:manage")).toBe(false);
    expect(hasCapability("author", "audit:read")).toBe(false);
  });

  it("exposes only global content workspaces to an editor", () => {
    renderShell("editor");

    expect(
      screen.getAllByRole("link", { name: "Project resources" })
    ).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: "Taxonomy" })).not.toHaveLength(
      0
    );
    for (const name of [
      "Contact inbox",
      "Review moderation",
      "Audit log",
      "Users",
    ]) {
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });

  it("exposes each contracted workspace to a fully authorized admin", () => {
    renderShell("admin");

    for (const name of SENSITIVE_NAVIGATION) {
      expect(screen.getAllByRole("link", { name })).not.toHaveLength(0);
    }
  });
});

describe("sensitive admin API authority contracts", () => {
  it.each([
    ["contact read", "/api/contacts/admin", "GET", "inbox:manage"],
    [
      "contact mutation",
      "/api/contacts/507f1f77bcf86cd799439011/admin",
      "PATCH",
      "inbox:manage",
    ],
    [
      "contact retention",
      "/api/contacts/507f1f77bcf86cd799439011/admin/retention-hold",
      "POST",
      "inbox:retention-manage",
    ],
    [
      "contact anonymization",
      "/api/contacts/507f1f77bcf86cd799439011/admin/anonymize",
      "POST",
      "inbox:permanent-delete",
    ],
    ["review read", "/api/reviews/admin", "GET", "inbox:manage"],
    [
      "review permanent deletion",
      "/api/reviews/admin/permanent",
      "DELETE",
      "inbox:permanent-delete",
    ],
    ["user read", "/api/users/admin", "GET", "users:manage"],
    [
      "user mutation",
      "/api/users/507f1f77bcf86cd799439011/admin",
      "PATCH",
      "users:manage",
    ],
    [
      "user permanent deletion",
      "/api/users/admin/permanent",
      "DELETE",
      "users:permanent-delete",
    ],
    [
      "project-resource read",
      "/api/project-resources/admin",
      "GET",
      "content:read",
    ],
    [
      "project-resource mutation",
      "/api/project-resources/admin",
      "PATCH",
      "content:edit",
    ],
    [
      "project-resource permanent deletion",
      "/api/project-resources/admin/permanent",
      "DELETE",
      "content:permanent-delete",
    ],
    [
      "project taxonomy read",
      "/api/project-categories/admin",
      "GET",
      "content:read",
    ],
    [
      "article taxonomy mutation",
      "/api/article-categories/507f1f77bcf86cd799439011/admin",
      "PATCH",
      "content:edit",
    ],
    [
      "taxonomy permanent deletion",
      "/api/article-categories/admin/permanent",
      "DELETE",
      "content:permanent-delete",
    ],
  ] as const)("maps %s to %s", (_name, path, method, capability) => {
    expect(getAdminApiAuthority(path, method)).toEqual({
      kind: "capability",
      capability,
    });
  });

  it("keeps audit reads on the explicit audit route and fails invented admin APIs closed", () => {
    expect(getAdminApiAuthority("/api/audit-events", "GET")).toEqual({
      kind: "not-admin-api",
    });
    expect(getAdminApiAuthority("/api/audit-events/admin", "GET")).toEqual({
      kind: "unmapped-admin-api",
    });
    expect(hasCapability("admin", "audit:read")).toBe(true);
    expect(hasCapability("editor", "audit:read")).toBe(false);
  });
});
