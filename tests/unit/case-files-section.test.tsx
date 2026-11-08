// @vitest-environment jsdom

import CaseStudiesSection from "@/components/(common)/home-page/case-studies-section";
import { CASE_STUDY_ENGAGEMENT_LABELS } from "@/lib/content/case-study-contract";
import type { TCaseStudyListItem } from "@/types/case-study.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ImageProps } from "next/image";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: ImageProps) => (
    <img
      src={typeof src === "string" ? src : ""}
      alt={alt}
      className={className}
    />
  ),
}));

afterEach(cleanup);

const study = (
  slug: string,
  overrides: Partial<TCaseStudyListItem> = {}
): TCaseStudyListItem => ({
  _id: `id-${slug}`,
  slug,
  name: `Study ${slug}`,
  description: `Problem of ${slug}`,
  engagement_type: "internal",
  primary_pillar: "software_developer",
  outcomes: [
    {
      label: `Outcome label ${slug}`,
      value: `Value ${slug}`,
      verification_state: "derived",
    },
  ],
  is_featured: false,
  ...overrides,
});

const files = (caseStudies: readonly TCaseStudyListItem[], extra = {}) =>
  render(
    <CaseStudiesSection caseStudies={caseStudies} layout="files" {...extra} />
  );

describe("CaseStudiesSection, files layout", () => {
  it("sets the chapter markers and heads the section", () => {
    const { container } = files([study("a")]);
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "case-studies");
    expect(section).toHaveAttribute("data-chapter", "files");
    expect(section).toHaveAttribute("data-chapter-label", "Case files");
    expect(section).toHaveAttribute("aria-labelledby", "case-studies-heading");
    expect(
      screen.getByRole("heading", { level: 2, name: /Problems solved/ })
    ).toHaveAttribute("id", "case-studies-heading");
    expect(
      screen.getByRole("link", { name: /All case studies/ })
    ).toHaveAttribute("href", "/case-studies");
  });

  it("renders one hairline row per case file with an engagement chip that never blurs internal and client work", () => {
    const { container } = files([
      study("c", { engagement_type: "client" }),
      study("i", { engagement_type: "internal" }),
      study("o", { engagement_type: "open_source" }),
      study("l", { engagement_type: "lab" }),
    ]);
    const rows = container.querySelectorAll("li.case-file");
    expect(rows).toHaveLength(4);
    const chip = (row: Element) =>
      row.querySelector("[data-engagement]")?.textContent;
    expect(Array.from(rows).map(chip)).toEqual([
      CASE_STUDY_ENGAGEMENT_LABELS.client,
      CASE_STUDY_ENGAGEMENT_LABELS.internal,
      CASE_STUDY_ENGAGEMENT_LABELS.open_source,
      CASE_STUDY_ENGAGEMENT_LABELS.lab,
    ]);
    expect(chip(rows[1]!)).toBe("Internal product");
    expect(rows[1]!.textContent).not.toContain("Client engagement");
  });

  it("shows the problem, the primary role and one outcome, and links the row to the case file", () => {
    const { container } = files([study("a")]);
    const row = container.querySelector<HTMLElement>("li.case-file")!;
    const facts = within(row);
    expect(facts.getByText("Problem of a")).toBeInTheDocument();
    expect(facts.getByText("Software Developer")).toBeInTheDocument();
    expect(facts.getByText("Value a")).toBeInTheDocument();
    expect(facts.getByText("Outcome label a")).toBeInTheDocument();
    const link = facts.getByRole("link", { name: "Study a" });
    expect(link).toHaveAttribute("href", "/case-studies/a");
    expect(link.closest("h3")).not.toBeNull();
  });

  it("omits a cell the list item cannot fill instead of inventing one", () => {
    const { container } = files([
      study("a", {
        description: undefined,
        engagement_type: undefined,
        primary_pillar: undefined,
        outcomes: [
          { label: "Unreviewed", value: "9", verification_state: "unverified" },
        ],
      }),
    ]);
    const row = container.querySelector("li.case-file")!;
    expect(row.querySelector("[data-engagement]")).toBeNull();
    expect(row.querySelector("[data-fact]")).toBeNull();
    expect(row).not.toHaveTextContent("Unreviewed");
  });

  it("keeps the preview out of the accessibility tree: the row already says everything", () => {
    const { container } = files([study("a")]);
    const peek = container.querySelector(".case-file__peek")!;
    expect(peek).toHaveAttribute("aria-hidden", "true");
    expect(peek.querySelector("img")).toHaveAttribute("alt", "");
    expect(peek.querySelector("a")).toBeNull();
  });

  it("shows at most six rows", () => {
    const { container } = files(
      Array.from({ length: 8 }, (_, index) => study(`s${index}`))
    );
    expect(container.querySelectorAll("li.case-file")).toHaveLength(6);
  });

  it("keeps the existing empty and unavailable states", () => {
    const { unmount } = files([]);
    expect(
      screen.getByText("No published case study is available yet")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /All case studies/ })
    ).toBeInTheDocument();
    unmount();
    files([], { unavailable: true });
    expect(
      screen.getByText("Case studies are temporarily unavailable")
    ).toBeInTheDocument();
  });

  it("leaves the card layouts unchanged", () => {
    const { container } = render(
      <CaseStudiesSection caseStudies={[study("a")]} />
    );
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "case-studies");
    expect(section).not.toHaveAttribute("data-chapter");
    expect(container.querySelector("article")).not.toBeNull();
    expect(container.querySelector(".case-file")).toBeNull();
    expect(screen.getByText("Read case study")).toBeInTheDocument();
  });
});
