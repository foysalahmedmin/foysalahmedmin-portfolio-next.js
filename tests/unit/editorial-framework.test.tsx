// @vitest-environment jsdom

import {
  EditorialCompletenessPanel,
  EditorialPanel,
  EditorialPublishBar,
  EditorialSeoSocialPreview,
  EditorialSlugEditor,
  EditorialStatus,
  EditorialWorkspaceHeader,
  summarizeEditorialCompleteness,
} from "@/components/admin/editorial-editor-primitives";
import RepeatableRecordEditor from "@/components/admin/repeatable-record-editor";
import { REPEATABLE_ADMIN_WORKSPACES } from "@/lib/admin/repeatable-workspaces";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const router = {
  push: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const SlugHarness = () => {
  const [value, setValue] = useState("");
  return (
    <EditorialSlugEditor
      id="article-slug"
      value={value}
      sourceValue="Crème brûlée & API Design"
      onChange={setValue}
      basePath="/articles"
    />
  );
};

describe("shared editorial framework", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("exposes labelled header, form section, status, and sticky publish regions", () => {
    render(
      <>
        <EditorialWorkspaceHeader
          eyebrow="Editorial workspace"
          title="Edit article"
          description="Manage the bounded draft."
          status={<EditorialStatus tone="warning">Draft</EditorialStatus>}
        />
        <EditorialPanel title="Identity">Form fields</EditorialPanel>
        <EditorialPublishBar message="Unsaved changes">
          <button type="button">Save draft</button>
        </EditorialPublishBar>
      </>
    );

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Edit article",
    });
    expect(heading.closest("header")).toHaveAttribute(
      "aria-labelledby",
      heading.id
    );
    expect(screen.getByLabelText("Editorial status")).toHaveTextContent(
      "Draft"
    );
    expect(screen.getByRole("region", { name: "Identity" })).toHaveTextContent(
      "Form fields"
    );
    expect(
      screen.getByRole("region", { name: "Publishing controls" })
    ).toHaveTextContent("Unsaved changes");
  });

  it("reports required completeness separately from optional guidance", () => {
    const items = [
      { id: "title", label: "Title", complete: true },
      { id: "evidence", label: "Evidence", complete: false },
      {
        id: "summary",
        label: "Summary",
        complete: false,
        required: false,
      },
    ] as const;

    expect(summarizeEditorialCompleteness(items)).toEqual({
      required: 2,
      completeRequired: 1,
      percent: 50,
      ready: false,
    });
    render(<EditorialCompletenessPanel items={items} />);

    const progress = screen.getByRole("progressbar", {
      name: "Required editorial checks",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "50");
    expect(progress).toHaveAttribute(
      "aria-valuetext",
      "1 of 2 required checks complete"
    );
    expect(
      screen.getByRole("complementary", {
        name: "Publishing completeness",
      })
    ).toHaveTextContent("SummaryOptional");
  });

  it("generates an explicit accessible canonical slug without overwriting silently", async () => {
    const user = userEvent.setup();
    render(<SlugHarness />);

    const input = screen.getByRole("textbox", { name: "Canonical slug" });
    expect(input).toHaveValue("");
    expect(screen.getByText(/Proposed path:/)).toHaveTextContent(
      "/articles/creme-brulee-api-design"
    );

    await user.click(
      screen.getByRole("button", { name: "Generate from title" })
    );
    expect(input).toHaveValue("creme-brulee-api-design");
    expect(screen.getByText(/Canonical path:/)).toBeVisible();

    await user.clear(input);
    await user.type(input, "Invalid Slug");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use lowercase letters, numbers, and single hyphens."
    );
  });

  it("renders honest inherited metadata and noindex state in both previews", () => {
    render(
      <EditorialSeoSocialPreview
        url="/about"
        fallbackTitle="Inherited portfolio title"
        fallbackDescription="Inherited portfolio description"
        noindex
      />
    );

    expect(
      screen.getByRole("article", { name: "Search result preview" })
    ).toHaveTextContent("Inherited portfolio title");
    expect(
      screen.getByRole("article", { name: "Social card preview" })
    ).toHaveTextContent("Inherited portfolio description");
    expect(screen.getByLabelText("Metadata checks")).toHaveTextContent(
      "Noindex"
    );
  });

  it("uses the shared framework in the repeatable content editor", async () => {
    const user = userEvent.setup();
    render(
      <RepeatableRecordEditor
        workspace={REPEATABLE_ADMIN_WORKSPACES.services}
        actor={{ id: "507f1f77bcf86cd799439011", name: "Editor" }}
        canPublish
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Create service" })
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Content identity" })
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", {
        name: "Publishing completeness",
      })
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Publishing controls" })
    ).toBeVisible();

    await user.type(
      screen.getByRole("textbox", { name: "Title" }),
      "API Design"
    );
    await user.click(
      screen.getByRole("button", { name: "Generate from title" })
    );
    expect(screen.getByRole("textbox", { name: "Canonical slug" })).toHaveValue(
      "api-design"
    );

    const completeness = screen.getByRole("complementary", {
      name: "Publishing completeness",
    });
    expect(within(completeness).getByText("Canonical identity")).toBeVisible();
  });
});
