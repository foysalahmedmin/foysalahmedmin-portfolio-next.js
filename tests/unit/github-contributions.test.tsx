// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import GithubProfileSection from "@/components/sections/github-profile-section";
import { withGithubLast } from "@/components/pages/public-page-sections";
import { parseContributionCalendar } from "@/lib/github/contributions";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

/** `days` consecutive days ending on a Saturday, counts from `count(index)`. */
const days = (length: number, count: (index: number) => number) =>
  Array.from({ length }, (_, index) => ({
    // 2025-01-05 is a Sunday
    date: new Date(Date.UTC(2025, 0, 5) + index * 86_400_000)
      .toISOString()
      .slice(0, 10),
    count: count(index),
  }));

describe("parseContributionCalendar", () => {
  it("groups days into Sunday-first weeks, totals them and levels them against the busiest day", () => {
    const calendar = parseContributionCalendar({
      contributions: days(56, (index) =>
        index === 10 ? 8 : index % 7 === 3 ? 2 : 0
      ),
    })!;
    expect(calendar.weeks).toHaveLength(8);
    expect(calendar.weeks.every((week) => week.length === 7)).toBe(true);
    expect(calendar.total).toBe(8 + 2 * 7);
    const flat = calendar.weeks.flat();
    expect(flat[10]!.level).toBe(4);
    expect(flat[3]!.level).toBe(1);
    expect(flat[0]!.level).toBe(0);
    expect(calendar.months[0]).toEqual({ label: "Jan", week: 0 });
    expect(calendar.months.map((month) => month.label)).toEqual(["Jan", "Feb"]);
  });

  it("drops a first month label that would collide with the next one", () => {
    // Starts on a Saturday in January: one day of January, then February
    const calendar = parseContributionCalendar({
      contributions: Array.from({ length: 60 }, (_, index) => ({
        date: new Date(Date.UTC(2025, 0, 31) + index * 86_400_000)
          .toISOString()
          .slice(0, 10),
        count: 1,
      })),
    })!;
    expect(calendar.months[0]!.label).toBe("Feb");
  });

  it("pads a first week that starts mid-week", () => {
    const calendar = parseContributionCalendar({
      contributions: days(40, () => 1).slice(3),
    })!;
    expect(calendar.weeks[0]!.slice(0, 3)).toEqual([null, null, null]);
    expect(calendar.weeks[0]![3]).not.toBeNull();
  });

  it("keeps only valid dates and counts, and refuses anything too small to draw", () => {
    expect(parseContributionCalendar(null)).toBeNull();
    expect(parseContributionCalendar({ contributions: "x" })).toBeNull();
    expect(
      parseContributionCalendar({
        contributions: [
          ...days(30, () => 1),
          { date: "<script>", count: 5 },
          { date: "2025-03-01", count: -4 },
          { date: "2025-03-02", count: Number.NaN },
          { date: "2025-03-03" },
        ],
      })!.total
    ).toBe(30);
    expect(
      parseContributionCalendar({ contributions: days(10, () => 1) })
    ).toBeNull();
  });
});

describe("GithubProfileSection with a calendar", () => {
  const site = {
    ...createEmergencyPublicSite(),
    social_links: [
      {
        key: "github",
        platform: "github",
        label: "GitHub",
        url: "https://github.com/foysalahmedmin",
        enabled: true,
      },
    ],
  } as unknown as ReturnType<typeof createEmergencyPublicSite>;

  it("draws the year as dots with a text summary and links to the profile", () => {
    const calendar = parseContributionCalendar({
      contributions: days(120, (index) => index % 5),
    })!;
    const { container } = render(
      <GithubProfileSection site={site} calendar={calendar} />
    );
    const figure = screen.getByRole("figure");
    expect(figure).toHaveAttribute(
      "aria-label",
      `${calendar.total} public contributions by foysalahmedmin in the last year`
    );
    // The dots are decoration inside the labelled figure; the legend dots are marked too
    expect(container.querySelectorAll(".dots-grid .dot")).toHaveLength(120);
    expect(container.querySelector(".dots-grid")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(
      screen.getByRole("link", { name: /View @foysalahmedmin on GitHub/ })
    ).toHaveAttribute("href", "https://github.com/foysalahmedmin");
  });

  it("falls back to the profile link alone when the calendar could not be read", () => {
    const { container } = render(<GithubProfileSection site={site} />);
    expect(screen.queryByRole("figure")).toBeNull();
    expect(container.querySelector(".dots")).toBeNull();
    expect(
      screen.getByRole("link", { name: /View @foysalahmedmin on GitHub/ })
    ).toBeInTheDocument();
  });
});

describe("page order", () => {
  const order = (kinds: string[]) =>
    withGithubLast(
      kinds.map((kind) => ({ kind })) as unknown as Parameters<
        typeof withGithubLast
      >[0]
    ).map((section) => section.kind);

  it("puts the open-code section last, just above the contact band that closes every page", () => {
    expect(order(["a", "github-profile", "b", "contact-cta", "c"])).toEqual([
      "a",
      "b",
      "github-profile",
      "contact-cta",
      "c",
    ]);
    expect(order(["a", "contact-cta", "github-profile"])).toEqual([
      "a",
      "github-profile",
      "contact-cta",
    ]);
  });

  it("puts it at the end when the page has no contact band, and leaves pages without it alone", () => {
    expect(order(["github-profile", "a", "b"])).toEqual([
      "a",
      "b",
      "github-profile",
    ]);
    expect(order(["a", "b"])).toEqual(["a", "b"]);
  });
});
