// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TSiteEngagementModel } from "@/app/api/site/site.type";
import EngagementModelsSection, {
  SCOPED_LABEL,
} from "@/components/sections/engagement-models-section";
import { createSiteContentV8 } from "@/lib/seed/foundation-site-content";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const siteWith = (models: TSiteEngagementModel[]) => ({
  ...createEmergencyPublicSite(),
  engagement_models: models,
});

const models: TSiteEngagementModel[] = [
  {
    key: "review",
    name: "Architecture review",
    best_when: "A system is hurting, or a build is about to be committed to.",
    you_get: ["Written architecture", "Decision record", "Risks"],
    how_it_runs: "A fixed-scope review, written up.",
    price_label: "From a fixed fee",
    duration_label: "A short engagement",
    verification: "verified",
    enabled: true,
  },
  {
    key: "build",
    name: "Build a product or automation",
    best_when: "The problem is clear and you need it working.",
    you_get: ["Reviewable releases", "Automated tests"],
    verification: "verified",
    enabled: true,
  },
  {
    key: "partner",
    name: "Ongoing partnership",
    you_get: [],
    // Derived, not verified: a duration the data layer let through is still not shown
    duration_label: "Monthly",
    verification: "derived",
    enabled: true,
  },
];

describe("EngagementModelsSection", () => {
  it("is a spec-sheet table with the five columns and a row header per model", () => {
    render(<EngagementModelsSection site={siteWith(models)} />);

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent)
    ).toEqual([
      "Model",
      "Best when",
      "You get",
      "How it runs",
      "Starting point",
    ]);
    for (const header of within(table).getAllByRole("columnheader")) {
      expect(header).toHaveAttribute("scope", "col");
    }

    const rowHeaders = within(table).getAllByRole("rowheader");
    expect(rowHeaders.map((header) => header.textContent)).toEqual(
      models.map((model) => model.name)
    );
    for (const header of rowHeaders)
      expect(header).toHaveAttribute("scope", "row");
    // One header row and one row per model
    expect(within(table).getAllByRole("row")).toHaveLength(models.length + 1);
  });

  it("fills each row from the data and labels each cell for the stacked layout", () => {
    render(<EngagementModelsSection site={siteWith(models)} />);

    const first = screen.getByRole("rowheader", {
      name: "Architecture review",
    }).parentElement!;
    const cells = within(first).getAllByRole("cell");
    expect(cells.map((cell) => cell.getAttribute("data-label"))).toEqual([
      "Best when",
      "You get",
      "How it runs",
      "Starting point",
    ]);
    expect(cells[0]).toHaveTextContent(models[0]!.best_when!);
    expect(
      within(cells[1]!)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["Written architecture", "Decision record", "Risks"]);
    expect(cells[2]).toHaveTextContent("A fixed-scope review, written up.");
  });

  it("shows a verified price and duration, and otherwise says Scoped per project", () => {
    render(<EngagementModelsSection site={siteWith(models)} />);

    const start = (name: string) =>
      within(
        screen.getByRole("rowheader", { name }).parentElement!
      ).getAllByRole("cell")[3]!;
    expect(start("Architecture review")).toHaveTextContent("From a fixed fee");
    expect(start("Architecture review")).toHaveTextContent(
      "A short engagement"
    );
    expect(start("Architecture review")).not.toHaveTextContent(SCOPED_LABEL);
    // Verified but with nothing to say: never an invented value
    expect(start("Build a product or automation")).toHaveTextContent(
      SCOPED_LABEL
    );
    // Derived: the duration is withheld
    expect(start("Ongoing partnership")).toHaveTextContent(SCOPED_LABEL);
    expect(start("Ongoing partnership")).not.toHaveTextContent("Monthly");
    expect(SCOPED_LABEL).toBe("Scoped per project");
  });

  it("leaves a cell empty when the data has nothing for it, so the stacked layout can drop it", () => {
    render(<EngagementModelsSection site={siteWith(models)} />);

    const cells = within(
      screen.getByRole("rowheader", { name: "Ongoing partnership" })
        .parentElement!
    ).getAllByRole("cell");
    expect(cells[0]).toBeEmptyDOMElement();
    expect(cells[1]).toBeEmptyDOMElement();
    expect(cells[2]).toBeEmptyDOMElement();
  });

  it("is its own paper section after the process band, without the segment lines", () => {
    const { container } = render(
      <EngagementModelsSection
        site={siteWith(models)}
        heading="Ways to work together"
      />
    );

    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "engagement");
    expect(section).toHaveAttribute("aria-labelledby", "engagement-heading");
    expect(section).toHaveAttribute("data-tone", "paper");
    expect(section).toHaveAttribute("data-band");
    expect(section).not.toHaveAttribute("data-chapter");
    expect(
      screen.getByRole("heading", { level: 2, name: "Ways to work together" })
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/for you if/i);
    expect(container.querySelector("button, a, input")).toBeNull();
    expect(container.querySelector("[hidden], [inert]")).toBeNull();
  });

  it("renders nothing when there are no models, or all are off (the seed ships them off)", () => {
    expect(
      render(<EngagementModelsSection site={siteWith([])} />).container
    ).toBeEmptyDOMElement();
    const off = models.map((model) => ({ ...model, enabled: false }));
    expect(
      render(<EngagementModelsSection site={siteWith(off)} />).container
    ).toBeEmptyDOMElement();

    const seeded = JSON.parse(
      JSON.stringify(createSiteContentV8().engagement_models)
    ) as TSiteEngagementModel[];
    expect(seeded.length).toBeGreaterThan(0);
    expect(
      render(<EngagementModelsSection site={siteWith(seeded)} />).container
    ).toBeEmptyDOMElement();
  });

  it("is a server component", () => {
    const source = readFileSync(
      "src/components/sections/engagement-models-section/index.tsx",
      "utf8"
    );
    expect(source).not.toMatch(/["']use client["']/);
  });
});
