// @vitest-environment jsdom

import { ConsoleNotice } from "@/components/admin/console-notice";
import ContactInboxWorkspace from "@/components/admin/contact-inbox-workspace";
import ReviewModerationWorkspace from "@/components/admin/review-moderation-workspace";
import TaxonomyAdminWorkspace from "@/components/admin/taxonomy-admin-workspace";
import UserManagementWorkspace from "@/components/admin/user-management-workspace";
import { getAdminContacts } from "@/services/contact-admin.service";
import { getAdminReviews } from "@/services/review-admin.service";
import {
  getAdminTaxonomyCategories,
  getAdminTaxonomyParentCandidates,
} from "@/services/taxonomy-admin.service";
import { getAdminUsers, type AdminUser } from "@/services/user-admin.service";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/contact-admin.service", () => ({
  getAdminContacts: vi.fn(),
  getAdminContactDetail: vi.fn(),
  updateAdminContactStatus: vi.fn(),
}));
vi.mock("@/services/review-admin.service", () => ({
  REVIEW_MODERATION_STATUSES: ["pending", "approved", "rejected"],
  REVIEW_TARGET_MODELS: ["Project", "Article"],
  getAdminReviews: vi.fn(),
  getAdminReviewDetail: vi.fn(),
  updateAdminReviewStatus: vi.fn(),
}));
vi.mock("@/services/user-admin.service", () => ({
  getAdminUsers: vi.fn(),
  updateAdminUser: vi.fn(),
  softDeleteAdminUser: vi.fn(),
  restoreAdminUser: vi.fn(),
  permanentlyDeleteAdminUser: vi.fn(),
}));
vi.mock("@/services/taxonomy-admin.service", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getAdminTaxonomyCategories: vi.fn(),
  getAdminTaxonomyParentCandidates: vi.fn(),
}));

// A palette utility (bg-red-500, text-emerald-600/20) is a design-lint violation (DataTable's own radii are the shared UI's)
const PALETTE =
  /\b(?:bg|text|border|ring)-(?:red|green|emerald|amber|yellow|orange|blue|sky|rose|lime|teal|cyan|indigo|violet|purple|pink)-\d/;

// The list fixtures are partial on purpose; the services are mocked, so the shape only has to render
const page = (data: unknown[]) =>
  ({
    success: true as const,
    status: 200,
    data,
    meta: { page: 1, limit: 25, total: data.length },
  }) as never;

const user = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: "507f1f77bcf86cd799439011",
  name: "Content Editor",
  email: "editor@example.test",
  role: "editor",
  status: "in-progress",
  is_verified: true,
  is_deleted: false,
  deleted_at: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
  ...overrides,
});

const expectConsoleList = (container: HTMLElement, title: string) => {
  expect(screen.getByRole("heading", { level: 1, name: title })).toHaveClass(
    "cp-title"
  );
  expect(container.querySelector('[data-archetype="C2"]')).not.toBeNull();
  expect(container.innerHTML).not.toMatch(PALETTE);
};

describe("Phase 8 inbox and system workspaces on the console patterns", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/taxonomy");
    vi.mocked(getAdminContacts).mockResolvedValue(
      page([
        {
          id: "c1",
          name: "Ada Lovelace",
          subject: "Architecture review",
          email_masked: "ad***@example.com",
          status: "new",
          delivery_status: "delivered",
          created_at: "2026-07-15T00:00:00.000Z",
        },
      ])
    );
    vi.mocked(getAdminReviews).mockResolvedValue(
      page([
        {
          id: "r1",
          author: { id: "a1", name: "Grace Hopper" },
          target: { id: "t1", name: "Event platform" },
          target_model: "Project",
          rating: 5,
          review: "Clear boundaries.",
          status: "pending",
          is_edited: false,
          edited_at: null,
          created_at: "2026-07-15T00:00:00.000Z",
        },
      ])
    );
    vi.mocked(getAdminUsers).mockResolvedValue(
      page([user(), user({ id: "u2", name: "Gone User", is_deleted: true })])
    );
    vi.mocked(getAdminTaxonomyCategories).mockResolvedValue(page([]));
    vi.mocked(getAdminTaxonomyParentCandidates).mockResolvedValue([]);
  });

  afterEach(cleanup);

  it("contact inbox: console header, state mark in the row, no palette", async () => {
    const { container } = render(<ContactInboxWorkspace />);
    expect(await screen.findByText("Ada Lovelace")).toBeVisible();
    expectConsoleList(container, "Contact inbox");
    expect(container.querySelector(".cwc-row-attention")).not.toBeNull();
    expect(container.querySelector(".status-mark[data-state]")).not.toBeNull();
  });

  it("review moderation: pending rows are marked by shape, not tint", async () => {
    const { container } = render(<ReviewModerationWorkspace />);
    expect(await screen.findByText("Grace Hopper")).toBeVisible();
    expectConsoleList(container, "Review moderation");
    expect(container.querySelector(".cwc-row-attention")).not.toBeNull();
  });

  it("users: a deleted account carries a Deleted mark, not only a tint", async () => {
    const { container } = render(
      <UserManagementWorkspace
        currentUserId="nobody"
        actorRole="super-admin"
        canPermanentDelete={false}
      />
    );
    expect(await screen.findByText("Gone User")).toBeVisible();
    expectConsoleList(container, "User management");
    const deletedRow = container.querySelector(".cwc-row-deleted");
    expect(deletedRow).not.toBeNull();
    expect(deletedRow).toHaveTextContent("Deleted");
  });

  it("taxonomy: header action is the primary action, read-only is a mark", async () => {
    const { container } = render(
      <TaxonomyAdminWorkspace canEdit={false} canPermanentDelete={false} />
    );
    await screen.findByRole("tab", { name: "Article categories" });
    expectConsoleList(container, "Content categories");
    expect(
      container.querySelector('.status-mark[data-state="archived"]')
    ).toHaveTextContent("Read only");
  });

  it("notice: a mark with its word, and the right live-region role", () => {
    const { container } = render(
      <>
        <ConsoleNotice kind="success">Saved.</ConsoleNotice>
        <ConsoleNotice kind="error">Failed.</ConsoleNotice>
      </>
    );
    expect(screen.getByRole("status")).toHaveTextContent("DoneSaved.");
    expect(screen.getByRole("alert")).toHaveTextContent("ErrorFailed.");
    expect(container.innerHTML).not.toMatch(PALETTE);
  });
});
