// @vitest-environment jsdom

import TaxonomyAdminWorkspace from "@/components/admin/taxonomy-admin-workspace";
import type {
  TAdminTaxonomyCategory,
  TTaxonomyKind,
} from "@/lib/admin/taxonomy-admin";
import {
  createAdminTaxonomyCategory,
  getAdminTaxonomyCategories,
  getAdminTaxonomyParentCandidates,
  permanentlyDeleteAdminTaxonomyCategory,
  restoreAdminTaxonomyCategory,
  softDeleteAdminTaxonomyCategory,
  updateAdminTaxonomyCategory,
} from "@/services/taxonomy-admin.service";
import type * as TaxonomyAdminService from "@/services/taxonomy-admin.service";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/taxonomy-admin.service", async (importOriginal) => {
  const actual = await importOriginal<typeof TaxonomyAdminService>();
  return {
    ...actual,
    getAdminTaxonomyCategories: vi.fn(),
    getAdminTaxonomyParentCandidates: vi.fn(),
    createAdminTaxonomyCategory: vi.fn(),
    updateAdminTaxonomyCategory: vi.fn(),
    softDeleteAdminTaxonomyCategory: vi.fn(),
    restoreAdminTaxonomyCategory: vi.fn(),
    permanentlyDeleteAdminTaxonomyCategory: vi.fn(),
  };
});

const IDS = {
  articleRoot: "507f1f77bcf86cd799439001",
  articleChild: "507f1f77bcf86cd799439002",
  projectRoot: "507f1f77bcf86cd799439003",
} as const;

const category = (
  overrides: Partial<TAdminTaxonomyCategory> = {}
): TAdminTaxonomyCategory => ({
  id: IDS.articleRoot,
  name: "Engineering",
  slug: "engineering",
  sequence: 1,
  description: "Engineering systems",
  status: "active",
  tags: ["systems"],
  parentId: null,
  isDeleted: false,
  updatedAt: "2026-07-16T00:00:00.000Z",
  ...overrides,
});

const articleRecords = [
  category(),
  category({
    id: IDS.articleChild,
    name: "Backend",
    slug: "backend",
    sequence: 2,
    parentId: IDS.articleRoot,
    parentName: "Engineering",
  }),
];

const projectRecords = [
  category({
    id: IDS.projectRoot,
    name: "Platforms",
    slug: "platforms",
  }),
];

const mutationResponse = {
  success: true,
  status: 200,
  data: null,
} as const;

describe("Taxonomy admin workspace", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/taxonomy");
    vi.mocked(getAdminTaxonomyCategories).mockReset();
    vi.mocked(getAdminTaxonomyCategories).mockImplementation(
      async (kind, query) => {
        const source = kind === "article" ? articleRecords : projectRecords;
        const data = source.map((record) => ({
          ...record,
          isDeleted: query.deletedScope === "only_deleted",
        }));
        return {
          success: true,
          status: 200,
          data,
          meta: { page: query.page, limit: query.limit, total: data.length },
        };
      }
    );
    vi.mocked(getAdminTaxonomyParentCandidates).mockReset();
    vi.mocked(getAdminTaxonomyParentCandidates).mockImplementation(
      async (kind: TTaxonomyKind) =>
        kind === "article" ? articleRecords : projectRecords
    );
    vi.mocked(createAdminTaxonomyCategory).mockReset();
    vi.mocked(createAdminTaxonomyCategory).mockResolvedValue({
      success: true,
      status: 201,
      data: {},
    });
    vi.mocked(updateAdminTaxonomyCategory).mockReset();
    vi.mocked(updateAdminTaxonomyCategory).mockResolvedValue({
      success: true,
      status: 200,
      data: {},
    });
    vi.mocked(softDeleteAdminTaxonomyCategory).mockReset();
    vi.mocked(softDeleteAdminTaxonomyCategory).mockResolvedValue(
      mutationResponse
    );
    vi.mocked(restoreAdminTaxonomyCategory).mockReset();
    vi.mocked(restoreAdminTaxonomyCategory).mockResolvedValue({
      success: true,
      status: 200,
      data: {},
    });
    vi.mocked(permanentlyDeleteAdminTaxonomyCategory).mockReset();
    vi.mocked(permanentlyDeleteAdminTaxonomyCategory).mockResolvedValue(
      mutationResponse
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(cleanup);

  it("forwards remote search and filters, switches resources, and stays read-only", async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyAdminWorkspace canEdit={false} canPermanentDelete={false} />
    );

    expect(await screen.findByRole("cell", { name: /Backend/ })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "New article category" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit Backend" })
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: "Search table" }),
      "api"
    );
    await waitFor(() =>
      expect(getAdminTaxonomyCategories).toHaveBeenCalledWith(
        "article",
        expect.objectContaining({ search: "api" }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Category status" }),
      "inactive"
    );
    await waitFor(() =>
      expect(getAdminTaxonomyCategories).toHaveBeenCalledWith(
        "article",
        expect.objectContaining({ status: "inactive" }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Category lifecycle" }),
      "only_deleted"
    );
    await waitFor(() =>
      expect(getAdminTaxonomyCategories).toHaveBeenCalledWith(
        "article",
        expect.objectContaining({ deletedScope: "only_deleted" }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );

    await user.click(screen.getByRole("tab", { name: "Project categories" }));
    expect(
      await screen.findByRole("cell", { name: /Platforms/ })
    ).toBeVisible();
    await waitFor(() =>
      expect(getAdminTaxonomyCategories).toHaveBeenCalledWith(
        "project",
        expect.objectContaining({
          search: "api",
          status: "inactive",
          deletedScope: "only_deleted",
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );
    expect(window.location.search).toContain("type=project");
  });

  it("creates a category with an explicit slug and a safe parent", async () => {
    const user = userEvent.setup();
    render(<TaxonomyAdminWorkspace canEdit canPermanentDelete={false} />);
    expect(await screen.findByRole("cell", { name: /Backend/ })).toBeVisible();

    const createTrigger = await screen.findByRole("button", {
      name: "New article category",
    });
    await waitFor(() => expect(createTrigger).toBeEnabled());
    await user.click(createTrigger);

    expect(
      screen.getByRole("dialog", { name: "Create article category" })
    ).toBeVisible();
    const nameInput = screen.getByRole("textbox", { name: /Category name/ });
    await user.type(nameInput, "Architecture");
    await user.click(
      screen.getByRole("button", { name: "Generate from name" })
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Parent category" }),
      IDS.articleRoot
    );
    const tagsInput = screen.getByRole("textbox", { name: "Tags" });
    await user.type(tagsInput, "systems, backend, systems");
    expect(nameInput).toHaveValue("Architecture");
    expect(tagsInput).toHaveValue("systems, backend, systems");
    await user.click(screen.getByRole("button", { name: "Create category" }));

    await waitFor(() =>
      expect(createAdminTaxonomyCategory).toHaveBeenCalledWith("article", {
        name: "Architecture",
        slug: "architecture",
        sequence: 1,
        description: "",
        status: "active",
        parent: IDS.articleRoot,
        tags: ["systems", "backend"],
      })
    );
    expect(
      await screen.findByText("Created article category “Architecture”.")
    ).toBeVisible();
  });

  it("exposes soft-delete, restore, and permanent-delete only with their capabilities", async () => {
    const user = userEvent.setup();
    render(<TaxonomyAdminWorkspace canEdit canPermanentDelete />);
    expect(await screen.findByRole("cell", { name: /Backend/ })).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: "Move Backend to deleted records",
      })
    );
    await waitFor(() =>
      expect(softDeleteAdminTaxonomyCategory).toHaveBeenCalledWith(
        "article",
        IDS.articleChild
      )
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Category lifecycle" }),
      "only_deleted"
    );
    const restore = await screen.findByRole("button", {
      name: "Restore Backend",
    });
    expect(
      screen.getByRole("button", { name: "Permanently delete Backend" })
    ).toBeVisible();

    await user.click(restore);
    await waitFor(() =>
      expect(restoreAdminTaxonomyCategory).toHaveBeenCalledWith(
        "article",
        IDS.articleChild
      )
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Permanently delete Backend",
      })
    );
    await waitFor(() =>
      expect(permanentlyDeleteAdminTaxonomyCategory).toHaveBeenCalledWith(
        "article",
        IDS.articleChild
      )
    );
  });

  it("pauses hierarchy edits when safe parent loading fails but keeps lifecycle controls", async () => {
    vi.mocked(getAdminTaxonomyParentCandidates).mockRejectedValueOnce(
      new Error("Parent graph unavailable.")
    );
    const user = userEvent.setup();
    render(<TaxonomyAdminWorkspace canEdit canPermanentDelete={false} />);

    expect(await screen.findByText("Backend")).toBeVisible();
    expect(screen.getByText(/Parent graph unavailable/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "New article category" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit Backend" })).toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: "Move Backend to deleted records",
      })
    );
    expect(softDeleteAdminTaxonomyCategory).toHaveBeenCalledWith(
      "article",
      IDS.articleChild
    );
  });

  it("renders retryable read errors and an honest remote empty state", async () => {
    vi.mocked(getAdminTaxonomyCategories)
      .mockRejectedValueOnce(new Error("Taxonomy service unavailable."))
      .mockResolvedValueOnce({
        success: true,
        status: 200,
        data: [],
        meta: { page: 1, limit: 10, total: 0 },
      });
    const user = userEvent.setup();
    render(
      <TaxonomyAdminWorkspace canEdit={false} canPermanentDelete={false} />
    );

    expect(
      await screen.findByText("Taxonomy service unavailable.")
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByText("No article categories found")
    ).toBeVisible();
  });
});
