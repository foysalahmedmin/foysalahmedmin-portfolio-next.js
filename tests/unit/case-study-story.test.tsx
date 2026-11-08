// @vitest-environment jsdom

import CaseStudyDetailsSection from "@/components/(common)/case-studies-page/case-study-details-section";
import {
  getCaseStudyHeader,
  getCaseStudyLinks,
} from "@/components/(common)/case-studies-page/case-study-details-section/header";
import { PageHeader } from "@/components/templates";
import type { CaseStudyArchitecture } from "@/lib/content/case-study-contract";
import type {
  TCaseStudyListItem,
  TPublicCaseStudy,
} from "@/types/case-study.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/optimized-media", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));
vi.mock("@/components/content/rich-content-renderer", () => ({
  RichContentRenderer: () => <div>Rendered body</div>,
}));
vi.mock("@/components/content/project-gallery", () => ({
  ProjectGallery: () => <div>Gallery images</div>,
}));

const architecture: CaseStudyArchitecture = {
  alt: "A request enters the gateway, is queued, handled by a service and stored.",
  layers: ["Ingress", "Core", "Storage"],
  nodes: [
    { key: "gateway", label: "Gateway", layer: "Ingress", kind: "client" },
    { key: "queue", label: "Work queue", layer: "Core", kind: "queue" },
    {
      key: "worker",
      label: "Worker",
      layer: "Core",
      kind: "service",
      note: "Takes one job at a time.",
    },
    { key: "db", label: "Records", layer: "Storage", kind: "data" },
    { key: "report", label: "Report", layer: "Storage", kind: "output" },
  ],
  edges: [
    { from: "gateway", to: "queue", label: "enqueue" },
    { from: "queue", to: "worker" },
    { from: "worker", to: "db" },
    { from: "db", to: "report" },
  ],
  steps: [
    { title: "Accept the request", focus: ["gateway", "queue"] },
    { title: "Do the work", focus: ["worker"] },
  ],
};

const study = (
  overrides: Partial<TPublicCaseStudy> = {}
): TPublicCaseStudy => ({
  _id: "c1",
  name: "A story",
  slug: "story",
  description: "Summary",
  overview: "Some background",
  challenge: "The problem",
  constraints: ["No new vendor", "One owner"],
  approach: "The approach",
  key_decisions: ["Queue the work"],
  solution: "The solution",
  architecture,
  results_summary: "It worked",
  outcomes: [
    {
      label: "fewer hand-offs",
      value: "None",
      verification_state: "derived",
    },
    { label: "checked in tests", value: "12", verification_state: "verified" },
    { label: "guess", value: "99", verification_state: "unverified" },
  ],
  tech_stack: ["Next.js"],
  services: ["Architecture"],
  learnings: ["Keep it small"],
  role: "Lead engineer",
  is_featured: false,
  ...overrides,
});

const listItem = (overrides: Partial<TCaseStudyListItem> = {}) =>
  ({
    _id: "n1",
    slug: "next-one",
    name: "Next one",
    description: "What comes next",
    is_featured: false,
    primary_pillar: "system_architect",
    ...overrides,
  }) as TCaseStudyListItem;

const renderStory = (
  overrides: Partial<TPublicCaseStudy> = {},
  props: {
    next?: TCaseStudyListItem | null;
    related?: TCaseStudyListItem[];
  } = {}
) =>
  render(
    <CaseStudyDetailsSection
      caseStudy={study(overrides)}
      related={props.related ?? []}
      next={props.next ?? null}
    />
  );

describe("case study story", () => {
  afterEach(cleanup);

  it("tells Problem, Constraints, Architecture and Result in that order", () => {
    const { container } = renderStory();
    const chapters = Array.from(container.querySelectorAll(".story-chapter"));
    expect(chapters.map((chapter) => chapter.id)).toEqual([
      "problem",
      "constraints",
      "architecture",
      "result",
    ]);
    expect(
      chapters.map((chapter) => chapter.querySelector("h2")?.textContent)
    ).toEqual(["Problem", "Constraints", "Architecture", "Result"]);
    expect(screen.getByText("The problem")).toBeInTheDocument();
    expect(screen.getByText("No new vendor")).toBeInTheDocument();
    expect(screen.getByText("The approach")).toBeInTheDocument();
    expect(screen.getByText("It worked")).toBeInTheDocument();
    // The chapters carry no numerals: order is the list and the wire
    expect(container.querySelector(".story")!.textContent).not.toMatch(
      /\b0\d\b/
    );
  });

  it("binds the chapters to the engine: scope, focus list and one diagram", () => {
    const { container } = renderStory();
    const scope = container.querySelector("[data-highlight-scope]")!;
    const list = scope.querySelector<HTMLElement>("[data-scroll-focus]")!;
    expect(
      list.querySelectorAll("[data-focus-row]").length
    ).toBeGreaterThanOrEqual(4);
    expect(scope.querySelectorAll("svg")).toHaveLength(1);
    expect(list).toHaveAttribute("data-diagram", "true");
    expect(list.style.getPropertyValue("--story-rows")).toBe("4");
    // One figure, a direct child of the grid, just ahead of the Architecture chapter
    expect(
      Array.from(list.children).map(
        (child) =>
          child.id || (child.classList.contains("story-figure") ? "figure" : "")
      )
    ).toEqual(["problem", "constraints", "figure", "architecture", "result"]);
  });

  it("names only existing diagram ids in every row's data-highlights", () => {
    const { container } = renderStory();
    const ids = new Set(
      Array.from(container.querySelectorAll("[data-highlight-id]")).map(
        (element) => element.getAttribute("data-highlight-id")!
      )
    );
    const rows = Array.from(
      container.querySelectorAll<HTMLElement>(
        "[data-focus-row][data-highlights]"
      )
    );
    expect(rows.length).toBe(3);
    for (const row of rows) {
      const named = row.dataset.highlights!.split(",");
      expect(named.length).toBeGreaterThan(0);
      for (const id of named) expect(ids.has(id), id).toBe(true);
    }
    const [accept, work, result] = rows.map((row) => row.dataset.highlights);
    // A step lights its components and the edges that enter or leave them
    expect(accept).toBe("gateway,queue,gateway->queue,queue->worker");
    expect(work).toBe("worker,queue->worker,worker->db");
    // The result lights what the system produces
    expect(result).toBe("report,db->report");
    expect(
      within(rows[0]!).getByRole("heading", { name: "Accept the request" })
    ).toBeInTheDocument();
  });

  it("leaves the introduction rows without highlights so the diagram rests", () => {
    const { container } = renderStory();
    const resting = Array.from(
      container.querySelectorAll("[data-focus-row]:not([data-highlights])")
    );
    expect(resting.map((row) => row.closest(".story-chapter")!.id)).toEqual([
      "problem",
      "constraints",
      "architecture",
    ]);
  });

  it("shows outcomes with a verification mark and drops unverified ones", () => {
    const { container } = renderStory();
    const marks = Array.from(container.querySelectorAll(".status-mark"));
    expect(marks.map((mark) => mark.getAttribute("data-state"))).toEqual([
      "derived",
      "verified",
    ]);
    expect(marks.map((mark) => mark.textContent)).toEqual([
      "Derived from approved data",
      "Verified",
    ]);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByText("99")).toBeNull();
  });

  it("keeps the rest of the case file: facts, decisions, tools, services, learnings, body", () => {
    renderStory({
      client_name: "Acme Ltd",
      team_size: 1,
      duration_label: "Six weeks",
      rich_content: { type: "doc" } as never,
      images: [{ _id: "i1", url: "/a.png" } as never],
    });
    expect(screen.getByText("Acme Ltd")).toBeInTheDocument();
    expect(screen.getByText("Lead engineer")).toBeInTheDocument();
    expect(screen.getByText("1 person")).toBeInTheDocument();
    expect(screen.getByText("Six weeks")).toBeInTheDocument();
    expect(screen.getByText("Some background")).toBeInTheDocument();
    expect(screen.getByText("Queue the work")).toBeInTheDocument();
    expect(screen.getByText("The solution")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(
      screen.getByText("Architecture", { selector: "span" })
    ).toBeInTheDocument();
    expect(screen.getByText("Keep it small")).toBeInTheDocument();
    expect(screen.getByText("Rendered body")).toBeInTheDocument();
    expect(screen.getByText("Gallery images")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Gallery" })
    ).toBeInTheDocument();
  });

  it("shows the client only when the public payload carries it", () => {
    renderStory();
    expect(screen.queryByText("Client", { selector: "dt" })).toBeNull();
  });

  it("draws no diagram and leaves the chapters standing when there is no architecture", () => {
    const { container } = renderStory({ architecture: null });
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector(".story-figure")).toBeNull();
    expect(container.querySelector("[data-highlight-id]")).toBeNull();
    expect(container.querySelector("[data-scroll-focus]")).toHaveAttribute(
      "data-diagram",
      "false"
    );
    expect(container.querySelector("[data-highlights]")).toBeNull();
    expect(
      Array.from(container.querySelectorAll(".story-chapter")).map((c) => c.id)
    ).toEqual(["problem", "constraints", "architecture", "result"]);
  });

  it("does not draw a diagram that breaks the contract", () => {
    const { container } = renderStory({
      architecture: {
        ...architecture,
        edges: [{ from: "gateway", to: "ghost" }],
      },
    });
    expect(container.querySelector("svg")).toBeNull();
  });

  it("skips a chapter that has nothing to say instead of inventing copy", () => {
    const { container } = renderStory({
      constraints: [],
      architecture: null,
      approach: undefined,
      key_decisions: [],
      solution: undefined,
      tech_stack: [],
    });
    expect(
      Array.from(container.querySelectorAll(".story-chapter")).map((c) => c.id)
    ).toEqual(["problem", "result"]);
  });

  it("closes with the next case file, then the others", () => {
    renderStory(
      {},
      {
        next: listItem(),
        related: [
          listItem(),
          listItem({ _id: "r2", slug: "r2", name: "Another" }),
        ],
      }
    );
    const next = screen.getByRole("region", { name: "Next case file" });
    expect(
      within(next).getByRole("link", { name: /Next one/ })
    ).toHaveAttribute("href", "/case-studies/next-one");
    const more = screen.getByRole("region", { name: "More problems solved" });
    expect(within(more).queryByText("Next one")).toBeNull();
    expect(within(more).getByRole("link", { name: /Another/ })).toHaveAttribute(
      "href",
      "/case-studies/r2"
    );
  });

  it("ships no client directive", () => {
    for (const file of [
      "src/components/(common)/case-studies-page/case-study-details-section/index.tsx",
      "src/components/(common)/case-studies-page/case-study-details-section/header.tsx",
      "src/components/content/case-study-diagram.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/^["']use client["']/m);
    }
  });
});

describe("case study header", () => {
  afterEach(cleanup);

  it("puts the path, lede, kind and only safe links in the shared header", () => {
    const header = getCaseStudyHeader(
      study({
        engagement_type: "internal",
        live_url: "http://localhost:3000/preview",
        source_url: "https://github.com/x/y",
      })
    );
    render(<PageHeader level="detail" {...header} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "A story" })
    ).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Internal product")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Case studies" })).toHaveAttribute(
      "href",
      "/case-studies"
    );
    expect(
      screen.getByText("A story", { selector: "[aria-current]" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /open live product/i })
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: /view public source/i })
    ).toHaveAttribute("href", "https://github.com/x/y");
    expect(getCaseStudyLinks(study())).toEqual([]);
  });
});
