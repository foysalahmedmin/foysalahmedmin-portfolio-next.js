// @vitest-environment jsdom

import type { TSiteMetric } from "@/app/api/site/site.type";
import MetricsStripSection from "@/components/sections/metrics-strip-section";
import { SITE_METRICS } from "@/lib/seed/foundation-site-content";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const seeded = (): TSiteMetric[] =>
  SITE_METRICS.map((metric) => ({ ...metric }) as TSiteMetric);

const metric = (key: string, overrides: Partial<TSiteMetric> = {}) =>
  ({
    key,
    label: `Label ${key}`,
    value: "7",
    verification: "derived",
    enabled: true,
    ...overrides,
  }) as TSiteMetric;

const strip = (metrics: readonly TSiteMetric[]) =>
  render(<MetricsStripSection metrics={metrics} layout="evidence" />);

describe("MetricsStripSection, evidence layout", () => {
  it("renders nothing when fewer than three metrics qualify", () => {
    const { container } = strip([
      metric("a"),
      metric("b"),
      metric("c", { verification: "unverified" }),
      metric("d", { enabled: false }),
      metric("e", { value: undefined }),
    ]);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows at most four cells, the first four, and keeps the section id", () => {
    const { container } = strip(seeded());
    const cells = container.querySelectorAll("li.evidence-cell");
    expect(seeded().length).toBeGreaterThan(4);
    expect(cells).toHaveLength(4);
    expect(
      within(cells[3] as HTMLElement).getByText(seeded()[3]!.label)
    ).toBeInTheDocument();
    expect(screen.queryByText(seeded()[4]!.label)).not.toBeInTheDocument();
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "proof-metrics");
    expect(section).toHaveAttribute("aria-labelledby", "proof-metrics-heading");
    expect(section).not.toHaveAttribute("data-chapter");
    expect(container.querySelector("#proof-metrics-heading")?.tagName).toBe(
      "H2"
    );
  });

  it("drops an unverified metric and fills the row from the next qualifying one", () => {
    const { container } = strip([
      metric("a", { verification: "unverified", label: "Hidden claim" }),
      metric("b"),
      metric("c", { verification: "verified" }),
      metric("d"),
    ]);
    expect(container.querySelectorAll("li.evidence-cell")).toHaveLength(3);
    expect(screen.queryByText("Hidden claim")).not.toBeInTheDocument();
    expect(container.querySelector(".evidence-row")).toHaveAttribute(
      "data-cells",
      "3"
    );
  });

  it("gives each cell a number, a label, a verification mark and a link to its case file", () => {
    const { container } = strip(seeded());
    const [first, , third] = Array.from(
      container.querySelectorAll<HTMLElement>("li.evidence-cell")
    );
    const source = seeded()[0]!;
    expect(first!.querySelector(".evidence-value")).toHaveTextContent(
      source.value!
    );
    expect(within(first!).getByText(source.label)).toBeInTheDocument();
    expect(within(first!).getByText("Derived from code")).toBeInTheDocument();
    expect(
      within(first!).getByRole("link", { name: /Case file/ })
    ).toHaveAttribute("href", `/case-studies/${source.source_slug}`);
    // The third seeded metric has no source case study: no link, never a guessed one
    expect(within(third!).queryByRole("link")).not.toBeInTheDocument();
  });

  it("labels a verified metric with the Verified mark", () => {
    strip([
      metric("a", { verification: "verified" }),
      metric("b"),
      metric("c"),
    ]);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getAllByText("Derived from code")).toHaveLength(2);
  });

  it("wires a native popover note to a focusable button, with the as-of date", () => {
    const { container } = strip([
      metric("a", { as_of: "2026-11-04" }),
      metric("b"),
      metric("c"),
    ]);
    const buttons = screen.getAllByRole("button", {
      name: "How this was measured",
    });
    expect(buttons).toHaveLength(3);
    const first = buttons[0]!;
    expect(first).toHaveAttribute("type", "button");
    const target = first.getAttribute("popovertarget")!;
    const note = container.querySelector(`[id="${target}"]`)!;
    expect(note).toHaveAttribute("popover", "auto");
    expect(note).toHaveTextContent(/Derived from code: .* not estimated/);
    expect(note.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-11-04"
    );
    expect(note).toHaveTextContent("As of November 4, 2026");
    // A metric without as_of states no date
    const noDate = container.querySelector(
      `[id="${buttons[1]!.getAttribute("popovertarget")}"]`
    )!;
    expect(noDate.querySelector("time")).toBeNull();
  });

  it("keeps the markup complete without the engine: plain final numbers, no client counter", () => {
    const { container } = strip(seeded());
    expect(container.querySelector("[data-counter]")).toBeNull();
    expect(container.querySelector(".evidence-value")?.textContent).toBe(
      seeded()[0]!.value
    );
  });

  it("leaves every other layout as it was", () => {
    const { container } = render(
      <MetricsStripSection metrics={seeded().slice(0, 2)} />
    );
    expect(screen.getByText("Proof signals")).toBeInTheDocument();
    expect(container.querySelector("dl")).not.toBeNull();
    expect(container.querySelector(".evidence-row")).toBeNull();
  });
});
