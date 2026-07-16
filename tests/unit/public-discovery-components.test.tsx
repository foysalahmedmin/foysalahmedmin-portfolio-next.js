// @vitest-environment jsdom

import ArticlesContentSection from "@/components/(common)/articles-page/articles-content-section";
import ProjectsContentSection from "@/components/(common)/projects-page/projects-content-section";
import {
  parseArticleDiscoveryQuery,
  parseProjectDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import { getArticles } from "@/services/article.service";
import { getProjects } from "@/services/project.service";
import type { TArticleListItem } from "@/types/article.type";
import type { TProjectListItem } from "@/types/project.type";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/project.service", () => ({ getProjects: vi.fn() }));
vi.mock("@/services/article.service", () => ({ getArticles: vi.fn() }));

const project: TProjectListItem = {
  _id: "project-id",
  slug: "queue-platform",
  name: "Queue platform",
  description: "A reliable event delivery case study.",
  status: "completed",
  delivery_status: "completed",
  project_type: "internal",
  role: "Lead engineer and systems architect",
  primary_pillar: "backend",
  tags: ["Node.js", "Redis"],
  outcomes: [
    {
      label: "replay coverage",
      value: "100%",
      verification_state: "verified",
    },
  ],
  is_featured: true,
  is_premium: false,
  started_at: "2025-01-01T00:00:00.000Z",
};

const article: TArticleListItem = {
  _id: "article-id",
  slug: "safe-boundaries",
  name: "Safe boundaries",
  excerpt: "A practical guide to explicit trust boundaries.",
  author: { _id: "author-id", name: "Foysal Ahmed" },
  primary_pillar: "system_design",
  topics: ["Threat modeling"],
  reading_time_minutes: 8,
  published_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-02-01T00:00:00.000Z",
  is_featured: false,
  is_premium: false,
};

describe("public discovery components", () => {
  beforeEach(() => {
    vi.mocked(getProjects).mockResolvedValue({
      success: true,
      status: 200,
      data: [],
      meta: { total: 0, page: 1, limit: 9 },
    });
    vi.mocked(getArticles).mockResolvedValue({
      success: true,
      status: 200,
      data: [],
      meta: { total: 0, page: 1, limit: 9 },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders an evidence-led project card at its stable slug URL", async () => {
    window.history.replaceState({}, "", "/projects");
    render(
      <ProjectsContentSection
        initialProjects={[project]}
        initialMeta={{ total: 1, page: 1, limit: 9 }}
        initialQuery={parseProjectDiscoveryQuery({})}
        categories={[]}
        facets={{ technologies: ["Node.js", "Redis"], years: [2025] }}
      />
    );

    expect(
      screen.getByRole("link", { name: "Read Queue platform case study" })
    ).toHaveAttribute("href", "/projects/queue-platform");
    expect(screen.getByText("100%")).toBeVisible();
    expect(screen.getByText("replay coverage")).toBeVisible();
    expect(
      screen.getByText("Lead engineer and systems architect")
    ).toBeVisible();
    await waitFor(() => expect(getProjects).not.toHaveBeenCalled());
  });

  it("keeps mobile filters URL-backed and restores focus and scroll on Escape", async () => {
    window.history.replaceState({}, "", "/projects");
    const user = userEvent.setup();
    render(
      <ProjectsContentSection
        initialProjects={[project]}
        initialMeta={{ total: 1, page: 1, limit: 9 }}
        initialQuery={parseProjectDiscoveryQuery({})}
        categories={[]}
        facets={{ technologies: ["Node.js", "Redis"], years: [2025] }}
      />
    );

    const trigger = screen.getByRole("button", {
      name: "Open project filters",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Filter projects",
    });
    const mobileSearch = within(dialog).getByRole("searchbox", {
      name: "Search",
    });
    await waitFor(() => expect(mobileSearch).toHaveFocus());
    expect(document.body).toHaveStyle({ overflow: "hidden" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Discipline" }),
      "backend"
    );
    expect(window.location.search).toContain("pillar=backend");
    expect(
      screen.getByRole("button", {
        name: "Open project filters, 1 active",
      })
    ).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Filter projects" })
      ).not.toBeInTheDocument()
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body).not.toHaveStyle({ overflow: "hidden" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("renders article provenance, dates, and reading time without a hydration fetch", async () => {
    window.history.replaceState({}, "", "/articles");
    render(
      <ArticlesContentSection
        initialArticles={[article]}
        initialMeta={{ total: 1, page: 1, limit: 9 }}
        initialQuery={parseArticleDiscoveryQuery({})}
        categories={[]}
        facets={{ topics: ["Threat modeling"] }}
      />
    );

    expect(
      screen.getByRole("link", { name: "Read Safe boundaries" })
    ).toHaveAttribute("href", "/articles/safe-boundaries");
    expect(screen.getByText("Foysal Ahmed")).toBeVisible();
    expect(screen.getByText("8 min read")).toBeVisible();
    expect(screen.getByText("Feb 1, 2025").closest("dd")).toHaveTextContent(
      "Updated Feb 1, 2025"
    );
    await waitFor(() => expect(getArticles).not.toHaveBeenCalled());
  });

  it("distinguishes a filtered no-match state from an empty portfolio", () => {
    window.history.replaceState({}, "", "/projects?pillar=backend");
    render(
      <ProjectsContentSection
        initialProjects={[]}
        initialMeta={{ total: 0, page: 1, limit: 9 }}
        initialQuery={parseProjectDiscoveryQuery({ pillar: "backend" })}
        categories={[]}
        facets={{ technologies: [], years: [] }}
      />
    );

    expect(
      screen.getByRole("heading", { name: "No matching projects" })
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /clear filters/i })
    ).not.toHaveLength(0);
  });

  it("offers retry when the server-rendered discovery read failed", () => {
    window.history.replaceState({}, "", "/articles");
    render(
      <ArticlesContentSection
        initialArticles={[]}
        initialMeta={{ total: 0, page: 1, limit: 9 }}
        initialQuery={parseArticleDiscoveryQuery({})}
        categories={[]}
        facets={{ topics: [] }}
        initialError
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Articles could not be loaded"
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
});
