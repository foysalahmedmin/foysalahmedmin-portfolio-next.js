// @vitest-environment jsdom

import type { TPublicServiceDto } from "@/app/api/services/service.type";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import ServicesSection from "@/components/sections/services-section";
import { orderSlabs } from "@/components/sections/services-section/stack";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

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

const ARCHITECTURE = service({
  slug: "architecture-system-design",
  title: "Architecture & System Design",
  primary_pillar: "system_architect",
  sequence: 0,
  outcome: "A clear technical blueprint that reduces risk before the build.",
  capabilities: [
    "Architecture and technical decision records",
    "Database design",
  ],
  deliverables: ["Solution architecture overview", "Decision record"],
  technologies: ["MongoDB", "PostgreSQL"],
});
const SOFTWARE = service({
  slug: "product-software-development",
  title: "Product & Software Development",
  primary_pillar: "software_developer",
  sequence: 1,
  outcome: "A working, maintainable product delivered in small steps.",
  capabilities: ["Web applications and dashboards"],
  deliverables: ["Working software in reviewable releases"],
  technologies: ["Next.js", "React"],
});
const AI = service({
  slug: "ai-workflow-automation",
  title: "AI & Workflow Automation",
  primary_pillar: "ai_automation",
  sequence: 2,
  outcome: "Repetitive manual work replaced by automation your team can trust.",
  capabilities: ["Workflow and integration automation"],
  deliverables: ["Runbook for your team"],
  technologies: ["Node.js", "Python"],
});

const site = createEmergencyPublicSite();
const renderStack = (
  services: TPublicServiceDto[],
  heading?: string,
  layout = "stack"
) =>
  render(
    <ServicesSection
      pillars={site.pillars}
      services={services}
      layout={layout}
      heading={heading}
    />
  );

/** The slabs are the items of the ordered list; the specs inside them are unordered lists. */
const slabsOf = () =>
  Array.from(document.querySelectorAll<HTMLElement>("ol > li"));

describe("ServicesSection layout stack", () => {
  it("is the pinned Solutions chapter, labelled by its heading", () => {
    const { container } = renderStack([ARCHITECTURE, SOFTWARE, AI]);
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "services");
    expect(section).toHaveAttribute("data-chapter", "stack");
    expect(section).toHaveAttribute("data-chapter-label", "Solutions");
    expect(section).toHaveAttribute("data-tone", "ink");
    expect(section).toHaveAttribute("data-pin-scene");
    expect(section).toHaveAttribute("data-beats", "1");

    const title = screen.getByRole("heading", { level: 2 });
    expect(title).toHaveTextContent("Three layers. Take one, or all.");
    expect(section.getAttribute("aria-labelledby")).toBe(title.id);
    expect(
      screen.getByText(/Every system has the same three layers/)
    ).toBeInTheDocument();
  });

  it("takes a custom heading", () => {
    renderStack([ARCHITECTURE], "Pick a layer");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Pick a layer"
    );
  });

  it("renders three slabs, foundation first, whatever order the services arrive in", () => {
    renderStack([AI, SOFTWARE, ARCHITECTURE]);
    const slabs = slabsOf();
    expect(slabs).toHaveLength(3);
    expect(
      slabs.map(
        (slab) => within(slab).getByRole("heading", { level: 3 }).textContent
      )
    ).toEqual([
      "Architecture & System Design",
      "Product & Software Development",
      "AI & Workflow Automation",
    ]);
    expect(slabs.map((slab) => slab.getAttribute("data-pillar"))).toEqual([
      "system_architect",
      "software_developer",
      "ai_automation",
    ]);
    expect(slabsOf()[0]!.parentElement!.tagName).toBe("OL");
  });

  it("holds every spec in the markup, so the unpinned panels are complete", () => {
    renderStack([ARCHITECTURE, SOFTWARE, AI]);
    const [foundation] = slabsOf();
    const slab = within(foundation!);
    for (const label of [
      "Outcome",
      "Capabilities",
      "Deliverables",
      "Technologies",
    ]) {
      expect(slab.getByText(label)).toBeInTheDocument();
    }
    expect(
      slab.getByText(
        "A clear technical blueprint that reduces risk before the build."
      )
    ).toBeInTheDocument();
    expect(
      slab.getByText("Architecture and technical decision records")
    ).toBeInTheDocument();
    expect(slab.getByText("Database design")).toBeInTheDocument();
    expect(
      slab.getByText("Solution architecture overview")
    ).toBeInTheDocument();
    expect(slab.getByText("Decision record")).toBeInTheDocument();
    expect(slab.getByText("MongoDB")).toBeInTheDocument();
    expect(slab.getByText("PostgreSQL")).toBeInTheDocument();
    // The slab is the role's texture, not a hue, and is decoration
    expect(foundation!.querySelector(".slab-plate")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(foundation!.querySelector(".tx-blueprint")).not.toBeNull();
  });

  it("names the role above the title only when it adds something", () => {
    renderStack([
      service({
        slug: "x",
        title: "System Architect",
        primary_pillar: "system_architect",
      }),
      SOFTWARE,
    ]);
    const [first, second] = slabsOf();
    expect(
      within(first!).queryByText("System Architect", { selector: "p" })
    ).toBeNull();
    expect(within(second!).getByText("Software Developer")).toBeInTheDocument();
  });

  it("leaves out a spec group the data does not have", () => {
    renderStack([
      service({ slug: "bare", title: "Bare", primary_pillar: "ai_automation" }),
    ]);
    expect(slabsOf()).toHaveLength(1);
    for (const label of [
      "Outcome",
      "Capabilities",
      "Deliverables",
      "Technologies",
    ]) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it("shows at most three slabs and still works with one", () => {
    const extra = service({ slug: "extra", title: "Extra", sequence: 3 });
    renderStack([ARCHITECTURE, SOFTWARE, AI, extra]);
    expect(slabsOf()).toHaveLength(3);
    expect(screen.queryByText("Extra")).toBeNull();
    cleanup();
    renderStack([SOFTWARE]);
    expect(slabsOf()).toHaveLength(1);
  });

  it("falls back to the role cards when no services are given, and to nothing without roles", () => {
    renderStack([]);
    expect(slabsOf().length).toBeGreaterThan(0);
    cleanup();
    const { container } = render(
      <ServicesSection pillars={[]} services={[]} layout="stack" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("orders unknown roles after the known ones, keeping the order given", () => {
    const base = { capabilities: [], deliverables: [], technologies: [] };
    const plain = (key: string) => ({ key, label: key, ...base });
    const keys = (items: Parameters<typeof orderSlabs>[0]) =>
      orderSlabs(items).map((slab) => slab.key);
    expect(
      keys([
        plain("a"),
        { ...plain("ai"), pillar: "ai_automation" },
        { ...plain("sys"), pillar: "system_architect" },
      ])
    ).toEqual(["sys", "ai", "a"]);
    expect(
      keys([
        plain("a"),
        plain("b"),
        { ...plain("ai"), pillar: "ai_automation" },
      ])
    ).toEqual(["ai", "a", "b"]);
  });
});

describe("ServicesSection About layouts are unchanged", () => {
  it("keeps the grid: a plain section with cards, no pin", () => {
    const { container } = renderStack(
      [ARCHITECTURE, SOFTWARE],
      undefined,
      "grid"
    );
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "services");
    expect(section).not.toHaveAttribute("data-pin-scene");
    expect(section).not.toHaveAttribute("data-chapter");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Solutions built around your problem, not a stack",
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("What is included")).toHaveLength(2);
    expect(container.querySelector(".slab")).toBeNull();
  });

  it("keeps the cards layout", () => {
    const { container } = renderStack([ARCHITECTURE], undefined, "cards");
    expect(container.querySelector("[data-pin-scene]")).toBeNull();
    expect(screen.getByText("What you receive")).toBeInTheDocument();
    expect(screen.getByText("System Architect")).toBeInTheDocument();
  });
});
