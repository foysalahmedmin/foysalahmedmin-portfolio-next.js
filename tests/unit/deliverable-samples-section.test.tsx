// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type {
  TPublicSiteDto,
  TSiteDeliverableSample,
} from "@/app/api/site/site.type";
import DeliverableSamplesSection from "@/components/sections/deliverable-samples-section";
import { SITE_DELIVERABLE_SAMPLES } from "@/lib/seed/foundation-site-content";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const samples = (enabled = true): TSiteDeliverableSample[] =>
  SITE_DELIVERABLE_SAMPLES.map(
    (sample) => ({ ...sample, enabled }) as TSiteDeliverableSample
  );

const siteWith = (deliverable_samples: TSiteDeliverableSample[]) =>
  ({ ...createEmergencyPublicSite(), deliverable_samples }) as TPublicSiteDto;

const show = (
  deliverable_samples: TSiteDeliverableSample[],
  heading?: string
) =>
  render(
    <DeliverableSamplesSection
      site={siteWith(deliverable_samples)}
      heading={heading}
    />
  );

describe("DeliverableSamplesSection", () => {
  it("renders nothing without samples, or while the seeded ones are disabled or unverified", () => {
    expect(show([]).container).toBeEmptyDOMElement();
    cleanup();
    expect(show(samples(false)).container).toBeEmptyDOMElement();
    cleanup();
    expect(
      show(
        samples().map((sample) => ({ ...sample, verification: "unverified" }))
      ).container
    ).toBeEmptyDOMElement();
  });

  it("builds a labelled radio group with one tab per sample and the first one selected", () => {
    const { container } = show(samples());
    const group = screen.getByRole("radiogroup", { name: "Sample documents" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(SITE_DELIVERABLE_SAMPLES.length);
    expect(radios[0]).toBeChecked();
    expect(
      radios.slice(1).every((radio) => !(radio as HTMLInputElement).checked)
    ).toBe(true);
    // One shared name makes the arrow keys move through the set natively
    expect(
      new Set(radios.map((radio) => radio.getAttribute("name"))).size
    ).toBe(1);
    expect(container.querySelectorAll("article.doc-page")).toHaveLength(
      radios.length
    );
    expect(container.querySelector("section")).toHaveAttribute(
      "id",
      "deliverables"
    );
  });

  it("names every kind in the plan's wording", () => {
    show(samples());
    for (const label of [
      "Decision record",
      "Architecture diagram",
      "Runbook",
      "Test report",
      "Migration dry run",
    ]) {
      // once on the tab, once on the page header bar
      expect(screen.getAllByText(label)).toHaveLength(2);
    }
  });

  it("selects through the checked radio, so the tabs need no JavaScript", () => {
    const { container } = show(samples());
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    fireEvent.click(radios[2]!);
    expect(radios[2]!.checked).toBe(true);
    expect(radios[0]!.checked).toBe(false);
    const item = radios[2]!.closest(".doc-item")!;
    expect(item.querySelector("article")).toBe(
      container.querySelectorAll("article.doc-page")[2]
    );
    // each label is bound to its own radio
    expect(item.querySelector("label")).toHaveAttribute("for", radios[2]!.id);
  });

  it("sets each sample as plain text in a pre, escaped by React", () => {
    const [first, ...rest] = samples();
    const { container } = show([
      { ...first!, excerpt: "<b>not markup</b> & more" },
      ...rest,
    ]);
    const body = container.querySelector("pre.doc-page__body")!;
    expect(body.textContent).toBe("<b>not markup</b> & more");
    expect(body.querySelector("b")).toBeNull();
    expect(body).toHaveAttribute("tabindex", "0");
  });

  it("names the source in the footer and links it only when the sample has a case file", () => {
    const { container } = show(samples());
    const pages = container.querySelectorAll<HTMLElement>("article.doc-page");
    const diagram = SITE_DELIVERABLE_SAMPLES.findIndex(
      (sample) => sample.kind === "diagram"
    );
    const withLink = within(pages[diagram]!.querySelector("footer")!);
    expect(
      withLink.getByText("From this site's own repository")
    ).toBeInTheDocument();
    expect(withLink.getByRole("link")).toHaveAttribute(
      "href",
      `/case-studies/${(SITE_DELIVERABLE_SAMPLES[diagram] as { source_slug: string }).source_slug}`
    );
    const plain = within(pages[0]!.querySelector("footer")!);
    expect(
      plain.getByText("From this site's own repository")
    ).toBeInTheDocument();
    expect(plain.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows no version or date, and uses the heading override", () => {
    const { container } = show(samples(), "Own heading");
    expect(
      screen.getByRole("heading", { level: 2, name: "Own heading" })
    ).toHaveAttribute("id", "deliverables-heading");
    expect(container.querySelector("time")).toBeNull();
    expect(
      container.querySelector("header.doc-page__bar")!.textContent
    ).not.toMatch(/\bv\d|\d{4}/);
  });
});
