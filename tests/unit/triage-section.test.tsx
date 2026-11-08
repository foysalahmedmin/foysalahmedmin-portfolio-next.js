// @vitest-environment jsdom

import type { TPublicServiceDto } from "@/app/api/services/service.type";
import TriageSection from "@/components/sections/triage-section";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

/** The seeded service problems (src/lib/seed/foundation.ts), trimmed to what the section reads. */
const service = (
  overrides: Partial<TPublicServiceDto> & Pick<TPublicServiceDto, "slug">
): TPublicServiceDto => ({
  locale: "en",
  title: overrides.slug,
  secondary_pillars: [],
  sequence: 0,
  is_featured: true,
  published_at: "2026-07-17T00:00:00.000Z",
  outcome: "",
  capabilities: [],
  deliverables: [],
  technologies: [],
  problems: [],
  ...overrides,
});

const SERVICES: TPublicServiceDto[] = [
  service({
    slug: "architecture-system-design",
    primary_pillar: "system_architect",
    problems: [
      {
        key: "software-keeps-breaking",
        pain: "Our software keeps breaking as we grow.",
        approach: "Map the failure points and migrate in safe steps.",
        deliverable: "Architecture review, decision record, migration plan",
        outcome: "A system that scales on purpose.",
        case_slug: "schema-migrations",
      },
      {
        key: "unknown-cost",
        pain: "Nobody can tell us what this will cost to build or run.",
        approach: "Compare realistic options and costs.",
      },
    ],
  }),
  service({
    slug: "product-software-development",
    primary_pillar: "software_developer",
    sequence: 1,
    problems: [
      {
        key: "idea to product/spreadsheet",
        pain: "We have an idea, or a spreadsheet, that needs to become a real product.",
        approach: "Define the smallest useful version.",
        outcome: "Something real in users' hands.",
      },
    ],
  }),
  service({
    slug: "ai-workflow-automation",
    primary_pillar: "ai_automation",
    sequence: 2,
    problems: [
      {
        key: "repetitive-error-prone-steps",
        pain: "My team spends hours on repetitive, error-prone steps.",
        approach: "Automate the manual steps with monitoring and a switch-off.",
        deliverable: "Automated workflow in production, runbook",
        outcome: "Fewer manual steps and fewer errors.",
        case_slug: "upkeep",
      },
    ],
  }),
];

describe("TriageSection", () => {
  it("renders nothing without problems", () => {
    expect(
      render(<TriageSection services={[]} />).container
    ).toBeEmptyDOMElement();
    expect(
      render(
        <TriageSection services={[service({ slug: "empty", problems: [] })]} />
      ).container
    ).toBeEmptyDOMElement();
  });

  it("is a labelled chapter whose title is the section heading", () => {
    const { container } = render(<TriageSection services={SERVICES} />);
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "triage");
    expect(section).toHaveAttribute("data-chapter", "triage");
    expect(section).toHaveAttribute("data-chapter-label", "Problems");
    expect(section).toHaveAttribute("data-tone", "ink");

    const title = screen.getByRole("heading", { level: 2 });
    expect(title).toHaveTextContent("What is slowing your business down?");
    expect(section.getAttribute("aria-labelledby")).toBe(title.id);
    expect(
      screen.getByText("Pick the sentence that sounds like your week.")
    ).toBeInTheDocument();
  });

  it("takes a custom heading", () => {
    render(<TriageSection services={SERVICES} heading="Where it hurts" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Where it hurts"
    );
  });

  it("lists every pain in service order as an ordered list of h3 sentences, with no numerals", () => {
    render(<TriageSection services={SERVICES} />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const rows = within(list).getAllByRole("listitem");
    expect(
      rows.map(
        (row) => within(row).getByRole("heading", { level: 3 }).textContent
      )
    ).toEqual([
      "Our software keeps breaking as we grow.",
      "Nobody can tell us what this will cost to build or run.",
      "We have an idea, or a spreadsheet, that needs to become a real product.",
      "My team spends hours on repetitive, error-prone steps.",
    ]);
    expect(list.textContent).not.toMatch(/\b0?[1-9]\b\./);
  });

  it("marks the list and rows for the scroll-focus engine, grouped Systems or AI Automation", () => {
    const { container } = render(<TriageSection services={SERVICES} />);
    const list = container.querySelector("ol")!;
    expect(list).toHaveAttribute("data-scroll-focus");
    const rows = Array.from(list.querySelectorAll("li"));
    expect(rows.every((row) => row.hasAttribute("data-focus-row"))).toBe(true);
    expect(rows.map((row) => row.getAttribute("data-group"))).toEqual([
      "systems",
      "systems",
      "systems",
      "ai-automation",
    ]);
    // Server markup is complete: no row carries an active or hidden state before the engine
    expect(container.querySelector("[data-active]")).toBeNull();
    expect(container.querySelector("[hidden], [inert]")).toBeNull();
    // The sticky label offers both groups and is decoration (each row names its group too)
    const labels = container.querySelector(".triage-groups")!;
    expect(labels).toHaveAttribute("aria-hidden", "true");
    expect(labels.textContent).toBe("SystemsAI Automation");
    expect(within(rows[3]!).getByText("AI Automation")).toBeInTheDocument();
  });

  it("shows only the groups that have problems", () => {
    const { container } = render(<TriageSection services={[SERVICES[0]!]} />);
    expect(container.querySelector(".triage-groups")!.textContent).toBe(
      "Systems"
    );
  });

  it("shows every detail line, all labelled, and skips the ones the data lacks", () => {
    render(<TriageSection services={SERVICES} />);
    const rows = screen.getAllByRole("listitem");

    const first = within(rows[0]!);
    expect(first.getByText("Approach")).toBeInTheDocument();
    expect(
      first.getByText("Map the failure points and migrate in safe steps.")
    ).toBeInTheDocument();
    expect(first.getByText("Deliverable")).toBeInTheDocument();
    expect(first.getByText("Outcome")).toBeInTheDocument();

    // Row two has an approach only
    const second = within(rows[1]!);
    expect(second.getByText("Approach")).toBeInTheDocument();
    expect(second.queryByText("Deliverable")).toBeNull();
    expect(second.queryByText("Outcome")).toBeNull();
  });

  it("links each pain to the contact form with its topic, URL-encoded", () => {
    render(<TriageSection services={SERVICES} />);
    const links = screen.getAllByRole("link", {
      name: /Describe this problem/,
    });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/contact?topic=software-keeps-breaking",
      "/contact?topic=unknown-cost",
      "/contact?topic=idea%20to%20product%2Fspreadsheet",
      "/contact?topic=repetitive-error-prone-steps",
    ]);
  });

  it("links a related case file only where the problem has one", () => {
    render(<TriageSection services={SERVICES} />);
    const links = screen.getAllByRole("link", { name: "Related case file" });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/case-studies/schema-migrations",
      "/case-studies/upkeep",
    ]);
    const rows = screen.getAllByRole("listitem");
    expect(
      within(rows[1]!).queryByRole("link", { name: "Related case file" })
    ).toBeNull();
  });

  it("ties the parallax to the section progress, which the engine writes and CSS reads as finished when unbound", () => {
    const { container } = render(<TriageSection services={SERVICES} />);
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("data-scroll-progress");
    expect(container.querySelector(".triage-ghost")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });
});
