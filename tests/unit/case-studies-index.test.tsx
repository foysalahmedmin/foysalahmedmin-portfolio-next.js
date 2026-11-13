// @vitest-environment jsdom

import CaseStudiesContentSection, {
  type CaseStudiesContentSectionProps,
} from "@/components/(common)/case-studies-page/case-studies-content-section";
import { CASE_STUDY_ENGAGEMENT_LABELS } from "@/lib/content/case-study-contract";
import { parseCaseStudyDiscoveryQuery } from "@/lib/discovery/case-study-discovery";
import type { TCaseStudyListItem } from "@/types/case-study.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ImageProps } from "next/image";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: ImageProps) => (
    <img
      src={typeof src === "string" ? src : ""}
      alt={alt}
      className={className}
    />
  ),
}));

afterEach(cleanup);

const study = (
  slug: string,
  overrides: Partial<TCaseStudyListItem> = {}
): TCaseStudyListItem => ({
  _id: `id-${slug}`,
  slug,
  name: `Study ${slug}`,
  description: `Problem of ${slug}`,
  engagement_type: "client",
  primary_pillar: "software_developer",
  outcomes: [
    {
      label: `Outcome label ${slug}`,
      value: `Value ${slug}`,
      verification_state: "derived",
    },
  ],
  is_featured: false,
  ...overrides,
});

const view = (
  search: Record<string, string> = {},
  overrides: Partial<CaseStudiesContentSectionProps> = {}
) =>
  render(
    <CaseStudiesContentSection
      items={[study("a"), study("b", { engagement_type: "lab" })]}
      meta={{ total: 2, page: 1, limit: 9 }}
      categories={[
        {
          _id: "c1",
          name: "Platforms",
          slug: "platforms",
          sequence: 1,
          tags: [],
        },
      ]}
      facets={{ technologies: ["Next.js", "Redis"] }}
      query={parseCaseStudyDiscoveryQuery(search)}
      {...overrides}
    />
  );

const hrefOf = (name: RegExp | string) =>
  new URL(
    screen.getByRole("link", { name }).getAttribute("href")!,
    "https://example.test"
  );

describe("CaseStudiesContentSection filters", () => {
  it("is a GET form with the discovery field names and no script", () => {
    const { container } = view({
      search: "queue",
      pillar: "software_developer",
    });
    const form = screen.getByRole("search");
    expect(form.tagName).toBe("FORM");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/case-studies");
    const names = Array.from(
      form.querySelectorAll<HTMLElement>("input, select")
    ).map((control) => control.getAttribute("name"));
    expect(names).toEqual([
      "search",
      "pillar",
      "category",
      "technology",
      "engagement",
      "sort",
    ]);
    expect(screen.getByLabelText("Search")).toHaveValue("queue");
    expect(screen.getByLabelText("Role")).toHaveValue("software_developer");
    expect(screen.getByLabelText("Tool")).toHaveValue("all");
    expect(screen.getByLabelText("Type")).toHaveValue("all");
    expect(within(form).getByRole("button", { name: "Apply" })).toHaveAttribute(
      "type",
      "submit"
    );
    // The page needs no client JavaScript of its own: the filters are native controls
    expect(container.querySelector("script")).toBeNull();
  });

  it("offers the published categories and tools and keeps an unavailable selection visible", () => {
    view({ category: "gone", technology: "Elixir" });
    expect(
      within(screen.getByLabelText("Category")).getByRole("option", {
        name: "Unavailable category: gone",
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toHaveValue("gone");
    expect(screen.getByLabelText("Tool")).toHaveValue("Elixir");
    expect(
      within(screen.getByLabelText("Tool")).getAllByRole("option")
    ).toHaveLength(4);
  });

  it("shows no chips and no clear link when nothing is filtered", () => {
    view();
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Clear filters" })).toBeNull();
  });

  it("drops exactly one param per chip and keeps the rest, resetting the page", () => {
    view({
      search: "queue",
      pillar: "software_developer",
      technology: "Redis",
      sort: "name",
      page: "2",
    });
    const chips = within(screen.getByRole("list", { name: "Active filters" }));
    expect(chips.getAllByRole("listitem")).toHaveLength(3);

    const noRole = hrefOf("Remove filter Role: Software Developer");
    expect(noRole.pathname).toBe("/case-studies");
    expect([...noRole.searchParams.keys()].sort()).toEqual([
      "search",
      "sort",
      "technology",
    ]);

    const noSearch = hrefOf(/^Remove filter Search/);
    expect(noSearch.searchParams.has("search")).toBe(false);
    expect(noSearch.searchParams.get("pillar")).toBe("software_developer");
    expect(noSearch.searchParams.has("page")).toBe(false);

    const noTool = hrefOf("Remove filter Tool: Redis");
    expect(noTool.searchParams.has("technology")).toBe(false);
    expect(noTool.searchParams.get("search")).toBe("queue");
    expect(noTool.searchParams.get("sort")).toBe("name");

    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/case-studies"
    );
  });
});

describe("CaseStudiesContentSection results", () => {
  it("renders one case file row per study linked to its case file, with the engagement chip", () => {
    const { container } = view();
    const rows = container.querySelectorAll("ul.case-files > li.case-file");
    expect(rows).toHaveLength(2);
    expect(
      within(rows[0] as HTMLElement).getByRole("link", { name: "Study a" })
    ).toHaveAttribute("href", "/case-studies/a");
    expect(
      within(rows[1] as HTMLElement).getByRole("link", { name: "Study b" })
    ).toHaveAttribute("href", "/case-studies/b");
    expect(rows[0]!.querySelector("[data-engagement]")).toHaveTextContent(
      CASE_STUDY_ENGAGEMENT_LABELS.client
    );
    expect(rows[1]!.querySelector("[data-engagement]")).toHaveTextContent(
      CASE_STUDY_ENGAGEMENT_LABELS.lab
    );
    expect(rows[0]).toHaveTextContent("Problem of a");
    expect(rows[0]).toHaveTextContent("Value a");
    // The preview is decoration; the row already says everything
    expect(rows[0]!.querySelector(".case-file__peek")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("states the result count in Mono and says when filters apply", () => {
    const { rerender } = view();
    const count = document.querySelector(".cfx-count")!;
    expect(count).toHaveClass("t-mono");
    expect(count).toHaveTextContent("2 case files");
    expect(count).not.toHaveTextContent("match");
    rerender(
      <CaseStudiesContentSection
        items={[study("a")]}
        meta={{ total: 1, page: 1, limit: 9 }}
        categories={[]}
        facets={{ technologies: [] }}
        query={parseCaseStudyDiscoveryQuery({ search: "a" })}
      />
    );
    expect(document.querySelector(".cfx-count")).toHaveTextContent(
      "1 case file match"
    );
  });

  it("has a decorative topology fragment hidden from assistive technology", () => {
    const { container } = view();
    const svg = container.querySelector("svg.cfx-topology")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.querySelectorAll("rect").length).toBeGreaterThan(2);
    expect(svg.querySelector("a, button, text")).toBeNull();
  });

  it("shows a calm empty state with a clear link when filters match nothing", () => {
    const { container } = view(
      { search: "nothing" },
      { items: [], meta: { total: 0, page: 1, limit: 9 } }
    );
    expect(container.querySelector(".case-file")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "No matching case studies" })
    ).toBeInTheDocument();
    const clear = within(
      container.querySelector<HTMLElement>(".cfx-empty")!
    ).getByRole("link", { name: "Clear filters" });
    expect(clear).toHaveAttribute("href", "/case-studies");
  });

  it("shows the plain empty state with no clear link on an empty library", () => {
    view({}, { items: [], meta: { total: 0, page: 1, limit: 9 } });
    expect(
      screen.getByRole("heading", { name: "No published case studies yet" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear filters" })).toBeNull();
  });

  it("shows the unavailable state instead of a count when the library failed to load", () => {
    const { container } = view(
      {},
      { items: [], meta: { total: 0, page: 1, limit: 9 }, initialError: true }
    );
    expect(
      screen.getByRole("heading", { name: "Case studies could not be loaded" })
    ).toBeInTheDocument();
    expect(container.querySelector(".cfx-count")).toBeNull();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/case-studies"
    );
  });
});

describe("CaseStudiesContentSection pagination", () => {
  it("links pages as plain links that keep every filter", () => {
    view(
      {
        pillar: "software_developer",
        search: "queue",
        sort: "name",
        page: "2",
      },
      {
        items: [study("a")],
        meta: { total: 21, page: 2, limit: 9 },
      }
    );
    const nav = within(
      screen.getByRole("navigation", { name: "Case study result pages" })
    );
    const next = new URL(
      nav.getByRole("link", { name: "Next page" }).getAttribute("href")!,
      "https://example.test"
    );
    expect(next.pathname).toBe("/case-studies");
    expect(next.searchParams.get("page")).toBe("3");
    expect(next.searchParams.get("pillar")).toBe("software_developer");
    expect(next.searchParams.get("search")).toBe("queue");
    expect(next.searchParams.get("sort")).toBe("name");
    const first = new URL(
      nav.getByRole("link", { name: "Page 1" }).getAttribute("href")!,
      "https://example.test"
    );
    expect(first.searchParams.has("page")).toBe(false);
    expect(first.searchParams.get("pillar")).toBe("software_developer");
    expect(nav.getByRole("link", { name: "Page 2" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(document.querySelector(".cfx-count")).toHaveTextContent(
      "Page 2 of 3"
    );
  });

  it("renders no pagination for a single page", () => {
    view();
    expect(
      screen.queryByRole("navigation", { name: "Case study result pages" })
    ).toBeNull();
  });
});

describe("case-studies route source", () => {
  it("keeps the route's content section free of client components", () => {
    const folder = join(
      process.cwd(),
      "src/components/(common)/case-studies-page/case-studies-content-section"
    );
    for (const name of readdirSync(folder)) {
      expect(readFileSync(join(folder, name), "utf8"), name).not.toMatch(
        /^\s*["']use client["']/m
      );
    }
  });
});

describe("CaseStudiesContentSection engagement type", () => {
  it("offers the four engagement types and shows the active one as a removable chip", () => {
    const { container } = view({ engagement: "internal" });
    const select = screen.getByLabelText("Type") as HTMLSelectElement;
    expect(select).toHaveValue("internal");
    expect(
      Array.from(select.options).map((option) => option.textContent)
    ).toEqual([
      "All types",
      "Client engagement",
      "Internal product",
      "Open source",
      "Lab experiment",
    ]);
    const chip = Array.from(container.querySelectorAll("a")).find((link) =>
      link.textContent?.includes("Internal product")
    );
    expect(chip?.getAttribute("href")).toBe("/case-studies");
  });
});
