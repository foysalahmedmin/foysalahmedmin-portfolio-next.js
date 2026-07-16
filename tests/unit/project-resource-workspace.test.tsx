// @vitest-environment jsdom

import ProjectResourceWorkspace from "@/components/admin/project-resource-workspace";
import {
  createAdminProjectResource,
  getAdminProjectResources,
  getAuthorizedProjectReferences,
  permanentlyDeleteAdminProjectResources,
  restoreAdminProjectResources,
  softDeleteAdminProjectResources,
  updateAdminProjectResource,
  updateAdminProjectResourcePrivacy,
  type ProjectResourceAdminRecord,
} from "@/services/project-resource-admin.service";
import type * as ProjectResourceAdminService from "@/services/project-resource-admin.service";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/project-resource-admin.service", async (importOriginal) => {
  const actual = await importOriginal<typeof ProjectResourceAdminService>();
  return {
    ...actual,
    getAdminProjectResources: vi.fn(),
    getAuthorizedProjectReferences: vi.fn(),
    createAdminProjectResource: vi.fn(),
    updateAdminProjectResource: vi.fn(),
    updateAdminProjectResourcePrivacy: vi.fn(),
    softDeleteAdminProjectResources: vi.fn(),
    restoreAdminProjectResources: vi.fn(),
    permanentlyDeleteAdminProjectResources: vi.fn(),
  };
});

const IDS = {
  project: "507f1f77bcf86cd799439011",
  privateResource: "507f1f77bcf86cd799439012",
  deletedResource: "507f1f77bcf86cd799439013",
} as const;

const resource = (
  overrides: Partial<ProjectResourceAdminRecord> = {}
): ProjectResourceAdminRecord => ({
  _id: IDS.privateResource,
  project: { _id: IDS.project, name: "Private platform" },
  sequence: 1,
  type: "repository",
  title: "Private repository",
  url: "https://github.com/example/private-platform",
  description: "Internal source reference",
  is_private: true,
  is_deleted: false,
  updated_at: "2026-07-16T00:00:00.000Z",
  ...overrides,
});

const listResponse = (records: ProjectResourceAdminRecord[]) => ({
  success: true,
  status: 200,
  data: records,
  meta: { page: 1, limit: 10, total: records.length },
});

const mutationResponse = (
  data: {
    count: number;
    not_found_ids: string[];
    not_restorable_ids?: string[];
  } = { count: 1, not_found_ids: [] }
) => ({ success: true, status: 200, data });

describe("ProjectResource admin workspace", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/project-resources");
    vi.mocked(getAdminProjectResources).mockReset();
    vi.mocked(getAdminProjectResources).mockResolvedValue(
      listResponse([resource()])
    );
    vi.mocked(getAuthorizedProjectReferences).mockReset();
    vi.mocked(getAuthorizedProjectReferences).mockResolvedValue({
      success: true,
      status: 200,
      data: [
        {
          _id: IDS.project,
          name: "Private platform",
          content: "",
          status: "completed",
          is_featured: false,
          is_premium: false,
        },
      ],
      meta: { page: 1, limit: 20, total: 1 },
    });
    vi.mocked(createAdminProjectResource).mockReset();
    vi.mocked(createAdminProjectResource).mockResolvedValue({
      success: true,
      status: 201,
      data: resource(),
    });
    vi.mocked(updateAdminProjectResource).mockReset();
    vi.mocked(updateAdminProjectResource).mockResolvedValue({
      success: true,
      status: 200,
      data: resource(),
    });
    vi.mocked(updateAdminProjectResourcePrivacy).mockReset();
    vi.mocked(updateAdminProjectResourcePrivacy).mockResolvedValue(
      mutationResponse()
    );
    vi.mocked(softDeleteAdminProjectResources).mockReset();
    vi.mocked(softDeleteAdminProjectResources).mockResolvedValue(
      mutationResponse()
    );
    vi.mocked(restoreAdminProjectResources).mockReset();
    vi.mocked(restoreAdminProjectResources).mockResolvedValue(
      mutationResponse()
    );
    vi.mocked(permanentlyDeleteAdminProjectResources).mockReset();
    vi.mocked(permanentlyDeleteAdminProjectResources).mockResolvedValue(
      mutationResponse()
    );
  });

  afterEach(() => cleanup());

  it("creates a private resource using project choices from the admin endpoint", async () => {
    const user = userEvent.setup();
    render(<ProjectResourceWorkspace canEdit canPermanentDelete={false} />);
    expect(await screen.findByText("Private repository")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "New resource" }));
    const dialog = screen.getByRole("dialog", {
      name: "New project resource",
    });
    expect(dialog).toBeVisible();
    await waitFor(() =>
      expect(getAuthorizedProjectReferences).toHaveBeenCalled()
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Project" }),
      IDS.project
    );
    await user.type(screen.getByLabelText("Title"), "Architecture notes");
    await user.type(
      screen.getByRole("textbox", { name: /HTTPS resource URL/ }),
      "https://docs.example.com/architecture"
    );
    expect(
      screen.getByRole("checkbox", { name: /Keep this resource private/ })
    ).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Create resource" }));

    await waitFor(() =>
      expect(createAdminProjectResource).toHaveBeenCalledWith(
        expect.objectContaining({
          project: IDS.project,
          title: "Architecture notes",
          url: "https://docs.example.com/architecture",
          is_private: true,
        })
      )
    );
    expect(await screen.findByText("Project resource created.")).toBeVisible();
  });

  it("forwards validated URL state to the remote list contract", async () => {
    window.history.replaceState(
      {},
      "",
      "/admin/project-resources?search=architecture&sort=-title&page=2&limit=20&type=documentation&is_private=false&deleted_scope=with_deleted"
    );

    render(
      <ProjectResourceWorkspace canEdit={false} canPermanentDelete={false} />
    );

    await waitFor(() =>
      expect(getAdminProjectResources).toHaveBeenCalledWith(
        {
          search: "architecture",
          sort: "-title",
          page: 2,
          limit: 20,
          type: "documentation",
          is_private: "false",
          deleted_scope: "with_deleted",
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );
  });

  it("reports row privacy partial failures without pretending success", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAdminProjectResourcePrivacy).mockResolvedValueOnce(
      mutationResponse({ count: 0, not_found_ids: [IDS.privateResource] })
    );
    render(<ProjectResourceWorkspace canEdit canPermanentDelete={false} />);
    expect(await screen.findByText("Private repository")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Make public" }));

    expect(await screen.findByText(/1 could not be completed/i)).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Failed resource IDs" })
    ).toHaveTextContent(IDS.privateResource);
    expect(updateAdminProjectResourcePrivacy).toHaveBeenCalledWith(
      [IDS.privateResource],
      false
    );
  });

  it("shows deleted lifecycle actions and gates permanent deletion", async () => {
    const deleted = resource({
      _id: IDS.deletedResource,
      title: "Deleted design reference",
      is_deleted: true,
      deleted_at: "2026-07-15T00:00:00.000Z",
    });
    vi.mocked(getAdminProjectResources).mockResolvedValue(
      listResponse([deleted])
    );
    const { unmount } = render(
      <ProjectResourceWorkspace canEdit canPermanentDelete={false} />
    );
    expect(await screen.findByText("Deleted design reference")).toBeVisible();
    expect(screen.getByRole("button", { name: "Restore" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Permanently delete" })
    ).not.toBeInTheDocument();

    unmount();
    render(<ProjectResourceWorkspace canEdit canPermanentDelete />);
    expect(await screen.findByText("Deleted design reference")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Permanently delete" })
    ).toBeVisible();
  });

  it("renders retryable error and honest empty states for remote reads", async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminProjectResources)
      .mockRejectedValueOnce(new Error("Project resources are unavailable."))
      .mockResolvedValueOnce(listResponse([]));
    render(
      <ProjectResourceWorkspace canEdit={false} canPermanentDelete={false} />
    );

    expect(
      await screen.findByText("Project resources are unavailable.")
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No project resources found")).toBeVisible();
  });
});
