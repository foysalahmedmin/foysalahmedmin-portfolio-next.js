// @vitest-environment jsdom

import CaseStudyArchitecturePreview from "@/components/admin/case-study-architecture-preview";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const diagram = {
  alt: "Browser calls an API that stores data",
  layers: ["Edge", "Core"],
  nodes: [
    { key: "browser", label: "Browser", layer: "Edge", kind: "client" },
    { key: "api", label: "API", layer: "Core", kind: "service" },
  ],
  edges: [{ from: "browser", to: "api" }],
  steps: [],
};

describe("CaseStudyArchitecturePreview", () => {
  afterEach(cleanup);

  it("draws a labelled node per entry for valid JSON, without injecting markup", () => {
    const { container } = render(
      <CaseStudyArchitecturePreview source={JSON.stringify(diagram)} />
    );
    expect(screen.getByRole("img", { name: diagram.alt })).toBeInTheDocument();
    expect(container.querySelectorAll("rect")).toHaveLength(2);
    expect(container.querySelectorAll("polyline")).toHaveLength(1);
    expect(container.textContent).toContain("Browser");
  });

  it.each([
    ["", /Add architecture JSON/],
    ["{not json", /Invalid JSON/],
    [
      JSON.stringify({ ...diagram, edges: [{ from: "browser", to: "ghost" }] }),
      /edges\.0\.to: Unknown node "ghost"/,
    ],
    [
      JSON.stringify({
        ...diagram,
        nodes: [{ ...diagram.nodes[0], label: "<b>x</b>" }],
      }),
      /nodes\.0\.label/,
    ],
  ])("shows a message instead of a diagram for %j", (source, message) => {
    const { container } = render(
      <CaseStudyArchitecturePreview source={source} />
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });
});
