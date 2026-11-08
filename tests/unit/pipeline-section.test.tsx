// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TSiteWorkflowExample } from "@/app/api/site/site.type";
import ArchitectureWorkflowSection from "@/components/sections/architecture-workflow-section";
import PipelineSection, {
  ILLUSTRATIVE_LABEL,
  pipelineGeometry,
  pulseExpression,
  switchExpression,
} from "@/components/sections/architecture-workflow-section/pipeline";
import { createSiteContentV8 } from "@/lib/seed/foundation-site-content";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

/** The seeded example, as the public DTO carries it. */
const seeded = (): TSiteWorkflowExample =>
  JSON.parse(
    JSON.stringify(createSiteContentV8().workflow_example)
  ) as TSiteWorkflowExample;

const siteWith = (workflow?: TSiteWorkflowExample) => ({
  ...createEmergencyPublicSite(),
  ...(workflow ? { workflow_example: workflow } : {}),
});

describe("PipelineSection (home layout)", () => {
  it("renders every node in order with what it does and what happens when it fails", () => {
    const workflow = seeded();
    render(<PipelineSection workflow={workflow} />);

    const steps = within(
      screen.getByRole("list", { name: workflow.title })
    ).getAllByRole("listitem");
    expect(steps).toHaveLength(workflow.nodes.length);
    steps.forEach((step, index) => {
      const node = workflow.nodes[index]!;
      expect(within(step).getByRole("heading", { level: 3 })).toHaveTextContent(
        node.label
      );
      expect(step).toHaveTextContent(node.summary);
      expect(step).toHaveTextContent(`When it fails ${node.on_failure}`);
    });
    expect(screen.getAllByText("When it fails")).toHaveLength(
      workflow.nodes.length
    );
  });

  it("carries the caption and the mandatory illustrative label", () => {
    const workflow = seeded();
    render(<PipelineSection workflow={workflow} />);

    expect(ILLUSTRATIVE_LABEL).toBe("Illustrative, not a client project");
    expect(screen.getByText(ILLUSTRATIVE_LABEL)).toBeInTheDocument();
    expect(screen.getByText(workflow.caption)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: workflow.title })
    ).toBeInTheDocument();
  });

  it("lets the section heading override the data title", () => {
    render(
      <PipelineSection workflow={seeded()} heading="From request to done" />
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "From request to done" })
    ).toBeInTheDocument();
  });

  it("shows the switch as Off with its sentence, without any script", () => {
    const workflow = seeded();
    const { container } = render(<PipelineSection workflow={workflow} />);

    const off = container.querySelector(".pipeline-off")!;
    expect(off).toHaveTextContent(`Off ${workflow.switch_off}`);
    // A visual only: no control, no input, nothing for a script to hold
    expect(off.querySelector(".pipeline-switch")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(off.querySelector("button, input, a")).toBeNull();
  });

  it("leaves the switch out when the data has no sentence", () => {
    const workflow = { ...seeded(), switch_off: undefined };
    const { container } = render(<PipelineSection workflow={workflow} />);
    expect(container.querySelector(".pipeline-off")).toBeNull();
  });

  it("omits the failure line of a node that has none", () => {
    const workflow = seeded();
    delete workflow.nodes[1]!.on_failure;
    render(<PipelineSection workflow={workflow} />);
    expect(screen.getAllByText("When it fails")).toHaveLength(
      workflow.nodes.length - 1
    );
  });

  it("is a pinned scene whose beats equal the node count, with the chapter marks", () => {
    for (const keep of [5, 3]) {
      const workflow = seeded();
      workflow.nodes = workflow.nodes.slice(0, keep);
      const { container, unmount } = render(
        <PipelineSection workflow={workflow} />
      );

      const scene = container.querySelector("[data-pin-scene]")!;
      expect(scene).toHaveAttribute("data-beats", String(keep));
      expect(container.querySelectorAll("[data-pin-beat]")).toHaveLength(keep);
      expect(scene.tagName).toBe("SECTION");
      expect(scene).toHaveAttribute("id", "architecture-workflow");
      expect(scene).toHaveAttribute(
        "aria-labelledby",
        "architecture-workflow-heading"
      );
      expect(scene).toHaveAttribute("data-chapter", "pipeline");
      expect(scene).toHaveAttribute("data-chapter-label", "Automation");
      unmount();
    }
  });

  it("draws the wire as code-native SVG, with the text in HTML", () => {
    const workflow = seeded();
    const { container } = render(<PipelineSection workflow={workflow} />);

    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg.querySelectorAll(".pipeline-chip")).toHaveLength(
      workflow.nodes.length
    );
    expect(svg.querySelector("text")).toBeNull();
    expect(container.querySelector("img, canvas, video")).toBeNull();
    // One path length for every layer of the wire, so CSS can draw them with a single number
    for (const path of svg.querySelectorAll(
      "path[d]:not(.pipeline-chip-glyph)"
    )) {
      expect(path).toHaveAttribute("pathLength", "1");
    }
  });

  it("is complete without the engine: nothing hidden, nothing numbered, no controls", () => {
    const { container } = render(<PipelineSection workflow={seeded()} />);

    expect(container.querySelector("[data-pinned]")).toBeNull();
    expect(container.querySelector("[hidden], [inert]")).toBeNull();
    const hidden = Array.from(container.querySelectorAll("[aria-hidden]"));
    expect(hidden.every((el) => el.matches("svg, .pipeline-switch"))).toBe(
      true
    );
    expect(container.querySelector("button, input, select, a")).toBeNull();
    expect(container.textContent).not.toMatch(/\b0\d\b|\bstep \d\b/i);
    // The motion is read from the story clock and falls back to "finished" when it is absent
    expect(
      (
        container.querySelector(".pipeline-diagram") as HTMLElement
      ).style.getPropertyValue("--pulse")
    ).toContain("var(--pin-position, 99)");
  });

  it("renders nothing without data, or with fewer than two nodes", () => {
    expect(render(<PipelineSection />).container).toBeEmptyDOMElement();
    const one = seeded();
    one.nodes = one.nodes.slice(0, 1);
    expect(
      render(<PipelineSection workflow={one} />).container
    ).toBeEmptyDOMElement();
  });

  it("owns no client code", () => {
    const source = readFileSync(
      "src/components/sections/architecture-workflow-section/pipeline.tsx",
      "utf8"
    );
    expect(source).not.toMatch(/["']use client["']/);
  });
});

describe("ArchitectureWorkflowSection dispatch", () => {
  it("renders the pipeline for the pipeline layout and nothing when the site has no example", () => {
    const { container } = render(
      <ArchitectureWorkflowSection
        site={siteWith(seeded())}
        layout="pipeline"
        heading="Pipeline"
      />
    );
    expect(container.querySelector("[data-pin-scene].pipeline")).not.toBeNull();
    expect(screen.queryByText("AI automation lane")).toBeNull();
    cleanup();

    const empty = render(
      <ArchitectureWorkflowSection site={siteWith()} layout="pipeline" />
    );
    expect(empty.container).toBeEmptyDOMElement();
  });

  it("keeps the About page's diagram for the default layout, with or without the example", () => {
    for (const site of [siteWith(), siteWith(seeded())]) {
      for (const layout of [undefined, "default", "bento"]) {
        const { container } = render(
          <ArchitectureWorkflowSection site={site} layout={layout} />
        );
        expect(
          screen.getByRole("figure", {
            name: "How a request moves through the system",
          })
        ).toBeInTheDocument();
        expect(screen.getByText("AI automation lane")).toBeInTheDocument();
        expect(container.querySelector("[data-pin-scene]")).toBeNull();
        expect(container.querySelector("section")).toHaveAttribute(
          "id",
          "architecture-workflow"
        );
        cleanup();
      }
    }
  });
});

describe("pipeline geometry and clock", () => {
  it("puts node k at k / (count - 1) of the wire: equal gaps, a jog in each", () => {
    const { d, chip, centres } = pipelineGeometry(5);
    expect(centres).toHaveLength(5);
    expect(chip).toBeLessThanOrEqual(60);
    const gaps = centres.slice(1).map((x, i) => x - centres[i]!);
    expect(new Set(gaps).size).toBe(1);
    expect(d.startsWith(`M${centres[0]} 56`)).toBe(true);
    expect(d.endsWith(`H${centres[4]}`)).toBe(true);
    // Only horizontal and vertical segments: an orthogonal path
    expect(d.replace(/[MHV\d.\s-]/g, "")).toBe("");
    expect(d.match(/V/g)).toHaveLength(2 * 4);
  });

  it("builds one leg per gap on the story clock, finished when there is no clock", () => {
    const expression = pulseExpression(5);
    expect(expression.match(/clamp\(/g)).toHaveLength(4);
    expect(expression).toContain("- 0.7)");
    expect(expression).toContain("- 3.7)");
    expect(expression.endsWith("/ 4)")).toBe(true);
    expect(expression).not.toContain("var(--pin-position)");
    // The switch flips after the last beat has settled (beat 4 starts at 4)
    expect(switchExpression(5)).toBe(
      "clamp(0, (var(--pin-position, 99) - 4.1) / 0.2, 1)"
    );
  });
});
