// @vitest-environment jsdom

import {
  StatusBadge,
  type TStatusBadgeTone,
} from "@/components/ui/status-badge";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

/*
 * Docs plan 4.3: the tone API stays, the badge becomes a mark. The shape is the `data-glyph` the
 * stylesheet draws (marks.css), the label is real text, and nothing carries a colour class.
 */
const SHAPE_BY_TONE: Record<TStatusBadgeTone, string> = {
  neutral: "draft", // outlined square
  primary: "published", // filled square
  info: "pending", // half-filled square
  success: "success", // square with a check
  warning: "warning", // outlined diamond, heavier label
  destructive: "error", // filled triangle, inverted label
};

describe("StatusBadge", () => {
  afterEach(cleanup);

  it.each(Object.entries(SHAPE_BY_TONE))(
    "%s renders the %s shape and a visible text label",
    (tone, shape) => {
      const { container } = render(
        <StatusBadge tone={tone as TStatusBadgeTone}>Label {tone}</StatusBadge>
      );
      const mark = container.firstElementChild as HTMLElement;
      expect(mark).toHaveAttribute("data-glyph", shape);
      expect(mark).toHaveAttribute("data-badge-tone", tone);
      expect(mark.querySelector(".status-mark__glyph")).toHaveAttribute(
        "aria-hidden",
        "true"
      );
      expect(screen.getByText(`Label ${tone}`)).toBeVisible();
    }
  );

  it("defaults to the neutral outlined square", () => {
    const { container } = render(<StatusBadge>Draft</StatusBadge>);
    expect(container.firstElementChild).toHaveAttribute("data-glyph", "draft");
  });

  it("is greyscale safe: no colour or palette class on any tone", () => {
    for (const tone of Object.keys(SHAPE_BY_TONE) as TStatusBadgeTone[]) {
      const { container, unmount } = render(
        <StatusBadge tone={tone}>x</StatusBadge>
      );
      const classes = Array.from(container.querySelectorAll("*"))
        .concat(container.firstElementChild as Element)
        .map((node) => node.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(
        /\b(?:bg|text|border|ring)-(?:primary|destructive|success|warning|info|muted|emerald|amber|sky|red|green|blue)\b/
      );
      unmount();
    }
  });

  it("keeps the caller's className and does not use the ink/paper band attribute", () => {
    const { container } = render(
      <StatusBadge tone="info" className="extra">
        Pending
      </StatusBadge>
    );
    const mark = container.firstElementChild as HTMLElement;
    expect(mark).toHaveClass("status-mark", "status-badge", "extra");
    // [data-tone] would paint a band background on the badge
    expect(mark).not.toHaveAttribute("data-tone");
  });
});
