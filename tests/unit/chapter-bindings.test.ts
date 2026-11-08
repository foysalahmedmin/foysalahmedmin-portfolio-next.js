// @vitest-environment jsdom

import {
  createFocusController,
  parseRange,
  progressFor,
} from "@/lib/motion/engine/chapters";
import { describe, expect, it } from "vitest";

const list = (groups: (string | undefined)[]) => {
  const container = document.createElement("ol");
  container.dataset.scrollFocus = "";
  const rows = groups.map((group) => {
    const row = document.createElement("li");
    row.dataset.focusRow = "";
    if (group) row.dataset.group = group;
    container.append(row);
    return row;
  });
  return { container, rows };
};

describe("chapter focus controller", () => {
  it("marks one active row and reports its index and group on the list", () => {
    const { container, rows } = list(["systems", "systems", "automation"]);
    const focus = createFocusController(container, rows);

    focus.activate(0);
    expect(rows.map((row) => row.dataset.active)).toEqual([
      "true",
      undefined,
      undefined,
    ]);
    expect(container.dataset.focusIndex).toBe("0");
    expect(container.dataset.focusGroup).toBe("systems");

    focus.activate(2);
    expect(rows.map((row) => row.dataset.active)).toEqual([
      undefined,
      undefined,
      "true",
    ]);
    expect(container.dataset.focusIndex).toBe("2");
    expect(container.dataset.focusGroup).toBe("automation");
  });

  it("drops the group attribute when the active row has none", () => {
    const { container, rows } = list(["systems", undefined]);
    const focus = createFocusController(container, rows);
    focus.activate(0);
    focus.activate(1);
    expect(container.hasAttribute("data-focus-group")).toBe(false);
  });

  it("ignores an index that is out of range or already active", () => {
    const { container, rows } = list(["a", "b"]);
    const focus = createFocusController(container, rows);
    focus.activate(1);
    focus.activate(-1);
    focus.activate(5);
    expect(container.dataset.focusIndex).toBe("1");
    expect(rows[1]?.dataset.active).toBe("true");
  });

  it("clears every marker, so an unbound list reads as fully shown", () => {
    const { container, rows } = list(["a", "b"]);
    const focus = createFocusController(container, rows);
    focus.activate(1);
    focus.clear();
    expect(rows.every((row) => !row.hasAttribute("data-active"))).toBe(true);
    expect(container.hasAttribute("data-focus-index")).toBe(false);
    expect(container.hasAttribute("data-focus-group")).toBe(false);
    focus.activate(1);
    expect(container.dataset.focusIndex).toBe("1");
  });
});

describe("chapter progress", () => {
  const [start, end] = parseRange(undefined);

  it("defaults to the top edge at 80 % of the screen and the bottom edge at 55 %", () => {
    expect(start).toEqual({ edge: 0, screen: 0.8 });
    expect(end).toEqual({ edge: 1, screen: 0.55 });
    expect(parseRange("top 60%,bottom 60%")).toEqual([
      { edge: 0, screen: 0.6 },
      { edge: 1, screen: 0.6 },
    ]);
    expect(parseRange("nonsense,center 40%")[1]).toEqual({
      edge: 0.5,
      screen: 0.4,
    });
  });

  it("is 0 before the element reaches the start line and 1 after its end has passed the end line", () => {
    // 1000 px screen, an element 1200 px tall: starts at top = 800, ends at bottom = 550 (top = -650)
    expect(progressFor(900, 1200, 1000, start, end)).toBe(0);
    expect(progressFor(800, 1200, 1000, start, end)).toBe(0);
    expect(progressFor(-650, 1200, 1000, start, end)).toBe(1);
    expect(progressFor(-2000, 1200, 1000, start, end)).toBe(1);
  });

  it("is linear in between", () => {
    // Halfway between top = 800 and top = -650
    expect(progressFor(75, 1200, 1000, start, end)).toBeCloseTo(0.5, 5);
    expect(progressFor(437.5, 1200, 1000, start, end)).toBeCloseTo(0.25, 5);
  });

  it("is finished when the range has no length", () => {
    const flat = parseRange("top 50%,top 50%");
    expect(progressFor(10, 100, 1000, flat[0], flat[1])).toBe(1);
  });
});

describe("chapter highlights", () => {
  const scene = () => {
    const scope = document.createElement("section");
    scope.dataset.highlightScope = "";
    const diagram = document.createElement("svg");
    const nodes = ["db", "api", "queue"].map((id) => {
      const node = document.createElement("g");
      node.dataset.highlightId = id;
      diagram.append(node);
      return node;
    });
    const container = document.createElement("ol");
    const rows = ["db,api", "queue", undefined].map((ids) => {
      const row = document.createElement("li");
      if (ids) row.dataset.highlights = ids;
      container.append(row);
      return row;
    });
    scope.append(diagram, container);
    return { container, rows, nodes };
  };

  it("lights the elements the active row names and only those", () => {
    const { container, rows, nodes } = scene();
    const focus = createFocusController(container, rows);
    focus.activate(0);
    expect(nodes.map((node) => node.dataset.lit)).toEqual([
      "true",
      "true",
      undefined,
    ]);
    focus.activate(1);
    expect(nodes.map((node) => node.dataset.lit)).toEqual([
      undefined,
      undefined,
      "true",
    ]);
    focus.activate(2);
    expect(nodes.every((node) => !node.hasAttribute("data-lit"))).toBe(true);
  });

  it("puts everything back when cleared, and does nothing without a scope", () => {
    const { container, rows, nodes } = scene();
    const focus = createFocusController(container, rows);
    focus.activate(0);
    focus.clear();
    expect(nodes.every((node) => !node.hasAttribute("data-lit"))).toBe(true);

    const bare = list(["a"]);
    expect(() =>
      createFocusController(bare.container, bare.rows).activate(0)
    ).not.toThrow();
  });
});
