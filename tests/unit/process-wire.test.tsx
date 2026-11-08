// @vitest-environment jsdom

import type { TSiteProcessStep } from "@/app/api/site/site.type";
import ProcessStepsSection from "@/components/sections/process-steps-section";
import ProcessWire from "@/components/sections/process-steps-section/wire";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** The seeded steps carry their own numbers in the title; the wire drops them. */
const steps: TSiteProcessStep[] = [
  {
    key: "discovery",
    title: "1. Understand the problem",
    summary: "Start from the business goal before choosing any technology.",
    deliverable: "Problem brief and success measures",
    enabled: true,
  },
  {
    key: "design",
    title: "2. Shape the solution",
    summary: "Compare realistic options and write down why.",
    deliverable: "Solution outline and decision record",
    enabled: true,
  },
  {
    key: "skipped",
    title: "Hidden step",
    enabled: false,
  },
  {
    key: "development",
    title: "3. Build in small steps",
    summary: "Ship working increments you can review early.",
    enabled: true,
  },
];

describe("ProcessWire (home layout)", () => {
  it("lists the enabled steps in order with summary and deliverable, and no numbers", () => {
    const { container } = render(<ProcessWire steps={steps} />);

    const items = within(
      screen.getByRole("list", { name: "How a project runs, in order" })
    ).getAllByRole("listitem");
    expect(items.map((item) => item.querySelector("h3")?.textContent)).toEqual([
      "Understand the problem",
      "Shape the solution",
      "Build in small steps",
    ]);
    expect(items[0]).toHaveTextContent(steps[0]!.summary!);
    expect(items[0]).toHaveTextContent(`You get ${steps[0]!.deliverable}`);
    // A step without a deliverable has no "You get" line
    expect(items[2]).not.toHaveTextContent("You get");
    expect(screen.queryByText("Hidden step")).toBeNull();
    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.textContent).not.toMatch(/\d/);
  });

  it("is the paper band the hero link targets, and a trace-rail chapter", () => {
    const { container } = render(
      <ProcessWire steps={steps} heading="How a project runs" />
    );

    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "working-process");
    expect(section).toHaveAttribute("aria-labelledby", "process-heading");
    expect(section).toHaveAttribute("data-tone", "paper");
    expect(section).toHaveAttribute("data-band");
    expect(section).toHaveAttribute("data-chapter", "process");
    expect(section).toHaveAttribute("data-chapter-label", "Process");
    expect(
      screen.getByRole("heading", { level: 2, name: "How a project runs" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("marks the wire for the engine and leaves it finished without one", () => {
    const { container } = render(<ProcessWire steps={steps} />);

    const wire = container.querySelector(
      "[data-scroll-progress]"
    ) as HTMLElement;
    expect(wire).not.toBeNull();
    expect(wire).toHaveAttribute("data-progress-range", "top 60%,bottom 60%");
    // Nothing is written until the engine binds it: --progress stays unset, which engine.css reads as 1
    expect(wire.style.getPropertyValue("--progress")).toBe("");
    // Every step sits on the wire; the rail is decoration
    expect(wire.querySelectorAll("li")).toHaveLength(3);
    expect(wire.querySelector(".process-rail")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(container.querySelector("[hidden], [inert]")).toBeNull();
    expect(container.querySelector("button, input, a")).toBeNull();
  });

  it("renders nothing without an enabled step", () => {
    const off = steps.map((step) => ({ ...step, enabled: false }));
    expect(render(<ProcessWire steps={off} />).container).toBeEmptyDOMElement();
    expect(render(<ProcessWire steps={[]} />).container).toBeEmptyDOMElement();
  });

  it("is a server component", () => {
    const source = readFileSync(
      "src/components/sections/process-steps-section/wire.tsx",
      "utf8"
    );
    expect(source).not.toMatch(/["']use client["']/);
  });
});

describe("ProcessStepsSection dispatch", () => {
  it("renders the wire for the wire layout", () => {
    const { container } = render(
      <ProcessStepsSection steps={steps} layout="wire" />
    );
    expect(container.querySelector("[data-scroll-progress]")).not.toBeNull();
    // The card rail and its arrows are not part of the wire
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(container.querySelector("section")).toHaveAttribute(
      "id",
      "working-process"
    );
  });

  it("renders the wire for every layout, including the retired card-row ones", () => {
    for (const layout of [undefined, "default", "numbered", "wire"]) {
      const { container } = render(
        <ProcessStepsSection steps={steps} layout={layout} />
      );
      expect(container.querySelector("[data-scroll-progress]")).not.toBeNull();
      expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
      expect(container.querySelector("section")).toHaveAttribute(
        "id",
        "working-process"
      );
      cleanup();
    }
  });
});
