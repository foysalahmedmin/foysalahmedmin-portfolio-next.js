// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TPublicSiteDto, TSiteCommitment } from "@/app/api/site/site.type";
import CommitmentsSection from "@/components/sections/commitments-section";
import { createSiteContentV8 } from "@/lib/seed/foundation-site-content";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const seed = createSiteContentV8();
const commitments = seed.commitments as unknown as TSiteCommitment[];
// Principles are seeded off until the owner approves them; the public DTO only carries enabled ones
const principles = (seed.principles as unknown as TSiteCommitment[]).map(
  (item) => ({ ...item, enabled: true })
);

const site = (over: Partial<TPublicSiteDto> = {}): TPublicSiteDto => ({
  ...createEmergencyPublicSite(),
  commitments,
  principles,
  ...over,
});

/** A leading numeral, "01", "1." or "Step 2", is how a card gets numbered. */
const NUMBERED = /^\s*(?:step\s*)?\d+\s*[.):/]?\s/i;

describe("CommitmentsSection: commitments", () => {
  it("is plain lines, one per commitment, each with a glyph, a title and its summary", () => {
    const { container } = render(<CommitmentsSection site={site()} />);
    const section = container.querySelector("section#commitments")!;
    expect(section).toHaveAttribute("aria-labelledby", "commitments-heading");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "How I keep projects safe",
      })
    ).toBeInTheDocument();

    const rows = within(section as HTMLElement).getAllByRole("listitem");
    expect(rows).toHaveLength(commitments.length);
    commitments.forEach((item, index) => {
      expect(
        within(rows[index]!).getByRole("heading", {
          level: 3,
          name: item.title,
        })
      ).toBeInTheDocument();
      expect(within(rows[index]!).getByText(item.summary)).toBeInTheDocument();
      expect(rows[index]!.querySelector(".trust-glyph")).toHaveAttribute(
        "aria-hidden",
        "true"
      );
    });
  });

  it("is the trust chapter for the rail and reads site.commitments, not principles", () => {
    const { container } = render(<CommitmentsSection site={site()} />);
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("data-chapter", "trust");
    expect(section).toHaveAttribute("data-chapter-label", "Trust");
    expect(screen.queryByText(principles[0]!.title)).toBeNull();
  });

  it("carries no numerals: no ordered list, no emoji glyph, no numbered text", () => {
    const { container } = render(<CommitmentsSection site={site()} />);
    expect(container.querySelector("ol")).toBeNull();
    container.querySelectorAll("li, h3, p").forEach((node) => {
      expect(node.textContent).not.toMatch(NUMBERED);
    });
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("uses the heading from the page", () => {
    render(<CommitmentsSection site={site()} heading="Working agreements" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Working agreements" })
    ).toBeInTheDocument();
  });

  it("renders nothing when there are no commitments", () => {
    const { container } = render(
      <CommitmentsSection site={site({ commitments: [] })} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("CommitmentsSection: how I think (layout principles)", () => {
  it("stacks the principles as statements with one elaboration line each", () => {
    const { container } = render(
      <CommitmentsSection site={site()} layout="principles" />
    );
    const section = container.querySelector("section#principles")!;
    expect(
      screen.getByRole("heading", { level: 2, name: "How I think" })
    ).toBeInTheDocument();

    const rows = within(section as HTMLElement).getAllByRole("listitem");
    expect(rows).toHaveLength(principles.length);
    principles.forEach((item, index) => {
      expect(
        within(rows[index]!).getByRole("heading", {
          level: 3,
          name: item.title,
        })
      ).toBeInTheDocument();
      expect(within(rows[index]!).getByText(item.summary)).toBeInTheDocument();
    });
    // It reads site.principles, never site.commitments
    expect(screen.queryByText(commitments[0]!.title)).toBeNull();
  });

  it("is not a trust chapter and carries no numerals", () => {
    const { container } = render(
      <CommitmentsSection site={site()} layout="principles" />
    );
    const section = container.querySelector("section")!;
    expect(section).not.toHaveAttribute("data-chapter");
    expect(container.querySelector("ol")).toBeNull();
    container.querySelectorAll("li, h3, p").forEach((node) => {
      expect(node.textContent).not.toMatch(NUMBERED);
    });
  });

  it("renders nothing without principles, even when commitments exist", () => {
    const { container } = render(
      <CommitmentsSection site={site({ principles: [] })} layout="principles" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
