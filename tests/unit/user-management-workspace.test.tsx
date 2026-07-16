// @vitest-environment jsdom

import UserManagementWorkspace from "@/components/admin/user-management-workspace";
import { getAdminPageCapability } from "@/lib/auth/capabilities";
import {
  getAdminUsers,
  permanentlyDeleteAdminUser,
  restoreAdminUser,
  softDeleteAdminUser,
  updateAdminUser,
  type AdminUser,
} from "@/services/user-admin.service";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/user-admin.service", () => ({
  getAdminUsers: vi.fn(),
  updateAdminUser: vi.fn(),
  softDeleteAdminUser: vi.fn(),
  restoreAdminUser: vi.fn(),
  permanentlyDeleteAdminUser: vi.fn(),
}));

const currentUser: AdminUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Current Admin",
  email: "admin@example.test",
  role: "super-admin",
  status: "in-progress",
  is_verified: true,
  is_deleted: false,
  deleted_at: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
};

const editor: AdminUser = {
  ...currentUser,
  id: "507f191e810c19729de860ea",
  name: "Content Editor",
  email: "editor@example.test",
  role: "editor",
  is_verified: false,
};

const listResponse = (users: AdminUser[]) => ({
  status: 200,
  success: true as const,
  data: users,
  meta: { page: 1, limit: 20, total: users.length },
});

describe("user management workspace", () => {
  beforeEach(() => {
    vi.mocked(getAdminUsers).mockResolvedValue(
      listResponse([currentUser, editor])
    );
    vi.mocked(updateAdminUser).mockResolvedValue({
      status: 200,
      success: true,
      data: { ...editor, role: "author", status: "blocked", is_verified: true },
    });
    vi.mocked(softDeleteAdminUser).mockResolvedValue({
      status: 200,
      success: true,
      data: null,
    });
    vi.mocked(restoreAdminUser).mockResolvedValue({
      status: 200,
      success: true,
      data: editor,
    });
    vi.mocked(permanentlyDeleteAdminUser).mockResolvedValue({
      status: 200,
      success: true,
      data: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  it("updates a non-self account with bounded access controls", async () => {
    const user = userEvent.setup();
    render(
      <UserManagementWorkspace
        currentUserId={currentUser.id}
        actorRole="super-admin"
        canPermanentDelete
      />
    );

    await screen.findByText("Content Editor");
    await user.click(
      screen.getByRole("button", { name: "Manage Content Editor" })
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Content Editor",
    });
    await user.selectOptions(within(dialog).getByLabelText("Role"), "author");
    await user.selectOptions(
      within(dialog).getByLabelText("Account status"),
      "blocked"
    );
    await user.click(
      within(dialog).getByRole("checkbox", {
        name: "Identity is administratively verified",
      })
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Save access controls" })
    );

    expect(updateAdminUser).toHaveBeenCalledWith(editor.id, {
      role: "author",
      status: "blocked",
      is_verified: true,
    });
    expect(
      await screen.findByText("Content Editor's account controls were updated.")
    ).toBeVisible();
  });

  it("mirrors self-escalation policy with disabled sensitive controls", async () => {
    const user = userEvent.setup();
    render(
      <UserManagementWorkspace
        currentUserId={currentUser.id}
        actorRole="super-admin"
        canPermanentDelete
      />
    );

    await screen.findByText("Current Admin");
    await user.click(
      screen.getByRole("button", { name: "Manage Current Admin" })
    );
    const dialog = await screen.findByRole("dialog", { name: "Current Admin" });
    expect(within(dialog).getByLabelText("Role")).toBeDisabled();
    expect(within(dialog).getByLabelText("Account status")).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Soft delete account" })
    ).toBeDisabled();
    expect(dialog).toHaveTextContent(
      "self role, status, and verification changes are blocked"
    );
  });

  it("keeps the page behind users:manage and hides privileged edits from admins", async () => {
    const user = userEvent.setup();
    expect(getAdminPageCapability("/admin/users")).toBe("users:manage");
    render(
      <UserManagementWorkspace
        currentUserId="507f1f77bcf86cd799439099"
        actorRole="admin"
        canPermanentDelete={false}
      />
    );

    await screen.findByText("Current Admin");
    await user.click(
      screen.getByRole("button", { name: "Manage Current Admin" })
    );
    const dialog = await screen.findByRole("dialog", { name: "Current Admin" });
    expect(within(dialog).getByLabelText("Role")).toBeDisabled();
    expect(dialog).toHaveTextContent(
      "Only a super-admin can change a privileged account."
    );
    expect(
      within(dialog).queryByRole("button", { name: "Permanently delete" })
    ).not.toBeInTheDocument();
  });
});
