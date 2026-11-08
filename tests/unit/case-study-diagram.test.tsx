// @vitest-environment jsdom

import { CaseStudyDiagram } from "@/components/content/case-study-diagram";
import {
  DIAGRAM_METRICS,
  edgeId,
  highlightIdsForFocus,
  layoutCaseStudyDiagram,
  outputHighlightIds,
  wrapText,
} from "@/lib/content/case-study-diagram-layout";
import {
  parseCaseStudyArchitecture,
  type CaseStudyArchitecture,
} from "@/lib/content/case-study-contract";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const architecture: CaseStudyArchitecture = {
  alt: "Editors save drafts, a publish step stores a snapshot and visitors read it.",
  layers: ["Editing", "Publishing", "Delivery"],
  nodes: [
    {
      key: "admin",
      label: "Admin workspace",
      layer: "Editing",
      kind: "client",
    },
    {
      key: "draft-api",
      label: "Draft API with a long descriptive name",
      layer: "Publishing",
      kind: "service",
      note: "Saves a draft only when the revision still matches.",
    },
    {
      key: "queue",
      label: "Publish queue",
      layer: "Publishing",
      kind: "queue",
    },
    {
      key: "review",
      label: "Owner review",
      layer: "Publishing",
      kind: "review",
    },
    {
      key: "site",
      label: "Public site",
      layer: "Delivery",
      kind: "output",
    },
    { key: "cdn", label: "CDN", layer: "Delivery", kind: "external" },
  ],
  edges: [
    { from: "admin", to: "draft-api", label: "saves a draft" },
    { from: "draft-api", to: "queue" },
    { from: "queue", to: "review", label: "waits" },
    { from: "review", to: "site", label: "publishes the snapshot to readers" },
    { from: "site", to: "cdn" },
    { from: "cdn", to: "admin" },
  ],
  steps: [{ title: "Save", focus: ["admin", "draft-api"] }],
};

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

describe("case-study diagram layout", () => {
  it("is a valid architecture and lays out deterministically", () => {
    expect(parseCaseStudyArchitecture(architecture).ok).toBe(true);
    expect(layoutCaseStudyDiagram(architecture)).toEqual(
      layoutCaseStudyDiagram(architecture)
    );
  });

  it("puts each node in its layer's column and never overlaps two nodes", () => {
    const layout = layoutCaseStudyDiagram(architecture);
    const M = DIAGRAM_METRICS;
    for (const node of layout.nodes) {
      const layer = architecture.nodes.find((n) => n.key === node.key)!.layer;
      expect(node.column).toBe(architecture.layers.indexOf(layer));
      expect(node.x).toBe(
        M.padding + node.column * (M.nodeWidth + M.columnGap)
      );
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width);
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height);
    }
    for (const [i, a] of layout.nodes.entries()) {
      for (const b of layout.nodes.slice(i + 1)) {
        expect(overlaps(a, b), `${a.key} overlaps ${b.key}`).toBe(false);
      }
    }
  });

  it("wraps labels instead of shortening them, and grows the node to hold the lines", () => {
    const layout = layoutCaseStudyDiagram(architecture);
    const long = layout.nodes.find((n) => n.key === "draft-api")!;
    expect(long.lines.length).toBeGreaterThan(1);
    expect(long.lines.join(" ")).toBe(long.label);
    for (const line of long.lines) {
      expect(line.length).toBeLessThanOrEqual(DIAGRAM_METRICS.labelChars);
    }
    const short = layout.nodes.find((n) => n.key === "cdn")!;
    expect(long.height).toBeGreaterThan(short.height);
    expect(wrapText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("draws every edge between two existing nodes, ending on their borders", () => {
    const layout = layoutCaseStudyDiagram(architecture);
    const keys = new Set(layout.nodes.map((n) => n.key));
    expect(layout.edges).toHaveLength(architecture.edges.length);
    for (const edge of layout.edges) {
      expect(keys.has(edge.from) && keys.has(edge.to)).toBe(true);
      expect(edge.id).toBe(edgeId(edge));
      expect(edge.d).toMatch(/^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/);
    }
    const first = layout.edges[0]!;
    const from = layout.nodes.find((n) => n.key === first.from)!;
    expect(first.d.startsWith(`M${from.x + from.width} `)).toBe(true);
    // The label of a sideways edge sits in the gap to the right of its source column
    expect(first.labelAnchor).toBe("middle");
    expect(first.labelX).toBe(
      from.x + from.width + DIAGRAM_METRICS.columnGap / 2
    );
  });

  it("lights the focused nodes plus the edges entering or leaving them", () => {
    expect(
      highlightIdsForFocus(architecture, ["admin", "ghost", "admin"])
    ).toEqual(["admin", "admin->draft-api", "cdn->admin"]);
    expect(highlightIdsForFocus(architecture, [])).toEqual([]);
    expect(outputHighlightIds(architecture)).toEqual([
      "site",
      "review->site",
      "site->cdn",
    ]);
  });
});

describe("CaseStudyDiagram", () => {
  afterEach(cleanup);

  it("names the diagram with a title and a description", () => {
    const { container } = render(
      <CaseStudyDiagram architecture={architecture} />
    );
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("role", "img");
    expect(svg.querySelector(":scope > title")).toHaveTextContent(
      "Architecture diagram"
    );
    expect(svg.querySelector(":scope > desc")).toHaveTextContent(
      architecture.alt
    );
    const labelled = svg.getAttribute("aria-labelledby")!.split(" ");
    for (const id of labelled)
      expect(container.querySelector(`#${id}`)).not.toBeNull();
  });

  it("marks exactly one highlight target per node and per edge", () => {
    const { container } = render(
      <CaseStudyDiagram architecture={architecture} />
    );
    const ids = Array.from(
      container.querySelectorAll("[data-highlight-id]")
    ).map((element) => element.getAttribute("data-highlight-id"));
    expect(ids).toHaveLength(
      architecture.nodes.length + architecture.edges.length
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const node of architecture.nodes) expect(ids).toContain(node.key);
    for (const edge of architecture.edges) expect(ids).toContain(edgeId(edge));
  });

  it("states the kind of every node in words and keeps all label text", () => {
    const { container } = render(
      <CaseStudyDiagram architecture={architecture} />
    );
    const text = container.querySelector("svg")!.textContent!;
    expect(text).toContain("Human review");
    expect(text).toContain("External");
    expect(text).toContain("descriptive");
    expect(
      container.querySelector('[data-highlight-id="cdn"]')
    ).toHaveAttribute("data-kind", "external");
  });

  it("lists every node and every edge as text", () => {
    const { container } = render(
      <CaseStudyDiagram architecture={architecture} />
    );
    const [nodes, edges] = Array.from(
      container.querySelectorAll(".story-diagram__text ul")
    );
    expect(nodes!.querySelectorAll("li")).toHaveLength(
      architecture.nodes.length
    );
    expect(edges!.querySelectorAll("li")).toHaveLength(
      architecture.edges.length
    );
    for (const node of architecture.nodes) {
      expect(nodes).toHaveTextContent(node.label);
    }
    expect(nodes).toHaveTextContent(
      "Saves a draft only when the revision still matches."
    );
    expect(edges!.querySelectorAll("li")[0]).toHaveTextContent(
      /Admin workspace\s*→\s*to\s*Draft API with a long descriptive name\s*\(saves a draft\)/
    );
    expect(screen.getByText("Diagram as text")).toBeInTheDocument();
  });

  it("omits the connections list when the diagram has no edges", () => {
    render(
      <CaseStudyDiagram
        architecture={{ ...architecture, edges: [], steps: [] }}
      />
    );
    expect(screen.queryByText("Connections")).toBeNull();
  });

  it("is server markup, with no client directive", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      "src/components/content/case-study-diagram.tsx",
      "utf8"
    );
    expect(source).not.toMatch(/^["']use client["']/m);
  });
});

describe("diagram label wrapping", () => {
  it("breaks a long identifier after an underscore instead of mid-word", () => {
    expect(wrapText("schema_migrations records", 15)).toEqual([
      "schema_",
      "migrations",
      "records",
    ]);
  });

  it("still hard-breaks a word with no separator and never drops text", () => {
    const lines = wrapText("abcdefghijklmnopqrstuvwxyz", 10);
    expect(lines.join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(lines.every((line) => line.length <= 10)).toBe(true);
  });
});
