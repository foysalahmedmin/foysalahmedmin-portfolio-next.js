// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TPublicSiteDto, TSiteFinder } from "@/app/api/site/site.type";
import FinderForm from "@/components/sections/starting-point-section/finder-form";
import StartingPointSection from "@/components/sections/starting-point-section";
import {
  chosenOptions,
  finderContactHref,
  isFinderComplete,
  matchFinderOutcome,
  resolveFinderResult,
} from "@/lib/site/finder";
import { createSiteContentV8 } from "@/lib/seed/foundation-site-content";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// The lazy client island has its own tests below; here only what the server section hands it matters
vi.mock("@/components/sections/starting-point-section/finder-loader", () => ({
  default: ({
    finder,
    models,
  }: {
    finder: TSiteFinder;
    models: readonly { key: string; name: string }[];
  }) => (
    <div
      data-finder-loader=""
      data-steps={finder.steps.length}
      data-models={JSON.stringify(models)}
    />
  ),
}));

afterEach(cleanup);

const seed = createSiteContentV8();
const finder = seed.finder as unknown as TSiteFinder;
const models = [
  { key: "architecture-review", name: "Architecture review" },
  { key: "build-product-or-automation", name: "Build a product or automation" },
  { key: "ongoing-partnership", name: "Ongoing partnership" },
];

const site = (over: Partial<TPublicSiteDto>): TPublicSiteDto => ({
  ...createEmergencyPublicSite(),
  ...over,
});

describe("finder logic", () => {
  it("returns the outcome whose tags are all covered, and names the engagement model", () => {
    const result = resolveFinderResult(finder, models, {
      situation: "systems",
      stage: "idea",
      priority: "speed",
    });
    expect(result).toEqual({
      engagement_key: "build-product-or-automation",
      engagement_name: "Build a product or automation",
      reasoning: expect.stringContaining("working first version"),
    });

    expect(
      resolveFinderResult(finder, models, {
        situation: "automation",
        stage: "hurts",
        priority: "reliability",
      })?.engagement_name
    ).toBe("Architecture review");
  });

  it("needs every tag of an outcome, so a partial match is no match", () => {
    // "hurts" alone does not cover ["hurts", "reliability"]
    expect(
      matchFinderOutcome(finder, {
        situation: "systems",
        stage: "hurts",
        priority: "speed",
      })
    ).toBeNull();
    expect(
      resolveFinderResult(finder, models, {
        situation: "systems",
        stage: "hurts",
        priority: "cost",
      })
    ).toBeNull();
  });

  const rules: TSiteFinder = {
    enabled: true,
    steps: [
      {
        key: "stage",
        question: "Where are you?",
        options: [
          { key: "idea", label: "Idea", tags: ["idea"] },
          { key: "live", label: "Live", tags: ["live"] },
        ],
      },
      {
        key: "priority",
        question: "What matters?",
        options: [
          { key: "speed", label: "Speed", tags: ["speed"] },
          { key: "cost", label: "Cost", tags: ["cost"] },
        ],
      },
    ],
    outcomes: [
      { engagement_key: "a", when_tags: ["idea"], reasoning: "Broad." },
      {
        engagement_key: "b",
        when_tags: ["idea", "speed"],
        reasoning: "Specific.",
      },
      { engagement_key: "c", when_tags: ["speed"], reasoning: "Also one tag." },
    ],
  };
  const named = [
    { key: "a", name: "Alpha" },
    { key: "b", name: "Beta" },
    { key: "c", name: "Gamma" },
  ];

  it("prefers the outcome with the most matching tags", () => {
    expect(
      matchFinderOutcome(rules, { stage: "idea", priority: "speed" })
        ?.engagement_key
    ).toBe("b");
    expect(
      matchFinderOutcome(rules, { stage: "idea", priority: "cost" })
        ?.engagement_key
    ).toBe("a");
  });

  it("gives a tie to the first listed outcome", () => {
    const tied = {
      ...rules,
      outcomes: [rules.outcomes[2]!, rules.outcomes[0]!],
    };
    expect(
      matchFinderOutcome(tied, { stage: "idea", priority: "speed" })
        ?.engagement_key
    ).toBe("c");
  });

  it("passes over an outcome whose engagement model is not public instead of inventing a name", () => {
    expect(
      resolveFinderResult(
        rules,
        named.filter((model) => model.key !== "b"),
        { stage: "idea", priority: "speed" }
      )?.engagement_name
    ).toBe("Alpha");
    expect(
      resolveFinderResult(rules, [], { stage: "idea", priority: "speed" })
    ).toBeNull();
  });

  it("knows when every step is answered and ignores an answer that is not an option", () => {
    expect(isFinderComplete(rules, { stage: "idea" })).toBe(false);
    expect(isFinderComplete(rules, { stage: "idea", priority: "nope" })).toBe(
      false
    );
    expect(isFinderComplete(rules, { stage: "idea", priority: "cost" })).toBe(
      true
    );
    expect(
      chosenOptions(rules, { stage: "live", priority: "cost" }).map(
        (option) => option.key
      )
    ).toEqual(["live", "cost"]);
  });

  it("links to the contact form with the topic and the chosen options, URL-encoded", () => {
    const answers = { stage: "idea", priority: "speed" };
    expect(finderContactHref(rules, answers, "b")).toBe(
      "/contact?topic=b&start=idea%2Cspeed"
    );
    // No model fits: only the answers travel
    expect(finderContactHref(rules, answers)).toBe(
      "/contact?start=idea%2Cspeed"
    );
    expect(finderContactHref(rules, {})).toBe("/contact");
    expect(finderContactHref(rules, answers, "a b&c")).toBe(
      "/contact?topic=a+b%26c&start=idea%2Cspeed"
    );
  });
});

describe("StartingPointSection", () => {
  const enabled = { ...finder, enabled: true };

  it("renders nothing without a finder or without steps", () => {
    expect(
      render(<StartingPointSection site={site({})} />).container
    ).toBeEmptyDOMElement();
    cleanup();
    expect(
      render(
        <StartingPointSection
          site={site({ finder: { ...enabled, steps: [] } })}
        />
      ).container
    ).toBeEmptyDOMElement();
  });

  it("is a complete server shell: heading, label, no-JS link and the lazy island", () => {
    const { container } = render(
      <StartingPointSection
        site={site({
          finder: enabled,
          engagement_models: models.map((model) => ({
            ...model,
            you_get: [],
            verification: "verified",
            enabled: true,
          })),
        })}
      />
    );
    const section = container.querySelector("section#finder")!;
    expect(section).toHaveAttribute("aria-labelledby", "finder-heading");
    expect(section).toHaveAttribute("data-tone", "paper");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Not sure where to start?",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("A suggestion, not a quote.")).toBeInTheDocument();

    // The no-JavaScript path: a plain link to the contact form, and a note inside <noscript>
    expect(
      screen.getByRole("link", { name: "Describe your problem" })
    ).toHaveAttribute("href", "/contact");
    expect(container.querySelector("noscript")).not.toBeNull();

    // Only keys and names reach the client island, never prices or other model fields
    const island = container.querySelector("[data-finder-loader]")!;
    expect(island).toHaveAttribute("data-steps", "3");
    expect(JSON.parse(island.getAttribute("data-models")!)).toEqual(models);
  });

  it("uses the heading from the page", () => {
    render(
      <StartingPointSection
        site={site({ finder: enabled })}
        heading="Where do we begin?"
      />
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Where do we begin?" })
    ).toBeInTheDocument();
  });
});

describe("FinderForm", () => {
  const answerAll = async (
    user: ReturnType<typeof userEvent.setup>,
    labels: string[]
  ) => {
    for (const label of labels) await user.click(screen.getByLabelText(label));
  };

  it("is real radio groups in fieldsets, with an idle polite live region", () => {
    render(<FinderForm finder={finder} models={models} />);
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(3);
    expect(within(groups[1]!).getAllByRole("radio")).toHaveLength(3);
    expect(
      screen.getByRole("group", { name: "What is the situation?" })
    ).toBeInTheDocument();

    const live = document.querySelector("[aria-live]")!;
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveAttribute("data-state", "idle");
    expect(screen.queryByRole("link", { name: "Describe it" })).toBeNull();
  });

  it("names the model, gives the reason and links to the contact form once every question is answered", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<FinderForm finder={finder} models={models} />);

    await answerAll(user, [
      "Software, data or architecture",
      "We only have an idea",
      "Speed",
    ]);

    const live = document.querySelector("[aria-live]")!;
    expect(live).toHaveAttribute("data-state", "match");
    expect(within(live as HTMLElement).getByText("Start with")).toBeVisible();
    expect(
      within(live as HTMLElement).getByText("Build a product or automation")
    ).toBeVisible();
    expect(
      within(live as HTMLElement).getByText(/quickest way to learn/)
    ).toBeVisible();
    expect(
      within(live as HTMLElement).getByRole("link", { name: "Describe it" })
    ).toHaveAttribute(
      "href",
      "/contact?topic=build-product-or-automation&start=systems%2Cidea%2Cspeed"
    );
    // Computed in the browser: nothing leaves the page
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("is operable from the keyboard", async () => {
    const user = userEvent.setup();
    render(<FinderForm finder={finder} models={models} />);
    await user.tab();
    expect(screen.getAllByRole("radio")[0]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByLabelText("Repetitive work, AI or integrations")
    ).toBeChecked();
  });

  it("falls back to an honest line, with the answers only, when no model fits", async () => {
    const user = userEvent.setup();
    render(<FinderForm finder={finder} models={models} />);
    await answerAll(user, [
      "Software, data or architecture",
      "It works but it hurts",
      "Cost",
    ]);
    const live = document.querySelector("[aria-live]")!;
    expect(live).toHaveAttribute("data-state", "open");
    expect(
      within(live as HTMLElement).getByText(/No single starting point/)
    ).toBeVisible();
    expect(
      within(live as HTMLElement).getByRole("link", { name: "Describe it" })
    ).toHaveAttribute("href", "/contact?start=systems%2Churts%2Ccost");
  });
});
