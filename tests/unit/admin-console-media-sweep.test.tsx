// @vitest-environment jsdom

import MediaLibraryWorkspace from "@/components/admin/media-library-workspace";
import ProjectResourceWorkspace from "@/components/admin/project-resource-workspace";
import RepeatableContentWorkspace from "@/components/admin/repeatable-content-workspace";
import { WorkspaceNotice } from "@/components/admin/workspace-notice";
import { REPEATABLE_ADMIN_WORKSPACES } from "@/lib/admin/repeatable-workspaces";
import { getAdminMedia } from "@/services/media-admin.service";
import {
  getAdminProjectResources,
  updateAdminProjectResourcePrivacy,
} from "@/services/project-resource-admin.service";
import type * as ProjectResourceAdminService from "@/services/project-resource-admin.service";
import {
  bulkMutateAdminRepeatableRecords,
  getAdminRepeatableRecords,
} from "@/services/repeatable-admin.service";
import type { TFilePopulated } from "@/types/file.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/media-admin.service", () => ({
  getAdminMedia: vi.fn(),
  updateAdminMedia: vi.fn(),
  updateAdminMediaStatus: vi.fn(),
  softDeleteAdminMedia: vi.fn(),
  restoreAdminMedia: vi.fn(),
  permanentlyDeleteAdminMedia: vi.fn(),
  uploadAdminMediaBatch: vi.fn(),
}));
vi.mock(
  "@/services/project-resource-admin.service",
  async (importOriginal) => ({
    ...(await importOriginal<typeof ProjectResourceAdminService>()),
    getAdminProjectResources: vi.fn(),
    getAuthorizedProjectReferences: vi.fn(),
    updateAdminProjectResourcePrivacy: vi.fn(),
  })
);
vi.mock("@/services/repeatable-admin.service", () => ({
  getAdminRepeatableRecords: vi.fn(),
  bulkMutateAdminRepeatableRecords: vi.fn(),
  permanentlyDeleteAdminRepeatableRecord: vi.fn(),
}));

// A palette utility (bg-red-500, text-emerald-600/20) is a design-lint violation
const PALETTE =
  /\b(?:bg|text|border|ring)-(?:red|green|emerald|amber|yellow|orange|blue|sky|rose|lime|teal|cyan|indigo|violet|purple|pink)-\d/;

const file = (patch: Partial<TFilePopulated> = {}): TFilePopulated => ({
  _id: "507f1f77bcf86cd799439011",
  url: "https://res.cloudinary.com/demo/image/upload/hero.webp",
  filename: "hero.webp",
  name: "Hero image",
  mimetype: "image/webp",
  size: 2048,
  provider: "cloudinary",
  purpose: "hero",
  access: "public",
  status: "active",
  lifecycle_state: "ready",
  metadata_status: "incomplete",
  metadata_missing: ["alt_text"],
  references: [],
  is_deleted: false,
  ...patch,
});

const mediaPage = (data: TFilePopulated[]) =>
  ({
    success: true as const,
    status: 200,
    data,
    meta: { page: 1, limit: 12, total: data.length, statistics: { ready: 1 } },
  }) as never;

const expectConsoleList = (container: HTMLElement, title: string) => {
  expect(screen.getByRole("heading", { level: 1, name: title })).toHaveClass(
    "cp-title"
  );
  expect(container.querySelector('[data-archetype="C2"]')).not.toBeNull();
  expect(container.innerHTML).not.toMatch(PALETTE);
};

describe("WorkspaceNotice", () => {
  afterEach(cleanup);

  it("marks the state by shape and word and announces only errors", () => {
    const { rerender } = render(
      <WorkspaceNotice tone="success">Saved.</WorkspaceNotice>
    );
    expect(screen.getByRole("status")).toHaveTextContent("Done");
    expect(
      screen.getByRole("status").querySelector(".status-mark")
    ).toHaveAttribute("data-state", "success");
    rerender(<WorkspaceNotice tone="warning">Partly done.</WorkspaceNotice>);
    expect(screen.getByRole("status")).toHaveTextContent("Attention");
    rerender(<WorkspaceNotice tone="error">Failed.</WorkspaceNotice>);
    expect(screen.getByRole("alert")).toHaveTextContent("Error");
    expect(screen.getByRole("alert").innerHTML).not.toMatch(PALETTE);
  });
});

describe("Phase 8 media, project-resource and repeatable workspaces on the console patterns", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/media");
    vi.mocked(getAdminMedia).mockResolvedValue(
      mediaPage([
        file(),
        file({
          _id: "507f1f77bcf86cd799439012",
          filename: "old.webp",
          name: "Old banner",
          is_deleted: true,
          metadata_status: "complete",
          metadata_missing: [],
        }),
      ])
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("media: header, toolbar, URL filters, state marks, no palette", async () => {
    const { container } = render(
      <MediaLibraryWorkspace
        canPermanentDelete={false}
        initialFilters={{ metadata_status: "incomplete" }}
      />
    );
    expect(await screen.findByText("Hero image")).toBeVisible();
    expectConsoleList(container, "Media library");
    expect(getAdminMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({ metadata_status: "incomplete" }),
      }),
      expect.anything()
    );
    expect(
      screen.getByRole("group", { name: "Media library controls" })
    ).toBeVisible();
    expect(screen.getByLabelText("Media health summary")).toBeVisible();
    expect(container.querySelector(".status-mark[data-state]")).not.toBeNull();
    // The metadata health filter keeps the value carried by the URL
    expect(
      screen.getByRole("combobox", { name: "Metadata health" })
    ).toHaveValue("incomplete");
  });

  it("media grid: select a tile, the frame and the bulk bar follow, a deleted tile is labelled", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MediaLibraryWorkspace canPermanentDelete={false} />
    );
    expect(await screen.findByText("Hero image")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const tiles = container.querySelectorAll(".cwd-tile");
    expect(tiles).toHaveLength(2);
    expect(tiles[1]).toHaveAttribute("data-deleted", "true");
    expect(within(tiles[1] as HTMLElement).getByText("deleted")).toBeVisible();

    await user.click(
      screen.getByRole("checkbox", { name: "Select Hero image" })
    );
    expect(tiles[0]).toHaveAttribute("data-selected", "true");
    expect(screen.getByText(/1 item selected/)).toBeVisible();
    expect(container.innerHTML).not.toMatch(PALETTE);
  });

  it("media grid: error and empty states come from the list patterns", async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminMedia)
      .mockRejectedValueOnce(new Error("Media is unavailable."))
      .mockResolvedValueOnce(mediaPage([]));
    render(<MediaLibraryWorkspace canPermanentDelete={false} />);

    await user.click(screen.getByRole("button", { name: "Grid" }));
    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("Could not load media");
    expect(failure).toHaveTextContent("Media is unavailable.");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByText("No media in the library yet")
    ).toBeVisible();
  });

  it("media: the upload dialog opens with the console look", async () => {
    const user = userEvent.setup();
    render(<MediaLibraryWorkspace canPermanentDelete={false} />);
    expect(await screen.findByText("Hero image")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Upload media" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelector(".cwd-drop")).not.toBeNull();
    expect(dialog.innerHTML).not.toMatch(PALETTE);
  });

  it("media: the metadata editor is hairline sections with the missing fields marked by shape", async () => {
    const user = userEvent.setup();
    render(<MediaLibraryWorkspace canPermanentDelete={false} />);
    expect(await screen.findByText("Hero image")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Edit metadata for Hero image" })
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelectorAll(".cwd-section").length).toBeGreaterThan(2);
    expect(dialog.querySelector(".cwd-callout .status-mark")).not.toBeNull();
    expect(dialog.innerHTML).not.toMatch(PALETTE);
  });

  it("project resources: console header, and a partial failure is a labelled notice with its IDs", async () => {
    const user = userEvent.setup();
    const id = "507f1f77bcf86cd799439012";
    vi.mocked(getAdminProjectResources).mockResolvedValue({
      success: true,
      status: 200,
      data: [
        {
          _id: id,
          project: { _id: "507f1f77bcf86cd799439011", name: "Platform" },
          sequence: 1,
          type: "repository",
          title: "Private repository",
          url: "https://github.com/example/platform",
          is_private: true,
          is_deleted: false,
          updated_at: "2026-07-16T00:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 10, total: 1 },
    } as never);
    vi.mocked(updateAdminProjectResourcePrivacy).mockResolvedValue({
      success: true,
      status: 200,
      data: { count: 0, not_found_ids: [id] },
    } as never);
    const { container } = render(
      <ProjectResourceWorkspace canEdit canPermanentDelete={false} />
    );
    expect(await screen.findByText("Private repository")).toBeVisible();
    expectConsoleList(container, "Project resources");

    await user.click(screen.getByRole("button", { name: "Make public" }));
    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("Attention");
    expect(notice).toHaveTextContent(/1 could not be completed/);
    expect(
      within(notice).getByRole("list", { name: "Failed resource IDs" })
    ).toHaveTextContent(id);
    expect(container.innerHTML).not.toMatch(PALETTE);
  });

  it("repeatable content: console header and a partial bulk failure notice", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", "/admin/services");
    const record = (id: string, title: string, version: number) => ({
      id,
      slug: title.toLowerCase().replaceAll(" ", "-"),
      locale: "en" as const,
      title,
      secondary_pillars: [],
      sequence: 1,
      status: "draft" as const,
      enabled: true,
      is_featured: false,
      claim_verification: "not_applicable" as const,
      version,
      is_deleted: false,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-10T00:00:00.000Z",
      capabilities: [],
      deliverables: [],
      technologies: [],
    });
    const rows = [record("507f1f77bcf86cd799439011", "API design", 2)];
    vi.mocked(getAdminRepeatableRecords).mockResolvedValue({
      status: 200,
      success: true,
      data: rows,
      meta: { page: 1, limit: 10, total: 1 },
    } as never);
    vi.mocked(bulkMutateAdminRepeatableRecords).mockResolvedValue({
      status: 200,
      success: true,
      data: {
        operation: "archive",
        succeeded: [],
        failed: [{ id: rows[0].id, code: "VERSION_CONFLICT" }],
      },
    } as never);
    const { container } = render(
      <RepeatableContentWorkspace
        workspace={REPEATABLE_ADMIN_WORKSPACES.services}
        canEdit
        canPublish
        canPermanentDelete={false}
      />
    );
    expect(await screen.findByText("API design")).toBeVisible();
    expectConsoleList(container, "Services");
    expect(screen.getByRole("link", { name: /new service/i })).toBeVisible();

    await user.click(
      screen.getByLabelText("Select all selectable rows on this page")
    );
    await user.click(screen.getByRole("button", { name: "Archive selected" }));
    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("Attention");
    expect(
      within(notice).getByRole("list", { name: "Failed records" })
    ).toHaveTextContent("VERSION_CONFLICT");
    expect(container.innerHTML).not.toMatch(PALETTE);
  });
});
