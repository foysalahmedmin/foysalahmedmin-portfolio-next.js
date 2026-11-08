// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TPublicSkillDto } from "@/app/api/skills/skill.type";
import SkillsSection, {
  type TPublicSkillGroupWithSkills,
} from "@/components/sections/skills-section";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const base = {
  locale: "en" as const,
  secondary_pillars: [],
  sequence: 1,
  is_featured: false,
  published_at: "2026-07-17T00:00:00.000Z",
};

const skill = (
  slug: string,
  title: string,
  overrides: Partial<TPublicSkillDto> = {}
): TPublicSkillDto => ({
  ...base,
  slug,
  title,
  group: { slug: "g", title: "g" },
  proficiency_level: "advanced",
  proficiency_verification: "derived",
  keywords: ["Hidden keyword"],
  ...overrides,
});

const groups: TPublicSkillGroupWithSkills[] = [
  {
    ...base,
    slug: "backend-systems",
    title: "Backend systems",
    summary: "Summary text",
    description: "Description text",
    primary_pillar: "software_developer",
    skills: [
      skill("api", "API boundaries", {
        proficiency_verification: "verified",
        years_experience: 6,
      }),
      skill("workers", "Worker flows"),
    ],
  },
  {
    ...base,
    slug: "automation",
    title: "Automation",
    description: "",
    primary_pillar: "ai_automation",
    skills: [skill("queues", "Queues and retries")],
  },
];

const pillars = createEmergencyPublicSite().pillars;

const registry = (items = groups) =>
  render(<SkillsSection pillars={pillars} groups={items} layout="registry" />);

describe("SkillsSection, registry layout", () => {
  it("sets the chapter markers", () => {
    const { container } = registry();
    const section = container.querySelector("section")!;
    expect(section).toHaveAttribute("id", "skills");
    expect(section).toHaveAttribute("data-chapter", "skills");
    expect(section).toHaveAttribute("data-chapter-label", "Capabilities");
    expect(section).toHaveAttribute("aria-labelledby", "skills-heading");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "The tools behind the solutions",
      })
    ).toHaveAttribute("id", "skills-heading");
  });

  it("groups one-line entries by the groups the data gives, with the role as a label", () => {
    registry();
    const lists = screen.getAllByRole("list");
    expect(lists.map((list) => list.getAttribute("aria-label"))).toEqual([
      "Backend systems",
      "Automation",
    ]);
    expect(within(lists[0]!).getAllByRole("listitem")).toHaveLength(2);
    expect(
      within(lists[1]!).getByText("Queues and retries")
    ).toBeInTheDocument();
    expect(screen.getByText("Software Developer")).toBeInTheDocument();
    expect(screen.getByText("AI Automation Developer")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(["Backend systems", "Automation"]);
  });

  it("shows a level and years only for verified evidence, and never keywords or prose", () => {
    const { container } = registry();
    expect(screen.getByText("Advanced · 6 yrs")).toBeInTheDocument();
    // the derived skill is a bare name
    const derived = screen.getByText("Worker flows").closest("li")!;
    expect(derived.querySelector(".registry-entry__detail")).toBeNull();
    expect(container).not.toHaveTextContent("Hidden keyword");
    expect(container).not.toHaveTextContent("Description text");
    expect(container.querySelector("a")).toBeNull();
  });

  it("falls back to the capabilities the Site holds for each role when no skill group is published", () => {
    const withSignals = pillars.map((pillar, index) =>
      index === 0
        ? {
            ...pillar,
            capabilities: ["Architecture review"],
            technologies: ["PostgreSQL", "Architecture review"],
          }
        : pillar
    );
    render(
      <SkillsSection pillars={withSignals} groups={[]} layout="registry" />
    );
    const list = screen.getByRole("list", { name: pillars[0]!.label });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["Architecture review", "PostgreSQL"]);
  });

  it("leaves the grid and matrix layouts as they were", () => {
    const grid = render(<SkillsSection pillars={pillars} groups={groups} />);
    expect(
      screen.getByText("Evidence, not decorative ratings")
    ).toBeInTheDocument();
    expect(grid.container.querySelector("ol")).not.toBeNull();
    expect(grid.container.querySelector("section")).not.toHaveAttribute(
      "data-chapter"
    );
    expect(grid.container.querySelector(".registry")).toBeNull();
    grid.unmount();
    render(<SkillsSection pillars={pillars} groups={groups} layout="matrix" />);
    expect(screen.getByText("Evidence model")).toBeInTheDocument();
    expect(screen.getByText("2 signals")).toBeInTheDocument();
  });
});
