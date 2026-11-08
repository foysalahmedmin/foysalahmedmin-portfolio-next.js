// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TPublicSiteDto, TSiteFit } from "@/app/api/site/site.type";
import FitCheckSection from "@/components/sections/fit-check-section";
import { createSiteContentV8 } from "@/lib/seed/foundation-site-content";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const fit = {
  ...(createSiteContentV8().fit as unknown as TSiteFit),
  enabled: true,
};

const site = (over: Partial<TPublicSiteDto> = {}): TPublicSiteDto => ({
  ...createEmergencyPublicSite(),
  fit,
  ...over,
});

describe("FitCheckSection", () => {
  it("is a paper band with a good-fit column and a not-a-fit column", () => {
    const { container } = render(<FitCheckSection site={site()} />);
    const section = container.querySelector("section#fit")!;
    expect(section).toHaveAttribute("data-tone", "paper");
    expect(section).toHaveAttribute("aria-labelledby", "fit-heading");
    expect(
      screen.getByRole("heading", { level: 2, name: "Who this is for" })
    ).toBeInTheDocument();

    const columns = section.querySelectorAll(".fit-column");
    expect(columns).toHaveLength(2);

    const good = within(columns[0] as HTMLElement);
    expect(
      good.getByRole("heading", { level: 3, name: "A good fit if" })
    ).toBeInTheDocument();
    const goodRows = good.getAllByRole("listitem");
    expect(goodRows).toHaveLength(fit.segments.length);
    fit.segments.forEach((segment, index) => {
      expect(
        within(goodRows[index]!).getByText(segment.label)
      ).toBeInTheDocument();
      expect(
        within(goodRows[index]!).getByText(segment.for_you_if)
      ).toBeInTheDocument();
    });

    const bad = within(columns[1] as HTMLElement);
    expect(
      bad.getByRole("heading", { level: 3, name: "Probably not a fit if" })
    ).toBeInTheDocument();
    expect(bad.getAllByRole("listitem").map((row) => row.textContent)).toEqual(
      fit.not_a_fit
    );
  });

  it("has no icons or numerals", () => {
    const { container } = render(<FitCheckSection site={site()} />);
    expect(container.querySelector("svg, img, ol")).toBeNull();
  });

  it("uses the heading from the page", () => {
    render(<FitCheckSection site={site()} heading="Is this for you?" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Is this for you?" })
    ).toBeInTheDocument();
  });

  it("shows only the good-fit column when no not-a-fit line is published", () => {
    const { container } = render(
      <FitCheckSection site={site({ fit: { ...fit, not_a_fit: [] } })} />
    );
    expect(container.querySelectorAll(".fit-column")).toHaveLength(1);
    expect(container.querySelector(".fit-columns")).toHaveAttribute(
      "data-single",
      "true"
    );
    expect(screen.queryByText("Probably not a fit if")).toBeNull();
  });

  it("renders nothing when the fit check is absent or has no segments", () => {
    expect(
      render(<FitCheckSection site={site({ fit: undefined })} />).container
    ).toBeEmptyDOMElement();
    cleanup();
    expect(
      render(<FitCheckSection site={site({ fit: { ...fit, segments: [] } })} />)
        .container
    ).toBeEmptyDOMElement();
  });
});
