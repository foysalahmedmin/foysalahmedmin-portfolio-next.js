// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import ProjectsContentSection, {
  type ProjectsContentSectionProps,
} from "@/components/(common)/projects-page/projects-content-section";
import {
  canonicalProjectsPath,
  projectsHref,
} from "@/components/(common)/projects-page/projects-content-section/query";
import { parseProjectDiscoveryQuery } from "@/lib/discovery/public-discovery";
import type { TProjectListItem } from "@/types/project.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const project: TProjectListItem = {
  _id: "project-id",
  slug: "queue-platform",
  name: "Queue platform",
  description: "A reliable event delivery system.",
  status: "completed",
  delivery_status: "completed",
  project_type: "open_source",
  role: "Lead engineer and systems architect",
  primary_pillar: "software_developer",
  tags: ["Node.js", "Redis", "Postgres", "Docker", "Kubernetes"],
  is_featured: true,
  is_premium: false,
  started_at: "2025-01-01T00:00:00.000Z",
};

const site = createEmergencyPublicSite();
site.fallbacks.project_by_pillar.software_developer = {
  id: "507f1f77bcf86cd799439041",
  url: "https://cdn.example.com/project-backend.webp",
  alt_text: "Backend managed project fallback",
  is_decorative: false,
};

const section = (
  overrides: Partial<ProjectsContentSectionProps> = {},
  search: Record<string, string> = {}
) =>
  render(
    <ProjectsContentSection
      initialProjects={[project]}
      initialMeta={{ total: 1, page: 1, limit: 9 }}
      initialQuery={parseProjectDiscoveryQuery(search)}
      categories={[
        {
          _id: "c1",
          name: "Platforms",
          slug: "platforms",
        } as ProjectsContentSectionProps["categories"][number],
      ]}
      facets={{ technologies: ["Node.js", "Redis"], years: [2025, 2024] }}
      fallbacks={site.fallbacks}
      {...overrides}
    />
  );

describe("lab registry (/projects)", () => {
  it("renders the lab switcher with Projects as the current view", () => {
    section();
    const nav = screen.getByRole("navigation", { name: "The lab" });
    expect(within(nav).getByRole("link", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      within(nav).getByRole("link", { name: "Articles" })
    ).not.toHaveAttribute("aria-current");
  });

  it("is a real table: column headers, a row header link, labelled cells, first four stack items", () => {
    section();
    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual([
      "Project",
      "Role",
      "Stack",
      "Type",
    ]);
    headers.forEach((header) => expect(header).toHaveAttribute("scope", "col"));

    const rowHeader = within(table).getByRole("rowheader");
    expect(rowHeader).toHaveAttribute("scope", "row");
    expect(
      within(rowHeader).getByRole("link", { name: "Queue platform" })
    ).toHaveAttribute("href", "/projects/queue-platform");
    expect(rowHeader).toHaveTextContent("A reliable event delivery system.");

    // Stacked (small screen) rows are labelled from data-label: it must match the column headers
    const cells = within(table).getAllByRole("cell");
    expect(cells.map((cell) => cell.getAttribute("data-label"))).toEqual([
      "Role",
      "Stack",
      "Type",
    ]);
    expect(cells[0]).toHaveTextContent("Software Developer");
    expect(cells[0]).toHaveTextContent("Lead engineer and systems architect");
    expect(cells[1]).toHaveTextContent("Node.js, Redis, Postgres, Docker");
    expect(cells[1]).not.toHaveTextContent("Kubernetes");
    expect(cells[2]).toHaveTextContent("Open Source");
    expect(cells[2]).toHaveTextContent("2025");
  });

  it("keeps the row preview out of the accessibility tree", () => {
    const { container } = section();
    const peek = container.querySelector(".lab-peek");
    expect(peek).toHaveAttribute("aria-hidden", "true");
    expect(within(peek as HTMLElement).queryByRole("link")).toBeNull();
    // The managed pillar fallback is the picture when the project has no thumbnail
    expect(
      container.querySelector(".lab-peek img")?.getAttribute("src")
    ).toContain(
      encodeURIComponent("https://cdn.example.com/project-backend.webp")
    );
  });

  it("filters with a plain GET form whose field names are the discovery query keys", () => {
    section({}, { pillar: "software_developer", year: "2025", sort: "newest" });
    const form = screen.getByRole("search", {
      name: "Filter and sort projects",
    });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/projects");

    const names = Array.from(form.querySelectorAll("[name]")).map((field) =>
      field.getAttribute("name")
    );
    expect(names).toEqual([
      "search",
      "pillar",
      "category",
      "technology",
      "type",
      "year",
      "sort",
    ]);
    expect(screen.getByRole("combobox", { name: "Role" })).toHaveValue(
      "software_developer"
    );
    expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2025");
    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveValue(
      "newest"
    );
    expect(
      screen.getByRole("combobox", { name: "Technology" })
    ).toHaveTextContent("Redis");
    expect(screen.getByRole("button", { name: "Apply" })).toHaveAttribute(
      "type",
      "submit"
    );
    // Sort is not a filter, but a non-default sort can still be cleared
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute(
      "href",
      "/projects"
    );
  });

  it("shows no Clear link and no chips for the default query", () => {
    section();
    expect(screen.queryByRole("link", { name: "Clear" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
  });

  it("shows active filters as chips that each drop only their own parameter", () => {
    section(
      {},
      {
        search: "queue",
        pillar: "software_developer",
        technology: "Redis",
        category: "platforms",
        sort: "newest",
      }
    );
    const chips = within(
      screen.getByRole("list", { name: "Active filters" })
    ).getAllByRole("link");
    const byName = Object.fromEntries(
      chips.map((chip) => [
        chip.getAttribute("aria-label"),
        chip.getAttribute("href"),
      ])
    );
    expect(Object.keys(byName)).toEqual([
      "Remove filter Search: queue",
      "Remove filter Role: Software Developer",
      "Remove filter Category: Platforms",
      "Remove filter Technology: Redis",
    ]);
    const without = byName["Remove filter Role: Software Developer"]!;
    expect(without).toContain("search=queue");
    expect(without).toContain("technology=Redis");
    expect(without).toContain("category=platforms");
    expect(without).toContain("sort=newest");
    expect(without).not.toContain("pillar=");
    expect(byName["Remove filter Search: queue"]).not.toContain("search=");
  });

  it("states the result count in Mono and says when filters narrow it", () => {
    section({}, { pillar: "software_developer" });
    expect(screen.getByText(/1 project matches/)).toBeInTheDocument();
  });

  it("explains a filtered no-match state and offers to clear", () => {
    section(
      { initialProjects: [], initialMeta: { total: 0, page: 1, limit: 9 } },
      { pillar: "ai_automation" }
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "No project matches these filters" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Clear filters" })[0]
    ).toHaveAttribute("href", "/projects");
  });

  it("distinguishes an empty portfolio from a failed read", () => {
    const { unmount } = section({
      initialProjects: [],
      initialMeta: { total: 0, page: 1, limit: 9 },
    });
    expect(
      screen.getByRole("heading", { name: "No published projects yet" })
    ).toBeInTheDocument();
    unmount();

    section({
      initialProjects: [],
      initialMeta: { total: 0, page: 1, limit: 9 },
      initialError: true,
    });
    expect(
      screen.getByRole("heading", { name: "Projects could not be loaded" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/projects"
    );
  });

  it("paginates with plain links that keep the filters", () => {
    section(
      { initialMeta: { total: 30, page: 2, limit: 9 } },
      { pillar: "software_developer", sort: "newest", page: "2" }
    );
    const pages = screen.getByRole("navigation", {
      name: "Project result pages",
    });
    const next = within(pages).getByRole("link", { name: "Next page" });
    expect(next.getAttribute("href")).toBe(
      "/projects?pillar=software_developer&sort=newest&page=3#lab-results"
    );
    const first = within(pages).getByRole("link", { name: "Page 1" });
    // Page 1 is the default, so it drops out of the URL
    expect(first.getAttribute("href")).toBe(
      "/projects?pillar=software_developer&sort=newest#lab-results"
    );
    expect(within(pages).getByRole("link", { name: "Page 2" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByText(/page 2 of 4/)).toBeInTheDocument();
  });

  it("ships no client JavaScript from its own modules", () => {
    const folder = join(
      process.cwd(),
      "src/components/(common)/projects-page/projects-content-section"
    );
    for (const file of [
      "index.tsx",
      "registry.tsx",
      "filters.tsx",
      "query.ts",
    ]) {
      const text = readFileSync(join(folder, file), "utf8");
      expect(text, file).not.toMatch(/^\s*["']use client["']/m);
    }
  });
});

describe("projects URL helpers", () => {
  it("builds clean hrefs without defaults", () => {
    const query = parseProjectDiscoveryQuery({ pillar: "ai_automation" });
    expect(projectsHref(query)).toBe("/projects?pillar=ai_automation");
    expect(projectsHref(query, { pillar: "all" })).toBe("/projects");
    expect(projectsHref(query, { page: 2 })).toBe(
      "/projects?pillar=ai_automation&page=2"
    );
  });

  it("redirects a GET form's default-valued fields to the clean URL", () => {
    const raw = {
      search: "",
      pillar: "software_developer",
      category: "all",
      technology: "all",
      type: "all",
      year: "all",
      sort: "featured",
      utm_source: "mail",
    };
    expect(canonicalProjectsPath(raw, parseProjectDiscoveryQuery(raw))).toBe(
      "/projects?utm_source=mail&pillar=software_developer"
    );
  });

  it("leaves an already clean URL alone, whatever the parameter order", () => {
    const raw = { sort: "newest", search: "queue" };
    expect(
      canonicalProjectsPath(raw, parseProjectDiscoveryQuery(raw))
    ).toBeNull();
    expect(
      canonicalProjectsPath({}, parseProjectDiscoveryQuery({}))
    ).toBeNull();
  });
});
