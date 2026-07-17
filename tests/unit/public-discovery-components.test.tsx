// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
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

const site = createEmergencyPublicSite();
site.fallbacks.project_by_pillar.backend = {
  id: "507f1f77bcf86cd799439041",
  url: "https://cdn.example.com/project-backend.webp",
  alt_text: "Backend managed project fallback",
  is_decorative: false,
  focal_point: { x: 0.7, y: 0.45 },
  dominant_color: "#102a43",
  blur_data_url: "data:image/webp;base64,UklGRg==",
};
site.fallbacks.article_by_pillar.system_design = {
  id: "507f1f77bcf86cd799439042",
  url: "https://cdn.example.com/article-system-design.webp",
  alt_text: "System design managed article fallback",
  is_decorative: false,
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
        fallbacks={site.fallbacks}
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
    expect(
      screen.getByRole("img", { name: "Backend managed project fallback" })
    ).toBeVisible();
    await waitFor(() => expect(getProjects).not.toHaveBeenCalled());
  });

  it("keeps the managed pillar fallback after an asynchronous refresh", async () => {
    window.history.replaceState({}, "", "/projects");
    const user = userEvent.setup();
    const refreshedProject = {
      ...project,
      _id: "refreshed-project-id",
      slug: "refreshed-queue-platform",
      name: "Refreshed queue platform",
    };
    vi.mocked(getProjects).mockResolvedValueOnce({
      success: true,
      status: 200,
      data: [refreshedProject],
      meta: { total: 1, page: 1, limit: 9 },
    });

    render(
      <ProjectsContentSection
        initialProjects={[project]}
        initialMeta={{ total: 1, page: 1, limit: 9 }}
        initialQuery={parseProjectDiscoveryQuery({})}
        categories={[]}
        facets={{ technologies: ["Node.js", "Redis"], years: [2025] }}
        compositionFilter={{ featured: true, project_type: "lab" }}
        fallbacks={site.fallbacks}
      />
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Discipline" }),
      "backend"
    );

    expect(
      await screen.findByRole("link", {
        name: "Read Refreshed queue platform case study",
      })
    ).toHaveAttribute("href", "/projects/refreshed-queue-platform");
    expect(
      screen.getByRole("img", { name: "Backend managed project fallback" })
    ).toBeVisible();
    expect(getProjects).toHaveBeenCalledWith(
      expect.objectContaining({
        pillar: "backend",
        composition_featured: true,
        composition_project_type: "lab",
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
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

  it("restores the full curated Project snapshot when an SSR filter is cleared without escaping to the public collection", async () => {
    window.history.replaceState({}, "", "/projects?search=queue");
    const user = userEvent.setup();
    const designSystemProject: TProjectListItem = {
      ...project,
      _id: "design-system-project-id",
      slug: "design-system",
      name: "Design system",
      description: "Reusable interface foundations.",
    };
    render(
      <ProjectsContentSection
        initialProjects={[project]}
        initialMeta={{ total: 1, page: 1, limit: 1 }}
        initialQuery={parseProjectDiscoveryQuery({ search: "queue" })}
        snapshotProjects={[project, designSystemProject]}
        categories={[]}
        facets={{ technologies: ["Node.js"], years: [2025] }}
        snapshotLocked
      />
    );

    expect(screen.getByText("Queue platform")).toBeVisible();
    expect(screen.queryByText("Design system")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(await screen.findByText("Design system")).toBeVisible();
    expect(screen.getByText("Queue platform")).toBeVisible();
    expect(getProjects).not.toHaveBeenCalled();
  });

  it("restores the full curated Article snapshot when an SSR filter is cleared without escaping to the public collection", async () => {
    window.history.replaceState({}, "", "/articles?topic=Security");
    const user = userEvent.setup();
    const reactArticle: TArticleListItem = {
      ...article,
      _id: "react-article-id",
      slug: "frontend-state",
      name: "Frontend state",
      topics: ["React"],
    };
    const securityArticle = {
      ...article,
      topics: ["Security"],
    };
    render(
      <ArticlesContentSection
        initialArticles={[securityArticle]}
        initialMeta={{ total: 1, page: 1, limit: 1 }}
        initialQuery={parseArticleDiscoveryQuery({ topic: "Security" })}
        snapshotArticles={[securityArticle, reactArticle]}
        categories={[]}
        facets={{ topics: ["Security", "React"] }}
        snapshotLocked
      />
    );

    expect(screen.getByText("Safe boundaries")).toBeVisible();
    expect(screen.queryByText("Frontend state")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(await screen.findByText("Frontend state")).toBeVisible();
    expect(screen.getByText("Safe boundaries")).toBeVisible();
    expect(getArticles).not.toHaveBeenCalled();
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
        fallbacks={site.fallbacks}
      />
    );

    expect(
      screen.getByRole("link", { name: "Read Safe boundaries" })
    ).toHaveAttribute("href", "/articles/safe-boundaries");
    expect(screen.getByText("Foysal Ahmed")).toBeVisible();
    expect(screen.getByText("8 min read")).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "System design managed article fallback",
      })
    ).toBeVisible();
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
