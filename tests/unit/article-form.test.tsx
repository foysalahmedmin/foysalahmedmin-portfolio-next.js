// @vitest-environment jsdom

import ArticleForm from "@/components/admin/article-form";
import { getArticleCategories } from "@/services/category.service";
import type { TArticle } from "@/types/article.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/category.service", () => ({
  getArticleCategories: vi.fn(),
}));
vi.mock("@/components/ui/file-uploader", () => ({
  FileUploader: () => <div>thumbnail uploader</div>,
}));
vi.mock("@/components/ui/file-gallery-uploader", () => ({
  FileGalleryUploader: () => <div>gallery uploader</div>,
}));

const article = {
  _id: "a1",
  name: "Edge caching notes",
  slug: "edge-caching-notes",
  description: "How the edge cache behaves",
  excerpt: "Short",
  content: "Body of the article",
  category: { _id: "c1", name: "Notes", slug: "notes" },
  status: "published",
  is_featured: false,
  is_premium: false,
  updated_at: "2026-11-08T10:42:00.000Z",
} as TArticle;

const renderForm = (
  props: Partial<React.ComponentProps<typeof ArticleForm>> = {}
) => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <ArticleForm
      initialData={article}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />
  );
  return { onSubmit, onCancel };
};

describe("article form as a C3 editor", () => {
  beforeEach(() => {
    vi.mocked(getArticleCategories).mockResolvedValue({
      status: 200,
      success: true,
      data: [{ _id: "c1", name: "Notes" }],
    } as never);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("has a header with the record title, its status mark and the last saved time", async () => {
    renderForm();
    expect(
      screen.getByRole("heading", { level: 1, name: "Edge caching notes" })
    ).toBeVisible();
    const header = screen.getByRole("banner", { hidden: false });
    expect(
      within(header).getByText("Published").closest(".status-mark")
    ).toHaveAttribute("data-state", "published");
    expect(within(header).getByText(/Nov 8, 2026/)).toBeVisible();
    // the article API has no revision, so none is shown
    expect(screen.queryByText(/Revision/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Back to articles" })
    ).toHaveAttribute("href", "/admin/articles");
    await screen.findByRole("option", { name: "Notes" });
  });

  it("indexes every section and the links match the section ids", async () => {
    renderForm();
    await screen.findByRole("option", { name: "Notes" });
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Basics",
      "Content",
      "Classification",
      "Media",
      "Publishing",
    ]);
    for (const link of links) {
      const target = document.getElementById(
        link.getAttribute("href")!.slice(1)
      );
      expect(target).not.toBeNull();
      expect(target!.tagName).toBe("SECTION");
    }
  });

  it("counts unsaved changes in the action bar and marks the edited section", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByRole("option", { name: "Notes" });
    const bar = screen.getByRole("group", { name: "Editor actions" });
    expect(within(bar).getByText("No unsaved changes")).toBeVisible();

    await user.type(screen.getByLabelText("Title"), "!");
    expect(within(bar).getByText("1 unsaved change")).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Status"), "draft");
    expect(within(bar).getByText("2 unsaved changes")).toBeVisible();

    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(within(nav).getByRole("link", { name: /Basics/ })).toHaveAttribute(
      "data-dirty",
      "true"
    );
    expect(
      within(nav).getByRole("link", { name: /Content/ })
    ).not.toHaveAttribute("data-dirty");

    // typing the old value back is not a change
    await user.selectOptions(screen.getByLabelText("Status"), "published");
    expect(within(bar).getByText("1 unsaved change")).toBeVisible();
  });

  it("keeps Cancel and the save button wired as before", async () => {
    const user = userEvent.setup();
    const { onSubmit, onCancel } = renderForm();
    await screen.findByRole("option", { name: "Notes" });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText("Title"), "!");
    await user.click(screen.getByRole("button", { name: "Update Article" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Edge caching notes!",
        category: "c1",
        status: "published",
      })
    );
  });

  it("saves with Cmd/Ctrl+S exactly like the save button", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await screen.findByRole("option", { name: "Notes" });
    await user.type(screen.getByLabelText("Title"), "?");

    await user.keyboard("{Control>}s{/Control}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await user.keyboard("{Meta>}s{/Meta}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("does not save with the shortcut while a save is running", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ loading: true });
    await screen.findByRole("option", { name: "Notes" });
    await user.keyboard("{Control>}s{/Control}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("lists a save failure and a category error in the validation summary with a jump link", async () => {
    vi.mocked(getArticleCategories).mockRejectedValue(
      new Error("Failed to load categories")
    );
    renderForm({ error: "Failed to update article" });
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("2 problems to fix")).toBeVisible();
    expect(
      within(alert).getByRole("link", { name: "Failed to load categories" })
    ).toHaveAttribute("href", "#article-category");
    expect(within(alert).getByText("Failed to update article")).toBeVisible();
    // the section that holds the failing field is marked in the index
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(
      within(
        within(nav).getByRole("link", { name: /Classification/ })
      ).getByText("Error")
    ).toBeVisible();
  });

  it("starts a new article with no status mark and a New article title", async () => {
    renderForm({ initialData: undefined });
    expect(
      screen.getByRole("heading", { level: 1, name: "New article" })
    ).toBeVisible();
    expect(screen.queryByText("Last saved")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create Article" })
    ).toBeVisible();
  });
});
