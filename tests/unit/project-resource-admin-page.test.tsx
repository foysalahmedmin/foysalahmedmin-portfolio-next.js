// @vitest-environment jsdom

import ProjectResourcesPage from "@/app/admin/(protected)/project-resources/page";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getAdminPageCapability } from "@/lib/auth/capabilities";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/admin-session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/components/admin/project-resource-workspace", () => ({
  default: (props: { canEdit: boolean; canPermanentDelete: boolean }) => (
    <div
      data-testid="project-resource-workspace"
      data-can-edit={String(props.canEdit)}
      data-can-permanent-delete={String(props.canPermanentDelete)}
    />
  ),
}));

describe("ProjectResource admin page", () => {
  it("requires content:read on the server and derives mutation controls from capabilities", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      name: "Editor",
      role: "editor",
      capabilities: ["admin:access", "content:read", "content:edit"],
    } as never);

    render(await ProjectResourcesPage());

    expect(requireAdminSession).toHaveBeenCalledWith(
      "/admin/project-resources",
      "content:read"
    );
    expect(getAdminPageCapability("/admin/project-resources")).toBe(
      "content:read"
    );
    expect(screen.getByTestId("project-resource-workspace")).toHaveAttribute(
      "data-can-edit",
      "true"
    );
    expect(screen.getByTestId("project-resource-workspace")).toHaveAttribute(
      "data-can-permanent-delete",
      "false"
    );
  });
});
