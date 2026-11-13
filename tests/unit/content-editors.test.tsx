// @vitest-environment jsdom

import AdminProjectsPage from "@/app/admin/(protected)/projects/page";
import CaseStudyForm from "@/components/admin/case-study-form";
import {
  EditorialCompletenessPanel,
  EditorialNotice,
  EditorialPanel,
  EditorialPublishBar,
  EditorialSeoSocialPreview,
  EditorialWorkspaceHeader,
} from "@/components/admin/editorial-editor-primitives";
import ProjectForm from "@/components/admin/project-form";
import VideoForm from "@/components/admin/video-form";
import { getAdminProjects } from "@/services/project.service";
import { scanDesignRules } from "../helpers/source-scan";
import type { TCaseStudy } from "@/types/case-study.type";
import type { TProject } from "@/types/project.type";
import type { TVideo } from "@/types/video.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/category.service", () => {
  const list = vi.fn(async () => ({
    success: true,
    data: [{ _id: "c1", name: "Platforms", slug: "platforms" }],
  }));
  return {
    getProjectCategories: list,
    getCaseStudyCategories: list,
    getVideoCategories: list,
  };
});
vi.mock("@/services/project.service", () => ({
  getAdminProjects: vi.fn(),
  deleteProject: vi.fn(),
  deleteProjects: vi.fn(),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));
vi.mock("@/components/ui/file-uploader", () => ({
  FileUploader: () => <div>uploader</div>,
}));
vi.mock("@/components/ui/file-gallery-uploader", () => ({
  FileGalleryUploader: () => <div>gallery</div>,
}));

const savedAt = "2026-11-08T10:42:00.000Z";

const project = {
  _id: "p1",
  name: "Signal console",
  slug: "signal-console",
  description: "A calm console",
  content: "Body",
  category: { _id: "c1", name: "Platforms", slug: "platforms" },
  status: "in_progress",
  publication_status: "published",
  is_featured: false,
  updated_at: savedAt,
} as TProject;

const caseStudy = {
  _id: "s1",
  name: "Edge migration",
  category: { _id: "c1", name: "Platforms", slug: "platforms" },
  status: "pending",
  updated_at: savedAt,
} as TCaseStudy;

const video = {
  _id: "v1",
  name: "Walkthrough",
  category: { _id: "c1", name: "Platforms", slug: "platforms" },
  status: "draft",
  updated_at: savedAt,
} as TVideo;

type Case = {
  noun: string;
  render: (props?: Record<string, unknown>) => ReturnType<typeof render>;
  title: string;
  mark: string;
  state: string;
  back: [string, string];
  sections: string[] | null;
  save: string;
  edit: { label: string; text: string };
};

const cases: Case[] = [
  {
    noun: "project",
    render: (props) =>
      render(
        <ProjectForm
          initialData={project}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          {...props}
        />
      ),
    title: "Signal console",
    mark: "Published",
    state: "published",
    back: ["Back to projects", "/admin/projects"],
    sections: [
      "Basics",
      "Classification",
      "Status and visibility",
      "Case-study evidence",
      "Links",
      "Content",
      "Media",
    ],
    save: "Update Project",
    edit: { label: "Project Name", text: "!" },
  },
  {
    noun: "case study",
    render: (props) =>
      render(
        <CaseStudyForm
          initialData={caseStudy}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          {...props}
        />
      ),
    title: "Edge migration",
    mark: "Pending",
    state: "pending",
    back: ["Back to case studies", "/admin/case-studies"],
    sections: [
      "Basics",
      "Client and engagement",
      "The story",
      "Constraints and architecture",
      "Results",
      "Tools, links and search",
      "Long-form content",
      "Publishing",
    ],
    save: "Update Case Study",
    edit: { label: "Title", text: "!" },
  },
  {
    noun: "video",
    render: (props) =>
      render(
        <VideoForm
          initialData={video}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
          {...props}
        />
      ),
    title: "Walkthrough",
    mark: "Draft",
    state: "draft",
    back: ["Back to videos", "/admin/videos"],
    // three sections: the index is not worth its rail
    sections: null,
    save: "Update Video",
    edit: { label: "Title", text: "!" },
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.each(cases)("$noun form as a C3 editor", (item) => {
  it("has a header with the record title, its status mark, the last saved time and a back link", async () => {
    item.render();
    expect(
      screen.getByRole("heading", { level: 1, name: item.title })
    ).toBeVisible();
    const header = screen.getByRole("banner");
    expect(
      within(header).getByText(item.mark).closest(".status-mark")
    ).toHaveAttribute("data-state", item.state);
    expect(within(header).getByText(/Nov 8, 2026/)).toBeVisible();
    expect(screen.getByRole("link", { name: item.back[0] })).toHaveAttribute(
      "href",
      item.back[1]
    );
    await screen.findByRole("option", { name: "Platforms" });
  });

  it("indexes the sections whose ids match, only when there are four or more", async () => {
    item.render();
    await screen.findByRole("option", { name: "Platforms" });
    const nav = screen.queryByRole("navigation", { name: "Sections" });
    if (!item.sections) {
      expect(nav).toBeNull();
      return;
    }
    const links = within(nav!).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(item.sections);
    for (const link of links) {
      const target = document.getElementById(
        link.getAttribute("href")!.slice(1)
      );
      expect(target?.tagName).toBe("SECTION");
    }
  });

  it("counts unsaved changes, and typing the old value back is not a change", async () => {
    const user = userEvent.setup();
    item.render();
    await screen.findByRole("option", { name: "Platforms" });
    const bar = screen.getByRole("group", { name: "Editor actions" });
    expect(within(bar).getByText("No unsaved changes")).toBeVisible();
    await user.type(screen.getByLabelText(item.edit.label), item.edit.text);
    expect(within(bar).getByText("1 unsaved change")).toBeVisible();
    await user.type(screen.getByLabelText(item.edit.label), "{Backspace}");
    expect(within(bar).getByText("No unsaved changes")).toBeVisible();
  });

  it("saves with Cmd/Ctrl+S like the save button, and not while a save runs", async () => {
    const user = userEvent.setup();
    // the submit event is the contract: what the form then validates is its own business
    const submits = vi.fn((event: Event) => event.preventDefault());
    const { container } = item.render();
    await screen.findByRole("option", { name: "Platforms" });
    container.querySelector("form")!.addEventListener("submit", submits);
    await user.keyboard("{Control>}s{/Control}");
    expect(submits).toHaveBeenCalledTimes(1);
    await user.keyboard("{Meta>}s{/Meta}");
    expect(submits).toHaveBeenCalledTimes(2);
    cleanup();

    const busy = vi.fn((event: Event) => event.preventDefault());
    const { container: running } = item.render({ loading: true });
    running.querySelector("form")!.addEventListener("submit", busy);
    await user.keyboard("{Control>}s{/Control}");
    expect(busy).not.toHaveBeenCalled();
  });

  it("keeps Cancel wired and lists a save failure in the validation summary", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    item.render({ onCancel, error: "Failed to save" });
    await screen.findByRole("option", { name: "Platforms" });
    const summary = screen
      .getByText("1 problem to fix")
      .closest("[role=alert]");
    expect(
      within(summary as HTMLElement).getByText("Failed to save")
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: item.save })).toBeVisible();
  });

  it("renders no palette utility, large radius or status colour class", async () => {
    const { container } = item.render();
    await screen.findByRole("option", { name: "Platforms" });
    expect(scanDesignRules(container.innerHTML)).toEqual({});
    expect(container.innerHTML).not.toMatch(
      /\b(?:text|bg|border)-(?:success|warning|info)\b/
    );
  });
});

describe("new records", () => {
  it("start with a New title and no status mark", async () => {
    render(<ProjectForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "New project" })
    ).toBeVisible();
    expect(screen.queryByText(/Last saved/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Create Project" })
    ).toBeVisible();
    await screen.findByRole("option", { name: "Platforms" });
  });

  it("shows the legacy workflow status of a project that predates the split status fields", async () => {
    render(
      <ProjectForm
        initialData={{ ...project, publication_status: undefined }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const header = screen.getByRole("banner");
    expect(
      within(header).getByText("In progress").closest(".status-mark")
    ).toHaveAttribute("data-state", "pending");
    await screen.findByRole("option", { name: "Platforms" });
  });
});

describe("video form state marks", () => {
  it("shows the link check as a mark with its words, not as a coloured line", async () => {
    const user = userEvent.setup();
    render(<VideoForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.type(
      screen.getByLabelText("YouTube link"),
      "https://vimeo.com/123"
    );
    expect(
      screen
        .getByText("This is not a valid YouTube video link.")
        .closest(".status-mark")
    ).toHaveAttribute("data-state", "error");
    await screen.findByRole("option", { name: "Platforms" });
  });
});

describe("projects list as a C2 list", () => {
  beforeEach(() => {
    vi.mocked(getAdminProjects).mockResolvedValue({
      success: true,
      data: [project],
      meta: { total: 1 },
    } as never);
  });

  it("has the page header with its one-line description and the primary action, then the table", async () => {
    const { container } = render(<AdminProjectsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Projects" })
    ).toBeVisible();
    expect(
      screen.getByText("Manage your portfolio projects and case studies.")
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Add New Project/ })
    ).toHaveAttribute("href", "/admin/projects/new");
    expect(container.querySelector('[data-archetype="C2"]')).not.toBeNull();
    expect(await screen.findByText("Signal console")).toBeVisible();
  });
});

describe("editorial primitives on the console patterns", () => {
  it("render hairline sections and a solid action bar: no card radius, shadow, blur, palette or status colour", () => {
    const { container } = render(
      <>
        <EditorialWorkspaceHeader
          eyebrow="Editorial workspace"
          title="Edit service"
          description="Manage the draft."
        />
        <EditorialPanel title="Identity">Fields</EditorialPanel>
        <EditorialCompletenessPanel
          items={[{ id: "a", label: "Title", complete: true }]}
        />
        <EditorialSeoSocialPreview url="/about" />
        <EditorialNotice tone="warning" title="Careful">
          Details
        </EditorialNotice>
        <EditorialPublishBar message="Unsaved changes" dirty>
          <button type="button">Save draft</button>
        </EditorialPublishBar>
      </>
    );
    const html = container.innerHTML;
    expect(scanDesignRules(html)).toEqual({});
    expect(html).not.toMatch(/backdrop-blur|shadow-|rounded-(?:xl|2xl|3xl)/);
    expect(html).not.toMatch(/\b(?:text|bg|border)-(?:success|warning|info)\b/);
    expect(
      screen.getByRole("region", { name: "Publishing controls" })
    ).toHaveAttribute("data-dirty", "true");
  });

  it("states a notice by its mark and words, and a problem as an alert", () => {
    render(
      <>
        <EditorialNotice tone="danger" title="Could not save" />
        <EditorialNotice tone="success" title="Saved" />
      </>
    );
    expect(
      within(screen.getByRole("alert"))
        .getByText("Could not save")
        .closest(".status-mark")
    ).toHaveAttribute("data-state", "error");
    expect(screen.getByText("Saved").closest(".status-mark")).toHaveAttribute(
      "data-state",
      "success"
    );
  });
});

describe("content stylesheet", () => {
  const css = readFileSync(
    join(process.cwd(), "src/assets/styles/public/console-ws-content.css"),
    "utf8"
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  it("scopes every selector to the console surface and uses no blur or colour literal", () => {
    // split a selector list on top-level commas only (":is(a, b)" is one selector)
    const selectors = Array.from(css.matchAll(/([^{}@]+)\{/g)).flatMap(
      (match) => match[1]!.split(/,(?![^(]*\))/).map((part) => part.trim())
    );
    expect(selectors.length).toBeGreaterThan(10);
    expect(
      selectors.filter((part) => !part.startsWith('[data-surface="console"]'))
    ).toEqual([]);
    expect(css).not.toMatch(/backdrop-filter/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/);
  });
});
